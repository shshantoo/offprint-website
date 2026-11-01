import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { action, event_id, session_id, slot_id, package_id, flow_token, hold_id, hold_duration_mins } = json;

    if (!action || !["acquire", "release", "status"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'acquire', 'release', or 'status'." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client is temporarily unavailable." },
        { status: 503 }
      );
    }

    if (action === "acquire") {
      if (!slot_id || !flow_token) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: slot_id and flow_token are required." },
          { status: 400 }
        );
      }

      // Try atomic RPC
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("acquire_slot_hold", {
          p_event_id: event_id || null,
          p_session_id: session_id || null,
          p_slot_id: slot_id,
          p_flow_token: flow_token,
          p_hold_duration_mins: typeof hold_duration_mins === "number" ? hold_duration_mins : null,
          p_package_id: package_id || null,
        });

        if (!rpcErr && rpcRes) {
          if (rpcRes.success === false) {
            return NextResponse.json(
              {
                success: false,
                code: rpcRes.code || "SLOT_CAPACITY_EXCEEDED",
                error: rpcRes.message || "This time slot is temporarily held or booked by another client.",
              },
              { status: 409 }
            );
          }

          return NextResponse.json({
            success: true,
            hold_id: rpcRes.hold_id,
            slot_id: rpcRes.slot_id,
            package_id: rpcRes.package_id || package_id || null,
            expires_at: rpcRes.expires_at,
            duration_mins: rpcRes.duration_mins,
            remaining_seconds: rpcRes.remaining_seconds,
          });
        }
      } catch {
        // Fallback below
      }

      // Fallback implementation if RPC is unavailable
      const { data: slot, error: slotErr } = await supabase
        .from("event_time_slots")
        .select("id, start_at, end_at, duration_mins, capacity, booked_count, status")
        .eq("id", slot_id)
        .maybeSingle();

      if (slotErr || !slot) {
        return NextResponse.json(
          { success: false, error: "Time slot not found or unavailable." },
          { status: 404 }
        );
      }

      if (slot.status !== "available") {
        return NextResponse.json(
          { success: false, error: "Time slot is not currently open for bookings." },
          { status: 409 }
        );
      }

      // If package_id is provided, validate package existence and duration matching
      if (package_id) {
        const { data: pkg } = await supabase
          .from("photography_packages")
          .select("id, duration_mins, is_active")
          .eq("id", package_id)
          .maybeSingle();

        if (pkg && pkg.is_active === false) {
          return NextResponse.json(
            { success: false, error: "Selected package is inactive." },
            { status: 409 }
          );
        }

        if (pkg && pkg.duration_mins) {
          const slotDur = slot.duration_mins || Math.max(1, Math.round((Date.parse(slot.end_at) - Date.parse(slot.start_at)) / 60_000));
          if (slotDur !== pkg.duration_mins) {
            return NextResponse.json(
              {
                success: false,
                code: "DURATION_MISMATCH",
                error: `Slot duration (${slotDur}m) does not match package duration (${pkg.duration_mins}m).`,
              },
              { status: 409 }
            );
          }
        }
      }

      // Check duration from event or default 5 mins
      let durationMins = typeof hold_duration_mins === "number" && hold_duration_mins > 0 ? hold_duration_mins : 5;
      if (event_id) {
        const { data: ev } = await supabase
          .from("booking_events")
          .select("slot_hold_duration_mins")
          .eq("id", event_id)
          .maybeSingle();
        if (ev?.slot_hold_duration_mins) {
          durationMins = ev.slot_hold_duration_mins;
        }
      }

      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + durationMins * 60_000).toISOString();

      // Check other visitors' active holds on this slot
      const { data: otherHolds } = await supabase
        .from("booking_slot_holds")
        .select("id")
        .eq("slot_id", slot_id)
        .eq("status", "active")
        .neq("flow_token", flow_token)
        .gt("expires_at", nowIso);

      const otherHoldsCount = otherHolds?.length || 0;
      const availableCap = slot.capacity - (slot.booked_count + otherHoldsCount);

      if (availableCap <= 0) {
        return NextResponse.json(
          {
            success: false,
            code: "SLOT_CAPACITY_EXCEEDED",
            error: "This time slot is temporarily held or fully booked by another visitor.",
          },
          { status: 409 }
        );
      }

      // Release other slots held by this flow token (or holds for different packages)
      await supabase
        .from("booking_slot_holds")
        .update({ status: "released" })
        .eq("flow_token", flow_token)
        .eq("status", "active")
        .neq("slot_id", slot_id);

      // Check if client already holds this slot -> extend it
      const { data: existingHold } = await supabase
        .from("booking_slot_holds")
        .select("id")
        .eq("slot_id", slot_id)
        .eq("flow_token", flow_token)
        .eq("status", "active")
        .maybeSingle();

      let activeHoldId = existingHold?.id;

      if (activeHoldId) {
        await supabase
          .from("booking_slot_holds")
          .update({
            expires_at: expiresAt,
            hold_duration_mins: durationMins,
            package_id: package_id || null,
          })
          .eq("id", activeHoldId);
      } else {
        const { data: newHold, error: insErr } = await supabase
          .from("booking_slot_holds")
          .insert({
            event_id: event_id || null,
            session_id: session_id || null,
            slot_id: slot_id,
            package_id: package_id || null,
            flow_token: flow_token,
            hold_duration_mins: durationMins,
            expires_at: expiresAt,
            status: "active",
          })
          .select("id")
          .single();

        if (insErr || !newHold) {
          return NextResponse.json({
            success: true,
            hold_id: null,
            slot_id: slot_id,
            package_id: package_id || null,
            expires_at: expiresAt,
            duration_mins: durationMins,
            remaining_seconds: durationMins * 60,
          });
        }
        activeHoldId = newHold.id;
      }

      return NextResponse.json({
        success: true,
        hold_id: activeHoldId,
        slot_id: slot_id,
        package_id: package_id || null,
        expires_at: expiresAt,
        duration_mins: durationMins,
        remaining_seconds: durationMins * 60,
      });
    }

    if (action === "release") {
      if (!hold_id && !flow_token) {
        return NextResponse.json(
          { success: false, error: "hold_id or flow_token required for release." },
          { status: 400 }
        );
      }

      try {
        if (hold_id) {
          await supabase.rpc("release_slot_hold", {
            p_hold_id: hold_id,
            p_flow_token: flow_token || "",
          });
        }
      } catch {
        // Fallback
      }

      let q = supabase.from("booking_slot_holds").update({ status: "released" }).eq("status", "active");
      if (hold_id) q = q.eq("id", hold_id);
      if (flow_token) q = q.eq("flow_token", flow_token);
      await q;

      return NextResponse.json({ success: true, released: true });
    }

    if (action === "status") {
      if (!hold_id) {
        return NextResponse.json(
          { success: false, error: "hold_id required for status check." },
          { status: 400 }
        );
      }

      const { data: hold } = await supabase
        .from("booking_slot_holds")
        .select("id, slot_id, status, expires_at, hold_duration_mins")
        .eq("id", hold_id)
        .maybeSingle();

      if (!hold) {
        return NextResponse.json({ active: false, remaining_seconds: 0 });
      }

      const now = Date.now();
      const exp = new Date(hold.expires_at).getTime();
      const remSeconds = Math.max(0, Math.floor((exp - now) / 1000));
      const isActive = hold.status === "active" && remSeconds > 0;

      return NextResponse.json({
        active: isActive,
        status: isActive ? "active" : hold.status,
        expires_at: hold.expires_at,
        remaining_seconds: remSeconds,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process slot hold request" },
      { status: 500 }
    );
  }
}

