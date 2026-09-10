/**
 * Saving all 313 readings for offline use.
 *
 * Only the shell and the first ten readings are precached, because Workbox
 * install is all or nothing: one failed file on a weak signal means no offline
 * app at all, with nothing shown to the user. So the rest are fetched here,
 * deliberately, with a progress bar and a retry.
 */
import { PLAN, textUrl } from '../plan.ts';

const CACHE = 'reading-text-v1';
const CONCURRENCY = 6;

export interface SaveProgress {
  done: number;
  total: number;
  failed: number;
}

/** How many readings are already stored on the device. */
export async function countCached(): Promise<number> {
  try {
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    const stored = new Set(keys.map((r) => new URL(r.url).pathname));
    let count = 0;
    for (let n = 1; n <= PLAN.totalReadings; n++) {
      if (stored.has(new URL(textUrl(n), location.href).pathname)) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * Fetch and store every reading not already stored.
 * Resolves with how many failed, so the button can offer a retry.
 */
export async function saveAllForOffline(onProgress: (p: SaveProgress) => void): Promise<number> {
  let cache: Cache;
  try {
    cache = await caches.open(CACHE);
  } catch {
    onProgress({ done: 0, total: PLAN.totalReadings, failed: PLAN.totalReadings });
    return PLAN.totalReadings;
  }

  const pending: number[] = [];
  for (let n = 1; n <= PLAN.totalReadings; n++) {
    if (!(await cache.match(textUrl(n)))) pending.push(n);
  }

  const total = PLAN.totalReadings;
  let done = total - pending.length;
  let failed = 0;
  onProgress({ done, total, failed });

  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const n = pending[cursor++];
      try {
        await cache.add(textUrl(n));
      } catch {
        failed++;
      }
      done++;
      onProgress({ done, total, failed });
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return failed;
}
