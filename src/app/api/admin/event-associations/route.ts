import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json(
      { success: false, error: "Database client is not configured" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const archiveId = searchParams.get("archiveId");
    const bookingEventId = searchParams.get("bookingEventId");

    if (archiveId) {
      const { data, error } = await client
        .from("event_archive_booking_events")
        .select("booking_event_id, booking_events(*)")
        .eq("event_archive_id", archiveId);

      if (error) throw error;
      const bookingEvents = (data || []).map((row: any) => row.booking_events).filter(Boolean);
      return NextResponse.json({
        success: true,
        data: {
          booking_events: bookingEvents,
          booking_event_ids: (data || []).map((row: any) => row.booking_event_id),
        },
      });
    }

    if (bookingEventId) {
      const { data, error } = await client
        .from("event_archive_booking_events")
        .select("event_archive_id, event_archives(*)")
        .eq("booking_event_id", bookingEventId);

      if (error) throw error;
      const archives = (data || []).map((row: any) => row.event_archives).filter(Boolean);
      return NextResponse.json({
        success: true,
        data: {
          event_archives: archives,
          event_archive_ids: (data || []).map((row: any) => row.event_archive_id),
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Must specify archiveId or bookingEventId" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch event associations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const client = await createSupabasePrivilegedClient();
  if (!client) {
    return NextResponse.json(
      { success: false, error: "Database client is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { archiveId, bookingEventIds, bookingEventId, archiveIds } = body;

    // Association case 1: Updating booking events attached to an archive
    if (archiveId) {
      const targetIds: string[] = Array.isArray(bookingEventIds) ? bookingEventIds : [];

      // Delete existing associations for this archive
      const { error: delErr } = await client
        .from("event_archive_booking_events")
        .delete()
        .eq("event_archive_id", archiveId);

      if (delErr) throw delErr;

      // Insert new associations
      if (targetIds.length > 0) {
        const rows = targetIds.map((bId) => ({
          event_archive_id: archiveId,
          booking_event_id: bId,
        }));
        const { error: insErr } = await client
          .from("event_archive_booking_events")
          .insert(rows);

        if (insErr) throw insErr;
      }

      return NextResponse.json({
        success: true,
        message: "Archive booking event associations updated successfully.",
        data: { archiveId, bookingEventIds: targetIds },
      });
    }

    // Association case 2: Updating archives attached to a booking event
    if (bookingEventId) {
      const targetIds: string[] = Array.isArray(archiveIds) ? archiveIds : [];

      // Delete existing associations for this booking event
      const { error: delErr } = await client
        .from("event_archive_booking_events")
        .delete()
        .eq("booking_event_id", bookingEventId);

      if (delErr) throw delErr;

      // Insert new associations
      if (targetIds.length > 0) {
        const rows = targetIds.map((aId) => ({
          event_archive_id: aId,
          booking_event_id: bookingEventId,
        }));
        const { error: insErr } = await client
          .from("event_archive_booking_events")
          .insert(rows);

        if (insErr) throw insErr;
      }

      return NextResponse.json({
        success: true,
        message: "Booking event archive associations updated successfully.",
        data: { bookingEventId, archiveIds: targetIds },
      });
    }

    return NextResponse.json(
      { success: false, error: "Missing archiveId or bookingEventId" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update associations" },
      { status: 500 }
    );
  }
}
