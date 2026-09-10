/**
 * The plan must be reproducible.
 *
 * Progress is stored as reading numbers, so if a rebuild produced a different
 * split, reading 84 would quietly start meaning different chapters and a year of
 * someone's history would point at the wrong place. This test rebuilds the plan
 * and asserts the bytes are unchanged.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = () => createHash('sha256').update(readFileSync('data/plan.json')).digest('hex');

describe('plan reproducibility', () => {
  it('produces identical bytes when rebuilt', () => {
    const before = hash();
    execFileSync('npx', ['tsx', 'scripts/build-plan.ts'], { stdio: 'pipe' });
    expect(hash()).toBe(before);
  }, 60_000);
});
