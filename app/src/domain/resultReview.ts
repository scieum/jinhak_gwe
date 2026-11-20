import { parseCsv } from '../io/grades';

/** Columns of work/_data/admission-results/*.csv (README "열"). */
export const RESULT_COLUMNS = ['university', 'result_year', 'round', 'admission_type', 'program', 'recruit_unit', 'quota', 'applicants', 'competition_rate',
  'fill_count', 'fill_rate', 'cut_50', 'cut_70', 'cut_other', 'metric', 'basis', 'grade_system', 'source_url', 'source_page', 'note'] as const;
export type ResultRow = Record<typeof RESULT_COLUMNS[number], string>;
export interface ReviewUnit { key: string; university: string; year: string; source_url: string; rows: ResultRow[]; errors: string[]; warnings: string[] }
export interface Approval { reviewer: string; at: string }
export interface ReviewRecord {
  key: string;
  approvals: Approval[];
  rejection: { reviewer: string; reason: string; at: string } | null;
  license: 'unknown' | 'allowed' | 'denied';
  updated_at: string;
}
export type ReviewStatus = '검수 대기' | '1인 승인' | '검수 완료' | '반려';
export const REQUIRED_APPROVALS = 2;

export function parseResultCsv(text: string): ResultRow[] {
  const [head, ...body] = parseCsv(text.replace(/^﻿/, ''));
  const names = (head ?? []).map(h => h.trim());
  if (RESULT_COLUMNS.some((c, i) => names[i] !== c)) throw new Error('입결 CSV 열 이름이 README 형식과 달라요. 첫 줄을 확인해 주세요.');
  return body.map(cells => Object.fromEntries(RESULT_COLUMNS.map((c, i) => [c, (cells[i] ?? '').trim()])) as ResultRow);
}

export const unitKey = (r: Pick<ResultRow, 'university' | 'result_year' | 'source_url'>) => `${r.university}|${r.result_year}|${r.source_url}`;
export function httpsUrl(value: string) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}
const GRADE_METRICS = ['교과등급', '수능등급'], SCORE_METRICS = ['환산점수', '백분위', '표준점수'];
const num = (v: string) => v === '' ? null : Number(v);

/** errors block approval; warnings are shown to the reviewer only. */
export function rowIssues(r: ResultRow): { errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = [];
  if (!r.university || !r.recruit_unit) errors.push('대학명 또는 모집단위가 비어 있어요.');
  if (!/^20\d\d$/.test(r.result_year)) errors.push(`학년도 "${r.result_year}"를 확인해 주세요.`);
  if (!httpsUrl(r.source_url)) errors.push('원문 주소가 https 링크가 아니에요.');
  const c50 = num(r.cut_50), c70 = num(r.cut_70);
  for (const [name, v] of [['50% 컷', c50], ['70% 컷', c70]] as const) {
    if (v !== null && !Number.isFinite(v)) errors.push(`${name}이 숫자가 아니에요.`);
    else if (v !== null && GRADE_METRICS.includes(r.metric) && (v < 1 || v > 9)) errors.push(`${name} ${v}가 등급 범위(1~9) 밖이에요.`);
  }
  if ((c50 !== null || c70 !== null) && !r.metric) warnings.push('컷 지표 종류가 비어 있어요.');
  if (c50 !== null && c70 !== null && Number.isFinite(c50) && Number.isFinite(c70)) {
    if (GRADE_METRICS.includes(r.metric) && c70 < c50) warnings.push('등급 지표인데 70% 컷이 50% 컷보다 좋아요.');
    if (SCORE_METRICS.includes(r.metric) && c70 > c50) warnings.push('점수 지표인데 70% 컷이 50% 컷보다 높아요.');
  }
  return { errors, warnings };
}

export function groupUnits(rows: readonly ResultRow[]): ReviewUnit[] {
  const map = new Map<string, ReviewUnit>();
  for (const r of rows) {
    const key = unitKey(r);
    let u = map.get(key);
    if (!u) map.set(key, u = { key, university: r.university, year: r.result_year, source_url: r.source_url, rows: [], errors: [], warnings: [] });
    u.rows.push(r);
    const { errors, warnings } = rowIssues(r), at = `${u.rows.length}행: `;
    u.errors.push(...errors.map(e => at + e)); u.warnings.push(...warnings.map(w => at + w));
  }
  return [...map.values()].sort((a, b) => a.university.localeCompare(b.university, 'ko') || b.year.localeCompare(a.year) || a.source_url.localeCompare(b.source_url));
}

export const emptyRecord = (key: string): ReviewRecord => ({ key, approvals: [], rejection: null, license: 'unknown', updated_at: '' });
export function reviewStatus(rec: ReviewRecord | undefined): ReviewStatus {
  if (!rec) return '검수 대기';
  if (rec.rejection) return '반려';
  const n = new Set(rec.approvals.map(a => a.reviewer)).size;
  return n >= REQUIRED_APPROVALS ? '검수 완료' : n === 1 ? '1인 승인' : '검수 대기';
}
export const isReleasable = (unit: ReviewUnit, rec: ReviewRecord | undefined) => !unit.errors.length && reviewStatus(rec) === '검수 완료' && rec!.license === 'allowed';

