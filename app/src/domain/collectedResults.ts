import { RESULT_COLUMNS, type ResultRow } from './resultReview';

export interface CollectedEntry {
  university: string; file: string; sha256: string; bytes: number; rows: number;
  years: string[]; rounds: Record<string, number>; sources: number;
}
export interface CollectedIndex {
  format: 'jinhak-navi-collected-index'; version: 1; status: 'draft';
  generated_at: string; source_file: string; source_sha256: string;
  rows: number; sources: number; universities: CollectedEntry[];
}
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const invalid = () => new Error('수집 자료 파일 형식이 올바르지 않아요. 자료를 다시 가져와 주세요.');

export function parseCollectedIndex(value: unknown): CollectedIndex {
  const v = value as CollectedIndex;
  if (v?.format !== 'jinhak-navi-collected-index' || v.version !== 1 || v.status !== 'draft'
    || !hash(v.source_sha256) || typeof v.generated_at !== 'string' || typeof v.source_file !== 'string'
    || !count(v.rows) || !count(v.sources) || !Array.isArray(v.universities) || !v.universities.length) throw invalid();
  for (const e of v.universities) {
    if (!e || typeof e.university !== 'string' || !e.university.trim() || !hash(e.sha256) || e.file !== `${e.sha256}.json`
      || !count(e.rows) || !count(e.bytes) || !count(e.sources) || !Array.isArray(e.years)
      || !e.years.length || !e.years.every(y => typeof y === 'string' && /^20\d\d$/.test(y))
      || !e.rounds || typeof e.rounds !== 'object' || Array.isArray(e.rounds)
      || !Object.values(e.rounds).every(count) || Object.values(e.rounds).reduce((a, b) => a + b, 0) !== e.rows) throw invalid();
  }
  if (new Set(v.universities.map(e => e.university)).size !== v.universities.length
    || v.universities.reduce((n, e) => n + e.rows, 0) !== v.rows
    || v.universities.reduce((n, e) => n + e.sources, 0) !== v.sources) throw invalid();
  return v;
}

/** Dictionary packing is lossless: no number conversion, deduplication, or inferred values. */
export function parseCollectedRows(value: unknown, entry: CollectedEntry): ResultRow[] {
  const v = value as { format: string; version: number; status: string; university: string; columns: string[]; strings: string[]; rows: number[][] };
  if (v?.format !== 'jinhak-navi-collected-results' || v.version !== 1 || v.status !== 'draft' || v.university !== entry.university
    || !Array.isArray(v.columns) || v.columns.length !== RESULT_COLUMNS.length || v.columns.some((c, i) => c !== RESULT_COLUMNS[i])
    || !Array.isArray(v.strings) || !v.strings.every(s => typeof s === 'string') || !Array.isArray(v.rows) || v.rows.length !== entry.rows) throw invalid();
  return v.rows.map(cells => {
    if (!Array.isArray(cells) || cells.length !== RESULT_COLUMNS.length
      || !cells.every(id => Number.isSafeInteger(id) && id >= 0 && id < v.strings.length)) throw invalid();
    const row = Object.fromEntries(RESULT_COLUMNS.map((c, i) => [c, v.strings[cells[i]]])) as ResultRow;
    if (row.university !== entry.university || !entry.years.includes(row.result_year)) throw invalid();
    return row;
  });
}
