import type { CollectedIndex } from './collectedResults';
import { sortNumber } from './tableSort';

export const PLACEMENT_FIELDS = ['university', 'round', 'admission_type', 'program', 'recruit_unit', 'metric', 'basis', 'cut_50', 'cut_70'] as const;
export type NationalPlacementRow = Record<typeof PLACEMENT_FIELDS[number], string> & { id: string; sourceRow: number; year: string };
export interface PlacementYear { year: string; file: string; sha256: string; bytes: number; rows: number; universities: number }
export interface NationalPlacementIndex {
  format: 'jinhak-national-placement-index'; version: 1; status: 'draft'; collection_sha256: string;
  collection_rows: number; collection_universities: number; years: PlacementYear[];
}
export type CutField = 'cut_50' | 'cut_70';
export type PlacementFilters = { round: string; type: string; university: string; query: string; metric: string; cut: CutField; min: string; max: string };
export const defaultPlacementFilters: PlacementFilters = { round: '수시', type: '전체', university: '', query: '', metric: '교과등급', cut: 'cut_70', min: '1', max: '9' };
export const gradeCoordinate = (value: string) => { const n = sortNumber(value); return n !== null && n >= 1 && n <= 9 ? n : null; };
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const count = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const invalid = () => new Error('배치표 자료 형식이 올바르지 않아요. 자료를 다시 생성해 주세요.');

export function parseNationalIndex(value: unknown, collection: CollectedIndex): NationalPlacementIndex {
  const v = value as NationalPlacementIndex;
  if (v?.format !== 'jinhak-national-placement-index' || v.version !== 1 || v.status !== 'draft'
    || !hash(v.collection_sha256) || v.collection_sha256 !== collection.source_sha256
    || v.collection_rows !== collection.rows || v.collection_universities !== collection.universities.length
    || !Array.isArray(v.years) || !v.years.length || v.years.some(y => !y || typeof y !== 'object')
    || new Set(v.years.map(y => y.year)).size !== v.years.length) throw invalid();
  for (const y of v.years) if (!/^20\d\d$/.test(y.year) || !hash(y.sha256) || y.file !== `${y.sha256}.json`
    || !count(y.rows) || !count(y.bytes) || !count(y.universities)) throw invalid();
  return v;
}

export function parseNationalRows(value: unknown, year: PlacementYear, collection: CollectedIndex): NationalPlacementRow[] {
  const v = value as { format: string; version: number; status: string; year: string; columns: string[]; strings: string[]; rows: number[][]; sources: Record<string, string> };
  if (v?.format !== 'jinhak-national-placement' || v.version !== 1 || v.status !== 'draft' || v.year !== year.year
    || !Array.isArray(v.columns) || v.columns.length !== PLACEMENT_FIELDS.length || v.columns.some((c, i) => c !== PLACEMENT_FIELDS[i])
    || !Array.isArray(v.strings) || !v.strings.every(s => typeof s === 'string') || !Array.isArray(v.rows) || v.rows.length !== year.rows || !v.sources) throw invalid();
  const entries = new Map(collection.universities.map(e => [e.university, e])), seen = new Set<string>();
  const rows = v.rows.map(cells => {
    if (!Array.isArray(cells) || cells.length !== PLACEMENT_FIELDS.length + 1 || !Number.isSafeInteger(cells[0]) || cells[0] < 0
      || !cells.slice(1).every(id => Number.isSafeInteger(id) && id >= 0 && id < v.strings.length)) throw invalid();
    const row = Object.fromEntries(PLACEMENT_FIELDS.map((f, i) => [f, v.strings[cells[i + 1]]])) as Record<typeof PLACEMENT_FIELDS[number], string>;
    const source = entries.get(row.university), id = `${row.university}:${cells[0]}`;
    if (!source || v.sources[row.university] !== source.sha256 || cells[0] >= source.rows || seen.has(id)
      || !['교과등급', '수능등급'].includes(row.metric) || (gradeCoordinate(row.cut_50) === null && gradeCoordinate(row.cut_70) === null)) throw invalid();
    seen.add(id);
    return { ...row, id, sourceRow: cells[0], year: year.year };
  });
  if (new Set(rows.map(r => r.university)).size !== year.universities) throw invalid();
  return rows;
}

export function placementBounds(filters: PlacementFilters): { min: number; max: number } | null {
  const min = gradeCoordinate(filters.min), max = gradeCoordinate(filters.max);
  return min !== null && max !== null && min <= max ? { min, max } : null;
}
export function filterNationalRows(rows: readonly NationalPlacementRow[], filters: PlacementFilters) {
  const bounds = placementBounds(filters);
  if (!bounds) return [];
  return rows.filter(r => {
    const value = gradeCoordinate(r[filters.cut]);
    return value !== null && value >= bounds.min && value <= bounds.max && r.metric === filters.metric
      && (filters.round === '전체' || r.round === filters.round) && (filters.type === '전체' || r.admission_type === filters.type)
      && (!filters.university.trim() || r.university.includes(filters.university.trim()))
      && (!filters.query.trim() || `${r.program} ${r.recruit_unit}`.includes(filters.query.trim()));
  });
}

/** Same university + exact numeric coordinate share a selectable point; every source row is retained. */
export function universityPoints(rows: readonly NationalPlacementRow[], cut: CutField) {
  const map = new Map<string, Map<number, NationalPlacementRow[]>>();
  for (const row of rows) {
    const value = gradeCoordinate(row[cut]); if (value === null) continue;
    if (!map.has(row.university)) map.set(row.university, new Map());
    const points = map.get(row.university)!;
    points.set(value, [...points.get(value) ?? [], row]);
  }
  return [...map].sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([university, values]) => ({ university,
    points: [...values].sort(([a], [b]) => a - b).map(([value, records]) => ({ value, records })) }));
}

/** Move overlapping points only vertically; horizontal coordinates always stay exact. */
export const placementX = (grade: number, trackWidth = 720) => 16 + (grade - 1) / 8 * (trackWidth - 32);
export function pointLanes(points: ReturnType<typeof universityPoints>[number]['points'], trackWidth = 720) {
  const ends: number[] = [];
  return points.map(point => {
    const x = placementX(point.value, trackWidth);
    let lane = ends.findIndex(end => x - end >= 24);
    if (lane === -1) lane = ends.length;
    ends[lane] = x;
    return { ...point, x, lane };
  });
}
