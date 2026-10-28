import type {
  AvailabilityBlock,
  AvailabilityRule,
  BookingEvent,
  ComputedTimeSlot,
  DayAvailabilitySummary,
  EventSession,
  EventTimeSlot,
  PhotographyService,
} from "@/types/database";
import {
  addMinutesToISO,
  dhakaDateTimeToISO,
  formatDhakaTime,
  getDatesInMonth,
  getDhakaDayOfWeek,
  intervalsOverlap,
  normalizeTimeHHMM,
  toDhakaDateString,
} from "./timezone";

export interface BusyInterval {
  booking_id: string;
  booking_type: "convocation" | "traditional";
  slot_id?: string | null;
  start_at: string;
  end_at: string;
  effective_start_at: string;
  effective_end_at: string;
}

/**
 * Computes the availability state of configured event slots (e.g., IUB 27th Convocation)
 * accounting for capacity, buffers, blackout blocks, booking open/close windows,
 * and cross-booking-type conflicts (e.g. traditional sessions on the same resource pool).
 */
export function computeConvocationSlots(params: {
  event: BookingEvent;
  slots: EventTimeSlot[];
  sessions?: EventSession[];
  blocks: AvailabilityBlock[];
  busyIntervals: BusyInterval[];
  now?: Date;
  ignoreEventWindow?: boolean;
}): ComputedTimeSlot[] {
  const {
    event,
    slots,
    sessions = [],
    blocks,
    busyIntervals,
    now = new Date(),
    ignoreEventWindow = false,
  } = params;

  const nowMs = now.getTime();
  const sessionMap = new Map<string, EventSession>();
  for (const s of sessions) {
    sessionMap.set(s.id, s);
  }

  const eventOpen =
    ignoreEventWindow ||
    (event.status === "published" &&
      (!event.booking_opens_at || nowMs >= Date.parse(event.booking_opens_at)) &&
      (!event.booking_closes_at || nowMs <= Date.parse(event.booking_closes_at)));

  return slots
    .slice()
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))
    .map((slot) => {
      const session = slot.session_id ? sessionMap.get(slot.session_id) : undefined;
      const durationMins = Math.max(
        1,
        Math.round((Date.parse(slot.end_at) - Date.parse(slot.start_at)) / 60_000)
      );

      // Count active bookings referencing this slot OR use the authoritative slot.booked_count
      const activeBookingsForSlot = busyIntervals.filter(
        (b) => b.slot_id && b.slot_id === slot.id
      ).length;
      const bookedCount = Math.max(slot.booked_count, activeBookingsForSlot);
      const remaining = Math.max(0, slot.capacity - bookedCount);

      let state: "available" | "full" | "unavailable" = "available";
      let unavailableReason: string | undefined;

      if (!eventOpen) {
        state = "unavailable";
        unavailableReason =
          event.status !== "published"
            ? `Event is currently ${event.status}`
            : "Outside event booking window";
      } else if (session && !session.is_active) {
        state = "unavailable";
        unavailableReason = "Session paused";
      } else if (slot.status !== "available") {
        state = "unavailable";
        unavailableReason = slot.status === "blocked" ? "Slot blocked" : "Slot closed";
      } else if (Date.parse(slot.start_at) <= nowMs && !ignoreEventWindow) {
        state = "unavailable";
        unavailableReason = "Past time slot";
      } else {
        // Check blackout blocks overlapping [effective_start_at, effective_end_at]
        const overlappingBlock = blocks.find(
          (blk) =>
            (blk.resource_pool === event.resource_pool || blk.event_id === event.id) &&
            intervalsOverlap(
              slot.effective_start_at,
              slot.effective_end_at,
              blk.start_at,
              blk.end_at
            )
        );

        // Check cross-type traditional bookings overlapping [effective_start_at, effective_end_at]
        const overlappingTraditional = busyIntervals.find(
          (b) =>
            b.booking_type === "traditional" &&
            intervalsOverlap(
              slot.effective_start_at,
              slot.effective_end_at,
              b.effective_start_at,
              b.effective_end_at
            )
        );

        if (overlappingBlock) {
          state = "unavailable";
          unavailableReason = overlappingBlock.title || "Blocked period";
        } else if (overlappingTraditional) {
          state = "unavailable";
          unavailableReason = "Resource reserved for another session";
        } else if (remaining <= 0) {
          state = "full";
          unavailableReason = "Slot capacity reached";
        }
      }

      return {
        slot_id: slot.id,
        session_id: slot.session_id || null,
        session_title: session?.title || slot.label || "Convocation Session",
        date: slot.slot_date,
        start_at: slot.start_at,
        end_at: slot.end_at,
        start_time_label: formatDhakaTime(slot.start_at),
        end_time_label: formatDhakaTime(slot.end_at),
        duration_mins: durationMins,
        buffer_before_mins: slot.buffer_before_mins,
        buffer_after_mins: slot.buffer_after_mins,
        capacity: slot.capacity,
        booked_count: bookedCount,
        remaining_capacity: state === "available" ? remaining : 0,
        state,
        unavailable_reason: unavailableReason,
      };
    });
}

/**
 * Generates and evaluates bookable time slots for a Traditional Photography Service on a specific YYYY-MM-DD date
 * in Asia/Dhaka timezone, enforcing operating hours, buffers, notice windows, blackout blocks, and
 * cross-type conflict rules (preventing overlap with Convocation bookings or other Traditional bookings).
 */
