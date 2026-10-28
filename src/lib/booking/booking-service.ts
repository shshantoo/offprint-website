import type {
  AvailabilityBlock,
  AvailabilityRule,
  Booking,
  BookingEvent,
  ComputedTimeSlot,
  DayAvailabilitySummary,
  EventSession,
  EventTimeSlot,
  NotificationType,
  PhotographyPackage,
  PhotographyService,
} from "@/types/database";
import {
  type CreateBookingInput,
  type RescheduleBookingInput,
  validateCustomFieldsAgainstQuestions,
  calculateAndVerifyBookingPrice,
} from "@/lib/validations";
import { createSupabasePrivilegedClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/auth-helpers";
import {
  type BusyInterval,
  computeConvocationSlots,
  computeTraditionalSlotsForDate,
  summarizeMonthAvailability,
} from "./availability";
import { syncBookingToGoogleCalendar } from "@/lib/google/calendar";
import { sendBookingNotificationEmail } from "@/lib/google/gmail";

export class BookingSystemError extends Error {
  code: string;
  httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/**
 * Translates PostgreSQL RPC exception messages into user-friendly BookingSystemError instances.
 */
export function parseDatabaseBookingError(err: any): BookingSystemError {
  if (isMissingSchemaError(err)) {
    return new BookingSystemError(
      "SCHEMA_NOT_INSTALLED",
      "The booking database schema has not yet been installed in Supabase. Please execute supabase/schema.sql (or the files in supabase/migrations/) in your Supabase SQL Editor before creating reservations.",
      503
    );
  }

  const rawMsg = String(err?.message || err || "Booking operation failed");
  const match = rawMsg.match(/^([A-Z0-9_]+):\s*(.+)$/);
  if (match) {
    const [, code, cleanMsg] = match;
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      UNAUTHORIZED_ROLE_CHANGE: 403,
      BOOKING_NOT_FOUND: 404,
      EVENT_NOT_FOUND: 404,
      SLOT_NOT_FOUND: 404,
      SERVICE_NOT_FOUND: 404,
      SLOT_CAPACITY_EXHAUSTED: 409,
      SLOT_FULL: 409,
      SLOT_UNAVAILABLE: 409,
      RESOURCE_CONFLICT: 409,
      CONVOCATION_CONFLICT: 409,
      SLOT_BLOCKED: 409,
      TIME_BLOCKED: 409,
      CONFLICTING_ACTIVE_BOOKINGS: 409,
    };
    return new BookingSystemError(code, cleanMsg, statusMap[code] || 400);
  }

  return new BookingSystemError("BOOKING_ERROR", rawMsg, 400);
}

/**
 * Fetches busy intervals from Supabase via the privacy-safe get_busy_intervals RPC
 */
export async function fetchBusyIntervalsFromDb(
  supabase: any,
  resourcePool: string,
  rangeStartIso: string,
  rangeEndIso: string,
  excludeBookingId?: string
): Promise<BusyInterval[]> {
  const { data, error } = await supabase.rpc("get_busy_intervals", {
    p_resource_pool: resourcePool,
    p_range_start: rangeStartIso,
    p_range_end: rangeEndIso,
    p_exclude_booking_id: excludeBookingId || null,
  });

  if (error) {
    if (isMissingSchemaError(error)) {
      throw parseDatabaseBookingError(error);
    }
    throw new BookingSystemError("AVAILABILITY_FETCH_FAILED", error.message, 500);
  }

  return (data || []) as BusyInterval[];
}

/**
 * Fetches complete Convocation event configuration, packages, sessions, and real-time slot availability
 * for a given month (year, month 1..12) and optional selected date.
 */
export async function getConvocationAvailabilityFromDb(params: {
  slug?: string;
  eventId?: string;
  year: number;
  month: number; // 1..12
  date?: string; // YYYY-MM-DD
  excludeBookingId?: string;
}): Promise<{
  schemaReady: boolean;
  error?: string;
  event: BookingEvent | null;
  packages: PhotographyPackage[];
  sessions: EventSession[];
  monthSummary: DayAvailabilitySummary[];
  slotsForDate: ComputedTimeSlot[];
  allEventSlots: ComputedTimeSlot[];
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      schemaReady: false,
      error: "Supabase is not configured. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      event: null,
      packages: [],
      sessions: [],
      monthSummary: [],
      slotsForDate: [],
      allEventSlots: [],
    };
  }

  try {
    let eventQuery = supabase.from("booking_events").select("*");
    if (params.eventId) {
      eventQuery = eventQuery.eq("id", params.eventId);
    } else {
      eventQuery = eventQuery.eq("slug", params.slug || "iub-27th-convocation");
    }

    const { data: eventRow, error: eventErr } = await eventQuery.maybeSingle();
    if (eventErr) {
      if (isMissingSchemaError(eventErr)) {
        return {
          schemaReady: false,
          error:
            "Booking database schema is not installed in Supabase yet. Run supabase/schema.sql in your Supabase SQL Editor to activate live availability.",
          event: null,
          packages: [],
          sessions: [],
          monthSummary: [],
          slotsForDate: [],
          allEventSlots: [],
        };
      }
      throw eventErr;
    }

    if (!eventRow) {
      return {
        schemaReady: true,
        event: null,
        packages: [],
        sessions: [],
        monthSummary: [],
        slotsForDate: [],
        allEventSlots: [],
      };
    }

    const event = eventRow as BookingEvent;

    const [pkgRes, sessRes, slotRes, blockRes] = await Promise.all([
      supabase
        .from("photography_packages")
        .select("*")
        .eq("event_id", event.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("event_sessions")
        .select("*")
        .eq("event_id", event.id)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("event_time_slots")
        .select("*")
        .eq("event_id", event.id)
        .order("start_at", { ascending: true }),
      supabase
        .from("availability_blocks")
        .select("*")
        .or(`resource_pool.eq.${event.resource_pool},event_id.eq.${event.id}`),
    ]);

    const packages = (pkgRes.data || []) as PhotographyPackage[];
    const sessions = (sessRes.data || []) as EventSession[];
    const slots = (slotRes.data || []) as EventTimeSlot[];
    const blocks = (blockRes.data || []) as AvailabilityBlock[];

    const rangeStart = new Date(Date.UTC(params.year, params.month - 1, 1, 0, 0, 0)).toISOString();
    const rangeEnd = new Date(Date.UTC(params.year, params.month, 2, 23, 59, 59)).toISOString();

    const busyIntervals = await fetchBusyIntervalsFromDb(
      supabase,
      event.resource_pool,
      rangeStart,
      rangeEnd,
      params.excludeBookingId
    );

    const allComputed = computeConvocationSlots({
      event,
      slots,
      sessions,
      blocks,
      busyIntervals,
    });

    const monthSummary = summarizeMonthAvailability({
      year: params.year,
      month1To12: params.month,
      getSlotsForDate: (d) => allComputed.filter((s) => s.date === d),
    });

    const slotsForDate = params.date
      ? allComputed.filter((s) => s.date === params.date)
      : [];

    return {
      schemaReady: true,
      event,
      packages,
      sessions,
      monthSummary,
      slotsForDate,
      allEventSlots: allComputed,
    };
  } catch (err: any) {
    const parsed = parseDatabaseBookingError(err);
    return {
      schemaReady: parsed.code !== "SCHEMA_NOT_INSTALLED",
      error: parsed.message,
      event: null,
      packages: [],
      sessions: [],
      monthSummary: [],
      slotsForDate: [],
      allEventSlots: [],
    };
  }
}

