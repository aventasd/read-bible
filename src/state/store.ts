/**
 * One place the screens read from, so no screen owns state another screen needs.
 */
import { useEffect, useState } from 'preact/hooks';
import { PLAN, readingOf } from '../plan.ts';
import { ProgressStore, requestPersistence } from './progress.ts';
import { position, type Position } from './schedule.ts';
import { stats, type Stats } from './streak.ts';
import { localToday } from './dates.ts';

let store: ProgressStore | null = null;

export async function initStore(): Promise<ProgressStore> {
  store = await ProgressStore.load(PLAN.version, PLAN.totalReadings);
  void requestPersistence();
  return store;
}

export const getStore = (): ProgressStore => {
  if (!store) throw new Error('Progress store used before it was loaded.');
  return store;
};

/** Re-renders the calling component whenever progress changes. */
export function useProgress(): {
  store: ProgressStore;
  completed: Set<number>;
  position: Position;
  stats: Stats;
} {
  const s = getStore();
  const [, bump] = useState(0);

  useEffect(() => s.subscribe(() => bump((v) => v + 1)), [s]);

  const state = s.get();
  const completed = s.completed;
  const today = localToday();
  return {
    store: s,
    completed,
    position: position(completed, PLAN.totalReadings, state, today),
    stats: stats(state.log, PLAN.totalReadings, state.restDay, today, (n) => readingOf(n)?.chapters ?? 0),
  };
}
