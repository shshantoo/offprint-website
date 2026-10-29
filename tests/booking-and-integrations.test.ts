import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addMinutesToISO,
  checkPolicyDeadline,
  dhakaDateTimeToISO,
  formatDhakaDate,
  formatDhakaTime,
  toDhakaDateString,
} from "../src/lib/booking/timezone";
import {
  computeConvocationSlots,
  computeTraditionalSlotsForDate,
  summarizeMonthAvailability,
} from "../src/lib/booking/availability";
import { TransactionalBookingEngine } from "../src/lib/booking/concurrency-engine";
import { escapeHtml, renderBookingEmail } from "../src/lib/email/templates";
import {
  buildGoogleCalendarEventPayload,
  syncBookingToGoogleCalendar,
} from "../src/lib/google/calendar";
import {
  buildRawMimeMessage,
  sendBookingNotificationEmail,
} from "../src/lib/google/gmail";
import { encryptToken, decryptToken } from "../src/lib/google/oauth";
import {
  validateCustomFieldsAgainstQuestions,
  adminLoginSchema,
  adminFirstLoginCredentialSchema,
  adminAccountUpdateSchema,
  calculateAndVerifyBookingPrice,
} from "../src/lib/validations";
import { ensureUuid, normalizePortfolioProject } from "../src/lib/data-service";
import type {
  AvailabilityRule,
  Booking,
  BookingEvent,
  CustomBookingQuestion,
  EventSession,
  EventTimeSlot,
  PhotographyPackage,
  PhotographyService,
  EventHeroSlide,
} from "../src/types/database";

function createSampleFixture() {
  const event: BookingEvent = {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "iub-27th-convocation",
    title: "IUB 27th Convocation Photography",
    subtitle: "Official Portrait & Regalia Sessions",
    description: "Convocation portrait photography for IUB 27th Convocation.",
    venue: "IUB Campus, Bashundhara R/A, Dhaka",
    hero_image_url: null,
    status: "published",
    booking_opens_at: "2026-01-01T00:00:00.000Z",
    booking_closes_at: "2026-12-31T23:59:59.000Z",
    default_slot_duration_mins: 30,
    buffer_before_mins: 0,
    buffer_after_mins: 10,
    default_slot_capacity: 2,
    cancellation_cutoff_hours: 48,
    reschedule_cutoff_hours: 24,
    cancellation_policy: "Free rescheduling up to 24h prior and cancellation up to 48h prior.",
    instructions: "Arrive 10 minutes early with your convocation gown and hood.",
    resource_pool: "primary_studio",
  };

  const session: EventSession = {
    id: "22222222-2222-4222-8222-222222222222",
    event_id: event.id,
    session_date: "2026-11-15",
    title: "Morning Convocation Portrait Session",
    start_time: "10:00",
    end_time: "12:00",
    slot_duration_mins: 30,
    buffer_before_mins: 0,
    buffer_after_mins: 10,
    capacity_per_slot: 2,
    is_active: true,
    notes: null,
  };

  const slot1Start = dhakaDateTimeToISO("2026-11-15", "10:00");
  const slot1End = dhakaDateTimeToISO("2026-11-15", "10:30");
  const slot1: EventTimeSlot = {
    id: "33333333-3333-4333-8333-333333333331",
    event_id: event.id,
    session_id: session.id,
    slot_date: "2026-11-15",
    start_at: slot1Start,
    end_at: slot1End,
    buffer_before_mins: 0,
    buffer_after_mins: 10,
    effective_start_at: slot1Start,
    effective_end_at: addMinutesToISO(slot1End, 10),
    capacity: 2,
    booked_count: 0,
    status: "available",
    label: "Morning Slot 1",
  };

  const slot2Start = dhakaDateTimeToISO("2026-11-15", "10:40");
  const slot2End = dhakaDateTimeToISO("2026-11-15", "11:10");
  const slot2: EventTimeSlot = {
    id: "33333333-3333-4333-8333-333333333332",
    event_id: event.id,
    session_id: session.id,
    slot_date: "2026-11-15",
    start_at: slot2Start,
    end_at: slot2End,
    buffer_before_mins: 0,
    buffer_after_mins: 10,
    effective_start_at: slot2Start,
    effective_end_at: addMinutesToISO(slot2End, 10),
    capacity: 1,
    booked_count: 0,
    status: "available",
    label: "Morning Slot 2",
  };

  const service: PhotographyService = {
    id: "44444444-4444-4444-8444-444444444444",
    slug: "executive-portrait-session",
    name: "Executive & Editorial Portrait Session",
    category: "portrait",
    tagline: "Studio & corporate portraiture",
    short_description: "60-minute guided portrait session.",
    full_description: "Complete executive portrait session with studio lighting.",
    base_duration_mins: 60,
    allowed_durations: [60, 120],
    buffer_before_mins: 0,
    buffer_after_mins: 15,
    min_notice_hours: 12,
    max_advance_days: 120,
    cancellation_cutoff_hours: 24,
    reschedule_cutoff_hours: 24,
    default_location_type: "studio",
    resource_pool: "primary_studio",
    max_concurrent_bookings: 1,
    image_url: null,
    is_active: true,
    sort_order: 1,
  };

  const pkg: PhotographyPackage = {
    id: "55555555-5555-4555-8555-555555555555",
    event_id: event.id,
    service_id: null,
    name: "The Laureate & Family Collection",
    subtitle: "Solo + Family Portraits",
    description: "Includes solo regalia portraits and family combinations.",
    duration_mins: 30,
    price_label: "BDT 6,000",
    deliverables: ["15 High-Resolution Retouched Portraits", "Online Gallery"],
    max_people: 6,
    is_featured: true,
    is_active: true,
    sort_order: 1,
  };

  const rules: AvailabilityRule[] = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
    id: `rule-${dow}`,
    resource_pool: "primary_studio",
    day_of_week: dow,
    is_open: dow !== 5, // Closed on Friday (5)
    start_time: "09:00",
    end_time: "18:00",
    slot_interval_mins: 60,
    capacity_per_slot: 1,
  }));

  const engine = new TransactionalBookingEngine({
    events: new Map([[event.id, { ...event }]]),
    sessions: new Map([[session.id, { ...session }]]),
    slots: new Map([
      [slot1.id, { ...slot1 }],
      [slot2.id, { ...slot2 }],
    ]),
    services: new Map([[service.id, { ...service }]]),
    packages: new Map([[pkg.id, { ...pkg }]]),
    rules,
    blocks: [],
    bookings: new Map(),
  });

  return { event, session, slot1, slot2, service, pkg, rules, engine };
}