/**
 * Fetches Traditional Photography services, packages, and real-time slot availability
 * for a selected service, month, and date.
 */
export async function getTraditionalAvailabilityFromDb(params: {
  serviceId?: string;
  serviceSlug?: string;
  durationMins?: number;
  year: number;
  month: number; // 1..12
  date?: string; // YYYY-MM-DD
  excludeBookingId?: string;
}): Promise<{
  schemaReady: boolean;
  error?: string;
  services: PhotographyService[];
  selectedService: PhotographyService | null;
  packages: PhotographyPackage[];
  monthSummary: DayAvailabilitySummary[];
  slotsForDate: ComputedTimeSlot[];
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      schemaReady: false,
      error: "Supabase is not configured.",
      services: [],
      selectedService: null,
      packages: [],
      monthSummary: [],
      slotsForDate: [],
    };
  }

  try {
    const { data: serviceRows, error: srvErr } = await supabase
      .from("photography_services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (srvErr) {
      if (isMissingSchemaError(srvErr)) {
        return {
          schemaReady: false,
          error:
            "Booking database schema is not installed in Supabase yet. Run supabase/schema.sql in your Supabase SQL Editor to activate live availability.",
          services: [],
          selectedService: null,
          packages: [],
          monthSummary: [],
          slotsForDate: [],
        };
      }
      throw srvErr;
    }

    const services = (serviceRows || []) as PhotographyService[];
    const selectedService =
      services.find(
        (s) =>
          (params.serviceId && s.id === params.serviceId) ||
          (params.serviceSlug && s.slug === params.serviceSlug)
      ) ||
      services[0] ||
      null;

    if (!selectedService) {
      return {
        schemaReady: true,
        services: [],
        selectedService: null,
        packages: [],
        monthSummary: [],
        slotsForDate: [],
      };
    }

    const [pkgRes, ruleRes, blockRes] = await Promise.all([
      supabase
        .from("photography_packages")
        .select("*")
        .eq("service_id", selectedService.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("availability_rules")
        .select("*")
        .eq("resource_pool", selectedService.resource_pool),
      supabase
        .from("availability_blocks")
        .select("*")
        .or(`resource_pool.eq.${selectedService.resource_pool},service_id.eq.${selectedService.id}`),
    ]);

    const packages = (pkgRes.data || []) as PhotographyPackage[];
    const rules = (ruleRes.data || []) as AvailabilityRule[];
    const blocks = (blockRes.data || []) as AvailabilityBlock[];

    const rangeStart = new Date(Date.UTC(params.year, params.month - 1, 1, 0, 0, 0)).toISOString();
    const rangeEnd = new Date(Date.UTC(params.year, params.month, 2, 23, 59, 59)).toISOString();

    const busyIntervals = await fetchBusyIntervalsFromDb(
      supabase,
      selectedService.resource_pool,
      rangeStart,
      rangeEnd,
      params.excludeBookingId
    );

    const effectiveDuration = params.durationMins || selectedService.base_duration_mins;

    const monthSummary = summarizeMonthAvailability({
      year: params.year,
      month1To12: params.month,
      getSlotsForDate: (dateYMD) =>
        computeTraditionalSlotsForDate({
          dateYMD,
          service: selectedService,
          durationMins: effectiveDuration,
          rules,
          blocks,
          busyIntervals,
        }),
    });

    const slotsForDate = params.date
      ? computeTraditionalSlotsForDate({
          dateYMD: params.date,
          service: selectedService,
          durationMins: effectiveDuration,
          rules,
          blocks,
          busyIntervals,
        })
      : [];

    return {
      schemaReady: true,
      services,
      selectedService,
      packages,
      monthSummary,
      slotsForDate,
    };
  } catch (err: any) {
    const parsed = parseDatabaseBookingError(err);
    return {
      schemaReady: parsed.code !== "SCHEMA_NOT_INSTALLED",
      error: parsed.message,
      services: [],
      selectedService: null,
      packages: [],
      monthSummary: [],
      slotsForDate: [],
    };
  }
}

