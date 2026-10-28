import crypto from "node:crypto";
import type {
  AvailabilityBlock,
  AvailabilityRule,
  Booking,
  BookingEvent,
  EventSession,
  EventTimeSlot,
  PhotographyPackage,
  PhotographyService,
} from "@/types/database";
import {
  addMinutesToISO,
  checkPolicyDeadline,
  dhakaDateTimeToISO,
  getDhakaDayOfWeek,
  intervalsOverlap,
  normalizeTimeHHMM,
} from "./timezone";
import { validateCustomFieldsAgainstQuestions } from "@/lib/validations";

/**
 * Per-resource-pool async mutex to guarantee strict serialization of concurrent booking/reschedule
 * operations within a Node.js process (complementing PostgreSQL's pg_advisory_xact_lock & FOR UPDATE).
 */
class ResourcePoolLockManager {
  private queues = new Map<string, Promise<void>>();

  async runExclusive<T>(resourcePool: string, fn: () => Promise<T>): Promise<T> {
    const key = resourcePool || "primary_studio";
    const previous = this.queues.get(key) || Promise.resolve();

    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.queues.set(
      key,
      previous.then(() => current)
    );

    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export const resourceLockManager = new ResourcePoolLockManager();

export interface BookingStoreState {
  events: Map<string, BookingEvent>;
  sessions: Map<string, EventSession>;
  slots: Map<string, EventTimeSlot>;
  services: Map<string, PhotographyService>;
  packages: Map<string, PhotographyPackage>;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  bookings: Map<string, Booking>;
}

/**
 * Transactional in-memory booking engine used for deterministic concurrency,
 * conflict, reschedule rollback, and capacity release verification in automated tests.
 * Mirrors the exact semantics of the PostgreSQL RPCs in 20261028000003_atomic_booking_rpcs.sql.
 */
export class TransactionalBookingEngine {
  private state: BookingStoreState;
  private locks = new ResourcePoolLockManager();

  constructor(initial?: Partial<BookingStoreState>) {
    this.state = {
      events: initial?.events || new Map(),
      sessions: initial?.sessions || new Map(),
      slots: initial?.slots || new Map(),
      services: initial?.services || new Map(),
      packages: initial?.packages || new Map(),
      rules: initial?.rules || [],
      blocks: initial?.blocks || [],
      bookings: initial?.bookings || new Map(),
    };
  }

  getState(): BookingStoreState {
    return this.state;
  }

  async createBookingAtomic(params: {
    idempotency_key?: string | null;
    user_id?: string | null;
    booking_type: "convocation" | "special" | "traditional";
    event_id?: string | null;
    session_id?: string | null;
    slot_id?: string | null;
    service_id?: string | null;
    package_id?: string | null;
    booking_date: string;
    start_at: string;
    end_at: string;
    duration_mins: number;
    client_name: string;
    client_email: string;
    client_phone: string;
    company_or_institution?: string | null;
    student_id?: string | null;
    degree_or_department?: string | null;
    guests_count?: number;
    location: string;
    client_notes?: string | null;
    custom_fields?: Record<string, string | string[]>;
    actor_role?: "client" | "admin";
    now?: Date;
  }): Promise<Booking> {
    const actorRole = params.actor_role || "client";
    const now = params.now || new Date();

    // Determine resource pool before acquiring lock
    let resourcePool = "primary_studio";
    if (
      (params.booking_type === "convocation" || params.booking_type === "special") &&
      params.event_id
    ) {
      const ev = this.state.events.get(params.event_id);
      if (ev) resourcePool = ev.resource_pool;
    } else if (params.booking_type === "traditional" && params.service_id) {
      const srv = this.state.services.get(params.service_id);
      if (srv) resourcePool = srv.resource_pool;
    }

    return this.locks.runExclusive(resourcePool, async () => {
      // 1. Idempotency check
      if (params.idempotency_key) {
        for (const existing of this.state.bookings.values()) {
          if (existing.idempotency_key === params.idempotency_key) {
            return { ...existing };
          }
        }
      }

      if (Date.parse(params.end_at) <= Date.parse(params.start_at)) {
        throw new Error("INVALID_TIME_RANGE: End time must be after start time.");
      }

      let startAt = params.start_at;
      let endAt = params.end_at;
      let effStartAt = params.start_at;
      let effEndAt = params.end_at;
      let bufferBefore = 0;
      let bufferAfter = 10;
      let bookingDate = params.booking_date;
      let sessionId = params.session_id || null;
      let durationMins = params.duration_mins;
      let cancelCutoff = 24;
      let reschedCutoff = 24;
      let title = "";
      let eventSlugSnap: string | null = null;
      let eventCatSnap: string | null = null;
      let sanitizedCustomFields: Record<string, string | string[]> =
        params.custom_fields || {};
      let targetSlot: EventTimeSlot | undefined;

      if (params.booking_type === "convocation" || params.booking_type === "special") {
        if (!params.event_id || !params.slot_id) {
          throw new Error("MISSING_EVENT_SLOT: Event booking requires event_id and slot_id.");
        }
        const event = this.state.events.get(params.event_id);
        if (!event) {
          throw new Error("EVENT_NOT_FOUND: Event not found.");
        }
        if (event.status !== "published" && actorRole !== "admin") {
          throw new Error(`EVENT_NOT_OPEN: Event is currently ${event.status}.`);
        }
        if (actorRole !== "admin") {
          if (event.booking_opens_at && now.getTime() < Date.parse(event.booking_opens_at)) {
            throw new Error("BOOKING_NOT_OPEN_YET: Event bookings have not opened yet.");
          }
          if (event.booking_closes_at && now.getTime() > Date.parse(event.booking_closes_at)) {
            throw new Error("BOOKING_WINDOW_CLOSED: Event booking window has closed.");
          }
        }

        if (event.custom_questions && event.custom_questions.length > 0) {
          const check = validateCustomFieldsAgainstQuestions(
            event.custom_questions as any,
            params.custom_fields
          );
          if (!check.valid) {
            const firstErr = Object.values(check.errors)[0];
            throw new Error(`CUSTOM_FIELDS_INVALID: ${firstErr}`);
          }
          sanitizedCustomFields = check.sanitized;
        }

        const slot = this.state.slots.get(params.slot_id);
        if (!slot || slot.event_id !== event.id) {
          throw new Error("SLOT_NOT_FOUND: Selected slot does not exist.");
        }
        if (slot.status !== "available") {
          throw new Error(`SLOT_UNAVAILABLE: Selected slot is ${slot.status}.`);
        }
        if (slot.booked_count >= slot.capacity) {
          throw new Error("SLOT_CAPACITY_EXHAUSTED: This time slot is fully booked.");
        }

        startAt = slot.start_at;
        endAt = slot.end_at;
        effStartAt = slot.effective_start_at;
        effEndAt = slot.effective_end_at;
        bufferBefore = slot.buffer_before_mins;
        bufferAfter = slot.buffer_after_mins;
        bookingDate = slot.slot_date;
        sessionId = slot.session_id || null;
        durationMins = Math.max(
          1,
          Math.round((Date.parse(slot.end_at) - Date.parse(slot.start_at)) / 60_000)
        );
        cancelCutoff = event.cancellation_cutoff_hours;
        reschedCutoff = event.reschedule_cutoff_hours;
        title = event.title;
        eventSlugSnap = event.slug;
        eventCatSnap = event.category || "convocation";
        targetSlot = slot;

        // Check blackout blocks
        const hasBlock = this.state.blocks.some(
          (blk) =>
            (blk.resource_pool === resourcePool || blk.event_id === event.id) &&
            intervalsOverlap(effStartAt, effEndAt, blk.start_at, blk.end_at)
        );
        if (hasBlock) {
          throw new Error("SLOT_BLOCKED: Selected slot overlaps with a blackout period.");
        }

        // Check conflicting active bookings on the same resource pool (traditional or other special events)
        for (const b of this.state.bookings.values()) {
          if (
            b.resource_pool === resourcePool &&
            ["pending", "confirmed", "rescheduled"].includes(b.status) &&
            (!b.slot_id || b.slot_id !== slot.id) &&
            intervalsOverlap(effStartAt, effEndAt, b.effective_start_at, b.effective_end_at)
          ) {
            throw new Error("RESOURCE_CONFLICT: Conflicts with an existing booking on the same studio resource pool.");
          }
        }
      } else {
        if (!params.service_id) {
          throw new Error("MISSING_SERVICE: Traditional booking requires service_id.");
        }
        const service = this.state.services.get(params.service_id);
        if (!service) {
          throw new Error("SERVICE_NOT_FOUND: Service not found.");
        }
        if (!service.is_active && actorRole !== "admin") {
          throw new Error("SERVICE_INACTIVE: Service is inactive.");
        }

        bufferBefore = service.buffer_before_mins;
        bufferAfter = service.buffer_after_mins;
        effStartAt = addMinutesToISO(startAt, -bufferBefore);
        effEndAt = addMinutesToISO(endAt, bufferAfter);
        cancelCutoff = service.cancellation_cutoff_hours;
        reschedCutoff = service.reschedule_cutoff_hours;
        title = service.name;

        if (actorRole !== "admin") {
          const minNoticeMs = now.getTime() + service.min_notice_hours * 3600_000;
          if (Date.parse(startAt) < minNoticeMs) {
            throw new Error("INSUFFICIENT_NOTICE: Advance notice requirement not met.");
          }
        }

        const dow = getDhakaDayOfWeek(bookingDate);
        const rule = this.state.rules.find(
          (r) => r.resource_pool === resourcePool && r.day_of_week === dow
        );
        if (rule && actorRole !== "admin") {
          if (!rule.is_open) {
            throw new Error("CLOSED_DAY: Studio is closed on this day.");
          }
          const openMs = Date.parse(
            dhakaDateTimeToISO(bookingDate, normalizeTimeHHMM(rule.start_time))
          );
          const closeMs = Date.parse(
            dhakaDateTimeToISO(bookingDate, normalizeTimeHHMM(rule.end_time))
          );
          if (Date.parse(startAt) < openMs || Date.parse(endAt) > closeMs) {
            throw new Error("OUTSIDE_OPERATING_HOURS: Outside studio operating hours.");
          }
        }

        const hasBlock = this.state.blocks.some(
          (blk) =>
            (blk.resource_pool === resourcePool || blk.service_id === service.id) &&
            intervalsOverlap(effStartAt, effEndAt, blk.start_at, blk.end_at)
        );
        if (hasBlock) {
          throw new Error("TIME_BLOCKED: Requested time falls within a blocked period.");
        }

        const overlapping: Booking[] = [];
        for (const b of this.state.bookings.values()) {
          if (
            b.resource_pool === resourcePool &&
            ["pending", "confirmed", "rescheduled"].includes(b.status) &&
            intervalsOverlap(effStartAt, effEndAt, b.effective_start_at, b.effective_end_at)
          ) {
            overlapping.push(b);
          }
        }

        if (overlapping.some((b) => b.booking_type === "convocation" || b.booking_type === "special")) {
          throw new Error("CONVOCATION_CONFLICT: Conflicts with a scheduled special event session.");
        }
        if (overlapping.length >= service.max_concurrent_bookings) {
          throw new Error("SLOT_UNAVAILABLE: Requested time slot is already booked.");
        }
      }

      // Mutate slot capacity atomically if convocation
      if (targetSlot) {
        targetSlot.booked_count += 1;
      }

      const pkg = params.package_id ? this.state.packages.get(params.package_id) : undefined;
      const bookingRef = `OFP-2026-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const nowIso = now.toISOString();

      const booking: Booking = {
        id: crypto.randomUUID(),
        booking_ref: bookingRef,
        idempotency_key: params.idempotency_key || null,
        user_id: params.user_id || null,
        booking_type: params.booking_type,
        event_id: params.event_id || null,
        session_id: sessionId,
        slot_id: params.slot_id || null,
        service_id: params.service_id || null,
        package_id: params.package_id || null,
        package_name: pkg?.name || null,
        package_price_label: pkg?.price_label || null,
        service_or_event_title: title,
        event_slug_snapshot: eventSlugSnap,
        event_category_snapshot: eventCatSnap,
        resource_pool: resourcePool,
        timezone: "Asia/Dhaka",
        booking_date: bookingDate,
        start_at: startAt,
        end_at: endAt,
        buffer_before_mins: bufferBefore,
        buffer_after_mins: bufferAfter,
        effective_start_at: effStartAt,
        effective_end_at: effEndAt,
        duration_mins: durationMins,
        client_name: params.client_name.trim(),
        client_email: params.client_email.trim().toLowerCase(),
        client_phone: params.client_phone.trim(),
        company_or_institution: params.company_or_institution || null,
        student_id: params.student_id || null,
        degree_or_department: params.degree_or_department || null,
        guests_count: params.guests_count || 1,
        location: params.location.trim(),
        client_notes: params.client_notes || null,
        custom_fields: sanitizedCustomFields,
        status: "confirmed",
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by: null,
        rescheduled_count: 0,
        last_rescheduled_at: null,
        cancellation_cutoff_hours: cancelCutoff,
        reschedule_cutoff_hours: reschedCutoff,
        calendar_sync_status: "pending",
        google_calendar_event_id: null,
        google_calendar_id: null,
        calendar_sync_error: null,
        calendar_last_synced_at: null,
        email_send_status: "pending",
        email_last_sent_at: null,
        email_send_error: null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      this.state.bookings.set(booking.id, booking);
      return { ...booking };
    });
  }

  async rescheduleBookingAtomic(params: {
    booking_id: string;
    actor_id?: string | null;
    actor_role: "client" | "admin";
    new_slot_id?: string | null;
    new_date: string;
    new_start_at: string;
    new_end_at: string;
    reason?: string | null;
    now?: Date;
  }): Promise<Booking> {
    const existing = this.state.bookings.get(params.booking_id);
    if (!existing) {
      throw new Error("BOOKING_NOT_FOUND: Reservation does not exist.");
    }

    return this.locks.runExclusive(existing.resource_pool, async () => {
      const booking = this.state.bookings.get(params.booking_id);
      if (!booking) {
        throw new Error("BOOKING_NOT_FOUND: Reservation does not exist.");
      }

      if (params.actor_role !== "admin" && booking.user_id !== params.actor_id) {
        throw new Error("FORBIDDEN: You do not have permission to reschedule this booking.");
      }

      if (booking.status === "cancelled" || booking.status === "completed") {
        throw new Error(`INVALID_STATUS: Cannot reschedule a ${booking.status} booking.`);
      }

      const now = params.now || new Date();
      if (params.actor_role !== "admin") {
        const check = checkPolicyDeadline(
          booking.start_at,
          booking.reschedule_cutoff_hours,
          now
        );
        if (!check.allowed) {
          throw new Error(
            `RESCHEDULE_DEADLINE_PASSED: Rescheduling requires ${booking.reschedule_cutoff_hours} hours notice.`
          );
        }
      }

      if (booking.booking_type === "convocation" || booking.booking_type === "special") {
        if (!params.new_slot_id) {
          throw new Error("MISSING_NEW_SLOT: Please select a new convocation slot.");
        }
        if (params.new_slot_id === booking.slot_id) {
          throw new Error("SAME_SLOT: Please choose a different time slot.");
        }

        const newSlot = this.state.slots.get(params.new_slot_id);
        if (!newSlot || newSlot.event_id !== booking.event_id) {
          throw new Error("SLOT_NOT_FOUND: Target slot not found.");
        }
        if (newSlot.status !== "available") {
          throw new Error("SLOT_UNAVAILABLE: Target slot is not available.");
        }
        if (newSlot.booked_count >= newSlot.capacity) {
          throw new Error("SLOT_CAPACITY_EXHAUSTED: Target slot is full.");
        }

        // Check cross-type traditional conflicts (excluding current booking)
        for (const b of this.state.bookings.values()) {
          if (
            b.id !== booking.id &&
            b.resource_pool === booking.resource_pool &&
            b.booking_type === "traditional" &&
            ["pending", "confirmed", "rescheduled"].includes(b.status) &&
            intervalsOverlap(
              newSlot.effective_start_at,
              newSlot.effective_end_at,
              b.effective_start_at,
              b.effective_end_at
            )
          ) {
            throw new Error("RESOURCE_CONFLICT: Conflicts with an existing session.");
          }
        }

        // Atomically reserve new slot & release old slot
        const oldSlot = booking.slot_id ? this.state.slots.get(booking.slot_id) : undefined;
        newSlot.booked_count += 1;
        if (oldSlot) {
          oldSlot.booked_count = Math.max(0, oldSlot.booked_count - 1);
        }

        booking.slot_id = newSlot.id;
        booking.session_id = newSlot.session_id || null;
        booking.booking_date = newSlot.slot_date;
        booking.start_at = newSlot.start_at;
        booking.end_at = newSlot.end_at;
        booking.buffer_before_mins = newSlot.buffer_before_mins;
        booking.buffer_after_mins = newSlot.buffer_after_mins;
        booking.effective_start_at = newSlot.effective_start_at;
        booking.effective_end_at = newSlot.effective_end_at;
      } else {
        const effStart = addMinutesToISO(params.new_start_at, -booking.buffer_before_mins);
        const effEnd = addMinutesToISO(params.new_end_at, booking.buffer_after_mins);

        for (const b of this.state.bookings.values()) {
          if (
            b.id !== booking.id &&
            b.resource_pool === booking.resource_pool &&
            ["pending", "confirmed", "rescheduled"].includes(b.status) &&
            intervalsOverlap(effStart, effEnd, b.effective_start_at, b.effective_end_at)
          ) {
            throw new Error("SLOT_UNAVAILABLE: Target time slot conflicts with an existing booking.");
          }
        }

        booking.booking_date = params.new_date;
        booking.start_at = params.new_start_at;
        booking.end_at = params.new_end_at;
        booking.effective_start_at = effStart;
        booking.effective_end_at = effEnd;
      }

      booking.status = "rescheduled";
      booking.rescheduled_count += 1;
      booking.last_rescheduled_at = now.toISOString();
      booking.calendar_sync_status = "pending";
      booking.email_send_status = "pending";
      booking.updated_at = now.toISOString();

      return { ...booking };
    });
  }

  async cancelBookingAtomic(params: {
    booking_id: string;
    actor_id?: string | null;
    actor_role: "client" | "admin";
    reason?: string | null;
    now?: Date;
  }): Promise<Booking> {
    const existing = this.state.bookings.get(params.booking_id);
    if (!existing) {
      throw new Error("BOOKING_NOT_FOUND: Reservation does not exist.");
    }

    return this.locks.runExclusive(existing.resource_pool, async () => {
      const booking = this.state.bookings.get(params.booking_id);
      if (!booking) {
        throw new Error("BOOKING_NOT_FOUND: Reservation does not exist.");
      }

      if (params.actor_role !== "admin" && booking.user_id !== params.actor_id) {
        throw new Error("FORBIDDEN: You do not have permission to cancel this booking.");
      }

      if (booking.status === "cancelled") {
        return { ...booking };
      }

      const now = params.now || new Date();
      if (params.actor_role !== "admin") {
        const check = checkPolicyDeadline(
          booking.start_at,
          booking.cancellation_cutoff_hours,
          now
        );
        if (!check.allowed) {
          throw new Error(
            `CANCELLATION_DEADLINE_PASSED: Cancellations require ${booking.cancellation_cutoff_hours} hours notice.`
          );
        }
      }

      if (booking.slot_id) {
        const slot = this.state.slots.get(booking.slot_id);
        if (slot) {
          slot.booked_count = Math.max(0, slot.booked_count - 1);
        }
      }

      booking.status = "cancelled";
      booking.cancellation_reason = params.reason || `Cancelled by ${params.actor_role}`;
      booking.cancelled_at = now.toISOString();
      booking.cancelled_by = params.actor_role;
      booking.calendar_sync_status = "pending";
      booking.email_send_status = "pending";
      booking.updated_at = now.toISOString();

      return { ...booking };
    });
  }
}
