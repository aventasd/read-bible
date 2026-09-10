import { PLAN } from '../plan.ts';

/**
 * The whole year on one line, so Today can answer "how far am I" without a trip
 * to another screen. Each lane is one age, its WIDTH proportional to how many
 * readings that age holds, filled from the left as he reads.
 */
export function WhereStrip({ completed, currentEra }: { completed: Set<number>; currentEra: number }) {
  const era = PLAN.eras.find((e) => e.id === currentEra);
  return (
    <div class="where-strip">
      <div class="lanes" role="img" aria-label={`Age ${currentEra} of ${PLAN.eras.length}, ${era?.name ?? ''}`}>
        {PLAN.eras.map((e) => {
          const count = e.lastReading - e.firstReading + 1;
          const done = [...completed].filter((n) => n >= e.firstReading && n <= e.lastReading).length;
          return (
            <div
              key={e.id}
              class="lane"
              data-current={e.id === currentEra}
              style={{ '--era': `var(--era-${e.id})`, flexGrow: count }}
            >
              <span style={{ width: `${Math.round((done / count) * 100)}%` }} />
            </div>
          );
        })}
      </div>
      <p>
        Age {currentEra} of {PLAN.eras.length}. {completed.size} of {PLAN.totalReadings} readings done.
      </p>
    </div>
  );
}