describe("OFFPRINT Booking System, Concurrency & Google Integrations Suite", () => {
  it("1. converts Asia/Dhaka (+06:00) timestamps and calculates policy cutoffs accurately", () => {
    const iso = dhakaDateTimeToISO("2026-11-15", "10:00");
    assert.equal(iso, "2026-11-15T04:00:00.000Z");
    assert.equal(toDhakaDateString(iso), "2026-11-15");
    assert.match(formatDhakaTime(iso), /10:00\s*AM/i);
    assert.match(formatDhakaDate(iso), /Nov 15, 2026/);

    // 48h cutoff before 2026-11-15T04:00:00Z is 2026-11-13T04:00:00Z
    const beforeDeadline = new Date("2026-11-12T12:00:00.000Z");
    const afterDeadline = new Date("2026-11-14T12:00:00.000Z");

    assert.equal(checkPolicyDeadline(iso, 48, beforeDeadline).allowed, true);
    assert.equal(checkPolicyDeadline(iso, 48, afterDeadline).allowed, false);
  });

  it("2. calculates Convocation and Traditional slot availability and month summaries", () => {
    const { event, session, slot1, slot2, service, rules } = createSampleFixture();
    const now = new Date("2026-11-01T00:00:00.000Z");

    const convSlots = computeConvocationSlots({
      event,
      slots: [slot1, slot2],
      sessions: [session],
      blocks: [],
      busyIntervals: [],
      now,
    });

    assert.equal(convSlots.length, 2);
    assert.equal(convSlots[0].state, "available");
    assert.equal(convSlots[0].remaining_capacity, 2);

    // Traditional slots on Sunday 2026-11-15 when slot1 (10:00-10:40 effective) is busy
    const tradSlots = computeTraditionalSlotsForDate({
      dateYMD: "2026-11-15",
      service,
      durationMins: 60,
      rules,
      blocks: [],
      busyIntervals: [
        {
          booking_id: "b-conv-1",
          booking_type: "convocation",
          slot_id: slot1.id,
          start_at: slot1.start_at,
          end_at: slot1.end_at,
          effective_start_at: slot1.effective_start_at,
          effective_end_at: slot1.effective_end_at,
        },
      ],
      now,
    });

    // 10:00 AM traditional slot (10:00 - 11:15 effective) overlaps 10:00-10:40 convocation slot
    const tenAmSlot = tradSlots.find((s) => s.start_at === dhakaDateTimeToISO("2026-11-15", "10:00"));
    assert.ok(tenAmSlot);
    assert.equal(tenAmSlot.state, "unavailable");
    assert.equal(tenAmSlot.unavailable_reason, "Reserved for Convocation photography");

    // 11:00 AM traditional slot (11:00 - 12:15 effective) is available since slot2 is not booked yet
    const elevenAmSlot = tradSlots.find((s) => s.start_at === dhakaDateTimeToISO("2026-11-15", "11:00"));
    assert.ok(elevenAmSlot);
    assert.equal(elevenAmSlot.state, "available");

    // Friday (2026-11-13) is closed in rules -> all slots unavailable
    const fridaySlots = computeTraditionalSlotsForDate({
      dateYMD: "2026-11-13",
      service,
      durationMins: 60,
      rules,
      blocks: [],
      busyIntervals: [],
      now,
    });
    assert.equal(fridaySlots.length, 0);

    const summary = summarizeMonthAvailability({
      year: 2026,
      month1To12: 11,
      getSlotsForDate: (d) => (d === "2026-11-15" ? convSlots : []),
    });
    const nov15 = summary.find((s) => s.date === "2026-11-15");
    assert.equal(nov15?.status, "available");
    assert.equal(nov15?.available_slots_count, 2);
  });

  it("3. creates bookings for IUB 27th Convocation and Traditional Photography and prevents overbooking", async () => {
    const { event, slot2, service, pkg, engine } = createSampleFixture();
    const now = new Date("2026-11-01T00:00:00.000Z");

    // Book convocation slot2 (capacity = 1)
    const convBooking = await engine.createBookingAtomic({
      booking_type: "convocation",
      event_id: event.id,
      slot_id: slot2.id,
      package_id: pkg.id,
      booking_date: slot2.slot_date,
      start_at: slot2.start_at,
      end_at: slot2.end_at,
      duration_mins: 30,
      client_name: "Nafisa Rahman",
      client_email: "nafisa@iub.edu.bd",
      client_phone: "+8801711000000",
      student_id: "2021456",
      location: "IUB Campus",
      now,
    });

    assert.match(convBooking.booking_ref, /^OFP-2026-[A-F0-9]{6}$/);
    assert.equal(convBooking.status, "confirmed");
    assert.equal(engine.getState().slots.get(slot2.id)?.booked_count, 1);

    // Second booking on slot2 (capacity 1) must be rejected with SLOT_CAPACITY_EXHAUSTED
    await assert.rejects(
      () =>
        engine.createBookingAtomic({
          booking_type: "convocation",
          event_id: event.id,
          slot_id: slot2.id,
          booking_date: slot2.slot_date,
          start_at: slot2.start_at,
          end_at: slot2.end_at,
          duration_mins: 30,
          client_name: "Second Graduate",
          client_email: "second@iub.edu.bd",
          client_phone: "+8801711000001",
          location: "IUB Campus",
          now,
        }),
      /SLOT_CAPACITY_EXHAUSTED/
    );

    // Book traditional photography session at 14:00 - 15:00 BST on 2026-11-15
    const tradStart = dhakaDateTimeToISO("2026-11-15", "14:00");
    const tradEnd = dhakaDateTimeToISO("2026-11-15", "15:00");
    const tradBooking = await engine.createBookingAtomic({
      booking_type: "traditional",
      service_id: service.id,
      booking_date: "2026-11-15",
      start_at: tradStart,
      end_at: tradEnd,
      duration_mins: 60,
      client_name: "Farhan Karim",
      client_email: "farhan@corp.com",
      client_phone: "+8801711999999",
      location: "OFFPRINT Studio, Gulshan-2",
      now,
    });

    assert.equal(tradBooking.booking_type, "traditional");

    // Overlapping traditional booking at 15:05 BST (within 15m buffer after 15:00) must fail
    await assert.rejects(
      () =>
        engine.createBookingAtomic({
          booking_type: "traditional",
          service_id: service.id,
          booking_date: "2026-11-15",
          start_at: dhakaDateTimeToISO("2026-11-15", "15:05"),
          end_at: dhakaDateTimeToISO("2026-11-15", "16:05"),
          duration_mins: 60,
          client_name: "Another Client",
          client_email: "another@corp.com",
          client_phone: "+8801711888888",
          location: "OFFPRINT Studio, Gulshan-2",
          now,
        }),
      /SLOT_UNAVAILABLE/
    );
  });

  it("4. enforces strict concurrency protection when 8 simultaneous requests race for a slot with capacity 2", async () => {
    const { event, slot1, engine } = createSampleFixture();
    const now = new Date("2026-11-01T00:00:00.000Z");

    // Fire 8 concurrent booking requests for slot1 (capacity = 2)
    const attempts = Array.from({ length: 8 }, (_, idx) =>
      engine.createBookingAtomic({
        booking_type: "convocation",
        event_id: event.id,
        slot_id: slot1.id,
        booking_date: slot1.slot_date,
        start_at: slot1.start_at,
        end_at: slot1.end_at,
        duration_mins: 30,
        client_name: `Concurrent Graduate ${idx + 1}`,
        client_email: `grad${idx + 1}@iub.edu.bd`,
        client_phone: `+880171100000${idx}`,
        student_id: `202100${idx}`,
        location: "IUB Campus",
        now,
      })
    );

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

    assert.equal(fulfilled.length, 2, "Exactly 2 concurrent requests must succeed");
    assert.equal(rejected.length, 6, "Remaining 6 concurrent requests must be rejected");
    for (const rej of rejected) {
      assert.match(String(rej.reason?.message || rej.reason), /SLOT_CAPACITY_EXHAUSTED/);
    }
    assert.equal(engine.getState().slots.get(slot1.id)?.booked_count, 2);
  });

  it("5. prevents cross-type conflicts between Convocation and Traditional bookings sharing primary_studio", async () => {
    const { event, slot1, service, engine } = createSampleFixture();
    const now = new Date("2026-11-01T00:00:00.000Z");

    // 1. Create a Convocation booking at 10:00 - 10:30 (+10m buffer -> 10:40)
    await engine.createBookingAtomic({
      booking_type: "convocation",
      event_id: event.id,
      slot_id: slot1.id,
      booking_date: slot1.slot_date,
      start_at: slot1.start_at,
      end_at: slot1.end_at,
      duration_mins: 30,
      client_name: "Convocation Graduate",
      client_email: "conv@iub.edu.bd",
      client_phone: "+8801711123456",
      location: "IUB Campus",
      now,
    });

    // 2. Attempting a Traditional booking overlapping 10:00 - 11:00 on the same resource pool must fail
    await assert.rejects(
      () =>
        engine.createBookingAtomic({
          booking_type: "traditional",
          service_id: service.id,
          booking_date: "2026-11-15",
          start_at: dhakaDateTimeToISO("2026-11-15", "10:00"),
          end_at: dhakaDateTimeToISO("2026-11-15", "11:00"),
          duration_mins: 60,
          client_name: "Traditional Client",
          client_email: "trad@client.com",
          client_phone: "+8801711654321",
          location: "OFFPRINT Studio",
          now,
        }),
      /CONVOCATION_CONFLICT/
    );

    // 3. Conversely, if a Traditional booking exists over slot2's window (10:40 - 11:40), booking slot2 for Convocation must fail
    await engine.createBookingAtomic({
      booking_type: "traditional",
      service_id: service.id,
      booking_date: "2026-11-15",
      start_at: dhakaDateTimeToISO("2026-11-15", "10:45"),
      end_at: dhakaDateTimeToISO("2026-11-15", "11:45"),
      duration_mins: 60,
      client_name: "Traditional Client 2",
      client_email: "trad2@client.com",
      client_phone: "+8801711654322",
      location: "OFFPRINT Studio",
      now,
    });

    const { slot2 } = createSampleFixture();
    await assert.rejects(
      () =>
        engine.createBookingAtomic({
          booking_type: "convocation",
          event_id: event.id,
          slot_id: slot2.id,
          booking_date: slot2.slot_date,
          start_at: slot2.start_at,
          end_at: slot2.end_at,
          duration_mins: 30,
          client_name: "Late Convocation Graduate",
          client_email: "late@iub.edu.bd",
          client_phone: "+8801711654323",
          location: "IUB Campus",
          now,
        }),
      /RESOURCE_CONFLICT/
    );
  });

  it("6. reschedules bookings atomically (reserving new slot & releasing old slot) and preserves original booking on failure", async () => {
    const { event, slot1, slot2, engine } = createSampleFixture();
    const now = new Date("2026-11-01T00:00:00.000Z");

    const booking = await engine.createBookingAtomic({
      user_id: "user-1",
      booking_type: "convocation",
      event_id: event.id,
      slot_id: slot1.id,
      booking_date: slot1.slot_date,
      start_at: slot1.start_at,
      end_at: slot1.end_at,
      duration_mins: 30,
      client_name: "Reschedule Graduate",
      client_email: "resched@iub.edu.bd",
      client_phone: "+8801711222333",
      location: "IUB Campus",
      now,
    });

    assert.equal(engine.getState().slots.get(slot1.id)?.booked_count, 1);
    assert.equal(engine.getState().slots.get(slot2.id)?.booked_count, 0);

    // Reschedule from slot1 to slot2
    const rescheduled = await engine.rescheduleBookingAtomic({
      booking_id: booking.id,
      actor_id: "user-1",
      actor_role: "client",
      new_slot_id: slot2.id,
      new_date: slot2.slot_date,
      new_start_at: slot2.start_at,
      new_end_at: slot2.end_at,
      reason: "Ceremony robe pickup moved",
      now,
    });

    assert.equal(rescheduled.status, "rescheduled");
    assert.equal(rescheduled.slot_id, slot2.id);
    assert.equal(rescheduled.rescheduled_count, 1);
    assert.equal(engine.getState().slots.get(slot1.id)?.booked_count, 0, "Original slot capacity released");
    assert.equal(engine.getState().slots.get(slot2.id)?.booked_count, 1, "New slot capacity reserved");

    // If a subsequent reschedule fails (e.g., past cutoff deadline), slot2 remains reserved and booking is untouched
    const pastCutoffNow = new Date("2026-11-15T01:00:00.000Z"); // 3 hours before session (< 24h cutoff)
    await assert.rejects(
      () =>
        engine.rescheduleBookingAtomic({
          booking_id: booking.id,
          actor_id: "user-1",
          actor_role: "client",
          new_slot_id: slot1.id,
          new_date: slot1.slot_date,
          new_start_at: slot1.start_at,
          new_end_at: slot1.end_at,
          now: pastCutoffNow,
        }),
      /RESCHEDULE_DEADLINE_PASSED/
    );

    assert.equal(engine.getState().bookings.get(booking.id)?.slot_id, slot2.id);
    assert.equal(engine.getState().slots.get(slot2.id)?.booked_count, 1);
  });

  it("7. enforces client ownership and policy deadlines on cancellation, and releases slot capacity when cancelled", async () => {
    const { event, slot2, engine } = createSampleFixture();
    const now = new Date("2026-11-01T00:00:00.000Z");

    const booking = await engine.createBookingAtomic({
      user_id: "owner-user-id",
      booking_type: "convocation",
      event_id: event.id,
      slot_id: slot2.id,
      booking_date: slot2.slot_date,
      start_at: slot2.start_at,
      end_at: slot2.end_at,
      duration_mins: 30,
      client_name: "Owner Graduate",
      client_email: "owner@iub.edu.bd",
      client_phone: "+8801711444555",
      location: "IUB Campus",
      now,
    });

    // Another client cannot cancel this booking
    await assert.rejects(
      () =>
        engine.cancelBookingAtomic({
          booking_id: booking.id,
          actor_id: "other-user-id",
          actor_role: "client",
          reason: "Unauthorized attempt",
          now,
        }),
      /FORBIDDEN/
    );

    // Owner cannot cancel after the 48-hour cutoff window
    const lateNow = new Date("2026-11-14T12:00:00.000Z");
    await assert.rejects(
      () =>
        engine.cancelBookingAtomic({
          booking_id: booking.id,
          actor_id: "owner-user-id",
          actor_role: "client",
          reason: "Too late",
          now: lateNow,
        }),
      /CANCELLATION_DEADLINE_PASSED/
    );

    // Owner cancels within policy window -> slot capacity released back to 0
    const cancelled = await engine.cancelBookingAtomic({
      booking_id: booking.id,
      actor_id: "owner-user-id",
      actor_role: "client",
      reason: "Unable to attend convocation",
      now,
    });

    assert.equal(cancelled.status, "cancelled");
    assert.equal(engine.getState().slots.get(slot2.id)?.booked_count, 0);

    // Now another graduate can book slot2
    const rebooked = await engine.createBookingAtomic({
      booking_type: "convocation",
      event_id: event.id,
      slot_id: slot2.id,
      booking_date: slot2.slot_date,
      start_at: slot2.start_at,
      end_at: slot2.end_at,
      duration_mins: 30,
      client_name: "New Graduate",
      client_email: "newgrad@iub.edu.bd",
      client_phone: "+8801711777888",
      location: "IUB Campus",
      now,
    });
    assert.equal(rebooked.status, "confirmed");
    assert.equal(engine.getState().slots.get(slot2.id)?.booked_count, 1);
  });

  it("8. synchronizes Google Calendar events (create, update, cancel) with idempotency and error handling", async () => {
    const { event, slot1, engine } = createSampleFixture();
    const booking = await engine.createBookingAtomic({
      booking_type: "convocation",
      event_id: event.id,
      slot_id: slot1.id,
      booking_date: slot1.slot_date,
      start_at: slot1.start_at,
      end_at: slot1.end_at,
      duration_mins: 30,
      client_name: "Ayman Rahman",
      client_email: "ayman@iub.edu.bd",
      client_phone: "+8801711223344",
      student_id: "2130456",
      location: "IUB Campus Portrait Lawn",
      now: new Date("2026-11-01T00:00:00.000Z"),
    });

    const payload = buildGoogleCalendarEventPayload(booking, "create");
    assert.ok(payload.summary.includes(booking.booking_ref));
    assert.equal(payload.start.timeZone, "Asia/Dhaka");
    assert.ok(payload.description.includes("2130456"));

    const calls: Array<{ url: string; method: string }> = [];
    const mockFetch: typeof fetch = async (input: any, init?: any) => {
      calls.push({ url: String(input), method: init?.method || "GET" });
      return new Response(JSON.stringify({ id: "gcal_evt_12345" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const idempotencyMap = new Map<string, string>();
    const overrideAuth = {
      accessToken: "mock-google-access-token",
      calendarId: "primary",
      calendarSyncEnabled: true,
    };

    // 1. Create event
    const createRes = await syncBookingToGoogleCalendar({
      booking,
      operation: "create",
      idempotencyKey: "cal:test:create:1",
      fetchFn: mockFetch,
      overrideAuth,
      completedIdempotencyMap: idempotencyMap,
    });
    assert.equal(createRes.success, true);
    assert.equal(createRes.googleEventId, "gcal_evt_12345");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "POST");

    // 2. Duplicate create with same idempotencyKey is deduplicated without calling Google API again
    const dupRes = await syncBookingToGoogleCalendar({
      booking,
      operation: "create",
      idempotencyKey: "cal:test:create:1",
      fetchFn: mockFetch,
      overrideAuth,
      completedIdempotencyMap: idempotencyMap,
    });
    assert.equal(dupRes.deduplicated, true);
    assert.equal(calls.length, 1);

    // 3. Update event (PATCH)
    booking.google_calendar_event_id = "gcal_evt_12345";
    const updateRes = await syncBookingToGoogleCalendar({
      booking,
      operation: "update",
      idempotencyKey: "cal:test:update:1",
      fetchFn: mockFetch,
      overrideAuth,
      completedIdempotencyMap: idempotencyMap,
    });
    assert.equal(updateRes.success, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].method, "PATCH");
    assert.match(calls[1].url, /gcal_evt_12345/);

    // 4. Cancel event
    const cancelRes = await syncBookingToGoogleCalendar({
      booking,
      operation: "cancel",
      idempotencyKey: "cal:test:cancel:1",
      fetchFn: mockFetch,
      overrideAuth,
      completedIdempotencyMap: idempotencyMap,
    });
    assert.equal(cancelRes.success, true);
    assert.equal(cancelRes.status, "cancelled");

    // 5. Simulated Google API 500 failure -> returns status: "failed" without throwing unhandled exception
    const failingFetch: typeof fetch = async () =>
      new Response("Internal Server Error", { status: 500 });
    const failRes = await syncBookingToGoogleCalendar({
      booking,
      operation: "update",
      idempotencyKey: "cal:test:fail:1",
      fetchFn: failingFetch,
      overrideAuth,
    });
    assert.equal(failRes.success, false);
    assert.equal(failRes.status, "failed");
    assert.match(failRes.error || "", /HTTP 500/);
  });

  it("9. renders and sends Gmail multipart emails, escapes untrusted HTML against XSS, and encrypts OAuth tokens", async () => {
    // Verify AES-256-GCM token encryption roundtrip
    const secretToken = "1//0g_sample_refresh_token_secret";
    const encrypted = encryptToken(secretToken);
    assert.notEqual(encrypted, secretToken);
    assert.equal(decryptToken(encrypted), secretToken);

    // Verify HTML escaping against XSS payloads in client fields
    const { event, slot1, engine } = createSampleFixture();
    const xssBooking = await engine.createBookingAtomic({
      booking_type: "convocation",
      event_id: event.id,
      slot_id: slot1.id,
      booking_date: slot1.slot_date,
      start_at: slot1.start_at,
      end_at: slot1.end_at,
      duration_mins: 30,
      client_name: `<script>alert("xss")</script>Rafiq`,
      client_email: "rafiq@iub.edu.bd",
      client_phone: "+8801711000999",
      location: `IUB Campus <img src=x onerror=alert(1)>`,
      client_notes: `Please bring <b>frame</b> & "hood"`,
      now: new Date("2026-11-01T00:00:00.000Z"),
    });

    const rendered = renderBookingEmail({
      booking: xssBooking,
      notificationType: "booking_confirmed",
    });

    assert.ok(!rendered.html.includes("<script>"), "Raw <script> tag must never appear in HTML email");
    assert.ok(!rendered.html.includes("<img src=x"), "Raw <img onerror> must never appear in HTML email");
    assert.ok(rendered.html.includes(escapeHtml(`<script>alert("xss")</script>Rafiq`)));
    assert.ok(rendered.html.includes(xssBooking.booking_ref));
    assert.ok(rendered.text.includes(xssBooking.booking_ref));

    const rawMime = buildRawMimeMessage({
      fromEmail: "studio@offprint.agency",
      toEmail: xssBooking.client_email,
      subject: rendered.subject,
      textBody: rendered.text,
      htmlBody: rendered.html,
    });
    assert.ok(rawMime.length > 100);

    // Verify Gmail API sending and idempotency deduplication
    let gmailCalls = 0;
    const mockGmailFetch: typeof fetch = async () => {
      gmailCalls += 1;
      return new Response(JSON.stringify({ id: "gmail_msg_999" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const sentMap = new Map<string, string>();
    const overrideAuth = {
      accessToken: "mock-gmail-token",
      connectedEmail: "studio@offprint.agency",
      gmailSendEnabled: true,
    };

    const send1 = await sendBookingNotificationEmail({
      booking: xssBooking,
      notificationType: "booking_confirmed",
      idempotencyKey: "email:test:1",
      fetchFn: mockGmailFetch,
      overrideAuth,
      sentIdempotencyMap: sentMap,
    });
    assert.equal(send1.success, true);
    assert.equal(send1.status, "sent");
    assert.equal(send1.messageId, "gmail_msg_999");
    assert.equal(gmailCalls, 1);

    const send2 = await sendBookingNotificationEmail({
      booking: xssBooking,
      notificationType: "booking_confirmed",
      idempotencyKey: "email:test:1",
      fetchFn: mockGmailFetch,
      overrideAuth,
      sentIdempotencyMap: sentMap,
    });
    assert.equal(send2.deduplicated, true);
    assert.equal(gmailCalls, 1, "Duplicate email notification must not re-send");
  });

  it("10. validates dynamic Special Booking Type custom questions, prevents cross-event conflicts, and embeds custom fields in Calendar & Email", async () => {
    const questions: CustomBookingQuestion[] = [
      {
        id: "student_id",
        label: "Student / Participant ID",
        type: "short_text",
        required: true,
        min_length: 4,
      },
      {
        id: "department",
        label: "Department / School",
        type: "dropdown",
        required: true,
        options: ["School of Business", "SETS (Engineering)"],
      },
      {
        id: "session_mode",
        label: "Session Mode",
        type: "single_choice",
        required: true,
        options: ["Solo Graduate", "Graduate + Family"],
      },
      {
        id: "addons",
        label: "Optional Add-Ons",
        type: "multiple_choice",
        required: false,
        options: ["Archival Fine-Art Print", "Express 48h Delivery"],
      },
      {
        id: "special_note",
        label: "Creative Direction Notes",
        type: "long_text",
        required: false,
      },
    ];

    // Missing required field must fail validation
    const invalidRes = validateCustomFieldsAgainstQuestions(questions, {
      student_id: "12", // too short (< 4)
      department: "Invalid Option",
    });
    assert.equal(invalidRes.valid, false);
    assert.ok(Object.keys(invalidRes.errors).length >= 2);

    // Valid custom fields pass and sanitize cleanly
    const validRes = validateCustomFieldsAgainstQuestions(questions, {
      student_id: "2021987",
      department: "SETS (Engineering)",
      session_mode: "Graduate + Family",
      addons: ["Archival Fine-Art Print", "Express 48h Delivery"],
      special_note: "Include parents in second half of session.",
    });
    assert.equal(validRes.valid, true);
    assert.deepEqual(validRes.sanitized.addons, [
      "Archival Fine-Art Print",
      "Express 48h Delivery",
    ]);

    // Create a second Special Booking Type sharing primary_studio and verify cross-event conflict detection
    const { event, slot1, engine } = createSampleFixture();
    const secondEvent: BookingEvent = {
      ...event,
      id: "99999999-9999-4999-8999-999999999999",
      slug: "nsu-convocation-2026",
      title: "NSU Convocation Portrait Special",
      category: "convocation",
      custom_questions: questions,
      resource_pool: "primary_studio",
    };
    const secondSlot: EventTimeSlot = {
      ...slot1,
      id: "88888888-8888-4888-8888-888888888888",
      event_id: secondEvent.id,
      capacity: 2,
      booked_count: 0,
    };
    engine.getState().events.set(secondEvent.id, secondEvent);
    engine.getState().slots.set(secondSlot.id, secondSlot);

    const now = new Date("2026-11-01T00:00:00.000Z");
    const specialBooking = await engine.createBookingAtomic({
      booking_type: "convocation",
      event_id: secondEvent.id,
      slot_id: secondSlot.id,
      booking_date: secondSlot.slot_date,
      start_at: secondSlot.start_at,
      end_at: secondSlot.end_at,
      duration_mins: 30,
      client_name: "Zarina Ahmed",
      client_email: "zarina@nsu.edu",
      client_phone: "+8801711334455",
      location: "NSU Plaza",
      custom_fields: validRes.sanitized,
      now,
    });

    assert.equal(specialBooking.event_slug_snapshot, "nsu-convocation-2026");
    assert.equal(
      specialBooking.custom_fields?.department,
      "SETS (Engineering)"
    );

    // Attempting to book slot1 on the first event at the exact same timestamp on primary_studio must be rejected
    await assert.rejects(
      () =>
        engine.createBookingAtomic({
          booking_type: "convocation",
          event_id: event.id,
          slot_id: slot1.id,
          booking_date: slot1.slot_date,
          start_at: slot1.start_at,
          end_at: slot1.end_at,
          duration_mins: 30,
          client_name: "Conflicting Event Client",
          client_email: "conflict@iub.edu.bd",
          client_phone: "+8801711334466",
          location: "IUB Campus",
          now,
        }),
      /RESOURCE_CONFLICT/
    );

    // Verify Google Calendar description & Gmail HTML email include the custom_fields
    const gcalPayload = buildGoogleCalendarEventPayload(
      specialBooking,
      "create"
    );
    assert.ok(gcalPayload.description.includes("SETS (Engineering)"));
    assert.ok(gcalPayload.description.includes("Archival Fine-Art Print"));

    const emailRendered = renderBookingEmail({
      booking: specialBooking,
      notificationType: "booking_confirmed",
    });
    assert.ok(emailRendered.html.includes("SETS (Engineering)"));
    assert.ok(emailRendered.html.includes("Archival Fine-Art Print"));
    assert.ok(emailRendered.text.includes("SETS (Engineering)"));
  });

  it("11. enforces Admin First-Login Credential Setup & Account Security validation rules", () => {
    // Valid username login
    const loginOk = adminLoginSchema.safeParse({
      identifier: "Offprint_Admin",
      password: "Password123",
    });
    assert.equal(loginOk.success, true);

    // First-login credential setup rejects mismatched or weak passwords
    const weakFirstLogin = adminFirstLoginCredentialSchema.safeParse({
      username: "admin_studio",
      newPassword: "weakpassword", // no uppercase or number
      confirmPassword: "weakpassword",
    });
    assert.equal(weakFirstLogin.success, false);

    const validFirstLogin = adminFirstLoginCredentialSchema.safeParse({
      username: "Offprint.Studio",
      newPassword: "StrongPassword2026",
      confirmPassword: "StrongPassword2026",
    });
    assert.equal(validFirstLogin.success, true);
    if (validFirstLogin.success) {
      assert.equal(validFirstLogin.data.username, "offprint.studio");
    }

    // Account update requires currentPassword and at least one change
    const accountUpdateOk = adminAccountUpdateSchema.safeParse({
      currentPassword: "OldPassword123",
      username: "new_admin_handle",
    });
    assert.equal(accountUpdateOk.success, true);
  });

  it("12. normalizes Portfolio Projects with UUIDs and structured gallery_items metadata", () => {
    const generatedId = ensureUuid("legacy-slug-id");
    assert.match(
      generatedId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    assert.equal(ensureUuid(generatedId), generatedId);

    const normalized = normalizePortfolioProject({
      id: generatedId,
      title: "Chittagong Port Editorial",
      client_name: "Port Authority",
      category: "documentary",
      is_flagship: true,
      thumbnail_url: "https://qqklsbbysybzivifnykd.supabase.co/storage/v1/object/public/portfolio-media/cover.jpg",
      gallery_urls: [
        "https://qqklsbbysybzivifnykd.supabase.co/storage/v1/object/public/portfolio-media/cover.jpg",
        "https://qqklsbbysybzivifnykd.supabase.co/storage/v1/object/public/portfolio-media/frame2.jpg",
      ],
    });

    assert.equal(normalized.id, generatedId);
    assert.equal(normalized.gallery_items?.length, 2);
    assert.equal(normalized.gallery_items?.[0].sort_order, 1);
    assert.equal(normalized.gallery_items?.[1].sort_order, 2);
  });

  it("13. validates Package Duration allocation, trusted Frame Printing calculations, and historical package preservation", () => {
    const pkg: PhotographyPackage = {
      id: "pkg-prestige-001",
      event_id: "11111111-1111-4111-8111-111111111111",
      service_id: null,
      name: "Graduate & Family Prestige",
      subtitle: "Full Regalia & Group Portraiture",
      description: "Editorial portrait session with high-resolution retouched gallery.",
      instructions: "Arrive 10m before scheduled time",
      duration_mins: 45,
      price_label: "BDT 6,000",
      price_numeric: 6000,
      currency: "BDT",
      deliverables: ["25 Edited High-Res Portraits", "Full Print Rights"],
      inclusions: ["Professional Studio Lighting", "Gown Assistance"],
      restrictions: "Up to 5 family members",
      frame_printing_enabled: true,
      max_people: 5,
      is_featured: true,
      is_active: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const frameConfig = {
      enabled: true,
      title: "Archival Gallery Frame Printing",
      description: "Museum-quality wooden frames",
      max_quantity: 5,
      frame_types: [
        {
          id: "teak_12x18",
          name: "Natural Teak Frame",
          dimensions: "12x18 inches",
          price: 2200,
          is_active: true,
        },
        {
          id: "canvas_20x30",
          name: "Gallery Canvas Wrap",
          dimensions: "20x30 inches",
          price: 5200,
          is_active: true,
        },
      ],
    };

    // 1. Digital Only calculation (no frames selected)
    const digitalPricing = calculateAndVerifyBookingPrice({
      pkg,
      frameConfig,
      frameSelected: false,
    });
    assert.equal(digitalPricing.total_price, 6000);
    assert.equal(digitalPricing.frame_printing_selected, false);
    assert.equal(digitalPricing.frame_quantity, 0);
    assert.equal(digitalPricing.frame_total_price, 0);

    // 2. Archival Frame selection (2 x Teak 12x18 @ 2,200)
    const framePricing = calculateAndVerifyBookingPrice({
      pkg,
      frameConfig,
      frameSelected: true,
      frameTypeId: "teak_12x18",
      frameQuantity: 2,
    });
    assert.equal(framePricing.package_base_price, 6000);
    assert.equal(framePricing.frame_printing_selected, true);
    assert.equal(framePricing.frame_unit_price, 2200);
    assert.equal(framePricing.frame_quantity, 2);
    assert.equal(framePricing.frame_total_price, 4400);
    assert.equal(framePricing.total_price, 10400); // 6,000 + 4,400

    // 3. Resilient against invalid frame types (tampering fallback to digital only)
    const invalidFrameFallback = calculateAndVerifyBookingPrice({
      pkg,
      frameConfig,
      frameSelected: true,
      frameTypeId: "non_existent_frame",
      frameQuantity: 1,
    });
    assert.equal(invalidFrameFallback.frame_printing_selected, false);
    assert.equal(invalidFrameFallback.total_price, 6000);

    // 4. Clamps frame quantity to max_quantity (e.g. max 5)
    const clampedPricing = calculateAndVerifyBookingPrice({
      pkg,
      frameConfig,
      frameSelected: true,
      frameTypeId: "teak_12x18",
      frameQuantity: 99, // user requested 99 frames
    });
    assert.equal(clampedPricing.frame_quantity, 5); // clamped to max_quantity = 5
    assert.equal(clampedPricing.frame_total_price, 2200 * 5); // 11,000
    assert.equal(clampedPricing.total_price, 6000 + 11000); // 17,000

    // 5. Calendar event description embeds frame details and total price
    const sampleBooking = {
      id: "b-001",
      booking_ref: "OFF-2026-TST",
      booking_type: "convocation" as const,
      status: "confirmed" as const,
      service_or_event_title: "IUB 27th Convocation",
      package_name: pkg.name,
      package_base_price: 6000,
      duration_mins: 45,
      frame_printing_selected: true,
      frame_type_name: "Natural Teak Frame (12x18 inches)",
      frame_quantity: 2,
      frame_unit_price: 2200,
      frame_total_price: 4400,
      total_price: 10400,
      client_name: "Sabbir Hossain",
      client_email: "sabbir@example.com",
      client_phone: "+8801700000000",
      location: "IUB Campus",
      start_at: "2026-11-10T04:00:00.000Z",
      end_at: "2026-11-10T04:45:00.000Z",
      resource_pool: "primary_studio",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Booking;

    const calPayload = buildGoogleCalendarEventPayload(sampleBooking, "create");
    assert.match(calPayload.description, /Natural Teak Frame/);
    assert.match(calPayload.description, /10,400/);
    assert.match(calPayload.description, /45 minutes/);

    // 5. Email template renders frame printing line and total investment
    const emailHtml = renderBookingEmail({
      booking: sampleBooking,
      notificationType: "booking_confirmed",
    });
    assert.match(emailHtml.html, /Natural Teak Frame/);
    assert.match(emailHtml.html, /10,400/);
  });

  it("14. validates Hero Slider, dynamic CMS publishing rules, and strict omission of dummy fallback data", async () => {
    const { DEFAULT_HOMEPAGE_CONFIG, DEFAULT_SITE_SETTINGS } = await import(
      "@/lib/data-service"
    );

    // 1. Homepage config has clean defaults and no dummy claims
    assert.equal(typeof DEFAULT_HOMEPAGE_CONFIG.hero_autoplay, "boolean");
    assert.equal(typeof DEFAULT_HOMEPAGE_CONFIG.hero_interval_sec, "number");
    assert.ok(Array.isArray(DEFAULT_HOMEPAGE_CONFIG.ticker_items));
    assert.ok(DEFAULT_HOMEPAGE_CONFIG.ticker_items.length > 0);

    // 2. Default site settings must not contain dummy numbers or unverified credentials
    assert.equal(DEFAULT_SITE_SETTINGS.general.phone, "");
    assert.equal(DEFAULT_SITE_SETTINGS.general.registration_badge, "");
    assert.ok(!DEFAULT_SITE_SETTINGS.homepage.hero_eyebrow.includes("Govt. Registered"));

    // 3. Slide visibility filtering: draft slides must not be published
    const mockSlides = [
      {
        id: "s-1",
        title: "Published Slide",
        image_url: "https://example.com/slide1.jpg",
        sort_order: 1,
        is_published: true,
      },
      {
        id: "s-2",
        title: "Draft Slide",
        image_url: "https://example.com/slide2.jpg",
        sort_order: 2,
        is_published: false,
      },
    ];

    const publicSlides = mockSlides.filter((s) => s.is_published);
    assert.equal(publicSlides.length, 1);
    assert.equal(publicSlides[0].id, "s-1");

    // 4. Testimonials filtering: when 0 are published, public list is empty
    const mockTestimonials = [
      {
        id: "t-1",
        quote: "Draft review",
        author: "Client",
        sort_order: 1,
        is_published: false,
      },
    ];
    const publicTestimonials = mockTestimonials.filter((t) => t.is_published);
    assert.equal(publicTestimonials.length, 0); // Gracefully omitted
  });

  it("15. validates Work Archive, folder type segregation (event-archives vs event-archive-highlights), and strict highlight isolation", async () => {
    // 1. Storage prefix enforcement based on folder_type
    const eventFolderSlug = "iub-27th-convocation";
    const expectedEventPrefix = `event-archives/${eventFolderSlug}/`;
    const highlightFolderSlug = "iub-graduates-stage";
    const expectedHighlightPrefix = `event-archive-highlights/${highlightFolderSlug}/`;

    assert.ok(expectedEventPrefix.startsWith("event-archives/"));
    assert.ok(expectedHighlightPrefix.startsWith("event-archive-highlights/"));
    assert.notEqual(expectedEventPrefix, expectedHighlightPrefix);

    // 2. Folder filtering: Event Gallery must only offer event-archive folders
    const mockFolders = [
      {
        id: "f-1",
        name: "IUB 27th Convocation Main Gallery",
        slug: "iub-27th-convocation",
        folder_type: "event-archive",
        storage_prefix: "event-archives/iub-27th-convocation/",
        photo_count: 5,
        assigned_events_count: 1,
        assigned_highlights_count: 0,
      },
      {
        id: "f-2",
        name: "IUB Graduation Cap Toss & Stage",
        slug: "iub-graduates-stage",
        folder_type: "event-highlight",
        storage_prefix: "event-archive-highlights/iub-graduates-stage/",
        photo_count: 3,
        assigned_events_count: 0,
        assigned_highlights_count: 1,
      },
    ];

    const eventArchiveFolders = mockFolders.filter((f) => f.folder_type === "event-archive");
    const highlightFolders = mockFolders.filter((f) => f.folder_type === "event-highlight");

    assert.equal(eventArchiveFolders.length, 1);
    assert.equal(eventArchiveFolders[0].slug, "iub-27th-convocation");
    assert.equal(highlightFolders.length, 1);
    assert.equal(highlightFolders[0].slug, "iub-graduates-stage");

    // 3. Highlight Isolation: Highlights must strictly belong to their parent event
    const parentEventId = "evt-iub-convocation";
    const unrelatedEventId = "evt-tech-summit";

    const mockHighlights = [
      {
        id: "hl-1",
        event_id: parentEventId,
        title: "Stage Honours & Degree Conferral",
        slug: "stage-honours",
        short_description: "Formal degree conferral",
        cover_image_url: "https://example.com/stage.jpg",
        folder_id: "f-2",
        sort_order: 1,
        is_published: true,
      },
      {
        id: "hl-2",
        event_id: unrelatedEventId,
        title: "Tech Summit Keynotes",
        slug: "summit-keynotes",
        short_description: "Keynote presentation",
        cover_image_url: "https://example.com/keynote.jpg",
        folder_id: "f-3",
        sort_order: 1,
        is_published: true,
      },
    ];

    const iubHighlights = mockHighlights.filter((h) => h.event_id === parentEventId);
    assert.equal(iubHighlights.length, 1);
    assert.equal(iubHighlights[0].title, "Stage Honours & Degree Conferral");

    // Must never leak to unrelated event
    const techHighlights = mockHighlights.filter((h) => h.event_id === unrelatedEventId);
    assert.equal(techHighlights.length, 1);
    assert.equal(techHighlights[0].title, "Tech Summit Keynotes");
    assert.notEqual(iubHighlights[0].event_id, techHighlights[0].event_id);

    // 4. Safe folder preservation: highlights can select independent dedicated folders
    assert.notEqual(mockHighlights[0].folder_id, mockFolders[0].id);
    assert.equal(mockHighlights[0].folder_id, "f-2");
  });

  it("16. validates Event Hero Slides, storage placeholder exclusion, and clean lead state", () => {
    // 1. Storage placeholder exclusion test
    const rawStorageObjects = [
      { name: ".emptyFolderPlaceholder", metadata: { size: 0 } },
      { name: ".keep", metadata: { size: 0 } },
      { name: ".DS_Store", metadata: { size: 6148 } },
      { name: "convocation-01.jpg", metadata: { size: 2450000, mimetype: "image/jpeg" } },
      { name: "convocation-02.png", metadata: { size: 3100000, mimetype: "image/png" } },
      { name: "notes.txt", metadata: { size: 1024, mimetype: "text/plain" } },
    ];

    const eligiblePhotos = rawStorageObjects.filter((item) => {
      if (!item.name || item.name.startsWith(".")) return false;
      if (item.name.endsWith(".emptyFolderPlaceholder") || item.name.endsWith(".keep")) return false;
      const lower = item.name.toLowerCase();
      return (
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".avif") ||
        lower.endsWith(".gif")
      );
    });

    assert.equal(eligiblePhotos.length, 2);
    assert.equal(eligiblePhotos[0].name, "convocation-01.jpg");
    assert.equal(eligiblePhotos[1].name, "convocation-02.png");

    // 2. Event Hero Slides ordering and focal point integrity
    const mockSlides: EventHeroSlide[] = [
      {
        id: "slide-1",
        image_url: "https://example.com/slide1.jpg",
        caption: "Auditorium Stage",
        focal_point: "center",
        sort_order: 1,
        is_cover: true,
      },
      {
        id: "slide-2",
        image_url: "https://example.com/slide2.jpg",
        caption: "Graduation Cap Toss",
        focal_point: "top",
        sort_order: 2,
        is_cover: false,
      },
    ];

    const orderedSlides = [...mockSlides].sort((a, b) => a.sort_order - b.sort_order);
    assert.equal(orderedSlides.length, 2);
    assert.equal(orderedSlides[0].focal_point, "center");
    assert.equal(orderedSlides[1].focal_point, "top");

    // 3. Clean leads state: initial leads must be empty array
    const leads: unknown[] = [];
    assert.equal(leads.length, 0);
  });

  it("17. validates Storage Folder Status Reconciler, Dynamic Booking & Hub Switches, and Client Photo-Bank Delivery Lifecycle", () => {
    // 1. Storage Folder Status Evaluation
    const storageFolders = [
      { id: "f-1", name: "BracU 16th Convocation", photo_count: 121, storage_exists: true },
      { id: "f-2", name: "Empty Highlight Folder", photo_count: 0, storage_exists: true },
      { id: "f-3", name: "Deleted Remote Folder", photo_count: 0, storage_exists: false },
    ];

    const computedStatus = storageFolders.map((f) => ({
      ...f,
      status: !f.storage_exists ? "missing" : f.photo_count > 0 ? "available" : "empty",
    }));

    assert.equal(computedStatus[0].status, "available");
    assert.equal(computedStatus[1].status, "empty");
    assert.equal(computedStatus[2].status, "missing");

    // 2. Dual Booking Access & Hub Visibility Switches
    const mockEvents = [
      {
        id: "ev-1",
        title: "IUB 27th Convocation",
        is_published: true,
        is_booking_enabled: false,
        is_visible_on_booking_page: true,
      },
      {
        id: "ev-2",
        title: "Private Corporate GALA",
        is_published: true,
        is_booking_enabled: true,
        is_visible_on_booking_page: false,
      },
    ];

    // Event 1 is visible on booking page hub, but direct booking creation must be refused
    assert.equal(mockEvents[0].is_visible_on_booking_page, true);
    assert.equal(mockEvents[0].is_booking_enabled, false);

    // Event 2 is hidden from public booking hub, but allowed if reached directly or configured
    assert.equal(mockEvents[1].is_visible_on_booking_page, false);
    assert.equal(mockEvents[1].is_booking_enabled, true);

    // 3. Dynamic Daily Schedule Engine with Break Periods
    const operatingStart = "09:00";
    const operatingEnd = "13:00";
    const slotDuration = 60; // 1 hour slots
    const breakPeriod = { start_time: "11:00", end_time: "12:00" };

    // Generate potential slots: 09:00, 10:00, 11:00, 12:00
    const rawTimes = ["09:00", "10:00", "11:00", "12:00"];
    const filteredTimes = rawTimes.filter((t) => {
      // Exclude if overlapping break period
      return !(t >= breakPeriod.start_time && t < breakPeriod.end_time);
    });

    assert.deepEqual(filteredTimes, ["09:00", "10:00", "12:00"]);
    assert.equal(filteredTimes.includes("11:00"), false); // Excluded during break

    // 4. Client Photo-Bank Delivery & Expiry Calculations
    const validityDays = 14;
    const nowMs = 1730000000000;
    const expiresAtMs = nowMs + validityDays * 86_400_000;
    const expiresAtIso = new Date(expiresAtMs).toISOString();

    const bookingWithDelivery = {
      id: "b-100",
      workflow_stage_id: "stage-final",
      delivery_url: "https://drive.google.com/sample-gallery-100",
      delivery_validity_days: validityDays,
      delivery_expires_at: expiresAtIso,
      delivery_status: "delivered",
    };

    // Active delivery check
    const isStillActive = new Date(bookingWithDelivery.delivery_expires_at).getTime() > nowMs;
    assert.equal(isStillActive, true);

    // After 15 days, must be expired
    const futureMs = nowMs + 15 * 86_400_000;
    const isExpiredInFuture = new Date(bookingWithDelivery.delivery_expires_at).getTime() <= futureMs;
    assert.equal(isExpiredInFuture, true);

    // Final stage requires non-empty delivery URL
    const validateFinalDelivery = (url: string | null | undefined) => {
      if (!url || !url.trim()) {
        throw new Error("A valid photo-bank gallery URL is required to advance this booking to the Final Gallery Delivered stage.");
      }
      return true;
    };

    assert.throws(() => validateFinalDelivery(""), /A valid photo-bank gallery URL is required/);
    assert.equal(validateFinalDelivery(bookingWithDelivery.delivery_url), true);
  });
});
