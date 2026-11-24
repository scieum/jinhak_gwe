import { describe, expect, it } from 'vitest';
import { sampleTracks } from './specialTracks';
import { sampleTierFields, sampleTierUnits } from './deptTier';
import { sampleReleasedUnits } from './public';
import { TRACKS, trackView, universitiesIn } from '../../domain/specialTracks';
import { groupsOf, tierData } from '../../domain/deptTier';

describe('시안 데모 샘플', () => {
  it('특수 계열: 칩 대학 수 · 메디컬 합계가 시안(02-spec 1장)과 같다', () => {
    const counts = Object.fromEntries(TRACKS.map(t => [t.id, universitiesIn(sampleTracks, t.id)]));
    expect(counts).toEqual({ 메디컬: 38, 보건: 61, 교육: 46, 과기원: 6, 체육: 33, '예체능 실기': 72, 계약학과: 16, 자유전공: 52, 특수목적대: 0 });
    const v = trackView(sampleTracks, sampleReleasedUnits, '메디컬', null, '교과', '가나다');
    expect(v.status !== 'pending' && [v.universities, v.rows.length, v.pending]).toEqual([38, 52, 4]);
  });
  it('학과별 구간: 행정·정책은 21개 중 준비 중 2개, 관심 6곳 컷은 공통 샘플 값을 쓴다', () => {
    const units = [...sampleReleasedUnits, ...sampleTierUnits];
    const g = groupsOf(sampleTierFields).find(x => x.small === '행정·정책')!;
    const d = tierData(units, sampleTierFields, g, '교과');
    expect(d.status === 'ok' && [d.candidates, d.pending, d.cells.length, d.year]).toEqual([21, 2, 19, 2026]);
    expect(d.status === 'ok' && d.cells.find(c => c.university === '경희대학교')?.cut).toBe(2.9);
  });
});
