/** Deterministic inverse of two source tables. No inference, fitting or I/O at runtime. */
export type Scenario = 'optimistic' | 'conservative';
type Range = [number, number];
interface Curve { x9: number[]; y5: number[] }
interface Bundle {
  format: 'unavi-scenario-reference'; schemaVersion: 1; modelVersion: '0.5';
  reviewStatus: 'research_only'; roundingHalfWidth5: number; curves: Record<Scenario, Curve>;
}
export interface ScenarioMatch {
  range9: Range | null;
  exactRange9: Range | null;
  supportTruncated: boolean;
  // Largest grade9 source spacing used, to expose sparse interpolation.
  maxSourceGap9: number;
}
export interface ScenarioResult {
  modelVersion: string; grade5: number; estimate9: null;
  status: 'source_scenarios' | 'partial_support' | 'outside_source_support';
  grade9Range: Range | null;
  scenarios: Record<Scenario, ScenarioMatch>;
  confidenceInterval: false; empiricallyValidated: false;
}
const names: Scenario[] = ['optimistic', 'conservative'];
const valid = (x: unknown, a: number, b: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= a && x <= b;

function inverse(c: Curve, low: number, high: number) {
  let min = Infinity, max = -Infinity, gap = 0;
  for (let i = 1; i < c.x9.length; i++) {
    const x0 = c.x9[i - 1], x1 = c.x9[i], y0 = c.y5[i - 1], y1 = c.y5[i];
    if (y1 < low - 1e-10 || y0 > high + 1e-10) continue;
    const a = Math.max(y0, low), b = Math.min(y1, high);
    if (a > b + 1e-10) continue;
    if (y1 === y0) { min = Math.min(min, x0); max = Math.max(max, x1); }
    else {
      min = Math.min(min, x0 + (a - y0) / (y1 - y0) * (x1 - x0));
      max = Math.max(max, x0 + (b - y0) / (y1 - y0) * (x1 - x0));
    }
    gap = Math.max(gap, x1 - x0);
  }
  return { range: min === Infinity ? null : [min, max] as Range, gap };
}

export function createScenarioReference(value: unknown) {
  const b = structuredClone(value) as Bundle;
  const fail = () => { throw new Error('Invalid scenario reference model'); };
  if (!b || b.format !== 'unavi-scenario-reference' || b.schemaVersion !== 1 || b.modelVersion !== '0.5'
    || b.reviewStatus !== 'research_only' || b.roundingHalfWidth5 !== .005) fail();
  for (const name of names) {
    const c = b.curves?.[name];
    if (!c || !Array.isArray(c.x9) || !Array.isArray(c.y5) || c.x9.length < 2 || c.x9.length !== c.y5.length) fail();
    c.x9.forEach((x, i) => {
      if (!valid(x, 1, 9) || !valid(c.y5[i], 1, 5) || (i > 0 && (x <= c.x9[i - 1] || c.y5[i] < c.y5[i - 1]))) fail();
    });
  }
  return Object.freeze({ calculate(grade: number): ScenarioResult {
    if (!valid(grade, 1, 5)) throw new Error('Grade must be between 1 and 5');
    const low = Math.max(1, grade - b.roundingHalfWidth5), high = Math.min(5, grade + b.roundingHalfWidth5);
    const scenarios = Object.fromEntries(names.map(name => {
      const c = b.curves[name], band = inverse(c, low, high);
      return [name, { range9: band.range, exactRange9: inverse(c, grade, grade).range,
        supportTruncated: low < c.y5[0] - 1e-10 || high > c.y5[c.y5.length - 1] + 1e-10,
        maxSourceGap9: band.gap }];
    })) as Record<Scenario, ScenarioMatch>;
    const ranges = names.flatMap(name => scenarios[name].range9 ? [scenarios[name].range9!] : []);
    return { modelVersion: b.modelVersion, grade5: grade, estimate9: null,
      status: ranges.length === 2 ? 'source_scenarios' : ranges.length ? 'partial_support' : 'outside_source_support',
      // A partial source must not masquerade as a complete combined envelope.
      grade9Range: ranges.length === 2 ? [Math.min(...ranges.map(r => r[0])), Math.max(...ranges.map(r => r[1]))] : null,
      scenarios, confidenceInterval: false, empiricallyValidated: false };
  } });
}

export const scenarioLabels: Record<Scenario, string> = { optimistic: '낙관 시나리오', conservative: '보수 시나리오' };
// Outward rounding preserves the source rounding interval, including plateau edges.
export function formatScenarioRange(range: Range | null): string {
  if (!range) return '자료 범위 밖';
  const lo = (Math.floor(range[0] * 100 + 1e-8) / 100).toFixed(2);
  const hi = (Math.ceil(range[1] * 100 - 1e-8) / 100).toFixed(2);
  return lo === hi ? lo : `${lo}~${hi}`;
}
