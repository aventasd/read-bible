import { eraOf } from '../plan.ts';

/** The thin coloured rule that says where in history this reading sits. */
export function EraMark({ era, reading, total }: { era: number; reading?: number; total?: number }) {
  const e = eraOf(era);
  if (!e) return null;
  return (
    <div class="era-mark" style={{ '--era': `var(--era-${era})` }}>
      <div class="rule" />
      <div class="who">
        <strong>{e.name}</strong>
        {reading && total ? `Reading ${reading} of ${total}` : e.blurb}
      </div>
    </div>
  );
}
