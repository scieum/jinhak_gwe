import type { ResultRow } from './resultReview';
import type { Interest } from './interests';
import { gradeCut, type CutField } from './universityResultPlot';

/** 학과 이름 비교용: 띄어쓰기·괄호 꼬리·과/학과/학부/전공 꼬리를 떼요(교원대 입결은 '화학', 지원 준비는 '화학교육과'처럼 써요). */
export const unitKey = (s: string) => s.normalize('NFKC').replace(/\s|\(.*?\)|\[.*?\]/g, '').replace(/(교육과|학과|학부|전공|과)$/, '');
const programKey = (s: string) => s.normalize('NFKC').replace(/\s|\(|\)|\[|\]|학생부|전형/g, '');

/** 관심 전형 하나에 맞는 수시 입결 행: 학과(정확히 → 꼬리 뗀 이름 → 한 학과로만 좁혀지는 앞부분) × 전형(같은 이름 → 핵심 이름 → 그 학과 전체). */
export function interestRows(interest: Pick<Interest, 'program' | 'department'>, rows: readonly ResultRow[]): { rows: ResultRow[]; unit: string; programMatched: boolean } {
  const susi = rows.filter(r => r.round === '수시' && r.recruit_unit.trim());
  const dept = interest.department?.trim() ?? '';
  if (!dept) return { rows: [], unit: '', programMatched: false };
  const units = [...new Set(susi.map(r => r.recruit_unit.trim()))];
  const key = unitKey(dept);
  const unit = units.find(u => u === dept) ?? units.find(u => unitKey(u) === key)
    ?? (() => { const near = units.filter(u => key.startsWith(unitKey(u)) || unitKey(u).startsWith(key)); return near.length === 1 ? near[0] : undefined; })();
  if (!unit) return { rows: [], unit: '', programMatched: false };
  const own = susi.filter(r => r.recruit_unit.trim() === unit);
  const exact = own.filter(r => r.program.trim() === interest.program.trim());
  const core = exact.length ? exact : own.filter(r => programKey(r.program) === programKey(interest.program) || programKey(r.program).includes(programKey(interest.program)) || programKey(interest.program).includes(programKey(r.program)));
  return core.length ? { rows: core, unit, programMatched: true } : { rows: own, unit, programMatched: false };
}

/** 고른 학년도의 그래프 값: 70% 컷, 없으면 50% 컷(어느 컷인지 함께). */
export function yearCut(rows: readonly ResultRow[], year: string): { value: number; cut: CutField; row: ResultRow } | null {
  for (const cut of ['cut_70', 'cut_50'] as const) {
    const row = rows.find(r => r.result_year === year && gradeCut(r, cut) !== null);
    if (row) return { value: gradeCut(row, cut)!, cut, row };
  }
  return null;
}
