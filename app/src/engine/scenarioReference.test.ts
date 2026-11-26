import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import bundle from '../data/scenario-model.v05.json';
import { createScenarioReference, formatScenarioRange } from './scenarioReference';

const model = createScenarioReference(bundle);
test('4,001 inputs match independent Python interval inversion for both scenarios', () => {
  const gold = JSON.parse(readFileSync('../work/_research/five-to-nine-2026-11-26/trained-scenario-model/parity.json', 'utf8'));
  for (const row of gold) {
    const r = model.calculate(row.grade5);
    expect(r.estimate9).toBeNull();
    for (const name of ['optimistic', 'conservative'] as const) {
      const expected = row.prediction.scenarios[name].grade9_range;
      if (expected === null) expect(r.scenarios[name].range9).toBeNull();
      else {
        expect(r.scenarios[name].range9?.[0]).toBeCloseTo(expected[0], 9);
        expect(r.scenarios[name].range9?.[1]).toBeCloseTo(expected[1], 9);
      }
    }
  }
});
test('every source pair survives forward/inverse matching including plateaus', () => {
  for (const name of ['optimistic', 'conservative'] as const) {
    const c = bundle.curves[name];
    c.x9.forEach((x, i) => {
      const r = model.calculate(c.y5[i]).scenarios[name];
      expect(r.range9![0]).toBeLessThanOrEqual(x + 1e-9);
      expect(r.range9![1]).toBeGreaterThanOrEqual(x - 1e-9);
    });
    let last = 0;
    for (let i = 1000; i <= 5000; i++) {
      const range = model.calculate(i / 1000).scenarios[name].range9;
      if (range) { expect(range[0]).toBeGreaterThanOrEqual(last - 1e-9); last = range[0]; }
    }
  }
  expect(model.calculate(1).scenarios.conservative.range9![1]).toBeGreaterThan(1.4);
  expect(model.calculate(5)).toMatchObject({ status: 'outside_source_support', grade9Range: null });
});
test('1.17 does not silently select or average optimistic and conservative assumptions', () => {
  const r = model.calculate(1.17);
  expect(formatScenarioRange(r.scenarios.optimistic.range9)).toBe('1.41~1.44');
  expect(formatScenarioRange(r.scenarios.conservative.range9)).toBe('1.83~1.86');
  expect(r.estimate9).toBeNull();
  expect(r.confidenceInterval).toBe(false);
});
test('snapshots coefficients; rejects malformed models and invalid grades', () => {
  const copy = structuredClone(bundle), isolated = createScenarioReference(copy);
  copy.curves.optimistic.y5[1] = 5;
  expect(isolated.calculate(1.17)).toEqual(model.calculate(1.17));
  expect(() => createScenarioReference(copy)).toThrow();
  for (const grade of [NaN, Infinity, .99, 5.01]) expect(() => model.calculate(grade)).toThrow();
});
