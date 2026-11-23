import type { CardRecord, CardSlot, Student } from './classroom';
import { typeOf, type Outcome, type Result } from './outcomes';

/** 우리 반 입시 일정(class-calendar 02-spec). 카드 지원 칸 × 대학 일정의 투영이라 날짜를 추정해 채우지 않아요(D14). */
export const EVENT_KINDS = ['서류 제출', '면접·실기', '1단계 발표', '최종 발표', '충원 기간'] as const;
export type EventKind = typeof EVENT_KINDS[number];
/** design.md Colors "일정 종류 색" 토큰 이름(--color-event-<token>). */
export const KIND_TOKEN: Record<EventKind, string> = { '서류 제출': 'doc', '면접·실기': 'exam', '1단계 발표': 'first', '최종 발표': 'final', '충원 기간': 'waitlist' };

/** 교사가 대학 · 전형 단위로 한 번 넣는 일정. 충원 기간만 end(마감일)가 있어요. */
export interface ClassSchedule { id?: number; university: string; program: string; kind: EventKind; date: string; end?: string | null; time?: string; memo?: string }
/** 서류 제출 · 면접/실기 완료 표시. 켜진 것만 저장해요. */
export interface ScheduleDone { key: string; number: string; university: string; program: string; kind: EventKind }

export const STAGE1_VALUES = ['1단계 통과', '1단계 불합격'] as const;
export const FINAL_VALUES = ['합격', '충원 합격', '불합격', '1단계 불합격', '미등록'] as const;
export type RowResult = typeof STAGE1_VALUES[number] | Result;

export interface ScheduleRow {
  id: string; number: string; university: string; program: string; department: string;
  kind: EventKind; label: string; date: string; time: string; source: 'teacher' | 'card'; scheduleId?: number;
  /** 결과 칸: stage1 = 1단계 발표, final = 최종 발표 · 충원 기간 마감. null이면 완료 칸(서류 · 면접/실기) 또는 없음(충원 기간 시작). */
  result: 'stage1' | 'final' | null; checkable: boolean; done: boolean; value: RowResult; period?: { start: string; end: string };
}
export interface UndatedGroup { university: string; program: string; label: string; numbers: string[] }

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const validDay = (v: unknown): v is string => typeof v === 'string' && DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
export const doneKey = (number: string, university: string, program: string, kind: EventKind) => JSON.stringify([number, university, program, kind]);
const sameApp = (a: { university: string; program?: string }, b: { university: string; program?: string }) => a.university === b.university && (a.program ?? '') === (b.program ?? '');

/** 학생별 최신 카드의 지원 6칸(결과 집계 outcomesFromCards와 같은 범위, D23). */
export function latestSlots(cards: readonly CardRecord[]): { number: string; slot: CardSlot }[] {
  const latest = new Map<string, CardRecord>();
  for (const c of cards) if (!latest.has(c.number) || latest.get(c.number)!.created_at < c.created_at) latest.set(c.number, c);
  return [...latest.values()].flatMap(c => c.card.slots.map(slot => ({ number: c.number, slot })));
}

/** 대학 일정 입력 칸의 "대학 · 전형" 목록: 반 카드에 있는 것만, 지원 수와 카드 고사 날짜가 있는 수. */
export function applications(cards: readonly CardRecord[]) {
  const map = new Map<string, { university: string; program: string; numbers: Set<string>; withExamDate: Set<string> }>();
  for (const { number, slot } of latestSlots(cards)) {
    const key = JSON.stringify([slot.university, slot.program ?? '']);
    const a = map.get(key) ?? { university: slot.university, program: slot.program ?? '', numbers: new Set(), withExamDate: new Set() };
    a.numbers.add(number); if (validDay(slot.exam_date)) a.withExamDate.add(number);
    map.set(key, a);
  }
  return [...map.values()].map(a => ({ key: JSON.stringify([a.university, a.program]), university: a.university, program: a.program, applied: a.numbers.size, withExamDate: a.withExamDate.size }))
    .sort((a, b) => a.university.localeCompare(b.university, 'ko') || a.program.localeCompare(b.program, 'ko'));
}

const examKind = (slot: CardSlot) => slot.exam_kind && slot.exam_kind !== 'none' ? slot.exam_kind : '';
export function rowValue(kind: 'stage1' | 'final' | null, o: Outcome | undefined): RowResult {
  if (kind === 'stage1') return o?.stage1 === true ? '1단계 통과' : o?.stage1 === false ? '1단계 불합격' : '미입력';
  return o?.result ?? '미입력';
}

