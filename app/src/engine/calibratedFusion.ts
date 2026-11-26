/** Offline-fitted, shape-preserving numeric runtime. No AI, network or fitting. */
import { createNumericFusion, type NumericFusionBundle, type NumericFusionResult, type NumericRange } from './numericFusion';

export type GradeDefinitionProfile = 'unspecified' | 'core_simple' | 'ranked_credits';
interface PolynomialCurve { x9: number[]; coefficients: [number, number, number, number][]; support5: NumericRange }
export interface CalibratedFusionBundle {
  format: 'unavi-calibrated-fusion'; schemaVersion: 1; modelVersion: string;
  reviewStatus: 'research_only' | 'verified'; admissionYear: number;
  curves: PolynomialCurve[]; errorMargins9: number[];
  errorBins: { upperGrade5: number; margins9: number[]; calibrationCounts: number[] }[];
  profiles: Record<GradeDefinitionProfile, number[]>; baselineModel: NumericFusionBundle;
}
const valid = (x: unknown, min: number, max: number): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const bad = () => new Error('Invalid calibrated numeric model');

function evaluate(curve: PolynomialCurve, x: number): number {
  let lo = 0, hi = curve.x9.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (curve.x9[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.min(curve.x9.length - 2, Math.max(0, lo - 1));
  const [a, b, c, d] = curve.coefficients[i], z = x - curve.x9[i];
  return ((a * z + b) * z + c) * z + d;
}

function validate(value: unknown): CalibratedFusionBundle {
  const b = structuredClone(value) as CalibratedFusionBundle;
  if (!b || b.format !== 'unavi-calibrated-fusion' || b.schemaVersion !== 1 || !b.modelVersion
    || !['research_only', 'verified'].includes(b.reviewStatus) || !Number.isInteger(b.admissionYear)
    || b.admissionYear !== b.baselineModel?.admissionYear || !Array.isArray(b.curves) || b.curves.length !== 4) throw bad();
  for (const c of b.curves) {
    if (!c || !Array.isArray(c.x9) || c.x9.length < 2 || !Array.isArray(c.coefficients)
      || c.coefficients.length !== c.x9.length - 1
      || c.x9.some((x, i) => !valid(x, 1, 9) || (i > 0 && x <= c.x9[i - 1]))
      || !Array.isArray(c.support5) || c.support5.length !== 2
      || !valid(c.support5[0], 1, 5) || !valid(c.support5[1], c.support5[0], 5)) throw bad();
    for (let i = 0; i < c.coefficients.length; i++) {
      const coeff = c.coefficients[i];
      if (!Array.isArray(coeff) || coeff.length !== 4 || coeff.some(x => !Number.isFinite(x))) throw bad();
      const [a, q, slope, y] = coeff, h = c.x9[i + 1] - c.x9[i];
      const derivative = (z: number) => 3 * a * z * z + 2 * q * z + slope;
      const candidates = [0, h];
      if (a !== 0) { const vertex = -q / (3 * a); if (vertex > 0 && vertex < h) candidates.push(vertex); }
      const endpoint = ((a * h + q) * h + slope) * h + y;
      if (candidates.some(z => derivative(z) < -1e-8) || !valid(y, 1 - 1e-9, 5 + 1e-9)
        || !valid(endpoint, 1 - 1e-9, 5 + 1e-9)
        || (i + 1 < c.coefficients.length && Math.abs(endpoint - c.coefficients[i + 1][3]) > 1e-8)) throw bad();
    }
    if (Math.abs(evaluate(c, c.x9[0]) - c.support5[0]) > 1e-8
      || Math.abs(evaluate(c, c.x9[c.x9.length - 1]) - c.support5[1]) > 1e-8) throw bad();
  }
  const marginsOK = (v: unknown): v is number[] => Array.isArray(v) && v.length === 4 && v.every(x => valid(x, 0, 8));
  if (!marginsOK(b.errorMargins9) || !Array.isArray(b.errorBins) || !b.errorBins.length
    || b.errorBins[b.errorBins.length - 1].upperGrade5 !== 5) throw bad();
  b.errorBins.forEach((bin, i) => {
    if (!bin || !valid(bin.upperGrade5, 1, 5) || (i > 0 && bin.upperGrade5 <= b.errorBins[i - 1].upperGrade5)
      || !marginsOK(bin.margins9) || !Array.isArray(bin.calibrationCounts) || bin.calibrationCounts.length !== 4
      || bin.calibrationCounts.some(n => !Number.isInteger(n) || n < 0)) throw bad();
  });
  for (const p of ['unspecified', 'core_simple', 'ranked_credits'] as const) {
    const w = b.profiles?.[p];
    if (!Array.isArray(w) || w.length !== 4 || w.some(n => !valid(n, 0, 1)) || !w.some(n => n > 0)) throw bad();
  }
  return b;
}

function inverse(curve: PolynomialCurve, grade: number): NumericRange | null {
  const low = Math.max(1, grade - .005), high = Math.min(5, grade + .005);
  const [ymin, ymax] = curve.support5, xs = curve.x9;
  if (high < ymin - 1e-10 || low > ymax + 1e-10) return null;
  const boundary = (y: number, lower: boolean) => {
    if (lower && y <= ymin) return xs[0];
    if (!lower && y >= ymax) return xs[xs.length - 1];
    let left = xs[0], right = xs[xs.length - 1];
    for (let i = 0; i < 55; i++) {
      const mid = (left + right) / 2, v = evaluate(curve, mid);
      if (lower ? v < y : v <= y) left = mid;
      else right = mid;
    }
    return (left + right) / 2;
  };
  return [boundary(low, true), boundary(high, false)];
}

export interface CalibratedFusionResult extends NumericFusionResult {
  estimate9: number | null; profile: GradeDefinitionProfile;
  availableWeight: number; learnedRange9: NumericRange | null;
  originalReferenceRange9: NumericRange | null;
  profileWeightsArePolicy: true;
  validationTask: 'source_reconstruction_not_student_accuracy';
}

export function createCalibratedFusion(value: unknown, options: { mode?: 'production' | 'research' } = {}) {
  const b = validate(value);
  if (options.mode !== 'research' && b.reviewStatus !== 'verified') throw new Error('Model is research-only');
  const baseline = createNumericFusion(b.baselineModel, options);
  return Object.freeze({ calculate(raw: string | number, profile: GradeDefinitionProfile = 'unspecified'): CalibratedFusionResult {
    if (!Object.hasOwn(b.profiles, profile)) throw new Error('Unknown grade definition profile');
    const original = baseline.calculate(raw), grade = original.grade5, weights = b.profiles[profile];
    const bands = b.curves.map(c => inverse(c, grade));
    const usable = bands.flatMap((band, i) => band !== null && weights[i] > 0 ? [{ i, band, weight: weights[i] }] : []);
    const availableWeight = usable.reduce((sum, r) => sum + r.weight, 0);
    // Do not silently switch the consensus population when a branch loses support.
    const complete = usable.length === weights.filter(w => w > 0).length;
    const estimate9 = complete && availableWeight > 0
      ? usable.reduce((sum, r) => sum + (r.band[0] + r.band[1]) / 2 * r.weight, 0) / availableWeight : null;
    const margins = b.errorBins.find(bin => grade <= bin.upperGrade5)!.margins9;
    const learnedRange9: NumericRange | null = usable.length ? [
      Math.min(...usable.map(r => Math.max(1, r.band[0] - margins[r.i]))),
      Math.max(...usable.map(r => Math.min(9, r.band[1] + margins[r.i]))),
    ] : null;
    const ranges = [original.grade9Range, learnedRange9].filter((r): r is NumericRange => r !== null);
    return { ...original, modelVersion: b.modelVersion,
      status: b.reviewStatus === 'verified' ? 'verified_numeric' : 'research_sensitivity',
      estimate9, profile, availableWeight, learnedRange9, originalReferenceRange9: original.grade9Range,
      grade9Range: ranges.length ? [Math.min(...ranges.map(r => r[0])), Math.max(...ranges.map(r => r[1]))] : null,
      profileWeightsArePolicy: true, validationTask: 'source_reconstruction_not_student_accuracy' };
  } });
}
