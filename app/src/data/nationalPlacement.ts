import { loadCollectedIndex, loadCollectedRows } from './collectedResults';
import type { CollectedIndex } from '../domain/collectedResults';
import { parseNationalIndex, parseNationalRows, PLACEMENT_FIELDS, type NationalPlacementRow, type PlacementYear } from '../domain/nationalPlacement';

const base = () => `${import.meta.env.BASE_URL}data/national-placement/`;
export async function loadNationalCatalog() {
  const [collection, response] = await Promise.all([loadCollectedIndex(), fetch(`${base()}index.json`)]);
  if (!response.ok) throw new Error('배치표 목록을 불러오지 못했어요. 다시 시도해 주세요.');
  return { collection, index: parseNationalIndex(await response.json(), collection) };
}
export async function loadNationalYear(year: PlacementYear, collection: CollectedIndex) {
  if (!/^[a-f0-9]{64}\.json$/.test(year.file) || year.file !== `${year.sha256}.json`) throw new Error('배치표 자료 경로가 올바르지 않아요.');
  const response = await fetch(`${base()}${year.file}`);
  if (!response.ok) throw new Error('배치표 자료를 불러오지 못했어요. 다시 시도해 주세요.');
  const buffer = await response.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2, '0')).join('');
  if (buffer.byteLength !== year.bytes || digest !== year.sha256) throw new Error('배치표 자료가 목록과 일치하지 않아요. 새로고침해 주세요.');
  return parseNationalRows(JSON.parse(new TextDecoder().decode(buffer)), year, collection);
}
export async function loadPlacementSource(row: NationalPlacementRow, collection: CollectedIndex) {
  const entry = collection.universities.find(e => e.university === row.university);
  if (!entry) throw new Error('대학 원문 자료를 찾지 못했어요.');
  const source = (await loadCollectedRows(entry))[row.sourceRow];
  if (!source || source.result_year !== row.year || source.grade_system !== '9' || PLACEMENT_FIELDS.some(f => source[f] !== row[f])) throw new Error('배치표와 원문 자료가 일치하지 않아요. 새로고침해 주세요.');
  return source;
}
