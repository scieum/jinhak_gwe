import { typeTab, type TypeTab } from './resultBrowse';
import type { ResultRow } from './resultReview';

export type CutField = 'cut_70' | 'cut_50';
export const gradeCut = (row: ResultRow, cut: CutField = 'cut_70'): number | null => {
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
    const reason = r.metric !== '교과등급' ? `교과등급이 아닌 '${r.metric || '지표 미기재'}' 자료라 그래프로 그리지 않아요.`
      : r.grade_system !== '9' ? '9등급제가 아닌 자료라 그래프로 그리지 않아요.'
      : r.cut_other?.trim() ? `70%·50% 컷 대신 '${(r.basis || '다른 기준').split(/[;(]/)[0].trim()}' 기준 값만 발표했어요.`
      : '발표된 컷 값이 없어요.';
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  }
  const top = [...reasons].sort((a, b) => b[1] - a[1])[0];
  return `이 전형은 ${top ? top[0] : '발표된 컷 값이 없어요.'}`;
}

export function universityPlot(rows: readonly ResultRow[], tab: TypeTab, program: string) {
  const latest = Math.max(0, ...rows.filter(r => r.round === '수시' && /^20\d{2}$/.test(r.result_year)).map(r => Number(r.result_year)));
  const recent = rows.filter(r => r.round === '수시' && Number(r.result_year) >= latest - 2 && Number(r.result_year) <= latest && (tab === '전체' || typeTab(r) === tab));
  const programs = [...new Set(recent.map(r => r.program))].sort((a, b) => a.localeCompare(b, 'ko'));
  // 고르지 않았으면 그래프를 그릴 수 있는(70%·50% 컷이 있는) 첫 전형을 열어요.
  const plottable = (p: string) => recent.some(r => r.program === p && (gradeCut(r) !== null || gradeCut(r, 'cut_50') !== null));
  const selected = programs.includes(program) ? program : programs.find(plottable) ?? programs[0] ?? '';
  const selectedRows = recent.filter(r => r.program === selected);
  // 70% 컷이 기본. 이 전형이 50% 컷만 발표했으면(예: 강원대) 그 전형의 50% 컷을 그려요. 한 그래프에 두 컷을 섞거나 서로 바꾸지 않아요.
  const cut: CutField = !selectedRows.some(r => gradeCut(r) !== null) && selectedRows.some(r => gradeCut(r, 'cut_50') !== null) ? 'cut_50' : 'cut_70';
  const departments = [...new Set(selectedRows.map(r => r.recruit_unit))].map(name => ({
    name, rows: selectedRows.filter(r => r.recruit_unit === name),
    points: selectedRows.filter(r => r.recruit_unit === name && gradeCut(r, cut) !== null),
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
