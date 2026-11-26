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
  const pool = exact.length ? exact : unit.filter(r => sameProgram(r.row.program, interest.program));
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
  return { reason: '이 학과의 교과등급 컷이 수집 자료에 없어요.' };
}
export interface ComparisonValue { text: string; known: boolean }
export function differsOrUnknown(values: readonly ComparisonValue[]) {
  return values.some(value => !value.known) || new Set(values.map(value => sortNumber(value.text) ?? value.text.trim())).size > 1;
}