export function computeTraditionalSlotsForDate(params: {
  dateYMD: string;
  service: PhotographyService;
  durationMins?: number;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  busyIntervals: BusyInterval[];
  now?: Date;
  ignoreNoticeWindow?: boolean;
}): ComputedTimeSlot[] {
  const {
    dateYMD,
    service,
    durationMins = service.base_duration_mins,
    rules,
    blocks,
    busyIntervals,
    now = new Date(),
    ignoreNoticeWindow = false,
  } = params;

  if (!service.is_active && !ignoreNoticeWindow) {
    return [];
  }

  const dow = getDhakaDayOfWeek(dateYMD);
  const rule = rules.find(
    (r) =>
      r.resource_pool === service.resource_pool && r.day_of_week === dow
  );

  if (rule && !rule.is_open) {
    return [];
  }

  const startTimeHHMM = normalizeTimeHHMM(rule?.start_time || "09:00");
  const endTimeHHMM = normalizeTimeHHMM(rule?.end_time || "19:00");
  const intervalMins = Math.max(15, rule?.slot_interval_mins || 60);
  const maxConcurrent = Math.max(
    1,
    rule?.capacity_per_slot || service.max_concurrent_bookings || 1
  );

  const dayOpenMs = Date.parse(dhakaDateTimeToISO(dateYMD, startTimeHHMM));
  const dayCloseMs = Date.parse(dhakaDateTimeToISO(dateYMD, endTimeHHMM));
  const durationMs = durationMins * 60_000;
  const stepMs = intervalMins * 60_000;

  const nowMs = now.getTime();
  const minNoticeMs = nowMs + service.min_notice_hours * 3600_000;
  const maxAdvanceMs = nowMs + service.max_advance_days * 86400_000;

  const computed: ComputedTimeSlot[] = [];

  for (
    let cursorMs = dayOpenMs;
    cursorMs + durationMs <= dayCloseMs;
    cursorMs += stepMs
  ) {
    const startIso = new Date(cursorMs).toISOString();
    const endIso = new Date(cursorMs + durationMs).toISOString();
    const effStartIso = addMinutesToISO(startIso, -service.buffer_before_mins);
    const effEndIso = addMinutesToISO(endIso, service.buffer_after_mins);

    let state: "available" | "full" | "unavailable" = "available";
    let unavailableReason: string | undefined;

    // 1. Check notice window
    if (!ignoreNoticeWindow && cursorMs < minNoticeMs) {
      state = "unavailable";
      unavailableReason = `Requires ${service.min_notice_hours}h advance notice`;
    } else if (!ignoreNoticeWindow && cursorMs > maxAdvanceMs) {
      state = "unavailable";
      unavailableReason = `Beyond ${service.max_advance_days}-day advance window`;
    }

    // 2. Check blackout blocks
    if (state === "available") {
      const overlappingBlock = blocks.find(
        (blk) =>
          (blk.resource_pool === service.resource_pool ||
            blk.service_id === service.id) &&
          intervalsOverlap(effStartIso, effEndIso, blk.start_at, blk.end_at)
      );
      if (overlappingBlock) {
        state = "unavailable";
        unavailableReason = overlappingBlock.title || "Blocked period";
      }
    }

    // 3. Check overlapping active bookings (both convocation & traditional on same resource pool)
    const overlappingBookings = busyIntervals.filter((b) =>
      intervalsOverlap(
        effStartIso,
        effEndIso,
        b.effective_start_at,
        b.effective_end_at
      )
    );

    const hasConvocationConflict = overlappingBookings.some(
      (b) => b.booking_type === "convocation"
    );

    const bookedCount = overlappingBookings.length;
    const remaining = Math.max(0, maxConcurrent - bookedCount);

    if (state === "available") {
      if (hasConvocationConflict) {
        state = "unavailable";
        unavailableReason = "Reserved for Convocation photography";
      } else if (bookedCount >= maxConcurrent) {
        state = "full";
        unavailableReason = "Already booked";
      }
    }

    computed.push({
      date: dateYMD,
      start_at: startIso,
      end_at: endIso,
      start_time_label: formatDhakaTime(startIso),
      end_time_label: formatDhakaTime(endIso),
      duration_mins: durationMins,
      buffer_before_mins: service.buffer_before_mins,
      buffer_after_mins: service.buffer_after_mins,
      capacity: maxConcurrent,
      booked_count: Math.min(maxConcurrent, bookedCount),
      remaining_capacity: state === "available" ? remaining : 0,
      state,
      unavailable_reason: unavailableReason,
    });
  }

  return computed;
}

/**
 * Summarizes daily availability across a full calendar month for either Convocation or Traditional booking flows.
 */
export function summarizeMonthAvailability(params: {
  year: number;
  month1To12: number;
  getSlotsForDate: (dateYMD: string) => ComputedTimeSlot[];
}): DayAvailabilitySummary[] {
  const { year, month1To12, getSlotsForDate } = params;
  const dates = getDatesInMonth(year, month1To12);
  const todayDhaka = toDhakaDateString(new Date());

  return dates.map((date) => {
    if (date < todayDhaka) {
      return {
        date,
        status: "unavailable",
        available_slots_count: 0,
        total_slots_count: 0,
        reason: "Past date",
      };
    }

    const slots = getSlotsForDate(date);
    if (slots.length === 0) {
      return {
        date,
        status: "unavailable",
        available_slots_count: 0,
        total_slots_count: 0,
        reason: "No sessions scheduled",
      };
    }

    const availableCount = slots.filter((s) => s.state === "available").length;
    const fullCount = slots.filter((s) => s.state === "full").length;

    let status: "available" | "full" | "unavailable" = "unavailable";
    if (availableCount > 0) {
      status = "available";
    } else if (fullCount > 0) {
      status = "full";
    }

    return {
      date,
      status,
      available_slots_count: availableCount,
      total_slots_count: slots.length,
    };
  });
}
