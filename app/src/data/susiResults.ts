import type { CollectedEntry } from '../domain/collectedResults';
import { parseSusiIndex, parseSusiRows } from '../domain/susiResults';

const base = () => `${import.meta.env.BASE_URL}data/susi-results/`;
export async function loadSusiIndex(fetcher: typeof fetch = fetch) {
  const response = await fetcher(`${base()}index.json`);
  if (!response.ok) throw new Error('수시 입결 목록을 불러오지 못했어요. 다시 시도해 주세요.');
  return parseSusiIndex(await response.json());
}
export async function loadSusiRows(entry: CollectedEntry, fetcher: typeof fetch = fetch) {
  if (!/^[a-f0-9]{64}\.json$/.test(entry.file) || entry.file !== `${entry.sha256}.json`) throw new Error('수시 자료 경로가 올바르지 않아요.');
  const response = await fetcher(`${base()}${entry.file}`);
  if (!response.ok) throw new Error('대학의 수시 자료를 불러오지 못했어요. 다시 시도해 주세요.');
  const buffer = await response.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2, '0')).join('');
  if (buffer.byteLength !== entry.bytes || digest !== entry.sha256) throw new Error('수시 자료가 목록과 일치하지 않아요. 목록을 다시 불러와 주세요.');
  return parseSusiRows(JSON.parse(new TextDecoder().decode(buffer)), entry);
}
