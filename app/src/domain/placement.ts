import type { ProgramData } from '../data/catalog';
import { compareBasis, type ComparisonBasis } from './comparison';
import { reviewed } from '../engine/types';

export const placementFields = ['인문', '사회', '자연', '공학', '의약', '예체능'] as const;
export const admissionTypes = ['교과', '종합', '논술', '기타'] as const;
export const admissionSymbols = { 교과: '●', 종합: '○', 논술: '◆', 기타: '◇' } as const;
export type PlacementMetric = 'rank_grade' | 'converted_grade';
export interface PlacementEntry {
  program: ProgramData;
  value: number;
  basis: ComparisonBasis;
  source: string;
}
export function officialSource(source: string): string | null {
  try { const url = new URL(source); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
/** Release checks apply to all three views, independently of the student's result. */
export function placementEntries(programs: readonly ProgramData[], year: number, metric: PlacementMetric): PlacementEntry[] {
  return programs.flatMap(program => {
    const { cut, cut_basis: basis } = program;
    const source = officialSource(cut?.source ?? '');
    if (program.license_status !== 'allowed' || !cut || !reviewed(cut) || !basis || !source
      || basis.year !== year || basis.metric !== metric || basis.statistic !== 'p70'
      || basis.grade_system !== 9 || program.cut_grade_system !== 9 || basis.max_score !== 9
      || !Number.isFinite(cut.cut70) || cut.cut70 < 1 || cut.cut70 > 9
      || !program.field || !placementFields.includes(program.field)
      || !program.admission_type || !admissionTypes.includes(program.admission_type)
      || !program.region?.trim()
      || !compareBasis({ ...basis, statistic: 'individual', subject_scope: program.cut_subject_scope }, basis).comparable) return [];
    return [{ program, value: cut.cut70, basis, source }];
  }).sort((a, b) => a.value - b.value || a.program.university.localeCompare(b.program.university, 'ko'));
}
export function canShowPosition(input: ComparisonBasis | undefined, entries: readonly PlacementEntry[], range?: { min: number; max: number }) {
  return !!range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.min >= 1 && range.max <= 9 && range.min <= range.max
    && entries.length > 0 && entries.every(row => compareBasis(input, row.basis).comparable);
}
/** Chart padding is presentation only; source values remain unchanged. */
export function placementExtent(entries: readonly PlacementEntry[], range?: { min: number; max: number }) {
  const values = entries.map(row => row.value);
  if (range) values.push(range.min, range.max);
  if (!values.length) return { min: 1, max: 9 };
  const min = Math.max(1, Math.floor((Math.min(...values) - 0.1) * 10) / 10);
  const max = Math.min(9, Math.max(min + 0.5, Math.ceil((Math.max(...values) + 0.1) * 10) / 10));
  return { min: Math.min(min, max - 0.5), max };
}
