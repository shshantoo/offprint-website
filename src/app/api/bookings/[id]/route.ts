import { NextRequest, NextResponse } from "next/server";
import {
  cancelBookingSchema,
  rescheduleBookingSchema,
} from "@/lib/validations";
import {
  BookingSystemError,
  executeCancelBookingWorkflow,
  executeRescheduleBookingWorkflow,
  parseDatabaseBookingError,
} from "@/lib/booking/booking-service";
import { checkPolicyDeadline } from "@/lib/booking/timezone";
import { requireServerAuth } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireServerAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  try {
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw parseDatabaseBookingError(error);
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    // Strict ownership enforcement
    if (
      !auth.context.isAdmin &&
      booking.user_id !== auth.context.user.id
    ) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to view this booking." },
        { status: 403 }
      );
    }

    const { data: history } = await supabase
      .from("booking_status_history")
      .select("*")
      .eq("booking_id", id)
      .order("created_at", { ascending: false });

    const cancelPolicy = checkPolicyDeadline(
      booking.start_at,
      booking.cancellation_cutoff_hours
    );
    const reschedulePolicy = checkPolicyDeadline(
      booking.start_at,
      booking.reschedule_cutoff_hours
    );

    const isActive = ["pending", "confirmed", "rescheduled"].includes(
      booking.status
    );

    const { internal_notes, ...safeBooking } = booking;

    return NextResponse.json({
      success: true,
      data: {
        booking: safeBooking,
        history: history || [],
        policy: {
          canCancel: isActive && (auth.context.isAdmin || cancelPolicy.allowed),
          canReschedule:
            isActive && (auth.context.isAdmin || reschedulePolicy.allowed),
          cancelDeadlineIso: cancelPolicy.deadlineIso,
          rescheduleDeadlineIso: reschedulePolicy.deadlineIso,
          hoursUntilSession: cancelPolicy.hoursRemaining,
        },
      },
    });
  } catch (err: any) {
    const parsed =
      err instanceof BookingSystemError ? err : parseDatabaseBookingError(err);
    return NextResponse.json(
      { success: false, code: parsed.code, error: parsed.message },
      { status: parsed.httpStatus }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireServerAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const action = body.action as "reschedule" | "cancel";

    // Fetch existing booking to verify ownership and capture previous schedule
    const { data: existing, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      throw parseDatabaseBookingError(fetchErr);
    }
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    if (
      !auth.context.isAdmin &&
      existing.user_id !== auth.context.user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Access denied. You can only modify your own bookings." },
        { status: 403 }
      );
    }

    const actorRole = auth.context.isAdmin ? "admin" : "client";

    if (action === "reschedule") {
      const parsed = rescheduleBookingSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: parsed.error.issues[0]?.message || "Invalid reschedule parameters",
          },
          { status: 400 }
        );
      }

      const updated = await executeRescheduleBookingWorkflow({
        bookingId: id,
        actorId: auth.context.user.id,
        actorRole,
        input: parsed.data,
        previousStartAt: existing.start_at,
        previousEndAt: existing.end_at,
      });

      const { internal_notes, ...safeUpdated } = updated as any;
      return NextResponse.json({
        success: true,
        data: safeUpdated,
      });
    } else if (action === "cancel") {
      const parsed = cancelBookingSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: parsed.error.issues[0]?.message || "Please provide a reason for cancellation",
          },
          { status: 400 }
        );
      }

      const cancelled = await executeCancelBookingWorkflow({
        bookingId: id,
        actorId: auth.context.user.id,
        actorRole,
        reason: parsed.data.reason,
      });

      const { internal_notes, ...safeCancelled } = cancelled as any;
      return NextResponse.json({
        success: true,
        data: safeCancelled,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported actions: reschedule, cancel." },
      { status: 400 }
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

