import { describe, expect, it } from 'vitest';
import { mergeResultRows, rowMean } from './mergeResultRows';
import type { ResultRow } from './resultReview';

const row = (extra: Partial<ResultRow>): ResultRow => ({
  university: '한양대', result_year: '2025', round: '수시', admission_type: '교과', program: '학생부교과(추천형)', recruit_unit: '융합전자공학부',
  quota: '', applicants: '', competition_rate: '', fill_count: '', fill_rate: '', cut_50: '', cut_70: '', cut_other: '',
  metric: '교과등급', basis: '', grade_system: '9', source_url: '', source_page: '', note: '', ...extra,
});

describe('mergeResultRows', () => {
  it('같은 전형·학과·연도는 한 줄로 합치고 컷 있는 출처를 앞에 둬요', () => {
    const guide = row({ competition_rate: '15.9', fill_count: '53', cut_other: '최종등록자 내신등급 평균 1.46', source_url: 'https://go.hanyang.ac.kr' });
    const adiga = row({ quota: '13', competition_rate: '15.8', cut_50: '1.40', cut_70: '1.49', cut_other: '충원순위 53; 대학별환산 최종등록자 환산점수 50% cut 881', source_url: 'https://www.adiga.kr' });
    const [merged, ...rest] = mergeResultRows([guide, adiga, row({ result_year: '2026' })]);
    expect(rest).toHaveLength(1);
    expect(merged).toMatchObject({ quota: '13', competition_rate: '15.8', fill_count: '53', cut_50: '1.40', mean: '1.46', source_url: 'https://www.adiga.kr' });
    expect(merged.sources).toEqual([adiga, guide]);
  });
  it('지표가 다르면 합치지 않아요', () => {
    expect(mergeResultRows([row({}), row({ metric: '환산점수' })])).toHaveLength(2);
  });
});

describe('rowMean', () => {
  it('점수 평균·여러 값·범위 밖 값은 비워요', () => {
    expect(rowMean(row({ cut_other: '최종등록자 총점평균 (900점) 881.2' }))).toBe('');
    expect(rowMean(row({ cut_other: '최초합격자 평균 2.1; 최초합격자 평균 2.4' }))).toBe('');
    expect(rowMean(row({ cut_other: '최초합격자 평균 2.10; 최종등록자 평균 2.35' }))).toBe('2.35');
    expect(rowMean(row({ cut_other: '평균 2.35 / 최저 3.10' }))).toBe('2.35');
  });
});
