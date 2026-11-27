import { typeTab, type TypeTab } from './resultBrowse';
import type { ResultRow } from './resultReview';
import { susiIssues } from './susiResults';

export type CutField = 'cut_70' | 'cut_50';
export const gradeCut = (row: ResultRow, cut: CutField = 'cut_70'): number | null => {
  if (susiIssues(row).length) return null;
  const raw = row[cut] ?? '', value = Number(raw);
  return row.grade_system === '9' && row.metric === '교과등급' && raw.trim() !== '' && Number.isFinite(value) && value >= 1 && value <= 9 ? value : null;
};

/** Keep every source row, including conflicting values in the same department/year. */
/** design.md cut-dot-plot: 자료가 있는 가장 최근 연도 = latest, 1년 전 = prev, 2년 전 = old. 그보다 뒤 연도(자료 없음)는 empty. */
export function yearTone(rows: readonly ResultRow[], year: number): 'latest' | 'prev' | 'old' | 'empty' {
  const shown = Math.max(0, ...rows.map(r => Number(r.result_year)).filter(Number.isFinite));
  return !shown || year > shown ? 'empty' : (['latest', 'prev', 'old'] as const)[Math.min(2, shown - year)];
}

/** 그래프에 찍을 70%·50% 컷이 하나도 없을 때, 원문에 무엇이 있는지 알려 주는 문장. 다른 통계를 컷으로 바꾸지 않아요(NEVER-1). */
export function noPlotReason(rows: readonly ResultRow[]): string {
  const reasons = new Map<string, number>();
  for (const r of rows) {
    const reason = susiIssues(r).length ? '원문 대조가 필요한 자료라 그래프 대신 표에서 확인할 수 있어요.' : r.metric !== '교과등급' ? `교과등급이 아닌 '${r.metric || '지표 미기재'}' 자료라 그래프로 그리지 않아요.`
      : r.grade_system !== '9' ? '9등급제가 아닌 자료라 그래프로 그리지 않아요.'
      : r.cut_other?.trim() ? `70%·50% 컷 대신 '${(r.basis || '다른 기준').split(/[;(]/)[0].trim()}' 기준 값만 발표했어요.`
      : '발표된 컷 값이 없어요.';
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  }
  const top = [...reasons].sort((a, b) => b[1] - a[1])[0];
  return `이 전형은 ${top ? top[0] : '발표된 컷 값이 없어요.'}`;
}


export { canonicalNames, yearProgramKey, yearUnitKey } from './yearNames';
import { canonicalNames, yearProgramKey, yearUnitKey } from './yearNames';

export function universityPlot(rows: readonly ResultRow[], tab: TypeTab, program: string) {
  const latest = Math.max(0, ...rows.filter(r => r.round === '수시' && /^20\d{2}$/.test(r.result_year)).map(r => Number(r.result_year)));
  const raw = rows.filter(r => r.round === '수시' && Number(r.result_year) >= latest - 2 && Number(r.result_year) <= latest && (tab === '전체' || typeTab(r) === tab));
  // 원문 행은 그대로 두고(원문·상세는 원래 이름), 묶을 때만 대표 이름을 써요
  const programName = canonicalNames(raw, 'program', yearProgramKey, false); // 띄어쓰기·괄호·'전형'만 다른 이름이라 같은 해에 겹쳐도 같은 전형
  const programOf = (r: ResultRow) => programName.get(r.program) ?? r.program;
  const programs = [...new Set(raw.map(programOf))].sort((a, b) => a.localeCompare(b, 'ko'));
  // 고르지 않았으면 그래프를 그릴 수 있는(70%·50% 컷이 있는) 학과가 가장 많은 전형을 열어요(같으면 가나다순 앞).
  // 2026-11-27 한국교원대: 가나다순 첫 전형(농어촌학생 · 학과 1개)이 열려 대표 전형(학생부종합우수자 · 24개)이 묻혔어요.
  const plottable = (p: string) => new Set(raw.filter(r => programOf(r) === p && (gradeCut(r) !== null || gradeCut(r, 'cut_50') !== null)).map(r => yearUnitKey(r.recruit_unit))).size;
  const asked = programName.get(program) ?? program;
  const best = programs.reduce((a, p) => plottable(p) > plottable(a) ? p : a, programs[0] ?? '');
  const selected = programs.includes(asked) ? asked : best;
  const selectedRows = raw.filter(r => programOf(r) === selected);
  const unitName = canonicalNames(selectedRows, 'recruit_unit', yearUnitKey);
  const unitOf = (r: ResultRow) => unitName.get(r.recruit_unit) ?? r.recruit_unit;
  // 70% 컷이 기본. 이 전형이 50% 컷만 발표했으면(예: 강원대) 그 전형의 50% 컷을 그려요. 한 그래프에 두 컷을 섞거나 서로 바꾸지 않아요.
  const cut: CutField = !selectedRows.some(r => gradeCut(r) !== null) && selectedRows.some(r => gradeCut(r, 'cut_50') !== null) ? 'cut_50' : 'cut_70';
  const departments = [...new Set(selectedRows.map(unitOf))].map(name => ({
    name, rows: selectedRows.filter(r => unitOf(r) === name),
    points: selectedRows.filter(r => unitOf(r) === name && gradeCut(r, cut) !== null),
  })).sort((a, b) => {
    const latestCut = (points: ResultRow[]) => {
      const row = [...points].sort((x, y) => Number(y.result_year) - Number(x.result_year))[0];
      return row ? gradeCut(row, cut) ?? 99 : 99;
    };
    return latestCut(a.points) - latestCut(b.points) || a.name.localeCompare(b.name, 'ko');
  });
  return { latest, years: latest ? [latest - 2, latest - 1, latest] : [], programs, selected, departments, rows: selectedRows,
    cut, cutLabel: cut === 'cut_50' ? '50% 컷' : '70% 컷', excluded: selectedRows.filter(r => gradeCut(r, cut) === null).length };
}
