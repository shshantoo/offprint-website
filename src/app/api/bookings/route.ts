import { NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/validations";
import {
  BookingSystemError,
  executeCreateBookingWorkflow,
  parseDatabaseBookingError,
} from "@/lib/booking/booking-service";
import {
  getServerAuthContext,
  isMissingSchemaError,
  requireServerAuth,
} from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/bookings
 * Returns authenticated client's own bookings (strictly scoped to user_id = auth.uid()).
 * Never exposes internal admin notes or other clients' records.
 */
export async function GET(request: NextRequest) {
  const auth = await requireServerAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        code: "SUPABASE_UNAVAILABLE",
        error: "Supabase is not configured.",
      },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    let query = supabase
      .from("bookings")
      .select("*, workflow_stage:workflow_stages(id, name, slug, sort_order, is_final_delivery, is_visible_to_client, client_facing_description)")
      .eq("user_id", auth.context.user.id)
      .order("start_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingSchemaError(error)) {
        return NextResponse.json(
          {
            success: false,
            code: "SCHEMA_NOT_INSTALLED",
            error:
              "Booking service is temporarily updating. Please try again shortly.",
          },
          { status: 503 }
        );
      }
      throw error;
    }

    // Ensure internal_notes is never present on client payload
    const sanitized = (data || []).map((row: any) => {
      const { internal_notes, ...rest } = row;
      return rest;
    });

    return NextResponse.json({
      success: true,
      data: sanitized,
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
 * POST /api/bookings
 * Atomically validates slot availability and creates a real reservation in Supabase,
 * then triggers Google Calendar event sync and Gmail confirmation email.
 */
export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = createBookingSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          error: parsed.error.issues[0]?.message || "Invalid booking details",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const authCtx = await getServerAuthContext();

    const booking = await executeCreateBookingWorkflow({
      input: parsed.data,
      userId: authCtx?.user.id || null,
      actorRole: "client",
    });

    const { internal_notes, ...publicBooking } = booking as any;

    return NextResponse.json(
      {
        success: true,
        data: publicBooking,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof BookingSystemError) {
      return NextResponse.json(
        {
          success: false,
          code: err.code,
          error: err.message,
        },
        { status: err.httpStatus }
      );
    }

    const parsed = parseDatabaseBookingError(err);
    return NextResponse.json(
      {
        success: false,
        code: parsed.code,
        error: parsed.message,
      },
      { status: parsed.httpStatus }
    );
  }
}

