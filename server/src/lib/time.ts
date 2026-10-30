/**
 * Wall-clock time in a named timezone, without a date library.
 *
 * The API must never use the server's own timezone: Cloud Run runs in UTC,
 * so `setHours(18)` there means 18:00 UTC — 23:30 in Sri Lanka. A tutor's
 * published hours are wall-clock times in *their* timezone, and emails show
 * times in the reader's.
 */

/** Where the site's tutors are, and the fallback for a missing or unknown zone. */
export const DEFAULT_TIMEZONE = "Asia/Colombo";

/** The zone if the runtime knows it, otherwise the default. */
export function validTimezone(timezone: string | undefined): string {
  if (!timezone) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone });
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

interface WallClock {
  year: number;
  /** 1–12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** What a clock in `timezone` reads at `instant`. */
export function wallClock(instant: Date, timezone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute") };
}

/** How far `timezone` is ahead of UTC at `instant`, in milliseconds. */
function offsetAt(instant: number, timezone: string): number {
  const clock = wallClock(new Date(instant), timezone);
  const asUtc = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute);
  return asUtc - Math.floor(instant / 60_000) * 60_000;
}

/**
 * The instant a clock in `timezone` reads `minutes` past midnight on the
 * given date. Days and minutes may overflow (day 32, minute 1500); they roll
 * over as in `Date.UTC`.
 */
export function zonedInstant(year: number, month: number, day: number, minutes: number, timezone: string): Date {
  const guess = Date.UTC(year, month - 1, day, 0, minutes);
  // Twice, so a daylight-saving change between the guess and the answer is caught.
  const first = guess - offsetAt(guess, timezone);
  return new Date(guess - offsetAt(first, timezone));
}

/** Sunday = 0 … Saturday = 6, for a calendar date (no timezone involved). */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** "Monday 2 November 2026, 18:00 (GMT+5:30)" — a lesson time for an email, in the reader's zone. */
export function formatInZone(iso: string, timezone: string | undefined): string {
  const zone = validTimezone(timezone);
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-GB", { timeZone: zone, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = date.toLocaleTimeString("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  const [clock, ...name] = time.split(" ");
  return `${day}, ${clock} (${name.join(" ")})`;
}
