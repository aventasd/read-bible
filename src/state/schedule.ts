/**
 * Turning reading numbers into calendar dates and back.
 *
 * The plan is a fixed ordered list of readings. Dates are DERIVED from the start
 * date and the chosen free day, never stored. That means the start date or the
 * free day can change at any time, or the reader can pause for a holiday, and no
 * stored progress is rewritten.
 */
import { addDays, daysBetween, localToday, weekdayOf, type IsoDate } from './dates.ts';

export interface ScheduleSettings {
  startDate: IsoDate;
  /** 0 = Sunday. The one day a week with no reading. */
  restDay: number;
}

/**
 * The date each reading is scheduled for. Index 0 is reading 1.
 * Rest days are skipped, so 313 readings spread across about 365 days.
 */
export function buildSchedule(total: number, { startDate, restDay }: ScheduleSettings): IsoDate[] {
  const dates: IsoDate[] = [];
  let date = startDate;
  // Guard against an impossible loop if restDay were ever out of range.
  const limit = total * 8 + 14;
  for (let step = 0; dates.length < total && step < limit; step++) {
    if (weekdayOf(date) !== restDay) dates.push(date);
    date = addDays(date, 1);
  }
  return dates;
}

/** How many readings the plan expects to be done by `today`, capped at total. */
export function scheduledBy(today: IsoDate, schedule: IsoDate[]): number {
  let count = 0;
  for (const d of schedule) {
    if (daysBetween(d, today) >= 0) count++;
    else break;
  }
  return count;
}

export interface Position {
  /** Readings the schedule expects done by now. */
  scheduled: number;
  /** Readings actually completed. */
  done: number;
  /** Readings due and not yet done. 0 means up to date. */
  waiting: number;
  /** The next reading to read, or null when the whole plan is finished. */
  next: number | null;
  /** The date the last reading falls on at the current pace. */
  finishDate: IsoDate | null;
  today: IsoDate;
}

/**
 * Where the reader stands right now.
 *
 * `waiting` is deliberately not called "behind". A missed day is absorbed by the
 * weekly free day, and the wording the reader sees should reflect that.
 */
export function position(
  completed: Set<number>,
  total: number,
  settings: ScheduleSettings,
  today: IsoDate = localToday(),
): Position {
  const schedule = buildSchedule(total, settings);
  const scheduled = scheduledBy(today, schedule);
  const done = completed.size;

  let next: number | null = null;
  for (let n = 1; n <= total; n++) {
    if (!completed.has(n)) {
      next = n;
      break;
    }
  }

  return {
    scheduled,
    done,
    waiting: Math.max(0, Math.min(scheduled, total) - done),
    next,
    finishDate: schedule[total - 1] ?? null,
    today,
  };
}

/**
 * When he will finish, at the pace he is actually going.
 *
 * One reading per reading day from today until the plan runs out. If he is up to
 * date this equals the planned date. If readings are waiting it is genuinely
 * later. Capping it at the plan length would quietly under-report, and two
 * screens would then disagree about the same fact.
 */
export function finishDate(pos: Position, total: number, settings: ScheduleSettings): IsoDate | null {
  const remaining = total - pos.done;
  if (remaining <= 0) return null;
  const slots = Math.max(total, pos.scheduled + remaining);
  return buildSchedule(slots, settings)[slots - 1] ?? null;
}
