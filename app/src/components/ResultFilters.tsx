import { useEffect, useState } from 'react';
import type { ResultRow } from '../domain/resultReview';

export type ResultFilters = { year: string; round: string; type: string; query: string };
export const emptyResultFilters: ResultFilters = { year: '전체', round: '전체', type: '전체', query: '' };
export function filterCollectedRows(rows: ResultRow[], filters: ResultFilters) {
  return rows.filter(r => (filters.year === '전체' || r.result_year === filters.year)
    && (filters.round === '전체' || r.round === filters.round) && (filters.type === '전체' || r.admission_type === filters.type)
    && (!filters.query.trim() || `${r.program} ${r.recruit_unit}`.includes(filters.query.trim())));
}
export function useCompactResults() {
  const [compact, setCompact] = useState(() => window.matchMedia?.('(max-width: 767px)').matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 767px)');
    if (!media) return;
    const update = () => setCompact(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return compact;
}
export function ResultFilterFields({ rows, value, onChange, search = false }: {
  rows: ResultRow[]; value: ResultFilters; onChange: (next: ResultFilters) => void; search?: boolean;
}) {
  const choices = (field: keyof ResultRow) => [...new Set(rows.map(r => r[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  return <>
    <label>학년도<select value={value.year} onChange={e => onChange({ ...value, year: e.target.value })}><option>전체</option>{choices('result_year').map(y => <option key={y}>{y}</option>)}</select></label>
    <label>모집시기<select value={value.round} onChange={e => onChange({ ...value, round: e.target.value })}><option>전체</option>{[...new Set(['수시', ...choices('round')])].map(r => <option key={r}>{r}</option>)}</select></label>
    <label>수집 전형 유형<select value={value.type} onChange={e => onChange({ ...value, type: e.target.value })}><option>전체</option>{choices('admission_type').map(t => <option key={t}>{t}</option>)}</select></label>
    {search && <label>전형·모집단위 검색<input type="search" value={value.query} onChange={e => onChange({ ...value, query: e.target.value })} placeholder="전형명 또는 학과명" /></label>}
  </>;
}
