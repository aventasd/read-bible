/**
 * Civil date helpers.
 *
 * All date maths is done on "YYYY-MM-DD" strings at UTC midnight. That is
 * deliberate: a phone that crosses a daylight saving boundary, or travels, or
 * has its clock changed, must never shift which reading is due. Using local
 * Date objects for day arithmetic is the classic source of off-by-one-day bugs
 * in habit trackers.
 */

export type IsoDate = string; // "YYYY-MM-DD"

/** A reading finished before this hour counts for the previous day. */
export const DAY_ROLLOVER_HOUR = 3;

export function toUtcMidnight(iso: IsoDate): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function fromUtcMidnight(ms: number): IsoDate {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return fromUtcMidnight(toUtcMidnight(iso) + days * 86_400_000);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / 86_400_000);
}

/** 0 = Sunday, matching Date.getUTCDay and the settings screen. */
export function weekdayOf(iso: IsoDate): number {
  return new Date(toUtcMidnight(iso)).getUTCDay();
}

/**
 * The date the reader would call "today", from the device clock.
 *
 * Reading at half past midnight is the same evening to a person, so anything
 * before 03:00 counts for the previous day. Without this, a late-night reader
 * loses a streak they did not break.
 */
export function localToday(now: Date = new Date()): IsoDate {
  const shifted = new Date(now.getTime() - DAY_ROLLOVER_HOUR * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${shifted.getFullYear()}-${p(shifted.getMonth() + 1)}-${p(shifted.getDate())}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "12 August 2027" */
export function formatDate(iso: IsoDate): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function weekdayName(day: number): string {
  return DAYS[day];
}
