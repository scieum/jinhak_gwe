/** Deterministic numeric inference. No I/O, clock, randomness, AI or training. */
export type NumericRange = [number, number];
interface Curve { x9: number[]; y5: number[] }
interface Reference { points: [number, number, number][] }
export interface NumericFusionBundle {
  format: 'unavi-numeric-fusion'; schemaVersion: 1; modelVersion: string;
  admissionYear: number; reviewStatus: 'research_only' | 'verified';
  curves: Curve[]; references: Reference[];
  populations: { id: string; n: number; scope: string }[];
  intentRates: number[]; qualifiedRates: number[];
  capacity: { provisionalSeats: number; universities: number; checkedUniversities: number;
    nationalTotalVerified: boolean };
}

const numberIn = (n: unknown, lo: number, hi: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
const integerIn = (n: unknown, lo: number, hi = Number.MAX_SAFE_INTEGER): n is number =>
  numberIn(n, lo, hi) && Number.isSafeInteger(n);
const nonempty = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
const invalidBundle = () => new Error('Invalid numeric model bundle');

/** Validate once and take an owned snapshot. Edits to the caller's object cannot change inference. */
function snapshot(value: unknown): NumericFusionBundle {
  const b = structuredClone(value) as NumericFusionBundle;
  if (!b || b.format !== 'unavi-numeric-fusion' || b.schemaVersion !== 1 || !nonempty(b.modelVersion)
    || !integerIn(b.admissionYear, 2000, 2200) || !['research_only', 'verified'].includes(b.reviewStatus)
    || !Array.isArray(b.curves) || b.curves.length !== 2 || !Array.isArray(b.references)
    || !b.references.length || !Array.isArray(b.populations) || !b.populations.length) throw invalidBundle();
  for (const c of b.curves) {
    if (!c || !Array.isArray(c.x9) || !Array.isArray(c.y5) || c.x9.length < 2 || c.x9.length !== c.y5.length
      || c.x9.some((x, i) => !numberIn(x, 1, 9) || (i > 0 && x <= c.x9[i - 1]))
      || c.y5.some((y, i) => !numberIn(y, 1, 5) || (i > 0 && y < c.y5[i - 1]))) throw invalidBundle();
  }
  for (const r of b.references) {
    if (!r || !Array.isArray(r.points) || r.points.length < 2 || r.points[0]?.[0] !== 1
      || r.points.some((p, i) => !Array.isArray(p) || p.length !== 3 || !numberIn(p[0], 1, 5)
        || !numberIn(p[1], 0, 1) || !numberIn(p[2], 1, 9)
        || (i > 0 && (p[0] <= r.points[i - 1][0] || p[1] < r.points[i - 1][1] || p[2] < r.points[i - 1][2])))) throw invalidBundle();
  }
  if (b.populations.some(p => !p || !nonempty(p.id) || !nonempty(p.scope) || !integerIn(p.n, 1))
    || new Set(b.populations.map(p => p.id)).size !== b.populations.length) throw invalidBundle();
  for (const rates of [b.intentRates, b.qualifiedRates]) {
    if (!Array.isArray(rates) || !rates.length || rates.some(n => !numberIn(n, 0, 1))
      || new Set(rates).size !== rates.length) throw invalidBundle();
  }
  const c = b.capacity;
  if (!c || !integerIn(c.provisionalSeats, 0) || !integerIn(c.universities, 1)
    || !integerIn(c.checkedUniversities, 0, c.universities)
    || typeof c.nationalTotalVerified !== 'boolean') throw invalidBundle();
  return b;
}

function parseGrade(raw: number | string): number {
  if (typeof raw === 'string' && !/^\d+(?:\.\d*)?$/.test(raw.trim())) throw new RangeError('Enter a grade from 1 to 5');
  const g = typeof raw === 'string' ? Number(raw.trim()) : raw;
  if (!numberIn(g, 1, 5)) throw new RangeError('Enter a grade from 1 to 5');
  return g;
}

function interpolate(points: Reference['points'], grade: number, column: 1 | 2): number | null {
  if (grade < points[0][0] || grade > points[points.length - 1][0]) return null;
  for (let i = 0; i < points.length; i++) {
    const b = points[i];
    if (grade === b[0]) return b[column];
    if (grade < b[0]) {
      const a = points[i - 1];
      return a[column] + (b[column] - a[column]) * (grade - a[0]) / (b[0] - a[0]);
    }
  }
  return null;
}

/** Exact piecewise-linear preimage, including plateaus and published-grade rounding. */
function inverse(curve: Curve, grade: number): NumericRange | null {
  const low = Math.max(1, grade - 0.005), high = Math.min(5, grade + 0.005);
  const { x9: xs, y5: ys } = curve;
  if (high < ys[0] - 1e-10 || low > ys[ys.length - 1] + 1e-10) return null;
  const pieces: NumericRange[] = [];
  for (let i = 1; i < xs.length; i++) {
    const x0 = xs[i - 1], x1 = xs[i], y0 = ys[i - 1], y1 = ys[i];
    if (y1 < low - 1e-10 || y0 > high + 1e-10) continue;
    if (Math.abs(y1 - y0) < 1e-12) pieces.push([x0, x1]);
    else {
      const a = Math.max(y0, low), b = Math.min(y1, high);
      if (a <= b + 1e-10) pieces.push([x0 + (a - y0) * (x1 - x0) / (y1 - y0),
        x0 + (b - y0) * (x1 - x0) / (y1 - y0)]);
    }
  }
  return pieces.length ? [Math.min(...pieces.map(p => p[0])), Math.max(...pieces.map(p => p[1]))] : null;
}

export interface NumericFusionResult {
  modelVersion: string; admissionYear: number; status: 'research_sensitivity' | 'verified_numeric';
  grade5: number; grade9Range: NumericRange | null;
  gradeDefinitionMatched: false; confidenceInterval: false;
  capacity: NumericFusionBundle['capacity'];
  populationScenarios: { populationId: string; populationN: number; scope: string;
    regionalCases: { scenarioNumber: number; estimatedAllOneN: number; estimatedThroughGradeN: number | null;
      cases: { assumedIntentRate: number; assumedQualifiedRate: number; allOneMedicalIntentN: number;
        allOneEffectiveDemandN: number; segmentToProvisionalSeats: number | null;
        additionalCandidatesToMatchSeats: number; segmentExcessOverSeats: number }[] }[] }[];
  assumptionsApplied: true; universityLine: null; admissionProbability: null;
}

/** Load once, calculate synchronously on every input. Research requires explicit opt-in. */
export function createNumericFusion(value: unknown, options: { mode?: 'production' | 'research' } = {}) {
  const b = snapshot(value);
  if (options.mode !== 'research' && b.reviewStatus !== 'verified') throw new Error('Model is research-only');
  const calculate = (raw: number | string): NumericFusionResult => {
    const grade = parseGrade(raw), bands = b.curves.map(c => inverse(c, grade));
    // v0.3 only includes the fitted envelope when BOTH branches have support.
    const values = bands.every(r => r !== null) ? bands.flatMap(r => r!) : [];
    const references = b.references.map(r => ({ cumulative: interpolate(r.points, grade, 1),
      g9: interpolate(r.points, grade, 2), allOneRate: r.points[0][1] }));
    references.forEach(r => { if (r.g9 !== null) values.push(r.g9); });
    const seats = b.capacity.provisionalSeats;
    return {
      modelVersion: b.modelVersion, admissionYear: b.admissionYear,
      status: b.reviewStatus === 'verified' ? 'verified_numeric' : 'research_sensitivity', grade5: grade,
      grade9Range: values.length ? [Math.min(...values), Math.max(...values)] : null,
      gradeDefinitionMatched: false, confidenceInterval: false, capacity: { ...b.capacity },
      populationScenarios: b.populations.map(p => ({ populationId: p.id, populationN: p.n, scope: p.scope,
        regionalCases: references.map((r, i) => {
          const allOne = p.n * r.allOneRate;
          return { scenarioNumber: i + 1, estimatedAllOneN: allOne,
            estimatedThroughGradeN: r.cumulative === null ? null : p.n * r.cumulative,
            cases: b.intentRates.flatMap(intent => b.qualifiedRates.map(qualified => {
              const effective = allOne * intent * qualified;
              return { assumedIntentRate: intent, assumedQualifiedRate: qualified,
                allOneMedicalIntentN: allOne * intent, allOneEffectiveDemandN: effective,
                segmentToProvisionalSeats: seats > 0 ? effective / seats : null,
                additionalCandidatesToMatchSeats: Math.max(0, seats - effective),
                segmentExcessOverSeats: Math.max(0, effective - seats) };
            })) };
        }) })),
      assumptionsApplied: true, universityLine: null, admissionProbability: null,
    };
  };
  return Object.freeze({ calculate });
}

export interface HistoricalProgram {
  id: string; university: string; department: string; year: number;
  track: string; gradeSystem: 9; statistic: 'cut50' | 'cut70'; grade: number;
  basisId: string; reviewStatus: 'draft' | 'verified';
}

/** Numerical comparison only. No AI-written line, probability, or safety classification. */
export function compareHistoricalPrograms(result: NumericFusionResult, programs: readonly HistoricalProgram[],
  filter: { year: number; track: string; statistic: HistoricalProgram['statistic']; basisId: string }) {
  if (!integerIn(filter.year, 2000, result.admissionYear - 1) || !nonempty(filter.track)
    || !nonempty(filter.basisId) || !['cut50', 'cut70'].includes(filter.statistic)) throw new Error('Invalid comparison filter');
  const range = result.grade9Range;
  if (!range) return [];
  if (range.length !== 2 || !numberIn(range[0], 1, 9) || !numberIn(range[1], range[0], 9)) throw new Error('Invalid grade range');
  const ids = new Set<string>();
  return programs.filter(p => p.reviewStatus === 'verified' && p.gradeSystem === 9 && p.year === filter.year
    && p.track === filter.track && p.statistic === filter.statistic && p.basisId === filter.basisId)
    .map(p => {
      if (!nonempty(p.id) || !nonempty(p.university) || !nonempty(p.department) || ids.has(p.id)
        || !numberIn(p.grade, 1, 9)) throw new Error('Invalid or duplicate historical program');
      ids.add(p.id);
      return { id: p.id, university: p.university, department: p.department, year: p.year,
        statistic: p.statistic, historicalGrade: p.grade,
        relation: p.grade < range[0] ? 'historical_grade_stronger' as const
          : p.grade > range[1] ? 'historical_grade_weaker' as const : 'overlaps_reference' as const,
        distance: Math.max(range[0] - p.grade, p.grade - range[1], 0),
        interpretation: 'historical_comparison_not_admission_chance' as const };
    }).sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
