import { normalizeNumber } from '../io/exchange';
import type { Student } from './classroom';
import type { GradeRecord } from './student';

/** score-import 02-spec: 파일 → 열 맞추기 → 검증 → 반영. 모의고사 등급 또는 내신 학기 평균(5등급). */
export type ImportKind = 'mock' | 'school';
export const MOCK_AREAS = ['국어', '수학', '영어', '한국사', '탐구1', '탐구2'] as const;
export const SEMESTERS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'] as const;
export const FIELDS: Record<ImportKind, readonly string[]> = { mock: MOCK_AREAS, school: SEMESTERS };
export const EXAM_KINDS = ['학평', '모평', '수능'] as const;
export const examName = (year: number, month: number, kind: string) => `${year}년 ${month}월 ${kind}`;

export interface MockGrades { number: string; exam: string; grades: Partial<Record<string, number | null>>; updated_at: string }
/** records = 과목 원자료(있을 때만, 학생 기록 상세의 과목군 추이·입력 과목 수·5 to 9). 성적 불러오기는 학기 평균만 넣어요. */
export interface SchoolGrades { number: string; semesters: Partial<Record<string, number>>; updated_at: string; records?: GradeRecord[] }

export type ColumnMap = Record<string, number>; // 필드 → 열 번호(-1 = 없음)
const clean = (v: unknown) => String(v ?? '').replace(/\s/g, '');
export function autoMap(header: readonly unknown[], kind: ImportKind): ColumnMap {
  const names = header.map(clean), find = (...keys: string[]) => names.findIndex(n => keys.some(k => n === k || n.startsWith(k)));
  const map: ColumnMap = { 번호: find('번호', '번'), 별칭: find('별칭', '이름') };
  for (const f of FIELDS[kind]) map[f] = find(f, f.replace('-', '학년') + '학기', f.replace('탐구', '탐'));
  return map;
}

export type RowStatus = '정상' | '확인 필요' | '오류';
export interface CheckedRow { line: number; number: string | null; alias: string; values: Record<string, number | null>; bad: string[]; blank: string[]; status: RowStatus; reason: string; blocking: boolean }

/** 범위 오류 행은 빼고, 빈 칸은 결시(모의고사)로. 명단과 다른 번호·별칭·중복은 전체 반영을 막아요. */
export function checkRows(rows: readonly unknown[][], map: ColumnMap, kind: ImportKind, students: readonly Student[]): CheckedRow[] {
  const seen = new Set<string>();
  const valid = (v: number) => kind === 'mock' ? Number.isInteger(v) && v >= 1 && v <= 9 : v >= 1 && v <= 5;
  const out = rows.filter(r => r.some(c => clean(c))).map((r, i): CheckedRow => {
    const number = normalizeNumber(clean(r[map.번호])), alias = String(r[map.별칭] ?? '').trim();
    const values: Record<string, number | null> = {}, bad: string[] = [], blank: string[] = [];
    for (const f of FIELDS[kind]) {
      if (map[f] < 0) continue;
      const raw = clean(r[map[f]]);
      if (!raw) { values[f] = null; blank.push(f); continue; }
      const v = Number(raw);
      if (!Number.isFinite(v) || !valid(v)) bad.push(`${f} ${raw}`); else values[f] = v;
    }
    const student = students.find(s => s.number === number);
    const base = { line: i + 2, number, alias, values, bad, blank };
    const block = (reason: string): CheckedRow => ({ ...base, status: '오류', reason, blocking: true });
    if (!number) return block('번호를 읽을 수 없어요. 1~99 숫자로 고쳐서 다시 올려 주세요');
    if (seen.has(number)) return block(`${number}번이 두 번 있어요. 한 행만 남기고 다시 올려 주세요`);
    seen.add(number);
    if (!student) return block(`우리 반 명단에 ${number}번이 없어요`);
    if (map.별칭 >= 0 && alias && alias !== student.alias) return block(`별칭이 명단(${student.alias})과 달라요`);
    if (bad.length) return { ...base, status: '오류', reason: `${bad.join(', ')} — ${kind === 'mock' ? '등급은 1~9예요' : '5등급 평균은 1.0~5.0이에요'}. 이 행은 빼고 반영해요`, blocking: false };
    if (kind === 'mock' && blank.length) return { ...base, status: '확인 필요', reason: `${blank.join('·')} 빈 칸 — 결시로 반영돼요`, blocking: false };
    if (kind === 'school' && blank.length === Object.keys(values).length) return { ...base, status: '확인 필요', reason: '모든 학기가 빈 칸이라 반영할 값이 없어요', blocking: false };
    return { ...base, status: '정상', reason: '', blocking: false };
  });
  const rank: Record<RowStatus, number> = { 오류: 0, '확인 필요': 1, 정상: 2 };
  return out.sort((a, b) => rank[a.status] - rank[b.status] || a.line - b.line);
}
export const applicable = (rows: readonly CheckedRow[]) => rows.some(r => r.blocking) ? [] : rows.filter(r => r.status !== '오류' && r.number && Object.values(r.values).some(v => v !== null));

/** 내신 학기 평균들의 단순 평균. shortcut: 학점 가중이 아니에요 — 과목별 성적을 불러오게 되면 학점 가중으로 바꿔요. */
export function schoolAverage(g?: SchoolGrades): number | null {
  const v = SEMESTERS.map(s => g?.semesters[s]).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) / 100 : null;
}
/** 성적 하락 신호: 가장 최근 학기 평균이 바로 전 학기보다 0.3 이상 커짐(등급 숫자가 커지면 내려간 것). teacher-dashboard 02-spec P5 예시 기준. */
export const DECLINE_STEP = 0.3;
export function decline(g?: SchoolGrades): number | null {
  const v = SEMESTERS.map(s => g?.semesters[s]).filter((x): x is number => typeof x === 'number');
  if (v.length < 2) return null;
  const d = Math.round((v[v.length - 1] - v[v.length - 2]) * 100) / 100;
  return d >= DECLINE_STEP ? d : null;
}
