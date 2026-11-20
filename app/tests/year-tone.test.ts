import { describe, expect, it } from 'vitest';
import { noPlotReason, universityPlot, yearTone } from '../src/domain/universityResultPlot';
import type { ResultRow } from '../src/domain/resultReview';

const rows = (years: string[]) => years.map(result_year => ({ result_year }) as unknown as ResultRow);

describe('yearTone (design.md Year Ramp)', () => {
  it('자료가 있는 가장 최근 연도가 진하고, 그 뒤 연도는 자료 없음', () => {
    const r = rows(['2024', '2025']);
    expect([2024, 2025, 2026].map(y => yearTone(r, y))).toEqual(['prev', 'latest', 'empty']);
  });
  it('3년 모두 있으면 latest·prev·old', () => {
    expect([2024, 2025, 2026].map(y => yearTone(rows(['2024', '2025', '2026']), y))).toEqual(['old', 'prev', 'latest']);
  });
  it('자료가 없으면 모두 empty', () => {
    expect(yearTone([], 2026)).toBe('empty');
  });
});

describe('universityPlot 컷 선택', () => {
  const r = (change: Partial<ResultRow>) => ({ university: '강원대(춘천)', round: '수시', result_year: '2026', admission_type: '교과', program: '지역인재', recruit_unit: '국어교육과', grade_system: '9', metric: '교과등급', cut_50: '', cut_70: '', ...change }) as unknown as ResultRow;
  it('70% 컷이 없고 50% 컷만 있으면 50% 컷으로 그린다', () => {
    const m = universityPlot([r({ cut_50: '3.1' })], '교과', '지역인재');
    expect(m.cutLabel).toBe('50% 컷');
    expect(m.departments[0].points).toHaveLength(1);
  });
  it('70% 컷이 하나라도 있으면 70% 컷만 쓰고 50% 컷과 섞지 않는다', () => {
    const m = universityPlot([r({ cut_70: '2.8' }), r({ recruit_unit: '수학교육과', cut_50: '3.0' })], '교과', '지역인재');
    expect(m.cutLabel).toBe('70% 컷');
    expect(m.departments.find(d => d.name === '수학교육과')!.points).toHaveLength(0);
  });
});

describe('noPlotReason', () => {
  const r = (change: Partial<ResultRow>) => ({ metric: '교과등급', grade_system: '9', cut_50: '', cut_70: '', cut_other: '', basis: '', ...change }) as unknown as ResultRow;
  it('다른 통계만 있으면 그 기준 이름을 알려 준다', () => {
    expect(noPlotReason([r({ cut_other: '3.2', basis: '최종등록자; 원문 기준' })])).toBe("이 전형은 70%·50% 컷 대신 '최종등록자' 기준 값만 발표했어요.");
  });
  it('교과등급이 아니면 지표를 알려 준다', () => {
    expect(noPlotReason([r({ metric: '환산점수' })])).toContain("'환산점수'");
  });
});

it('전형을 고르지 않으면 컷이 있는 첫 전형을 연다', () => {
  const r = (program: string, change: Partial<ResultRow>) => ({ round: '수시', result_year: '2026', admission_type: '교과', program, recruit_unit: '국어', grade_system: '9', metric: '교과등급', cut_50: '', cut_70: '', cut_other: '', ...change }) as unknown as ResultRow;
  expect(universityPlot([r('가기회균형', { cut_other: '3' }), r('나지역인재', { cut_50: '3.1' })], '교과', '').selected).toBe('나지역인재');
});
