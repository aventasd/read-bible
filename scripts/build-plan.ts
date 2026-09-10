/**
 * Splits the historical block order into exactly 313 readings of near-equal
 * reading effort, and writes data/plan.json.
 *
 * HOW THE SPLIT WORKS
 * Dynamic programming over the ordered block list. dp[k][j] is the cheapest way
 * to cover the first j blocks in k readings. A candidate reading covering blocks
 * [i, j) costs:
 *
 *   (words - target)^2                      how uneven this day is
 *   + SEGMENT_PENALTY * segment changes     days should start at natural places
 *   = Infinity if it spans two eras         so the Timeline is always exact
 *
 * Blocks are never broken, only grouped. The search space is small, so the
 * result is optimal rather than greedy.
 *
 * The output is committed and then FROZEN. Progress is stored as reading
 * numbers, so reading 84 must mean the same passages forever.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { BLOCKS, ERAS, type FlatBlock } from '../data/chronology.ts';
import { BY_ID, TOTAL_CHAPTERS } from './books.ts';
import type { Metrics } from './build-metrics.ts';
import { formatReading } from '../src/lib/refs.ts';

const READINGS = 313;
/** Roughly one 200-word deviation. Tuned by looking at the report below. */
const SEGMENT_PENALTY = 40_000;
/** A reading never needs more blocks than this, which keeps the DP small. */
const MAX_BLOCKS_PER_READING = 24;

const OUT = 'data/plan.json';

export interface Passage {
  book: string;
  name: string;
  startChapter: number;
  endChapter: number;
}

/**
 * One part of a reading. A reading is usually a single part, but it can hold a
 * parallel account followed by ordinary chapters, and the two must not be run
 * together: "2 Kings 20 with Isaiah 38-39" plus "Isaiah 40" is true, while
 * "2 Kings 20 with Isaiah 38-40" is not.
 */
export interface ReadingPart {
  /** True when these passages tell the SAME events from different writers. */
  parallel: boolean;
  passages: Passage[];
}

export interface Reading {
  n: number;
  era: number;
  parts: ReadingPart[];
  words: number;
  verses: number;
  chapters: number;
}

export interface Plan {
  version: number;
  translationLabel: string;
  totalReadings: number;
  totalChapters: number;
  eras: { id: number; name: string; blurb: string; firstReading: number; lastReading: number }[];
  readings: Reading[];
}

const metrics: Metrics = JSON.parse(readFileSync('data/chapter-metrics.json', 'utf8'));

const blockWords = (b: FlatBlock): number =>
  b.refs.reduce((s, r) => s + (metrics[`${r.book} ${r.chapter}`]?.words ?? 0), 0);
const blockVerses = (b: FlatBlock): number =>
  b.refs.reduce((s, r) => s + (metrics[`${r.book} ${r.chapter}`]?.verses ?? 0), 0);

const words = BLOCKS.map(blockWords);
const N = BLOCKS.length;
const totalWords = words.reduce((a, b) => a + b, 0);
const target = totalWords / READINGS;

// Prefix sums so a group's word count is one subtraction.
const prefix = new Float64Array(N + 1);
for (let i = 0; i < N; i++) prefix[i + 1] = prefix[i] + words[i];

/** Cost of one reading covering blocks [i, j). Infinity if not allowed. */
function cost(i: number, j: number): number {
  const era = BLOCKS[i].era;
  let segmentChanges = 0;
  for (let k = i + 1; k < j; k++) {
    if (BLOCKS[k].era !== era) return Infinity; // never cross an era boundary
    if (BLOCKS[k].segment !== BLOCKS[k - 1].segment) segmentChanges++;
  }
  const dev = prefix[j] - prefix[i] - target;
  return dev * dev + SEGMENT_PENALTY * segmentChanges;
}

// --- the dynamic program ---------------------------------------------------

const INF = Infinity;
// dp[k][j], flattened. k readings used, j blocks covered.
const dp = new Float64Array((READINGS + 1) * (N + 1)).fill(INF);
const from = new Int32Array((READINGS + 1) * (N + 1)).fill(-1);
const at = (k: number, j: number) => k * (N + 1) + j;

dp[at(0, 0)] = 0;

for (let k = 1; k <= READINGS; k++) {
  // A reading needs at least one block, and enough must remain for the rest.
  const jMin = k;
  const jMax = N - (READINGS - k);
  for (let j = jMin; j <= jMax; j++) {
    let best = INF;
    let bestI = -1;
    const iMin = Math.max(k - 1, j - MAX_BLOCKS_PER_READING);
    for (let i = iMin; i < j; i++) {
      const prev = dp[at(k - 1, i)];
      if (prev === INF) continue;
      const c = cost(i, j);
      if (c === INF) continue;
      const total = prev + c;
      if (total < best) {
        best = total;
        bestI = i;
      }
    }
    dp[at(k, j)] = best;
    from[at(k, j)] = bestI;
  }
}

