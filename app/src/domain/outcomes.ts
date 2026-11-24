import { ExchangeError, readExchange } from '../io/exchange';
import type { CardRecord, Student } from './classroom';
import { parseMocks, type MockScore } from './mock';

/** 결과 집계(result-summary 02-spec). 실제 기록 값만, 판정 색 없이. 학생은 번호로만 맞추고 실명 열은 읽지 않아요(R-PRIV-003). */
export const RESULTS = ['합격', '충원 합격', '불합격', '1단계 불합격', '미등록', '미입력'] as const;
export type Result = typeof RESULTS[number];
export const TYPES = ['교과', '종합', '논술', '기타'] as const;
export type AdmissionType = typeof TYPES[number];
// stage1: 1단계 통과 여부. 지금은 채우는 경로가 없어 null이지만(나이스 불러오기 삭제, 02-spec 2026-11-23) 집계 열·저장 구조는 그대로 둬요
export interface Outcome { id?: number; number: string; university: string; program: string; type: AdmissionType; stage1: boolean | null; result: Result }

export function normalizeResult(v: unknown): Result {
  const t = String(v ?? '').replace(/\s/g, '');
  if (!t) return '미입력';
  if (/충원|추가/.test(t)) return '충원 합격';
  if (/1단계/.test(t) && /불/.test(t)) return '1단계 불합격';
  if (/미등록|등록포기/.test(t)) return '미등록';
  if (/불합격|탈락/.test(t)) return '불합격';
  if (/합격/.test(t)) return '합격';
  return '미입력';
}
export const typeOf = (v: unknown): AdmissionType => { const t = String(v ?? ''); return t.includes('교과') ? '교과' : t.includes('종합') ? '종합' : t.includes('논술') ? '논술' : '기타'; };

/** 받은 상담카드 6칸으로 지원 목록을 미리 채워요(결과는 미입력). */
export const outcomesFromCards = (cards: readonly CardRecord[]): Outcome[] => {
  const latest = new Map<string, CardRecord>();
  for (const c of cards) if (!latest.has(c.number) || latest.get(c.number)!.created_at < c.created_at) latest.set(c.number, c);
  return [...latest.values()].flatMap(c => c.card.slots.map(s => ({ number: c.number, university: s.university, program: s.program ?? '', type: typeOf(s.program), stage1: null, result: '미입력' as Result })));
};

export interface UnivRow { type: AdmissionType; key: string; university: string; program: string; applied: number; stage1: number | null; counts: Record<Result, number> }
const zero = () => Object.fromEntries(RESULTS.map(r => [r, 0])) as Record<Result, number>;
// 최종 합격이 많은 대학 · 전형부터(v2 시안 순서), 같으면 지원이 많은 순
const final = (r: UnivRow) => r.counts['합격'] + r.counts['충원 합격'];
export function byUniversity(items: readonly Outcome[]) {
  const map = new Map<string, UnivRow>();
  for (const o of items) {
    const key = `${o.type}|${o.university}|${o.program}`;
    const row = map.get(key) ?? { type: o.type, key, university: o.university, program: o.program, applied: 0, stage1: null, counts: zero() };
    row.applied++; row.counts[o.result]++;
    if (o.stage1 !== null) row.stage1 = (row.stage1 ?? 0) + Number(o.stage1);
    map.set(key, row);
  }
  return TYPES.map(t => ({ type: t, rows: [...map.values()].filter(r => r.type === t).sort((a, b) => final(b) - final(a) || b.applied - a.applied || a.university.localeCompare(b.university)) })).filter(g => g.rows.length);
}
export function totals(items: readonly Outcome[]) {
  const counts = zero(); for (const o of items) counts[o.result]++;
  const passedStudents = new Set(items.filter(o => o.result === '합격' || o.result === '충원 합격').map(o => o.number)).size;
  return { applied: items.length, counts, final: counts['합격'] + counts['충원 합격'], passedStudents, stage1: items.filter(o => o.stage1).length };
}

/** 모의고사(가채점) 수합: 학생이 보낸 mock_score .jnavi. */
export interface RawMock { number: string; exam: string; raw: MockScore['raw']; created_at: string; received_at: string }
export async function receiveMock(file: string, text: string, code: string, students: readonly Student[], now = new Date()): Promise<{ file: string; ok: boolean; reason: string; record?: RawMock }> {
  const fail = (reason: string) => ({ file, ok: false, reason });
  if (!file.toLowerCase().endsWith('.jnavi')) return fail("모의고사 파일(.jnavi)이 아니에요. 학생이 모의고사 화면에서 '선생님께 보내기'로 저장한 파일을 넣어 주세요.");
  let e;
  try { e = await readExchange(text); } catch (x) { return fail(x instanceof ExchangeError && x.code === 'not-jnavi' ? '모의고사 파일(.jnavi)이 아니에요.' : '파일이 깨져서 읽을 수 없어요. 학생에게 다시 저장해서 보내 달라고 해 주세요.'); }
  if (e.kind === 'counsel_card') return fail('상담카드 파일이에요. 카드 수합에서 받아 주세요.');
  if (e.kind !== 'mock_score') return fail('모의고사 파일이 아니에요.');
  if (e.class_code !== code) return fail(`학급 코드가 우리 반(${code})과 달라요. 학생에게 ${code}로 다시 보내 달라고 해 주세요.`);
  if (!students.some(s => s.number === e.number)) return fail(`우리 반 명단에 ${e.number}번이 없어요.`);
  try {
    const p = e.payload as { exam: string; raw: unknown };
    const [m] = parseMocks([{ exam: p.exam, raw: p.raw, updated_at: e.created_at }]);
    return { file, ok: true, reason: '', record: { number: e.number, exam: m.exam, raw: m.raw, created_at: e.created_at, received_at: now.toISOString() } };
  } catch { return fail('원점수 범위가 맞지 않는 파일이에요. 학생에게 다시 저장해서 보내 달라고 해 주세요.'); }
}
