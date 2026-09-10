/**
 * Getting progress off the phone, and back on.
 *
 * The only thing that survives clearing Chrome's site data is a file outside the
 * browser's storage. So there are two destinations: the Android share sheet,
 * which sends it off the device entirely, and a plain download, which lands in
 * the Downloads folder. One format, and the same file imports back.
 */
import type { ProgressStore } from './progress.ts';
import { PLAN } from '../plan.ts';
import { formatDate } from './dates.ts';
import type { Stats } from './streak.ts';
import type { Position } from './schedule.ts';

/**
 * The file is named .txt, not .json.
 *
 * Chromium's Web Share file allowlist includes text/plain and EXCLUDES JSON, so
 * a .json share is rejected outright. The JSON text lives inside a .txt name.
 */
export const backupFileName = (): string => `old-testament-progress-${new Date().toISOString().slice(0, 10)}.txt`;

/** A line a parent can read at a glance, sent alongside the file. */
export function summaryLine(stats: Stats, position: Position, finishDate: string | null): string {
  const parts = [
    `Reading ${stats.done} of ${stats.total}.`,
    stats.currentStreak > 0 ? `${stats.currentStreak} day streak.` : null,
    `${stats.percent} percent of the Old Testament finished.`,
    position.waiting > 0 ? `${position.waiting} readings waiting.` : 'Up to date.',
    finishDate
      ? `${position.waiting > 0 ? 'At this pace, finishes' : 'On track to finish'} ${formatDate(finishDate)}.`
      : 'The whole Old Testament is finished.',
  ];
  return parts.filter(Boolean).join(' ');
}

function makeFile(store: ProgressStore, summary: string): File {
  const body = `${summary}\n\nThis file also restores progress. Open the app, go to Settings and choose Restore from a file.\n\n${store.export()}\n`;
  return new File([body], backupFileName(), { type: 'text/plain' });
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/**
 * Share when the phone can, download when it cannot. Both are offered in the UI,
 * because sharing sends it off the device while a download survives clearing
 * site data. Different protections, so neither replaces the other.
 */
export async function shareProgress(store: ProgressStore, summary: string): Promise<ShareResult> {
  const file = makeFile(store, summary);
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Old Testament reading progress',
        text: summary,
      });
      return 'shared';
    }
  } catch (err) {
    // A cancelled share sheet throws AbortError, which is not a failure.
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
  return downloadProgress(store, summary) ? 'downloaded' : 'failed';
}

export function downloadProgress(store: ProgressStore, summary: string): boolean {
  try {
    const file = makeFile(store, summary);
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pull the stored progress back out of a backup file. The file also carries a
 * readable summary at the top, so find the JSON rather than assuming the whole
 * file is JSON.
 */
export function extractState(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

export const planLabel = (): string => `${PLAN.totalReadings} readings, plan version ${PLAN.version}`;
