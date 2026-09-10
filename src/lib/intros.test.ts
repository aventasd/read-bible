import { describe, it, expect } from 'vitest';
import { INTROS, introFor } from './intros.ts';
import { PLAN } from '../plan.ts';

describe('the one line intros', () => {
  it('covers every reading in the plan', () => {
    const missing = PLAN.readings.filter((r) => !INTROS[r.n]).map((r) => r.n);
    expect(missing).toEqual([]);
    expect(Object.keys(INTROS)).toHaveLength(PLAN.totalReadings);
  });

  it('has no intro for a reading number that does not exist', () => {
    const extra = Object.keys(INTROS).map(Number).filter((n) => n < 1 || n > PLAN.totalReadings);
    expect(extra).toEqual([]);
  });

  it('is one readable sentence each, not a fragment or an essay', () => {
    for (const [n, text] of Object.entries(INTROS)) {
      expect(text.trim(), `reading ${n}`).not.toBe('');
      expect(text.length, `reading ${n} is too long to scan`).toBeLessThanOrEqual(150);
      expect(text.length, `reading ${n} is too short to say anything`).toBeGreaterThan(20);
      expect(text.endsWith('.'), `reading ${n} needs a full stop`).toBe(true);
      expect(text[0], `reading ${n} should start with a capital`).toBe(text[0].toUpperCase());
    }
  });

  it('avoids the punctuation the house style bans', () => {
    for (const [n, text] of Object.entries(INTROS)) {
      expect(text, `reading ${n}`).not.toMatch(/[—–]|->|→/);
    }
  });

  it('returns null rather than undefined for a missing reading', () => {
    expect(introFor(9999)).toBeNull();
    expect(introFor(1)).toBeTruthy();
  });
});
