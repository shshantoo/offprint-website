import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  bookingEventSchema,
  customQuestionSchema,
  eventSessionSchema,
  framePrintingConfigSchema,
  photographyPackageSchema,
  photographyServiceSchema,
} from "@/lib/validations";
import { isMissingSchemaError, requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabaseServerClient, createSupabasePrivilegedClient } from "@/lib/supabase/server";
import { addMinutesToISO, dhakaDateTimeToISO } from "@/lib/booking/timezone";
import {
  calculateProposedSchedule,
  compareScheduleWithExisting,
  ScheduleConfig,
} from "@/lib/booking/schedule-generator";
import { formatAdminError } from "@/lib/booking/admin-error";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const supabase = (await createSupabasePrivilegedClient()) || (await createSupabaseServerClient());
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
      sessionPackagesRes,
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
      Promise.resolve(
        supabase
          .from("event_session_packages")
          .select("session_id, package_id")
      ).catch(() => ({ data: [] })),
    ]);

    const sessionPackagesMap = new Map<string, string[]>();
    const spList = (sessionPackagesRes as any)?.data || [];
    if (Array.isArray(spList)) {
      for (const sp of spList) {
        const list = sessionPackagesMap.get(sp.session_id) || [];
        list.push(sp.package_id);
        sessionPackagesMap.set(sp.session_id, list);
      }
    }

    const allPackages = packagesRes.data || [];
    const sessionsWithPackages = (sessionsRes.data || []).map((sess: any) => {
      let pkgIds = sessionPackagesMap.get(sess.id);
      if (!pkgIds || pkgIds.length === 0) {
        pkgIds = allPackages
          .filter((p: any) => p.event_id === sess.event_id && p.is_active !== false)
          .map((p: any) => p.id);
      }
      return {
        ...sess,
        package_ids: pkgIds || [],
      };
    });

    const resolvedEvents = (eventsRes.data || []).map((ev: any) => {
      let schedulePkgIds = Array.isArray(ev.schedule_package_ids) ? ev.schedule_package_ids : null;
      if (!schedulePkgIds || schedulePkgIds.length === 0) {
        if (Array.isArray(ev.schedule_overrides)) {
          const pkgOverride = ev.schedule_overrides.find((o: any) => o?.type === "schedule_packages");
          if (pkgOverride && Array.isArray(pkgOverride.package_ids)) {
            schedulePkgIds = pkgOverride.package_ids;
          }
        }
      }
      if (!schedulePkgIds || schedulePkgIds.length === 0) {
        schedulePkgIds = allPackages
          .filter((p: any) => p.event_id === ev.id && p.is_active !== false)
          .map((p: any) => p.id);
      }
      return {
        ...ev,
        schedule_package_ids: schedulePkgIds || [],
      };
    });

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
        session_packages: [],
      });
    }

    return NextResponse.json({
      success: true,
      schemaReady: true,
      events: resolvedEvents,
      sessions: sessionsWithPackages,
      slots: slotsRes.data || [],
      services: servicesRes.data || [],
      packages: packagesRes.data || [],
      rules: rulesRes.data || [],
      blocks: blocksRes.data || [],
      session_packages: spList,
    });
  } catch (err: any) {
    const parsed = formatAdminError(err);
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

  const supabase = (await createSupabasePrivilegedClient()) || (await createSupabaseServerClient());
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

      const schedulePkgIds = Array.isArray(parsed.data.schedule_package_ids)
        ? parsed.data.schedule_package_ids
        : [];

      // Store package selection safely in schedule_overrides so associations persist across all DB versions
      const cleanOverrides = Array.isArray(parsed.data.schedule_overrides)
        ? parsed.data.schedule_overrides.filter((o: any) => o?.type !== "schedule_packages")
        : [];
      if (schedulePkgIds.length > 0) {
        cleanOverrides.push({ type: "schedule_packages", package_ids: schedulePkgIds });
      }

      const { schedule_package_ids: _rawPkgIds, ...eventFields } = parsed.data;

      const payload: Record<string, any> = {
        ...eventFields,
        schedule_overrides: cleanOverrides,
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
        info_blocks: parsed.data.info_blocks || [],
        slot_hold_duration_mins: parsed.data.slot_hold_duration_mins || 5,
        frame_printing_config: parsed.data.frame_printing_config || {
          enabled: false,
          title: "Archival Frame Printing",
          description: "Professional wooden & metallic framing for your portraits",
          max_quantity: 5,
          frame_types: [],
        },
        updated_at: new Date().toISOString(),
      };

      // Probe if schedule_package_ids column exists in booking_events
      const { error: probeErr } = await supabase
        .from("booking_events")
        .select("schedule_package_ids")
        .limit(0);
      if (!probeErr) {
        payload.schedule_package_ids = schedulePkgIds;
      }

      const { data: saved, error } = await supabase
        .from("booking_events")
        .upsert(payload)
        .select("*")
        .single();

      if (error) throw formatAdminError(error);
      return NextResponse.json({
        success: true,
        data: {
          ...saved,
          schedule_package_ids: schedulePkgIds,
        },
      });
    }

    if (entity === "event_custom_questions") {
      const eventId = String(body.event_id || "").trim();
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: "event_id is required" },
          { status: 400 }
        );
      }
      const questions = Array.isArray(body.custom_questions) ? body.custom_questions : [];
      const parsedQuestions = z.array(customQuestionSchema).safeParse(questions);
      if (!parsedQuestions.success) {
        return NextResponse.json(
          {
            success: false,
            error: parsedQuestions.error.issues[0]?.message || "Invalid question configuration",
          },
          { status: 400 }
        );
      }
      const { data: updated, error } = await supabase
        .from("booking_events")
        .update({
          custom_questions: parsedQuestions.data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId)
        .select("id, custom_questions")
        .single();

      if (error) throw formatAdminError(error);
      return NextResponse.json({ success: true, data: updated });
    }

    if (entity === "event_info_blocks") {
      const eventId = String(body.event_id || "").trim();
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: "event_id is required" },
          { status: 400 }
        );
      }
      const blocks = Array.isArray(body.info_blocks) ? body.info_blocks : [];
      const { data: updated, error } = await supabase
        .from("booking_events")
        .update({
          info_blocks: blocks,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId)
        .select("id, info_blocks")
        .single();

      if (error) throw formatAdminError(error);
      return NextResponse.json({ success: true, data: updated });
    }

    if (entity === "event_frame_config") {
      const eventId = String(body.event_id || "").trim();
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: "event_id is required" },
          { status: 400 }
        );
      }
      const parsedConfig = framePrintingConfigSchema.safeParse(body.frame_printing_config);
      if (!parsedConfig.success) {
        return NextResponse.json(
          {
            success: false,
            error: parsedConfig.error.issues[0]?.message || "Invalid frame printing configuration",
          },
          { status: 400 }
        );
      }
      const { data: updated, error } = await supabase
        .from("booking_events")
        .update({
          frame_printing_config: parsedConfig.data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId)
        .select("id, frame_printing_config")
        .single();

      if (error) throw formatAdminError(error);
      return NextResponse.json({ success: true, data: updated });
    }

    if (entity === "event_slot_hold_duration") {
      const eventId = String(body.event_id || "").trim();
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: "event_id is required" },
          { status: 400 }
        );
      }
      const holdDuration = Math.max(1, Math.min(60, Number(body.slot_hold_duration_mins) || 5));
      const { data: updated, error } = await supabase
        .from("booking_events")
        .update({
          slot_hold_duration_mins: holdDuration,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId)
        .select("id, slot_hold_duration_mins")
        .single();

      if (error) throw formatAdminError(error);
      return NextResponse.json({ success: true, data: updated });
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
        throw formatAdminError(
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

      const { auto_generate_slots, package_ids: sessionPkgIds, ...sessionRow } = parsed.data;
      const targetPackageIds: string[] = Array.isArray(body.package_ids)
        ? body.package_ids
        : Array.isArray(sessionPkgIds)
        ? sessionPkgIds
        : [];

      const { data: savedSession, error } = await supabase
        .from("event_sessions")
        .upsert({
          ...sessionRow,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw formatAdminError(error);

      // Sync event_session_packages junction records if table exists
      if (savedSession) {
        try {
          const { error: spTableErr } = await supabase
            .from("event_session_packages")
            .select("id")
            .limit(0);

          if (!spTableErr) {
            await supabase
              .from("event_session_packages")
              .delete()
              .eq("session_id", savedSession.id);

            if (targetPackageIds.length > 0) {
              const rows = targetPackageIds.map((pkgId: string) => ({
                session_id: savedSession.id,
                package_id: pkgId,
              }));
              await supabase.from("event_session_packages").insert(rows);
            }
          }
        } catch {
          // Table may not exist yet or be empty
        }
      }

      let generatedCount = 0;
      if (auto_generate_slots !== false && savedSession) {
        // Fetch attached packages for multi-duration generation
        let attachedPackages: Array<{ id: string; name: string; duration_mins: number }> = [];
        if (targetPackageIds.length > 0) {
          const { data: pkgs } = await supabase
            .from("photography_packages")
            .select("id, name, duration_mins")
            .in("id", targetPackageIds);
          if (pkgs && pkgs.length > 0) {
            attachedPackages = pkgs;
          }
        }

        if (attachedPackages.length > 0) {
          // Multi-duration schedule generation for attached packages
          const proposed = calculateProposedSchedule({
            start_date: savedSession.session_date,
            end_date: savedSession.session_date,
            operating_days: [new Date(`${savedSession.session_date}T00:00:00Z`).getUTCDay()],
            operating_start_time: savedSession.start_time.slice(0, 5),
            operating_end_time: savedSession.end_time.slice(0, 5),
            slot_duration_mins: savedSession.slot_duration_mins,
            slot_interval_mins: savedSession.slot_duration_mins,
            capacity_per_slot: savedSession.capacity_per_slot,
            buffer_before_mins: savedSession.buffer_before_mins,
            buffer_after_mins: savedSession.buffer_after_mins,
            packages: attachedPackages,
          });

          // Probe if duration_mins exists on event_time_slots
          const { error: slotProbeErr } = await supabase
            .from("event_time_slots")
            .select("duration_mins")
            .limit(0);
          const supportsSlotDuration = !slotProbeErr;

          const slotsToInsert = proposed.sessions.flatMap((s) =>
            s.slots.map((sl) => {
              const row: Record<string, any> = {
                event_id: savedSession.event_id,
                session_id: savedSession.id,
                slot_date: sl.slot_date,
                start_at: sl.start_at,
                end_at: sl.end_at,
                effective_start_at: sl.effective_start_at,
                effective_end_at: sl.effective_end_at,
                capacity: sl.capacity,
                buffer_before_mins: savedSession.buffer_before_mins,
                buffer_after_mins: savedSession.buffer_after_mins,
                status: "available",
                booked_count: 0,
              };
              if (supportsSlotDuration) {
                row.duration_mins = sl.duration_mins;
                row.package_ids = sl.package_ids;
              }
              return row;
            })
          );

          if (slotsToInsert.length > 0) {
            // Remove unbooked slots on this session before re-generating
            const { data: unbookedSlots } = await supabase
              .from("event_time_slots")
              .select("id")
              .eq("session_id", savedSession.id)
              .eq("booked_count", 0);

            if (unbookedSlots && unbookedSlots.length > 0) {
              const unbookedIds = unbookedSlots.map((s: any) => s.id);
              // Safely nullify slot_id on any historical/cancelled bookings referencing these slots
              await supabase
                .from("bookings")
                .update({ slot_id: null, updated_at: new Date().toISOString() })
                .in("slot_id", unbookedIds);

              await supabase
                .from("event_time_slots")
                .delete()
                .in("id", unbookedIds);
            }

            const { data: insData } = await supabase
              .from("event_time_slots")
              .insert(slotsToInsert)
              .select("id");
            generatedCount = insData?.length || slotsToInsert.length;
          }
        } else {
          const { data: genData, error: genErr } = await supabase.rpc(
            "generate_event_session_slots",
            { p_session_id: savedSession.id }
          );
          if (genErr) throw formatAdminError(genErr);
          generatedCount = Number(genData || 0);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          ...savedSession,
          package_ids: targetPackageIds,
        },
        generatedSlotsCount: generatedCount,
      });
    }

    if (entity === "generate_slots") {
      const sessionId = String(body.session_id || "");
      const { data: genData, error } = await supabase.rpc(
        "generate_event_session_slots",
        { p_session_id: sessionId }
      );
      if (error) throw formatAdminError(error);
      return NextResponse.json({
        success: true,
        generatedSlotsCount: Number(genData || 0),
      });
    }

    if (entity === "preview_schedule") {
      const eventId = String(body.event_id || "");
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: "event_id is required." },
          { status: 400 }
        );
      }

      const { data: event, error: evErr } = await supabase
        .from("booking_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (evErr || !event) {
        return NextResponse.json(
          { success: false, error: "Event not found." },
          { status: 404 }
        );
      }

      // 1. Resolve packages to attach to this schedule configuration
      let schedulePackages: any[] = [];
      let packageIds: string[] = Array.isArray(body.package_ids)
        ? body.package_ids
        : Array.isArray(body.packages)
        ? body.packages.map((p: any) => p.id)
        : Array.isArray(event.schedule_package_ids) && event.schedule_package_ids.length > 0
        ? event.schedule_package_ids
        : [];

      if (packageIds.length === 0 && Array.isArray(event.schedule_overrides)) {
        const pkgOverride = event.schedule_overrides.find((o: any) => o?.type === "schedule_packages");
        if (pkgOverride && Array.isArray(pkgOverride.package_ids)) {
          packageIds = pkgOverride.package_ids;
        }
      }

      if (packageIds.length === 0) {
        const { data: defaultPkgs } = await supabase
          .from("photography_packages")
          .select("id")
          .eq("event_id", eventId)
          .eq("is_active", true);
        if (defaultPkgs && defaultPkgs.length > 0) {
          packageIds = defaultPkgs.map((p: any) => p.id);
        }
      }

      if (packageIds.length > 0) {
        const { data: dbPackages } = await supabase
          .from("photography_packages")
          .select("id, name, duration_mins, price_numeric")
          .in("id", packageIds)
          .eq("is_active", true);

        if (dbPackages && dbPackages.length > 0) {
          schedulePackages = dbPackages.map((p) => ({
            id: p.id,
            name: p.name,
            duration_mins: p.duration_mins,
            price: Number(p.price_numeric) || 0,
          }));
        }
      }

      const scheduleConfig: ScheduleConfig = {
        start_date: body.start_date || event.event_start_date,
        end_date:
          body.end_date ||
          event.event_end_date ||
          body.start_date ||
          event.event_start_date,
        operating_days: Array.isArray(body.operating_days)
          ? body.operating_days
          : Array.isArray(event.operating_days)
          ? event.operating_days
          : [0, 1, 2, 3, 4, 5, 6],
        operating_start_time:
          body.operating_start_time || event.operating_start_time || "09:00",
        operating_end_time:
          body.operating_end_time || event.operating_end_time || "18:00",
        slot_duration_mins: Number(
          body.slot_duration_mins || event.default_slot_duration_mins || 30
        ),
        slot_interval_mins: Number(
          body.slot_interval_mins ||
            event.slot_interval_mins ||
            event.default_slot_duration_mins ||
            30
        ),
        capacity_per_slot: Number(
          body.capacity_per_slot || event.default_slot_capacity || 1
        ),
        buffer_before_mins: Number(
          body.buffer_before_mins || event.buffer_before_mins || 0
        ),
        buffer_after_mins: Number(
          body.buffer_after_mins || event.buffer_after_mins || 10
        ),
        break_periods: Array.isArray(body.break_periods)
          ? body.break_periods
          : Array.isArray(event.break_periods)
          ? event.break_periods
          : [],
        packages: schedulePackages,
      };

      if (!scheduleConfig.start_date || !scheduleConfig.end_date) {
        return NextResponse.json(
          {
            success: false,
            error: "Start date and End date are required to preview schedule.",
          },
          { status: 400 }
        );
      }

      const proposed = calculateProposedSchedule(scheduleConfig);

      const [sessionsRes, slotsRes, bookingsRes] = await Promise.all([
        supabase.from("event_sessions").select("*").eq("event_id", eventId),
        supabase.from("event_time_slots").select("*").eq("event_id", eventId),
        supabase
          .from("bookings")
          .select("id, booking_ref, client_name, booking_date, start_at, status")
          .eq("event_id", eventId)
          .in("status", ["pending", "confirmed", "rescheduled"]),
      ]);

      const preview = compareScheduleWithExisting(
        scheduleConfig,
        proposed,
        sessionsRes.data || [],
        slotsRes.data || [],
        bookingsRes.data || []
      );

      return NextResponse.json({
        success: true,
        preview,
      });
    }

    if (entity === "rebuild_event_schedule") {
      const eventId = String(body.event_id || "");
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: "event_id is required." },
          { status: 400 }
        );
      }

      const { data: event, error: evErr } = await supabase
        .from("booking_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (evErr || !event) {
        return NextResponse.json(
          { success: false, error: "Event not found." },
          { status: 404 }
        );
      }

      // 1. Resolve packages to attach to this schedule configuration
      let schedulePackages: any[] = [];
      let packageIds: string[] = Array.isArray(body.package_ids)
        ? body.package_ids
        : Array.isArray(body.packages)
        ? body.packages.map((p: any) => p.id)
        : Array.isArray(event.schedule_package_ids) && event.schedule_package_ids.length > 0
        ? event.schedule_package_ids
        : [];

      if (packageIds.length === 0 && Array.isArray(event.schedule_overrides)) {
        const pkgOverride = event.schedule_overrides.find((o: any) => o?.type === "schedule_packages");
        if (pkgOverride && Array.isArray(pkgOverride.package_ids)) {
          packageIds = pkgOverride.package_ids;
        }
      }

      if (packageIds.length === 0) {
        const { data: defaultPkgs } = await supabase
          .from("photography_packages")
          .select("id")
          .eq("event_id", eventId)
          .eq("is_active", true);
        if (defaultPkgs && defaultPkgs.length > 0) {
          packageIds = defaultPkgs.map((p: any) => p.id);
        }
      }

      if (packageIds.length > 0) {
        const { data: dbPackages } = await supabase
          .from("photography_packages")
          .select("id, name, duration_mins, price_numeric")
          .in("id", packageIds)
          .eq("is_active", true);

        if (dbPackages && dbPackages.length > 0) {
          schedulePackages = dbPackages.map((p) => ({
            id: p.id,
            name: p.name,
            duration_mins: p.duration_mins,
            price: Number(p.price_numeric) || 0,
          }));
        }
      }

      const scheduleConfig: ScheduleConfig = {
        start_date: body.start_date || event.event_start_date,
        end_date:
          body.end_date ||
          event.event_end_date ||
          body.start_date ||
          event.event_start_date,
        operating_days: Array.isArray(body.operating_days)
          ? body.operating_days
          : Array.isArray(event.operating_days)
          ? event.operating_days
          : [0, 1, 2, 3, 4, 5, 6],
        operating_start_time:
          body.operating_start_time || event.operating_start_time || "09:00",
        operating_end_time:
          body.operating_end_time || event.operating_end_time || "18:00",
        slot_duration_mins: Number(
          body.slot_duration_mins || event.default_slot_duration_mins || 30
        ),
        slot_interval_mins: Number(
          body.slot_interval_mins ||
            event.slot_interval_mins ||
            event.default_slot_duration_mins ||
            30
        ),
        capacity_per_slot: Number(
          body.capacity_per_slot || event.default_slot_capacity || 1
        ),
        buffer_before_mins: Number(
          body.buffer_before_mins || event.buffer_before_mins || 0
        ),
        buffer_after_mins: Number(
          body.buffer_after_mins || event.buffer_after_mins || 10
        ),
        break_periods: Array.isArray(body.break_periods)
          ? body.break_periods
          : Array.isArray(event.break_periods)
          ? event.break_periods
          : [],
        packages: schedulePackages,
      };

      if (!scheduleConfig.start_date || !scheduleConfig.end_date) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Event Start Date and End Date are required to generate sessions.",
          },
          { status: 400 }
        );
      }

      // 1. Probe database capabilities for backward compatibility
      const [beProbe, slotProbe, spProbe] = await Promise.all([
        supabase.from("booking_events").select("schedule_package_ids").limit(0),
        supabase.from("event_time_slots").select("duration_mins").limit(0),
        supabase.from("event_session_packages").select("id").limit(0),
      ]);
      const supportsSchedulePkgIds = !beProbe.error;
      const supportsSlotDuration = !slotProbe.error;
      const supportsSessionPackages = !spProbe.error;

      // Clean overrides and attach schedule_packages record
      const cleanOverrides = Array.isArray(event.schedule_overrides)
        ? event.schedule_overrides.filter((o: any) => o?.type !== "schedule_packages")
        : [];
      if (packageIds.length > 0) {
        cleanOverrides.push({ type: "schedule_packages", package_ids: packageIds });
      }

      const eventUpdatePayload: Record<string, any> = {
        event_start_date: scheduleConfig.start_date,
        event_end_date: scheduleConfig.end_date,
        operating_days: scheduleConfig.operating_days,
        operating_start_time: scheduleConfig.operating_start_time,
        operating_end_time: scheduleConfig.operating_end_time,
        default_slot_duration_mins: scheduleConfig.slot_duration_mins,
        slot_interval_mins: scheduleConfig.slot_interval_mins,
        default_slot_capacity: scheduleConfig.capacity_per_slot,
        buffer_before_mins: scheduleConfig.buffer_before_mins,
        buffer_after_mins: scheduleConfig.buffer_after_mins,
        break_periods: scheduleConfig.break_periods,
        schedule_overrides: cleanOverrides,
        updated_at: new Date().toISOString(),
      };

      if (supportsSchedulePkgIds) {
        eventUpdatePayload.schedule_package_ids = packageIds;
      }

      // Persist schedule configuration onto booking_events
      await supabase
        .from("booking_events")
        .update(eventUpdatePayload)
        .eq("id", eventId);

      // 2. Calculate proposed sessions & slots
      const proposed = calculateProposedSchedule(scheduleConfig);

      // 3. Fetch existing sessions, slots, and active bookings
      const [existingSessionsRes, existingSlotsRes, activeBookingsRes] =
        await Promise.all([
          supabase.from("event_sessions").select("*").eq("event_id", eventId),
          supabase.from("event_time_slots").select("*").eq("event_id", eventId),
          supabase
            .from("bookings")
            .select("id, booking_ref, client_name, booking_date, start_at, status")
            .eq("event_id", eventId)
            .in("status", ["pending", "confirmed", "rescheduled"]),
        ]);

      const existingSessions = existingSessionsRes.data || [];
      const existingSlots = existingSlotsRes.data || [];
      const activeBookings = activeBookingsRes.data || [];

      // 4. Upsert sessions
      // When multiple packages are configured with different durations on the same date,
      // match existing session by (session_date, slot_duration_mins) so each package retains its own session.
      const sessionMap = new Map<string, string>(); // session_date -> session_id
      for (const proposedSess of proposed.sessions) {
        const existingSess = existingSessions.find(
          (s) =>
            s.session_date === proposedSess.session_date &&
            (!s.slot_duration_mins || s.slot_duration_mins === proposedSess.slot_duration_mins)
        );
        if (existingSess) {
          sessionMap.set(proposedSess.session_date, existingSess.id);
          await supabase
            .from("event_sessions")
            .update({
              start_time: proposedSess.start_time,
              end_time: proposedSess.end_time,
              slot_duration_mins: proposedSess.slot_duration_mins,
              capacity_per_slot: proposedSess.capacity_per_slot,
              buffer_before_mins: proposedSess.buffer_before_mins,
              buffer_after_mins: proposedSess.buffer_after_mins,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSess.id);
        } else {
          const { data: newSess, error: newSessErr } = await supabase
            .from("event_sessions")
            .insert({
              event_id: eventId,
              session_date: proposedSess.session_date,
              title: `${event.title} - ${proposedSess.session_date} (${proposedSess.slot_duration_mins}m)`,
              start_time: proposedSess.start_time,
              end_time: proposedSess.end_time,
              slot_duration_mins: proposedSess.slot_duration_mins,
              capacity_per_slot: proposedSess.capacity_per_slot,
              buffer_before_mins: proposedSess.buffer_before_mins,
              buffer_after_mins: proposedSess.buffer_after_mins,
              is_active: true,
            })
            .select("id")
            .single();

          if (newSessErr) throw formatAdminError(newSessErr);
          if (newSess) sessionMap.set(proposedSess.session_date, newSess.id);
        }

        // Sync event_session_packages junction records for this session if supported
        const actualSessionId = sessionMap.get(proposedSess.session_date);
        if (actualSessionId && packageIds.length > 0 && supportsSessionPackages) {
          try {
            await supabase
              .from("event_session_packages")
              .delete()
              .eq("session_id", actualSessionId);

            const sessionPkgRows = packageIds.map((pkgId) => ({
              session_id: actualSessionId,
              package_id: pkgId,
            }));
            await supabase.from("event_session_packages").insert(sessionPkgRows);
          } catch {
            // Ignore junction sync errors if table doesn't exist yet
          }
        }
      }

      // 5. Upsert slots
      let createdSlotsCount = 0;
      let retainedSlotsCount = 0;

      const existingSlotMap = new Map<string, any>();
      for (const es of existingSlots) {
        existingSlotMap.set(`${es.slot_date}_${es.start_at}_${es.end_at}`, es);
      }

      const activeProposedKeys = new Set<string>();

      for (const proposedSess of proposed.sessions) {
        const sessionId = sessionMap.get(proposedSess.session_date);
        for (const ps of proposedSess.slots) {
          const key = `${ps.slot_date}_${ps.start_at}_${ps.end_at}`;
          activeProposedKeys.add(key);

          const matchedExisting = existingSlotMap.get(key);
          if (matchedExisting) {
            retainedSlotsCount++;
            const safeCap = Math.max(
              matchedExisting.booked_count || 0,
              ps.capacity
            );
            const slotUpdate: Record<string, any> = {
              session_id: sessionId || matchedExisting.session_id,
              capacity: safeCap,
              buffer_before_mins: scheduleConfig.buffer_before_mins || 0,
              buffer_after_mins: scheduleConfig.buffer_after_mins || 10,
              updated_at: new Date().toISOString(),
            };
            if (supportsSlotDuration) {
              slotUpdate.duration_mins = ps.duration_mins;
              // Preserve package associations when multiple packages intentionally share the same slot duration & window
              const mergedPkgIds = Array.from(
                new Set([...(matchedExisting.package_ids || []), ...(ps.package_ids || [])])
              );
              slotUpdate.package_ids = mergedPkgIds;
            }
            await supabase
              .from("event_time_slots")
              .update(slotUpdate)
              .eq("id", matchedExisting.id);
          } else {
            createdSlotsCount++;
            const slotInsert: Record<string, any> = {
              event_id: eventId,
              session_id: sessionId || null,
              slot_date: ps.slot_date,
              start_at: ps.start_at,
              end_at: ps.end_at,
              buffer_before_mins: scheduleConfig.buffer_before_mins || 0,
              buffer_after_mins: scheduleConfig.buffer_after_mins || 10,
              effective_start_at: ps.effective_start_at,
              effective_end_at: ps.effective_end_at,
              capacity: ps.capacity,
              booked_count: 0,
              status: "available",
              label: `${ps.start_time} - ${ps.end_time}`,
            };
            if (supportsSlotDuration) {
              slotInsert.duration_mins = ps.duration_mins;
              slotInsert.package_ids = ps.package_ids;
            }
            await supabase.from("event_time_slots").insert(slotInsert);
          }
        }
      }

      // 6. Prune unbooked slots outside new schedule (strict preservation of booked slots & other packages)
      let prunedSlotsCount = 0;
      const slotIdsToPrune: string[] = [];
      for (const es of existingSlots) {
        const key = `${es.slot_date}_${es.start_at}_${es.end_at}`;
        if (!activeProposedKeys.has(key)) {
          if ((es.booked_count || 0) === 0) {
            const esPkgIds: string[] = Array.isArray(es.package_ids) ? es.package_ids : [];
            const targetPkgIds: string[] = Array.isArray(packageIds) ? packageIds : [];

            if (targetPkgIds.length > 0) {
              // We are generating for specific package(s).
              const intersects = esPkgIds.some((id) => targetPkgIds.includes(id));
              if (intersects) {
                // If the slot also belongs to other packages, preserve it and only detach target packages
                const remainingPkgs = esPkgIds.filter((id) => !targetPkgIds.includes(id));
                if (remainingPkgs.length > 0) {
                  await supabase
                    .from("event_time_slots")
                    .update({ package_ids: remainingPkgs, updated_at: new Date().toISOString() })
                    .eq("id", es.id);
                } else {
                  slotIdsToPrune.push(es.id);
                }
              }
              // If it belongs to completely different packages, DO NOT PRUNE IT!
            } else {
              // Global regeneration without package filter: only prune if duration matches the generated schedule
              if (!es.duration_mins || es.duration_mins === scheduleConfig.slot_duration_mins) {
                slotIdsToPrune.push(es.id);
              }
            }
          }
        }
      }

      if (slotIdsToPrune.length > 0) {
        await supabase
          .from("bookings")
          .update({ slot_id: null, updated_at: new Date().toISOString() })
          .in("slot_id", slotIdsToPrune);

        await supabase
          .from("event_time_slots")
          .delete()
          .in("id", slotIdsToPrune);
        prunedSlotsCount = slotIdsToPrune.length;
      }

      return NextResponse.json({
        success: true,
        message: `Successfully synchronized schedule: ${proposed.sessions.length} sessions, ${createdSlotsCount} new slots created, ${retainedSlotsCount} slots updated/retained, ${prunedSlotsCount} unused slots pruned. All ${activeBookings.length} confirmed bookings preserved.`,
        data: {
          sessions_count: proposed.sessions.length,
          slots_created: createdSlotsCount,
          slots_retained: retainedSlotsCount,
          slots_pruned: prunedSlotsCount,
          bookings_preserved: activeBookings.length,
        },
      });
    }

    if (entity === "bulk_slots") {
      const action = String(body.action || "").trim();
      const slotIds: string[] = Array.isArray(body.slot_ids) ? body.slot_ids : [];

      if (!action || slotIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "Action and slot_ids array are required." },
          { status: 400 }
        );
      }

      if (action === "block") {
        const { error } = await supabase
          .from("event_time_slots")
          .update({ status: "blocked", updated_at: new Date().toISOString() })
          .in("id", slotIds);

        if (error) throw formatAdminError(error);
        return NextResponse.json({
          success: true,
          message: `Blocked ${slotIds.length} slot(s) from public booking.`,
          affected: slotIds.length,
        });
      }

      if (action === "restore") {
        const { error } = await supabase
          .from("event_time_slots")
          .update({ status: "available", updated_at: new Date().toISOString() })
          .in("id", slotIds);

        if (error) throw formatAdminError(error);
        return NextResponse.json({
          success: true,
          message: `Restored ${slotIds.length} slot(s) to available status.`,
          affected: slotIds.length,
        });
      }

      if (action === "set_capacity") {
        const newCap = Math.max(1, Number(body.capacity || 1));
        const { data: targetSlots } = await supabase
          .from("event_time_slots")
          .select("id, booked_count")
          .in("id", slotIds);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const slot of targetSlots || []) {
          if ((slot.booked_count || 0) <= newCap) {
            await supabase
              .from("event_time_slots")
              .update({ capacity: newCap, updated_at: new Date().toISOString() })
              .eq("id", slot.id);
            updatedCount++;
          } else {
            skippedCount++;
          }
        }

        return NextResponse.json({
          success: true,
          message: `Updated capacity to ${newCap} for ${updatedCount} slot(s).${
            skippedCount > 0
              ? ` Skipped ${skippedCount} slot(s) where existing bookings exceed ${newCap}.`
              : ""
          }`,
          updated: updatedCount,
          skipped: skippedCount,
        });
      }

      if (action === "delete") {
        const { data: targetSlots } = await supabase
          .from("event_time_slots")
          .select("id, booked_count")
          .in("id", slotIds);

        const safeIdsToDelete: string[] = [];
        let bookedSlotsSkipped = 0;

        for (const slot of targetSlots || []) {
          if ((slot.booked_count || 0) === 0) {
            safeIdsToDelete.push(slot.id);
          } else {
            bookedSlotsSkipped++;
          }
        }

        if (safeIdsToDelete.length > 0) {
          // Nullify slot_id on any historical/cancelled bookings referencing these slots
          await supabase
            .from("bookings")
            .update({ slot_id: null, updated_at: new Date().toISOString() })
            .in("slot_id", safeIdsToDelete);

          const { error } = await supabase
            .from("event_time_slots")
            .delete()
            .in("id", safeIdsToDelete);

          if (error) throw formatAdminError(error);
        }

        return NextResponse.json({
          success: true,
          message: `Safely deleted ${safeIdsToDelete.length} unbooked slot(s).${
            bookedSlotsSkipped > 0
              ? ` Preserved ${bookedSlotsSkipped} slot(s) with active bookings. Use 'Block' if you wish to close them.`
              : ""
          }`,
          deleted: safeIdsToDelete.length,
          skipped: bookedSlotsSkipped,
        });
      }

      return NextResponse.json(
        { success: false, error: `Unsupported bulk action: ${action}` },
        { status: 400 }
      );
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

        const updatePayload: any = {
          capacity: safeCapacity,
          status,
          label: label ?? existingSlot?.label,
          updated_at: new Date().toISOString(),
        };

        if (start_time && end_time) {
          const targetDate = slot_date || existingSlot?.slot_date;
          const startIso = dhakaDateTimeToISO(targetDate, start_time);
          const endIso = dhakaDateTimeToISO(targetDate, end_time);
          if (Date.parse(endIso) <= Date.parse(startIso)) {
            return NextResponse.json(
              { success: false, error: "End time must be after start time." },
              { status: 400 }
            );
          }
          updatePayload.start_at = startIso;
          updatePayload.end_at = endIso;
          updatePayload.effective_start_at = addMinutesToISO(
            startIso,
            -Number(buffer_before_mins ?? existingSlot?.buffer_before_mins ?? 0)
          );
          updatePayload.effective_end_at = addMinutesToISO(
            endIso,
            Number(buffer_after_mins ?? existingSlot?.buffer_after_mins ?? 10)
          );
        }

        const { data: updated, error } = await supabase
          .from("event_time_slots")
          .update(updatePayload)
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw formatAdminError(error);
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
            label: label || `${start_time} - ${end_time}`,
          })
          .select("*")
          .single();

        if (error) throw formatAdminError(error);
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

      if (error) throw formatAdminError(error);
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

      // Try RPC first for security-definer execution bypassing RLS quirks
      let saved: any = null;
      let saveError: any = null;
      try {
        const { data: rpcSaved, error: rpcErr } = await supabase.rpc(
          "upsert_photography_package",
          { p_package: parsed.data }
        );
        if (!rpcErr && rpcSaved) {
          saved = rpcSaved;
        } else if (rpcErr) {
          saveError = rpcErr;
        }
      } catch (e) {
        saveError = e;
      }

      // Fallback to direct PostgREST insert/update if RPC is not available
      if (!saved) {
        if (parsed.data.id) {
          const { data: updated, error: updErr } = await supabase
            .from("photography_packages")
            .update({
              ...parsed.data,
              updated_at: new Date().toISOString(),
            })
            .eq("id", parsed.data.id)
            .select("*")
            .single();

          if (updErr) throw formatAdminError(updErr || saveError);
          saved = updated;
        } else {
          const { data: inserted, error: insErr } = await supabase
            .from("photography_packages")
            .insert({
              ...parsed.data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("*")
            .single();

          if (insErr) throw formatAdminError(insErr || saveError);
          saved = inserted;
        }
      }

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
        throw formatAdminError(insertErr || new Error("Failed to duplicate package"));
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

      if (error) throw formatAdminError(error);
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

      if (error) throw formatAdminError(error);
      return NextResponse.json({ success: true, data: saved });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported entity type." },
      { status: 400 }
    );
  } catch (err: any) {
    const parsed = formatAdminError(err);
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

  const supabase = (await createSupabasePrivilegedClient()) || (await createSupabaseServerClient());
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
      const { data: allEventBookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, booking_ref, client_name, booking_date, start_at, status")
        .eq("event_id", id);

      if (bErr) throw formatAdminError(bErr);

      const activeBookings = (allEventBookings || []).filter((b: any) =>
        ["pending", "confirmed", "rescheduled"].includes(b.status)
      );

      if (activeBookings.length > 0) {
        const refs = activeBookings.map((b: any) => b.booking_ref).filter(Boolean).join(", ");
        return NextResponse.json(
          {
            success: false,
            code: "CONFLICTING_ACTIVE_BOOKINGS",
            error: `Cannot delete this special booking event while ${activeBookings.length} active reservation(s) exist${refs ? ` (${refs})` : ""}. Set the event status to "Archived" or "Closed", or cancel/reschedule the bookings first.`,
            conflicts: activeBookings,
          },
          { status: 409 }
        );
      }

      // Safely nullify references on any inactive/cancelled bookings before cascade delete
      await supabase
        .from("bookings")
        .update({
          event_id: null,
          session_id: null,
          slot_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", id);

      // Clean up junction rows for sessions of this event
      try {
        const { data: eventSessions } = await supabase
          .from("event_sessions")
          .select("id")
          .eq("event_id", id);
        if (eventSessions && eventSessions.length > 0) {
          const sessIds = eventSessions.map((s: any) => s.id);
          await supabase.from("event_session_packages").delete().in("session_id", sessIds);
        }
      } catch {
        // ignore junction table errors
      }

      // Clean up child tables cleanly in order
      await supabase.from("event_time_slots").delete().eq("event_id", id);
      await supabase.from("event_sessions").delete().eq("event_id", id);
      await supabase.from("photography_packages").delete().eq("event_id", id);

      const { error } = await supabase
        .from("booking_events")
        .delete()
        .eq("id", id);

      if (error) throw formatAdminError(error);
      return NextResponse.json({ success: true, message: "Special booking event deleted successfully." });
    }

    if (entity === "session") {
      // 1. Fetch all bookings referencing this session
      const { data: sessionBookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, booking_ref, client_name, booking_date, start_at, status")
        .eq("session_id", id);

      if (bErr) throw formatAdminError(bErr);

      const activeBookings = (sessionBookings || []).filter((b: any) =>
        ["pending", "confirmed", "rescheduled"].includes(b.status)
      );

      // Strictly forbid deleting session if active confirmed bookings exist
      if (activeBookings.length > 0) {
        const refs = activeBookings.map((b: any) => b.booking_ref).filter(Boolean).join(", ");
        return NextResponse.json(
          {
            success: false,
            code: "CONFLICTING_ACTIVE_BOOKINGS",
            error: `Cannot delete this scheduled session date because ${activeBookings.length} active confirmed booking(s) are scheduled on it${refs ? ` (${refs})` : ""}. Please reschedule or cancel those bookings before removing the session.`,
            conflicts: activeBookings,
          },
          { status: 409 }
        );
      }

      // 2. Safely nullify session_id and slot_id on any historical/cancelled bookings referencing this session
      await supabase
        .from("bookings")
        .update({
          session_id: null,
          slot_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", id);

      // Also nullify slot_id for any bookings that pointed to slots on this session
      const { data: sessionSlots } = await supabase
        .from("event_time_slots")
        .select("id")
        .eq("session_id", id);
      if (sessionSlots && sessionSlots.length > 0) {
        const slotIds = sessionSlots.map((s: any) => s.id);
        await supabase
          .from("bookings")
          .update({
            slot_id: null,
            updated_at: new Date().toISOString(),
          })
          .in("slot_id", slotIds);
      }

      // 3. Clean up junction table event_session_packages if it exists
      try {
        await supabase
          .from("event_session_packages")
          .delete()
          .eq("session_id", id);
      } catch {
        // junction table might not exist
      }

      // 4. Delete slots belonging to this session
      await supabase
        .from("event_time_slots")
        .delete()
        .eq("session_id", id);

      // 5. Finally delete the session record
      const { error } = await supabase
        .from("event_sessions")
        .delete()
        .eq("id", id);

      if (error) throw formatAdminError(error);
      return NextResponse.json({ success: true, message: "Session date removed successfully." });
    }

    if (entity === "slot") {
      const { data: slotBookings } = await supabase
        .from("bookings")
        .select("id, booking_ref, status")
        .eq("slot_id", id);

      const activeBookings = (slotBookings || []).filter((b: any) =>
        ["pending", "confirmed", "rescheduled"].includes(b.status)
      );

      if (activeBookings.length > 0) {
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

      // Safely nullify slot_id on any cancelled/historical bookings
      await supabase
        .from("bookings")
        .update({
          slot_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("slot_id", id);

      const { error } = await supabase
        .from("event_time_slots")
        .delete()
        .eq("id", id);

      if (error) throw formatAdminError(error);
      return NextResponse.json({ success: true, message: "Time slot deleted successfully." });
    }

    if (entity === "package") {
      let rpcResult: any = null;
      let rpcErr: any = null;

      try {
        const res = await supabase.rpc(
          "delete_or_archive_package",
          { p_package_id: id }
        );
        rpcResult = res.data;
        rpcErr = res.error;
      } catch (e) {
        rpcErr = e;
      }

      // If RPC succeeded, return its verified result
      if (!rpcErr && rpcResult && rpcResult.action) {
        return NextResponse.json({
          success: true,
          action: rpcResult.action,
          message: rpcResult.message,
          historical_bookings_count: rpcResult.historical_bookings_count || 0,
        });
      }

      // TypeScript fallback implementing the identical safe deletion rules:
      // Case A & B (0 bookings): Delete junction, nullify unbooked slots, delete package permanently.
      // Case C (>0 bookings): Safely archive for future bookings (is_active = false).
      const { data: pkg } = await supabase
        .from("photography_packages")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

      if (!pkg) {
        return NextResponse.json(
          { success: false, error: "Package not found." },
          { status: 404 }
        );
      }

      const { count: bookingCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("package_id", id);

      if (bookingCount && bookingCount > 0) {
        // Case C: Safely archive
        const { error: archErr } = await supabase
          .from("photography_packages")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (archErr) throw formatAdminError(archErr);

        return NextResponse.json({
          success: true,
          action: "archived",
          historical_bookings_count: bookingCount,
          message: `Package "${pkg.name}" is referenced by ${bookingCount} historical booking(s) and was safely archived and disabled for future bookings to protect client records.`,
        });
      }

      // Case A & B: Zero bookings - clean up junction and unbooked slots, then delete
      try {
        await supabase
          .from("event_session_packages")
          .delete()
          .eq("package_id", id);
      } catch {
        // junction table might not exist
      }

      try {
        await supabase
          .from("event_time_slots")
          .update({ package_id: null })
          .eq("package_id", id);
      } catch {
        // optional column
      }

      const { error: delErr } = await supabase
        .from("photography_packages")
        .delete()
        .eq("id", id);

      if (delErr) throw formatAdminError(delErr);

      return NextResponse.json({
        success: true,
        action: "deleted",
        historical_bookings_count: 0,
        message: `Package "${pkg.name}" had no bookings and was permanently deleted. Schedule associations were cleaned up.`,
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
    if (error) throw formatAdminError(error);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const parsed = formatAdminError(err);
    return NextResponse.json(
      { success: false, code: parsed.code, error: parsed.message },
      { status: parsed.httpStatus }
    );
  }
}
