import type { ReleasedUnit, ResultRow } from './resultReview';

export const TYPE_TABS = ['교과', '종합', '논술', '기타', '전체'] as const;
export type TypeTab = typeof TYPE_TABS[number];
/** spec D8: 기타 = 실기·특기자 등 교과·종합·논술이 아닌 수시 전형. */
export const typeTab = (r: ResultRow): Exclude<TypeTab, '전체'> => r.admission_type === '교과' || r.admission_type === '종합' || r.admission_type === '논술' ? r.admission_type : '기타';

export interface YearCell { cut70: number | null; cut50: number | null; competition: string; quota: string; metric: string; basis: string; source: string }
export interface ResultLine { key: string; program: string; unit: string; type: Exclude<TypeTab, '전체'>; years: Map<number, YearCell>; plottable: boolean }

const n = (v: string) => { if (v === '') return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
/** spec D1: only 9-grade 교과등급 70% cuts go on the shared axis; other bases stay in the table. */
const onAxis = (c: YearCell) => c.metric === '교과등급' && c.cut70 !== null && c.cut70 >= 1 && c.cut70 <= 9;

export function universities(units: readonly ReleasedUnit[]) {
  return [...new Set(units.filter(u => u.rows.some(r => r.round === '수시')).map(u => u.university))].sort((a, b) => a.localeCompare(b, 'ko'));
}
export const resultLines = (units: readonly ReleasedUnit[], university: string, tab: TypeTab) =>
  collectLines(units, university, r => r.round === '수시' && (tab === '전체' || typeTab(r) === tab));
export const programLines = (units: readonly ReleasedUnit[], university: string, program: string) => collectLines(units, university, r => r.program === program);
function collectLines(units: readonly ReleasedUnit[], university: string, keep: (r: ResultRow) => boolean): ResultLine[] {
  const map = new Map<string, ResultLine>();
  for (const u of units) {
    if (u.university !== university) continue;
    for (const r of u.rows) {
      if (!keep(r)) continue;
      const key = `${r.program}|${r.recruit_unit}`, year = Number(r.result_year);
      let line = map.get(key);
      if (!line) map.set(key, line = { key, program: r.program, unit: r.recruit_unit, type: typeTab(r), years: new Map(), plottable: false });
      const cell: YearCell = { cut70: n(r.cut_70), cut50: n(r.cut_50), competition: r.competition_rate, quota: r.quota, metric: r.metric, basis: r.basis, source: u.source_url };
      const old = line.years.get(year);
      // Two official sources for one year (입학처 + 대학 제공 어디가): keep the one that has a 70% cut.
      if (!old || (old.cut70 === null && cell.cut70 !== null)) line.years.set(year, cell);
    }
  }
  const lines = [...map.values()];
  for (const l of lines) l.plottable = [...l.years.values()].some(onAxis);
  return lines.sort((a, b) => Number(b.plottable) - Number(a.plottable) || (latestCut(a) ?? 99) - (latestCut(b) ?? 99) || a.unit.localeCompare(b.unit, 'ko'));
}
export const axisPoints = (l: ResultLine) => [...l.years].filter(([, c]) => onAxis(c)).map(([year, c]) => ({ year, value: c.cut70! }));
function latestCut(l: ResultLine) { const p = axisPoints(l).sort((a, b) => b.year - a.year)[0]; return p?.value ?? null; }
export function yearsOf(lines: readonly ResultLine[]) { return [...new Set(lines.flatMap(l => [...l.years.keys()]))].sort((a, b) => a - b).slice(-3); }

/** Latest minus previous year, only when both years publish the same metric. */
export function delta(l: ResultLine, years: readonly number[]): number | null {
  const [prev, last] = [l.years.get(years[years.length - 2]), l.years.get(years[years.length - 1])];
  if (!prev || !last || prev.cut70 === null || last.cut70 === null || prev.metric !== last.metric) return null;
  return Math.round((last.cut70 - prev.cut70) * 100) / 100;
}
/** spec D5: wrap data in 0.5 steps, at least 2 grades wide, inside 1~9. */
export function axisRange(values: readonly number[]) {
  if (!values.length) return { min: 1, max: 3 };
  let min = Math.max(1, Math.floor(Math.min(...values) * 2) / 2), max = Math.min(9, Math.ceil(Math.max(...values) * 2) / 2);
  if (max - min < 2) { max = Math.min(9, min + 2); min = Math.max(1, max - 2); }
  return { min, max };
}

/** 휠 확대·축소(2026-11-25 사용자 요청): center를 고정점으로 폭을 factor배. 폭 0.4~8, 1~9 안. */
export function zoomRange(r: { min: number; max: number }, center: number, factor: number) {
  const w = Math.min(8, Math.max(0.4, (r.max - r.min) * factor)), t = (center - r.min) / (r.max - r.min);
  let min = center - t * w, max = min + w;
  if (min < 1) { min = 1; max = 1 + w; }
  if (max > 9) { max = 9; min = 9 - w; }
  return { min: Math.round(min * 1000) / 1000, max: Math.round(max * 1000) / 1000 };
}
/** 눈금: 폭 2 이상(기본 축)은 0.5, 좁히면 0.2 · 0.1 간격 */
export function axisTicks(r: { min: number; max: number }) {
  const w = r.max - r.min, step = w >= 2 - 1e-9 ? 0.5 : w > 1 ? 0.2 : 0.1, out: number[] = [];
  for (let t = Math.ceil(r.min / step - 1e-9) * step; t <= r.max + 1e-9; t += step) out.push(Math.round(t * 10) / 10);
  return out;
}
/** 눈금 사이 보조선(점선, 글자 없음). 눈금 0.5 → 0.1 · 0.2 → 0.1 · 0.1 → 0.05 간격, 눈금 자리는 빼요. */
export function axisMinorTicks(r: { min: number; max: number }) {
  const w = r.max - r.min, major = w >= 2 - 1e-9 ? 0.5 : w > 1 ? 0.2 : 0.1, step = major === 0.1 ? 0.05 : 0.1, out: number[] = [];
  for (let t = Math.ceil(r.min / step - 1e-9) * step; t <= r.max + 1e-9; t += step) {
    const v = Math.round(t * 100) / 100;
    if (Math.abs(v / major - Math.round(v / major)) > 1e-6) out.push(v);
  }
  return out;
}
export interface ProgramSummary { program: string; round: string; type: string; year: number; units: number; quota: number | null }
/** One entry per program, described by its most recent published year. */
export function programSummaries(units: readonly ReleasedUnit[], university: string): ProgramSummary[] {
  const map = new Map<string, { year: number; round: string; type: string; rows: ResultRow[] }>();
  for (const u of units) if (u.university === university) for (const r of u.rows) {
    const year = Number(r.result_year), cur = map.get(r.program);
    if (!cur || year > cur.year) map.set(r.program, { year, round: r.round, type: r.round === '정시' ? '정시' : typeTab(r), rows: [r] });
    else if (year === cur.year) cur.rows.push(r);
  }
  return [...map].map(([program, v]) => {
    const unitNames = new Set(v.rows.map(r => r.recruit_unit)), quotas = v.rows.map(r => Number(r.quota));
    // Totals only when every row has a number; a partial sum would read as the full quota.
    const quota = v.rows.every(r => r.quota !== '') && quotas.every(Number.isFinite) && unitNames.size === v.rows.length
      && ![...unitNames].some(name => /^(합계|소계|계|전체)$/.test(name)) ? quotas.reduce((a, b) => a + b, 0) : null;
    return { program, round: v.round, type: v.type, year: v.year, units: unitNames.size, quota };
  }).sort((a, b) => a.round.localeCompare(b.round, 'ko') || a.program.localeCompare(b.program, 'ko'));
}
