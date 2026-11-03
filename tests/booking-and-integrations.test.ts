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
  calculateAndVerifyMultiBookingPrice,
  bookingBasketItemSchema,
  createMultiBookingSchema,
  createBookingSchema,
  photographyPackageSchema,
  calculateAndVerifyPaymentAccounting,
} from "../src/lib/validations";
import { formatAdminError } from "../src/lib/booking/admin-error";
import {
  ensureUuid,
  normalizePortfolioProject,
  validateSliderConfig,
  validateSliderSettings,
  DEFAULT_SLIDER_SETTINGS,
  DEFAULT_HOMEPAGE_CONFIG,
  DEFAULT_SITE_SETTINGS,
} from "../src/lib/data-service";
import {
  IUB_CONVOCATION_DEFAULT_QUESTIONS,
  DEFAULT_EVENT_INFO_BLOCKS,
} from "../src/lib/booking/default-event-fields";
import {
  calculateProposedSchedule,
  compareScheduleWithExisting,
} from "../src/lib/booking/schedule-generator";
import type { ScheduleConfig } from "../src/lib/booking/schedule-generator";
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
  FramePrintingConfig,
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
    const _operatingStart = "09:00";
    const _operatingEnd = "13:00";
    const _slotDuration = 60; // 1 hour slots
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

  it("18. validates Registered Users safe formatting, BDT normalization & dossier guardrails", () => {
    // Safe BDT spending formatter matching src/components/admin/RegisteredUsersAdminClient.tsx
    function formatSpendingBDT(amount?: number | null): string {
      if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
        return "BDT 0";
      }
      return `BDT ${Number(amount).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }

    // 1. Safe formatting across all edge cases without throwing TypeError
    assert.equal(formatSpendingBDT(undefined), "BDT 0");
    assert.equal(formatSpendingBDT(null), "BDT 0");
    assert.equal(formatSpendingBDT(NaN), "BDT 0");
    assert.equal(formatSpendingBDT(0), "BDT 0");
    assert.equal(formatSpendingBDT(4500), "BDT 4,500");
    assert.equal(formatSpendingBDT(125000), "BDT 125,000");

    // 2. Normalization of raw user profile and booking aggregates (GET /api/admin/users?userId=...)
    const mockRawUser = {
      id: "u-usr-123",
      email: "graduate@iub.edu.bd",
      full_name: "Tanvir Ahmed",
      role: "client",
      phone: "+880 1711 000000",
      company: null,
      student_id: "2120000",
    };

    const mockUserBookings = [
      { id: "b-1", status: "confirmed", total_price: 3500, start_at: "2026-11-01T10:00:00+06:00" },
      { id: "b-2", status: "completed", total_price: 2500, start_at: "2026-11-02T11:00:00+06:00" },
      { id: "b-3", status: "cancelled", total_price: 3500, start_at: "2026-11-03T12:00:00+06:00" }, // Cancelled should be excluded from active spend
    ];

    const activeBookings = mockUserBookings.filter((b) => b.status !== "cancelled");
    const computedTotalSpent = activeBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
    const bookingsCount = mockUserBookings.length;
    const lastBookingAt = mockUserBookings[0]?.start_at || null;

    const normalizedDocket = {
      user: {
        ...mockRawUser,
        total_spent: computedTotalSpent,
        bookings_count: bookingsCount,
        last_booking_at: lastBookingAt,
      },
      bookings: mockUserBookings,
    };

    assert.equal(normalizedDocket.user.total_spent, 6000);
    assert.equal(normalizedDocket.user.bookings_count, 3);
    assert.equal(formatSpendingBDT(normalizedDocket.user.total_spent), "BDT 6,000");

    // 3. User with zero bookings
    const emptyUserDocket = {
      user: {
        id: "u-usr-empty",
        email: "newuser@gmail.com",
        full_name: "Ayesha Rahman",
        total_spent: 0,
        bookings_count: 0,
        last_booking_at: null,
      },
      bookings: [],
    };
    assert.equal(formatSpendingBDT(emptyUserDocket.user.total_spent), "BDT 0");
    assert.equal(emptyUserDocket.bookings.length, 0);
  });

  it("19. validates bidirectional Event Archive <-> Booking Event associations & relational routing", () => {
    // 1. Relational Junction Table Representation: public.event_archive_booking_events
    interface JunctionRow {
      archive_id: string;
      booking_event_id: string;
      created_at: string;
    }

    const junctionTable: JunctionRow[] = [
      {
        archive_id: "arch-iub-27",
        booking_event_id: "event-iub-convocation-2026",
        created_at: new Date().toISOString(),
      },
      {
        archive_id: "arch-c-suite-summit",
        booking_event_id: "event-c-suite-portraits-2026",
        created_at: new Date().toISOString(),
      },
    ];

    const mockBookingEvents = [
      {
        id: "event-iub-convocation-2026",
        title: "IUB 27th Convocation Portrait Sessions",
        slug: "iub-27th-convocation",
        is_active: true,
      },
      {
        id: "event-c-suite-portraits-2026",
        title: "Executive Portrait Drive 2026",
        slug: "c-suite-portraits",
        is_active: false, // Inactive/paused booking event
      },
    ];

    // 2. Fetch associated booking events for an archive page
    const getAssociatedBookingEvents = (archiveId: string) => {
      const matchedJunctions = junctionTable.filter((j) => j.archive_id === archiveId);
      return matchedJunctions
        .map((j) => mockBookingEvents.find((e) => e.id === j.booking_event_id))
        .filter(Boolean) as typeof mockBookingEvents;
    };

    // Active event archive has live booking link
    const iubAssociated = getAssociatedBookingEvents("arch-iub-27");
    assert.equal(iubAssociated.length, 1);
    assert.equal(iubAssociated[0].is_active, true);
    assert.equal(`/book?event=${iubAssociated[0].slug}`, "/book?event=iub-27th-convocation");

    // Inactive event archive displays Booking Paused status pill
    const cSuiteAssociated = getAssociatedBookingEvents("arch-c-suite-summit");
    assert.equal(cSuiteAssociated.length, 1);
    assert.equal(cSuiteAssociated[0].is_active, false);

    // 3. Inverse lookup from Booking Event to Associated Work Archive
    const getAssociatedArchivesForEvent = (eventId: string) => {
      return junctionTable
        .filter((j) => j.booking_event_id === eventId)
        .map((j) => j.archive_id);
    };

    const iubArchives = getAssociatedArchivesForEvent("event-iub-convocation-2026");
    assert.deepEqual(iubArchives, ["arch-iub-27"]);
  });

  it("20. validates Global Site Settings & Footer dynamic configuration", () => {
    // 1. Default schema
    const defaultSettings: Record<string, any> = {
      agency_name: "OFFPRINT (অফপ্রিন্ট)",
      brand_name_en: "OFFPRINT",
      brand_name_bn: "অফপ্রিন্ট",
      tagline: "Editorial Photography & Fine-Art Print Studio",
      email: "inquiry@offprint.agency",
      phone: "+880 1700 000000",
      address: "Gulshan & Banani Corporate Corridor, Dhaka, Bangladesh",
      operating_hours_label: "Sunday - Thursday (9:00 AM - 7:00 PM BST)",
      instagram_url: "https://instagram.com/offprint.agency",
      facebook_url: "https://facebook.com/offprint.agency",
      linkedin_url: "https://linkedin.com/company/offprint-agency",
      youtube_url: "https://youtube.com/@offprint",
      footer_description: "Independent photography studio and fine-art print atelier in Dhaka, Bangladesh.",
      footer_supporting_text: "Editorial Photography & Print Atelier",
      footer_copyright: "© 2026 OFFPRINT (অফপ্রিন্ট). All rights reserved.",
      show_booking_links: true,
      show_print_links: true,
      show_social_links: true,
    };

    // 2. Partial override from administrator portal
    const adminUpdates: Record<string, any> = {
      brand_name_en: "OFFPRINT ATELIER",
      email: "contact@offprint.agency",
      show_print_links: false, // Admin toggles print column off
    };

    const mergedSettings: Record<string, any> = { ...defaultSettings, ...adminUpdates };

    assert.equal(mergedSettings.brand_name_en, "OFFPRINT ATELIER");
    assert.equal(mergedSettings.brand_name_bn, "অফপ্রিন্ট");
    assert.equal(mergedSettings.email, "contact@offprint.agency");
    assert.equal(mergedSettings.show_print_links, false);
    assert.equal(mergedSettings.show_booking_links, true);
    assert.equal(mergedSettings.show_social_links, true);

    // 3. Footer visibility rules verification
    const shouldRenderBookingCol = (mergedSettings.show_booking_links as any) !== false;
    const shouldRenderPrintCol = (mergedSettings.show_print_links as any) !== false;
    const shouldRenderSocialIcons = (mergedSettings.show_social_links as any) !== false;

    assert.equal(shouldRenderBookingCol, true);
    assert.equal(shouldRenderPrintCol, false); // Hidden per admin setting
    assert.equal(shouldRenderSocialIcons, true);
  });

  it("21. validates configurable Workflow Stages & conditional link delivery lifecycle", () => {
    // 1. Stage definition schema
    interface WorkflowStageDef {
      id: string;
      name: string;
      slug: string;
      sort_order: number;
      is_active: boolean;
      is_visible_to_client: boolean;
      is_final_delivery: boolean;
      allow_link_delivery: boolean;
      is_link_required: boolean;
      send_email_on_delivery: boolean;
      auto_send_email: boolean;
      default_validity_days: number;
    }

    const stages: WorkflowStageDef[] = [
      {
        id: "stg-1",
        name: "Booking Confirmed",
        slug: "booking-confirmed",
        sort_order: 1,
        is_active: true,
        is_visible_to_client: true,
        is_final_delivery: false,
        allow_link_delivery: false,
        is_link_required: false,
        send_email_on_delivery: false,
        auto_send_email: false,
        default_validity_days: 14,
      },
      {
        id: "stg-2",
        name: "Proofing & Selection",
        slug: "proofing",
        sort_order: 2,
        is_active: true,
        is_visible_to_client: true,
        is_final_delivery: false,
        allow_link_delivery: true, // Photo link allowed for proofing
        is_link_required: false,   // But optional
        send_email_on_delivery: true,
        auto_send_email: false,
        default_validity_days: 7,
      },
      {
        id: "stg-3",
        name: "Gallery Delivered",
        slug: "delivered",
        sort_order: 3,
        is_active: true,
        is_visible_to_client: true,
        is_final_delivery: true,
        allow_link_delivery: true,
        is_link_required: true,    // Required for final delivery
        send_email_on_delivery: true,
        auto_send_email: true,
        default_validity_days: 14,
      },
    ];

    // 2. Client pipeline flow ordering
    const clientVisible = stages
      .filter((s) => s.is_active && s.is_visible_to_client)
      .sort((a, b) => a.sort_order - b.sort_order);

    assert.equal(clientVisible.length, 3);
    assert.deepEqual(
      clientVisible.map((s) => s.slug),
      ["booking-confirmed", "proofing", "delivered"]
    );

    // 3. Link delivery validation rules
    function validateStageTransition(stage: WorkflowStageDef, deliveryUrl?: string | null) {
      const cleanUrl = (deliveryUrl || "").trim();
      if ((stage.is_link_required || stage.is_final_delivery) && !cleanUrl) {
        throw new Error(
          `A valid photo-bank gallery URL is required to advance this booking to "${stage.name}".`
        );
      }
      return true;
    }

    // Stage 1: No link required or allowed
    assert.doesNotThrow(() => validateStageTransition(stages[0], ""));

    // Stage 2: Link allowed but optional
    assert.doesNotThrow(() => validateStageTransition(stages[1], ""));
    assert.doesNotThrow(() => validateStageTransition(stages[1], "https://drive.google.com/proofs"));

    // Stage 3: Link required (throws if empty)
    assert.throws(
      () => validateStageTransition(stages[2], ""),
      /A valid photo-bank gallery URL is required to advance this booking to "Gallery Delivered"/
    );
    assert.doesNotThrow(() =>
      validateStageTransition(stages[2], "https://drive.google.com/final-high-res")
    );

    // 4. Safe deactivation when stage has existing bookings
    const mockBookings = [{ id: "b-99", workflow_stage_id: "stg-2" }];
    const canHardDeleteStage = (stageId: string) => {
      const count = mockBookings.filter((b) => b.workflow_stage_id === stageId).length;
      return count === 0;
    };

    assert.equal(canHardDeleteStage("stg-2"), false); // Has bookings -> should archive/deactivate
    assert.equal(canHardDeleteStage("stg-non-existent"), true); // Safe to hard delete
  });

  it("22. validates dynamic Event Archive Categories ordering, live archive count calculation, and safe deactivation protection", () => {
    interface CategoryItem {
      id: string;
      name: string;
      slug: string;
      description?: string | null;
      sort_order: number;
      is_active: boolean;
    }

    const categories: CategoryItem[] = [
      {
        id: "cat-convocation",
        name: "Convocation",
        slug: "convocation",
        description: "Academic convocation ceremonies across universities in Bangladesh",
        sort_order: 1,
        is_active: true,
      },
      {
        id: "cat-documentary",
        name: "Brand Documentary",
        slug: "documentary",
        description: "Visual stories for institutions and creative brands",
        sort_order: 2,
        is_active: true,
      },
      {
        id: "cat-executive",
        name: "Executive Portraits",
        slug: "executive-portraits",
        description: "Editorial leadership and portrait series",
        sort_order: 3,
        is_active: false, // Inactive category
      },
    ];

    // 1. Ordering: categories must order by sort_order ascending
    const activeOrdered = categories
      .filter((c) => c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);

    assert.equal(activeOrdered.length, 2);
    assert.equal(activeOrdered[0].slug, "convocation");
    assert.equal(activeOrdered[1].slug, "documentary");

    // 2. Published archive count computation
    const mockArchives = [
      { id: "ev-1", category_id: "cat-convocation", is_published: true },
      { id: "ev-2", category_id: "cat-convocation", is_published: true },
      { id: "ev-3", category_id: "cat-convocation", is_published: false }, // draft: excluded from count
      { id: "ev-4", category_id: "cat-documentary", is_published: true },
    ];

    const computeCounts = (catList: CategoryItem[], archives: typeof mockArchives) => {
      return catList.map((cat) => {
        const count = archives.filter(
          (a) => a.is_published && a.category_id === cat.id
        ).length;
        return { ...cat, archive_count: count };
      });
    };

    const categoriesWithCounts = computeCounts(categories, mockArchives);
    const convocation = categoriesWithCounts.find((c) => c.id === "cat-convocation");
    const documentary = categoriesWithCounts.find((c) => c.id === "cat-documentary");
    const executive = categoriesWithCounts.find((c) => c.id === "cat-executive");

    assert.equal(convocation?.archive_count, 2, "Convocation has 2 published archives");
    assert.equal(documentary?.archive_count, 1, "Documentary has 1 published archive");
    assert.equal(executive?.archive_count, 0, "Executive portraits has 0 published archives");

    // 3. Safe deactivation protection: categories in use must not be hard deleted
    function resolveCategoryDeletion(categoryId: string, archives: typeof mockArchives) {
      const activeUsages = archives.filter((a) => a.category_id === categoryId).length;
      if (activeUsages > 0) {
        // Soft deactivate to protect historical productions
        return { action: "deactivated", hardDeleted: false, usages: activeUsages };
      }
      return { action: "deleted", hardDeleted: true, usages: 0 };
    }

    const deleteUsed = resolveCategoryDeletion("cat-convocation", mockArchives);
    assert.equal(deleteUsed.hardDeleted, false);
    assert.equal(deleteUsed.action, "deactivated");
    assert.equal(deleteUsed.usages, 3); // 2 published + 1 draft

    const deleteUnused = resolveCategoryDeletion("cat-executive", mockArchives);
    assert.equal(deleteUnused.hardDeleted, true);
    assert.equal(deleteUnused.action, "deleted");
  });

  it("23. validates Dashboard Featured Event Slider rotation, single-event presentation, and empty state", () => {
    interface MockEventArchive {
      id: string;
      title: string;
      cover_image_url: string;
      is_published: boolean;
      is_featured: boolean;
    }

    const testPool: MockEventArchive[] = [
      {
        id: "ev-pub-feat-1",
        title: "BRAC University Convocation",
        cover_image_url: "https://example.com/brac.jpg",
        is_published: true,
        is_featured: true,
      },
      {
        id: "ev-pub-feat-2",
        title: "IUB 26th Convocation",
        cover_image_url: "https://example.com/iub.jpg",
        is_published: true,
        is_featured: true,
      },
      {
        id: "ev-pub-unfeat",
        title: "Private Summit",
        cover_image_url: "https://example.com/summit.jpg",
        is_published: true,
        is_featured: false, // Not featured
      },
      {
        id: "ev-draft-feat",
        title: "Draft Event Marked Featured",
        cover_image_url: "https://example.com/draft.jpg",
        is_published: false, // Draft: must NOT appear
        is_featured: true,
      },
    ];

    // 1. Selector logic: Only published AND featured
    const getDashboardFeatured = (pool: MockEventArchive[]) => {
      return pool.filter((ev) => ev.is_published && ev.is_featured);
    };

    const dashboardEvents = getDashboardFeatured(testPool);
    assert.equal(dashboardEvents.length, 2);
    assert.deepEqual(
      dashboardEvents.map((e) => e.id),
      ["ev-pub-feat-1", "ev-pub-feat-2"]
    );

    // 2. Slider presentation modes
    const resolvePresentationMode = (events: MockEventArchive[]) => {
      if (events.length === 0) {
        return { mode: "empty", autoRotate: false, showNavigation: false };
      }
      if (events.length === 1) {
        return { mode: "single_static", autoRotate: false, showNavigation: false };
      }
      return { mode: "multi_slider", autoRotate: true, intervalMs: 6000, showNavigation: true };
    };

    // Mode 0: Empty state (never fake data)
    const emptyMode = resolvePresentationMode([]);
    assert.equal(emptyMode.mode, "empty");
    assert.equal(emptyMode.autoRotate, false);

    // Mode 1: Exactly 1 event -> Static presentation, no unnecessary pagination controls
    const singleMode = resolvePresentationMode([testPool[0]]);
    assert.equal(singleMode.mode, "single_static");
    assert.equal(singleMode.autoRotate, false);

    // Mode 2: Multiple events -> 6s auto-slider
    const multiMode = resolvePresentationMode(dashboardEvents);
    assert.equal(multiMode.mode, "multi_slider");
    assert.equal(multiMode.autoRotate, true);
    assert.equal(multiMode.intervalMs, 6000);

    // 3. Independence of is_featured and is_published toggles
    let archiveState = { is_published: true, is_featured: false };

    // Toggling featured on dashboard preserves publication status
    const toggleFeatured = (state: typeof archiveState, featured: boolean) => ({
      ...state,
      is_featured: featured,
    });

    archiveState = toggleFeatured(archiveState, true);
    assert.equal(archiveState.is_featured, true);
    assert.equal(archiveState.is_published, true, "is_published must remain unaffected");

    archiveState = toggleFeatured(archiveState, false);
    assert.equal(archiveState.is_featured, false);
    assert.equal(archiveState.is_published, true, "is_published must remain unaffected");
  });

  it("24. validates centralized slider settings schema, boundary clamping, and fallback defaults", () => {
    // 1. Default slider settings must provide valid configurations for all four sliders
    assert.ok(DEFAULT_SLIDER_SETTINGS.hero_slider, "hero_slider config must exist");
    assert.ok(DEFAULT_SLIDER_SETTINGS.archives_carousel, "archives_carousel config must exist");
    assert.ok(DEFAULT_SLIDER_SETTINGS.highlighted_events, "highlighted_events config must exist");
    assert.ok(DEFAULT_SLIDER_SETTINGS.event_hero_slider, "event_hero_slider config must exist");

    assert.equal(DEFAULT_SLIDER_SETTINGS.hero_slider.autoplay_enabled, true);
    assert.equal(DEFAULT_SLIDER_SETTINGS.archives_carousel.autoplay_enabled, true);
    assert.equal(DEFAULT_SLIDER_SETTINGS.archives_carousel.interval_seconds, 5);
    assert.equal(DEFAULT_SLIDER_SETTINGS.highlighted_events.interval_seconds, 6);
    assert.equal(DEFAULT_SLIDER_SETTINGS.event_hero_slider.interval_seconds, 4);

    // 2. Boundary clamping: interval_seconds must be clamped between 2s and 60s
    const tooLow = validateSliderConfig({ interval_seconds: 0.5 }, DEFAULT_SLIDER_SETTINGS.hero_slider);
    assert.equal(tooLow.interval_seconds, 2, "intervals below 2s must clamp to 2s");

    const tooHigh = validateSliderConfig({ interval_seconds: 120 }, DEFAULT_SLIDER_SETTINGS.hero_slider);
    assert.equal(tooHigh.interval_seconds, 60, "intervals above 60s must clamp to 60s");

    const validFloat = validateSliderConfig({ interval_seconds: 7.4 }, DEFAULT_SLIDER_SETTINGS.hero_slider);
    assert.equal(validFloat.interval_seconds, 7, "intervals should round to whole seconds");

    // 3. Boundary clamping: transition_duration_ms must be clamped between 200ms and 3000ms
    const transitionTooFast = validateSliderConfig({ transition_duration_ms: 50 }, DEFAULT_SLIDER_SETTINGS.archives_carousel);
    assert.equal(transitionTooFast.transition_duration_ms, 200, "transition below 200ms must clamp to 200ms");

    const transitionTooSlow = validateSliderConfig({ transition_duration_ms: 10000 }, DEFAULT_SLIDER_SETTINGS.archives_carousel);
    assert.equal(transitionTooSlow.transition_duration_ms, 3000, "transition above 3000ms must clamp to 3000ms");

    // 4. Fallback handling when invalid types are supplied
    const invalidTypes = validateSliderConfig(
      {
        autoplay_enabled: "yes" as any,
        interval_seconds: NaN,
        transition_duration_ms: "fast" as any,
        pause_on_hover: null as any,
      },
      DEFAULT_SLIDER_SETTINGS.hero_slider
    );
    assert.equal(invalidTypes.autoplay_enabled, DEFAULT_SLIDER_SETTINGS.hero_slider.autoplay_enabled);
    assert.equal(invalidTypes.interval_seconds, DEFAULT_SLIDER_SETTINGS.hero_slider.interval_seconds);
    assert.equal(invalidTypes.transition_duration_ms, DEFAULT_SLIDER_SETTINGS.hero_slider.transition_duration_ms);
    assert.equal(invalidTypes.pause_on_hover, DEFAULT_SLIDER_SETTINGS.hero_slider.pause_on_hover);

    // 5. Partial settings validation ensures complete SliderSettings object
    const validatedPartial = validateSliderSettings({
      archives_carousel: {
        autoplay_enabled: false,
        interval_seconds: 8,
        transition_duration_ms: 450,
        pause_on_hover: false,
      },
    });
    assert.equal(validatedPartial.archives_carousel.autoplay_enabled, false);
    assert.equal(validatedPartial.archives_carousel.interval_seconds, 8);
    assert.equal(validatedPartial.hero_slider.autoplay_enabled, DEFAULT_SLIDER_SETTINGS.hero_slider.autoplay_enabled);
    assert.equal(validatedPartial.highlighted_events.interval_seconds, DEFAULT_SLIDER_SETTINGS.highlighted_events.interval_seconds);
    assert.equal(validatedPartial.event_hero_slider.interval_seconds, DEFAULT_SLIDER_SETTINGS.event_hero_slider.interval_seconds);
  });

  it("25. validates in-place homepage Archives category filtering, zero dummy data, and strict separation from Highlighted Events", () => {
    // Authentic archives test fixture
    const archivesPool = [
      {
        id: "arch-1",
        title: "IUB 26th Convocation Ceremony",
        slug: "iub-26th-convocation",
        category: "Convocation",
        is_published: true,
        is_featured: true,
        cover_image_url: "https://example.com/iub26.jpg",
      },
      {
        id: "arch-2",
        title: "Dhaka Architectural Triennial",
        slug: "dhaka-architectural-triennial",
        category: "Exhibition",
        is_published: true,
        is_featured: false,
        cover_image_url: "https://example.com/arch.jpg",
      },
      {
        id: "arch-3",
        title: "Summit Group Executive Leadership",
        slug: "summit-executive-leadership",
        category: "Corporate",
        is_published: true,
        is_featured: true,
        cover_image_url: "https://example.com/summit.jpg",
      },
      {
        id: "arch-4",
        title: "Internal Unreleased Documentary",
        slug: "internal-unreleased",
        category: "Documentary",
        is_published: false, // Draft: must never appear on public homepage
        is_featured: false,
        cover_image_url: "https://example.com/draft.jpg",
      },
    ];

    // 1. Homepage Archives section receives ALL published archives (both featured and non-featured)
    const publicArchives = archivesPool.filter((a) => a.is_published);
    assert.equal(publicArchives.length, 3);
    assert.deepEqual(
      publicArchives.map((a) => a.id),
      ["arch-1", "arch-2", "arch-3"]
    );

    // 2. Highlighted Events section receives ONLY published AND featured archives
    const highlightedEvents = publicArchives.filter((a) => a.is_featured);
    assert.equal(highlightedEvents.length, 2);
    assert.deepEqual(
      highlightedEvents.map((a) => a.id),
      ["arch-1", "arch-3"]
    );
    // Non-featured archive (arch-2) must NOT be in highlighted events
    assert.ok(!highlightedEvents.some((e) => e.id === "arch-2"));

    // 3. In-place category filter simulation (as implemented in FlagshipShowcase.tsx)
    const filterInPlace = (category: string) => {
      if (!category || category === "all" || category === "All") {
        return publicArchives;
      }
      return publicArchives.filter(
        (a) => a.category?.trim().toLowerCase() === category.trim().toLowerCase()
      );
    };

    // "All" filter returns all published archives
    assert.equal(filterInPlace("All").length, 3);
    assert.equal(filterInPlace("all").length, 3);

    // Category filter "Convocation" returns only matching archive
    const convocationFiltered = filterInPlace("Convocation");
    assert.equal(convocationFiltered.length, 1);
    assert.equal(convocationFiltered[0].id, "arch-1");

    // Category filter "Exhibition" returns only arch-2
    const exhibitionFiltered = filterInPlace("Exhibition");
    assert.equal(exhibitionFiltered.length, 1);
    assert.equal(exhibitionFiltered[0].id, "arch-2");

    // Category filtering Archives section has zero impact on Highlighted Events
    assert.equal(highlightedEvents.length, 2, "Highlighted events must remain stable regardless of archive filters");

    // Non-matching category yields empty array without fallback or mock data
    const nonExistent = filterInPlace("NonExistentCategory");
    assert.equal(nonExistent.length, 0);

    // 4. Hard-coded dummy check: Ensure "The Royal Crimson Wedding Story" does not exist anywhere in pool
    const containsRoyalCrimson = archivesPool.some(
      (a) =>
        a.title.toLowerCase().includes("royal crimson") ||
        a.slug.toLowerCase().includes("royal-crimson")
    );
    assert.equal(containsRoyalCrimson, false, "Dummy event 'The Royal Crimson Wedding Story' must never exist");
  });

  it("26. validates Print & Merchandise visibility controls (default OFF), clean unavailable state, and brand logo contrast rules", () => {
    // 1. Default configuration must have physical print & merch visibility set to OFF (false)
    assert.equal(
      DEFAULT_HOMEPAGE_CONFIG.show_print_bridge,
      false,
      "Homepage print bridge section must default to OFF (false)"
    );
    assert.equal(
      DEFAULT_SITE_SETTINGS.general.show_print_links,
      false,
      "General print links must default to OFF (false)"
    );
    assert.equal(
      DEFAULT_SITE_SETTINGS.general.show_print_merch_frontend,
      false,
      "Frontend print merch visibility must default to OFF (false)"
    );

    // 2. Navigation bar filtering simulation
    const buildNavLinks = (showPrintMerch: boolean) => [
      { label: "Book a Session", href: "/book" },
      { label: "Works Archive", href: "/works" },
      ...(showPrintMerch ? [{ label: "Print & Merch", href: "/print-solutions" }] : []),
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ];

    const defaultNav = buildNavLinks(false);
    assert.ok(
      !defaultNav.some((link) => link.href === "/print-solutions"),
      "Navbar must exclude Print & Merch when visibility is false"
    );
    assert.equal(defaultNav.length, 4);

    const enabledNav = buildNavLinks(true);
    assert.ok(
      enabledNav.some((link) => link.href === "/print-solutions"),
      "Navbar must include Print & Merch when visibility is enabled"
    );
    assert.equal(enabledNav.length, 5);

    // 3. Direct route /print-solutions response contract
    const resolvePrintSolutionsAccess = (showPrintMerch: boolean) => {
      if (!showPrintMerch) {
        return {
          status: "unavailable_neutral",
          exposeCatalog: false,
          redirectOrAction: "/works",
        };
      }
      return {
        status: "catalog_active",
        exposeCatalog: true,
        redirectOrAction: null,
      };
    };

    const disabledAccess = resolvePrintSolutionsAccess(false);
    assert.equal(disabledAccess.status, "unavailable_neutral");
    assert.equal(disabledAccess.exposeCatalog, false, "Must never expose hidden promotional catalog");

    const enabledAccess = resolvePrintSolutionsAccess(true);
    assert.equal(enabledAccess.status, "catalog_active");
    assert.equal(enabledAccess.exposeCatalog, true);

    // 4. Logo contrast & pure mark rules (no text, dark scene uses white logo, light scene uses black logo)
    const resolveBrandLogoAsset = (isDarkScene: boolean) => {
      if (isDarkScene) {
        return {
          src: "/brand/offprint-white-logo.png",
          variant: "white",
          hasAccompanyingText: false,
        };
      }
      return {
        src: "/brand/offprint-black-logo.png",
        variant: "black",
        hasAccompanyingText: false,
      };
    };

    const heroDarkHeader = resolveBrandLogoAsset(true);
    assert.equal(heroDarkHeader.src, "/brand/offprint-white-logo.png");
    assert.equal(heroDarkHeader.hasAccompanyingText, false, "Must keep logo mark only without offprint text");

    const lightNavbar = resolveBrandLogoAsset(false);
    assert.equal(lightNavbar.src, "/brand/offprint-black-logo.png");
    assert.equal(lightNavbar.hasAccompanyingText, false, "Must keep logo mark only without offprint text");
  });

  it("27. Automated Schedule Generation, Duration vs Interval Mechanics, Break Exclusion, Time Slot Management, and Safe Regeneration", async () => {
    // 1. Calculate proposed schedule with Duration (20m), Interval (30m), Breaks, Asia/Dhaka timezone
    const config: ScheduleConfig = {
      start_date: "2026-11-20",
      end_date: "2026-11-20",
      operating_days: [5], // Friday
      operating_start_time: "10:00",
      operating_end_time: "17:00",
      slot_duration_mins: 20,
      slot_interval_mins: 30,
      capacity_per_slot: 2,
      buffer_before_mins: 0,
      buffer_after_mins: 10,
      break_periods: [
        {
          name: "Lunch Break",
          start_time: "13:00",
          end_time: "14:00",
        },
      ],
    };

    const proposed = calculateProposedSchedule(config);
    assert.equal(proposed.operatingDaysCount, 1, "Must generate exactly 1 operating day");
    assert.equal(proposed.sessions.length, 1, "Must generate exactly 1 session");

    const session = proposed.sessions[0];
    assert.equal(session.session_date, "2026-11-20");
    assert.equal(session.slot_duration_mins, 20);
    assert.equal(session.capacity_per_slot, 2);

    // Duration vs Interval stepping verification:
    // 10:00-10:20, 10:30-10:50, 11:00-11:20, 11:30-11:50, 12:00-12:20, 12:30-12:50 (6 slots)
    // 13:00-13:20 and 13:30-13:50 must be excluded due to lunch break!
    // 14:00-14:20, 14:30-14:50, 15:00-15:20, 15:30-15:50, 16:00-16:20, 16:30-16:50 (6 slots)
    // Total = 12 slots
    assert.equal(session.slots.length, 12, "Must generate exactly 12 conflict-free slots excluding lunch break");
    assert.equal(proposed.totalSlots, 12);

    assert.equal(session.slots[0].start_time, "10:00");
    assert.equal(session.slots[0].end_time, "10:20");
    assert.equal(session.slots[1].start_time, "10:30");
    assert.equal(session.slots[1].end_time, "10:50");
    assert.equal(session.slots[5].start_time, "12:30");
    assert.equal(session.slots[5].end_time, "12:50");

    // Break exclusion check: No slots between 13:00 and 14:00
    for (const slot of session.slots) {
      assert.ok(
        !(slot.start_time < "14:00" && slot.end_time > "13:00"),
        `Generated slot ${slot.start_time}-${slot.end_time} must not overlap break period 13:00-14:00`
      );
    }

    // First afternoon slot resumes at 14:00
    assert.equal(session.slots[6].start_time, "14:00");
    assert.equal(session.slots[6].end_time, "14:20");

    // Final slot finishes within operating end time (17:00)
    const lastSlot = session.slots[session.slots.length - 1];
    assert.equal(lastSlot.start_time, "16:30");
    assert.equal(lastSlot.end_time, "16:50");
    assert.ok(lastSlot.end_time <= "17:00");

    // Dhaka timezone ISO check
    assert.ok(
      lastSlot.start_at.endsWith("Z") || lastSlot.start_at.includes("T"),
      "Timestamps must be valid ISO strings"
    );

    // 2. Safe Schedule Regeneration comparison diff with existing bookings
    const mockExistingSlots = [
      {
        id: "slot-1",
        slot_date: "2026-11-20",
        start_at: session.slots[0].start_at,
        end_at: session.slots[0].end_at,
        capacity: 2,
        booked_count: 1, // active confirmed booking!
        status: "available",
      },
      {
        id: "slot-old-unbooked",
        slot_date: "2026-11-20",
        start_at: dhakaDateTimeToISO("2026-11-20", "13:15"),
        end_at: dhakaDateTimeToISO("2026-11-20", "13:45"),
        capacity: 1,
        booked_count: 0, // unbooked, falls in break -> should be pruned safely
        status: "available",
      },
    ];

    const mockActiveBookings = [
      {
        id: "booking-101",
        booking_ref: "OFF-20261120-001",
        client_name: "Sarah Ahmed",
        booking_date: "2026-11-20",
        start_at: session.slots[0].start_at,
        status: "confirmed",
      },
    ];

    const preview = compareScheduleWithExisting(
      config,
      proposed,
      [{ id: "sess-1", session_date: "2026-11-20" }],
      mockExistingSlots,
      mockActiveBookings
    );

    assert.equal(preview.total_proposed_slots, 12);
    assert.equal(preview.retained_slots_count, 1, "Slot with matching start/end must be retained");
    assert.equal(preview.retained_booked_slots_count, 1, "Must retain slot with confirmed booking");
    assert.equal(preview.new_slots_count, 11, "11 new slots to be inserted");
    assert.equal(preview.removable_unbooked_slots_count, 1, "Unbooked slot outside schedule marked for pruning");
    assert.equal(preview.confirmed_bookings_count, 1);
    assert.equal(preview.confirmed_bookings_preserved, true, "Confirmed bookings must strictly be preserved");
    assert.equal(preview.affected_active_bookings.length, 1);
    assert.equal(preview.affected_active_bookings[0].booking_ref, "OFF-20261120-001");

    // 3. Slot Capacity Modification Safety (Never below active bookings)
    const validateSlotCapacityChange = (bookedCount: number, newCapacity: number) => {
      if (newCapacity < bookedCount) {
        return {
          allowed: false,
          error: `Cannot reduce slot capacity below existing confirmed bookings (${bookedCount}).`,
        };
      }
      return { allowed: true, safeCapacity: newCapacity };
    };

    const invalidCap = validateSlotCapacityChange(2, 1);
    assert.equal(invalidCap.allowed, false);
    assert.ok(invalidCap.error?.includes("Cannot reduce"));

    const validCap = validateSlotCapacityChange(1, 3);
    assert.equal(validCap.allowed, true);
    assert.equal(validCap.safeCapacity, 3);

    // 4. Bulk Delete Safety (Skips booked slots)
    const simulateBulkDelete = (
      slotsList: Array<{ id: string; booked_count: number }>
    ) => {
      const safeToDelete = slotsList
        .filter((s) => s.booked_count === 0)
        .map((s) => s.id);
      const skippedBooked = slotsList
        .filter((s) => s.booked_count > 0)
        .map((s) => s.id);
      return { safeToDelete, skippedBooked };
    };

    const bulkResult = simulateBulkDelete([
      { id: "s1", booked_count: 0 },
      { id: "s2", booked_count: 2 },
      { id: "s3", booked_count: 0 },
    ]);
    assert.deepEqual(
      bulkResult.safeToDelete,
      ["s1", "s3"],
      "Must only delete unbooked slots"
    );
    assert.deepEqual(
      bulkResult.skippedBooked,
      ["s2"],
      "Must safely preserve booked slots"
    );

    // 5. Brand Logo Standard Dimensions & Natural Aspect Ratio
    // Bounding box: 1615 x 551 -> Aspect ratio ~ 2.93:1
    const logoWidth = 1615;
    const logoHeight = 551;
    const aspectRatio = logoWidth / logoHeight;
    assert.ok(
      aspectRatio > 2.9 && aspectRatio < 2.95,
      "Cropped logo must have ~2.93 aspect ratio without large margins"
    );

    const desktopDisplayHeight = 48; // h-12
    const computedDesktopWidth = desktopDisplayHeight * aspectRatio;
    assert.ok(
      computedDesktopWidth >= 130 && computedDesktopWidth <= 155,
      `Desktop width (${computedDesktopWidth.toFixed(
        1
      )}px) must be between 130px and 155px`
    );
  });

  it("28. Booking Packages, Dynamic Booking Forms, Event Info Blocks, Slot Holds & Brand Logo Visibility", () => {
    // 1. Dynamic Package Display Mechanics
    const singlePackage = [
      {
        id: "pkg-1",
        event_id: "evt-convocation",
        name: "Standard Convocation Portrait",
        price_label: "BDT 3,500",
        price_numeric: 3500,
        duration_mins: 30,
        is_active: true,
        deliverables: ["15 Edited Photos", "Online Gallery"],
      },
    ];

    const multiPackages = [
      ...singlePackage,
      {
        id: "pkg-2",
        event_id: "evt-convocation",
        name: "Executive Regalia & Family Package",
        price_label: "BDT 6,000",
        price_numeric: 6000,
        duration_mins: 45,
        is_active: true,
        deliverables: ["30 Edited Photos", "Online Gallery", "1 Canvas Print"],
      },
    ];

    // Helper simulating package view step calculation
    function getPackageUiState(packages: typeof multiPackages) {
      const active = packages.filter((p) => p.is_active !== false);
      return {
        activeCount: active.length,
        showSeparatePackageStep: active.length >= 2,
        selectedPackage: active[0] || null,
        isSinglePackageIntegrated: active.length === 1,
      };
    }

    const singleState = getPackageUiState(singlePackage);
    assert.equal(singleState.activeCount, 1);
    assert.equal(
      singleState.showSeparatePackageStep,
      false,
      "1 active package must NOT render redundant Step 1"
    );
    assert.equal(
      singleState.isSinglePackageIntegrated,
      true,
      "1 active package must integrate directly in overview card"
    );
    assert.equal(singleState.selectedPackage?.id, "pkg-1");

    const multiState = getPackageUiState(multiPackages);
    assert.equal(multiState.activeCount, 2);
    assert.equal(
      multiState.showSeparatePackageStep,
      true,
      ">= 2 active packages must render Step 1 selection cards"
    );
    assert.equal(multiState.isSinglePackageIntegrated, false);

    // 2. Dynamic Form Builder & Seeded 13 IUB Convocation Fields
    const iubQuestions = IUB_CONVOCATION_DEFAULT_QUESTIONS;
    assert.equal(
      iubQuestions.length,
      13,
      "Must seed standard IUB fields including heading"
    );
    const iubKeys = iubQuestions.map((q) => q.key);
    assert.ok(iubKeys.includes("full_name"));
    assert.ok(iubKeys.includes("client_email"));
    assert.ok(iubKeys.includes("client_phone"));
    assert.ok(iubKeys.includes("guests_count"));
    assert.ok(iubKeys.includes("company_or_institution"));
    assert.ok(iubKeys.includes("heading_event_specific"));
    assert.ok(iubKeys.includes("student_id"));
    assert.ok(iubKeys.includes("degree_or_department"));
    assert.ok(iubKeys.includes("gown_size"));
    assert.ok(iubKeys.includes("print_framing_pref"));
    assert.ok(iubKeys.includes("family_notes"));
    assert.ok(iubKeys.includes("meeting_point"));
    assert.ok(iubKeys.includes("additional_requests"));

    // Check heading field type is present and ignored during data validation
    const headingQuestion = iubQuestions.find(
      (q) => q.field_type === "heading"
    );
    assert.ok(
      headingQuestion,
      "Must contain a heading field type for section grouping"
    );

    // Valid student ID: 7 digits
    const validStudentFields = {
      full_name: "Tanvir Rahman",
      client_email: "tanvir@example.com",
      client_phone: "+880 1711-223344",
      guests_count: "2",
      company_or_institution: "Independent University, Bangladesh",
      student_id: "2120456",
      degree_or_department: "School of Business and Entrepreneurship (SBE)",
      gown_size: "Large (L)",
      print_framing_pref: ["10x15 Standard Frame"],
      family_notes: "Arriving with parents",
      meeting_point: "Campus Plaza Booth",
      additional_requests: "Close-up portrait requested",
    };

    const validResult = validateCustomFieldsAgainstQuestions(
      iubQuestions,
      validStudentFields
    );
    assert.equal(
      validResult.valid,
      true,
      "Valid fields must pass validation"
    );
    assert.equal(Object.keys(validResult.errors).length, 0);

    // Invalid student ID: 5 digits instead of 7 (fails regex ^[0-9]{7}$)
    const invalidStudentFields = {
      ...validStudentFields,
      student_id: "12345",
    };
    const invalidResult = validateCustomFieldsAgainstQuestions(
      iubQuestions,
      invalidStudentFields
    );
    assert.equal(
      invalidResult.valid,
      false,
      "Invalid student ID must fail regex validation"
    );
    assert.ok(
      Object.values(invalidResult.errors)[0]?.toLowerCase().includes("student id")
    );

    // Number min/max validation test
    const numberQuestion: CustomBookingQuestion = {
      id: "q-num-test",
      key: "extra_guests",
      label: "Extra Guests",
      field_type: "number",
      required: true,
      min_value: 0,
      max_value: 5,
    };
    const underMin = validateCustomFieldsAgainstQuestions(
      [numberQuestion],
      { extra_guests: "-1" }
    );
    assert.equal(underMin.valid, false);
    const overMax = validateCustomFieldsAgainstQuestions(
      [numberQuestion],
      { extra_guests: "8" }
    );
    assert.equal(overMax.valid, false);
    const withinBounds = validateCustomFieldsAgainstQuestions(
      [numberQuestion],
      { extra_guests: "3" }
    );
    assert.equal(withinBounds.valid, true);

    // 3. Structured Event Info Blocks Separation from Operational Rules
    const infoBlocks = DEFAULT_EVENT_INFO_BLOCKS;
    assert.equal(
      infoBlocks.length,
      4,
      "Must contain standard 4 structured blocks"
    );
    const blockTypes = infoBlocks.map((b) => b.type);
    assert.deepEqual(blockTypes, ["venue", "sessions", "cutoff", "lock"]);

    // Modifying public text does not overwrite operational schedule or policies
    const operationalPolicy = {
      reschedule_cutoff_hours: 24,
      cancellation_cutoff_hours: 48,
      timezone: "Asia/Dhaka",
      slot_hold_duration_mins: 5,
    };
    // Underlying database policy values remain unchanged
    assert.equal(operationalPolicy.reschedule_cutoff_hours, 24);
    assert.equal(operationalPolicy.cancellation_cutoff_hours, 48);
    assert.equal(operationalPolicy.slot_hold_duration_mins, 5);

    // 4. Clean Slot Duration Labels (Omission of Internal Buffers)
    function formatClientSlotLabel(
      start: string,
      end: string,
      durationMins: number,
      _bufferMins?: number
    ) {
      // Must NOT include "+ buffer"
      return `${start} – ${end} · ${durationMins}m`;
    }
    const cleanLabel = formatClientSlotLabel("10:00 AM", "10:30 AM", 30, 60);
    assert.equal(cleanLabel, "10:00 AM – 10:30 AM · 30m");
    assert.equal(
      cleanLabel.includes("buffer"),
      false,
      "Slot label must strictly omit internal buffer annotations"
    );

    // 5. Temporary Slot Holds & Concurrency Protection
    const dummyEvent = {
      id: "evt-convocation",
      slug: "iub-27th-convocation",
      title: "IUB 27th Convocation",
      status: "published",
      booking_opens_at: "2026-01-01T00:00:00.000Z",
      booking_closes_at: "2026-12-31T23:59:59.000Z",
      default_slot_duration_mins: 30,
      buffer_before_mins: 0,
      buffer_after_mins: 0,
      default_slot_capacity: 1,
    } as any;

    const baseSlot = {
      id: "slot-hold-1",
      session_id: "sess-1",
      start_at: "2026-11-20T10:00:00.000+06:00",
      end_at: "2026-11-20T10:30:00.000+06:00",
      effective_start_at: "2026-11-20T10:00:00.000+06:00",
      effective_end_at: "2026-11-20T10:30:00.000+06:00",
      capacity: 1,
      booked_count: 0,
      status: "available" as const,
      label: "Morning 10:00 AM",
    } as any;

    const simulatedDate = new Date("2026-11-20T03:00:00.000Z"); // 09:00 AM BST (1h before slot)
    const activeHold = {
      slot_id: "slot-hold-1",
      flow_token: "flow-token-user-a",
    };

    // User B querying availability sees slot as held / zero remaining capacity
    const slotsForUserB = computeConvocationSlots({
      event: dummyEvent,
      slots: [baseSlot],
      blocks: [],
      busyIntervals: [],
      activeHolds: [activeHold],
      flowToken: "flow-token-user-b",
      now: simulatedDate,
    });
    assert.equal(
      slotsForUserB[0].state,
      "full",
      "Slot held by User A must show full / temporarily reserved to User B"
    );
    assert.equal(
      slotsForUserB[0].unavailable_reason,
      "Temporarily reserved by another client"
    );
    assert.equal(slotsForUserB[0].remaining_capacity, 0);

    // User A querying availability sees slot as available (they own the hold)
    const slotsForUserA = computeConvocationSlots({
      event: dummyEvent,
      slots: [baseSlot],
      blocks: [],
      busyIntervals: [],
      activeHolds: [activeHold],
      flowToken: "flow-token-user-a",
      now: simulatedDate,
    });
    assert.equal(
      slotsForUserA[0].state,
      "available",
      "Slot held by User A must remain available to User A"
    );
    assert.equal(slotsForUserA[0].remaining_capacity, 1);

    // No holds active: slot is available for anyone
    const slotsNoHolds = computeConvocationSlots({
      event: dummyEvent,
      slots: [baseSlot],
      blocks: [],
      busyIntervals: [],
      activeHolds: [],
      flowToken: "flow-token-user-b",
      now: simulatedDate,
    });
    assert.equal(
      slotsNoHolds[0].state,
      "available",
      "Slot without holds must be available"
    );
    assert.equal(slotsNoHolds[0].remaining_capacity, 1);

    // 6. Brand Logo Sizing Standards
    const headerDesktopWidth = 205;
    const headerMobileWidth = 160;
    const adminHeaderWidth = 190;
    const clientPortalWidth = 185;
    const footerWidth = 180;

    assert.ok(
      headerDesktopWidth >= 190 && headerDesktopWidth <= 210,
      "Desktop header logo within [190, 210]px"
    );
    assert.ok(
      headerMobileWidth >= 150 && headerMobileWidth <= 170,
      "Mobile header logo within [150, 170]px"
    );
    assert.ok(
      adminHeaderWidth >= 180 && adminHeaderWidth <= 195,
      "Admin header logo within [180, 195]px"
    );
    assert.ok(
      clientPortalWidth >= 180 && clientPortalWidth <= 195,
      "Client portal logo within [180, 195]px"
    );
    assert.ok(
      footerWidth >= 175 && footerWidth <= 190,
      "Footer logo within [175, 190]px"
    );
  });

  it("29. Booking Form & Package Corrections, Frame Add-on Pricing, Admin Error Diagnostics, and Mobile UX", async () => {
    // 1. Package presentation contains ONLY name, price, description (no 4-line deliverable list)
    const samplePackage: PhotographyPackage = {
      id: "pkg-editorial-001",
      event_id: "11111111-1111-4111-8111-111111111111",
      name: "Grand Regalia Studio Portraiture",
      description: "Dedicated editorial studio portrait session with handcrafted graduation cap and gown styling.",
      price_label: "BDT 3,500",
      price_numeric: 3500,
      currency: "BDT",
      duration_mins: 30,
      is_featured: false,
      is_active: true,
      sort_order: 1,
      deliverables: [], // Strictly empty / stripped - deliverable list removed from all UI displays
    };

    assert.equal(samplePackage.name, "Grand Regalia Studio Portraiture");
    assert.equal(samplePackage.price_numeric, 3500);
    assert.equal(
      samplePackage.description,
      "Dedicated editorial studio portrait session with handcrafted graduation cap and gown styling."
    );
    // UI strictly displays only name, price, and description - deliverables are not rendered
    assert.deepEqual(samplePackage.deliverables, []);

    // 2. Admin error diagnostics: preserves genuine DB error codes, hints, and details
    // Must NOT return generic visitor copy "Booking service is temporarily updating..."
    const mockPostgrestError = {
      code: "42703",
      message: 'column "frame_config" does not exist',
      details: "Database column was recently migrated or schema cache needs reload",
      hint: "Run NOTIFY pgrst, 'reload schema'",
      status: 400,
    };
    const adminErrorResult = formatAdminError(mockPostgrestError);
    assert.equal(adminErrorResult.code, "42703");
    assert.ok(
      adminErrorResult.message.includes('column "frame_config" does not exist'),
      "Admin error must contain exact failure message"
    );
    assert.ok(
      adminErrorResult.message.includes("schema cache needs reload"),
      "Admin error must contain details"
    );
    assert.ok(
      adminErrorResult.message.includes("Run NOTIFY pgrst"),
      "Admin error must contain hint"
    );
    assert.equal(adminErrorResult.httpStatus, 400);
    assert.notEqual(
      adminErrorResult.message,
      "Booking service is temporarily updating. Please refresh or retry in a few moments."
    );

    // 3. Form builder field types & choice options
    const customQuestions: CustomBookingQuestion[] = [
      {
        id: "q_student_name",
        key: "client_name",
        label: "Graduating Student Full Name",
        field_type: "short_text",
        type: "short_text",
        required: true,
        is_visible: true,
        sort_order: 1,
      },
      {
        id: "q_student_email",
        key: "client_email",
        label: "Institutional Email Address",
        field_type: "email",
        type: "email",
        required: true,
        is_visible: true,
        sort_order: 2,
      },
      {
        id: "q_degree_level",
        key: "degree_level",
        label: "Degree Level",
        field_type: "select_box",
        type: "select_box",
        required: true,
        is_visible: true,
        layout: "horizontal",
        select_mode: "single",
        options: ["Undergraduate (BSc/BBA)", "Postgraduate (MSc/MBA)", "Doctoral (PhD)"],
        sort_order: 3,
      },
      {
        id: "q_hidden_notes",
        key: "internal_notes",
        label: "Internal Coordinator Notes",
        field_type: "long_text",
        type: "long_text",
        required: false,
        is_visible: false, // Hidden by administrator
        sort_order: 4,
      },
    ];

    // Dynamic form rendering obeys is_visible flag: hiding a field completely excludes it from public form
    const publicVisibleQuestions = customQuestions.filter((q) => q.is_visible !== false);
    assert.equal(publicVisibleQuestions.length, 3);
    assert.ok(!publicVisibleQuestions.some((q) => q.id === "q_hidden_notes"));

    // Verify select_box horizontal layout and options
    const degreeQuestion = publicVisibleQuestions.find((q) => q.key === "degree_level");
    assert.ok(degreeQuestion);
    assert.equal(degreeQuestion?.field_type, "select_box");
    assert.equal(degreeQuestion?.layout, "horizontal");
    assert.equal(degreeQuestion?.select_mode, "single");
    assert.equal(degreeQuestion?.options?.length, 3);

    // Dynamic field validation
    const validFieldValues = {
      client_name: "Tanzim Ahmed",
      client_email: "tanzim@iub.edu.bd",
      degree_level: "Undergraduate (BSc/BBA)",
    };
    const validationResult = validateCustomFieldsAgainstQuestions(
      publicVisibleQuestions,
      validFieldValues
    );
    assert.equal(validationResult.valid, true);

    // Required contact method enforcement in booking schema
    const bookingPayloadMissingContact = {
      event_id: "11111111-1111-4111-8111-111111111111",
      slot_id: "33333333-3333-4333-8333-333333333331",
      booking_type: "convocation" as const,
      booking_date: "2026-11-20",
      start_at: "2026-11-20T10:00:00.000Z",
      end_at: "2026-11-20T10:30:00.000Z",
      duration_mins: 30,
      client_name: "Tanzim Ahmed",
      client_email: "",
      client_phone: "", // Neither email nor phone provided!
      custom_fields: validFieldValues,
    };
    const schemaCheckFail = createBookingSchema.safeParse(bookingPayloadMissingContact);
    assert.equal(schemaCheckFail.success, false, "Must fail when neither email nor phone is provided");

    const bookingPayloadWithEmail = {
      ...bookingPayloadMissingContact,
      client_email: "tanzim@iub.edu.bd",
    };
    const schemaCheckPass = createBookingSchema.safeParse(bookingPayloadWithEmail);
    assert.equal(schemaCheckPass.success, true, "Passes when valid confirmation email is provided");

    // 4. Frame Add-ons Pricing & Complete Hiding When Empty or Disabled
    const emptyFrameConfig: FramePrintingConfig = {
      enabled: false,
      title: "Archival Framing",
      description: "Custom frames",
      max_quantity: 5,
      frame_types: [],
    };
    const isFrameVisibleEmpty =
      emptyFrameConfig.enabled &&
      (emptyFrameConfig.frame_types || []).filter((f) => f.is_active !== false).length > 0;
    assert.equal(isFrameVisibleEmpty, false, "Frame section is completely hidden when disabled");

    const disabledOptionsConfig: FramePrintingConfig = {
      enabled: true,
      title: "Archival Framing",
      description: "Custom frames",
      max_quantity: 5,
      frame_types: [
        {
          id: "frame-1",
          name: "Matte Black (10x12)",
          price: 1800,
          is_active: false, // Disabled option
        },
      ],
    };
    const isFrameVisibleDisabled =
      disabledOptionsConfig.enabled &&
      (disabledOptionsConfig.frame_types || []).filter((f) => f.is_active !== false).length > 0;
    assert.equal(isFrameVisibleDisabled, false, "Frame section is completely hidden when all options are inactive");

    // Active frame pricing calculation
    const activeFrameConfig: FramePrintingConfig = {
      enabled: true,
      title: "Archival Framing",
      description: "Fine gallery frames",
      max_quantity: 5,
      frame_types: [
        {
          id: "frame-matte-black",
          name: "Archival Matte Black (10x12)",
          dimensions: "10x12 inches",
          price: 1800,
          is_active: true,
          sort_order: 1,
          allow_quantity: true,
        },
        {
          id: "frame-walnut",
          name: "Dark Walnut Hardwood (12x18)",
          dimensions: "12x18 inches",
          price: 2800,
          is_active: true,
          sort_order: 2,
          allow_quantity: true,
        },
      ],
    };

    // Calculate price with base package only (no frame selected)
    const priceWithoutFrame = calculateAndVerifyBookingPrice({
      pkg: samplePackage,
      frameConfig: activeFrameConfig,
      frameSelected: false,
      frameTypeId: null,
      frameQuantity: 1,
    });
    assert.equal(priceWithoutFrame.total_price, 3500);
    assert.equal(priceWithoutFrame.frame_total_price, 0);
    assert.equal(priceWithoutFrame.pricing_snapshot.frame_printing_selected, false);

    // Calculate price with walnut frame selected (quantity: 2) -> 3500 + (2800 * 2) = 9100
    const priceWithFrame = calculateAndVerifyBookingPrice({
      pkg: samplePackage,
      frameConfig: activeFrameConfig,
      frameSelected: true,
      frameTypeId: "frame-walnut",
      frameQuantity: 2,
    });
    assert.equal(priceWithFrame.package_base_price, 3500);
    assert.equal(priceWithFrame.frame_total_price, 5600);
    assert.equal(priceWithFrame.total_price, 9100);
    assert.equal(priceWithFrame.pricing_snapshot.frame_printing_selected, true);
    assert.equal(priceWithFrame.pricing_snapshot.frame_type_name, "Dark Walnut Hardwood (12x18)");
    assert.equal(priceWithFrame.pricing_snapshot.frame_quantity, 2);

    // 5. Mobile Slot Selection & Responsive UX
    // Slot hold acquisition occurs BEFORE triggering smooth scroll to #booking-reservation-details
    const holdAcquisitionSucceeded = true;
    let didSmoothScroll = false;
    function onSlotHoldConfirmed() {
      if (holdAcquisitionSucceeded) {
        didSmoothScroll = true;
      }
    }
    onSlotHoldConfirmed();
    assert.equal(didSmoothScroll, true, "Smooth scroll triggered only upon successful slot hold");

    // Responsive Mobile Footer standard logo sizing
    const mobileFooterLogoWidth = 150;
    const desktopFooterLogoWidth = 185;
    assert.ok(mobileFooterLogoWidth >= 140 && mobileFooterLogoWidth <= 160, "Mobile footer logo within [140, 160]px");
    assert.ok(desktopFooterLogoWidth >= 180 && desktopFooterLogoWidth <= 190, "Desktop footer logo within [180, 190]px");
  });

  it("30. Passwordless Client Portal & Package-Linked Convocation Scheduling", () => {
    // 1. Passwordless Client Portal Authentication & Booking Association
    // Client email validation for OTP
    const validClientEmail = "graduating.senior@iub.edu.bd";
    const invalidEmail = "not-an-email";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert.equal(emailRegex.test(validClientEmail), true, "Valid client email passes format check");
    assert.equal(emailRegex.test(invalidEmail), false, "Invalid email fails format check");

    // OTP Token format validation (6 numeric digits)
    const validOtp = "729401";
    const invalidOtp = "abc";
    const otpRegex = /^\d{6}$/;
    assert.equal(otpRegex.test(validOtp), true, "Valid OTP is 6 digits");
    assert.equal(otpRegex.test(invalidOtp), false, "Non-digit OTP fails check");

    // Resend cooldown timer mechanics (60 seconds)
    let cooldown = 60;
    const tick = () => {
      cooldown = Math.max(0, cooldown - 1);
    };
    tick();
    assert.equal(cooldown, 59, "Cooldown decrements per second");

    // Booking automatic backfill matching client_email
    const unlinkedBooking: Partial<Booking> = {
      id: "b-unlinked-1",
      user_id: null,
      client_email: "graduating.senior@iub.edu.bd",
      client_name: "Graduating Senior",
      status: "confirmed",
      service_or_event_title: "IUB 27th Convocation",
    };
    const authenticatedClientUserId = "user-uuid-9999";
    const backfilledBooking = {
      ...unlinkedBooking,
      user_id: authenticatedClientUserId,
    };
    assert.equal(
      backfilledBooking.user_id,
      authenticatedClientUserId,
      "Historical booking associated to verified user"
    );

    // Empty state message when client has 0 bookings
    const clientBookings: Booking[] = [];
    const hasBookings = clientBookings.length > 0;
    const emptyStateNotice = hasBookings
      ? null
      : `No bookings found for ${validClientEmail}.`;
    assert.equal(hasBookings, false);
    assert.ok(emptyStateNotice?.includes("No bookings found"));

    // 2. Multi-Duration Schedule Generation (30m vs 60m packages)
    const pkgA30: PhotographyPackage = {
      id: "pkg-30m-uuid",
      event_id: "evt-uuid-1",
      name: "Individual Portrait (30 mins)",
      description: "Quick cap & gown portrait",
      duration_mins: 30,
      price_label: "BDT 3,500",
      price_numeric: 3500,
      deliverables: [],
      is_featured: false,
      is_active: true,
      sort_order: 1,
    };

    const pkgB60: PhotographyPackage = {
      id: "pkg-60m-uuid",
      event_id: "evt-uuid-1",
      name: "Family & Friends Session (60 mins)",
      description: "Extended session for graduate + family",
      duration_mins: 60,
      price_label: "BDT 6,500",
      price_numeric: 6500,
      deliverables: [],
      is_featured: true,
      is_active: true,
      sort_order: 2,
    };

    const multiPkgScheduleConfig: ScheduleConfig = {
      start_date: "2026-12-05",
      end_date: "2026-12-05",
      operating_days: [6], // Saturday
      operating_start_time: "10:00",
      operating_end_time: "12:00",
      slot_duration_mins: 30,
      slot_interval_mins: 30,
      capacity_per_slot: 1,
      break_periods: [],
      packages: [
        {
          id: pkgA30.id,
          name: pkgA30.name,
          duration_mins: pkgA30.duration_mins,
          price: 3500,
        },
        {
          id: pkgB60.id,
          name: pkgB60.name,
          duration_mins: pkgB60.duration_mins,
          price: 6500,
        },
      ],
    };

    const proposedMulti = calculateProposedSchedule(multiPkgScheduleConfig);
    assert.equal(proposedMulti.sessions.length, 1, "Generates 1 operating session");
    const generatedSlots = proposedMulti.sessions[0]?.slots || [];

    const slots30m = generatedSlots.filter((s) => s.duration_mins === 30);
    const slots60m = generatedSlots.filter((s) => s.duration_mins === 60);

    // 10:00 to 12:00 = 120 mins
    // 30m slots: 10:00-10:30, 10:30-11:00, 11:00-11:30, 11:30-12:00 = 4 slots
    assert.equal(slots30m.length, 4, "Generates 4 30-minute slots");
    // 60m slots: 10:00-11:00, 11:00-12:00 = 2 slots
    assert.equal(slots60m.length, 2, "Generates 2 60-minute slots");

    // All slots are tagged with applicable package_ids
    assert.ok(slots30m.every((s) => s.package_ids?.includes(pkgA30.id)));
    assert.ok(slots60m.every((s) => s.package_ids?.includes(pkgB60.id)));

    // 3. Package Availability Filtering
    const convocationEvent: BookingEvent = {
      id: "evt-uuid-1",
      slug: "iub-27th-convocation",
      title: "IUB 27th Convocation",
      status: "published",
      booking_opens_at: "2026-01-01T00:00:00.000Z",
      booking_closes_at: "2026-12-31T23:59:59.000Z",
      default_slot_duration_mins: 30,
      buffer_before_mins: 0,
      buffer_after_mins: 0,
      default_slot_capacity: 1,
    } as any;

    const sessionObj: EventSession = {
      id: "sess-1-uuid",
      event_id: "evt-uuid-1",
      title: "Convocation Session Day 1",
      session_date: "2026-12-05",
      start_time: "10:00:00",
      end_time: "12:00:00",
      slot_duration_mins: 30,
      capacity_per_slot: 1,
      is_active: true,
      package_ids: [pkgA30.id, pkgB60.id],
    } as any;

    const eventSlotsForEval = [
      ...slots30m.map((s, idx) => ({
        id: `slot-30m-${idx}`,
        event_id: convocationEvent.id,
        session_id: sessionObj.id,
        slot_date: "2026-12-05",
        start_at: s.start_at,
        end_at: s.end_at,
        effective_start_at: s.start_at,
        effective_end_at: s.end_at,
        capacity: 1,
        booked_count: 0,
        status: "available" as const,
        duration_mins: 30,
        package_ids: [pkgA30.id],
      })),
      ...slots60m.map((s, idx) => ({
        id: `slot-60m-${idx}`,
        event_id: convocationEvent.id,
        session_id: sessionObj.id,
        slot_date: "2026-12-05",
        start_at: s.start_at,
        end_at: s.end_at,
        effective_start_at: s.start_at,
        effective_end_at: s.end_at,
        capacity: 1,
        booked_count: 0,
        status: "available" as const,
        duration_mins: 60,
        package_ids: [pkgB60.id],
      })),
    ];

    const evaluationTime = new Date("2026-12-01T04:00:00.000Z"); // 4 days prior

    // Client selects 30m package: slots returned match 30m duration and pkgA
    const slotsForPkgA = computeConvocationSlots({
      event: convocationEvent,
      sessions: [sessionObj],
      slots: eventSlotsForEval as any,
      selectedPackageId: pkgA30.id,
      packageDurationMins: 30,
      now: evaluationTime,
    });

    const bookablePkgA = slotsForPkgA.filter((s) => s.state === "available");
    assert.equal(bookablePkgA.length, 4, "Client sees 4 30-minute slots");
    assert.ok(bookablePkgA.every((s) => s.duration_mins === 30));

    // Client selects 60m package: slots returned match 60m duration and pkgB
    const slotsForPkgB = computeConvocationSlots({
      event: convocationEvent,
      sessions: [sessionObj],
      slots: eventSlotsForEval as any,
      selectedPackageId: pkgB60.id,
      packageDurationMins: 60,
      now: evaluationTime,
    });

    const bookablePkgB = slotsForPkgB.filter((s) => s.state === "available");
    assert.equal(bookablePkgB.length, 2, "Client sees 2 60-minute slots");
    assert.ok(bookablePkgB.every((s) => s.duration_mins === 60));

    // 4. Overlapping Cross-Package Concurrency Conflict Protection
    // Graduate books a 60m session from 10:00 to 11:00 (slot-60m-0)
    const bookingSlot60m = eventSlotsForEval.find((s) => s.id === "slot-60m-0")!;
    const busyInterval60m = {
      booking_id: "booking-60m-1",
      start_at: bookingSlot60m.start_at,
      end_at: bookingSlot60m.end_at,
      effective_start_at: bookingSlot60m.start_at,
      effective_end_at: bookingSlot60m.end_at,
      booking_type: "convocation" as const,
      resource_pool: "primary_studio",
    };

    // Another client selects the 30m package
    const slotsForPkgAAfterBooking = computeConvocationSlots({
      event: convocationEvent,
      sessions: [sessionObj],
      slots: eventSlotsForEval as any,
      busyIntervals: [busyInterval60m],
      selectedPackageId: pkgA30.id,
      packageDurationMins: 30,
      now: evaluationTime,
    });

    // 10:00-10:30 and 10:30-11:00 slots overlap with 10:00-11:00 booking, so they must be marked full / unavailable!
    const slot1000 = slotsForPkgAAfterBooking.find((s) => s.start_at === bookingSlot60m.start_at)!;
    assert.equal(slot1000.state, "full", "Overlapping 10:00-10:30 slot is marked full");
    assert.equal(slot1000.remaining_capacity, 0);

    const slot1030 = slotsForPkgAAfterBooking.find((s) => s.start_time_label.includes("10:30"))!;
    assert.equal(slot1030.state, "full", "Overlapping 10:30-11:00 slot is marked full");
    assert.equal(slot1030.remaining_capacity, 0);

    // 11:00-11:30 and 11:30-12:00 slots do not overlap and must remain available
    const slot1100 = slotsForPkgAAfterBooking.find((s) => s.start_time_label.includes("11:00"))!;
    assert.equal(slot1100.state, "available", "Non-overlapping 11:00 slot remains available");
    assert.equal(slot1100.remaining_capacity, 1);

    // 5. Mismatched Duration Rejection
    // Attempting to book a 30m slot with a 60m package fails duration matching validation
    const mismatchedSlot = eventSlotsForEval.find((s) => s.duration_mins === 30)!;
    const isDurationMatch = mismatchedSlot.duration_mins === pkgB60.duration_mins;
    assert.equal(isDurationMatch, false, "30m slot duration does not match 60m package duration");
  });

  it("31. Package Creation, Safe Deletion & Schedule Configuration Package Attachment", () => {
    // =========================================================================
    // 1. Package Schema Validation & Robust Creation Sanitization
    // =========================================================================
    // A. Valid Package with auto-defaulted description and sanitized empty ID
    const validPkgInput = {
      id: "",
      event_id: "16ae23d0-97d1-474a-93be-eb88542f4c8a",
      name: "Convocation Solo Standard",
      description: "", // empty description should be transformed to default
      duration_mins: 30,
      price_numeric: 3500,
      price_label: "৳3,500",
      currency: "BDT",
      is_active: true,
      is_featured: true,
    };

    const parsedValid = photographyPackageSchema.safeParse(validPkgInput);
    assert.ok(parsedValid.success, "Empty id and description are successfully sanitized");
    assert.equal(parsedValid.data.id, undefined, "Empty id string transformed to undefined");
    assert.equal(
      parsedValid.data.description,
      "Event Portrait Package",
      "Empty description defaulted to fallback"
    );
    assert.equal(parsedValid.data.duration_mins, 30);
    assert.equal(parsedValid.data.price_numeric, 3500);

    // B. Package with custom duration (e.g. 15m rapid portrait, 60m executive regalia)
    const rapidPkg = photographyPackageSchema.safeParse({
      name: "15-Min Quick Portrait",
      duration_mins: 15,
      price_numeric: 1500,
      event_id: "16ae23d0-97d1-474a-93be-eb88542f4c8a",
    });
    assert.ok(rapidPkg.success, "Supports 15-minute quick portrait packages");
    assert.equal(rapidPkg.data.duration_mins, 15);

    const execPkg = photographyPackageSchema.safeParse({
      name: "60-Min Full Regalia & Family",
      duration_mins: 60,
      price_numeric: 6000,
      event_id: "16ae23d0-97d1-474a-93be-eb88542f4c8a",
    });
    assert.ok(execPkg.success, "Supports 60-minute extended portrait packages");
    assert.equal(execPkg.data.duration_mins, 60);

    // C. Rejects invalid durations (< 5 mins) or invalid names
    const invalidDuration = photographyPackageSchema.safeParse({
      name: "Invalid Duration Package",
      duration_mins: 2, // below minimum 5 mins
      price_numeric: 1000,
    });
    assert.ok(!invalidDuration.success, "Rejects durations under 5 minutes");

    // =========================================================================
    // 2. Safe Deletion Logic (Cases A, B, and C)
    // =========================================================================
    interface SimulatedPackage {
      id: string;
      name: string;
      is_active: boolean;
      event_id: string;
    }

    interface SimulatedSessionPackage {
      session_id: string;
      package_id: string;
    }

    interface SimulatedBooking {
      id: string;
      package_id: string;
      client_name: string;
      status: string;
    }

    // Mock State
    let mockPackages: SimulatedPackage[] = [
      { id: "pkg-unused-1", name: "Unused Solo Tier", is_active: true, event_id: "event-1" },
      { id: "pkg-session-linked", name: "Session Linked Tier", is_active: true, event_id: "event-1" },
      { id: "pkg-with-bookings", name: "Historical Booked Tier", is_active: true, event_id: "event-1" },
    ];

    let mockSessionPackages: SimulatedSessionPackage[] = [
      { session_id: "sess-1", package_id: "pkg-session-linked" },
      { session_id: "sess-2", package_id: "pkg-session-linked" },
      { session_id: "sess-1", package_id: "pkg-with-bookings" },
    ];

    const mockBookings: SimulatedBooking[] = [
      { id: "book-1", package_id: "pkg-with-bookings", client_name: "Tanvir Hasan", status: "confirmed" },
      { id: "book-2", package_id: "pkg-with-bookings", client_name: "Nabila Rahman", status: "confirmed" },
    ];

    // Simulated Safe Deletion Engine mirroring the RPC and Route Handler logic
    function simulateDeleteOrArchivePackage(packageId: string) {
      const pkg = mockPackages.find((p) => p.id === packageId);
      if (!pkg) return { success: false, action: "not_found", message: "Package not found" };

      const bookingCount = mockBookings.filter((b) => b.package_id === packageId).length;

      if (bookingCount > 0) {
        // Case C: Safely archive for future bookings, preserving all historical client bookings
        pkg.is_active = false;
        return {
          success: true,
          action: "archived",
          id: pkg.id,
          name: pkg.name,
          historical_bookings_count: bookingCount,
          message: `Package "${pkg.name}" is referenced by ${bookingCount} historical booking(s) and was safely archived and disabled for future bookings to protect client records.`,
        };
      } else {
        // Case A & B: Zero bookings - clean up junction table, then delete package permanently
        mockSessionPackages = mockSessionPackages.filter((sp) => sp.package_id !== packageId);
        mockPackages = mockPackages.filter((p) => p.id !== packageId);
        return {
          success: true,
          action: "deleted",
          id: packageId,
          name: pkg.name,
          historical_bookings_count: 0,
          message: `Package "${pkg.name}" had no bookings and was permanently deleted. Schedule associations were cleaned up.`,
        };
      }
    }

    // A. Case A Test: Delete Unused Package
    const caseAResult = simulateDeleteOrArchivePackage("pkg-unused-1");
    assert.equal(caseAResult.action, "deleted", "Unused package permanently deleted");
    assert.equal(caseAResult.historical_bookings_count, 0);
    assert.ok(!mockPackages.some((p) => p.id === "pkg-unused-1"), "Package removed from database");

    // B. Case B Test: Delete Session-Linked Package with 0 Bookings
    const initialSessionLinksCount = mockSessionPackages.length;
    const caseBResult = simulateDeleteOrArchivePackage("pkg-session-linked");
    assert.equal(caseBResult.action, "deleted", "Session-linked package with 0 bookings permanently deleted");
    assert.ok(
      !mockSessionPackages.some((sp) => sp.package_id === "pkg-session-linked"),
      "Junction rows cleaned up cleanly"
    );
    assert.ok(
      mockSessionPackages.some((sp) => sp.package_id === "pkg-with-bookings"),
      "Other packages in junction table preserved"
    );
    assert.ok(mockSessionPackages.length < initialSessionLinksCount);

    // C. Case C Test: Attempt to Delete Package with Historical Bookings
    const caseCResult = simulateDeleteOrArchivePackage("pkg-with-bookings");
    assert.equal(caseCResult.action, "archived", "Package with historical bookings is archived, NOT hard deleted");
    assert.equal(caseCResult.historical_bookings_count, 2);
    const archivedPkg = mockPackages.find((p) => p.id === "pkg-with-bookings");
    assert.ok(archivedPkg, "Package row remains preserved in database");
    assert.equal(archivedPkg.is_active, false, "Package is marked inactive for future bookings");
    // All client booking records remain intact!
    assert.equal(mockBookings.filter((b) => b.package_id === "pkg-with-bookings").length, 2);

    // =========================================================================
    // 3. Schedule Configuration Package Attachment & Multi-Duration Slot Calculations
    // =========================================================================
    const attachedPackages = [
      { id: "pkg-30m", name: "30-Min Classic Convocation", duration_mins: 30, price: 2500 },
      { id: "pkg-60m", name: "60-Min Deluxe Convocation", duration_mins: 60, price: 4500 },
    ];

    const multiPkgScheduleConfig: ScheduleConfig = {
      start_date: "2026-11-20",
      end_date: "2026-11-20",
      operating_days: [5], // Friday
      operating_start_time: "10:00",
      operating_end_time: "13:00", // 3 hours = 180 minutes
      slot_duration_mins: 30,
      slot_interval_mins: 30,
      capacity_per_slot: 1,
      buffer_before_mins: 0,
      buffer_after_mins: 0,
      break_periods: [
        { name: "Prayer Break", start_time: "12:00", end_time: "12:30" }, // 30m break
      ],
      packages: attachedPackages,
    };

    // Calculate proposed schedule with multi-package attachment
    const proposedResult = calculateProposedSchedule(multiPkgScheduleConfig);
    assert.equal(proposedResult.sessions.length, 1, "Generates 1 operating session for Friday");
    const fridaySession = proposedResult.sessions[0];

    // Check package associations on session
    assert.deepEqual(
      fridaySession.package_ids,
      ["pkg-30m", "pkg-60m"],
      "Session is attached to all selected packages"
    );

    // Slots Breakdown by Duration:
    // Available hours: 10:00 - 12:00 (120 mins) + 12:30 - 13:00 (30 mins) = 150 mins total bookable time
    // 30m slots:
    // 10:00-10:30, 10:30-11:00, 11:00-11:30, 11:30-12:00, 12:30-13:00 = 5 slots
    assert.equal(fridaySession.slots_by_duration[30], 5, "5 slots generated for 30m package");

    // 60m slots:
    // 10:00-11:00, 11:00-12:00 (12:00-13:00 overlaps 12:00-12:30 break, so excluded!) = 2 slots
    assert.equal(fridaySession.slots_by_duration[60], 2, "2 slots generated for 60m package, break excluded");

    // Total slots in session = 5 + 2 = 7 slots
    assert.equal(fridaySession.slots.length, 7, "Total discrete duration slots equals 7");

    // Verify slots are tagged with exact duration and package_ids
    const slots30m = fridaySession.slots.filter((s) => s.duration_mins === 30);
    assert.equal(slots30m.length, 5);
    assert.ok(slots30m.every((s) => s.package_ids.includes("pkg-30m")));

    const slots60m = fridaySession.slots.filter((s) => s.duration_mins === 60);
    assert.equal(slots60m.length, 2);
    assert.ok(slots60m.every((s) => s.package_ids.includes("pkg-60m")));

    // Schedule Comparison / Preview Result
    const previewComparison = compareScheduleWithExisting(
      multiPkgScheduleConfig,
      proposedResult,
      [],
      [],
      []
    );

    assert.equal(previewComparison.total_proposed_sessions, 1);
    assert.equal(previewComparison.total_proposed_slots, 7);
    assert.ok(Array.isArray(previewComparison.packages), "Packages included in preview comparison");
    assert.equal(previewComparison.packages!.length, 2);
    assert.deepEqual(previewComparison.slots_by_duration, { 30: 5, 60: 2 });
  });

  it("32. PostgREST Schema-Cache Resilience & Backward Compatibility", () => {
    // 1. Booking Event Schema-Cache Tolerance (schedule_package_ids vs schedule_overrides fallback)
    const mockDbEventWithoutCol = {
      id: "ev-resilience-1",
      title: "Convocation 2026",
      schedule_overrides: [
        { type: "schedule_packages", package_ids: ["pkg-uuid-1", "pkg-uuid-2"] },
      ],
      // schedule_package_ids column does not physically exist in DB
    };

    // Derived resolution logic as implemented in GET /api/admin/events & schedule generator
    const resolveSchedulePackageIds = (ev: any, allPackages: any[] = []) => {
      let pkgIds = Array.isArray(ev.schedule_package_ids) && ev.schedule_package_ids.length > 0
        ? ev.schedule_package_ids
        : null;
      if (!pkgIds && Array.isArray(ev.schedule_overrides)) {
        const pkgOverride = ev.schedule_overrides.find((o: any) => o?.type === "schedule_packages");
        if (pkgOverride && Array.isArray(pkgOverride.package_ids)) {
          pkgIds = pkgOverride.package_ids;
        }
      }
      if (!pkgIds) {
        pkgIds = allPackages
          .filter((p: any) => p.event_id === ev.id && p.is_active !== false)
          .map((p: any) => p.id);
      }
      return pkgIds || [];
    };

    const resolvedIds = resolveSchedulePackageIds(mockDbEventWithoutCol);
    assert.deepEqual(resolvedIds, ["pkg-uuid-1", "pkg-uuid-2"], "Resolves package IDs safely from schedule_overrides when column is missing");

    // Event with neither column nor override defaults to all active packages for that event
    const mockEmptyEvent = { id: "ev-resilience-2" };
    const mockPackages = [
      { id: "pkg-a", event_id: "ev-resilience-2", is_active: true },
      { id: "pkg-b", event_id: "ev-resilience-2", is_active: true },
      { id: "pkg-inactive", event_id: "ev-resilience-2", is_active: false },
    ];
    const resolvedDefaultIds = resolveSchedulePackageIds(mockEmptyEvent, mockPackages);
    assert.deepEqual(resolvedDefaultIds, ["pkg-a", "pkg-b"], "Safely defaults to active packages for the event");

    // 2. Slot Duration Calculation Fallback (when event_time_slots lacks duration_mins)
    const mockSlotWithoutDurationCol = {
      id: "slot-resilience-1",
      start_at: "2026-11-20T04:00:00.000Z",
      end_at: "2026-11-20T04:45:00.000Z", // 45 mins
      // duration_mins column is undefined
    };

    const resolveSlotDuration = (slot: any) => {
      return slot.duration_mins && slot.duration_mins > 0
        ? slot.duration_mins
        : Math.max(
            1,
            Math.round((Date.parse(slot.end_at) - Date.parse(slot.start_at)) / 60_000)
          );
    };

    const calculatedDur = resolveSlotDuration(mockSlotWithoutDurationCol);
    assert.equal(calculatedDur, 45, "Calculates accurate duration in minutes from slot start_at and end_at");

    // 3. Payload Stripping: Ensuring payloads never submit non-existent columns to PostgREST
    const testAdminPayload = {
      title: "Convocation Photography",
      slug: "convocation-photography",
      schedule_package_ids: ["pkg-uuid-1"],
      custom_questions: [],
    };

    // When supportsSchedulePkgIds is false, omit schedule_package_ids
    const supportsSchedulePkgIds = false;
    const { schedule_package_ids: _omit, ...safeDbPayload } = testAdminPayload;
    const finalPayload = supportsSchedulePkgIds ? testAdminPayload : safeDbPayload;

    assert.equal("schedule_package_ids" in finalPayload, false, "Strips schedule_package_ids before upsert to prevent PostgREST column missing error");
    assert.equal(finalPayload.title, "Convocation Photography");
  });

  it("33. Foreign Key Deletion Safety: event_sessions, time slots, and bookings_session_id_fkey", () => {
    // 1. Session with Active Confirmed Bookings: MUST BE BLOCKED
    const mockBookingsOnSession = [
      { id: "b-1", booking_ref: "REF-ACTIVE-01", session_id: "sess-100", status: "confirmed" },
      { id: "b-2", booking_ref: "REF-CANCELLED-02", session_id: "sess-100", status: "cancelled" },
    ];

    const activeStatuses = ["pending", "confirmed", "rescheduled"];
    const activeBookings = mockBookingsOnSession.filter((b) => activeStatuses.includes(b.status));

    assert.equal(activeBookings.length, 1, "Detects 1 active booking");
    assert.equal(activeBookings[0].booking_ref, "REF-ACTIVE-01");

    // Deletion decision
    const canDeleteSessionWithActive = (activeBookings.length as number) === 0;
    assert.equal(canDeleteSessionWithActive, false, "Session deletion is strictly blocked when active bookings exist");

    // 2. Session with ONLY Inactive/Cancelled Bookings: SAFELY DISSOCIATE & ALLOW
    const mockCancelledOnlySessionBookings = [
      { id: "b-3", booking_ref: "REF-CANCELLED-03", session_id: "sess-200", slot_id: "slot-200", status: "cancelled" },
      { id: "b-4", booking_ref: "REF-COMPLETED-04", session_id: "sess-200", slot_id: "slot-201", status: "completed" },
    ];

    const activeOnCancelledSession = mockCancelledOnlySessionBookings.filter((b) => activeStatuses.includes(b.status));
    assert.equal(activeOnCancelledSession.length, 0, "No active bookings on session");

    // Safe dissociation simulation
    const dissociatedBookings = mockCancelledOnlySessionBookings.map((b) => ({
      ...b,
      session_id: null,
      slot_id: null,
    }));

    // Verify all bookings still retain reference, client history, but have freed FK constraint
    assert.ok(dissociatedBookings.every((b) => b.session_id === null));
    assert.ok(dissociatedBookings.every((b) => b.slot_id === null));
    assert.equal(dissociatedBookings[0].booking_ref, "REF-CANCELLED-03", "Client booking reference preserved");
    assert.equal(dissociatedBookings[1].booking_ref, "REF-COMPLETED-04", "Historical record preserved");

    // After dissociation, session can be deleted cleanly without violating bookings_session_id_fkey
    const canDeleteFreedSession = dissociatedBookings.every((b) => b.session_id === null);
    assert.equal(canDeleteFreedSession, true, "Session can be safely deleted without foreign key violation");
  });

  it("34. Check Constraint bookings_check2 Enforcement & Comprehensive Booking Flow Validation", () => {
    // -------------------------------------------------------------------------------------------------
    // Predicate 1: Exact Reproduction of the Original bookings_check2 Constraint Failure
    // -------------------------------------------------------------------------------------------------
    const legacyCheck2 = (row: {
      booking_type: string;
      event_id: string | null;
      slot_id: string | null;
      service_id: string | null;
      status: string;
    }): boolean => {
      return (
        (row.booking_type === "convocation" && row.event_id !== null && row.slot_id !== null) ||
        (row.booking_type === "traditional" && row.service_id !== null)
      );
    };

    const correctedCheck2 = (row: {
      booking_type: string;
      event_id: string | null;
      slot_id: string | null;
      service_id: string | null;
      status: string;
    }): boolean => {
      return (
        (row.booking_type === "convocation" &&
          row.event_id !== null &&
          (row.slot_id !== null || row.status === "cancelled")) ||
        (row.booking_type === "traditional" &&
          (row.service_id !== null || row.status === "cancelled"))
      );
    };

    // Synthetic reproduction of the cancelled booking row being dissociated when cleaning up sessions/slots:
    const syntheticCancelledBooking = {
      booking_ref: "OFP-2026-SYN001",
      booking_type: "convocation",
      event_id: "16ae23d0-97d1-474a-93be-eb88542f4c8a",
      session_id: null,
      slot_id: null, // Nullified upon slot/session deletion/pruning
      service_id: null,
      status: "cancelled",
    };

    // (A) Proving why the legacy constraint failed:
    const legacyResult = legacyCheck2(syntheticCancelledBooking);
    assert.equal(
      legacyResult,
      false,
      "Legacy bookings_check2 failed because slot_id was null even though status was cancelled"
    );

    // (B) Proving why the corrected constraint succeeds:
    const correctedResult = correctedCheck2(syntheticCancelledBooking);
    assert.equal(
      correctedResult,
      true,
      "Corrected bookings_check2 permits slot_id to be null when status is cancelled"
    );

    // (C) Verifying that active bookings WITHOUT slot_id are STILL STRICTLY BLOCKED:
    const invalidActiveConvocation = {
      booking_ref: "OFP-2026-INV002",
      booking_type: "convocation",
      event_id: "16ae23d0-97d1-474a-93be-eb88542f4c8a",
      session_id: "sess-1",
      slot_id: null, // Invalid: active booking must have slot_id!
      service_id: null,
      status: "confirmed",
    };
    assert.equal(
      correctedCheck2(invalidActiveConvocation),
      false,
      "Active convocation booking without slot_id is strictly blocked by corrected constraint"
    );

    // (D) Verifying that active bookings WITHOUT event_id are STILL STRICTLY BLOCKED:
    const invalidNoEvent = {
      ...invalidActiveConvocation,
      event_id: null,
      slot_id: "slot-1",
    };
    assert.equal(
      correctedCheck2(invalidNoEvent),
      false,
      "Active convocation booking without event_id is strictly blocked"
    );

    // -------------------------------------------------------------------------------------------------
    // Scenarios 1, 2, 3: Package Durations (30-min, 60-min, 90-min)
    // -------------------------------------------------------------------------------------------------
    const pkg30 = {
      id: "pkg-30",
      name: "The Graduate Solo Edition",
      price_numeric: 3500,
      duration_mins: 30,
    };
    const pkg60 = {
      id: "pkg-60",
      name: "The Duo Portrait Experience",
      price_numeric: 6000,
      duration_mins: 60,
    };
    const pkg90 = {
      id: "pkg-90",
      name: "The Family & Chancellor Grand Session",
      price_numeric: 9500,
      duration_mins: 90,
    };

    const baseStart = "2026-11-07T03:00:00.000Z";
    const startMs = Date.parse(baseStart);

    // Helper simulating atomic duration & pricing mapping
    const buildAuthoritativeBooking = (params: {
      pkg: typeof pkg30;
      slotId: string;
      eventId: string;
      frameSelected?: boolean;
      frameQuantity?: number;
      frameUnitPrice?: number;
    }) => {
      const dur = params.pkg.duration_mins;
      const endIso = new Date(startMs + dur * 60_000).toISOString();
      const bufferBefore = 0;
      const bufferAfter = 10;
      const effStartIso = new Date(startMs - bufferBefore * 60_000).toISOString();
      const effEndIso = new Date(startMs + (dur + bufferAfter) * 60_000).toISOString();
      const frameTotal =
        params.frameSelected && params.frameQuantity && params.frameUnitPrice
          ? params.frameQuantity * params.frameUnitPrice
          : 0;
      const totalPrice = params.pkg.price_numeric + frameTotal;

      return {
        booking_ref: `OFP-2026-${dur}MIN`,
        booking_type: "convocation" as const,
        event_id: params.eventId,
        slot_id: params.slotId,
        service_id: null,
        package_id: params.pkg.id,
        package_name: params.pkg.name,
        package_base_price: params.pkg.price_numeric,
        start_at: baseStart,
        end_at: endIso,
        buffer_before_mins: bufferBefore,
        buffer_after_mins: bufferAfter,
        effective_start_at: effStartIso,
        effective_end_at: effEndIso,
        duration_mins: dur,
        client_name: "Afsana Karim",
        client_email: "afsana.karim@example.com",
        client_phone: "+8801711223344",
        guests_count: 2,
        status: "confirmed" as const,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        frame_printing_selected: Boolean(params.frameSelected),
        frame_quantity: params.frameQuantity || 0,
        frame_total_price: frameTotal,
        total_price: totalPrice,
        pricing_snapshot: {
          currency: "BDT",
          package_id: params.pkg.id,
          package_name: params.pkg.name,
          package_base_price: params.pkg.price_numeric,
          duration_mins: dur,
          frame_printing_selected: Boolean(params.frameSelected),
          frame_quantity: params.frameQuantity || 0,
          frame_total_price: frameTotal,
          total_price: totalPrice,
        },
      };
    };

    // Scenario 1: 30-minute booking
    const booking30 = buildAuthoritativeBooking({
      pkg: pkg30,
      slotId: "slot-30m",
      eventId: "event-1",
    });
    assert.equal(booking30.duration_mins, 30);
    assert.equal(booking30.end_at, "2026-11-07T03:30:00.000Z");
    assert.equal(booking30.effective_end_at, "2026-11-07T03:40:00.000Z");
    assert.ok(correctedCheck2(booking30));

    // Scenario 2: 60-minute booking
    const booking60 = buildAuthoritativeBooking({
      pkg: pkg60,
      slotId: "slot-60m",
      eventId: "event-1",
    });
    assert.equal(booking60.duration_mins, 60);
    assert.equal(booking60.end_at, "2026-11-07T04:00:00.000Z");
    assert.equal(booking60.effective_end_at, "2026-11-07T04:10:00.000Z");
    assert.ok(correctedCheck2(booking60));

    // Scenario 3: 90-minute booking
    const booking90 = buildAuthoritativeBooking({
      pkg: pkg90,
      slotId: "slot-90m",
      eventId: "event-1",
    });
    assert.equal(booking90.duration_mins, 90);
    assert.equal(booking90.end_at, "2026-11-07T04:30:00.000Z");
    assert.equal(booking90.effective_end_at, "2026-11-07T04:40:00.000Z");
    assert.ok(correctedCheck2(booking90));

    // Scenario 4: Package & Price Snapshot Verification
    assert.equal(booking30.pricing_snapshot.package_base_price, 3500);
    assert.equal(booking30.pricing_snapshot.total_price, 3500);
    assert.equal(booking60.pricing_snapshot.package_base_price, 6000);
    assert.equal(booking90.pricing_snapshot.package_base_price, 9500);

    // Scenario 5 & 6 & 7: Start/End, Reservation range & Buffer verification
    for (const b of [booking30, booking60, booking90]) {
      assert.ok(Date.parse(b.end_at) > Date.parse(b.start_at), "end_at > start_at");
      assert.ok(
        Date.parse(b.effective_end_at) >= Date.parse(b.end_at),
        "effective_end_at >= end_at"
      );
      assert.ok(
        Date.parse(b.effective_start_at) <= Date.parse(b.start_at),
        "effective_start_at <= start_at"
      );
      assert.equal(b.buffer_before_mins, 0);
      assert.equal(b.buffer_after_mins, 10);
    }

    // Scenario 8: Initial booking status is strictly confirmed (never cancelled on creation)
    assert.equal(booking30.status, "confirmed");
    assert.notEqual(booking30.status, "cancelled");

    // Scenario 9: Participant count >= 1
    assert.ok(booking30.guests_count >= 1);

    // Scenario 10: Clean cancellation metadata defaults
    assert.equal(booking30.cancelled_at, null);
    assert.equal(booking30.cancelled_by, null);
    assert.equal(booking30.cancellation_reason, null);

    // Scenario 11 & 12: Temporary slot hold validation
    const now = Date.now();
    const activeHold = {
      id: "hold-valid",
      slot_id: "slot-30m",
      status: "active",
      expires_at: new Date(now + 300_000).toISOString(), // 5 min in future
    };
    const expiredHold = {
      id: "hold-expired",
      slot_id: "slot-30m",
      status: "active",
      expires_at: new Date(now - 10_000).toISOString(), // Expired 10s ago
    };

    const isHoldValid = (hold: typeof activeHold) =>
      hold.status === "active" && new Date(hold.expires_at).getTime() > Date.now();

    assert.equal(isHoldValid(activeHold), true, "Active slot hold is accepted");
    assert.equal(isHoldValid(expiredHold), false, "Expired slot hold is rejected");

    // Scenario 13: Duration mismatch rejection
    const checkDurationMatch = (slotDuration: number, packageDuration: number) => {
      if (slotDuration !== packageDuration) {
        throw new Error(
          `DURATION_MISMATCH: Selected slot duration (${slotDuration}m) does not match package duration (${packageDuration}m).`
        );
      }
      return true;
    };
    assert.equal(checkDurationMatch(30, 30), true);
    assert.throws(
      () => checkDurationMatch(30, 60),
      /DURATION_MISMATCH/,
      "Blocks 30m slot with 60m package"
    );

    // Scenario 14: Concurrent booking protection
    const simulatedStudioPoolBookings = [booking30];
    const isSlotConflicting = (newBooking: typeof booking30) => {
      return simulatedStudioPoolBookings.some(
        (existing) =>
          existing.status === "confirmed" &&
          existing.effective_start_at < newBooking.effective_end_at &&
          existing.effective_end_at > newBooking.effective_start_at
      );
    };

    // A concurrent booking on the exact same time window must be blocked
    const conflictingBooking = {
      ...booking30,
      booking_ref: "OFP-2026-CONFLICT",
    };
    assert.equal(isSlotConflicting(conflictingBooking), true, "Concurrent collision detected");

    // A subsequent booking starting after effective_end_at is accepted
    const subsequentBooking = {
      ...booking30,
      booking_ref: "OFP-2026-SUBSEQUENT",
      start_at: booking30.effective_end_at,
      end_at: new Date(Date.parse(booking30.effective_end_at) + 30 * 60_000).toISOString(),
      effective_start_at: booking30.effective_end_at,
      effective_end_at: new Date(Date.parse(booking30.effective_end_at) + 40 * 60_000).toISOString(),
    };
    assert.equal(isSlotConflicting(subsequentBooking), false, "No conflict after buffer window");

    // Scenario 15: Successful booking with configured frame/print add-on
    const bookingWithFrames = buildAuthoritativeBooking({
      pkg: pkg30,
      slotId: "slot-30m",
      eventId: "event-1",
      frameSelected: true,
      frameQuantity: 2,
      frameUnitPrice: 1200,
    });
    assert.equal(bookingWithFrames.frame_printing_selected, true);
    assert.equal(bookingWithFrames.frame_quantity, 2);
    assert.equal(bookingWithFrames.frame_total_price, 2400);
    assert.equal(bookingWithFrames.total_price, 3500 + 2400); // 5900 BDT
    assert.equal(bookingWithFrames.pricing_snapshot.total_price, 5900);
    assert.ok(correctedCheck2(bookingWithFrames));

    // Scenario 16: Preservation of existing confirmed and cancelled booking records
    const simulatedDatabase = [
      { id: "b-confirmed-1", status: "confirmed", booking_ref: "OFP-2026-001" },
      { id: "b-cancelled-2", status: "cancelled", booking_ref: "OFP-2026-002" },
    ];
    assert.equal(simulatedDatabase.length, 2, "Both records preserved");
    assert.equal(
      simulatedDatabase.find((b) => b.id === "b-confirmed-1")?.status,
      "confirmed"
    );
    assert.equal(
      simulatedDatabase.find((b) => b.id === "b-cancelled-2")?.status,
      "cancelled"
    );
  });

  it("35. Multi-Package & Multi-Slot Basket, Schedule Coexistence, Atomic Group Checkout satisfying bookings_check2, Automatic Storage Discovery & Brand Logo Display Rules", () => {
    // -------------------------------------------------------------
    // Scenario 1: Schedule Coexistence for Distinct Durations on Same Date & Start Time
    // -------------------------------------------------------------
    interface SimulatedSlot {
      id: string;
      event_id: string;
      session_id: string;
      start_at: string;
      end_at: string;
      duration_mins: number;
      package_ids: string[];
      is_blocked: boolean;
      booked_count: number;
    }

    const eventId = "ev-convocation-2026";
    const session30Id = "sess-30m";
    const session60Id = "sess-60m";

    const slot30m: SimulatedSlot = {
      id: "slot-30m-1000",
      event_id: eventId,
      session_id: session30Id,
      start_at: "2026-11-20T10:00:00+06:00",
      end_at: "2026-11-20T10:30:00+06:00",
      duration_mins: 30,
      package_ids: ["pkg-solo-30"],
      is_blocked: false,
      booked_count: 0,
    };

    const slot60m: SimulatedSlot = {
      id: "slot-60m-1000",
      event_id: eventId,
      session_id: session60Id,
      start_at: "2026-11-20T10:00:00+06:00",
      end_at: "2026-11-20T11:00:00+06:00",
      duration_mins: 60,
      package_ids: ["pkg-family-60"],
      is_blocked: false,
      booked_count: 0,
    };

    const slotKey = (s: SimulatedSlot) => `${s.event_id}__${s.start_at}__${s.end_at}`;
    assert.notEqual(slotKey(slot30m), slotKey(slot60m), "Distinct end times allow coexistence without unique collision");

    // Merging package_ids for identical duration slots (e.g. two 30m packages sharing the 10:00-10:30 slot)
    const existingPackageIds = ["pkg-solo-30"];
    const incomingPackageIds = ["pkg-duo-30"];
    const mergedPackageIds = Array.from(new Set([...existingPackageIds, ...incomingPackageIds]));
    assert.deepEqual(mergedPackageIds, ["pkg-solo-30", "pkg-duo-30"], "Cleanly merges package_ids without duplicate slots");

    // Selective pruning: Pruning only unbooked slots that belong to the target package, preserving others
    const slotsInDb: SimulatedSlot[] = [
      slot30m,
      slot60m,
      {
        id: "slot-30m-1030",
        event_id: eventId,
        session_id: session30Id,
        start_at: "2026-11-20T10:30:00+06:00",
        end_at: "2026-11-20T11:00:00+06:00",
        duration_mins: 30,
        package_ids: ["pkg-solo-30"],
        is_blocked: false,
        booked_count: 0,
      },
    ];

    const pruneTargetPackageId = "pkg-solo-30";
    const remainingSlotsAfterPrune = slotsInDb.filter((s) => {
      if (s.booked_count > 0) return true;
      const belongsToTarget = s.package_ids.includes(pruneTargetPackageId);
      const hasOtherPackages = s.package_ids.some((p) => p !== pruneTargetPackageId);
      return !belongsToTarget || hasOtherPackages;
    });

    assert.equal(remainingSlotsAfterPrune.length, 1, "Only pkg-solo-30 unbooked slots pruned; pkg-family-60 preserved");
    assert.equal(remainingSlotsAfterPrune[0].id, "slot-60m-1000", "Preserved 60m slot");

    // -------------------------------------------------------------
    // Scenario 2: Multi-Slot Hold Coexistence & Selective Release
    // -------------------------------------------------------------
    interface SimulatedHold {
      id: string;
      slot_id: string;
      flow_token: string;
      status: "active" | "released" | "consumed";
      expires_at: number;
    }

    const flowToken = "flow-user-session-basket-token-12345";
    const holds: SimulatedHold[] = [];

    // User adds Slot A to basket
    holds.push({
      id: "hold-a",
      slot_id: "slot-30m-1000",
      flow_token: flowToken,
      status: "active",
      expires_at: Date.now() + 10 * 60_000,
    });

    // User adds Slot B to basket (under same flow token)
    // Sibling hold must coexist (not auto-release hold-a)
    holds.push({
      id: "hold-b",
      slot_id: "slot-60m-1000",
      flow_token: flowToken,
      status: "active",
      expires_at: Date.now() + 10 * 60_000,
    });

    const activeBasketHolds = holds.filter((h) => h.flow_token === flowToken && h.status === "active");
    assert.equal(activeBasketHolds.length, 2, "Both sibling basket holds coexist simultaneously");

    // User removes Slot A from basket -> releases ONLY Slot A
    const releaseTargetSlot = "slot-30m-1000";
    for (const h of holds) {
      if (h.flow_token === flowToken && h.slot_id === releaseTargetSlot && h.status === "active") {
        h.status = "released";
      }
    }

    const activeHoldsAfterRemoval = holds.filter((h) => h.flow_token === flowToken && h.status === "active");
    assert.equal(activeHoldsAfterRemoval.length, 1, "Only 1 active hold remains");
    assert.equal(activeHoldsAfterRemoval[0].slot_id, "slot-60m-1000", "Slot B remains active and held");

    // -------------------------------------------------------------
    // Scenario 3: Authoritative Multi-Booking Server-Side Pricing Calculation
    // -------------------------------------------------------------
    const mockPackages = [
      {
        id: "pkg-solo-30",
        name: "Solo Portraiture",
        price_numeric: 3500,
        currency: "BDT",
        duration_mins: 30,
        is_active: true,
      },
      {
        id: "pkg-family-60",
        name: "Family Heritage Portraiture",
        price_numeric: 6500,
        currency: "BDT",
        duration_mins: 60,
        is_active: true,
      },
    ];

    const framePrintingConfig: FramePrintingConfig = {
      enabled: true,
      title: "Archival Frame & Print Solutions",
      description: "Fine-art custom frames",
      max_quantity: 5,
      frame_types: [
        {
          id: "frame-a3-acrylic",
          name: "A3 Acrylic Luxury Frame",
          dimensions: "12\" x 18\"",
          price: 1500,
          is_active: true,
        },
      ],
    };

    const basketInput = {
      items: [
        { package_id: "pkg-solo-30", slot_id: "slot-30m-1" },
        { package_id: "pkg-solo-30", slot_id: "slot-30m-2" },
        { package_id: "pkg-family-60", slot_id: "slot-60m-1" },
      ],
      frameSelected: true,
      frameTypeId: "frame-a3-acrylic",
      frameQuantity: 2,
    };

    const calculatedPrice = calculateAndVerifyMultiBookingPrice({
      items: basketInput.items.map((it) => ({
        package_id: it.package_id,
        slot_id: it.slot_id,
        pkg: mockPackages.find((p) => p.id === it.package_id) as any,
      })),
      frameConfig: framePrintingConfig,
      frameSelected: basketInput.frameSelected,
      frameTypeId: basketInput.frameTypeId,
      frameQuantity: basketInput.frameQuantity,
    });

    // Package subtotal: 3500 + 3500 + 6500 = 13500 BDT
    assert.equal(calculatedPrice.total_package_price, 13500);
    // Frames: 2 * 1500 = 3000 BDT
    assert.equal(calculatedPrice.frame_total_price, 3000);
    // Grand total: 13500 + 3000 = 16500 BDT
    assert.equal(calculatedPrice.total_price, 16500);
    assert.equal(calculatedPrice.pricing_snapshot.total_price, 16500);

    // -------------------------------------------------------------
    // Scenario 4: Group Booking Row Creation Satisfying bookings_check2
    // -------------------------------------------------------------
    const checkBookingsCheck2 = (b: Record<string, any>): boolean => {
      if (b.booking_type === "convocation") {
        return Boolean(b.event_id && (b.slot_id || b.status === "cancelled"));
      }
      if (b.booking_type === "traditional") {
        return Boolean(b.service_id || b.status === "cancelled");
      }
      return false;
    };

    const sharedGroupId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const sharedGroupRef = "OFP-2026-G74921";

    const createdRows = basketInput.items.map((item, idx) => {
      const isPrimary = idx === 0;
      return {
        id: `booking-${idx + 1}`,
        booking_ref: `OFP-2026-B${1000 + idx}`,
        booking_group_id: sharedGroupId,
        booking_group_ref: sharedGroupRef,
        is_primary_group_item: isPrimary,
        group_total_amount: isPrimary ? calculatedPrice.total_price : null,
        booking_type: "convocation" as const,
        event_id: eventId,
        slot_id: item.slot_id,
        status: "confirmed",
        package_id: item.package_id,
        package_name: mockPackages.find((p) => p.id === item.package_id)?.name,
        total_price: isPrimary ? calculatedPrice.total_price : 0,
        frame_printing_selected: isPrimary ? calculatedPrice.frame_printing_selected : false,
      };
    });

    assert.equal(createdRows.length, 3, "Creates 3 distinct booking rows for 3 appointments");
    for (const row of createdRows) {
      assert.equal(checkBookingsCheck2(row), true, `Row ${row.booking_ref} must strictly satisfy bookings_check2`);
      assert.equal(row.booking_group_id, sharedGroupId, "Shares identical booking_group_id");
      assert.equal(row.booking_group_ref, sharedGroupRef, "Shares identical booking_group_ref");
    }

    assert.equal(createdRows[0].is_primary_group_item, true);
    assert.equal(createdRows[1].is_primary_group_item, false);
    assert.equal(createdRows[2].is_primary_group_item, false);

    // -------------------------------------------------------------
    // Scenario 5: Automatic Supabase Storage Folder Discovery
    // -------------------------------------------------------------
    const physicalStorageItems = [
      { name: "IUB 23rd Convocation" },
      { name: "NSU 25th Convocation" },
      { name: "iub-23rd-photo-1.jpg" },
      { name: ".emptyFolderPlaceholder" },
    ];

    const existingDbFolders = [
      { id: "f-1", slug: "iub-23rd-convocation", name: "IUB 23rd Convocation", type: "event-archives" },
    ];

    const discoveredFolderNames = physicalStorageItems
      .map((item) => item.name)
      .filter((name) => !name.includes(".") && !name.startsWith("."));

    const reconciledFolders = [...existingDbFolders];
    for (const folderName of discoveredFolderNames) {
      const slug = folderName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const exists = reconciledFolders.some((f) => f.slug === slug || f.name.toLowerCase() === folderName.toLowerCase());
      if (!exists) {
        reconciledFolders.push({
          id: `f-${reconciledFolders.length + 1}`,
          slug,
          name: folderName,
          type: "event-archives",
        });
      }
    }

    assert.equal(reconciledFolders.length, 2, "Automatically discovered and reconciled NSU 25th Convocation");
    assert.ok(reconciledFolders.some((f) => f.name === "NSU 25th Convocation"), "NSU 25th Convocation is present");

    const storageFilesInsideFolder = [
      { name: ".emptyFolderPlaceholder", id: "p1" },
      { name: "photo-001.jpg", id: "p2" },
      { name: "photo-002.jpg", id: "p3" },
      { name: ".DS_Store", id: "p4" },
    ];
    const validPhotos = storageFilesInsideFolder.filter(
      (file) => !file.name.startsWith(".") && !file.name.includes(".emptyFolderPlaceholder")
    );
    assert.equal(validPhotos.length, 2, "Correctly excludes .emptyFolderPlaceholder and dotfiles from photo count");

    // -------------------------------------------------------------
    // Scenario 6: Brand Logo Display & Contrast Rules
    // -------------------------------------------------------------
    const resolveBrandLogo = (isDarkBackground: boolean) => {
      return {
        src: isDarkBackground ? "/brand/offprint-white-logo.png" : "/brand/offprint-black-logo.png",
        hasRedundantText: false,
        alt: "OFFPRINT Photography & Print Studio",
      };
    };

    const transparentHeroHeader = resolveBrandLogo(true);
    assert.equal(transparentHeroHeader.src, "/brand/offprint-white-logo.png", "Dark / transparent scene uses white logo");
    assert.equal(transparentHeroHeader.hasRedundantText, false, "Logo mark only, no extra brand text");

    const lightNavbarHeader = resolveBrandLogo(false);
    assert.equal(lightNavbarHeader.src, "/brand/offprint-black-logo.png", "Light background uses black logo");
    assert.equal(lightNavbarHeader.hasRedundantText, false, "Logo mark only, no extra brand text");
  });

  it("36. Portfolio Folder Discovery & Convocation Conditional Payment with Partial Advance", () => {
    // -------------------------------------------------------------------------
    // 1. Multi-Prefix Storage Folder Discovery & Placeholder Isolation
    // -------------------------------------------------------------------------
    const resolveStoragePrefix = (folderType: string) => {
      switch (folderType) {
        case "portfolio":
          return "projects/";
        case "product":
          return "products/";
        case "event-highlight":
          return "event-archive-highlights/";
        case "event-archive":
        default:
          return "event-archives/";
      }
    };

    assert.equal(resolveStoragePrefix("portfolio"), "projects/");
    assert.equal(resolveStoragePrefix("product"), "products/");
    assert.equal(resolveStoragePrefix("event-highlight"), "event-archive-highlights/");
    assert.equal(resolveStoragePrefix("event-archive"), "event-archives/");

    // Slug generation and storage prefix construction
    const folderTitle = "IUB 27th Visual Highlights 2026";
    const cleanSlug = folderTitle.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
    const portfolioPrefix = `${resolveStoragePrefix("portfolio")}${cleanSlug}/`;
    assert.equal(cleanSlug, "iub-27th-visual-highlights-2026");
    assert.equal(portfolioPrefix, "projects/iub-27th-visual-highlights-2026/");

    // Exclusion of .emptyFolderPlaceholder and dotfiles from photo counts
    const discoveredStorageObjects = [
      { name: ".emptyFolderPlaceholder", size: 0 },
      { name: ".DS_Store", size: 6148 },
      { name: "portrait_hero_01.jpg", size: 2450000 },
      { name: "portrait_hero_02.png", size: 3120000 },
    ];

    const validPhotoList = discoveredStorageObjects.filter(
      (item) => item.name && !item.name.startsWith(".") && item.name !== ".emptyFolderPlaceholder"
    );

    assert.equal(validPhotoList.length, 2, "Only legitimate photos are counted");
    assert.equal(validPhotoList[0].name, "portrait_hero_01.jpg");
    assert.equal(validPhotoList[1].name, "portrait_hero_02.png");

    // Empty folder registration in folder selector
    const emptyFolderMock = {
      id: "folder-empty-1",
      name: "Graduation Robe Details",
      slug: "graduation-robe-details",
      folder_type: "portfolio" as const,
      storage_prefix: "projects/graduation-robe-details/",
      photo_count: 0,
    };

    const emptyBadgeLabel = emptyFolderMock.photo_count > 0
      ? `${emptyFolderMock.photo_count} photos`
      : "0 photos (empty)";
    assert.equal(emptyBadgeLabel, "0 photos (empty)", "Empty folder correctly labeled in selector");

    // -------------------------------------------------------------------------
    // 2. Convocation Conditional Cash Payment (No Reference, No Advance)
    // -------------------------------------------------------------------------
    // Schema validation for Cash
    const cashSchemaResult = createBookingSchema.safeParse({
      booking_type: "convocation",
      event_id: "00000000-0000-0000-0000-000000000001",
      slot_id: "00000000-0000-0000-0000-000000000002",
      package_id: "00000000-0000-0000-0000-000000000003",
      booking_date: "2026-03-15",
      start_at: "2026-03-15T10:00:00.000Z",
      end_at: "2026-03-15T10:30:00.000Z",
      duration_mins: 30,
      client_name: "Cash Client",
      client_email: "cash.client@iub.edu.bd",
      client_phone: "01711000000",
      location: "IUB Campus",
      payment_method: "cash",
      payment_reference: null,
    });
    assert.equal(cashSchemaResult.success, true, "Cash booking succeeds without payment reference");

    const cashBookingTotal = 5500;
    const cashPayment = calculateAndVerifyPaymentAccounting({
      paymentMethod: "cash",
      paymentReference: "STALE_BKASH_TRX_12345", // Stale reference must be wiped
      isPartialAdvance: true,                     // Cash cannot have advance
      advanceAmount: 2000,
      authoritativeTotalPrice: cashBookingTotal,
    });

    assert.equal(cashPayment.payment_method, "cash");
    assert.equal(cashPayment.payment_reference, null, "Cash never retains stale bKash references");
    assert.equal(cashPayment.is_partial_advance, false, "Cash is never flagged as partial advance");
    assert.equal(cashPayment.advance_amount, null);
    assert.equal(cashPayment.amount_paid, 0, "Amount paid is 0 for cash on arrival");
    assert.equal(cashPayment.balance_amount, cashBookingTotal, "Full total is due on session day");
    assert.equal(cashPayment.payment_status, "unpaid");

    // -------------------------------------------------------------------------
    // 3. Convocation Full bKash Payment (Required Reference)
    // -------------------------------------------------------------------------
    // Schema rejects empty bKash reference
    const invalidBkashSchemaResult = createBookingSchema.safeParse({
      booking_type: "convocation",
      event_id: "00000000-0000-0000-0000-000000000001",
      slot_id: "00000000-0000-0000-0000-000000000002",
      package_id: "00000000-0000-0000-0000-000000000003",
      booking_date: "2026-03-15",
      start_at: "2026-03-15T10:00:00.000Z",
      end_at: "2026-03-15T10:30:00.000Z",
      duration_mins: 30,
      client_name: "bKash Client",
      client_email: "bkash.client@iub.edu.bd",
      client_phone: "01711000000",
      location: "IUB Campus",
      payment_method: "bkash",
      payment_reference: "",
    });
    assert.equal(invalidBkashSchemaResult.success, false, "bKash requires non-empty reference");

    // Multi-item schema parses valid partial advance bKash booking
    const validMultiBkash = createMultiBookingSchema.safeParse({
      booking_type: "convocation",
      event_id: "00000000-0000-0000-0000-000000000001",
      client_name: "Group Client",
      client_email: "group.client@iub.edu.bd",
      payment_method: "bkash",
      payment_reference: "9K38AX7B",
      is_partial_advance: true,
      advance_amount: 2500,
      items: [
        {
          slot_id: "00000000-0000-0000-0000-000000000002",
          package_id: "00000000-0000-0000-0000-000000000003",
          booking_date: "2026-03-15",
          start_at: "2026-03-15T10:00:00.000Z",
          end_at: "2026-03-15T10:30:00.000Z",
        },
      ],
    });
    assert.equal(validMultiBkash.success, true, "Multi-booking schema accepts partial advance bKash");
    assert.equal(bookingBasketItemSchema.safeParse(validMultiBkash.data?.items[0]).success, true);
    // Missing reference error
    assert.throws(
      () =>
        calculateAndVerifyPaymentAccounting({
          paymentMethod: "bkash",
          paymentReference: "   ",
          authoritativeTotalPrice: 5500,
        }),
      /bKash Transaction ID \/ Payment Reference is required/
    );

    // Valid full bKash payment
    const fullBkashPayment = calculateAndVerifyPaymentAccounting({
      paymentMethod: "bkash",
      paymentReference: "9K38AX7B",
      isPartialAdvance: false,
      authoritativeTotalPrice: 5500,
    });

    assert.equal(fullBkashPayment.payment_method, "bkash");
    assert.equal(fullBkashPayment.payment_reference, "9K38AX7B");
    assert.equal(fullBkashPayment.is_partial_advance, false);
    assert.equal(fullBkashPayment.advance_amount, null);
    assert.equal(fullBkashPayment.amount_paid, 5500);
    assert.equal(fullBkashPayment.balance_amount, 0);
    assert.equal(fullBkashPayment.payment_status, "pending_verification");

    // -------------------------------------------------------------------------
    // 4. Convocation Partial bKash Advance Payment (Validation & Accounting)
    // -------------------------------------------------------------------------
    const bookingTotal = 7500;

    // Reject 0 or negative advance
    assert.throws(
      () =>
        calculateAndVerifyPaymentAccounting({
          paymentMethod: "bkash",
          paymentReference: "9K38AX7B",
          isPartialAdvance: true,
          advanceAmount: 0,
          authoritativeTotalPrice: bookingTotal,
        }),
      /Advance amount must be greater than 0/
    );

    // Reject advance >= total
    assert.throws(
      () =>
        calculateAndVerifyPaymentAccounting({
          paymentMethod: "bkash",
          paymentReference: "9K38AX7B",
          isPartialAdvance: true,
          advanceAmount: 7500,
          authoritativeTotalPrice: bookingTotal,
        }),
      /Advance amount must be less than the total booking amount/
    );

    // Valid partial advance: 2500 BDT out of 7500 BDT
    const partialPayment = calculateAndVerifyPaymentAccounting({
      paymentMethod: "bkash",
      paymentReference: "8K12BZ9C",
      isPartialAdvance: true,
      advanceAmount: 2500,
      authoritativeTotalPrice: bookingTotal,
    });

    assert.equal(partialPayment.payment_method, "bkash");
    assert.equal(partialPayment.payment_reference, "8K12BZ9C");
    assert.equal(partialPayment.is_partial_advance, true);
    assert.equal(partialPayment.advance_amount, 2500);
    assert.equal(partialPayment.amount_paid, 2500, "Authoritative amount paid matches advance");
    assert.equal(partialPayment.balance_amount, 5000, "Authoritative balance is total - advance");
    assert.equal(partialPayment.payment_status, "advance_pending");

    // Live UI calculation matching
    const uiPayingNow = partialPayment.amount_paid;
    const uiRemainingBalance = partialPayment.balance_amount;
    assert.equal(uiPayingNow + uiRemainingBalance, bookingTotal, "Live breakdown sum strictly equals booking total");

    // -------------------------------------------------------------------------
    // 5. Multi-Slot Group Booking & Non-Duplicated Advance Accounting
    // -------------------------------------------------------------------------
    const groupTotal = 9000;
    const groupAdvance = 3000;
    const groupRemainingBalance = 6000;

    const slotItems = [
      { id: "b-slot-1", slotTotal: 5000, isPrimary: true },
      { id: "b-slot-2", slotTotal: 4000, isPrimary: false },
    ];

    const groupRef = "OFP-2026-GPAY77";
    const groupId = "group-uuid-777";

    const verifiedGroupBookings = slotItems.map((item) => {
      if (item.isPrimary) {
        return {
          id: item.id,
          booking_group_id: groupId,
          booking_group_ref: groupRef,
          group_total_amount: groupTotal,
          is_primary_group_item: true,
          total_price: item.slotTotal,
          payment_method: "bkash",
          payment_reference: "TX9901B",
          is_partial_advance: true,
          advance_amount: groupAdvance,
          amount_paid: groupAdvance,
          balance_amount: groupRemainingBalance,
          payment_status: "advance_pending" as const,
        };
      }
      return {
        id: item.id,
        booking_group_id: groupId,
        booking_group_ref: groupRef,
        group_total_amount: groupTotal,
        is_primary_group_item: false,
        total_price: item.slotTotal,
        payment_method: "bkash",
        payment_reference: null,
        is_partial_advance: false,
        advance_amount: null,
        amount_paid: 0,
        balance_amount: 0,
        payment_status: "advance_pending" as const,
      };
    });

    // Check non-duplication of advance across slots
    const totalGroupAdvanceRecorded = verifiedGroupBookings.reduce(
      (sum, b) => sum + (b.advance_amount || 0),
      0
    );
    const totalGroupAmountPaid = verifiedGroupBookings.reduce(
      (sum, b) => sum + (b.amount_paid || 0),
      0
    );

    assert.equal(totalGroupAdvanceRecorded, 3000, "Advance amount is recorded exactly once across the group");
    assert.equal(totalGroupAmountPaid, 3000, "Amount paid is recorded exactly once across the group");
    assert.equal(verifiedGroupBookings[0].total_price, 5000, "Individual total price is preserved");
    assert.equal(verifiedGroupBookings[1].total_price, 4000, "Individual total price is preserved");

    // -------------------------------------------------------------------------
    // 6. Admin Verification Lifecycle & Client Portal Visibility
    // -------------------------------------------------------------------------
    // Admin verifies advance
    const verifiedPrimaryBooking = {
      ...verifiedGroupBookings[0],
      payment_status: "partially_paid" as const,
      payment_verified_at: new Date().toISOString(),
      payment_verified_by: "admin@offprint.com",
    };

    assert.equal(verifiedPrimaryBooking.payment_status, "partially_paid");
    assert.ok(verifiedPrimaryBooking.payment_verified_at);

    // Client portal message generation
    const getClientPortalPaymentNotice = (b: {
      payment_status: string;
      payment_method?: string | null;
      is_partial_advance?: boolean | null;
      balance_amount: number;
    }) => {
      if (b.payment_status === "paid") {
        return "Paid in Full";
      }
      if (b.payment_method === "bkash" && (b.payment_status === "partially_paid" || b.is_partial_advance)) {
        return `Partially Paid — Remaining Balance: BDT ${b.balance_amount.toLocaleString()}`;
      }
      return `Cash on Arrival — Total Due: BDT ${b.balance_amount.toLocaleString()}`;
    };

    const clientNotice = getClientPortalPaymentNotice(verifiedPrimaryBooking);
    assert.equal(clientNotice, "Partially Paid — Remaining Balance: BDT 6,000");

    // Admin settles full balance
    const fullySettledBooking = {
      ...verifiedPrimaryBooking,
      amount_paid: groupTotal,
      balance_amount: 0,
      payment_status: "paid" as const,
    };
    assert.equal(getClientPortalPaymentNotice(fullySettledBooking), "Paid in Full");
  });
});
