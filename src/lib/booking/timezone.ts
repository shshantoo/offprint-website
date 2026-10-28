export const DEFAULT_TIMEZONE = "Asia/Dhaka";
export const DHAKA_OFFSET = "+06:00";
export const DHAKA_OFFSET_MINUTES = 360;

/**
 * Normalizes a time string like "9:00", "09:00", or "09:00:00" to "HH:mm"
 */
export function normalizeTimeHHMM(timeStr: string): string {
  const parts = timeStr.trim().split(":");
  const hh = String(Number(parts[0] || 0)).padStart(2, "0");
  const mm = String(Number(parts[1] || 0)).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Converts a YYYY-MM-DD date and HH:mm time in Asia/Dhaka (+06:00) into an ISO-8601 UTC string
 */
export function dhakaDateTimeToISO(dateYMD: string, timeHHMM: string): string {
  const normTime = normalizeTimeHHMM(timeHHMM);
  const isoWithOffset = `${dateYMD}T${normTime}:00${DHAKA_OFFSET}`;
  const d = new Date(isoWithOffset);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid Asia/Dhaka date/time: ${dateYMD} ${timeHHMM}`);
  }
  return d.toISOString();
}

/**
 * Adds minutes to an ISO timestamp string and returns a new ISO string
 */
export function addMinutesToISO(isoString: string, minutes: number): string {
  const ms = Date.parse(isoString);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid ISO timestamp: ${isoString}`);
  }
  return new Date(ms + minutes * 60_000).toISOString();
}

/**
 * Returns YYYY-MM-DD formatted in Asia/Dhaka timezone for a Date or ISO string
 */
export function toDhakaDateString(input: Date | string = new Date()): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

/**
 * Returns day of week (0 = Sunday .. 6 = Saturday) in Asia/Dhaka for a YYYY-MM-DD string
 */
export function getDhakaDayOfWeek(dateYMD: string): number {
  const d = new Date(`${dateYMD}T12:00:00${DHAKA_OFFSET}`);
  // Shift by +06:00 to read UTC day matching Dhaka noon
  const dhakaShifted = new Date(d.getTime() + DHAKA_OFFSET_MINUTES * 60_000);
  return dhakaShifted.getUTCDay();
}

/**
 * Formats an ISO timestamp or YYYY-MM-DD string into a readable date in Asia/Dhaka
 * e.g. "Sunday, Nov 15, 2026"
 */
export function formatDhakaDate(
  input?: string | Date | null,
  includeWeekday = true
): string {
  if (!input) return "Date TBA";
  try {
    const d =
      typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)
        ? new Date(`${input}T12:00:00${DHAKA_OFFSET}`)
        : new Date(input);
    if (Number.isNaN(d.getTime())) return String(input);

    return new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_TIMEZONE,
      weekday: includeWeekday ? "short" : undefined,
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return String(input);
  }
}

/**
 * Formats an ISO timestamp into 12-hour time in Asia/Dhaka (e.g. "10:30 AM")
 */
export function formatDhakaTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return String(isoString);
  }
}

/**
 * Formats a start and end ISO timestamp into a time range in Asia/Dhaka
 * e.g. "10:00 AM – 10:30 AM BST"
 */
export function formatDhakaTimeRange(
  startIso: string,
  endIso: string,
  includeTzLabel = true
): string {
  const startLabel = formatDhakaTime(startIso);
  const endLabel = formatDhakaTime(endIso);
  return `${startLabel} – ${endLabel}${includeTzLabel ? " BST" : ""}`;
}

/**
 * Formats an HH:mm 24-hour time string into 12-hour format (e.g. "09:30" -> "9:30 AM")
 */
export function formatHHMM12Hour(timeHHMM: string): string {
  const norm = normalizeTimeHHMM(timeHHMM);
  const [hStr, mStr] = norm.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

/**
 * Returns all YYYY-MM-DD dates in a given year and 1-indexed month (1 = Jan .. 12 = Dec)
 */
export function getDatesInMonth(year: number, month1To12: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(Date.UTC(year, month1To12, 0)).getUTCDate();
  const mm = String(month1To12).padStart(2, "0");
  for (let day = 1; day <= daysInMonth; day++) {
    const dd = String(day).padStart(2, "0");
    dates.push(`${year}-${mm}-${dd}`);
  }
  return dates;
}

/**
 * Checks whether two [start, end) intervals overlap
 */
export function intervalsOverlap(
  aStartIso: string,
  aEndIso: string,
  bStartIso: string,
  bEndIso: string
): boolean {
  const a0 = Date.parse(aStartIso);
  const a1 = Date.parse(aEndIso);
  const b0 = Date.parse(bStartIso);
  const b1 = Date.parse(bEndIso);
  return a0 < b1 && a1 > b0;
}

/**
 * Formats an ISO timestamp into both date and 12-hour time in Asia/Dhaka
 * e.g. "Sun, Nov 15, 2026 · 10:30 AM BST"
 */
export function formatDhakaDateTime(
  isoString?: string | null,
  includeTzLabel = true
): string {
  if (!isoString) return "TBA";
  const d = formatDhakaDate(isoString, true);
  const t = formatDhakaTime(isoString);
  if (!t) return d;
  return `${d} · ${t}${includeTzLabel ? " BST" : ""}`;
}

/**
 * Alias for toDhakaDateString returning YYYY-MM-DD in Asia/Dhaka
 */
export function formatDhakaDateISO(input: Date | string = new Date()): string {
  return toDhakaDateString(input);
}

/**
 * Checks whether a policy deadline ISO or startAt + cutoffHours is still open
 */
export function isCutoffOpen(
  deadlineOrStartIso?: string | null,
  cutoffHours = 0,
  nowDate: Date = new Date()
): boolean {
  if (!deadlineOrStartIso) return true;
  const ms = Date.parse(deadlineOrStartIso);
  if (Number.isNaN(ms)) return false;
  const effectiveDeadlineMs = ms - cutoffHours * 3600_000;
  return nowDate.getTime() <= effectiveDeadlineMs;
}

/**
 * Policy eligibility check for client-initiated cancellation or rescheduling
 */
export function checkPolicyDeadline(
  startAtIso: string,
  cutoffHours: number,
  nowDate: Date = new Date()
): {
  allowed: boolean;
  deadlineIso: string;
  hoursRemaining: number;
} {
  const startMs = Date.parse(startAtIso);
  const deadlineMs = startMs - cutoffHours * 3600_000;
  const nowMs = nowDate.getTime();
  const hoursRemaining = Math.round(((startMs - nowMs) / 3600_000) * 10) / 10;

  return {
    allowed: nowMs <= deadlineMs,
    deadlineIso: new Date(deadlineMs).toISOString(),
    hoursRemaining,
  };
}
