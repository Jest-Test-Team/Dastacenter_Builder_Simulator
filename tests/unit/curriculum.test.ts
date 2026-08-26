/**
 * The curriculum's two invariants.
 *
 * 1. Every code excerpt in a lesson is verbatim from the file it names. Teaching
 *    material that has drifted from the contract it claims to explain is worse
 *    than none, and drift is silent — nothing else in the build would catch it.
 * 2. The catalog itself parses, its prerequisites resolve, and its quizzes point
 *    at options that exist.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ModuleSchema,
  getModule,
  modules,
  modulesInTrack,
  nextModule,
  previousModule,
} from '@/lib/content/modules';

const repoRoot = join(__dirname, '..', '..');

describe('code excerpts', () => {
  const blocks = modules.flatMap((m) =>
    m.lessons.flatMap((l) => l.code.map((c) => ({ module: m.id, ...c }))),
  );

  it('quotes at least one real circuit', () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  it.each(blocks)('$module quotes $file verbatim', ({ file, source }) => {
    const real = readFileSync(join(repoRoot, file), 'utf8');
    expect(real).toContain(source.trim());
  });

  it.each(blocks)('$module highlights lines that exist in $file', ({ source, highlight }) => {
    const lineCount = source.replace(/\n+$/, '').split('\n').length;
    for (const line of highlight) expect(line).toBeLessThan(lineCount);
  });
});

describe('module catalog', () => {
  it('parses every module', () => {
    for (const m of modules) expect(() => ModuleSchema.parse(m)).not.toThrow();
  });

  it('has unique ids', () => {
    expect(new Set(modules.map((m) => m.id)).size).toBe(modules.length);
  });

  it('resolves every prerequisite to a real module', () => {
    for (const m of modules) {
      for (const p of m.prerequisites) expect(getModule(p), `${m.id} -> ${p}`).toBeDefined();
    }
  });

  it('keeps quiz answers within range', () => {
    for (const m of modules) {
      for (const q of m.quiz) expect(q.options[q.answerIndex]).toBeDefined();
    }
  });

  it('carries both tracks', () => {
    expect(modulesInTrack('facility').length).toBe(8);
    expect(modulesInTrack('privacy').length).toBeGreaterThanOrEqual(5);
  });

  it('chains the privacy track end to end', () => {
    const track = modulesInTrack('privacy');
    const first = track[0];
    const last = track[track.length - 1];
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    expect(previousModule(first!.id)).toBeUndefined();
    expect(nextModule(last!.id)).toBeUndefined();

    // Walking `next` from the first module must reach every module in the track.
    const walked: string[] = [];
    let cursor = first;
    while (cursor) {
      walked.push(cursor.id);
      cursor = nextModule(cursor.id);
    }
    expect(walked).toEqual(track.map((m) => m.id));
  });
});
