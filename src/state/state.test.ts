import { describe, it, expect } from 'vitest';
import { localToday, addDays, weekdayOf, daysBetween, formatDate } from './dates.ts';
import { buildSchedule, position } from './schedule.ts';
import { currentStreak, longestStreak, trustedToday } from './streak.ts';
import { mergeLogs, mergeStates, parseState, emptyState, type LogEntry, type ProgressState } from './progress.ts';

const SUNDAY = 0;
const entry = (reading: number, localDate: string, utc = `${localDate}T18:00:00.000Z`): LogEntry => ({
  reading,
  completedAtUtc: utc,
  localDate,
});

describe('dates', () => {
  it('adds and subtracts days across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29'); // leap year
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-09-14', '2026-09-21')).toBe(7);
    expect(daysBetween('2026-09-21', '2026-09-14')).toBe(-7);
  });

  it('treats a reading at 00:30 as belonging to the previous day', () => {
    // Half past midnight is the same evening to a person. Without this rule a
    // late reader loses a streak they did not break.
    const lateNight = new Date(2026, 8, 15, 0, 30);
    expect(localToday(lateNight)).toBe('2026-09-14');
  });

  it('treats a reading at 03:30 as belonging to that day', () => {
    expect(localToday(new Date(2026, 8, 15, 3, 30))).toBe('2026-09-15');
  });

  it('is not shifted by a daylight saving change', () => {
    // Whatever the local offset does, the civil date must not move.
    expect(localToday(new Date(2026, 2, 29, 12, 0))).toBe('2026-03-29');
    expect(localToday(new Date(2026, 9, 25, 12, 0))).toBe('2026-10-25');
  });

  it('formats a date the way the app shows it', () => {
    expect(formatDate('2027-08-12')).toBe('12 August 2027');
  });
});

describe('the schedule', () => {
  const settings = { startDate: '2026-09-14', restDay: SUNDAY }; // a Monday

  it('gives 313 readings, one per day, skipping the free day', () => {
    const schedule = buildSchedule(313, settings);
    expect(schedule).toHaveLength(313);
    for (const d of schedule) expect(weekdayOf(d)).not.toBe(SUNDAY);
  });

  it('finishes inside one year', () => {
    const schedule = buildSchedule(313, settings);
    const days = daysBetween(settings.startDate, schedule[312]) + 1;
    expect(days).toBeLessThanOrEqual(366);
    expect(days).toBeGreaterThan(313);
  });

  it('is strictly increasing with no repeated date', () => {
    const schedule = buildSchedule(313, settings);
    expect(new Set(schedule).size).toBe(313);
    for (let i = 1; i < schedule.length; i++) expect(schedule[i] > schedule[i - 1]).toBe(true);
  });

  it('honours a different free day', () => {
    const schedule = buildSchedule(313, { startDate: '2026-09-14', restDay: 6 });
    for (const d of schedule) expect(weekdayOf(d)).not.toBe(6);
  });

  it('reports nothing waiting on day one before he reads', () => {
    const p = position(new Set(), 313, settings, '2026-09-14');
    expect(p.scheduled).toBe(1);
    expect(p.waiting).toBe(1);
    expect(p.next).toBe(1);
  });

  it('reports readings waiting after a gap, and never a negative number', () => {
    const p = position(new Set([1, 2]), 313, settings, '2026-09-21'); // one week in
    expect(p.scheduled).toBe(7); // 7 reading days in the first 8 days, Sunday free
    expect(p.done).toBe(2);
    expect(p.waiting).toBe(5);
    expect(p.next).toBe(3);
  });

  it('reports nothing waiting when he has read ahead', () => {
    const p = position(new Set([1, 2, 3, 4, 5]), 313, settings, '2026-09-15');
    expect(p.waiting).toBe(0);
    expect(p.next).toBe(6);
  });

  it('has no next reading once the whole plan is done', () => {
    const all = new Set(Array.from({ length: 313 }, (_, i) => i + 1));
    expect(position(all, 313, settings, '2027-09-14').next).toBeNull();
  });
});

