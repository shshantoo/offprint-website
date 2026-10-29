import { NextResponse } from "next/server";
import { isMissingSchemaError, requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGoogleIntegrationStatus } from "@/lib/google/oauth";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  try {
    const [
      bookingsRes,
      eventsRes,
      sessionsRes,
      clientsRes,
      failedEmailsRes,
      failedCalRes,
      googleStatus,
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("*")
        .order("start_at", { ascending: true }),
      supabase.from("booking_events").select("*"),
      supabase
        .from("event_sessions")
        .select("*")
        .gte("session_date", new Date().toISOString().slice(0, 10))
        .order("session_date", { ascending: true })
        .limit(10),
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("email_notifications")
        .select("*")
        .in("status", ["failed", "pending"])
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("calendar_sync_logs")
        .select("*")
        .in("status", ["failed", "pending"])
        .order("created_at", { ascending: false })
        .limit(20),
      getGoogleIntegrationStatus(),
    ]);

    if (bookingsRes.error && isMissingSchemaError(bookingsRes.error)) {
      return NextResponse.json({
        success: true,
        schemaReady: false,
        error:
          "Booking records are currently initializing. Review schema setup if this persists.",
        metrics: {
          totalBookings: 0,
          upcomingBookings: 0,
          confirmedBookings: 0,
          pendingActions: 0,
          cancelledBookings: 0,
          completedBookings: 0,
          convocationBookings: 0,
          traditionalBookings: 0,
          failedIntegrationsCount: 0,
        },
        byServiceOrEvent: [],
        upcomingConvocationSessions: [],
        recentClients: [],
        failedEmails: [],
        failedCalendarSyncs: [],
        googleStatus,
      });
    }

    const bookings = bookingsRes.data || [];
    const nowMs = Date.now();

    const totalBookings = bookings.length;
    const upcomingBookings = bookings.filter(
      (b: any) =>
        ["pending", "confirmed", "rescheduled"].includes(b.status) &&
        Date.parse(b.start_at) >= nowMs
    ).length;
    const confirmedBookings = bookings.filter((b: any) =>
      ["confirmed", "rescheduled"].includes(b.status)
    ).length;
    const cancelledBookings = bookings.filter(
      (b: any) => b.status === "cancelled"
    ).length;
    const completedBookings = bookings.filter(
      (b: any) => b.status === "completed"
    ).length;
    const convocationBookings = bookings.filter(
      (b: any) => b.booking_type === "convocation" && b.status !== "cancelled"
    ).length;
    const traditionalBookings = bookings.filter(
      (b: any) => b.booking_type === "traditional" && b.status !== "cancelled"
    ).length;

    const failedIntegrations = bookings.filter(
      (b: any) =>
        b.calendar_sync_status === "failed" ||
        b.email_send_status === "failed"
    );
    const pendingBookings = bookings.filter(
      (b: any) => b.status === "pending"
    ).length;

    // Group bookings by service_or_event_title
    const serviceCountsMap = new Map<
      string,
      { title: string; type: string; total: number; active: number }
    >();
    for (const b of bookings) {
      const key = b.service_or_event_title || "Untitled";
      const cur = serviceCountsMap.get(key) || {
        title: key,
        type: b.booking_type,
        total: 0,
        active: 0,
      };
      cur.total += 1;
      if (b.status !== "cancelled") cur.active += 1;
      serviceCountsMap.set(key, cur);
    }

    return NextResponse.json({
      success: true,
      schemaReady: true,
      metrics: {
        totalBookings,
        upcomingBookings,
        confirmedBookings,
        pendingActions: pendingBookings + failedIntegrations.length,
        cancelledBookings,
        completedBookings,
        convocationBookings,
        traditionalBookings,
        failedIntegrationsCount: failedIntegrations.length,
      },
      byServiceOrEvent: Array.from(serviceCountsMap.values()),
      upcomingConvocationSessions: sessionsRes.data || [],
      events: eventsRes.data || [],
      recentClients: clientsRes.data || [],
      failedEmails: failedEmailsRes.data || [],
      failedCalendarSyncs: failedCalRes.data || [],
      failedIntegrationBookings: failedIntegrations.slice(0, 15),
      googleStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to load admin overview",
      },
      { status: 500 }
    );
  }
}

