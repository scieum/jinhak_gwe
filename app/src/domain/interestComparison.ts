import type { Interest } from './interests';
import type { ResultRow } from './resultReview';
import { gradeCoordinate, statisticValue, type CutField, type NationalPlacementRow } from './nationalPlacement';
import { sortNumber } from './tableSort';

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
  return rows.flatMap((row, sourceRow) => row.university.trim() === interest.university.trim()
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
export interface ComparisonValue { text: string; known: boolean }
export function differsOrUnknown(values: readonly ComparisonValue[]) {
  return values.some(value => !value.known) || new Set(values.map(value => sortNumber(value.text) ?? value.text.trim())).size > 1;
}
