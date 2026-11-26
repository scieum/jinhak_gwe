import type { Interest } from './interests';
import type { ResultRow } from './resultReview';
import { gradeCoordinate, statisticValue, type CutField, type NationalPlacementRow } from './nationalPlacement';
import { sortNumber } from './tableSort';
import { currentUniversityName } from './universityIdentity';

export const MAX_COMPARISON = 4;
export const comparisonPath = (ids: string[] = []) => {
  const query = new URLSearchParams();
  [...new Set(ids)].slice(0, MAX_COMPARISON).forEach(id => query.append('i', id));
  return `/compare${query.size ? `?${query}` : ''}`;
};
export function comparisonSelection(items: readonly Interest[], ids: readonly string[]) {
  const available = new Map(items.filter(item => item.department?.trim()).map(item => [item.id, item]));
  return [...new Set(ids)].flatMap(id => available.has(id) ? [available.get(id)!] : []).slice(0, MAX_COMPARISON);
}
export interface ComparisonRecord { sourceRow: number; row: ResultRow }
export function comparisonRecords(interest: Interest, rows: readonly ResultRow[], year: string, round: string, metric: string): ComparisonRecord[] {
  if (!interest.department?.trim()) return [];
  return rows.flatMap((row, sourceRow) => currentUniversityName(row.university.trim()) === currentUniversityName(interest.university.trim())
    && row.program.trim() === interest.program.trim() && row.recruit_unit.trim() === interest.department!.trim()
    && row.result_year === year && row.round === round && row.metric === metric ? [{ sourceRow, row }] : []);
}
/** Multiple original rows must be chosen explicitly, even if their values happen to match. */
export function chosenComparisonRecord(records: readonly ComparisonRecord[], chosen?: number) {
  return records.length === 1 ? records[0] : records.find(record => record.sourceRow === chosen) ?? null;
}
export function comparisonStatistic(record: ComparisonRecord | null, cut: CutField, indexed?: NationalPlacementRow) {
  if (!record || record.row.grade_system !== '9' || !['교과등급', '수능등급'].includes(record.row.metric)) return null;
  if (cut === 'cut_50' || cut === 'cut_70') return gradeCoordinate(record.row[cut]) === null ? null : record.row[cut];
  if (!indexed || indexed.sourceRow !== record.sourceRow || indexed.university !== record.row.university || indexed.year !== record.row.result_year) return null;
  const value = statisticValue(indexed, cut);
  return gradeCoordinate(value) === null ? null : value;
}
/** 차이 = 불리한 쪽 값(범위 위 끝, 소수 첫째 자리 올림) − 컷, 소수 한 자리 부호 붙임. 될각 · 홈이 같은 숫자를 보여요. */
export function referenceDiffText(max: number, cut: number): string {
  const d = Math.ceil(max * 10 - 1e-9) / 10 - cut, t = (Math.round(Math.abs(d) * 10) / 10).toFixed(1);
  return t === '0.0' ? '0.0' : `${d < 0 ? '−' : '+'}${t}`;
}
export type ReferenceCut = { year: string; cut: 'cut_70' | 'cut_50'; value: number; row: ResultRow } | { reason: string };
const trackOf = (name: string) => name.includes('종합') ? '종합' : name.includes('교과') ? '교과' : '';
// 전형계획(2028) 이름과 수집 입결 이름이 달라서('학생부교과(지역균형)' ↔ '학생부교과 [지역균형전형]' · '지역균형') 핵심 이름으로 맞춰요
const programCore = (name: string) => name.replace(/\s+/g, '').replace(/학생부(교과|종합)/g, '').replace(/전형/g, '').replace(/[()[\]{}<>·,]/g, '');
const sameProgram = (a: string, b: string) => {
  const x = programCore(a), y = programCore(b);
  return trackOf(a) && trackOf(b) && trackOf(a) !== trackOf(b) ? false : x === y || (!!x && !!y && (x.includes(y) || y.includes(x)));
};
/** 될각 참고 비교: 그 대학(캠퍼스 후보 포함) 행에서 같은 학과의 가장 최근 학년도 수시 교과등급 70% 컷(없으면 50% 컷).
 *  전형 이름이 정확히 같은 행을 먼저, 없으면 핵심 이름이 같은 행. 같은 해 후보가 여럿이면 고르지 않아요. */