/** 일정 행 = 카드 지원 칸 × 그 대학 · 전형의 일정. 1단계 불합격 학생은 뒤 일정(면접 · 최종 · 충원)에서 빠져요. */
export function scheduleRows(cards: readonly CardRecord[], schedules: readonly ClassSchedule[], done: readonly ScheduleDone[], outcomes: readonly Outcome[]) {
  const rows: ScheduleRow[] = [], undated = new Map<string, UndatedGroup>(), doneKeys = new Set(done.map(d => d.key));
  for (const { number, slot } of latestSlots(cards)) {
    const program = slot.program ?? '', department = slot.department ?? '';
    const outcome = outcomes.find(o => o.number === number && sameApp(o, slot));
    const out = outcome?.stage1 === false;
    const base = { number, university: slot.university, program, department };
    const add = (kind: EventKind, label: string, date: string, extra: Partial<ScheduleRow>) => {
      const result = extra.result ?? null, checkable = kind === '서류 제출' || kind === '면접·실기';
      const value = rowValue(result, outcome);
      rows.push({ ...base, id: JSON.stringify([number, slot.university, program, label, date, extra.scheduleId ?? 'card']), kind, label, date, time: '', source: 'teacher', result, checkable,
        done: checkable ? doneKeys.has(doneKey(number, slot.university, program, kind)) : result !== null && value !== '미입력', value, ...extra });
    };
    const exam = examKind(slot), cardDate = validDay(slot.exam_date) ? slot.exam_date : null;
    if (exam && cardDate && !out) add('면접·실기', exam, cardDate, { source: 'card' });
    const mine = schedules.filter(s => sameApp(s, slot) && validDay(s.date));
    for (const s of mine) {
      const extra = { scheduleId: s.id, time: s.time ?? '' };
      if (s.kind === '서류 제출') add(s.kind, s.kind, s.date, extra);
      else if (s.kind === '1단계 발표') add(s.kind, s.kind, s.date, { ...extra, result: 'stage1' });
      else if (out) continue;
      else if (s.kind === '면접·실기') { if (!cardDate) add(s.kind, exam || '면접·실기', s.date, extra); }
      else if (s.kind === '최종 발표') add(s.kind, s.kind, s.date, { ...extra, result: 'final' });
      else if (s.kind === '충원 기간' && validDay(s.end)) {
        const period = { start: s.date, end: s.end };
        add(s.kind, '충원 기간 시작', s.date, { ...extra, period });
        add(s.kind, '충원 기간 마감', s.end, { ...extra, period, result: 'final' });
      }
    }
    if (exam && !cardDate && !out && !mine.some(s => s.kind === '면접·실기')) {
      const key = JSON.stringify([slot.university, program, exam]);
      const g = undated.get(key) ?? { university: slot.university, program, label: exam, numbers: [] };
      g.numbers.push(number); undated.set(key, g);
    }
  }
  return { rows, undated: [...undated.values()] };
}

/** 그날 목록 묶음: 일정 하나(대학 · 전형 · 종류 이름) = 묶음 하나. 종류 순서 → 대학 가나다순, 행은 번호순이고 끝난 행은 아래로(D6). */
export interface RowGroup { key: string; kind: EventKind; label: string; university: string; program: string; source: 'teacher' | 'card'; scheduleId?: number; time: string; rows: ScheduleRow[] }
export function groupRows(rows: readonly ScheduleRow[]): RowGroup[] {
  const map = new Map<string, RowGroup>();
  for (const r of rows) {
    const key = JSON.stringify([r.date, r.kind, r.label, r.university, r.program, r.source, r.scheduleId ?? null]);
    const g = map.get(key) ?? { key, kind: r.kind, label: r.label, university: r.university, program: r.program, source: r.source, scheduleId: r.scheduleId, time: r.time, rows: [] };
    g.rows.push(r); map.set(key, g);
  }
  const groups = [...map.values()];
  for (const g of groups) g.rows.sort((a, b) => Number(a.done) - Number(b.done) || a.number.localeCompare(b.number));
  return groups.sort((a, b) => EVENT_KINDS.indexOf(a.kind) - EVENT_KINDS.indexOf(b.kind) || a.university.localeCompare(b.university, 'ko') || a.program.localeCompare(b.program, 'ko') || a.label.localeCompare(b.label, 'ko'));
}

