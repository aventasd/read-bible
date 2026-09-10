/**
 * The 39 books of the Protestant Old Testament, in Bible order.
 *
 * `n`   getbible.net book number (1 = Genesis ... 39 = Malachi)
 * `id`  USFM code, also what bible.com/YouVersion links use
 * `ch`  expected chapter count, used to validate the download
 */
export interface BookDef {
  n: number;
  id: string;
  name: string;
  ch: number;
}

export const OT_BOOKS: BookDef[] = [
  { n: 1, id: 'GEN', name: 'Genesis', ch: 50 },
  { n: 2, id: 'EXO', name: 'Exodus', ch: 40 },
  { n: 3, id: 'LEV', name: 'Leviticus', ch: 27 },
  { n: 4, id: 'NUM', name: 'Numbers', ch: 36 },
  { n: 5, id: 'DEU', name: 'Deuteronomy', ch: 34 },
  { n: 6, id: 'JOS', name: 'Joshua', ch: 24 },
  { n: 7, id: 'JDG', name: 'Judges', ch: 21 },
  { n: 8, id: 'RUT', name: 'Ruth', ch: 4 },
  { n: 9, id: '1SA', name: '1 Samuel', ch: 31 },
  { n: 10, id: '2SA', name: '2 Samuel', ch: 24 },
  { n: 11, id: '1KI', name: '1 Kings', ch: 22 },
  { n: 12, id: '2KI', name: '2 Kings', ch: 25 },
  { n: 13, id: '1CH', name: '1 Chronicles', ch: 29 },
  { n: 14, id: '2CH', name: '2 Chronicles', ch: 36 },
  { n: 15, id: 'EZR', name: 'Ezra', ch: 10 },
  { n: 16, id: 'NEH', name: 'Nehemiah', ch: 13 },
  { n: 17, id: 'EST', name: 'Esther', ch: 10 },
  { n: 18, id: 'JOB', name: 'Job', ch: 42 },
  { n: 19, id: 'PSA', name: 'Psalms', ch: 150 },
  { n: 20, id: 'PRO', name: 'Proverbs', ch: 31 },
  { n: 21, id: 'ECC', name: 'Ecclesiastes', ch: 12 },
  { n: 22, id: 'SNG', name: 'Song of Songs', ch: 8 },
  { n: 23, id: 'ISA', name: 'Isaiah', ch: 66 },
  { n: 24, id: 'JER', name: 'Jeremiah', ch: 52 },
  { n: 25, id: 'LAM', name: 'Lamentations', ch: 5 },
  { n: 26, id: 'EZK', name: 'Ezekiel', ch: 48 },
  { n: 27, id: 'DAN', name: 'Daniel', ch: 12 },
  { n: 28, id: 'HOS', name: 'Hosea', ch: 14 },
  { n: 29, id: 'JOL', name: 'Joel', ch: 3 },
  { n: 30, id: 'AMO', name: 'Amos', ch: 9 },
  { n: 31, id: 'OBA', name: 'Obadiah', ch: 1 },
  { n: 32, id: 'JON', name: 'Jonah', ch: 4 },
  { n: 33, id: 'MIC', name: 'Micah', ch: 7 },
  { n: 34, id: 'NAM', name: 'Nahum', ch: 3 },
  { n: 35, id: 'HAB', name: 'Habakkuk', ch: 3 },
  { n: 36, id: 'ZEP', name: 'Zephaniah', ch: 3 },
  { n: 37, id: 'HAG', name: 'Haggai', ch: 2 },
  { n: 38, id: 'ZEC', name: 'Zechariah', ch: 14 },
  { n: 39, id: 'MAL', name: 'Malachi', ch: 4 },
];

export const TOTAL_CHAPTERS = OT_BOOKS.reduce((sum, b) => sum + b.ch, 0); // 929

export const BY_ID: Record<string, BookDef> = Object.fromEntries(
  OT_BOOKS.map((b) => [b.id, b]),
);
