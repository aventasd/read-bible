/**
 * The 313 text files are what the phone actually reads. If one is missing, or
 * holds different chapters from the plan, the reader shows the wrong passage
 * with no error. These are committed artifacts, so they get checked.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import type { Plan } from './build-plan.ts';
import type { Shard } from './build-text-shards.ts';
import type { Metrics } from './build-metrics.ts';

const plan: Plan = JSON.parse(readFileSync('data/plan.json', 'utf8'));
const metrics: Metrics = JSON.parse(readFileSync('data/chapter-metrics.json', 'utf8'));
const DIR = 'public/text/v1';

const shardPath = (n: number) => `${DIR}/r${String(n).padStart(3, '0')}.json`;
const load = (n: number): Shard => JSON.parse(readFileSync(shardPath(n), 'utf8'));

describe('the reading text files', () => {
  it('has exactly one file per reading and no extras', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(plan.totalReadings);
    for (const r of plan.readings) expect(existsSync(shardPath(r.n)), `reading ${r.n}`).toBe(true);
  });

  it('holds exactly the chapters the plan says, in the same order', () => {
    for (const reading of plan.readings) {
      const expected: string[] = [];
      for (const part of reading.parts) {
        for (const p of part.passages) {
          for (let c = p.startChapter; c <= p.endChapter; c++) expected.push(`${p.book} ${c}`);
        }
      }
      const shard = load(reading.n);
      expect(shard.n, `reading ${reading.n}`).toBe(reading.n);
      expect(shard.chapters.map((c) => `${c.book} ${c.chapter}`), `reading ${reading.n}`).toEqual(expected);
    }
  });

  it('has the right number of verses in every chapter, with none empty', () => {
    for (const reading of plan.readings) {
      for (const c of load(reading.n).chapters) {
        const key = `${c.book} ${c.chapter}`;
        expect(c.verses.length, key).toBe(metrics[key].verses);
        for (const v of c.verses) expect(v.trim(), key).not.toBe('');
      }
    }
  });

  it('covers all 929 chapters across the whole set, each exactly once', () => {
    const seen = new Set<string>();
    for (const reading of plan.readings) {
      for (const c of load(reading.n).chapters) seen.add(`${c.book} ${c.chapter}`);
    }
    expect(seen.size).toBe(plan.totalChapters);
  });

  it('keeps each file small enough to open instantly on a phone', () => {
    for (const reading of plan.readings) {
      const bytes = readFileSync(shardPath(reading.n)).length;
      expect(bytes, `reading ${reading.n}`).toBeLessThan(60_000);
    }
  });
});