const cleanName = (reviewer: string) => {
  const name = reviewer.trim();
  if (!name) throw new Error('검수자 이름을 먼저 적어 주세요.');
  return name;
};
export function approve(unit: ReviewUnit, rec: ReviewRecord, reviewer: string, now = new Date()): ReviewRecord {
  const name = cleanName(reviewer);
  if (unit.errors.length) throw new Error('오류가 있는 자료는 승인할 수 없어요. 원문 대조 후 CSV를 고쳐 주세요.');
  if (rec.approvals.some(a => a.reviewer === name)) throw new Error('이미 승인했어요. 다른 검수자가 확인해야 해요.');
  return { ...rec, rejection: null, approvals: [...(rec.rejection ? [] : rec.approvals), { reviewer: name, at: now.toISOString() }], updated_at: now.toISOString() };
}
export function reject(rec: ReviewRecord, reviewer: string, reason: string, now = new Date()): ReviewRecord {
  const name = cleanName(reviewer), text = reason.trim();
  if (!text) throw new Error('반려 사유를 적어야 반려할 수 있어요.');
  if (text.length > 200) throw new Error('반려 사유는 200자까지 적을 수 있어요.');
  return { ...rec, approvals: [], rejection: { reviewer: name, reason: text, at: now.toISOString() }, updated_at: now.toISOString() };
}
export function setLicense(rec: ReviewRecord, license: ReviewRecord['license'], reviewer: string, now = new Date()): ReviewRecord {
  cleanName(reviewer);
  return { ...rec, license, updated_at: now.toISOString() };
}

/** Imported review files come from other devices: validate, then keep the newer record, unioning approvals when neither side rejected. */
export function parseRecords(value: unknown): ReviewRecord[] {
  const list = (value as { records?: unknown })?.records;
  if (!Array.isArray(list)) throw new Error('검수 기록 파일 형식이 아니에요.');
  return list.map(v => {
    const r = v as ReviewRecord;
    const ok = typeof r?.key === 'string' && Array.isArray(r.approvals) && r.approvals.every(a => typeof a?.reviewer === 'string' && !!a.reviewer.trim() && typeof a.at === 'string')
      && ['unknown', 'allowed', 'denied'].includes(r.license) && typeof r.updated_at === 'string'
      && (r.rejection === null || typeof r.rejection?.reason === 'string' && typeof r.rejection.reviewer === 'string');
    if (!ok) throw new Error('검수 기록에 잘못된 항목이 있어요.');
    return { key: r.key, approvals: r.approvals.map(a => ({ reviewer: a.reviewer.trim(), at: a.at })), rejection: r.rejection, license: r.license, updated_at: r.updated_at };
  });
}
export function mergeRecord(a: ReviewRecord | undefined, b: ReviewRecord): ReviewRecord {
  if (!a) return b;
  const [older, newer] = a.updated_at <= b.updated_at ? [a, b] : [b, a];
  if (newer.rejection || older.rejection) return newer;
  const approvals = [...older.approvals, ...newer.approvals].filter((x, i, all) => all.findIndex(y => y.reviewer === x.reviewer) === i);
  return { ...newer, approvals };
}

/** Public release file: only fully reviewed, licensed, error-free units. */
export interface ReleasedUnit { university: string; year: number; source_url: string; license: 'allowed'; approvals: Approval[]; rows: ResultRow[] }
export interface ReleasedFile { format: 'jinhak-navi-released-results'; version: 1; generated_at: string; units: ReleasedUnit[] }
export function buildRelease(units: readonly ReviewUnit[], records: ReadonlyMap<string, ReviewRecord>, now = new Date()): ReleasedFile {
  return { format: 'jinhak-navi-released-results', version: 1, generated_at: now.toISOString(),
    units: units.filter(u => isReleasable(u, records.get(u.key))).map(u => ({ university: u.university, year: Number(u.year), source_url: u.source_url, license: 'allowed' as const, approvals: records.get(u.key)!.approvals, rows: u.rows })) };
}
/** Trust boundary for the student app: re-check every gate instead of trusting the file. */
export function parseRelease(value: unknown): ReleasedUnit[] {
  const file = value as ReleasedFile;
  if (file?.format !== 'jinhak-navi-released-results' || file.version !== 1 || !Array.isArray(file.units)) return [];
  return file.units.filter(u => {
    if (u?.license !== 'allowed' || !Array.isArray(u.rows) || !Array.isArray(u.approvals) || new Set(u.approvals.map(a => a?.reviewer)).size < REQUIRED_APPROVALS) return false;
    const unit = groupUnits(u.rows.map(r => Object.fromEntries(RESULT_COLUMNS.map(c => [c, String(r?.[c] ?? '')])) as ResultRow));
    return unit.length === 1 && unit[0].key === unitKey({ university: u.university, result_year: String(u.year), source_url: u.source_url }) && !unit[0].errors.length;
  });
}
