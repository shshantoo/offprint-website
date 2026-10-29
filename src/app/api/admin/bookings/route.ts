import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validations";
import {
  BookingSystemError,
  executeCreateBookingWorkflow,
  parseDatabaseBookingError,
} from "@/lib/booking/booking-service";
import { isMissingSchemaError, requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const bookingType = searchParams.get("bookingType");
    const eventId = searchParams.get("eventId");
    const serviceId = searchParams.get("serviceId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    let query = supabase
      .from("bookings")
      .select("*")
      .order("start_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (bookingType && bookingType !== "all") {
      query = query.eq("booking_type", bookingType);
    }
    if (eventId && eventId !== "all") {
      query = query.eq("event_id", eventId);
    }
    if (serviceId && serviceId !== "all") {
      query = query.eq("service_id", serviceId);
    }
    if (dateFrom) {
      query = query.gte("booking_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("booking_date", dateTo);
    }

    const [{ data: rows, error }, { data: notesRows }, { data: blocksRows }] =
      await Promise.all([
        query,
        supabase.from("booking_internal_notes").select("*"),
        supabase
          .from("availability_blocks")
          .select("*")
          .order("start_at", { ascending: true }),
      ]);

    if (error) {
      if (isMissingSchemaError(error)) {
        return NextResponse.json({
          success: true,
          schemaReady: false,
          data: [],
          blocks: [],
          error:
            "Booking records are currently initializing. Review schema setup if this persists.",
        });
      }
      throw error;
    }

    const notesMap = new Map<string, string>();
    for (const n of notesRows || []) {
      notesMap.set(n.booking_id, n.internal_notes);
    }

    let enriched = (rows || []).map((b: any) => ({
      ...b,
      internal_notes: notesMap.get(b.id) || "",
    }));

    if (search) {
      enriched = enriched.filter(
        (b: any) =>
          b.booking_ref?.toLowerCase().includes(search) ||
          b.client_name?.toLowerCase().includes(search) ||
          b.client_email?.toLowerCase().includes(search) ||
          b.client_phone?.toLowerCase().includes(search) ||
          b.service_or_event_title?.toLowerCase().includes(search) ||
          b.student_id?.toLowerCase().includes(search) ||
          b.location?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      schemaReady: true,
      data: enriched,
      blocks: blocksRows || [],
    });
  } catch (err: any) {
    const parsed = parseDatabaseBookingError(err);
    return NextResponse.json(
      { success: false, code: parsed.code, error: parsed.message },
      { status: parsed.httpStatus }
    );
  }
}

/**
 * POST /api/admin/bookings
 * Allows an administrator to create a booking on behalf of a client.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const json = await request.json();
    const parsed = createBookingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid booking parameters",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const booking = await executeCreateBookingWorkflow({
      input: parsed.data,
      userId: json.user_id || null,
      actorRole: "admin",
    });

    if (json.internal_notes) {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        await supabase.from("booking_internal_notes").upsert({
          booking_id: booking.id,
          internal_notes: String(json.internal_notes),
          updated_by: auth.context.user.id,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...booking,
          internal_notes: json.internal_notes || "",
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    const parsed =
      err instanceof BookingSystemError ? err : parseDatabaseBookingError(err);
    return NextResponse.json(
      { success: false, code: parsed.code, error: parsed.message },
      { status: parsed.httpStatus }
    );
  }
}