/**
 * Executes the full reservation workflow (Section 13):
 * 1. Atomically validates availability and saves the booking via PostgreSQL RPC.
 * 2. Outside DB locks, triggers Google Calendar event creation and Gmail confirmation email.
 * 3. Returns the authoritative booking record with accurate integration statuses.
 */
export async function executeCreateBookingWorkflow(params: {
  input: CreateBookingInput;
  userId?: string | null;
  actorRole?: "client" | "admin";
}): Promise<Booking> {
  const { input, userId = null, actorRole = "client" } = params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new BookingSystemError(
      "SUPABASE_UNAVAILABLE",
      "Database service is not configured. Bookings cannot be saved.",
      503
    );
  }

  let sanitizedCustomFields: Record<string, string | string[]> =
    input.custom_fields || {};
  let resolvedStudentId = input.student_id || null;
  let resolvedDepartment = input.degree_or_department || null;

  if (
    (input.booking_type === "convocation" || input.booking_type === "special") &&
    input.event_id
  ) {
    const { data: evRow } = await supabase
      .from("booking_events")
      .select("custom_questions")
      .eq("id", input.event_id)
      .maybeSingle();

    if (evRow && Array.isArray(evRow.custom_questions) && evRow.custom_questions.length > 0) {
      // Merge legacy student_id / degree_or_department into custom_fields before validation if needed
      const mergedRaw: Record<string, string | string[]> = {
        ...(input.custom_fields || {}),
      };
      if (resolvedStudentId && !mergedRaw.student_id) {
        mergedRaw.student_id = resolvedStudentId;
      }
      if (resolvedDepartment && !mergedRaw.degree_or_department) {
        mergedRaw.degree_or_department = resolvedDepartment;
      }

      const check = validateCustomFieldsAgainstQuestions(
        evRow.custom_questions,
        mergedRaw
      );
      if (!check.valid) {
        const firstErr =
          Object.values(check.errors)[0] ||
          "Please complete all required event questions.";
        throw new BookingSystemError("CUSTOM_FIELDS_INVALID", firstErr, 400);
      }
      sanitizedCustomFields = check.sanitized;

      if (
        !resolvedStudentId &&
        typeof sanitizedCustomFields.student_id === "string"
      ) {
        resolvedStudentId = sanitizedCustomFields.student_id;
      }
      if (
        !resolvedDepartment &&
        typeof sanitizedCustomFields.degree_or_department === "string"
      ) {
        resolvedDepartment = sanitizedCustomFields.degree_or_department;
      }
    }
  }

  // Fetch package & frame configuration from DB for server-trusted pricing & duration calculation
  let selectedPkg: PhotographyPackage | null = null;
  if (input.package_id) {
    const { data: pkgRow } = await supabase
      .from("photography_packages")
      .select("*")
      .eq("id", input.package_id)
      .maybeSingle();
    if (pkgRow) {
      selectedPkg = pkgRow as PhotographyPackage;
    }
  }

  let eventFrameConfig = null;
  if (input.event_id) {
    const { data: evData } = await supabase
      .from("booking_events")
      .select("frame_printing_config")
      .eq("id", input.event_id)
      .maybeSingle();
    if (evData?.frame_printing_config) {
      eventFrameConfig = evData.frame_printing_config;
    }
  }

  const verifiedPricing = calculateAndVerifyBookingPrice({
    pkg: selectedPkg,
    frameConfig: eventFrameConfig,
    frameSelected: input.frame_printing_selected,
    frameTypeId: input.frame_type_id,
    frameQuantity: input.frame_quantity,
  });

  const effectiveDuration = selectedPkg?.duration_mins || input.duration_mins || 30;

  const { data: createdRow, error: rpcErr } = await supabase.rpc(
    "create_booking_atomic",
    {
      p_idempotency_key: input.idempotency_key || null,
      p_user_id: userId,
      p_booking_type: input.booking_type,
      p_event_id: input.event_id || null,
      p_session_id: input.session_id || null,
      p_slot_id: input.slot_id || null,
      p_service_id: input.service_id || null,
      p_package_id: input.package_id || null,
      p_booking_date: input.booking_date,
      p_start_at: input.start_at,
      p_end_at: input.end_at,
      p_duration_mins: effectiveDuration,
      p_client_name: input.client_name,
      p_client_email: input.client_email,
      p_client_phone: input.client_phone,
      p_company_or_institution: input.company_or_institution || null,
      p_student_id: resolvedStudentId,
      p_degree_or_department: resolvedDepartment,
      p_guests_count: input.guests_count || 1,
      p_location: input.location,
      p_client_notes: input.client_notes || null,
      p_actor_role: actorRole,
      p_custom_fields: sanitizedCustomFields,
      p_package_base_price: verifiedPricing.package_base_price,
      p_frame_printing_selected: verifiedPricing.frame_printing_selected,
      p_frame_type_id: verifiedPricing.frame_type_id,
      p_frame_type_name: verifiedPricing.frame_type_name,
      p_frame_quantity: verifiedPricing.frame_quantity,
      p_frame_unit_price: verifiedPricing.frame_unit_price,
      p_frame_total_price: verifiedPricing.frame_total_price,
      p_total_price: verifiedPricing.total_price,
      p_pricing_snapshot: verifiedPricing.pricing_snapshot,
    }
  );

  if (rpcErr || !createdRow) {
    throw parseDatabaseBookingError(rpcErr || new Error("Booking creation failed"));
  }

  const booking = createdRow as Booking;

  // Dispatch Google Calendar sync & Gmail confirmation email safely outside the DB lock
  const [calRes, emailRes] = await Promise.all([
    syncBookingToGoogleCalendar({
      booking,
      operation: "create",
      idempotencyKey: `cal:${booking.id}:create`,
    }),
    sendBookingNotificationEmail({
      booking,
      notificationType: "booking_confirmed",
      idempotencyKey: `email:${booking.id}:booking_confirmed`,
    }),
  ]);

  return {
    ...booking,
    calendar_sync_status: calRes.status,
    google_calendar_event_id: calRes.googleEventId || booking.google_calendar_event_id,
    calendar_sync_error: calRes.error || null,
    email_send_status: emailRes.status,
    email_send_error: emailRes.error || null,
  };
}

