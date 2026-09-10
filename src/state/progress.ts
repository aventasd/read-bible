/**
 * Reading progress: how it is stored, merged, backed up and restored.
 *
 * WHY IT IS SHAPED LIKE THIS
 *
 * 1. Progress is an APPEND ONLY LOG, not a set of finished numbers. Two logs
 *    merge cleanly by union, so importing a backup on top of existing progress
 *    always gives the right answer. Two plain sets do not merge safely.
 *
 * 2. IndexedDB is the source of truth, MIRRORED to localStorage on every write.
 *    IndexedDB gives atomic writes and is the only one navigator.storage.persist()
 *    protects. The mirror is a second independent copy. Startup reads both and
 *    takes the union, so losing one is recoverable.
 *
 * 3. Neither survives clearing Chrome's site data. Nothing in a browser does.
 *    That is why the backup file in Settings is a version 1 feature and not a
 *    nice extra.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { localToday, type IsoDate } from './dates.ts';

export const SCHEMA_VERSION = 1;

const LS_KEY = 'read-bible.progress';
const DB_NAME = 'read-bible';
const DB_STORE = 'state';
const DB_KEY = 'progress';

export interface LogEntry {
  reading: number;
  /** When it was marked read, in UTC. */
  completedAtUtc: string;
  /** The date the DEVICE believed it was. Streaks are computed from these. */
  localDate: IsoDate;
}

export interface ProgressState {
  schemaVersion: number;
  /** Which plan.json these reading numbers refer to. */
  planVersion: number;
  startDate: IsoDate;
  /** 0 = Sunday. */
  restDay: number;
  fontScale: number;
  /** Last write, used to decide whose settings win when merging. */
  updatedAt: string;
  log: LogEntry[];
}

export function emptyState(planVersion: number, today: IsoDate = localToday()): ProgressState {
  return {
    schemaVersion: SCHEMA_VERSION,
    planVersion,
    startDate: today,
    restDay: 0,
    fontScale: 1,
    updatedAt: new Date().toISOString(),
    log: [],
  };
}

export const completedSet = (state: ProgressState): Set<number> =>
  new Set(state.log.map((e) => e.reading));

// --- merging ---------------------------------------------------------------

/**
 * Union of two logs. When both hold the same reading, the EARLIER completion
 * wins, because that is when it was actually first read.
 */
export function mergeLogs(a: LogEntry[], b: LogEntry[]): LogEntry[] {
  const byReading = new Map<number, LogEntry>();
  for (const e of [...a, ...b]) {
    const existing = byReading.get(e.reading);
    if (!existing || e.completedAtUtc < existing.completedAtUtc) byReading.set(e.reading, e);
  }
  return [...byReading.values()].sort((x, y) => x.reading - y.reading);
}

/** Settings come from whichever copy was written last; logs are always unioned. */
export function mergeStates(a: ProgressState | null, b: ProgressState | null): ProgressState | null {
  if (!a) return b;
  if (!b) return a;
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  return { ...newer, log: mergeLogs(a.log, b.log) };
}

// --- validation ------------------------------------------------------------

const isIsoDate = (v: unknown): v is IsoDate => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Accepts only data that is safe to use, and repairs what it safely can.
 * Returns null when the input is not recognisable progress at all.
 */
export function parseState(raw: unknown, totalReadings: number): ProgressState | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!isIsoDate(o.startDate)) return null;
  if (!Array.isArray(o.log)) return null;

  const log: LogEntry[] = [];
  const seen = new Set<number>();
  for (const item of o.log) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const reading = Number(e.reading);
    if (!Number.isInteger(reading) || reading < 1 || reading > totalReadings) continue;
    if (seen.has(reading)) continue;
    seen.add(reading);
    log.push({
      reading,
      completedAtUtc: typeof e.completedAtUtc === 'string' ? e.completedAtUtc : new Date(0).toISOString(),
      localDate: isIsoDate(e.localDate) ? e.localDate : String(e.completedAtUtc ?? '').slice(0, 10) || o.startDate,
    });
  }

  const restDay = Number(o.restDay);
  const fontScale = Number(o.fontScale);
  return {
    schemaVersion: Number(o.schemaVersion) || SCHEMA_VERSION,
    planVersion: Number(o.planVersion) || 1,
    startDate: o.startDate,
    restDay: Number.isInteger(restDay) && restDay >= 0 && restDay <= 6 ? restDay : 0,
    fontScale: fontScale >= 0.8 && fontScale <= 2 ? fontScale : 1,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date(0).toISOString(),
    log: log.sort((x, y) => x.reading - y.reading),
  };
}

