/**
 * Downloads the World English Bible Old Testament once and writes a normalised
 * snapshot to data/web-ot.json, which is committed to the repo.
 *
 * The WEB is public domain. Source: https://api.getbible.net/v2/web/{1..39}.json
 *
 * Run this by hand, never from the app build. The build reads the committed
 * snapshot from disk. A build that fetches is a build that can silently produce
 * a different reading plan and renumber a year of someone's progress.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { OT_BOOKS, TOTAL_CHAPTERS } from './books.ts';

const OUT = 'data/web-ot.json';
const SOURCE = 'https://api.getbible.net/v2/web';

interface RawVerse { chapter: number; verse: number; text: string }
interface RawChapter { chapter: number; verses: RawVerse[] }
interface RawBook { nr: number; name: string; chapters: RawChapter[] }

/** One book, verses flattened to a plain array per chapter. */
export interface SlimBook {
  n: number;
  id: string;
  name: string;
  /** chapters[c - 1][v - 1] = verse text */
  chapters: string[][];
}

export interface Snapshot {
  translation: string;
  abbreviation: string;
  license: string;
  source: string;
  fetchedAt: string;
  books: SlimBook[];
}

const problems: string[] = [];

async function fetchBook(n: number, attempt = 1): Promise<RawBook> {
  try {
    const res = await fetch(`${SOURCE}/${n}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as RawBook;
  } catch (err) {
    if (attempt >= 4) throw new Error(`book ${n} failed after 4 tries: ${err}`);
    await new Promise((r) => setTimeout(r, 500 * attempt));
    return fetchBook(n, attempt + 1);
  }
}

function normalise(raw: RawBook, def: (typeof OT_BOOKS)[number]): SlimBook {
  if (raw.chapters.length !== def.ch) {
    problems.push(`${def.name}: got ${raw.chapters.length} chapters, expected ${def.ch}`);
  }

  const chapters: string[][] = [];
  for (const chap of raw.chapters.slice().sort((a, b) => a.chapter - b.chapter)) {
    const verses = chap.verses.slice().sort((a, b) => a.verse - b.verse);

    // The reader stores verses as a bare array indexed by position, so verse
    // numbers must run 1..n with no gaps. Check rather than assume.
    verses.forEach((v, i) => {
      if (v.verse !== i + 1) {
        problems.push(`${def.name} ${chap.chapter}: verse ${v.verse} found at position ${i + 1}`);
      }
      if (!v.text || !v.text.trim()) {
        problems.push(`${def.name} ${chap.chapter}:${v.verse} is empty`);
      }
    });

    chapters.push(verses.map((v) => v.text.replace(/\s+/g, ' ').trim()));
  }

  return { n: def.n, id: def.id, name: def.name, chapters };
}

async function main() {
  console.log(`Fetching the World English Bible Old Testament from ${SOURCE}`);
  const books: SlimBook[] = [];

  for (const def of OT_BOOKS) {
    const raw = await fetchBook(def.n);
    const slim = normalise(raw, def);
    books.push(slim);
    const verses = slim.chapters.reduce((s, c) => s + c.length, 0);
    console.log(`  ${String(def.n).padStart(2)} ${def.name.padEnd(16)} ${String(slim.chapters.length).padStart(3)} ch  ${String(verses).padStart(5)} v`);
  }

  const chapterTotal = books.reduce((s, b) => s + b.chapters.length, 0);
  if (chapterTotal !== TOTAL_CHAPTERS) {
    problems.push(`total chapters ${chapterTotal}, expected ${TOTAL_CHAPTERS}`);
  }

  if (problems.length) {
    console.error(`\nRefusing to write ${OUT}. ${problems.length} problem(s):`);
    for (const p of problems.slice(0, 40)) console.error(`  - ${p}`);
    process.exit(1);
  }

  const snapshot: Snapshot = {
    translation: 'World English Bible',
    abbreviation: 'WEB',
    license: 'Public Domain',
    source: SOURCE,
    fetchedAt: new Date().toISOString(),
    books,
  };

  if (!existsSync('data')) mkdirSync('data', { recursive: true });
  writeFileSync(OUT, JSON.stringify(snapshot));

  const verseTotal = books.reduce((s, b) => s + b.chapters.reduce((t, c) => t + c.length, 0), 0);
  const words = books.reduce(
    (s, b) => s + b.chapters.reduce((t, c) => t + c.reduce((w, v) => w + v.split(/\s+/).length, 0), 0),
    0,
  );
  console.log(`\nWrote ${OUT}`);
  console.log(`  books ${books.length}  chapters ${chapterTotal}  verses ${verseTotal}  words ${words}`);
}

main();
