import { useState } from 'preact/hooks';
import { PLAN, readingOf, minutesOf } from '../plan.ts';
import { useProgress } from '../state/store.ts';
import { formatReading } from '../lib/refs.ts';

/**
 * The whole plan as nine stacked ages.
 *
 * A row's HEIGHT is proportional to how many readings that age holds, so the
 * shape of the history is visible: Jerusalem Falls is 55 readings and looks it,
 * A Land of Their Own is 20 and looks it. The coloured bar fills from the bottom
 * as he reads through the age.
 *
 * The bar and its label live in the SAME row rather than in two parallel
 * columns, because two columns cannot stay aligned once the text wraps.
 */
const MIN_ROW = 54;
const PIXELS_PER_READING = 2;

export function Timeline({ onOpen }: { onOpen: (n: number) => void }) {
  const { completed, position } = useProgress();
  const [open, setOpen] = useState<number | null>(null);

  const currentEra = position.next === null ? PLAN.eras.length : readingOf(position.next)!.era;

  return (
    <div class="screen">
      <div class="screen-head">
        <h1 class="screen-title">The whole story, in order</h1>
        <p>
          {position.done} of {PLAN.totalReadings} readings done. Each age is as tall as
          it is long to read.
        </p>
      </div>

      <div class="ages">
        {PLAN.eras.map((era) => {
          const count = era.lastReading - era.firstReading + 1;
          const doneHere = [...completed].filter((n) => n >= era.firstReading && n <= era.lastReading).length;
          const isOpen = open === era.id;
          return (
            <div key={era.id}>
              <button
                class="age"
                style={{
                  '--era': `var(--era-${era.id})`,
                  minHeight: `${Math.max(MIN_ROW, count * PIXELS_PER_READING)}px`,
                }}
                data-current={era.id === currentEra}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : era.id)}
              >
                <span class="age-bar" aria-hidden="true">
                  <span class="age-fill" style={{ height: `${Math.round((doneHere / count) * 100)}%` }} />
                </span>
                <span class="age-text">
                  <span class="name">{era.name}</span>
                  <span class="meta">
                    {doneHere} of {count} readings
                    {era.id === currentEra ? ', you are here' : ''}
                  </span>
                  {isOpen && <span class="blurb">{era.blurb}</span>}
                </span>
              </button>

              {isOpen && (
                <ul class="reading-list">
                  {PLAN.readings
                    .filter((r) => r.era === era.id)
                    .map((r) => {
                      const done = completed.has(r.n);
                      return (
                        <li key={r.n}>
                          <button data-done={done} onClick={() => onOpen(r.n)}>
                            <span class="n">{r.n}</span>
                            <span class="label">
                              {formatReading(r.parts)}
                              {r.n === position.next ? ' (next)' : ''}
                            </span>
                            <span class="tick" data-done={done}>
                              {done ? '✓' : `${minutesOf(r)} min`}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