// --- the two stores --------------------------------------------------------

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(DB_STORE)) d.createObjectStore(DB_STORE);
      },
    });
  }
  return dbPromise;
}

async function readIdb(total: number): Promise<ProgressState | null> {
  try {
    const raw = await (await db()).get(DB_STORE, DB_KEY);
    return parseState(raw, total);
  } catch {
    return null; // private windows and blocked site data both land here
  }
}

function readLocal(total: number): ProgressState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? parseState(JSON.parse(raw), total) : null;
  } catch {
    return null;
  }
}

async function writeBoth(state: ProgressState): Promise<void> {
  try {
    await (await db()).put(DB_STORE, state, DB_KEY);
  } catch {
    /* keep going: the mirror below may still succeed */
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* nothing more we can do here; the backup file is the real safety net */
  }
}

/**
 * Ask the browser to protect stored data from being evicted under storage
 * pressure. Only helps IndexedDB, and only sometimes, so it is a bonus rather
 * than a plan.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// --- the store the app talks to -------------------------------------------

export class ProgressStore {
  private state: ProgressState;
  private listeners = new Set<() => void>();

  constructor(
    private readonly planVersion: number,
    private readonly totalReadings: number,
    initial?: ProgressState,
  ) {
    this.state = initial ?? emptyState(planVersion);
  }

  /** Reads both stores and takes the union, so one being wiped is survivable. */
  static async load(planVersion: number, totalReadings: number): Promise<ProgressStore> {
    const [fromIdb, fromLocal] = await Promise.all([
      readIdb(totalReadings),
      Promise.resolve(readLocal(totalReadings)),
    ]);
    const merged = mergeStates(fromIdb, fromLocal);
    const store = new ProgressStore(planVersion, totalReadings, merged ?? emptyState(planVersion));
    // If only one store had data, write it back so both agree from now on.
    if (merged && (!fromIdb || !fromLocal)) void writeBoth(merged);
    return store;
  }

  get(): ProgressState {
    return this.state;
  }

  get completed(): Set<number> {
    return completedSet(this.state);
  }

  /**
   * True when stored progress belongs to a different plan version. The app must
   * say so plainly rather than show the wrong chapters.
   */
  get planMismatch(): boolean {
    return this.state.log.length > 0 && this.state.planVersion !== this.planVersion;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private commit(next: ProgressState): void {
    this.state = { ...next, updatedAt: new Date().toISOString() };
    void writeBoth(this.state);
    for (const fn of this.listeners) fn();
  }

  markRead(reading: number, now: Date = new Date()): void {
    if (this.completed.has(reading)) return;
    const entry: LogEntry = {
      reading,
      completedAtUtc: now.toISOString(),
      localDate: localToday(now),
    };
    this.commit({ ...this.state, log: mergeLogs(this.state.log, [entry]) });
  }

  markUnread(reading: number): void {
    this.commit({ ...this.state, log: this.state.log.filter((e) => e.reading !== reading) });
  }

  setSettings(patch: Partial<Pick<ProgressState, 'startDate' | 'restDay' | 'fontScale'>>): void {
    this.commit({ ...this.state, ...patch });
  }

  /**
   * Mark everything up to and including `reading` as read. Used by the repair
   * field in Settings: "I am on reading number ___".
   */
  repairTo(reading: number, now: Date = new Date()): void {
    const entries: LogEntry[] = [];
    for (let n = 1; n <= reading; n++) {
      entries.push({ reading: n, completedAtUtc: now.toISOString(), localDate: localToday(now) });
    }
    this.commit({ ...this.state, log: mergeLogs(this.state.log, entries) });
  }

  reset(): void {
    this.commit({ ...emptyState(this.planVersion), startDate: this.state.startDate, restDay: this.state.restDay });
  }

  /** The backup payload. Imports back through importBackup. */
  export(): string {
    return JSON.stringify(this.state, null, 1);
  }

  /**
   * Merge a backup into current progress. Never destructive: the union of both
   * logs is kept, so importing an old backup cannot lose newer readings.
   */
  importBackup(text: string): { ok: true; added: number } | { ok: false; reason: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, reason: 'That file is not a backup this app can read.' };
    }
    const incoming = parseState(parsed, this.totalReadings);
    if (!incoming) return { ok: false, reason: 'That file is not a backup this app can read.' };

    const before = this.completed.size;
    const merged = mergeStates(this.state, incoming)!;
    this.commit(merged);
    return { ok: true, added: this.completed.size - before };
  }
}
