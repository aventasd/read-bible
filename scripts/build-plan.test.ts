/**
 * Invariants for the generated reading plan.
 *
 * These are not decoration. Progress is stored as reading numbers, so a plan
 * that silently changes shape would point a year of someone's history at the
 * wrong chapters. Every one of these must pass before any UI work.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { BLOCKS, ERAS, SEGMENTS } from '../data/chronology.ts';
import { OT_BOOKS, TOTAL_CHAPTERS, BY_ID } from './books.ts';
import type { Plan } from './build-plan.ts';
import type { Metrics } from './build-metrics.ts';
import { formatReading } from '../src/lib/refs.ts';

const plan: Plan = JSON.parse(readFileSync('data/plan.json', 'utf8'));
const metrics: Metrics = JSON.parse(readFileSync('data/chapter-metrics.json', 'utf8'));
const snapshot = JSON.parse(readFileSync('data/web-ot.json', 'utf8')) as {
  books: { id: string; name: string; chapters: string[][] }[];
};

/** Every chapter a reading contains, as "GEN 1" keys, in order. */
const chaptersOf = (r: Plan['readings'][number]): string[] =>
  r.parts
    .flatMap((part) => part.passages)
    .flatMap((p) => {
      const out: string[] = [];
      for (let c = p.startChapter; c <= p.endChapter; c++) out.push(`${p.book} ${c}`);
      return out;
    });

/** Every passage of a reading, ignoring the part grouping. */
const passagesOf = (r: Plan['readings'][number]) => r.parts.flatMap((part) => part.passages);

const allPlanChapters = plan.readings.flatMap(chaptersOf);

describe('the source text snapshot', () => {
  it('is committed, so the build never depends on the network', () => {
    expect(existsSync('data/web-ot.json')).toBe(true);
  });

  it('has all 39 books with the expected chapter counts', () => {
    expect(snapshot.books).toHaveLength(39);
    for (const def of OT_BOOKS) {
      const book = snapshot.books.find((b) => b.id === def.id);
      expect(book, def.name).toBeDefined();
      expect(book!.chapters.length, def.name).toBe(def.ch);
    }
  });

  it('has contiguous verse numbering with no empty verses', () => {
    // The reader stores verses as a bare array indexed by position, so this
    // assumption must hold or the reader shows the wrong verse numbers.
    for (const book of snapshot.books) {
      book.chapters.forEach((verses, i) => {
        expect(verses.length, `${book.name} ${i + 1}`).toBeGreaterThan(0);
        for (const v of verses) expect(v.trim(), `${book.name} ${i + 1}`).not.toBe('');
      });
    }
  });
});

describe('the historical order', () => {
  it('covers all 929 chapters exactly once', () => {
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const b of BLOCKS) {
      for (const r of b.refs) {
        const k = `${r.book} ${r.chapter}`;
        if (seen.has(k)) dups.push(k);
        seen.add(k);
      }
    }
    expect(dups).toEqual([]);
    expect(seen.size).toBe(TOTAL_CHAPTERS);

    const missing: string[] = [];
    for (const b of OT_BOOKS) {
      for (let c = 1; c <= b.ch; c++) if (!seen.has(`${b.id} ${c}`)) missing.push(`${b.id} ${c}`);
    }
    expect(missing).toEqual([]);
  });

  it('references only real books and chapters', () => {
    for (const b of BLOCKS) {
      for (const r of b.refs) {
        expect(BY_ID[r.book], r.book).toBeDefined();
        expect(r.chapter).toBeGreaterThanOrEqual(1);
        expect(r.chapter).toBeLessThanOrEqual(BY_ID[r.book].ch);
      }
    }
  });

  it('marks a block parallel exactly when it holds more than one chapter', () => {
    for (const b of BLOCKS) expect(b.parallel).toBe(b.refs.length > 1);
  });

  it('has 9 eras and every block belongs to one of them', () => {
    expect(ERAS).toHaveLength(9);
    const ids = new Set(ERAS.map((e) => e.id));
    for (const b of BLOCKS) expect(ids.has(b.era)).toBe(true);
  });

  it('never moves backwards through the eras', () => {
    let era = 0;
    for (const b of BLOCKS) {
      expect(b.era).toBeGreaterThanOrEqual(era);
      era = b.era;
    }
  });

  it('gives every segment a label', () => {
    for (const s of SEGMENTS) expect(s.label.trim().length).toBeGreaterThan(0);
  });
});

