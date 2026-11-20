// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { parseCollectedIndex, parseCollectedRows, type CollectedEntry } from '../src/domain/collectedResults';
import { loadCollectedIndex, loadCollectedRows } from '../src/data/collectedResults';
import { groupUnits, parseRelease, RESULT_COLUMNS, rowIssues } from '../src/domain/resultReview';
import { parseCsv } from '../src/io/grades';

const root = fileURLToPath(new URL('../public/data/collected-results/', import.meta.url));
const readIndex = () => parseCollectedIndex(JSON.parse(readFileSync(root + 'index.json', 'utf8')));
const readPayload = (entry: CollectedEntry) => JSON.parse(readFileSync(root + entry.file, 'utf8'));

describe('수집 입결 패키지', () => {
  it('통합 CSV의 모든 열과 행을 손실 없이 보존하고 공개 검수 상태를 만들지 않는다', () => {
    const index = readIndex();
    const source = new URL('../../work/_data/admission-results/_all.csv', import.meta.url);
    const compressed = new URL(source.href + '.gz');
    const raw = existsSync(compressed) ? gunzipSync(readFileSync(compressed)) : readFileSync(source);
    expect(createHash('sha256').update(raw).digest('hex')).toBe(index.source_sha256);
    const [columns, ...rows] = parseCsv(raw.toString('utf8'));
    expect(columns).toEqual([...RESULT_COLUMNS]);
    const expected = new Map<string, ReturnType<typeof createHash>>();
    for (const row of rows) {
      if (!expected.has(row[0])) expected.set(row[0], createHash('sha256'));
      expected.get(row[0])!.update(JSON.stringify(row) + '\n');
    }
    expect(index.universities).toHaveLength(expected.size);
    expect(index.rows).toBe(rows.length);
    let total = 0, sources = 0, errors = 0, warnings = 0, errorRows = 0;
    for (const entry of index.universities) {
      const bytes = readFileSync(root + entry.file);
      expect(bytes.byteLength).toBe(entry.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      const payload = JSON.parse(bytes.toString('utf8')), decoded = parseCollectedRows(payload, entry);
      const digest = createHash('sha256');
      for (const row of decoded) {
        digest.update(JSON.stringify(RESULT_COLUMNS.map(c => row[c])) + '\n');
        const issues = rowIssues(row);
        errors += issues.errors.length; warnings += issues.warnings.length;
        if (issues.errors.length) errorRows++;
      }
      expect(digest.digest('hex')).toBe(expected.get(entry.university)!.digest('hex'));
      const grouped = groupUnits(decoded);
      expect(grouped.length).toBe(entry.sources);
      sources += grouped.length; total += decoded.length;
      expect(payload.status).toBe('draft');
      expect(payload.approvals).toBeUndefined();
      expect(parseRelease(payload)).toEqual([]);
    }
    expect(total).toBe(index.rows); expect(sources).toBe(index.sources);
    console.info(JSON.stringify({ collectedRows: total, universities: expected.size, sources, errors, errorRows, warnings }));
  }, 30000);

  it('경로 변경·중복 대학·잘못된 집계·공개 상태 위장을 거부한다', () => {
    const index = readIndex();
    for (const mutate of [
      (v: typeof index) => { v.universities[0].file = '../released-results.json'; },
      (v: typeof index) => { v.universities[1].university = v.universities[0].university; },
      (v: typeof index) => { v.rows++; },
      (v: typeof index) => { v.universities[0].rounds = { 수시: 1 }; },
    ]) {
      const copy = structuredClone(index); mutate(copy);
      expect(() => parseCollectedIndex(copy)).toThrow('형식');
    }
    expect(() => parseCollectedIndex({ ...index, status: 'verified' })).toThrow('형식');
  });

  it('잘못된 사전 참조·열·다른 대학·누락 행을 거부한다', () => {
    const entry = readIndex().universities[0];
    const payload = readPayload(entry);
    for (const mutate of [
      (v: typeof payload) => { v.rows[0][0] = -1; },
      (v: typeof payload) => { v.rows[0][0] = v.strings.length; },
      (v: typeof payload) => { v.columns.pop(); },
      (v: typeof payload) => { v.university = '다른 대학'; },
      (v: typeof payload) => { v.rows.pop(); },
    ]) {
      const copy = structuredClone(payload); mutate(copy);
      expect(() => parseCollectedRows(copy, entry)).toThrow('형식');
    }
  });

  it('선택한 대학 파일만 요청하고 체크섬 오류·서버 실패는 재시도할 수 있다', async () => {
    const entry = readIndex().universities[0], bytes = readFileSync(root + entry.file);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(bytes));
    const rows = await loadCollectedRows(entry, fetcher);
    expect(rows).toHaveLength(entry.rows);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(entry.file));
    fetcher.mockResolvedValueOnce(new Response('{}'));
    await expect(loadCollectedRows(entry, fetcher)).rejects.toThrow('일치하지');
    fetcher.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(loadCollectedRows(entry, fetcher)).rejects.toThrow('불러오지');
    fetcher.mockResolvedValueOnce(new Response(bytes));
    await expect(loadCollectedRows(entry, fetcher)).resolves.toHaveLength(entry.rows);
    await expect(loadCollectedRows({ ...entry, file: 'https://example.invalid/' }, fetcher)).rejects.toThrow('경로');
  });

  it('목록 읽기 실패를 빈 자료로 숨기지 않는다', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 404 }));
    await expect(loadCollectedIndex(fetcher)).rejects.toThrow('목록');
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify(readIndex())));
    await expect(loadCollectedIndex(fetcher)).resolves.toHaveProperty('status', 'draft');
  });
});