/**
 * Executes the atomic reschedule workflow (Section 8 & 13):
 * 1. Validates ownership/policy and swaps the slot atomically via reschedule_booking_atomic RPC.
 * 2. Updates the Google Calendar event and dispatches the booking_rescheduled email via Gmail.
 */
export async function executeRescheduleBookingWorkflow(params: {
  bookingId: string;
  actorId: string;
  actorRole: "client" | "admin";
  input: RescheduleBookingInput;
  previousStartAt?: string | null;
  previousEndAt?: string | null;
}): Promise<Booking> {
  const { bookingId, actorId, actorRole, input, previousStartAt, previousEndAt } = params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new BookingSystemError("SUPABASE_UNAVAILABLE", "Database is not configured.", 503);
  }

  const { data: updatedRow, error: rpcErr } = await supabase.rpc(
    "reschedule_booking_atomic",
    {
      p_booking_id: bookingId,
      p_actor_id: actorId,
      p_actor_role: actorRole,
      p_new_slot_id: input.new_slot_id || null,
      p_new_date: input.new_date,
      p_new_start_at: input.new_start_at,
      p_new_end_at: input.new_end_at,
      p_reason: input.reason || null,
    }
  );

  if (rpcErr || !updatedRow) {
    throw parseDatabaseBookingError(rpcErr || new Error("Reschedule failed"));
  }

  const booking = updatedRow as Booking;

  const [calRes, emailRes] = await Promise.all([
    syncBookingToGoogleCalendar({
      booking,
      operation: booking.google_calendar_event_id ? "update" : "create",
      idempotencyKey: `cal:${booking.id}:reschedule:${booking.rescheduled_count}`,
    }),
    sendBookingNotificationEmail({
      booking,
      notificationType: "booking_rescheduled",
      idempotencyKey: `email:${booking.id}:reschedule:${booking.rescheduled_count}`,
      previousStartAt,
      previousEndAt,
    }),
  ]);

  return {
    ...booking,
    calendar_sync_status: calRes.status,
    google_calendar_event_id: calRes.googleEventId || booking.google_calendar_event_id,
    calendar_sync_error: calRes.error || null,
    email_send_status: emailRes.status,
    email_send_error: emailRes.error || null,
  };
}

