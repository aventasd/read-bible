/**
 * Streaks and progress numbers.
 *
 * A streak is the most motivating number on the Progress screen and the easiest
 * one to compute wrongly. The rules, each of which has a test:
 *
 *   - Streaks come only from the stored localDate strings, never from comparing
 *     today's clock against a stored timestamp.
 *   - A reading finished before 03:00 already counts for the previous day. That
 *     happens in localToday, before it reaches here.
 *   - The weekly free day never breaks a streak, because the streak counts
 *     SCHEDULED READING DAYS completed, not calendar days.
 *   - Today being unread does not break a streak. He still has the rest of today.
 *   - A clock reporting a date earlier than something already recorded is treated
 *     as wrong. Progress is never deleted or reordered because of a clock.
 */
import { addDays, weekdayOf, type IsoDate } from './dates.ts';
import type { LogEntry } from './progress.ts';

export interface Stats {
  done: number;
  total: number;
  percent: number;
  chaptersRead: number;
  currentStreak: number;
  longestStreak: number;
  /** Distinct days on which he read something. */
  daysRead: number;
}

/** The device clock cannot be earlier than something already recorded. */
export function trustedToday(deviceToday: IsoDate, log: LogEntry[]): IsoDate {
  let newest = deviceToday;
  for (const e of log) if (e.localDate > newest) newest = e.localDate;
  return newest;
}

/** Days he read at least one reading. */
const readDaysOf = (log: LogEntry[]): Set<IsoDate> => new Set(log.map((e) => e.localDate));

/**
 * How many scheduled reading days in a row, counting back from today.
 *
 * Walk backwards day by day. Rest days are skipped. A reading day he read
 * extends the streak; a reading day he missed ends it. Today is the one
 * exception: if he has not read yet today, that is not a miss, so it is skipped.
 */
export function currentStreak(log: LogEntry[], restDay: number, today: IsoDate): number {
  if (log.length === 0) return 0;

  const readDays = readDaysOf(log);
  let date = trustedToday(today, log);
  let streak = 0;
  let isToday = true;

  // 800 is over two years of days, far past the 313 reading plan.
  for (let guard = 0; guard < 800; guard++) {
    const isRestDay = weekdayOf(date) === restDay;
    const wasRead = readDays.has(date);

    if (!isRestDay) {
      if (wasRead) streak++;
      else if (!isToday) break; // a missed reading day ends the streak
      // else: today is simply not done yet, which is not a miss
    }

    isToday = false;
    date = addDays(date, -1);
  }

  return streak;
}

/** The longest run of consecutive scheduled reading days he ever completed. */
export function longestStreak(log: LogEntry[], restDay: number): number {
  if (log.length === 0) return 0;

  const readDays = [...readDaysOf(log)].sort();
  let best = 0;
  let run = 0;
  let previous: IsoDate | null = null;

  for (const day of readDays) {
    if (previous === null) {
      run = 1;
    } else {
      // Count reading days strictly between the two. None means the run holds;
      // a skipped rest day does not count against it.
      let missed = 0;
      for (let cursor = addDays(previous, 1); cursor < day; cursor = addDays(cursor, 1)) {
        if (weekdayOf(cursor) !== restDay) missed++;
      }
      run = missed === 0 ? run + 1 : 1;
    }
    if (run > best) best = run;
    previous = day;
  }

  return best;
}

export function stats(
  log: LogEntry[],
  total: number,
  restDay: number,
  today: IsoDate,
  chaptersPerReading: (n: number) => number,
): Stats {
  const done = log.length;
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    chaptersRead: log.reduce((s, e) => s + chaptersPerReading(e.reading), 0),
    currentStreak: currentStreak(log, restDay, today),
    longestStreak: longestStreak(log, restDay),
    daysRead: readDaysOf(log).size,
  };
}
