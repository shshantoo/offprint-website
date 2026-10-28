import type { Booking, CalendarSyncStatus } from "@/types/database";
import { DEFAULT_TIMEZONE } from "@/lib/booking/timezone";
import { getValidGoogleAccessToken, isGoogleOAuthEnvConfigured } from "./oauth";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";

export interface GoogleCalendarEventPayload {
  summary: string;
  location: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  status?: "confirmed" | "cancelled";
  extendedProperties?: {
    private: Record<string, string>;
  };
}

/**
 * Builds the Google Calendar API event payload for a booking with Asia/Dhaka timezone
 * and complete reservation metadata.
 */
export function buildGoogleCalendarEventPayload(
  booking: Booking,
  operation: "create" | "update" | "cancel"
): GoogleCalendarEventPayload {
  const typeLabel =
    booking.booking_type === "convocation" || booking.booking_type === "special"
      ? booking.event_category_snapshot
        ? `Special Event (${booking.event_category_snapshot})`
        : "Special Event Photography"
      : "Photography Session";

  const summaryPrefix = operation === "cancel" ? "[CANCELLED] " : "[OFFPRINT] ";
  const summary = `${summaryPrefix}${booking.service_or_event_title} — ${booking.client_name} (${booking.booking_ref})`;

  const descLines = [
    `OFFPRINT Booking Reference: ${booking.booking_ref}`,
    `Booking Type: ${typeLabel}`,
    `Service / Event: ${booking.service_or_event_title}`,
    ...(booking.package_name
      ? [
          `Package: ${booking.package_name}${
            booking.package_price_label ? ` (${booking.package_price_label})` : ""
          }`,
        ]
      : []),
    `Duration: ${booking.duration_mins} minutes`,
    ...(booking.frame_printing_selected
      ? [
          ``,
          `FRAME PRINTING EXTRA`,
          `Frame: ${booking.frame_type_name || "Archival Frame"} (${booking.frame_quantity || 1} unit(s))`,
          `Frame Total: BDT ${(booking.frame_total_price || 0).toLocaleString()}`,
        ]
      : []),
    ...(booking.total_price && booking.total_price > 0
      ? [
          ``,
          `PRICING DOCKET`,
          `Package Base: BDT ${(booking.package_base_price || 0).toLocaleString()}`,
          ...(booking.frame_printing_selected
            ? [`Frame Charges: BDT ${(booking.frame_total_price || 0).toLocaleString()}`]
            : []),
          `Total Amount: BDT ${(booking.total_price || 0).toLocaleString()}`,
        ]
      : []),
    ``,
    `CLIENT DETAILS`,
    `Name: ${booking.client_name}`,
    `Email: ${booking.client_email}`,
    `Phone: ${booking.client_phone}`,
    ...(booking.company_or_institution
      ? [`Organization / Institution: ${booking.company_or_institution}`]
      : []),
    ...(booking.student_id ? [`Student ID: ${booking.student_id}`] : []),
    ...(booking.degree_or_department
      ? [`Department / Degree: ${booking.degree_or_department}`]
      : []),
    `Guests / Group Size: ${booking.guests_count}`,
    ...(booking.custom_fields && Object.keys(booking.custom_fields).length > 0
      ? [
          ``,
          `EVENT QUESTION RESPONSES`,
          ...Object.entries(booking.custom_fields).map(
            ([k, v]) =>
              `- ${k.replace(/_/g, " ")}: ${
                Array.isArray(v) ? v.join(", ") : String(v)
              }`
          ),
        ]
      : []),
    ...(booking.client_notes ? [``, `Client Notes:`, booking.client_notes] : []),
    ...(booking.cancellation_reason && operation === "cancel"
      ? [``, `Cancellation Reason: ${booking.cancellation_reason}`]
      : []),
  ];

  return {
    summary,
    location: booking.location,
    description: descLines.join("\n"),
    start: {
      dateTime: booking.start_at,
      timeZone: booking.timezone || DEFAULT_TIMEZONE,
    },
    end: {
      dateTime: booking.end_at,
      timeZone: booking.timezone || DEFAULT_TIMEZONE,
    },
    status: operation === "cancel" ? "cancelled" : "confirmed",
    extendedProperties: {
      private: {
        offprintBookingId: booking.id,
        offprintBookingRef: booking.booking_ref,
        offprintBookingType: booking.booking_type,
      },
    },
  };
}