/**
 * Executes the atomic cancellation workflow:
 * 1. Validates ownership/policy and releases slot capacity via cancel_booking_atomic RPC.
 * 2. Cancels the Google Calendar event and sends the booking_cancelled email via Gmail.
 */
export async function executeCancelBookingWorkflow(params: {
  bookingId: string;
  actorId: string;
  actorRole: "client" | "admin";
  reason: string;
}): Promise<Booking> {
  const { bookingId, actorId, actorRole, reason } = params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new BookingSystemError("SUPABASE_UNAVAILABLE", "Database is not configured.", 503);
  }

  const { data: cancelledRow, error: rpcErr } = await supabase.rpc(
    "cancel_booking_atomic",
    {
      p_booking_id: bookingId,
      p_actor_id: actorId,
      p_actor_role: actorRole,
      p_reason: reason,
    }
  );

  if (rpcErr || !cancelledRow) {
    throw parseDatabaseBookingError(rpcErr || new Error("Cancellation failed"));
  }

  const booking = cancelledRow as Booking;

  const [calRes, emailRes] = await Promise.all([
    syncBookingToGoogleCalendar({
      booking,
      operation: "cancel",
      idempotencyKey: `cal:${booking.id}:cancel`,
    }),
    sendBookingNotificationEmail({
      booking,
      notificationType: "booking_cancelled",
      idempotencyKey: `email:${booking.id}:booking_cancelled`,
    }),
  ]);

  return {
    ...booking,
    calendar_sync_status: calRes.status,
    calendar_sync_error: calRes.error || null,
    email_send_status: emailRes.status,
    email_send_error: emailRes.error || null,
  };
}

