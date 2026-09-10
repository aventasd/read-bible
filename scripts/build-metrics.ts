/**
 * Reads the committed WEB snapshot and writes per chapter word and verse counts
 * to data/chapter-metrics.json.
 *
 * Word count, not chapter count, is what makes the daily readings equal in
 * effort. Psalm 117 has 2 verses and Psalm 119 has 176.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { OT_BOOKS, TOTAL_CHAPTERS } from './books.ts';

const IN = 'data/web-ot.json';
const OUT = 'data/chapter-metrics.json';

interface Snapshot {
  books: { id: string; name: string; chapters: string[][] }[];
}

export interface ChapterMetric {
  words: number;
  verses: number;
}

/** "GEN 1" -> { words, verses } */
export type Metrics = Record<string, ChapterMetric>;

const countWords = (text: string): number => {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
};

function main() {
  const snap: Snapshot = JSON.parse(readFileSync(IN, 'utf8'));
  const metrics: Metrics = {};

  for (const book of snap.books) {
    book.chapters.forEach((verses, i) => {
      metrics[`${book.id} ${i + 1}`] = {
        words: verses.reduce((s, v) => s + countWords(v), 0),
        verses: verses.length,
      };
    });
  }

  const keys = Object.keys(metrics);
  if (keys.length !== TOTAL_CHAPTERS) {
    console.error(`Expected ${TOTAL_CHAPTERS} chapters, measured ${keys.length}. Refusing to write.`);
    process.exit(1);
  }

  writeFileSync(OUT, JSON.stringify(metrics, null, 0));

  const totalWords = keys.reduce((s, k) => s + metrics[k].words, 0);
  const totalVerses = keys.reduce((s, k) => s + metrics[k].verses, 0);
  const sorted = keys.slice().sort((a, b) => metrics[b].words - metrics[a].words);

  console.log(`Wrote ${OUT}`);
  console.log(`  chapters ${keys.length}  verses ${totalVerses}  words ${totalWords}`);
  console.log(`  target per reading at 313 readings: ${Math.round(totalWords / 313)} words`);
  console.log('\n  longest chapters:');
  for (const k of sorted.slice(0, 5)) {
    console.log(`    ${k.padEnd(8)} ${String(metrics[k].words).padStart(5)} words  ${String(metrics[k].verses).padStart(4)} verses`);
  }
  console.log('\n  shortest chapters:');
  for (const k of sorted.slice(-3)) {
    console.log(`    ${k.padEnd(8)} ${String(metrics[k].words).padStart(5)} words  ${String(metrics[k].verses).padStart(4)} verses`);
  }
  const perBook = OT_BOOKS.map((b) => ({
    name: b.name,
    words: keys.filter((k) => k.startsWith(b.id + ' ')).reduce((s, k) => s + metrics[k].words, 0),
  })).sort((a, b) => b.words - a.words);
  console.log('\n  longest books:', perBook.slice(0, 4).map((b) => `${b.name} ${b.words}`).join(', '));
}

main();
