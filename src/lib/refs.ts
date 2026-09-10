/**
 * Turning passage data into text a reader recognises, and into NIV links.
 *
 * Shared by the app screens and by the plan report script, so a reading is
 * described the same way everywhere.
 */

export interface Passage {
  book: string;
  name: string;
  startChapter: number;
  endChapter: number;
}

/** "Genesis 1-3", "Psalm 59", "Psalms 7, 34, 52" */
export function formatPassages(passages: Passage[]): string {
  const groups: { name: string; book: string; ranges: string[] }[] = [];

  for (const p of passages) {
    const range = p.endChapter > p.startChapter ? `${p.startChapter}-${p.endChapter}` : `${p.startChapter}`;
    const last = groups[groups.length - 1];
    if (last && last.book === p.book) last.ranges.push(range);
    else groups.push({ name: p.name, book: p.book, ranges: [range] });
  }

  return groups
    .map((g) => {
      // "Psalm 59" reads correctly; "Psalms 59" does not.
      const name =
        g.book === 'PSA' && g.ranges.length === 1 && !g.ranges[0].includes('-') ? 'Psalm' : g.name;
      return `${name} ${g.ranges.join(', ')}`;
    })
    .join(', ');
}

/**
 * The separate parts of a reading, one per book, for showing a parallel reading
 * as columns or stacked cards rather than one run-on line.
 */
export interface PassageGroup {
  book: string;
  name: string;
  label: string;
  /** For linking straight to the right place in the NIV. */
  firstChapter: number;
}

export function passageGroups(passages: Passage[]): PassageGroup[] {
  const groups: { name: string; book: string; ranges: string[]; firstChapter: number }[] = [];
  for (const p of passages) {
    const range = p.endChapter > p.startChapter ? `${p.startChapter}-${p.endChapter}` : `${p.startChapter}`;
    const last = groups[groups.length - 1];
    if (last && last.book === p.book) last.ranges.push(range);
    else groups.push({ name: p.name, book: p.book, ranges: [range], firstChapter: p.startChapter });
  }
  return groups.map((g) => {
    const name = g.book === 'PSA' && g.ranges.length === 1 && !g.ranges[0].includes('-') ? 'Psalm' : g.name;
    return { name: g.name, book: g.book, label: `${name} ${g.ranges.join(', ')}`, firstChapter: g.firstChapter };
  });
}

/** Every chapter in a reading, flattened, in reading order. */
export function chaptersOf(passages: Passage[]): { book: string; name: string; chapter: number }[] {
  const out: { book: string; name: string; chapter: number }[] = [];
  for (const p of passages) {
    for (let c = p.startChapter; c <= p.endChapter; c++) out.push({ book: p.book, name: p.name, chapter: c });
  }
  return out;
}

/**
 * A link to the NIV on bible.com. 111 is the NIV version id, and the YouVersion
 * Android app registers these links, so on his phone this opens the app.
 * Verified format: https://www.bible.com/bible/111/GEN.1.niv
 */
export function nivLink(book: string, chapter: number): string {
  return `https://www.bible.com/bible/111/${book}.${chapter}.niv`;
}

export interface ReadingPart {
  parallel: boolean;
  passages: Passage[];
}

/**
 * A whole reading on one line.
 *
 * Ordinary chapters read as a plain list. A parallel part says "with", so it is
 * obvious that those chapters are one story told twice rather than more reading:
 *   "2 Kings 20 with Isaiah 38-39, Isaiah 40"
 *   "2 Kings 18 with 2 Chronicles 32 and Isaiah 36"
 */
export function formatReading(parts: ReadingPart[]): string {
  return parts
    .map((part) => {
      if (!part.parallel) return formatPassages(part.passages);
      const groups = passageGroups(part.passages).map((g) => g.label);
      if (groups.length === 1) return groups[0];
      const [first, ...rest] = groups;
      return `${first} with ${rest.join(' and ')}`;
    })
    .join(', ');
}

/** Every passage in a reading, flattened, losing the parallel grouping. */
export function flatPassages(parts: ReadingPart[]): Passage[] {
  return parts.flatMap((p) => p.passages);
}

/** True when any part of the reading is a parallel account. */
export function hasParallel(parts: ReadingPart[]): boolean {
  return parts.some((p) => p.parallel);
}