/**
 * Retries failed or pending Google Calendar and/or Gmail notifications for a booking.
 */
export async function retryBookingIntegrations(params: {
  bookingId: string;
  target: "both" | "calendar" | "email";
  notificationType?: NotificationType;
}): Promise<{
  booking: Booking;
  calendarResult?: any;
  emailResult?: any;
}> {
  const supabase = await createSupabasePrivilegedClient();
  if (!supabase) {
    throw new BookingSystemError("SUPABASE_UNAVAILABLE", "Database is not configured.", 503);
  }

  const { data: row, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.bookingId)
    .single();

  if (error || !row) {
    throw parseDatabaseBookingError(error || new Error("BOOKING_NOT_FOUND: Booking not found"));
  }

  const booking = row as Booking;
  let calendarResult: any;
  let emailResult: any;

  if (params.target === "both" || params.target === "calendar") {
    const op =
      booking.status === "cancelled"
        ? "cancel"
        : booking.google_calendar_event_id
        ? "update"
        : "create";
    calendarResult = await syncBookingToGoogleCalendar({
      booking,
      operation: op,
      idempotencyKey: `cal:${booking.id}:retry:${Date.now()}`,
    });
    booking.calendar_sync_status = calendarResult.status;
    booking.google_calendar_event_id =
      calendarResult.googleEventId || booking.google_calendar_event_id;
    booking.calendar_sync_error = calendarResult.error || null;
  }

  if (params.target === "both" || params.target === "email") {
    const notifType: NotificationType =
      params.notificationType ||
      (booking.status === "cancelled"
        ? "booking_cancelled"
        : booking.status === "rescheduled"
        ? "booking_rescheduled"
        : "booking_confirmed");

    emailResult = await sendBookingNotificationEmail({
      booking,
      notificationType: notifType,
      idempotencyKey: `email:${booking.id}:${notifType}:retry:${Date.now()}`,
    });
    booking.email_send_status = emailResult.status;
    booking.email_send_error = emailResult.error || null;
  }

  return {
    booking,
    calendarResult,
    emailResult,
  };
}
