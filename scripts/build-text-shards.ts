/**
 * Writes one text file per reading to public/text/v1/rNNN.json.
 *
 * Sharded by READING, not by book. Three reasons:
 *   - the Today screen loads exactly one small file
 *   - a partial download always leaves COMPLETE readings, never half a book
 *   - nothing has to map chapters back to readings at runtime
 *
 * The path carries a version (v1) so the files are immutable and cache busting
 * is free. If the plan is ever regenerated, the version changes with it.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import type { Plan } from './build-plan.ts';

const TEXT_VERSION = 'v1';
const OUT_DIR = `public/text/${TEXT_VERSION}`;

interface Snapshot {
  books: { id: string; name: string; chapters: string[][] }[];
}

export interface ShardChapter {
  book: string;
  name: string;
  chapter: number;
  /** verses[0] is verse 1. Verified contiguous in the snapshot. */
  verses: string[];
}

export interface Shard {
  n: number;
  chapters: ShardChapter[];
}

const plan: Plan = JSON.parse(readFileSync('data/plan.json', 'utf8'));
const snap: Snapshot = JSON.parse(readFileSync('data/web-ot.json', 'utf8'));
const byId = new Map(snap.books.map((b) => [b.id, b]));

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

let bytes = 0;
let chapterCount = 0;

for (const reading of plan.readings) {
  const chapters: ShardChapter[] = [];
  for (const part of reading.parts) {
    for (const p of part.passages) {
      const book = byId.get(p.book);
      if (!book) throw new Error(`reading ${reading.n}: unknown book ${p.book}`);
      for (let c = p.startChapter; c <= p.endChapter; c++) {
        const verses = book.chapters[c - 1];
        if (!verses) throw new Error(`reading ${reading.n}: missing ${p.book} ${c}`);
        chapters.push({ book: p.book, name: p.name, chapter: c, verses });
      }
    }
  }

  if (chapters.length !== reading.chapters) {
    throw new Error(`reading ${reading.n}: shard has ${chapters.length} chapters, plan says ${reading.chapters}`);
  }

  const shard: Shard = { n: reading.n, chapters };
  const json = JSON.stringify(shard);
  bytes += json.length;
  chapterCount += chapters.length;
  writeFileSync(`${OUT_DIR}/r${String(reading.n).padStart(3, '0')}.json`, json);
}

console.log(`Wrote ${plan.readings.length} shards to ${OUT_DIR}`);
console.log(`  chapters ${chapterCount}  total ${(bytes / 1024 / 1024).toFixed(2)} MB raw  average ${(bytes / plan.readings.length / 1024).toFixed(1)} KB per reading`);