describe('streaks', () => {
  it('is zero with no readings', () => {
    expect(currentStreak([], SUNDAY, '2026-09-16')).toBe(0);
  });

  it('counts consecutive reading days', () => {
    const log = [entry(1, '2026-09-14'), entry(2, '2026-09-15'), entry(3, '2026-09-16')];
    expect(currentStreak(log, SUNDAY, '2026-09-16')).toBe(3);
  });

  it('is not broken by today being unread yet', () => {
    // He still has the rest of today. This must not read as a broken streak.
    const log = [entry(1, '2026-09-14'), entry(2, '2026-09-15')];
    expect(currentStreak(log, SUNDAY, '2026-09-16')).toBe(2);
  });

  it('is not broken by the weekly free day', () => {
    // 2026-09-19 is a Saturday, 2026-09-20 a Sunday, 2026-09-21 a Monday.
    const log = [entry(1, '2026-09-18'), entry(2, '2026-09-19'), entry(3, '2026-09-21')];
    expect(weekdayOf('2026-09-20')).toBe(SUNDAY);
    expect(currentStreak(log, SUNDAY, '2026-09-21')).toBe(3);
  });

  it('is broken by a missed reading day', () => {
    // 2026-09-17 skipped, and it is a Thursday, not the free day.
    const log = [entry(1, '2026-09-15'), entry(2, '2026-09-16'), entry(3, '2026-09-18')];
    expect(currentStreak(log, SUNDAY, '2026-09-18')).toBe(1);
  });

  it('survives a clock set backwards, without losing entries', () => {
    const log = [entry(1, '2026-09-14'), entry(2, '2026-09-15'), entry(3, '2026-09-16')];
    // The phone now claims it is a week earlier than the newest entry.
    expect(trustedToday('2026-09-09', log)).toBe('2026-09-16');
    expect(currentStreak(log, SUNDAY, '2026-09-09')).toBe(3);
  });

  it('finds the longest past streak even after it was broken', () => {
    const log = [
      entry(1, '2026-09-14'), entry(2, '2026-09-15'), entry(3, '2026-09-16'), entry(4, '2026-09-17'),
      // 18th missed, streak broken
      entry(5, '2026-09-19'),
    ];
    expect(longestStreak(log, SUNDAY)).toBe(4);
    expect(currentStreak(log, SUNDAY, '2026-09-19')).toBe(1);
  });

  it('counts two readings on one day as one day of streak', () => {
    const log = [entry(1, '2026-09-14'), entry(2, '2026-09-14'), entry(3, '2026-09-15')];
    expect(currentStreak(log, SUNDAY, '2026-09-15')).toBe(2);
  });
});

describe('progress merging', () => {
  it('unions two logs and keeps the earlier completion', () => {
    const a = [entry(1, '2026-09-14', '2026-09-14T18:00:00.000Z')];
    const b = [entry(1, '2026-09-20', '2026-09-20T18:00:00.000Z'), entry(2, '2026-09-15')];
    const merged = mergeLogs(a, b);
    expect(merged.map((e) => e.reading)).toEqual([1, 2]);
    expect(merged[0].localDate).toBe('2026-09-14'); // the first time it was read
  });

  it('never loses a reading when an older backup is imported', () => {
    const current: ProgressState = { ...emptyState(1, '2026-09-14'), log: [entry(1, '2026-09-14'), entry(2, '2026-09-15'), entry(3, '2026-09-16')], updatedAt: '2026-09-16T18:00:00.000Z' };
    const oldBackup: ProgressState = { ...emptyState(1, '2026-09-14'), log: [entry(1, '2026-09-14')], updatedAt: '2026-09-14T18:00:00.000Z' };
    const merged = mergeStates(current, oldBackup)!;
    expect(merged.log.map((e) => e.reading)).toEqual([1, 2, 3]);
  });

  it('takes settings from whichever copy was written last', () => {
    const older: ProgressState = { ...emptyState(1, '2026-01-01'), restDay: 0, updatedAt: '2026-01-01T00:00:00.000Z' };
    const newer: ProgressState = { ...emptyState(1, '2026-01-01'), restDay: 6, updatedAt: '2026-06-01T00:00:00.000Z' };
    expect(mergeStates(older, newer)!.restDay).toBe(6);
    expect(mergeStates(newer, older)!.restDay).toBe(6);
  });

  it('returns whichever copy exists when only one does', () => {
    const only = emptyState(1, '2026-09-14');
    expect(mergeStates(only, null)).toBe(only);
    expect(mergeStates(null, only)).toBe(only);
    expect(mergeStates(null, null)).toBeNull();
  });
});

describe('reading stored progress', () => {
  it('rejects data that is not progress at all', () => {
    expect(parseState(null, 313)).toBeNull();
    expect(parseState('nonsense', 313)).toBeNull();
    expect(parseState({}, 313)).toBeNull();
    expect(parseState({ startDate: 'not-a-date', log: [] }, 313)).toBeNull();
    expect(parseState({ startDate: '2026-09-14' }, 313)).toBeNull(); // no log
  });

  it('accepts a minimal valid state', () => {
    const s = parseState({ startDate: '2026-09-14', log: [] }, 313)!;
    expect(s.startDate).toBe('2026-09-14');
    expect(s.restDay).toBe(0);
    expect(s.fontScale).toBe(1);
  });

  it('drops entries that could not be real readings', () => {
    const s = parseState({
      startDate: '2026-09-14',
      log: [entry(1, '2026-09-14'), { reading: 0 }, { reading: 999 }, { reading: 1.5 }, entry(1, '2026-09-20'), null],
    }, 313)!;
    expect(s.log.map((e) => e.reading)).toEqual([1]);
  });

  it('clamps a nonsense free day or font size instead of failing', () => {
    const s = parseState({ startDate: '2026-09-14', log: [], restDay: 99, fontScale: 40 }, 313)!;
    expect(s.restDay).toBe(0);
    expect(s.fontScale).toBe(1);
  });
});