describe('the generated plan', () => {
  it('has exactly 313 readings numbered 1 to 313', () => {
    expect(plan.totalReadings).toBe(313);
    expect(plan.readings).toHaveLength(313);
    plan.readings.forEach((r, i) => expect(r.n).toBe(i + 1));
  });

  it('contains all 929 chapters exactly once', () => {
    expect(allPlanChapters).toHaveLength(TOTAL_CHAPTERS);
    expect(new Set(allPlanChapters).size).toBe(TOTAL_CHAPTERS);
  });

  it('preserves the historical order exactly', () => {
    // A reading merges its chapters into per-book ranges, so the order WITHIN a
    // reading can differ from the block order. What must hold is that the
    // readings consume the blocks in sequence, and that each reading holds
    // exactly the chapters of the blocks it consumed.
    let bi = 0;
    for (const reading of plan.readings) {
      const expected = new Set<string>();
      while (expected.size < reading.chapters) {
        for (const r of BLOCKS[bi].refs) expected.add(`${r.book} ${r.chapter}`);
        bi++;
      }
      const actual = new Set(chaptersOf(reading));
      expect(actual, `reading ${reading.n}`).toEqual(expected);
    }
    expect(bi, 'every block consumed').toBe(BLOCKS.length);
  });

  it('never breaks a block across two readings', () => {
    // Walk blocks and readings together. Each reading must consume whole blocks.
    let bi = 0;
    for (const reading of plan.readings) {
      let taken = 0;
      while (taken < reading.chapters) {
        expect(bi, `ran out of blocks at reading ${reading.n}`).toBeLessThan(BLOCKS.length);
        taken += BLOCKS[bi].refs.length;
        bi++;
      }
      expect(taken, `reading ${reading.n} split a block`).toBe(reading.chapters);
    }
    expect(bi).toBe(BLOCKS.length);
  });

  it('never lets one reading span two eras', () => {
    let bi = 0;
    for (const reading of plan.readings) {
      let taken = 0;
      while (taken < reading.chapters) {
        expect(BLOCKS[bi].era, `reading ${reading.n}`).toBe(reading.era);
        taken += BLOCKS[bi].refs.length;
        bi++;
      }
    }
  });

  it('keeps every reading within 1.6x the median word count', () => {
    const sorted = plan.readings.map((r) => r.words).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const heaviest = Math.max(...plan.readings.map((r) => r.words));
    expect(heaviest / median).toBeLessThan(1.6);
  });

  it('keeps the longest reading under 20 minutes at 150 words a minute', () => {
    const heaviest = Math.max(...plan.readings.map((r) => r.words));
    expect(heaviest / 150).toBeLessThan(20);
  });

  it('reports word and verse counts that match the measured text', () => {
    for (const r of plan.readings) {
      const words = chaptersOf(r).reduce((s, k) => s + metrics[k].words, 0);
      const verses = chaptersOf(r).reduce((s, k) => s + metrics[k].verses, 0);
      expect(r.words, `reading ${r.n}`).toBe(words);
      expect(r.verses, `reading ${r.n}`).toBe(verses);
      expect(r.chapters, `reading ${r.n}`).toBe(chaptersOf(r).length);
    }
  });

  it('has 9 contiguous eras covering readings 1 to 313 with no gap or overlap', () => {
    expect(plan.eras).toHaveLength(9);
    expect(plan.eras[0].firstReading).toBe(1);
    expect(plan.eras[8].lastReading).toBe(313);
    for (let i = 0; i < plan.eras.length; i++) {
      const e = plan.eras[i];
      expect(e.lastReading).toBeGreaterThanOrEqual(e.firstReading);
      expect(e.name.trim().length).toBeGreaterThan(0);
      expect(e.blurb.trim().length).toBeGreaterThan(0);
      if (i > 0) expect(e.firstReading).toBe(plan.eras[i - 1].lastReading + 1);
    }
  });

  it('describes every passage with a real book and a sane chapter range', () => {
    for (const r of plan.readings) {
      expect(r.parts.length).toBeGreaterThan(0);
      for (const part of r.parts) expect(part.passages.length).toBeGreaterThan(0);
      for (const p of passagesOf(r)) {
        expect(BY_ID[p.book], p.book).toBeDefined();
        expect(p.name).toBe(BY_ID[p.book].name);
        expect(p.startChapter).toBeGreaterThanOrEqual(1);
        expect(p.endChapter).toBeGreaterThanOrEqual(p.startChapter);
        expect(p.endChapter).toBeLessThanOrEqual(BY_ID[p.book].ch);
      }
    }
  });

  it('marks a part parallel only when that part holds more than one book', () => {
    // This is the guard against the label lying. A parallel part must be exactly
    // the chapters that tell the same events, never a parallel account with
    // unrelated chapters merged into its range.
    for (const r of plan.readings) {
      for (const part of r.parts) {
        if (part.parallel) {
          expect(new Set(part.passages.map((p) => p.book)).size, `reading ${r.n}`).toBeGreaterThan(1);
        }
      }
    }
  });

  it('never puts two parts of the same kind next to each other', () => {
    // Consecutive blocks with the same parallel flag are merged into one part,
    // so adjacent parts must always differ. Otherwise the split is redundant.
    for (const r of plan.readings) {
      for (let i = 1; i < r.parts.length; i++) {
        expect(r.parts[i].parallel, `reading ${r.n}`).not.toBe(r.parts[i - 1].parallel);
      }
    }
  });

  it('describes each reading in words a reader can follow', () => {
    for (const r of plan.readings) {
      const text = formatReading(r.parts);
      expect(text.trim().length, `reading ${r.n}`).toBeGreaterThan(0);
      // No leftover separators from an empty part.
      expect(text, `reading ${r.n}`).not.toMatch(/,\s*$|^\s*,|,\s*,/);
      expect(text, `reading ${r.n}`).not.toContain('undefined');
    }
  });
});