export function latestReferenceCut(interest: Interest, rows: readonly ResultRow[]): ReferenceCut {
  if (!interest.department?.trim()) return { reason: '학과를 고르면 입결과 비교해요.' };
  const unit = rows.flatMap((row, sourceRow) => row.recruit_unit.trim() === interest.department!.trim() && row.round === '수시' && row.metric === '교과등급' ? [{ sourceRow, row }] : []);
  const exact = unit.filter(r => r.row.program.trim() === interest.program.trim());
  const named = exact.length ? exact : unit.filter(r => sameProgram(r.row.program, interest.program));
  const found = latestIn(named);
  if (found) return found;
  // 전형 이름이 분명한데('지역균형' 등) 못 찾으면 다른 전형으로 대신하지 않아요
  if (programCore(interest.program)) return { reason: '이 학과의 교과등급 컷이 수집 자료에 없어요.' };
  // '학생부교과'처럼 일반 이름이면: 같은 학과 · 같은 계열 전형이 최근 학년도에 하나뿐일 때만 그 전형과 비교해요
  const track = trackOf(interest.program) || '교과';
  const family = unit.filter(r => (r.row.admission_type || trackOf(r.row.program)) === track);
  const latest = family.map(r => r.row.result_year).sort().at(-1);
  const kinds = new Set(family.filter(r => r.row.result_year === latest).map(r => r.row.program.trim()));
  if (kinds.size > 1) return { reason: `같은 학과 ${track}전형이 ${kinds.size}개라 고르지 않았어요. 수시 입결에서 전형을 골라 담아 주세요.` };
  return latestIn(family) ?? { reason: '이 학과의 교과등급 컷이 수집 자료에 없어요.' };
}
/** 학과 없이 담은 관심 전형에서 고를 학과 후보: 같은 전형(정확히 → 핵심 이름) 수시 교과등급 행의 모집단위, 없으면 같은 계열 전형의 모집단위. */
export function departmentsFor(interest: Interest, rows: readonly ResultRow[]): string[] {
  const usable = rows.filter(r => r.round === '수시' && r.metric === '교과등급' && r.recruit_unit.trim());
  const exact = usable.filter(r => r.program.trim() === interest.program.trim());
  const named = exact.length ? exact : usable.filter(r => sameProgram(r.program, interest.program));
  const track = trackOf(interest.program) || '교과';
  const pool = named.length ? named : usable.filter(r => (r.admission_type || trackOf(r.program)) === track);
  return [...new Set(pool.map(r => r.recruit_unit.trim()))].sort((a, b) => a.localeCompare(b, 'ko'));
}
function latestIn(pool: readonly ComparisonRecord[]): ReferenceCut | null {
  const years = [...new Set(pool.map(r => r.row.result_year))].sort().reverse();
  for (const year of years) {
    const records = pool.filter(r => r.row.result_year === year);
    for (const cut of ['cut_70', 'cut_50'] as const) {
      const usable = records.flatMap(r => { const v = comparisonStatistic(r, cut); return v === null ? [] : [{ r, v: Number(v) }]; });
      if (!usable.length) continue;
      // 컷 있는 행이 여럿이고 값이 다르면(캠퍼스·전형이 다른 행일 수 있어요) 임의로 고르지 않아요
      if (new Set(usable.map(u => u.v)).size > 1) return { reason: `${year}학년도에 맞는 원문 행이 ${usable.length}개라 관심 비교에서 골라야 해요.` };
      return { year, cut, value: usable[0].v, row: usable[0].r.row };
    }
  }
  return null;
}
export interface ComparisonValue { text: string; known: boolean }
export function differsOrUnknown(values: readonly ComparisonValue[]) {
  return values.some(value => !value.known) || new Set(values.map(value => sortNumber(value.text) ?? value.text.trim())).size > 1;
}
