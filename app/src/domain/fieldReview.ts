// 학과 계열표 검수(대학 상세 위키 · 비슷한 대학의 근거). 표 전체를 관리자 2명이 승인해야 공개 파일에 들어간다.
import { parseCsv } from '../io/grades';
import { REQUIRED_APPROVALS, type Approval, type ReleasedUnit } from './resultReview';
import { departmentsOf, type FieldRow } from './univWiki';

export interface FieldDraft { key: 'current'; rows: FieldRow[]; approvals: Approval[]; updated_at: string }
export type FieldStatus = '검수 대기' | '1인 승인' | '검수 완료';

export const emptyFieldDraft = (): FieldDraft => ({ key: 'current', rows: [], approvals: [], updated_at: '' });
export const fieldStatus = (d: FieldDraft): FieldStatus =>
  d.approvals.length >= REQUIRED_APPROVALS ? '검수 완료' : d.approvals.length === 1 ? '1인 승인' : '검수 대기';
const rowKey = (r: Pick<FieldRow, 'university' | 'unit'>) => `${r.university.trim()}|${r.unit.trim()}`;
const sortRows = (rows: FieldRow[]) => rows.sort((a, b) => a.university.localeCompare(b.university, 'ko') || a.unit.localeCompare(b.unit, 'ko'));

/** 승인을 막는 문제. 빈 칸·중복 학과가 하나라도 있으면 승인할 수 없다. */
export function fieldProblems(rows: readonly FieldRow[]): string[] {
  const out: string[] = [], seen = new Set<string>();
  if (!rows.length) out.push('계열표가 비어 있어요');
  rows.forEach((r, i) => {
    const empty = (['university', 'unit', 'small', 'mid'] as const).filter(k => !r[k].trim());
    if (empty.length) out.push(`${i + 1}행 ${r.university || '대학 없음'} ${r.unit}: 빈 칸이 있어요`);
    if (seen.has(rowKey(r))) out.push(`${i + 1}행 ${r.university} ${r.unit}: 같은 학과가 두 번 있어요`);
    seen.add(rowKey(r));
  });
  return out;
}

/** 표 내용이 바뀌면 그때까지의 승인은 모두 지운다(다시 검수). */
export function editRows(d: FieldDraft, rows: FieldRow[], now = new Date()): FieldDraft {
  return { ...d, rows, approvals: [], updated_at: now.toISOString() };
}

export function approveFields(d: FieldDraft, reviewer: string, now = new Date()): FieldDraft {
  const name = reviewer.trim();
  if (!name) throw new Error('검수자 이름을 먼저 적어 주세요.');
  const problems = fieldProblems(d.rows);
  if (problems.length) throw new Error(`${problems[0]} · 고친 뒤 승인해 주세요.`);
  if (d.approvals.some(a => a.reviewer === name)) throw new Error('이미 승인했어요. 다른 검수자가 확인해야 해요.');
  if (fieldStatus(d) === '검수 완료') throw new Error('이미 검수가 끝났어요.');
  return { ...d, approvals: [...d.approvals, { reviewer: name, at: now.toISOString() }], updated_at: now.toISOString() };
}

/** 공개 입결 교과·종합 학과 중 계열표에 없는 것(계열 칸은 비워 둔다). */
export function missingRows(units: readonly ReleasedUnit[], rows: readonly FieldRow[]): FieldRow[] {
  const have = new Set(rows.map(rowKey)), out = new Map<string, FieldRow>();
  for (const university of new Set(units.map(u => u.university)))
    for (const d of departmentsOf(units, university)) {
      const r = { university, unit: d.unit, small: '', mid: '' };
      if (!have.has(rowKey(r))) out.set(rowKey(r), r);
    }
  return sortRows([...out.values()]);
}

/** CSV 머리글: 대학,모집단위,소계열,중계열 */
export function parseFieldCsv(text: string): FieldRow[] {
  const [head, ...body] = parseCsv(text.replace(/^﻿/, ''));
  const col = ['대학', '모집단위', '소계열', '중계열'].map(h => head?.findIndex(c => c.trim() === h) ?? -1);
  if (col.some(i => i < 0)) throw new Error('CSV 첫 줄에 대학,모집단위,소계열,중계열이 있어야 해요.');
  return sortRows(body.filter(r => r.some(c => c.trim())).map(r => {
    const [university, unit, small, mid] = col.map(i => (r[i] ?? '').trim());
    return { university, unit, small, mid };
  }));
}

const sameRows = (a: readonly FieldRow[], b: readonly FieldRow[]) => JSON.stringify(sortRows([...a])) === JSON.stringify(sortRows([...b]));

/** 다른 검수자의 기록 파일. 표가 같으면 승인을 합치고, 다르면 null(화면이 덮어쓸지 묻는다). */
export function mergeFieldDraft(local: FieldDraft, incoming: unknown): FieldDraft | null {
  const d = incoming as FieldDraft & { format?: string };
  if (d?.format !== 'jinhak-navi-field-review' || !Array.isArray(d.rows) || !Array.isArray(d.approvals)) throw new Error('계열표 검수 기록 파일이 아니에요.');
  const rows = d.rows.map(r => ({ university: String(r?.university ?? ''), unit: String(r?.unit ?? ''), small: String(r?.small ?? ''), mid: String(r?.mid ?? '') }));
  const approvals = d.approvals.filter(a => typeof a?.reviewer === 'string' && a.reviewer.trim() && typeof a?.at === 'string').map(a => ({ reviewer: a.reviewer, at: a.at }));
  const next: FieldDraft = { key: 'current', rows, approvals, updated_at: String(d.updated_at ?? '') };
  if (!local.rows.length) return next;
  if (!sameRows(local.rows, rows)) return null;
  const all = [...local.approvals];
  for (const a of approvals) if (!all.some(x => x.reviewer === a.reviewer)) all.push(a);
  return { ...local, approvals: all.slice(0, REQUIRED_APPROVALS) };
}
export const fieldRecordFile = (d: FieldDraft) => ({ format: 'jinhak-navi-field-review', ...d });

/** 지금 공개 파일(univ-wiki.json)의 위키 본문은 그대로 두고 fields만 바꾼다. */
export function buildWikiFile(current: unknown, d: FieldDraft) {
  if (fieldStatus(d) !== '검수 완료') throw new Error(`검수자 ${REQUIRED_APPROVALS}명이 승인해야 내보낼 수 있어요.`);
  const problems = fieldProblems(d.rows);
  if (problems.length) throw new Error(problems[0]);
  const c = current as { format?: string; entries?: unknown };
  const entries = c?.format === 'jinhak-navi-univ-wiki' && Array.isArray(c.entries) ? c.entries : [];
  const reviewed_at = new Date(d.approvals.map(a => a.at).sort().pop()!).toLocaleDateString('sv-SE'); // 마지막 승인일(이 기기 날짜)
  return { format: 'jinhak-navi-univ-wiki', version: 1, fields: { reviewed_at, approvals: d.approvals, rows: d.rows.map(r => ({ university: r.university.trim(), unit: r.unit.trim(), small: r.small.trim(), mid: r.mid.trim() })) }, entries };
}
