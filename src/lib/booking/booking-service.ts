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
  type CreateMultiBookingInput,
  type RescheduleBookingInput,
  validateCustomFieldsAgainstQuestions,
  calculateAndVerifyBookingPrice,
  calculateAndVerifyMultiBookingPrice,
  calculateAndVerifyPaymentAccounting,
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
      "SERVICE_UPDATING",
      "Booking service is temporarily updating. Please check back shortly or contact our studio at inquiry@offprint.agency.",
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
  packageId?: string;
  year: number;
  month: number; // 1..12
  date?: string; // YYYY-MM-DD
  excludeBookingId?: string;
  flowToken?: string;
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
            "Booking service is temporarily updating. Please refresh or contact studio support.",
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

    // Fetch package associations from event_session_packages if available
    const sessionPackagesMap = new Map<string, string[]>();
    try {
      const { data: spRows, error: spErr } = await supabase
        .from("event_session_packages")
        .select("session_id, package_id");
      if (!spErr && spRows && Array.isArray(spRows)) {
        for (const row of spRows) {
          const list = sessionPackagesMap.get(row.session_id) || [];
          list.push(row.package_id);
          sessionPackagesMap.set(row.session_id, list);
        }
      }
    } catch {
      // Table may not exist yet or be empty
    }

    // Attach package_ids and available_packages to sessions
    for (const sess of sessions) {
      const attachedIds = sessionPackagesMap.get(sess.id);
      if (attachedIds && attachedIds.length > 0) {
        sess.package_ids = attachedIds;
        sess.available_packages = packages.filter((p) => attachedIds.includes(p.id));
      } else {
        // Default to all active packages for backward compatibility
        sess.package_ids = packages.map((p) => p.id);
        sess.available_packages = packages;
      }
    }

    // Resolve selected package details if packageId is supplied
    const selectedPkg = params.packageId
      ? packages.find((p) => p.id === params.packageId)
      : null;
    const packageDuration = selectedPkg?.duration_mins;

    // Filter sessions if packageId is supplied: only sessions that include this package
    const eligibleSessions = params.packageId
      ? sessions.filter(
          (s) =>
            !s.package_ids ||
            s.package_ids.length === 0 ||
            s.package_ids.includes(params.packageId!)
        )
      : sessions;
    const eligibleSessionIds = new Set(eligibleSessions.map((s) => s.id));

    // Filter slots: must belong to an eligible session, and if packageId provided, duration must match
    const eligibleSlots = slots.filter((slot) => {
      if (slot.session_id && !eligibleSessionIds.has(slot.session_id)) {
        return false;
      }
      if (selectedPkg && packageDuration) {
        const slotDuration =
          slot.duration_mins && slot.duration_mins > 0
            ? slot.duration_mins
            : Math.max(
                1,
                Math.round(
                  (Date.parse(slot.end_at) - Date.parse(slot.start_at)) / 60_000
                )
              );
        if (slotDuration !== packageDuration) {
          return false;
        }
        if (
          Array.isArray(slot.package_ids) &&
          slot.package_ids.length > 0 &&
          !slot.package_ids.includes(selectedPkg.id)
        ) {
          return false;
        }
      }
      return true;
    });

    const rangeStart = new Date(Date.UTC(params.year, params.month - 1, 1, 0, 0, 0)).toISOString();
    const rangeEnd = new Date(Date.UTC(params.year, params.month, 2, 23, 59, 59)).toISOString();

    const busyIntervals = await fetchBusyIntervalsFromDb(
      supabase,
      event.resource_pool,
      rangeStart,
      rangeEnd,
      params.excludeBookingId
    );

    // Fetch active unexpired holds to protect concurrent checkouts across durations
    let activeHolds: Array<{
      slot_id: string;
      flow_token?: string;
      start_at?: string;
      end_at?: string;
      effective_start_at?: string;
      effective_end_at?: string;
    }> = [];
    try {
      const { data: holdsData } = await supabase
        .from("booking_slot_holds")
        .select("*")
        .eq("event_id", event.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString());

      if (holdsData) {
        const slotTimingMap = new Map(slots.map((s) => [s.id, s]));
        activeHolds = holdsData.map((h: any) => {
          const matchedSlot = slotTimingMap.get(h.slot_id);
          return {
            slot_id: h.slot_id,
            flow_token: h.flow_token,
            start_at: matchedSlot?.start_at,
            end_at: matchedSlot?.end_at,
            effective_start_at: matchedSlot?.effective_start_at,
            effective_end_at: matchedSlot?.effective_end_at,
          };
        });
      }
    } catch {
      // Ignore if table not yet created
    }

    const allComputed = computeConvocationSlots({
      event,
      slots: eligibleSlots,
      sessions: eligibleSessions,
      blocks,
      busyIntervals,
      activeHolds,
      flowToken: params.flowToken,
      selectedPackageId: params.packageId,
      packageDurationMins: packageDuration,
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
      sessions: eligibleSessions,
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
            "Booking service is temporarily updating. Please refresh or contact studio support.",
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
      "SERVICE_UNAVAILABLE",
      "Booking service is temporarily unavailable. Please try again shortly.",
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
      .select("custom_questions, is_booking_enabled, status, booking_opens_at, booking_closes_at")
      .eq("id", input.event_id)
      .maybeSingle();

    if (evRow) {
      if (evRow.is_booking_enabled === false) {
        throw new BookingSystemError(
          "BOOKING_DISABLED",
          "Bookings are currently disabled for this special event.",
          403
        );
      }
      if (evRow.status !== "published" && actorRole !== "admin") {
        throw new BookingSystemError(
          "EVENT_NOT_PUBLISHED",
          "This special event is not currently accepting public bookings.",
          403
        );
      }
      if (evRow.booking_opens_at && new Date(evRow.booking_opens_at) > new Date() && actorRole !== "admin") {
        throw new BookingSystemError(
          "BOOKING_NOT_OPEN",
          "The booking window for this event has not opened yet.",
          403
        );
      }
      if (evRow.booking_closes_at && new Date(evRow.booking_closes_at) < new Date() && actorRole !== "admin") {
        throw new BookingSystemError(
          "BOOKING_CLOSED",
          "The booking deadline for this event has passed.",
          403
        );
      }
    }

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
      if (pkgRow.is_active === false && actorRole !== "admin") {
        throw new BookingSystemError(
          "PACKAGE_INACTIVE",
          "The selected package is no longer active for booking.",
          400
        );
      }
      if (input.event_id && pkgRow.event_id && pkgRow.event_id !== input.event_id) {
        throw new BookingSystemError(
          "PACKAGE_MISMATCH",
          "The selected package does not belong to this event.",
          400
        );
      }
      selectedPkg = pkgRow as PhotographyPackage;
    }
  }

  // Verify session package eligibility if session_id is provided
  if (input.session_id && input.package_id) {
    try {
      const { data: spRows } = await supabase
        .from("event_session_packages")
        .select("package_id")
        .eq("session_id", input.session_id);

      if (spRows && Array.isArray(spRows) && spRows.length > 0) {
        const isAllowed = spRows.some((r) => r.package_id === input.package_id);
        if (!isAllowed) {
          throw new BookingSystemError(
            "PACKAGE_NOT_AVAILABLE_FOR_SESSION",
            "The selected package is not available for this scheduled session.",
            400
          );
        }
      }
    } catch (err: any) {
      if (err instanceof BookingSystemError) throw err;
    }
  }

  // Verify slot duration matches package duration
  if (input.slot_id && selectedPkg && selectedPkg.duration_mins) {
    const { data: slotRow } = await supabase
      .from("event_time_slots")
      .select("*")
      .eq("id", input.slot_id)
      .maybeSingle();

    if (slotRow) {
      const slotDur =
        slotRow.duration_mins && slotRow.duration_mins > 0
          ? slotRow.duration_mins
          : Math.max(
              1,
              Math.round(
                (Date.parse(slotRow.end_at) - Date.parse(slotRow.start_at)) /
                  60_000
              )
            );
      if (slotDur !== selectedPkg.duration_mins) {
        throw new BookingSystemError(
          "DURATION_MISMATCH",
          `Selected slot duration (${slotDur}m) does not match package duration (${selectedPkg.duration_mins}m).`,
          400
        );
      }
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

  const paymentAccounting = calculateAndVerifyPaymentAccounting({
    paymentMethod: input.payment_method,
    paymentReference: input.payment_reference,
    isPartialAdvance: input.is_partial_advance,
    advanceAmount: input.advance_amount,
    authoritativeTotalPrice: verifiedPricing.total_price,
  });

  const effectiveDuration = selectedPkg?.duration_mins || input.duration_mins || 30;

  // If a hold_id was provided, verify it has not expired and matches package prior to booking commitment
  if (input.hold_id) {
    try {
      const { data: holdRow } = await supabase
        .from("booking_slot_holds")
        .select("id, status, expires_at, slot_id, flow_token, package_id")
        .eq("id", input.hold_id)
        .maybeSingle();

      if (holdRow) {
        if (
          holdRow.status !== "active" ||
          new Date(holdRow.expires_at).getTime() < Date.now()
        ) {
          throw new BookingSystemError(
            "SLOT_HOLD_EXPIRED",
            "Your temporary reservation on this time slot has expired. Please select a time slot again.",
            409
          );
        }
        if (
          input.package_id &&
          holdRow.package_id &&
          holdRow.package_id !== input.package_id
        ) {
          throw new BookingSystemError(
            "HOLD_PACKAGE_MISMATCH",
            "Your reserved slot hold was acquired for a different package. Please select an available slot for this package.",
            400
          );
        }
      }
    } catch (err: any) {
      if (err instanceof BookingSystemError) throw err;
      // Non-fatal if holds table is optional in offline tests
    }
  }

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

  // Persist authoritative payment details and advance accounting
  try {
    await supabase
      .from("bookings")
      .update({
        payment_method: paymentAccounting.payment_method,
        payment_reference: paymentAccounting.payment_reference,
        is_partial_advance: paymentAccounting.is_partial_advance,
        advance_amount: paymentAccounting.advance_amount,
        amount_paid: paymentAccounting.amount_paid,
        balance_amount: paymentAccounting.balance_amount,
        payment_status: paymentAccounting.payment_status,
        payment_submitted_at: paymentAccounting.payment_submitted_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);
    Object.assign(booking, paymentAccounting);
  } catch (payErr) {
    console.warn("Payment accounting update warning:", payErr);
  }

  // Atomically mark any associated temporary slot hold as consumed
  if (input.hold_id) {
    try {
      await supabase.rpc("consume_slot_hold", {
        p_hold_id: input.hold_id,
        p_flow_token: input.flow_token || "",
        p_booking_id: booking.id,
        p_booking_ref: booking.booking_ref,
      });
    } catch {
      try {
        await supabase
          .from("booking_slot_holds")
          .update({
            status: "consumed",
            consumed_booking_id: booking.id,
            consumed_booking_ref: booking.booking_ref,
          })
          .eq("id", input.hold_id);
      } catch {
        // Non-critical background status update
      }
    }
  }

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
 * Executes atomic multi-package & multi-slot booking confirmation (Release 1.8.0).
 * Validates holds, package durations, cross-appointment overlaps, server-side basket pricing,
 * and atomically creates all booking records grouped under a shared booking_group_id / booking_group_ref.
 */
export async function executeCreateMultiBookingWorkflow(params: {
  input: CreateMultiBookingInput;
  userId?: string | null;
  actorRole?: "client" | "admin";
}): Promise<{ primaryBooking: Booking; allBookings: Booking[]; groupRef: string }> {
  const { input, userId = null, actorRole = "client" } = params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new BookingSystemError(
      "SERVICE_UNAVAILABLE",
      "Booking service is temporarily unavailable. Please try again shortly.",
      503
    );
  }

  // 1. Verify Event settings & questions
  const { data: evRow } = await supabase
    .from("booking_events")
    .select("custom_questions, is_booking_enabled, status, booking_opens_at, booking_closes_at, frame_printing_config, title, location")
    .eq("id", input.event_id)
    .maybeSingle();

  if (!evRow) {
    throw new BookingSystemError("EVENT_NOT_FOUND", "Special event not found.", 404);
  }

  if (evRow.is_booking_enabled === false) {
    throw new BookingSystemError("BOOKING_DISABLED", "Bookings are currently disabled for this special event.", 403);
  }
  if (evRow.status !== "published" && actorRole !== "admin") {
    throw new BookingSystemError("EVENT_NOT_PUBLISHED", "This special event is not accepting public bookings.", 403);
  }
  if (evRow.booking_opens_at && new Date(evRow.booking_opens_at) > new Date() && actorRole !== "admin") {
    throw new BookingSystemError("BOOKING_NOT_OPEN", "The booking window for this event has not opened yet.", 403);
  }
  if (evRow.booking_closes_at && new Date(evRow.booking_closes_at) < new Date() && actorRole !== "admin") {
    throw new BookingSystemError("BOOKING_CLOSED", "The booking deadline for this event has passed.", 403);
  }

  // Sanitize custom fields
  let sanitizedCustomFields: Record<string, string | string[]> = input.custom_fields || {};
  let resolvedStudentId = input.student_id || null;
  let resolvedDepartment = input.degree_or_department || null;

  if (Array.isArray(evRow.custom_questions) && evRow.custom_questions.length > 0) {
    const mergedRaw: Record<string, string | string[]> = { ...(input.custom_fields || {}) };
    if (resolvedStudentId && !mergedRaw.student_id) mergedRaw.student_id = resolvedStudentId;
    if (resolvedDepartment && !mergedRaw.degree_or_department) mergedRaw.degree_or_department = resolvedDepartment;

    const check = validateCustomFieldsAgainstQuestions(evRow.custom_questions, mergedRaw);
    if (!check.valid) {
      const firstErr = Object.values(check.errors)[0] || "Please complete all required event questions.";
      throw new BookingSystemError("CUSTOM_FIELDS_INVALID", firstErr, 400);
    }
    sanitizedCustomFields = check.sanitized;
    if (!resolvedStudentId && typeof sanitizedCustomFields.student_id === "string") {
      resolvedStudentId = sanitizedCustomFields.student_id;
    }
    if (!resolvedDepartment && typeof sanitizedCustomFields.degree_or_department === "string") {
      resolvedDepartment = sanitizedCustomFields.degree_or_department;
    }
  }

  // 2. Fetch all packages referenced in the basket
  const uniquePkgIds = Array.from(new Set(input.items.map((it) => it.package_id)));
  const { data: pkgRows } = await supabase
    .from("photography_packages")
    .select("*")
    .in("id", uniquePkgIds);

  const pkgMap = new Map<string, PhotographyPackage>();
  (pkgRows || []).forEach((p) => pkgMap.set(p.id, p as PhotographyPackage));

  for (const pkgId of uniquePkgIds) {
    const pkg = pkgMap.get(pkgId);
    if (!pkg) {
      throw new BookingSystemError("PACKAGE_NOT_FOUND", `Package ${pkgId} was not found.`, 404);
    }
    if (pkg.is_active === false && actorRole !== "admin") {
      throw new BookingSystemError("PACKAGE_INACTIVE", `Package "${pkg.name}" is no longer active.`, 400);
    }
  }

  // 3. Verify all slots, holds, and durations
  const uniqueSlotIds = Array.from(new Set(input.items.map((it) => it.slot_id)));
  if (uniqueSlotIds.length !== input.items.length) {
    throw new BookingSystemError(
      "DUPLICATE_SLOT_SELECTION",
      "Duplicate time slots were found in your booking basket. Each appointment must have a unique time slot.",
      400
    );
  }

  const { data: slotRows } = await supabase
    .from("event_time_slots")
    .select("*")
    .in("id", uniqueSlotIds);

  const slotMap = new Map<string, any>();
  (slotRows || []).forEach((s) => slotMap.set(s.id, s));

  for (const item of input.items) {
    const slot = slotMap.get(item.slot_id);
    if (!slot) {
      throw new BookingSystemError("SLOT_NOT_FOUND", `Selected time slot ${item.slot_id} does not exist.`, 404);
    }
    if (slot.status !== "available") {
      throw new BookingSystemError("SLOT_UNAVAILABLE", `Time slot (${slot.label || slot.start_at}) is not open for booking.`, 409);
    }

    const pkg = pkgMap.get(item.package_id)!;
    const slotDur =
      slot.duration_mins && slot.duration_mins > 0
        ? slot.duration_mins
        : Math.max(1, Math.round((Date.parse(slot.end_at) - Date.parse(slot.start_at)) / 60_000));

    if (pkg.duration_mins && slotDur !== pkg.duration_mins) {
      throw new BookingSystemError(
        "DURATION_MISMATCH",
        `Slot duration (${slotDur}m) does not match selected package duration (${pkg.duration_mins}m).`,
        400
      );
    }

    if (item.hold_id) {
      const { data: holdRow } = await supabase
        .from("booking_slot_holds")
        .select("id, status, expires_at, slot_id, package_id")
        .eq("id", item.hold_id)
        .maybeSingle();

      if (holdRow) {
        if (holdRow.status !== "active" || new Date(holdRow.expires_at).getTime() < Date.now()) {
          throw new BookingSystemError(
            "SLOT_HOLD_EXPIRED",
            `Your temporary hold on the ${slot.label || item.booking_date} appointment has expired. Please select a time slot again.`,
            409
          );
        }
      }
    }
  }

  // 4. Overlap & shared capacity check among basket items themselves
  for (let i = 0; i < input.items.length; i++) {
    for (let j = i + 1; j < input.items.length; j++) {
      const itA = input.items[i];
      const itB = input.items[j];
      const startA = Date.parse(itA.start_at);
      const endA = Date.parse(itA.end_at);
      const startB = Date.parse(itB.start_at);
      const endB = Date.parse(itB.end_at);

      if (startA < endB && endA > startB) {
        const slotA = slotMap.get(itA.slot_id);
        const slotB = slotMap.get(itB.slot_id);
        if ((slotA?.capacity || 1) <= 1 || (slotB?.capacity || 1) <= 1) {
          throw new BookingSystemError(
            "OVERLAPPING_APPOINTMENTS",
            `Selected appointments (${itA.booking_date} ${itA.start_at.slice(11, 16)} and ${itB.booking_date} ${itB.start_at.slice(11, 16)}) overlap with each other and exceed studio capacity.`,
            409
          );
        }
      }
    }
  }

  // 5. Server-side authoritative price verification
  const multiPricing = calculateAndVerifyMultiBookingPrice({
    items: input.items.map((it) => ({
      pkg: pkgMap.get(it.package_id),
      duration_mins: it.duration_mins,
    })),
    frameConfig: evRow.frame_printing_config,
    frameSelected: input.frame_printing_selected,
    frameTypeId: input.frame_type_id,
    frameQuantity: input.frame_quantity,
  });

  // 6. Calculate authoritative group payment accounting
  const groupPaymentAccounting = calculateAndVerifyPaymentAccounting({
    paymentMethod: input.payment_method,
    paymentReference: input.payment_reference,
    isPartialAdvance: input.is_partial_advance,
    advanceAmount: input.advance_amount,
    authoritativeTotalPrice: multiPricing.total_price,
  });

  // 7. Generate stable group identity
  const yearStr = new Date().getFullYear().toString();
  const randSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const groupRef = `OFP-${yearStr}-G${randSuffix}`;
  const groupId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `group_${Date.now()}`;

  // 8. Atomically create all individual booking records
  const confirmedBookings: Booking[] = [];
  const holdsToConsume: string[] = [];

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    const pkg = pkgMap.get(item.package_id)!;
    const slot = slotMap.get(item.slot_id)!;
    const isPrimary = i === 0;

    const itemBasePrice = multiPricing.item_breakdown[i]?.package_base_price || 0;
    const itemTotalPrice = isPrimary ? itemBasePrice + multiPricing.frame_total_price : itemBasePrice;

    const { data: createdRow, error: rpcErr } = await supabase.rpc(
      "create_booking_atomic",
      {
        p_idempotency_key: input.idempotency_key ? `${input.idempotency_key}:${i}` : null,
        p_user_id: userId,
        p_booking_type: "convocation",
        p_event_id: input.event_id,
        p_session_id: item.session_id || slot.session_id,
        p_slot_id: item.slot_id,
        p_service_id: null,
        p_package_id: item.package_id,
        p_booking_date: item.booking_date,
        p_start_at: item.start_at,
        p_end_at: item.end_at,
        p_duration_mins: pkg.duration_mins || item.duration_mins || 30,
        p_client_name: input.client_name,
        p_client_email: input.client_email,
        p_client_phone: input.client_phone,
        p_company_or_institution: input.company_or_institution || null,
        p_student_id: resolvedStudentId,
        p_degree_or_department: resolvedDepartment,
        p_guests_count: input.guests_count || 1,
        p_location: input.location || evRow.location || "OFFPRINT Studio, Dhaka",
        p_client_notes: input.client_notes || null,
        p_actor_role: actorRole,
        p_custom_fields: sanitizedCustomFields,
        p_package_base_price: itemBasePrice,
        p_frame_printing_selected: isPrimary ? multiPricing.frame_printing_selected : false,
        p_frame_type_id: isPrimary ? multiPricing.frame_type_id : null,
        p_frame_type_name: isPrimary ? multiPricing.frame_type_name : null,
        p_frame_quantity: isPrimary ? multiPricing.frame_quantity : 0,
        p_frame_unit_price: isPrimary ? multiPricing.frame_unit_price : 0,
        p_frame_total_price: isPrimary ? multiPricing.frame_total_price : 0,
        p_total_price: itemTotalPrice,
        p_pricing_snapshot: isPrimary ? multiPricing.pricing_snapshot : {
          currency: multiPricing.currency,
          package_id: pkg.id,
          package_name: pkg.name,
          package_base_price: itemBasePrice,
          total_price: itemBasePrice,
          calculated_at: new Date().toISOString(),
        },
      }
    );

    if (rpcErr || !createdRow) {
      throw parseDatabaseBookingError(rpcErr || new Error(`Failed to confirm booking item ${i + 1}`));
    }

    const createdBooking = createdRow as Booking;

    const itemPaymentFields = isPrimary
      ? {
          payment_method: groupPaymentAccounting.payment_method,
          payment_reference: groupPaymentAccounting.payment_reference,
          is_partial_advance: groupPaymentAccounting.is_partial_advance,
          advance_amount: groupPaymentAccounting.advance_amount,
          amount_paid: groupPaymentAccounting.amount_paid,
          balance_amount: groupPaymentAccounting.balance_amount,
          payment_status: groupPaymentAccounting.payment_status,
          payment_submitted_at: groupPaymentAccounting.payment_submitted_at,
        }
      : {
          payment_method: groupPaymentAccounting.payment_method,
          payment_reference: null,
          is_partial_advance: false,
          advance_amount: null,
          amount_paid: 0,
          balance_amount: 0,
          payment_status: groupPaymentAccounting.payment_status,
          payment_submitted_at: groupPaymentAccounting.payment_submitted_at,
        };

    // Attach group metadata & payment accounting to the created booking record
    await supabase
      .from("bookings")
      .update({
        booking_group_id: groupId,
        booking_group_ref: groupRef,
        group_total_amount: multiPricing.total_price,
        is_primary_group_item: isPrimary,
        ...itemPaymentFields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdBooking.id);

    confirmedBookings.push({
      ...createdBooking,
      booking_group_id: groupId,
      booking_group_ref: groupRef,
      group_total_amount: multiPricing.total_price,
      is_primary_group_item: isPrimary,
      ...itemPaymentFields,
    });

    if (item.hold_id) {
      holdsToConsume.push(item.hold_id);
    }
  }

  // 8. Consume all holds
  for (const hId of holdsToConsume) {
    try {
      await supabase.rpc("consume_slot_hold", {
        p_hold_id: hId,
        p_flow_token: input.flow_token || "",
        p_booking_id: confirmedBookings[0].id,
        p_booking_ref: groupRef,
      });
    } catch {
      await supabase
        .from("booking_slot_holds")
        .update({
          status: "consumed",
          consumed_booking_id: confirmedBookings[0].id,
          consumed_booking_ref: groupRef,
        })
        .eq("id", hId);
    }
  }

  const primary = confirmedBookings[0];

  // 9. Dispatch a single combined Google Calendar event & confirmation email
  const [calRes, emailRes] = await Promise.all([
    syncBookingToGoogleCalendar({
      booking: primary,
      operation: "create",
      idempotencyKey: `cal:${groupId}:create`,
    }),
    sendBookingNotificationEmail({
      booking: primary,
      notificationType: "booking_confirmed",
      idempotencyKey: `email:${groupId}:booking_confirmed`,
    }),
  ]);

  return {
    primaryBooking: {
      ...primary,
      calendar_sync_status: calRes.status,
      google_calendar_event_id: calRes.googleEventId || primary.google_calendar_event_id,
      email_send_status: emailRes.status,
    },
    allBookings: confirmedBookings,
    groupRef,
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
