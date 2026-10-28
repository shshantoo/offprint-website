import { NextRequest, NextResponse } from "next/server";
import {
  bookingEventSchema,
  eventSessionSchema,
  photographyPackageSchema,
  photographyServiceSchema,
} from "@/lib/validations";
import { parseDatabaseBookingError } from "@/lib/booking/booking-service";
import { isMissingSchemaError, requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addMinutesToISO, dhakaDateTimeToISO } from "@/lib/booking/timezone";

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
      eventsRes,
      sessionsRes,
      slotsRes,
      servicesRes,
      packagesRes,
      rulesRes,
      blocksRes,
    ] = await Promise.all([
      supabase
        .from("booking_events")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("event_sessions")
        .select("*")
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("event_time_slots")
        .select("*")
        .order("start_at", { ascending: true }),
      supabase
        .from("photography_services")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("photography_packages")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("availability_rules")
        .select("*")
        .order("day_of_week", { ascending: true }),
      supabase
        .from("availability_blocks")
        .select("*")
        .order("start_at", { ascending: true }),
    ]);

    if (eventsRes.error && isMissingSchemaError(eventsRes.error)) {
      return NextResponse.json({
        success: true,
        schemaReady: false,
        events: [],
        sessions: [],
        slots: [],
        services: [],
        packages: [],
        rules: [],
        blocks: [],
      });
    }

    return NextResponse.json({
      success: true,
      schemaReady: true,
      events: eventsRes.data || [],
      sessions: sessionsRes.data || [],
      slots: slotsRes.data || [],
      services: servicesRes.data || [],
      packages: packagesRes.data || [],
      rules: rulesRes.data || [],
      blocks: blocksRes.data || [],
    });
  } catch (err: any) {
    const parsed = parseDatabaseBookingError(err);
    return NextResponse.json(
      { success: false, code: parsed.code, error: parsed.message },
      { status: parsed.httpStatus }
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

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const entity = body.entity as string;

    if (entity === "event") {
      const parsed = bookingEventSchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              parsed.error.issues[0]?.message || "Invalid event configuration",
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      // Check slug uniqueness before upsert
      let slugCheckQuery = supabase
        .from("booking_events")
        .select("id")
        .eq("slug", parsed.data.slug);
      if (parsed.data.id) {
        slugCheckQuery = slugCheckQuery.neq("id", parsed.data.id);
      }
      const { data: slugConflict } = await slugCheckQuery.maybeSingle();
      if (slugConflict) {
        return NextResponse.json(
          {
            success: false,
            code: "SLUG_TAKEN",
            error: `The slug "${parsed.data.slug}" is already used by another special booking event. Please choose a unique URL slug.`,
          },
          { status: 409 }
        );
      }

      const payload = {
        ...parsed.data,
        hero_image_url: parsed.data.hero_image_url || null,
        cover_storage_path: parsed.data.cover_storage_path || null,
        event_start_date: parsed.data.event_start_date || null,
        event_end_date: parsed.data.event_end_date || null,
        event_start_time: parsed.data.event_start_time || "09:00:00",
        event_end_time: parsed.data.event_end_time || "18:00:00",
        booking_opens_at: parsed.data.booking_opens_at || null,
        booking_closes_at: parsed.data.booking_closes_at || null,
        booking_restrictions: parsed.data.booking_restrictions || null,
        custom_questions: parsed.data.custom_questions || [],
        frame_printing_config: parsed.data.frame_printing_config || {
          enabled: false,
          title: "Archival Frame Printing",
          description: "Professional wooden & metallic framing for your portraits",
          max_quantity: 5,
          frame_types: [],
        },
        updated_at: new Date().toISOString(),
      };

      const { data: saved, error } = await supabase
        .from("booking_events")
        .upsert(payload)
        .select("*")
        .single();

      if (error) throw parseDatabaseBookingError(error);
      return NextResponse.json({ success: true, data: saved });
    }

    if (entity === "duplicate_event") {
      const sourceEventId = String(body.event_id || "").trim();
      if (!sourceEventId) {
        return NextResponse.json(
          { success: false, error: "event_id is required to duplicate an event." },
          { status: 400 }
        );
      }

      const { data: sourceEvent, error: srcErr } = await supabase
        .from("booking_events")
        .select("*")
        .eq("id", sourceEventId)
        .maybeSingle();

      if (srcErr || !sourceEvent) {
        return NextResponse.json(
          { success: false, error: "Source event not found." },
          { status: 404 }
        );
      }

      const suffix = Math.random().toString(36).slice(2, 6);
      const newSlug = `${sourceEvent.slug}-copy-${suffix}`.slice(0, 90);
      const newTitle = `${sourceEvent.title} (Copy)`;

      const {
        id: _omitId,
        created_at: _omitCreated,
        updated_at: _omitUpdated,
        ...restEvent
      } = sourceEvent;

      const { data: clonedEvent, error: cloneErr } = await supabase
        .from("booking_events")
        .insert({
          ...restEvent,
          slug: newSlug,
          title: newTitle,
          status: "draft",
          is_featured_on_home: false,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (cloneErr || !clonedEvent) {
        throw parseDatabaseBookingError(
          cloneErr || new Error("Failed to duplicate event")
        );
      }

      // Clone associated packages
      const { data: sourcePackages } = await supabase
        .from("photography_packages")
        .select("*")
        .eq("event_id", sourceEventId);

      if (sourcePackages && sourcePackages.length > 0) {
        const clonedPackages = sourcePackages.map((pkg: any) => {
          const {
            id: _pkgId,
            created_at: _pkgCreated,
            updated_at: _pkgUpdated,
            ...restPkg
          } = pkg;
          return {
            ...restPkg,
            event_id: clonedEvent.id,
          };
        });
        await supabase.from("photography_packages").insert(clonedPackages);
      }

      return NextResponse.json({
        success: true,
        data: clonedEvent,
      });
    }

    if (entity === "session") {
      const parsed = eventSessionSchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              parsed.error.issues[0]?.message || "Invalid session configuration",
          },
          { status: 400 }
        );
      }

      // If editing an existing session, check whether active bookings would be invalidated
      if (parsed.data.id) {
        const { data: existingSession } = await supabase
          .from("event_sessions")
          .select("*")
          .eq("id", parsed.data.id)
          .maybeSingle();

        if (existingSession) {
          const { data: activeBookings } = await supabase
            .from("bookings")
            .select(
              "id, booking_ref, client_name, booking_date, start_at, end_at, status"
            )
            .eq("session_id", parsed.data.id)
            .in("status", ["pending", "confirmed", "rescheduled"]);

          if (activeBookings && activeBookings.length > 0) {
            if (existingSession.session_date !== parsed.data.session_date) {
              return NextResponse.json(
                {
                  success: false,
                  code: "CONFLICTING_ACTIVE_BOOKINGS",
                  error: `Cannot change session date from ${existingSession.session_date} to ${parsed.data.session_date} because ${activeBookings.length} active booking(s) are scheduled on this session. Reschedule or cancel those bookings first.`,
                  conflicts: activeBookings,
                },
                { status: 409 }
              );
            }

            // Check if any slot on this session has booked_count > new capacity_per_slot
            const { data: overBookedSlots } = await supabase
              .from("event_time_slots")
              .select("id, start_at, booked_count")
              .eq("session_id", parsed.data.id)
              .gt("booked_count", parsed.data.capacity_per_slot);

            if (overBookedSlots && overBookedSlots.length > 0) {
              return NextResponse.json(
                {
                  success: false,
                  code: "CONFLICTING_ACTIVE_BOOKINGS",
                  error: `Cannot reduce slot capacity to ${parsed.data.capacity_per_slot} because ${overBookedSlots.length} slot(s) already have more confirmed bookings.`,
                  conflicts: activeBookings,
                },
                { status: 409 }
              );
            }
          }
        }
      }

      const { auto_generate_slots, ...sessionRow } = parsed.data;
      const { data: savedSession, error } = await supabase
        .from("event_sessions")
        .upsert({
          ...sessionRow,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw parseDatabaseBookingError(error);

      let generatedCount = 0;
      if (auto_generate_slots !== false && savedSession) {
        const { data: genData, error: genErr } = await supabase.rpc(
          "generate_event_session_slots",
          { p_session_id: savedSession.id }
        );
        if (genErr) throw parseDatabaseBookingError(genErr);
        generatedCount = Number(genData || 0);
      }

      return NextResponse.json({
        success: true,
        data: savedSession,
        generatedSlotsCount: generatedCount,
      });
    }

    if (entity === "generate_slots") {
      const sessionId = String(body.session_id || "");
      const { data: genData, error } = await supabase.rpc(
        "generate_event_session_slots",
        { p_session_id: sessionId }
      );
      if (error) throw parseDatabaseBookingError(error);
      return NextResponse.json({
        success: true,
        generatedSlotsCount: Number(genData || 0),
      });
    }

    if (entity === "slot") {
      const {
        id,
        event_id,
        session_id,
        slot_date,
        start_time,
        end_time,
        buffer_before_mins = 0,
        buffer_after_mins = 10,
        capacity = 1,
        status = "available",
        label,
      } = body.data || {};

      if (id) {
        const { data: existingSlot } = await supabase
          .from("event_time_slots")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (existingSlot && Number(capacity) < existingSlot.booked_count) {
          return NextResponse.json(
            {
              success: false,
              code: "CONFLICTING_ACTIVE_BOOKINGS",
              error: `Cannot reduce slot capacity below existing confirmed bookings (${existingSlot.booked_count}).`,
            },
            { status: 409 }
          );
        }

        const safeCapacity = existingSlot
          ? Math.max(existingSlot.booked_count, Number(capacity))
          : Number(capacity);

        const { data: updated, error } = await supabase
          .from("event_time_slots")
          .update({
            capacity: safeCapacity,
            status,
            label: label ?? existingSlot?.label,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw parseDatabaseBookingError(error);
        return NextResponse.json({ success: true, data: updated });
      } else {
        const startIso = dhakaDateTimeToISO(slot_date, start_time);
        const endIso = dhakaDateTimeToISO(slot_date, end_time);
        const effStartIso = addMinutesToISO(startIso, -Number(buffer_before_mins));
        const effEndIso = addMinutesToISO(endIso, Number(buffer_after_mins));

        const { data: created, error } = await supabase
          .from("event_time_slots")
          .insert({
            event_id,
            session_id: session_id || null,
            slot_date,
            start_at: startIso,
            end_at: endIso,
            buffer_before_mins: Number(buffer_before_mins),
            buffer_after_mins: Number(buffer_after_mins),
            effective_start_at: effStartIso,
            effective_end_at: effEndIso,
            capacity: Math.max(1, Number(capacity)),
            booked_count: 0,
            status,
            label: label || "Custom Slot",
          })
          .select("*")
          .single();

        if (error) throw parseDatabaseBookingError(error);
        return NextResponse.json({ success: true, data: created });
      }
    }

    if (entity === "service") {
      const parsed = photographyServiceSchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              parsed.error.issues[0]?.message || "Invalid service configuration",
          },
          { status: 400 }
        );
      }

      const { data: saved, error } = await supabase
        .from("photography_services")
        .upsert({
          ...parsed.data,
          image_url: parsed.data.image_url || null,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw parseDatabaseBookingError(error);
      return NextResponse.json({ success: true, data: saved });
    }

    if (entity === "package") {
      const parsed = photographyPackageSchema.safeParse(body.data);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              parsed.error.issues[0]?.message || "Invalid package configuration",
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      const { data: saved, error } = await supabase
        .from("photography_packages")
        .upsert({
          ...parsed.data,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw parseDatabaseBookingError(error);
      return NextResponse.json({ success: true, data: saved });
    }

    if (entity === "duplicate_package") {
      const packageId = String(body.package_id || "").trim();
      if (!packageId) {
        return NextResponse.json(
          { success: false, error: "package_id is required to duplicate a package." },
          { status: 400 }
        );
      }

      const { data: sourcePkg, error: fetchErr } = await supabase
        .from("photography_packages")
        .select("*")
        .eq("id", packageId)
        .maybeSingle();

      if (fetchErr || !sourcePkg) {
        return NextResponse.json(
          { success: false, error: "Source package not found." },
          { status: 404 }
        );
      }

      const { id: _omitId, created_at: _omitCreated, updated_at: _omitUpdated, ...rest } = sourcePkg;

      const { data: duplicated, error: insertErr } = await supabase
        .from("photography_packages")
        .insert({
          ...rest,
          name: `${sourcePkg.name} (Copy)`,
          sort_order: (sourcePkg.sort_order || 0) + 1,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (insertErr || !duplicated) {
        throw parseDatabaseBookingError(insertErr || new Error("Failed to duplicate package"));
      }

      return NextResponse.json({ success: true, data: duplicated });
    }

    if (entity === "reorder_packages") {
      const items = Array.isArray(body.items) ? body.items : [];
      for (const item of items) {
        if (item.id && typeof item.sort_order === "number") {
          await supabase
            .from("photography_packages")
            .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
            .eq("id", item.id);
        }
      }
      return NextResponse.json({ success: true, message: "Packages reordered successfully." });
    }

    if (entity === "availability_rules") {
      const rules = Array.isArray(body.data) ? body.data : [];
      const payload = rules.map((r: any) => ({
        resource_pool: r.resource_pool || "primary_studio",
        day_of_week: Number(r.day_of_week),
        is_open: Boolean(r.is_open),
        start_time: r.start_time || "09:00",
        end_time: r.end_time || "19:00",
        slot_interval_mins: Math.max(15, Number(r.slot_interval_mins || 60)),
        capacity_per_slot: Math.max(1, Number(r.capacity_per_slot || 1)),
        updated_at: new Date().toISOString(),
      }));

      const { data: saved, error } = await supabase
        .from("availability_rules")
        .upsert(payload, { onConflict: "resource_pool,day_of_week" })
        .select("*");

      if (error) throw parseDatabaseBookingError(error);
      return NextResponse.json({ success: true, data: saved });
    }

    if (entity === "availability_block") {
      const b = body.data || {};
      const { data: saved, error } = await supabase
        .from("availability_blocks")
        .insert({
          title: String(b.title || "Blocked Period").trim(),
          reason: b.reason || null,
          resource_pool: b.resource_pool || "primary_studio",
          event_id: b.event_id || null,
          service_id: b.service_id || null,
          start_at: b.start_at,
          end_at: b.end_at,
          is_all_day: Boolean(b.is_all_day),
          created_by: auth.context.user.id,
        })
        .select("*")
        .single();

      if (error) throw parseDatabaseBookingError(error);
      return NextResponse.json({ success: true, data: saved });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported entity type." },
      { status: 400 }
    );
  } catch (err: any) {
    const parsed = parseDatabaseBookingError(err);
    return NextResponse.json(
      { success: false, code: parsed.code, error: parsed.message },
      { status: parsed.httpStatus }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const entity = searchParams.get("entity");
    const id = searchParams.get("id");

    if (!entity || !id) {
      return NextResponse.json(
        { success: false, error: "Missing entity or id parameter." },
        { status: 400 }
      );
    }

    if (entity === "event") {
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select(
          "id, booking_ref, client_name, booking_date, start_at, status"
        )
        .eq("event_id", id)
        .in("status", ["pending", "confirmed", "rescheduled"]);

      if (activeBookings && activeBookings.length > 0) {
        return NextResponse.json(
          {
            success: false,
            code: "CONFLICTING_ACTIVE_BOOKINGS",
            error: `Cannot delete this special booking event while ${activeBookings.length} active reservation(s) exist. Set the event status to "Archived" or "Closed", or cancel/reschedule the bookings first.`,
            conflicts: activeBookings,
          },
          { status: 409 }
        );
      }

      const { error } = await supabase
        .from("booking_events")
        .delete()
        .eq("id", id);
      if (error) throw parseDatabaseBookingError(error);
      return NextResponse.json({ success: true });
    }

    if (entity === "session") {
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select(
          "id, booking_ref, client_name, booking_date, start_at, status"
        )
        .eq("session_id", id)
        .in("status", ["pending", "confirmed", "rescheduled"]);

      if (activeBookings && activeBookings.length > 0) {
        return NextResponse.json(
          {
            success: false,
            code: "CONFLICTING_ACTIVE_BOOKINGS",
            error: `Cannot delete this session date because ${activeBookings.length} active booking(s) are scheduled on it.`,
            conflicts: activeBookings,
          },
          { status: 409 }
        );
      }

      const { error } = await supabase
        .from("event_sessions")
        .delete()
        .eq("id", id);
      if (error) throw parseDatabaseBookingError(error);
      return NextResponse.json({ success: true });
    }

    if (entity === "slot") {
      const { data: slot } = await supabase
        .from("event_time_slots")
        .select("booked_count")
        .eq("id", id)
        .maybeSingle();

      if (slot && slot.booked_count > 0) {
        return NextResponse.json(
          {
            success: false,
            code: "CONFLICTING_ACTIVE_BOOKINGS",
            error:
              "Cannot delete a time slot that has active bookings. Mark the slot as closed or reschedule the bookings first.",
          },
          { status: 409 }
        );
      }

      const { error } = await supabase
        .from("event_time_slots")
        .delete()
        .eq("id", id);
      if (error) throw parseDatabaseBookingError(error);
      return NextResponse.json({ success: true });
    }

    if (entity === "package") {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc(
        "delete_or_archive_package",
        { p_package_id: id }
      );

      if (rpcErr) throw parseDatabaseBookingError(rpcErr);

      return NextResponse.json({
        success: true,
        action: rpcResult?.action || "deleted",
        message: rpcResult?.message || "Package processed successfully.",
        historical_bookings_count: rpcResult?.historical_bookings_count || 0,
      });
    }

    const tableMap: Record<string, string> = {
      service: "photography_services",
      availability_block: "availability_blocks",
    };

    const tableName = tableMap[entity];
    if (!tableName) {
      return NextResponse.json(
        { success: false, error: "Invalid entity for deletion." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) throw parseDatabaseBookingError(error);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const parsed = parseDatabaseBookingError(err);
    return NextResponse.json(
      { success: false, code: parsed.code, error: parsed.message },
      { status: parsed.httpStatus }
    );
  }
}
