// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseSusiIndex, parseSusiRows, susiIssues } from '../src/domain/susiResults';
import { loadSusiRows } from '../src/data/susiResults';
import { gradeCut } from '../src/domain/universityResultPlot';
const root = resolve('public/data/susi-results');
const indexValue = JSON.parse(readFileSync(resolve(root, 'index.json'), 'utf8'));

describe('실제 수시 앱 데이터', () => {
  it('227개 묶음의 전체 행과 확인 항목을 검증하고 대조 대상은 좌표에 찍지 않는다', () => {
    const index = parseSusiIndex(indexValue);
    let count = 0, flagged = 0;
    for (const entry of index.universities) {
      const bytes = readFileSync(resolve(root, entry.file));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      const rows = parseSusiRows(JSON.parse(bytes.toString('utf8')), entry);
      count += rows.length;
      for (const row of rows) if (susiIssues(row).length) {
        flagged++;
        expect(gradeCut(row)).toBeNull(); expect(gradeCut(row, 'cut_50')).toBeNull();
        expect(row.source_page).toBeTruthy();
      }
    }
    expect(count).toBe(110116); // 2026-11-27 한국교원대 73행 + 컷 없던 30개 대학 어디가 50·70% 컷 8,637행
    expect(flagged).toBe(3268); // 2026-11-27 어디가 보충 뒤 원문 확인 행
  });
  it('잘못된 시기·확인 항목·해시·경로를 받아들이지 않는다', async () => {
    const index = parseSusiIndex(indexValue), entry = index.universities[0];
    const raw = readFileSync(resolve(root, entry.file));
    const payload = JSON.parse(raw.toString('utf8'));
    expect(() => parseSusiIndex({ ...indexValue, dataset: 'all-results' })).toThrow();
    expect(() => parseSusiRows({ ...payload, review_flags: [] }, entry)).toThrow();
    const broken = structuredClone(payload); broken.review_flags[0] = [9999];
    expect(() => parseSusiRows(broken, entry)).toThrow();
    const mixed = structuredClone(payload); mixed.strings[mixed.rows[0][2]] = '정시';
    expect(() => parseSusiRows(mixed, entry)).toThrow();
    const fetcher = (async () => new Response(raw.toString('utf8'))) as typeof fetch;
    expect(await loadSusiRows(entry, fetcher)).toHaveLength(entry.rows);
    await expect(loadSusiRows({ ...entry, bytes: entry.bytes+1 }, fetcher)).rejects.toThrow('일치');
    await expect(loadSusiRows({ ...entry, file: '../index.json' }, fetcher)).rejects.toThrow('경로');
  });
});
