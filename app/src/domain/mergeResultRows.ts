import type { ResultRow } from './resultReview';

export type Means = { meanFirst: string; meanFinal: string };
export type MergedResultRow = ResultRow & Means & { sources: ResultRow[] };

const hasCut = (r: ResultRow) => Boolean(r.cut_50.trim() || r.cut_70.trim());
type Population = 'first' | 'final' | '';
// 최종합격자는 등록자와 다른 집단이라 어느 쪽에도 넣지 않아요
const populationOf = (text: string): Population => /최초\s*합격|최초/.test(text) ? 'first' : /최종\s*등록|등록자|등록생/.test(text) ? 'final' : '';

/** 원문에 '평균'으로 적힌 등급 값을 최초합격자 · 최종등록자로 나눠요(2026-11-27 사용자 요청). 대상이 안 적힌 값은
 * 산출 기준(basis)이 한 집단만 말할 때 그 집단으로, 아니면 버려요. 점수·백분위 평균이거나 한 집단 값이 여럿으로 갈리면 비워요(추정하지 않음). */
export function rowMeans(row: ResultRow): Means {
  const out: Means = { meanFirst: '', meanFinal: '' };
  if (row.metric !== '교과등급' && row.metric !== '수능등급') return out;
  const basisPops = new Set([...row.basis.matchAll(/최초\s*합격자?|최종\s*등록자?|등록자/g)].map(m => populationOf(m[0])));
  const fallback: Population = basisPops.size === 1 ? [...basisPops][0] : '';
  const found: Record<'first' | 'final', Set<number>> = { first: new Set(), final: new Set() };
  const text: Record<'first' | 'final', string> = { first: '', final: '' };
  for (const segment of row.cut_other.split(/[;\n]/)) {
    if (/점수|총점|백분위|표준점수|서류|면접/.test(segment)) continue;
    for (const m of segment.matchAll(/평균\s*(?:등급)?\s*[:：=]?\s*([0-9](?:\.[0-9]+)?)(?![0-9.%~～])/g)) {
      const pop = populationOf(segment.slice(0, m.index)) || fallback;
      if (!pop || Number(m[1]) < 1 || Number(m[1]) > 9) continue;
      found[pop].add(Number(m[1])); text[pop] = m[1];
    }
  }
  if (found.first.size === 1) out.meanFirst = text.first;
  if (found.final.size === 1) out.meanFinal = text.final;
  return out;
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
    const means = sources.map(rowMeans);
    return { ...merged, meanFirst: means.map(m => m.meanFirst).find(Boolean) ?? '', meanFinal: means.map(m => m.meanFinal).find(Boolean) ?? '', sources };
  });
}

/** 그 행과 같은 학년도·시기·전형·모집단위·지표의 다른 출처까지 보고 평균을 찾아요(될각 카드). */
export function meansFor(row: ResultRow, rows: readonly ResultRow[]): Means {
  const m = mergeResultRows(rows.filter(r => r.result_year === row.result_year && r.recruit_unit.trim() === row.recruit_unit.trim() && r.program.trim() === row.program.trim()))
    .find(x => x.sources.includes(row));
  return { meanFirst: m?.meanFirst ?? '', meanFinal: m?.meanFinal ?? '' };
}
/** 카드 한 줄 글: '최초 평균 2.04 · 최종 평균 2.59'(있는 것만). */
export const meansText = ({ meanFirst, meanFinal }: Means) => [meanFirst && `최초 평균 ${meanFirst}`, meanFinal && `최종 평균 ${meanFinal}`].filter(Boolean).join(' · ');