export interface CalendarSyncResult {
  success: boolean;
  status: CalendarSyncStatus;
  googleEventId?: string | null;
  calendarId?: string | null;
  error?: string | null;
  deduplicated?: boolean;
}

/**
 * Synchronizes a booking creation, update/reschedule, or cancellation with Google Calendar API v3.
 * Enforces idempotency so retried operations never create duplicate Google Calendar events.
 * Never claims a booking is synced until the Google Calendar API operation succeeds.
 */
export async function syncBookingToGoogleCalendar(params: {
  booking: Booking;
  operation: "create" | "update" | "cancel";
  idempotencyKey?: string;
  fetchFn?: typeof fetch;
  overrideAuth?: {
    accessToken: string;
    calendarId: string;
    calendarSyncEnabled?: boolean;
  } | null;
  completedIdempotencyMap?: Map<string, string>;
}): Promise<CalendarSyncResult> {
  const {
    booking,
    operation,
    fetchFn = fetch,
    overrideAuth,
    completedIdempotencyMap,
  } = params;

  const idempotencyKey =
    params.idempotencyKey ||
    `cal:${booking.id}:${operation}:${booking.start_at}:${booking.status}`;

  // 1. Check in-memory idempotency map (used in unit tests or fast-path)
  if (completedIdempotencyMap?.has(idempotencyKey)) {
    const existingEventId = completedIdempotencyMap.get(idempotencyKey)!;
    return {
      success: true,
      status: operation === "cancel" ? "cancelled" : "synced",
      googleEventId: existingEventId,
      deduplicated: true,
    };
  }

  const supabase = overrideAuth ? null : await createSupabasePrivilegedClient();

  // 2. Check database calendar_sync_logs for existing synced operation with same idempotencyKey
  if (supabase) {
    try {
      const { data: existingLog } = await supabase
        .from("calendar_sync_logs")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingLog && existingLog.status === "synced" && existingLog.google_event_id) {
        return {
          success: true,
          status: operation === "cancel" ? "cancelled" : "synced",
          googleEventId: existingLog.google_event_id,
          calendarId: existingLog.calendar_id,
          deduplicated: true,
        };
      }
    } catch {
      // Proceed if table lookup fails
    }
  }

  // Also prevent duplicate 'create' if the booking already has a google_calendar_event_id
  const effectiveOperation: "create" | "update" | "cancel" =
    operation === "create" && booking.google_calendar_event_id
      ? "update"
      : operation;

  // 3. Resolve Google OAuth credentials
  let auth = overrideAuth;
  if (auth === undefined) {
    if (!isGoogleOAuthEnvConfigured()) {
      await updateBookingCalendarState(supabase, booking.id, {
        status: "not_configured",
        error: "Google OAuth environment variables not configured",
      });
      return {
        success: false,
        status: "not_configured",
        error: "Google Calendar OAuth credentials are not configured.",
      };
    }

    try {
      auth = await getValidGoogleAccessToken(fetchFn);
    } catch (err: any) {
      const errMsg = err?.message || "Failed to refresh Google OAuth token";
      await recordCalendarSyncLog(supabase, {
        bookingId: booking.id,
        operation: effectiveOperation,
        idempotencyKey,
        calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
        googleEventId: booking.google_calendar_event_id,
        status: "failed",
        errorMessage: errMsg,
      });
      await updateBookingCalendarState(supabase, booking.id, {
        status: "failed",
        error: errMsg,
      });
      return {
        success: false,
        status: "failed",
        error: errMsg,
      };
    }
  }

  if (!auth) {
    await updateBookingCalendarState(supabase, booking.id, {
      status: "not_configured",
      error: "Google account not connected in Admin Portal",
    });
    return {
      success: false,
      status: "not_configured",
      error: "Google Calendar integration is not connected yet.",
    };
  }

  if (auth.calendarSyncEnabled === false) {
    await updateBookingCalendarState(supabase, booking.id, {
      status: "disabled",
      error: null,
    });
    return {
      success: false,
      status: "disabled",
      error: "Google Calendar synchronization is disabled in settings.",
    };
  }

  const calendarId = encodeURIComponent(auth.calendarId || "primary");
  const payload = buildGoogleCalendarEventPayload(booking, effectiveOperation);

  try {
    let url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
    let method = "POST";

    if (
      (effectiveOperation === "update" || effectiveOperation === "cancel") &&
      booking.google_calendar_event_id
    ) {
      url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(
        booking.google_calendar_event_id
      )}`;
      method = "PATCH";
    } else if (effectiveOperation === "cancel" && !booking.google_calendar_event_id) {
      // Nothing on Google Calendar to cancel
      await updateBookingCalendarState(supabase, booking.id, {
        status: "cancelled",
        error: null,
      });
      return {
        success: true,
        status: "cancelled",
        googleEventId: null,
        calendarId: auth.calendarId,
      };
    }

    const res = await fetchFn(url, {
      method,
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Google Calendar API HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const googleEventId = String(
      data.id || booking.google_calendar_event_id || ""
    );
    const finalStatus: CalendarSyncStatus =
      effectiveOperation === "cancel" ? "cancelled" : "synced";

    if (completedIdempotencyMap && googleEventId) {
      completedIdempotencyMap.set(idempotencyKey, googleEventId);
    }

    await recordCalendarSyncLog(supabase, {
      bookingId: booking.id,
      operation: effectiveOperation,
      idempotencyKey,
      calendarId: auth.calendarId,
      googleEventId,
      status: "synced",
      errorMessage: null,
    });

    await updateBookingCalendarState(supabase, booking.id, {
      status: finalStatus,
      googleEventId,
      calendarId: auth.calendarId,
      error: null,
    });

    return {
      success: true,
      status: finalStatus,
      googleEventId,
      calendarId: auth.calendarId,
    };
  } catch (err: any) {
    const errMsg = err?.message || "Google Calendar synchronization failed";
    await recordCalendarSyncLog(supabase, {
      bookingId: booking.id,
      operation: effectiveOperation,
      idempotencyKey,
      calendarId: auth.calendarId,
      googleEventId: booking.google_calendar_event_id,
      status: "failed",
      errorMessage: errMsg,
    });
    await updateBookingCalendarState(supabase, booking.id, {
      status: "failed",
      error: errMsg,
    });

    return {
      success: false,
      status: "failed",
      googleEventId: booking.google_calendar_event_id,
      calendarId: auth.calendarId,
      error: errMsg,
    };
  }
}

async function recordCalendarSyncLog(
  supabase: any,
  entry: {
    bookingId: string;
    operation: "create" | "update" | "cancel";
    idempotencyKey: string;
    calendarId: string;
    googleEventId?: string | null;
    status: "pending" | "synced" | "failed";
    errorMessage?: string | null;
  }
) {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase
      .from("calendar_sync_logs")
      .select("id, attempt_count")
      .eq("idempotency_key", entry.idempotencyKey)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    if (existing) {
      await supabase
        .from("calendar_sync_logs")
        .update({
          status: entry.status,
          google_event_id: entry.googleEventId || null,
          attempt_count: (existing.attempt_count || 0) + 1,
          error_message: entry.errorMessage || null,
          synced_at: entry.status === "synced" ? nowIso : null,
          last_attempted_at: nowIso,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("calendar_sync_logs").insert({
        booking_id: entry.bookingId,
        operation: entry.operation,
        idempotency_key: entry.idempotencyKey,
        calendar_id: entry.calendarId,
        google_event_id: entry.googleEventId || null,
        status: entry.status,
        attempt_count: 1,
        error_message: entry.errorMessage || null,
        synced_at: entry.status === "synced" ? nowIso : null,
        last_attempted_at: nowIso,
      });
    }
  } catch {
    // Non-fatal logging error
  }
}

async function updateBookingCalendarState(
  supabase: any,
  bookingId: string,
  state: {
    status: CalendarSyncStatus;
    googleEventId?: string | null;
    calendarId?: string | null;
    error?: string | null;
  }
) {
  if (!supabase) return;
  try {
    const updates: Record<string, any> = {
      calendar_sync_status: state.status,
      calendar_sync_error: state.error ?? null,
      updated_at: new Date().toISOString(),
    };
    if (state.googleEventId !== undefined) {
      updates.google_calendar_event_id = state.googleEventId;
    }
    if (state.calendarId !== undefined) {
      updates.google_calendar_id = state.calendarId;
    }
    if (state.status === "synced" || state.status === "cancelled") {
      updates.calendar_last_synced_at = new Date().toISOString();
    }
    await supabase.from("bookings").update(updates).eq("id", bookingId);
  } catch {
    // Non-fatal update error
  }
}
