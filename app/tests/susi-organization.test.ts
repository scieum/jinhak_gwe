// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCollectedIndex, parseCollectedRows } from '../src/domain/collectedResults';
import { parseRelease } from '../src/domain/resultReview';

describe('정리한 실제 수시 입결 가져오기', () => {
  it('모든 수시 묶음을 기존 앱 파서로 읽고 원문 해시·캠퍼스·학년도·초안 상태를 보존한다', () => {
    const root = resolve('../work/_data/admission-results/susi-organized');
    const report = JSON.parse(readFileSync(resolve(root, 'summary.json'), 'utf8'));
    const index = parseCollectedIndex(JSON.parse(readFileSync(resolve(root, 'app-import/index.json'), 'utf8')));
    expect(index.source_sha256).toBe(createHash('sha256').update(readFileSync(resolve(root, 'susi.csv'))).digest('hex'));
    expect(report.source_sha256).toBe(createHash('sha256').update(readFileSync(resolve(root, '../_all.csv'))).digest('hex'));
    expect(index.rows).toBe(report.susi_rows);
    expect(index.universities.length).toBe(report.university_labels);
    let rows = 0;
    const years: Record<string, number> = {};
    for (const entry of index.universities) {
      const bytes = readFileSync(resolve(root, 'app-import', entry.file));
      expect(bytes.byteLength).toBe(entry.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      const payload = JSON.parse(bytes.toString('utf8'));
      const decoded = parseCollectedRows(payload, entry);
      expect(decoded.every(row => row.round === '수시' && row.source_url && row.source_page)).toBe(true);
      expect(entry.rounds).toEqual({ 수시: entry.rows });
      expect(payload.status).toBe('draft');
      expect(payload.approvals).toBeUndefined();
      expect(parseRelease(payload)).toEqual([]);
      rows += decoded.length;
      for (const row of decoded) years[row.result_year] = (years[row.result_year] ?? 0) + 1;
    }
    expect(rows).toBe(report.susi_rows);
    expect(years).toEqual(report.years);
    expect(report.calculation_enabled).toBe(false);
    expect(report.issue_counts.unmapped_university_label ?? 0).toBe(0);
  }, 30000);
});
