import { PLAN, readingOf } from '../plan.ts';
import { useProgress } from '../state/store.ts';
import { finishDate } from '../state/schedule.ts';
import { formatDate } from '../state/dates.ts';

export function Progress({ onOpen }: { onOpen: (n: number) => void }) {
  const { store, completed, position, stats } = useProgress();
  const settings = store.get();
  const paceFinish = finishDate(position, PLAN.totalReadings, settings);

  return (
    <div class="screen">
      <div class="screen-head">
        <h1 class="screen-title">Progress</h1>
        <p>
          {stats.percent} percent of the Old Testament finished.
        </p>
      </div>

      <div class="bar" role="img" aria-label={`${stats.percent} percent finished`}>
        <span style={{ width: `${stats.percent}%` }} />
      </div>

      <dl class="stat-rows">
        <div>
          <dt>Readings done</dt>
          <dd>
            {stats.done} of {stats.total}
          </dd>
        </div>
        <div>
          <dt>Chapters read</dt>
          <dd>
            {stats.chaptersRead} of {PLAN.totalChapters}
          </dd>
        </div>
        <div>
          <dt>Current streak</dt>
          <dd>{stats.currentStreak === 1 ? '1 day' : `${stats.currentStreak} days`}</dd>
        </div>
        <div>
          <dt>Longest streak</dt>
          <dd>{stats.longestStreak === 1 ? '1 day' : `${stats.longestStreak} days`}</dd>
        </div>
        <div>
          <dt>Days you read</dt>
          <dd>{stats.daysRead}</dd>
        </div>
        <div>
          <dt>{position.waiting > 0 ? 'Readings waiting' : 'Up to date'}</dt>
          <dd>{position.waiting > 0 ? position.waiting : 'Yes'}</dd>
        </div>
        <div>
          <dt>{position.waiting > 0 ? 'Finishes at this pace' : 'Finishes on'}</dt>
          <dd>{paceFinish ? formatDate(paceFinish) : 'Finished'}</dd>
        </div>
      </dl>

      <h2 class="screen-title" style={{ marginTop: '28px' }}>
        The whole year
      </h2>
      <p class="facts" style={{ marginTop: '2px' }}>
        One mark per reading, coloured by which age of the history it belongs to.
      </p>

      <div class="year-grid">
        {PLAN.readings.map((r) => (
          <i
            key={r.n}
            data-done={completed.has(r.n)}
            data-next={r.n === position.next}
            style={{ '--era': `var(--era-${r.era})` }}
            title={`Reading ${r.n}`}
            onClick={() => onOpen(r.n)}
          />
        ))}
      </div>

      {position.next !== null && (
        <p class="facts" style={{ marginTop: '14px' }}>
          Next up is reading {position.next}, in {PLAN.eras.find((e) => e.id === readingOf(position.next!)!.era)!.name}.
        </p>
      )}
    </div>
  );
}
