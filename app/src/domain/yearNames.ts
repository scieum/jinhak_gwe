import type { ResultRow } from './resultReview';

// 2026-11-27 사용자 요청(3개년 점검): 대학이 해마다 전형·학과 이름을 조금씩 다르게 적어서('학생부종합 ( 농어촌학생전형 )' ↔ '학생부종합(농어촌학생전형)',
// '국어국문학과' ↔ '국어국문학부(국어국문학)') 같은 학과가 1~2개년만 보이던 것을 묶어요. (인문)·(자연)처럼 계열을 나누는 괄호는 남기고,
// 같은 학년도에 이름이 둘 이상 겹치는 묶음은 다른 모집단위일 수 있어 합치지 않아요. 보여 주는 이름은 가장 최근 학년도 이름이에요.
const TRACK_MARK = /^(?:인문|자연|인문계열|자연계열|예체능|예능|체육|주간|야간|남|여|남자|여자|.+캠퍼스)$/;
const nf = (s: string) => s.normalize('NFKC').replace(/\s/g, '');
export const yearProgramKey = (s: string) => nf(s).replace(/[()[\]{}<>·,]|전형/g, '');
export const yearUnitKey = (s: string) => {
  const marks = [...nf(s).matchAll(/\(([^()]*)\)/g)].map(m => m[1]).filter(m => TRACK_MARK.test(m));
  return nf(s).replace(/\([^()]*\)|\[[^\]]*\]/g, '').replace(/(교육과|학과|학부|전공|과)$/, '') + marks.map(m => `(${m})`).join('');
};
export function canonicalNames(rows: readonly ResultRow[], field: 'program' | 'recruit_unit', key: (s: string) => string, guardSameYear = true): Map<string, string> {
  const groups = new Map<string, ResultRow[]>();
  for (const r of rows) groups.set(key(r[field]), [...groups.get(key(r[field])) ?? [], r]);
  const out = new Map<string, string>();
  for (const group of groups.values()) {
    const names = new Set(group.map(r => r[field]));
    const clash = guardSameYear && [...new Set(group.map(r => r.result_year))].some(y => new Set(group.filter(r => r.result_year === y).map(r => r[field])).size > 1);
    const latest = [...group].sort((a, b) => Number(b.result_year) - Number(a.result_year))[0][field];
    for (const name of names) out.set(name, clash ? name : latest);
  }
  return out;
}
