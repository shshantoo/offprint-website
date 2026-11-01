import {
  addMinutesToISO,
  dhakaDateTimeToISO,
  getDhakaDayOfWeek,
  normalizeTimeHHMM,
} from "./timezone";

export interface BreakPeriod {
  name: string;
  start_time: string; // "13:00"
  end_time: string; // "14:00"
}

export interface SchedulePackageConfig {
  id: string;
  name: string;
  duration_mins: number;
  price?: number;
}

export interface ScheduleConfig {
  start_date: string; // "YYYY-MM-DD"
  end_date: string; // "YYYY-MM-DD"
  operating_days: number[]; // e.g. [0, 1, 2, 3, 4, 5, 6]
  operating_start_time: string; // "09:00"
  operating_end_time: string; // "18:00"
  slot_duration_mins: number; // e.g. 20
  slot_interval_mins: number; // e.g. 30
  capacity_per_slot: number; // e.g. 1
  buffer_before_mins?: number; // e.g. 0
  buffer_after_mins?: number; // e.g. 10
  break_periods?: BreakPeriod[];
  packages?: SchedulePackageConfig[];
}

export interface ProposedSlot {
  slot_date: string;
  start_time: string;
  end_time: string;
  start_at: string;
  end_at: string;
  effective_start_at: string;
  effective_end_at: string;
  capacity: number;
  duration_mins: number;
  package_ids: string[];
}

export interface ProposedSession {
  session_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_mins: number;
  capacity_per_slot: number;
  buffer_before_mins: number;
  buffer_after_mins: number;
  package_ids: string[];
  slots_by_duration: Record<number, number>;
  slots: ProposedSlot[];
}

export interface ScheduleCalculationResult {
  sessions: ProposedSession[];
  totalSlots: number;
  operatingDaysCount: number;
}

export interface SchedulePreviewResult {
  date_range: {
    from: string;
    to: string;
  };
  operating_hours: {
    start: string;
    end: string;
  };
  slot_settings: {
    duration_mins: number;
    interval_mins: number;
    capacity: number;
    buffer_before_mins: number;
    buffer_after_mins: number;
  };
  break_periods: BreakPeriod[];
  total_operating_days: number;
  total_proposed_sessions: number;
  total_proposed_slots: number;
  existing_sessions_count: number;
  existing_slots_count: number;
  new_slots_count: number;
  retained_slots_count: number;
  retained_booked_slots_count: number;
  removable_unbooked_slots_count: number;
  confirmed_bookings_count: number;
  confirmed_bookings_preserved: boolean;
  packages?: SchedulePackageConfig[];
  slots_by_duration?: Record<number, number>;
  affected_active_bookings: Array<{
    id: string;
    booking_ref: string;
    client_name: string;
    booking_date: string;
    start_at: string;
    status: string;
  }>;
}

