import type { MockGrades } from './scoreImport';
import { readGrade, type Area, type CutTable, type MockScore } from './mock';
import { reviewed, type Provenance } from '../engine/types';

/**
 * 수능 최저 판정(minimum-board 02-spec, PRD 6-12). 판정 5종: 충족 / 근접(한 영역만 1등급 오르면 충족) / 미충족 / 자료 부족 / 판정 불가.
 * 검수된 대학 기준(csat_minimum)이 아직 없어서 지금은 교사가 넣은 기준만 있어요 → 화면에 "교사 입력 · 미검수".
 */
export const CORE = ['국어', '수학', '영어', '탐구'] as const;
export type Core = typeof CORE[number];
export interface Criterion { areas: Core[]; count: number; sum: number; required: Core | null; history_max: number | null; tamgu: 'avg' | 'best' }
export interface Target { number: string; university: string; criterion: Criterion | null; source: 'teacher'; updated_at: string }
export type Verdict = '충족' | '근접' | '미충족' | '자료 부족' | '판정 불가';
export interface Judged { verdict: Verdict; reason: string; values: Partial<Record<Core, number>> }

export function checkCriterion(c: Criterion): Criterion {
  const areas = CORE.filter(a => c.areas.includes(a));
  if (!areas.length) throw new Error('반영 영역을 하나 이상 골라 주세요.');
  if (!Number.isInteger(c.count) || c.count < 1 || c.count > areas.length) throw new Error(`반영 개수는 1~${areas.length}개예요.`);
  if (!Number.isInteger(c.sum) || c.sum < c.count || c.sum > c.count * 9) throw new Error('등급 합이 반영 개수와 맞지 않아요.');
  if (c.required && !areas.includes(c.required)) throw new Error('필수 영역은 반영 영역 안에서 골라 주세요.');
  if (c.history_max !== null && (!Number.isInteger(c.history_max) || c.history_max < 1 || c.history_max > 9)) throw new Error('한국사 기준은 1~9등급이에요.');
  return { ...c, areas };
}
export function describe(c: Criterion): string {
  const base = c.required ? `${c.required} 포함 ${c.count}개 합 ${c.sum}` : `${c.areas.map(a => a[0]).join('·')} 중 ${c.count}개 합 ${c.sum}`;
  return base + (c.history_max ? ` · 한국사 ${c.history_max} 이내` : '');
}

function coreValues(g: MockGrades['grades'], c: Criterion): Partial<Record<Core, number>> {
  const out: Partial<Record<Core, number>> = {};
  for (const a of ['국어', '수학', '영어'] as const) if (typeof g[a] === 'number') out[a] = g[a]!;
  const t = [g.탐구1, g.탐구2].filter((v): v is number => typeof v === 'number');
  if (t.length) out.탐구 = c.tamgu === 'best' ? Math.min(...t) : t.length === 2 ? (t[0] + t[1]) / 2 : NaN;
  if (Number.isNaN(out.탐구)) delete out.탐구; // 평균 방식인데 탐구 한 과목이 빠지면 계산하지 않아요
  return out;
}
/** 필수 영역을 넣고 나머지는 좋은 등급부터 count개. 고를 수 없으면 null. */
function bestSum(v: Partial<Record<Core, number>>, c: Criterion): number | null {
  const avail = c.areas.filter(a => v[a] !== undefined);
  if (c.required && v[c.required] === undefined) return null;
  const rest = avail.filter(a => a !== c.required).map(a => v[a]!).sort((a, b) => a - b);
  const picked = [...(c.required ? [v[c.required]!] : []), ...rest].slice(0, c.count);
  return picked.length < c.count ? null : picked.reduce((a, b) => a + b, 0);
}
const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

export function judgeMinimum(exam: string, g: MockGrades | undefined, c: Criterion | null): Judged {
  if (!c) return { verdict: '판정 불가', reason: '대학 기준이 없어요', values: {} };
  if (!g) return { verdict: '자료 부족', reason: `${exam} 성적이 없어요`, values: {} };
  const v = coreValues(g.grades, c), sum = bestSum(v, c), missing = c.areas.filter(a => v[a] === undefined);
  const history = g.grades.한국사, historyOk = c.history_max === null || (typeof history === 'number' && history <= c.history_max);
  if (c.history_max !== null && typeof history !== 'number') return { verdict: '자료 부족', reason: '한국사 성적이 없어요', values: v };
  if (sum !== null && sum <= c.sum && historyOk) return { verdict: '충족', reason: `합 ${fmt(sum)} (기준 ${c.sum})`, values: v };
  if (sum === null) return { verdict: '자료 부족', reason: `${missing.join('·')} 성적이 없어요`, values: v };
  if (!historyOk) return { verdict: '미충족', reason: `한국사 ${history}등급 (기준 ${c.history_max} 이내)`, values: v };
  for (const a of c.areas) {
    if (v[a] === undefined || v[a]! <= 1) continue;
    const s = bestSum({ ...v, [a]: Math.max(1, v[a]! - 1) }, c);
    if (s !== null && s <= c.sum) return { verdict: '근접', reason: `${a} 1등급만 오르면 충족`, values: v };
  }
  if (missing.length) return { verdict: '자료 부족', reason: `${missing.join('·')} 성적이 없어요`, values: v };
  return { verdict: '미충족', reason: `합 ${fmt(sum)} (기준 ${c.sum})`, values: v };
}

