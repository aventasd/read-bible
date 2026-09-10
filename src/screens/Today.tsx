import { PLAN, readingOf, minutesOf, eraOf } from '../plan.ts';
import { useProgress } from '../state/store.ts';
import { formatReading, passageGroups, nivLink, flatPassages } from '../lib/refs.ts';
import { introFor } from '../lib/intros.ts';
import { EraMark } from '../components/EraMark.tsx';
import { WhereStrip } from '../components/WhereStrip.tsx';

export function Today({ onRead }: { onRead: (n: number) => void }) {
  const { store, completed, position } = useProgress();
  const n = position.next;

  if (n === null) {
    return (
      <div class="screen">
        <div class="screen-head">
          <h1 class="screen-title">Finished</h1>
          <p>You read the whole Old Testament. All {PLAN.totalReadings} readings, {PLAN.totalChapters} chapters.</p>
        </div>
        <p class="empty">
          Start again whenever you like. Settings has a reset, and your backup file keeps this year safe.
        </p>
      </div>
    );
  }

  const reading = readingOf(n)!;
  const era = eraOf(reading.era)!;
  const groups = passageGroups(flatPassages(reading.parts));
  const intro = introFor(n) ?? era.blurb;
  const hasParallel = reading.parts.some((p) => p.parallel);
  const label = formatReading(reading.parts);
  const [firstLine, ...restLines] = label.split(' with ');

  return (
    <div class="screen">
      <EraMark era={reading.era} reading={n} total={PLAN.totalReadings} />

      <h1 class="passage">
        {firstLine}
        {restLines.length > 0 && <span class="with">with {restLines.join(' and ')}</span>}
      </h1>

      <p class="intro">{intro}</p>

      <p class="facts">
        {minutesOf(reading)} minutes, {reading.verses} verses
      </p>

      {hasParallel && (
        <p class="parallel-note">
          Two writers tell this part of the story. Reading them together means you
          never read the same events twice on different days.
        </p>
      )}

      {position.waiting > 1 && (
        <div class="waiting">
          <span>
            {position.waiting} readings waiting. Your free day is there to catch up.
          </span>
        </div>
      )}

      <div class="actions">
        <a class="btn" href={`#/read/${n}`}>
          Read here
        </a>
        {/* One NIV button, not one per book. A reading can span three books, and
            five buttons would bury the one that matters. The reader screen has an
            NIV link beside every chapter heading for the rest. */}
        <a class="btn" href={nivLink(groups[0].book, groups[0].firstChapter)} target="_blank" rel="noreferrer">
          Read in the NIV
        </a>

        <button
          class={completed.has(n) ? 'btn btn-done' : 'btn btn-primary'}
          onClick={() => {
            store.markRead(n);
            onRead(n);
          }}
        >
          {completed.has(n) ? 'Read' : 'Mark as read'}
        </button>
      </div>

      <WhereStrip completed={completed} currentEra={reading.era} />
    </div>
  );
}