export function timeToMinutes(timeStr: string): number {
  const norm = normalizeTimeHHMM(timeStr);
  const [h, m] = norm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Generates the complete proposed sessions and slots based on the schedule configuration.
 * Steps from operating_start_time to operating_end_time by slot_interval_mins.
 * Excludes any slots that overlap configured break periods.
 */
export function calculateProposedSchedule(
  config: ScheduleConfig
): ScheduleCalculationResult {
  const startDateStr = config.start_date;
  const endDateStr = config.end_date || startDateStr;

  if (!startDateStr) {
    return { sessions: [], totalSlots: 0, operatingDaysCount: 0 };
  }

  const operatingDays =
    Array.isArray(config.operating_days) && config.operating_days.length > 0
      ? config.operating_days
      : [0, 1, 2, 3, 4, 5, 6];

  const opStartMins = timeToMinutes(config.operating_start_time || "09:00");
  const opEndMins = timeToMinutes(config.operating_end_time || "18:00");
  const slotDuration = Math.max(5, Number(config.slot_duration_mins || 30));
  const slotInterval = Math.max(5, Number(config.slot_interval_mins || slotDuration));
  const slotCapacity = Math.max(1, Number(config.capacity_per_slot || 1));
  const bufferBefore = Math.max(0, Number(config.buffer_before_mins || 0));
  const bufferAfter = Math.max(0, Number(config.buffer_after_mins || 10));

  const breaks = (config.break_periods || []).map((bp) => ({
    name: bp.name,
    startMins: timeToMinutes(bp.start_time),
    endMins: timeToMinutes(bp.end_time),
  }));

  // Resolve packages and their distinct appointment durations
  const packageConfigs = (config.packages || []).filter(
    (p) => p && typeof p.duration_mins === "number" && p.duration_mins > 0
  );

  const durationGroups = new Map<number, string[]>();
  if (packageConfigs.length > 0) {
    for (const p of packageConfigs) {
      const dur = p.duration_mins;
      const arr = durationGroups.get(dur) || [];
      if (!arr.includes(p.id)) arr.push(p.id);
      durationGroups.set(dur, arr);
    }
  } else {
    durationGroups.set(slotDuration, []);
  }

  const allPackageIds = packageConfigs.map((p) => p.id);

  const proposedSessions: ProposedSession[] = [];
  let totalSlotsCount = 0;

  const curDate = new Date(`${startDateStr}T00:00:00Z`);
  const stopDate = new Date(`${endDateStr}T00:00:00Z`);

  while (curDate <= stopDate) {
    const ymd = curDate.toISOString().split("T")[0];
    const dow = getDhakaDayOfWeek(ymd);

    if (operatingDays.includes(dow)) {
      const sessionSlots: ProposedSlot[] = [];
      const slotsByDuration: Record<number, number> = {};

      // Generate slots for each distinct package duration
      for (const [durMins, pkgIds] of durationGroups.entries()) {
        const stepInterval = packageConfigs.length > 0
          ? durMins
          : slotInterval;

        let cursorMins = opStartMins;
        let countForDuration = 0;

        while (cursorMins + durMins <= opEndMins) {
          const slotStartMins = cursorMins;
          const slotEndMins = cursorMins + durMins;

          // Check if overlaps any break period
          const overlapsBreak = breaks.some(
            (b) => slotStartMins < b.endMins && slotEndMins > b.startMins
          );

          if (!overlapsBreak) {
            const slotStartTime = minutesToHHMM(slotStartMins);
            const slotEndTime = minutesToHHMM(slotEndMins);
            const startIso = dhakaDateTimeToISO(ymd, slotStartTime);
            const endIso = dhakaDateTimeToISO(ymd, slotEndTime);
            const effStartIso = addMinutesToISO(startIso, -bufferBefore);
            const effEndIso = addMinutesToISO(endIso, bufferAfter);

            sessionSlots.push({
              slot_date: ymd,
              start_time: slotStartTime,
              end_time: slotEndTime,
              start_at: startIso,
              end_at: endIso,
              effective_start_at: effStartIso,
              effective_end_at: effEndIso,
              capacity: slotCapacity,
              duration_mins: durMins,
              package_ids: pkgIds,
            });

            countForDuration++;
          }

          cursorMins += stepInterval;
        }

        slotsByDuration[durMins] = countForDuration;
      }

      // Sort session slots chronologically, then by duration
      sessionSlots.sort((a, b) => {
        const diff = Date.parse(a.start_at) - Date.parse(b.start_at);
        if (diff !== 0) return diff;
        return a.duration_mins - b.duration_mins;
      });

      proposedSessions.push({
        session_date: ymd,
        day_of_week: dow,
        start_time: `${minutesToHHMM(opStartMins)}:00`,
        end_time: `${minutesToHHMM(opEndMins)}:00`,
        slot_duration_mins: slotDuration,
        capacity_per_slot: slotCapacity,
        buffer_before_mins: bufferBefore,
        buffer_after_mins: bufferAfter,
        package_ids: allPackageIds,
        slots_by_duration: slotsByDuration,
        slots: sessionSlots,
      });

      totalSlotsCount += sessionSlots.length;
    }

    curDate.setUTCDate(curDate.getUTCDate() + 1);
  }

  return {
    sessions: proposedSessions,
    totalSlots: totalSlotsCount,
    operatingDaysCount: proposedSessions.length,
  };
}

/**
 * Compares proposed schedule with existing database sessions, slots, and active bookings.
 * Calculates diffs, additions, retentions, and guarantees booking preservation.
 */
export function compareScheduleWithExisting(
  config: ScheduleConfig,
  proposed: ScheduleCalculationResult,
  existingSessions: any[] = [],
  existingSlots: any[] = [],
  activeBookings: any[] = []
): SchedulePreviewResult {
  const existingSlotKeys = new Set(
    existingSlots.map((s) => `${s.slot_date}_${s.start_at}_${s.end_at}`)
  );

  let newSlotsCount = 0;
  let retainedSlotsCount = 0;

  for (const session of proposed.sessions) {
    for (const slot of session.slots) {
      const key = `${slot.slot_date}_${slot.start_at}_${slot.end_at}`;
      if (existingSlotKeys.has(key)) {
        retainedSlotsCount++;
      } else {
        newSlotsCount++;
      }
    }
  }

  // Count existing slots that have active bookings
  const bookedSlots = existingSlots.filter((s) => (s.booked_count || 0) > 0);
  const retainedBookedSlotsCount = bookedSlots.length;

  // Unbooked slots in existing that are NOT in proposed schedule
  const proposedSlotKeys = new Set(
    proposed.sessions.flatMap((s) =>
      s.slots.map((sl) => `${sl.slot_date}_${sl.start_at}_${sl.end_at}`)
    )
  );

  const removableUnbookedSlotsCount = existingSlots.filter(
    (s) => !proposedSlotKeys.has(`${s.slot_date}_${s.start_at}_${s.end_at}`) && (s.booked_count || 0) === 0
  ).length;

  const aggregateSlotsByDuration: Record<number, number> = {};
  for (const session of proposed.sessions) {
    for (const [dur, cnt] of Object.entries(session.slots_by_duration || {})) {
      aggregateSlotsByDuration[Number(dur)] = (aggregateSlotsByDuration[Number(dur)] || 0) + cnt;
    }
  }

  return {
    date_range: {
      from: config.start_date,
      to: config.end_date || config.start_date,
    },
    operating_hours: {
      start: config.operating_start_time || "09:00",
      end: config.operating_end_time || "18:00",
    },
    slot_settings: {
      duration_mins: config.slot_duration_mins,
      interval_mins: config.slot_interval_mins,
      capacity: config.capacity_per_slot,
      buffer_before_mins: config.buffer_before_mins || 0,
      buffer_after_mins: config.buffer_after_mins || 10,
    },
    break_periods: config.break_periods || [],
    total_operating_days: proposed.operatingDaysCount,
    total_proposed_sessions: proposed.sessions.length,
    total_proposed_slots: proposed.totalSlots,
    existing_sessions_count: existingSessions.length,
    existing_slots_count: existingSlots.length,
    new_slots_count: newSlotsCount,
    retained_slots_count: retainedSlotsCount,
    retained_booked_slots_count: retainedBookedSlotsCount,
    removable_unbooked_slots_count: removableUnbookedSlotsCount,
    confirmed_bookings_count: activeBookings.length,
    confirmed_bookings_preserved: true,
    packages: config.packages || [],
    slots_by_duration: aggregateSlotsByDuration,
    affected_active_bookings: activeBookings.map((b) => ({
      id: b.id,
      booking_ref: b.booking_ref,
      client_name: b.client_name,
      booking_date: b.booking_date,
      start_at: b.start_at,
      status: b.status,
    })),
  };
}

