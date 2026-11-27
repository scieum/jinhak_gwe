import type { ResultRow } from './resultReview';

export type MergedResultRow = ResultRow & { mean: string; sources: ResultRow[] };

const hasCut = (r: ResultRow) => Boolean(r.cut_50.trim() || r.cut_70.trim());

/** 원문에 '평균'으로 적힌 등급 값 하나. 점수·백분위 구간이거나 값이 여럿으로 갈리면 비워요(추정하지 않음).
 * shortcut: tools/placement_statistics.py의 대상(최초·최종) 구분은 옮기지 않았어요. 최종등록 값이 있으면 그것만 써요. */
export function rowMean(row: ResultRow): string {
  if (row.metric !== '교과등급' && row.metric !== '수능등급') return '';
  const found: { value: string; registered: boolean }[] = [];
  for (const segment of row.cut_other.split(/[;\n]/)) {
    if (/점수|총점|백분위|표준|서류|면접/.test(segment)) continue;
    for (const m of segment.matchAll(/평균\s*(?:등급)?\s*[:：=]?\s*([0-9](?:\.[0-9]+)?)(?![0-9.%~～])/g)) {
      if (Number(m[1]) >= 1 && Number(m[1]) <= 9) found.push({ value: m[1], registered: /최종\s*등록|등록자/.test(segment) });
    }
  }
  const pool = found.some(f => f.registered) ? found.filter(f => f.registered) : found;
  const values = new Set(pool.map(f => Number(f.value)));
  return values.size === 1 ? pool[0].value : '';
}

/** 같은 학년도·시기·전형·모집단위·지표의 행을 한 줄로 합쳐요(2026-11-27 사용자 요청).
 * 컷이 있는 행을 기준으로 빈 칸만 다른 출처로 채우고, 원래 행은 sources에 모두 남겨요. */
export function mergeResultRows(rows: ResultRow[]): MergedResultRow[] {
  const groups = new Map<string, ResultRow[]>();
  for (const r of rows) {
    const key = [r.university, r.result_year, r.round, r.program, r.recruit_unit, r.metric].map(v => v.trim()).join('|');
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.values()].map(group => {
    const sources = [...group].sort((a, b) => Number(hasCut(b)) - Number(hasCut(a)));
    const merged = { ...sources[0] };
    for (const key of Object.keys(merged) as (keyof ResultRow)[]) {
      const value = sources.map(s => s[key]).find(v => typeof v === 'string' && v.trim());
      if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
    }
    const mean = sources.map(rowMean).find(Boolean) ?? '';
    return { ...merged, mean, sources };
  });
}
