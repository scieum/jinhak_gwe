// 학생 기록 상세(student-record v2 시안): 저장된 값을 그대로 잇는 추이 계열과 규칙 문장. 환산·예측 없음(NEVER-1·2).
import { gradeSummary } from './student';
import { SEMESTERS, type MockGrades, type SchoolGrades } from './scoreImport';
import { examsByRecent } from './minimum';

export interface Series { name: string; values: (number | null)[] }
export const TOTAL = '전 교과';
const SCHOOL_GROUPS = ['국어', '수학', '영어', '사회', '과학'];
const MOCK_SERIES = ['국어', '수학', '영어', '탐구1', '탐구2'];
const r1 = (v: number | null) => v === null ? null : Math.round(v * 10) / 10;
const COUNT = ['', '한', '두', '세', '네', '다섯', '여섯'];

/** 내신 학기 열 + 전 교과 · 과목군(국수영사과). 과목 원자료가 있으면 학점 가중 평균, 없으면 불러온 학기 평균만. */
export function schoolTrend(g?: SchoolGrades): { columns: string[]; series: Series[] } {
  const records = g?.records ?? [];
  const columns = SEMESTERS.filter(k => g?.semesters[k] !== undefined || records.some(r => r.semester === k));
  const avg = (k: string, groups?: string[]) => r1(gradeSummary(records.filter(r => r.semester === k), groups).average);
  const total = { name: TOTAL, values: columns.map(k => g?.semesters[k] ?? avg(k)) };
  const groups = SCHOOL_GROUPS.filter(s => records.some(r => r.subject_group === s));
  return { columns, series: [total, ...groups.map(s => ({ name: s, values: columns.map(k => avg(k, [s])) }))] };
}

/** 모의고사 회차(오래된 것부터) × 영역(국 · 수 · 영 · 탐1 · 탐2). */
export function mockTrend(mocks: readonly MockGrades[]): { columns: string[]; series: Series[] } {
  const columns = examsByRecent(mocks.map(m => m.exam)).reverse();
  const at = (e: string, a: string) => mocks.find(m => m.exam === e)?.grades[a] ?? null;
  return { columns, series: MOCK_SERIES.filter(a => columns.some(e => at(e, a) !== null)).map(a => ({ name: a, values: columns.map(e => at(e, a)) })) };
}

/** "2026년 10월 학평" → "10월 학평" / 축은 "10월". */
export const examShort = (e: string) => e.replace(/^\d{4}년 /, '');
export const examMonth = (e: string) => examShort(e).split(' ')[0];
const fmt = (v: number, school: boolean) => school ? v.toFixed(1) : String(v);
const pts = (s: Series, columns: string[]) => s.values.flatMap((v, i) => v === null ? [] : [{ col: columns[i], v }]);
const moved = (d: number, school: boolean) => d === 0 ? '같아요' : `${fmt(Math.abs(d), school)}등급 ${d < 0 ? '올랐어요' : '내려갔어요'}`;

/** 숫자 칸 문장: "1-1 1.7에서 2-2 1.2까지 네 학기 내내 올랐어요." 등급은 작을수록 좋아요. */
export function semesterSentence(s: Series, columns: string[]): string {
  const p = pts(s, columns);
  if (p.length < 2) return '';
  const first = p[0], last = p.at(-1)!, steps = p.slice(1).map((x, i) => x.v - p[i].v);
  const head = `${first.col} ${first.v.toFixed(1)}에서 ${last.col} ${last.v.toFixed(1)}까지`;
  if (p.length >= 3 && steps.every(d => d < 0)) return `${head} ${COUNT[p.length] ?? p.length} 학기 내내 올랐어요.`;
  if (p.length >= 3 && steps.every(d => d > 0)) return `${head} ${COUNT[p.length] ?? p.length} 학기 내내 내려갔어요.`;
  return `${head} ${moved(r1(last.v - first.v)!, true)}.`;
}

/** 카드 머리 문장. 내신 "2-2 평균 1.2, 지난 학기보다 0.1등급 올랐어요." / 모의고사 "10월 학평 수학 2등급, 6월 모평부터 같아요." */
export function trendSentence(s: Series, columns: string[], school: boolean): string {
  const p = pts(s, columns);
  if (!p.length) return '';
  const last = p.at(-1)!, prev = p.at(-2);
  if (school) {
    const head = `${last.col} ${s.name === TOTAL ? '평균' : s.name} ${last.v.toFixed(1)}`;
    return prev ? `${head}, 지난 학기보다 ${moved(r1(last.v - prev.v)!, true)}.` : `${head}이에요.`;
  }
  const head = `${examShort(last.col)} ${s.name} ${last.v}등급`;
  if (!prev) return `${head}이에요.`;
  if (prev.v !== last.v) return `${head}, 지난 회차보다 ${moved(last.v - prev.v, false)}.`;
  let from = p.length - 1;
  while (from > 0 && p[from - 1].v === last.v) from--;
  return `${head}, ${examShort(p[from].col)}부터 같아요.`;
}

/** 세로축: 데이터 범위 ±0.5(design.md grade-trend-chart 기본 보기). 내신 0.5 눈금, 모의고사 1 눈금(1~9 안). */
export function axis(series: Series[], school: boolean): number[] {
  const vals = series.flatMap(s => s.values).filter((v): v is number => v !== null);
  if (!vals.length) return [];
  const min = Math.min(...vals), max = Math.max(...vals);
  if (!school) { const lo = Math.max(1, Math.floor(min - 0.5)), hi = Math.min(9, Math.ceil(max + 0.5)); return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i); }
  let step = 0.5, lo = Math.floor((min - 0.5) * 2) / 2, hi = Math.ceil((max + 0.5) * 2) / 2;
  if ((hi - lo) / step > 6) { step = 1; lo = Math.floor(min - 0.5); hi = Math.ceil(max + 0.5); }
  return Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => r1(lo + i * step)!);
}

/** 선 끝 이름표: 마지막 값 높이에 두고 겹치면(간격 gap) 묶어서 위아래로 비켜요. 고른 계열이 같은 값에서 먼저. */
export function labelPositions(items: { key: string; y: number }[], gap = 18): Record<string, number> {
  let clusters = items.map(i => ({ keys: [i.key], ideal: [i.y] }));
  const start = (c: { ideal: number[] }) => c.ideal.reduce((a, b) => a + b, 0) / c.ideal.length - (c.ideal.length - 1) * gap / 2;
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 1; i < clusters.length; i++) {
      const a = clusters[i - 1], b = clusters[i];
      if (start(b) < start(a) + a.keys.length * gap) { clusters = [...clusters.slice(0, i - 1), { keys: [...a.keys, ...b.keys], ideal: [...a.ideal, ...b.ideal] }, ...clusters.slice(i + 1)]; merged = true; break; }
    }
  }
  return Object.fromEntries(clusters.flatMap(c => c.keys.map((k, j) => [k, start(c) + j * gap])));
}
