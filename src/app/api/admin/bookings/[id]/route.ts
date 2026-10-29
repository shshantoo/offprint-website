import { NextRequest, NextResponse } from "next/server";
import { rescheduleBookingSchema } from "@/lib/validations";
import {
  BookingSystemError,
  executeCancelBookingWorkflow,
  executeRescheduleBookingWorkflow,
  parseDatabaseBookingError,
  retryBookingIntegrations,
} from "@/lib/booking/booking-service";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncBookingToGoogleCalendar } from "@/lib/google/calendar";
import { sendBookingNotificationEmail } from "@/lib/google/gmail";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth();
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
      .select("*, workflow_stage:workflow_stages(id, name, slug, sort_order, is_final_delivery, is_visible_to_client)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw parseDatabaseBookingError(error);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    const [notesRes, historyRes, emailsRes, calLogsRes, clientHistoryRes] =
      await Promise.all([
        supabase
          .from("booking_internal_notes")
          .select("*")
          .eq("booking_id", id)
          .maybeSingle(),
        supabase
          .from("booking_status_history")
          .select("*")
          .eq("booking_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("email_notifications")
          .select("*")
          .eq("booking_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("calendar_sync_logs")
          .select("*")
          .eq("booking_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select("id, booking_ref, booking_type, service_or_event_title, start_at, status")
          .eq("client_email", booking.client_email)
          .neq("id", id)
          .order("start_at", { ascending: false })
          .limit(10),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        booking: {
          ...booking,
          internal_notes: notesRes.data?.internal_notes || "",
        },
        history: historyRes.data || [],
        emailNotifications: emailsRes.data || [],
        calendarSyncLogs: calLogsRes.data || [],
        clientBookingHistory: clientHistoryRes.data || [],
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
  const auth = await requireAdminAuth();
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
    const action = body.action as string;

    const { data: existing, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) throw parseDatabaseBookingError(fetchErr);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Booking not found." },
        { status: 404 }
      );
    }

    if (action === "update_internal_notes") {
      const notes = String(body.internal_notes ?? "");
      const { error: noteErr } = await supabase
        .from("booking_internal_notes")
        .upsert({
          booking_id: id,
          internal_notes: notes,
          updated_by: auth.context.user.id,
          updated_at: new Date().toISOString(),
        });

      if (noteErr) throw parseDatabaseBookingError(noteErr);
      return NextResponse.json({
        success: true,
        data: { booking_id: id, internal_notes: notes },
      });
    }

    if (action === "reschedule") {
      const parsed = rescheduleBookingSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: parsed.error.issues[0]?.message || "Invalid reschedule details",
          },
          { status: 400 }
        );
      }

      const updated = await executeRescheduleBookingWorkflow({
        bookingId: id,
        actorId: auth.context.user.id,
        actorRole: "admin",
        input: parsed.data,
        previousStartAt: existing.start_at,
        previousEndAt: existing.end_at,
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "cancel") {
      const reason = String(body.reason || "Cancelled by administrator");
      const cancelled = await executeCancelBookingWorkflow({
        bookingId: id,
        actorId: auth.context.user.id,
        actorRole: "admin",
        reason,
      });

      return NextResponse.json({ success: true, data: cancelled });
    }

    if (action === "update_status") {
      const newStatus = body.status as "pending" | "confirmed" | "completed" | "cancelled";
      if (newStatus === "cancelled") {
        const cancelled = await executeCancelBookingWorkflow({
          bookingId: id,
          actorId: auth.context.user.id,
          actorRole: "admin",
          reason: String(body.reason || "Cancelled by administrator"),
        });
        return NextResponse.json({ success: true, data: cancelled });
      }

      const { data: updated, error: updErr } = await supabase
        .from("bookings")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw parseDatabaseBookingError(updErr);

      await supabase.from("booking_status_history").insert({
        booking_id: id,
        previous_status: existing.status,
        new_status: newStatus,
        action: `status_changed_to_${newStatus}`,
        previous_start_at: existing.start_at,
        new_start_at: existing.start_at,
        actor_id: auth.context.user.id,
        actor_role: "admin",
        reason: body.reason || `Status updated to ${newStatus} by administrator`,
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "update_details" || action === "update_package_and_pricing") {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (body.client_name !== undefined) updates.client_name = String(body.client_name).trim();
      if (body.client_email !== undefined)
        updates.client_email = String(body.client_email).trim().toLowerCase();
      if (body.client_phone !== undefined) updates.client_phone = String(body.client_phone).trim();
      if (body.location !== undefined) updates.location = String(body.location).trim();
      if (body.company_or_institution !== undefined)
        updates.company_or_institution = body.company_or_institution || null;
      if (body.student_id !== undefined) updates.student_id = body.student_id || null;
      if (body.degree_or_department !== undefined)
        updates.degree_or_department = body.degree_or_department || null;
      if (body.guests_count !== undefined) updates.guests_count = Number(body.guests_count) || 1;
      if (body.client_notes !== undefined) updates.client_notes = body.client_notes || null;
      if (body.package_name !== undefined) updates.package_name = body.package_name || null;
      if (body.package_id !== undefined) updates.package_id = body.package_id || null;
      if (body.package_price_label !== undefined) updates.package_price_label = body.package_price_label || null;
      if (body.package_base_price !== undefined) updates.package_base_price = Number(body.package_base_price) || 0;
      if (body.frame_printing_selected !== undefined) updates.frame_printing_selected = Boolean(body.frame_printing_selected);
      if (body.frame_type_id !== undefined) updates.frame_type_id = body.frame_type_id || null;
      if (body.frame_type_name !== undefined) updates.frame_type_name = body.frame_type_name || null;
      if (body.frame_quantity !== undefined) updates.frame_quantity = Number(body.frame_quantity) || 0;
      if (body.frame_unit_price !== undefined) updates.frame_unit_price = Number(body.frame_unit_price) || 0;
      if (body.frame_total_price !== undefined) updates.frame_total_price = Number(body.frame_total_price) || 0;
      if (body.total_price !== undefined) updates.total_price = Number(body.total_price) || 0;
      if (body.pricing_snapshot !== undefined) updates.pricing_snapshot = body.pricing_snapshot;

      // Handle duration modification with conflict verification
      if (body.duration_mins !== undefined && Number(body.duration_mins) > 0) {
        const newDuration = Number(body.duration_mins);
        const startMs = Date.parse(existing.start_at);
        const newEndIso = new Date(startMs + newDuration * 60_000).toISOString();
        const effEndIso = new Date(
          startMs + (newDuration + (existing.buffer_after_mins || 10)) * 60_000
        ).toISOString();

        // Check for conflicting active bookings if duration expanded
        if (newDuration > (existing.duration_mins || 30)) {
          const { data: conflicts } = await supabase
            .from("bookings")
            .select("id, booking_ref, client_name, start_at, end_at")
            .eq("resource_pool", existing.resource_pool)
            .in("status", ["pending", "confirmed", "rescheduled"])
            .neq("id", id)
            .lt("effective_start_at", effEndIso)
            .gt("effective_end_at", existing.effective_start_at);

          if (conflicts && conflicts.length > 0) {
            return NextResponse.json(
              {
                success: false,
                code: "RESOURCE_CONFLICT",
                error: `Extending duration to ${newDuration} mins causes a schedule conflict with booking ${conflicts[0].booking_ref} (${conflicts[0].client_name}).`,
              },
              { status: 409 }
            );
          }
        }

        updates.duration_mins = newDuration;
        updates.end_at = newEndIso;
        updates.effective_end_at = effEndIso;
      }

      const { data: updated, error: updErr } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw parseDatabaseBookingError(updErr);

      await supabase.from("booking_status_history").insert({
        booking_id: id,
        previous_status: existing.status,
        new_status: updated.status,
        action: "admin_updated_details",
        previous_start_at: existing.start_at,
        new_start_at: updated.start_at,
        actor_id: auth.context.user.id,
        actor_role: "admin",
        reason: body.reason || "Booking details updated by administrator",
      });

      if (body.notify_client) {
        await Promise.all([
          syncBookingToGoogleCalendar({
            booking: updated,
            operation: updated.google_calendar_event_id ? "update" : "create",
            idempotencyKey: `cal:${updated.id}:admin_edit:${Date.now()}`,
          }),
          sendBookingNotificationEmail({
            booking: updated,
            notificationType: "booking_updated",
            idempotencyKey: `email:${updated.id}:booking_updated:${Date.now()}`,
          }),
        ]);
      }

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "update_delivery_and_workflow") {
      const {
        workflow_stage_id,
        delivery_url,
        delivery_validity_days,
        delivery_message,
        send_notification_email = true,
      } = body;

      let targetStage: any = null;
      if (workflow_stage_id) {
        const { data: stg } = await supabase
          .from("workflow_stages")
          .select("*")
          .eq("id", workflow_stage_id)
          .maybeSingle();
        targetStage = stg;
      }

      const activeDeliveryUrl = (delivery_url ?? existing.delivery_url ?? "").trim();
      const validityDays = Number(
        delivery_validity_days ||
          existing.delivery_validity_days ||
          targetStage?.default_validity_days ||
          14
      );

      const requiresPhotoLink =
        targetStage?.is_link_required || targetStage?.is_final_delivery;

      if (requiresPhotoLink) {
        if (!activeDeliveryUrl) {
          return NextResponse.json(
            {
              success: false,
              error: `A valid photo-bank gallery URL is required to advance this booking to "${targetStage?.name || "Delivery Stage"}".`,
            },
            { status: 400 }
          );
        }
      }

      let calculatedExpiresAt = existing.delivery_expires_at;
      let calculatedDeliveryStatus = existing.delivery_status || "pending";
      let deliverySentAt = existing.delivery_sent_at;

      if ((targetStage?.is_final_delivery || targetStage?.allow_link_delivery) && activeDeliveryUrl) {
        calculatedDeliveryStatus = "delivered";
        deliverySentAt = new Date().toISOString();
        const expDate = new Date(Date.now() + validityDays * 86_400_000);
        calculatedExpiresAt = expDate.toISOString();
      }

      const updates: Record<string, any> = {
        workflow_stage_id: workflow_stage_id || existing.workflow_stage_id,
        delivery_url: activeDeliveryUrl || null,
        delivery_validity_days: validityDays,
        delivery_expires_at: calculatedExpiresAt,
        delivery_message:
          delivery_message !== undefined
            ? delivery_message
            : existing.delivery_message,
        delivery_status: calculatedDeliveryStatus,
        delivery_sent_at: deliverySentAt,
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error: updErr } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw parseDatabaseBookingError(updErr);

      // Audit log the workflow stage change
      if (workflow_stage_id && workflow_stage_id !== existing.workflow_stage_id) {
        await supabase.from("booking_workflow_logs").insert({
          booking_id: id,
          stage_id: workflow_stage_id,
          notes:
            delivery_message ||
            `Workflow updated to ${targetStage?.name || "new stage"}`,
          performed_by: auth.context.user.id,
        });
      }

      // If delivery link is attached and notification is permitted & requested, trigger Gmail dispatch
      const shouldDispatchEmail =
        activeDeliveryUrl &&
        (send_notification_email || targetStage?.auto_send_email) &&
        (targetStage?.is_final_delivery || targetStage?.send_email_on_delivery);

      if (shouldDispatchEmail) {
        try {
          const emailRes = await sendBookingNotificationEmail({
            booking: updated,
            notificationType: "delivery_ready",
            idempotencyKey: `email:${updated.id}:delivery_ready:${Date.now()}`,
          });

          await supabase
            .from("bookings")
            .update({
              delivery_email_status: emailRes.success ? "sent" : "failed",
              delivery_email_error: emailRes.error || null,
            })
            .eq("id", id);
        } catch (emailErr: any) {
          console.error("Failed to dispatch delivery email:", emailErr);
          await supabase
            .from("bookings")
            .update({
              delivery_email_status: "failed",
              delivery_email_error: emailErr.message,
            })
            .eq("id", id);
        }
      }

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "retry_integrations") {
      const target = (body.target || "both") as "both" | "calendar" | "email";
      const result = await retryBookingIntegrations({
        bookingId: id,
        target,
        notificationType: body.notificationType,
      });

      return NextResponse.json({
        success: true,
        data: result.booking,
        calendarResult: result.calendarResult,
        emailResult: result.emailResult,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported admin booking action." },
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

