import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createCalibratedFusion, type CalibratedFusionBundle, type GradeDefinitionProfile } from './calibratedFusion';

const root = resolve(process.cwd(), '../work/_research/five-to-nine-2026-11-26/trained-calibrated-model');
const bundle = JSON.parse(readFileSync(resolve(root, 'model.json'), 'utf8')) as CalibratedFusionBundle;
const gold = JSON.parse(readFileSync(resolve(root, 'python-parity.json'), 'utf8')) as {
  grade: number; profiles: Record<GradeDefinitionProfile, { estimate9: number | null;
    learned_range9: [number, number] | null; available_weight: number }>;
}[];
const model = () => createCalibratedFusion(bundle, { mode: 'research' });

describe('calibrated v0.4 numeric runtime', () => {
  it('matches Python over 4,001 grades and all three grade-definition profiles', () => {
    const m = model();
    for (const row of gold) {
      for (const profile of Object.keys(row.profiles) as GradeDefinitionProfile[]) {
        const actual = m.calculate(row.grade, profile), expected = row.profiles[profile];
        if (expected.estimate9 === null) expect(actual.estimate9).toBeNull();
        else expect(actual.estimate9).toBeCloseTo(expected.estimate9, 9);
        if (expected.learned_range9 === null) expect(actual.learnedRange9).toBeNull();
        else {
          expect(actual.learnedRange9?.[0]).toBeCloseTo(expected.learned_range9[0], 9);
          expect(actual.learnedRange9?.[1]).toBeCloseTo(expected.learned_range9[1], 9);
        }
        expect(actual.availableWeight).toBe(expected.available_weight);
      }
    }
  }, 30000);

  it('keeps estimates monotone when the same profile has complete support', () => {
    const m = model();
    for (const profile of Object.keys(bundle.profiles) as GradeDefinitionProfile[]) {
      let last = 1;
      for (const row of gold) {
        const result = m.calculate(row.grade, profile);
        if (result.estimate9 !== null) {
          expect(result.estimate9).toBeGreaterThanOrEqual(last - 1e-9);
          last = result.estimate9;
        }
      }
    }
  }, 30000);

  it('does not shrink uncertainty below the original source envelope', () => {
    const m = model();
    for (const g of [1, 1.1, 1.3, 1.5, 2, 2.001, 3, 3.001, 4.6, 5]) {
      const r = m.calculate(g);
      if (r.originalReferenceRange9) {
        expect(r.grade9Range![0]).toBeLessThanOrEqual(r.originalReferenceRange9[0]);
        expect(r.grade9Range![1]).toBeGreaterThanOrEqual(r.originalReferenceRange9[1]);
      }
      expect(r.confidenceInterval).toBe(false);
      expect(r.admissionProbability).toBeNull();
    }
  });

  it('rejects a non-monotone or discontinuous coefficient file', () => {
    const a = structuredClone(bundle); a.curves[2].coefficients[2][2] = -100;
    const b = structuredClone(bundle); b.curves[2].coefficients[2][3] += .1;
    const c = structuredClone(bundle); c.errorBins[0].margins9[0] = -1;
    const d = structuredClone(bundle); d.profiles.unspecified = [0, 0, 0, 0];
    for (const data of [a, b, c, d]) expect(() => createCalibratedFusion(data, { mode: 'research' })).toThrow();
  });

  it('is synchronous, deterministic, offline and source-anonymous', () => {
    const noNetwork = vi.fn(() => { throw new Error('Offline'); });
    vi.stubGlobal('fetch', noNetwork);
    try {
      const m = model(), a = m.calculate('1.5');
      expect(a).not.toBeInstanceOf(Promise);
      expect(m.calculate(1.5)).toEqual(a);
      expect(noNetwork).not.toHaveBeenCalled();
      for (const token of ['busan', 'gyeonggi', 'youniv', 'source_file']) expect(JSON.stringify(a)).not.toContain(token);
    } finally { vi.unstubAllGlobals(); }
  });

  it('separates source-definition scenarios and marks their policy weights', () => {
    const m = model(), simple = m.calculate(1.5, 'core_simple'), weighted = m.calculate(1.5, 'ranked_credits');
    expect(simple.estimate9).toBeCloseTo(2.20, 2);
    expect(weighted.estimate9).toBeCloseTo(2.39, 2);
    expect(simple.profileWeightsArePolicy).toBe(true);
    expect(simple.gradeDefinitionMatched).toBe(false);
  });

  it('still requires explicit research mode and rejects invalid grades', () => {
    expect(() => createCalibratedFusion(bundle)).toThrow('research-only');
    const m = model();
    for (const g of ['', '1e0', NaN, 0, 5.01]) expect(() => m.calculate(g)).toThrow();
    expect(m.calculate(5).estimate9).toBeNull();
  });

  it('isolates caller mutations and keeps medical capacity out of grade calibration', () => {
    const b = structuredClone(bundle), m = createCalibratedFusion(b, { mode: 'research' });
    const first = m.calculate(1.5);
    b.curves[2].coefficients[0][0] = 999;
    expect(m.calculate(1.5)).toEqual(first);
    const c = structuredClone(bundle); c.baselineModel.capacity.provisionalSeats *= 2;
    const doubled = createCalibratedFusion(c, { mode: 'research' }).calculate(1.5);
    expect(doubled.estimate9).toEqual(first.estimate9);
    expect(doubled.grade9Range).toEqual(first.grade9Range);
    expect(doubled.populationScenarios[0].regionalCases[0].cases[0].segmentToProvisionalSeats)
      .toBeCloseTo(first.populationScenarios[0].regionalCases[0].cases[0].segmentToProvisionalSeats! / 2, 10);
  });
});