/** 칸 "n건"과 종류별 건수. 기간 사이 날은 세지 않아요(D15). */
export function dayCounts(rows: readonly ScheduleRow[], date: string) {
  const today = rows.filter(r => r.date === date);
  return { total: today.length, byKind: EVENT_KINDS.map(kind => ({ kind, count: today.filter(r => r.kind === kind).length })).filter(k => k.count) };
}
export const cellLabel = (date: string, rows: readonly ScheduleRow[]) => {
  const { total, byKind } = dayCounts(rows, date);
  return [`${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일`, `일정 ${total}건`, ...byKind.map(k => `${k.kind} ${k.count}건`)].join(', ');
};
/** 그 날이 충원 기간 사이(시작 · 마감 칸 제외)인 일정. */
export const activePeriods = (schedules: readonly ClassSchedule[], date: string) =>
  schedules.filter(s => s.kind === '충원 기간' && validDay(s.end) && s.date < date && date < s.end!).sort((a, b) => a.end!.localeCompare(b.end!));

export function rowStatus(row: ScheduleRow, today: string) {
  if (row.done) return '완료';
  if (row.date < today) return '기한 지남';
  const days = Math.round((Date.parse(`${row.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return days === 0 ? '오늘' : `D-${days}`;
}
/** 결과 미입력: 발표일이 오늘이거나 지났는데 결과가 없는 행. */
export const missingResults = (rows: readonly ScheduleRow[], today: string) => rows.filter(r => r.result && r.date <= today && r.value === '미입력').length;

/**
 * 결과를 고르면 결과 집계와 같은 outcomes 기록을 고쳐요(D13). 없던 지원이면 새로 만들어요.
 * 1단계 통과 → stage1 통과 · 1단계 불합격 → stage1 불합격 + result 1단계 불합격 · 최종 → result.
 */
export function withResult(o: Outcome | undefined, row: Pick<ScheduleRow, 'number' | 'university' | 'program' | 'result'>, value: RowResult): Outcome {
  const base: Outcome = o ? { ...o } : { number: row.number, university: row.university, program: row.program, type: typeOf(row.program), stage1: null, result: '미입력' };
  if (row.result === 'stage1') {
    if (value === '1단계 통과') return { ...base, stage1: true, result: base.result === '1단계 불합격' ? '미입력' : base.result };
    if (value === '1단계 불합격') return { ...base, stage1: false, result: '1단계 불합격' };
    return { ...base, stage1: null, result: base.result === '1단계 불합격' ? '미입력' : base.result };
  }
  const result = value as Result;
  return { ...base, result, stage1: result === '1단계 불합격' ? false : base.stage1 === false ? null : base.stage1 };
}
export const findOutcome = (outcomes: readonly Outcome[], row: Pick<ScheduleRow, 'number' | 'university' | 'program'>) => outcomes.find(o => o.number === row.number && sameApp(o, row));

export function checkSchedule(s: Partial<ClassSchedule>): string {
  if (!s.university || !s.kind || !validDay(s.date)) return '대학 · 전형, 일정 종류, 날짜를 넣어 주세요';
  if (s.kind === '충원 기간') {
    if (!validDay(s.end)) return '대학 · 전형, 일정 종류, 날짜를 넣어 주세요';
    if (s.end < s.date) return `마감일이 시작일보다 빨라요. ${Number(s.date.slice(5, 7))}월 ${Number(s.date.slice(8))}일 이후로 골라 주세요.`;
  }
  if (s.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)) return '시각은 HH:MM으로 넣어 주세요.';
  return '';
}

const WEEK = '일월화수목금토';
export const shortDate = (date: string) => `${date.slice(5, 7)}.${date.slice(8)}(${WEEK[new Date(`${date}T00:00:00Z`).getUTCDay()]})`;
export const longDate = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일(${WEEK[new Date(`${date}T00:00:00Z`).getUTCDay()]})`;
export function weekDays(date: string): string[] {
  const t = Date.parse(`${date}T00:00:00Z`), start = t - new Date(t).getUTCDay() * 86400000;
  return Array.from({ length: 7 }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10));
}
export const studentName = (students: readonly Student[], number: string) => { const s = students.find(x => x.number === number); return s ? `${s.number} · ${s.alias}` : number; };
