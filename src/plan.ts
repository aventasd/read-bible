/**
 * The reading plan, bundled into the app.
 *
 * plan.json is 7 KB gzipped, so bundling it costs less than a fetch would and it
 * can never be missing when offline.
 */
import planJson from '../data/plan.json';

export interface Passage {
  book: string;
  name: string;
  startChapter: number;
  endChapter: number;
}

export interface ReadingPart {
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

export interface Era {
  id: number;
  name: string;
  blurb: string;
  firstReading: number;
  lastReading: number;
}

export interface Plan {
  version: number;
  translationLabel: string;
  totalReadings: number;
  totalChapters: number;
  eras: Era[];
  readings: Reading[];
}

export const PLAN = planJson as Plan;

export const readingOf = (n: number): Reading | undefined => PLAN.readings[n - 1];
export const eraOf = (id: number): Era | undefined => PLAN.eras.find((e) => e.id === id);

/** Minutes at a school age reading speed, rounded to something believable. */
export const minutesOf = (reading: Reading): number => Math.max(1, Math.round(reading.words / 165));

/** The path of a reading's text, versioned so the files are immutable. */
export const textUrl = (n: number): string =>
  `${import.meta.env.BASE_URL}text/v1/r${String(n).padStart(3, '0')}.json`;