if (dp[at(READINGS, N)] === INF) {
  console.error(`No valid split into ${READINGS} readings. Raise MAX_BLOCKS_PER_READING or check the era constraint.`);
  process.exit(1);
}

// Walk the choices back into group boundaries.
const bounds: number[] = [N];
let k = READINGS;
let j = N;
while (k > 0) {
  const i = from[at(k, j)];
  bounds.push(i);
  j = i;
  k--;
}
bounds.reverse(); // [0, ..., N]

// --- turn the groups into readings ----------------------------------------

/** Merge a reading's chapter refs into per-book contiguous ranges. */
function toPassages(group: FlatBlock[]): Passage[] {
  const order: string[] = [];
  const byBook = new Map<string, number[]>();
  for (const b of group) {
    for (const r of b.refs) {
      if (!byBook.has(r.book)) {
        byBook.set(r.book, []);
        order.push(r.book);
      }
      byBook.get(r.book)!.push(r.chapter);
    }
  }
  const out: Passage[] = [];
  for (const book of order) {
    const chapters = byBook.get(book)!.slice().sort((a, b) => a - b);
    let start = chapters[0];
    let prevCh = chapters[0];
    for (let x = 1; x <= chapters.length; x++) {
      const c = chapters[x];
      if (c !== prevCh + 1) {
        out.push({ book, name: BY_ID[book].name, startChapter: start, endChapter: prevCh });
        start = c;
      }
      prevCh = c;
    }
  }
  return out;
}

/** Consecutive blocks that share the same parallel flag become one part. */
function toParts(group: FlatBlock[]): ReadingPart[] {
  const runs: FlatBlock[][] = [];
  for (const b of group) {
    const last = runs[runs.length - 1];
    if (last && last[0].parallel === b.parallel) last.push(b);
    else runs.push([b]);
  }
  return runs.map((run) => ({ parallel: run[0].parallel, passages: toPassages(run) }));
}

const readings: Reading[] = [];
for (let r = 0; r < READINGS; r++) {
  const group = BLOCKS.slice(bounds[r], bounds[r + 1]);
  readings.push({
    n: r + 1,
    era: group[0].era,
    parts: toParts(group),
    words: group.reduce((s, b) => s + blockWords(b), 0),
    verses: group.reduce((s, b) => s + blockVerses(b), 0),
    chapters: group.reduce((s, b) => s + b.refs.length, 0),
  });
}

const eras = ERAS.map((e) => {
  const mine = readings.filter((r) => r.era === e.id);
  return {
    id: e.id,
    name: e.name,
    blurb: e.blurb,
    firstReading: mine[0].n,
    lastReading: mine[mine.length - 1].n,
  };
});

const plan: Plan = {
  version: 1,
  translationLabel: 'NIV',
  totalReadings: READINGS,
  totalChapters: TOTAL_CHAPTERS,
  eras,
  readings,
};

writeFileSync(OUT, JSON.stringify(plan, null, 1));

// --- report ---------------------------------------------------------------

const ws = readings.map((r) => r.words).sort((a, b) => a - b);
const median = ws[Math.floor(ws.length / 2)];
const worst = readings.slice().sort((a, b) => b.words - a.words)[0];
const lightest = readings.slice().sort((a, b) => a.words - b.words)[0];
const label = (r: Reading) => formatReading(r.parts);

console.log(`Wrote ${OUT}`);
console.log(`  readings ${readings.length}  chapters ${readings.reduce((s, r) => s + r.chapters, 0)}  words ${totalWords}`);
console.log(`  target ${Math.round(target)} words   median ${median} words`);
console.log(`  heaviest  ${worst.words} words (${(worst.words / median).toFixed(2)}x median)  reading ${worst.n}: ${label(worst)}`);
console.log(`  lightest  ${lightest.words} words (${(lightest.words / median).toFixed(2)}x median)  reading ${lightest.n}: ${label(lightest)}`);
console.log(`  minutes at 150 wpm: heaviest ${(worst.words / 150).toFixed(1)}, median ${(median / 150).toFixed(1)}`);
console.log('\n  era             readings  chapters   avg words');
for (const e of eras) {
  const mine = readings.filter((r) => r.era === e.id);
  const avg = Math.round(mine.reduce((s, r) => s + r.words, 0) / mine.length);
  console.log(`  ${e.name.padEnd(26).slice(0, 26)} ${String(mine.length).padStart(3)}     ${String(mine.reduce((s, r) => s + r.chapters, 0)).padStart(4)}      ${String(avg).padStart(5)}`);
}