export const VERDICT_ORDER: Verdict[] = ['근접', '미충족', '자료 부족', '판정 불가', '충족'];
export const VERDICT_CLASS: Record<Verdict, string> = { 충족: 'judge-safe', 근접: 'judge-fit', 미충족: 'judge-risk', '자료 부족': 'judge-none', '판정 불가': 'judge-none' };
const ICON: Partial<Record<Verdict, string>> = { 충족: '● ', 근접: '▲ ', 미충족: '✕ ' }; // 2026-11-23 사용자 결정: 근접 속이 찬 세모, 미충족 엑스
export const verdictText = (v: Verdict) => `${ICON[v] ?? ''}${v}`;

/** "2026년 10월 학평" 순서대로(최근이 앞). */
export function examsByRecent(names: Iterable<string>): string[] {
  const key = (n: string) => { const m = n.match(/(\d{4})년 (\d{1,2})월/); return m ? Number(m[1]) * 100 + Number(m[2]) : 0; };
  return [...new Set(names)].sort((a, b) => key(b) - key(a));
}

// ── 최저로 찾기(minimum-search 02-spec): 내 등급 × 관리자 검수 완료 기준 ──
/** 검수된 수능 최저 기준 한 줄. review_status가 verified가 아니면 판정하지 않아요(D1, NEVER-1). */
export interface MinimumRule extends Provenance { university: string; unit: string; admission: string; kind: string; field: string; region: string; reviewed_at: string; criterion: Criterion }
export interface SearchRow { rule: MinimumRule; judged: Judged; sum: number | null }
export const SEARCH_ORDER: Verdict[] = ['충족', '근접', '미충족', '자료 부족'];

export const minimumSum = (g: MockGrades, c: Criterion) => bestSum(coreValues(g.grades, c), c);

/** 원점수 → 판정용 등급. 검수된 등급컷으로 읽은 범위의 큰 숫자(불리한 쪽, D4). 읽은 영역이 없으면 null. */
export function gradesForMinimum(mock: MockScore, table: CutTable | undefined): MockGrades | null {
  const pick = (a: Area) => { const r = readGrade(mock.raw[a], a, table); return r.status === 'ready' ? r.max : undefined; };
  const grades: MockGrades['grades'] = { 국어: pick('국어'), 수학: pick('수학'), 영어: pick('영어'), 한국사: pick('한국사'), 탐구1: pick('탐구1') ?? pick('통합사회'), 탐구2: pick('탐구2') ?? pick('통합과학') };
  for (const k of Object.keys(grades)) if (grades[k] === undefined) delete grades[k];
  return Object.keys(grades).length ? { number: '', exam: mock.exam, grades, updated_at: mock.updated_at } : null;
}
/** 영역별 대표 등급(탐구는 상위 1과목). */
export function shownGrade(g: MockGrades, a: Core): number | undefined {
  if (a !== '탐구') return g.grades[a] ?? undefined;
  const t = [g.grades.탐구1, g.grades.탐구2].filter((v): v is number => typeof v === 'number');
  return t.length ? Math.min(...t) : undefined;
}
/** 판정 순(충족 → 근접 → 미충족 → 자료 부족), 같은 판정은 대학 이름 가나다순(D8). */
export function searchMinimum(rules: MinimumRule[], g: MockGrades): SearchRow[] {
  return rules.filter(reviewed).map(rule => ({ rule, judged: judgeMinimum(g.exam, g, rule.criterion), sum: minimumSum(g, rule.criterion) }))
    .sort((a, b) => SEARCH_ORDER.indexOf(a.judged.verdict) - SEARCH_ORDER.indexOf(b.judged.verdict) || a.rule.university.localeCompare(b.rule.university, 'ko') || a.rule.unit.localeCompare(b.rule.unit, 'ko'));
}
export interface WhatIf { area: Core; from: number | undefined; to: number | undefined; before: number; after: number; newly: string[] }
/** 한 영역만 1등급 올려 보면 충족이 되는 전형(D3). 이미 1등급이거나 성적이 없는 영역은 계산하지 않아요. */
export function whatIfMinimum(rules: MinimumRule[], g: MockGrades): WhatIf[] {
  const now = searchMinimum(rules, g), met = new Set(now.filter(r => r.judged.verdict === '충족').map(r => r.rule.id));
  return CORE.map(area => {
    const from = shownGrade(g, area);
    if (from === undefined || from <= 1) return { area, from, to: undefined, before: met.size, after: met.size, newly: [] };
    const keys = area === '탐구' ? ['탐구1', '탐구2'] : [area], grades = { ...g.grades };
    for (const k of keys) if (typeof grades[k] === 'number') grades[k] = Math.max(1, grades[k]! - 1);
    const after = searchMinimum(rules, { ...g, grades }).filter(r => r.judged.verdict === '충족').map(r => r.rule.id);
    return { area, from, to: from - 1, before: met.size, after: after.length, newly: after.filter(id => !met.has(id)) };
  });
}
