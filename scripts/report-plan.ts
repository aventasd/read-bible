/**
 * Writes PLAN.md, a human readable version of the generated reading plan.
 * This is what gets reviewed before any screen is built.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { Plan, Reading } from './build-plan.ts';
import { formatReading, hasParallel } from '../src/lib/refs.ts';

const plan: Plan = JSON.parse(readFileSync('data/plan.json', 'utf8'));

const label = (r: Reading): string => formatReading(r.parts);

const lines: string[] = [];
const ws = plan.readings.map((r) => r.words).sort((a, b) => a - b);
const median = ws[Math.floor(ws.length / 2)];

lines.push('# The Old Testament in One Year, in Historical Order');
lines.push('');
lines.push('313 readings, six days a week, one free day each week that the reader picks.');
lines.push('');
lines.push(`- **Chapters:** ${plan.totalChapters}, every one read exactly once`);
lines.push(`- **Readings:** ${plan.totalReadings}`);
lines.push(`- **Typical reading:** ${median} words, about ${(median / 150).toFixed(0)} to ${(median / 180 * 1.2).toFixed(0)} minutes`);
lines.push(`- **Longest reading:** ${Math.max(...plan.readings.map((r) => r.words))} words, about ${(Math.max(...plan.readings.map((r) => r.words)) / 150).toFixed(0)} minutes`);
lines.push(`- **Reference translation:** ${plan.translationLabel}`);
lines.push('');
lines.push('A bar `|` between passages means **the same events told by more than one writer**,');
lines.push('read side by side so the story is never read twice on different days.');
lines.push('');

lines.push('## The nine eras');
lines.push('');
lines.push('| Era | Name | Readings | Chapters | What happens |');
lines.push('|---|---|---|---|---|');
for (const e of plan.eras) {
  const mine = plan.readings.filter((r) => r.era === e.id);
  const chapters = mine.reduce((s, r) => s + r.chapters, 0);
  lines.push(`| ${e.id} | ${e.name} | ${e.firstReading} to ${e.lastReading} | ${chapters} | ${e.blurb} |`);
}
lines.push('');

for (const e of plan.eras) {
  const mine = plan.readings.filter((r) => r.era === e.id);
  lines.push(`## Era ${e.id}. ${e.name}`);
  lines.push('');
  lines.push(`*${e.blurb}*`);
  lines.push('');
  lines.push(`Readings ${e.firstReading} to ${e.lastReading}, ${mine.reduce((s, r) => s + r.chapters, 0)} chapters.`);
  lines.push('');
  for (const r of mine) {
    const mins = (r.words / 165).toFixed(0);
    lines.push(`${String(r.n).padStart(3)}. ${label(r)}${hasParallel(r.parts) ? '  *(includes the same events told twice)*' : ''}  \`${mins} min\``);
  }
  lines.push('');
}

writeFileSync('PLAN.md', lines.join('\n'));
console.log(`Wrote PLAN.md, ${lines.length} lines`);
