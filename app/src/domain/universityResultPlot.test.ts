import { describe, expect, it } from 'vitest';
import { universityPlot, yearUnitKey } from './universityResultPlot';
import type { ResultRow } from './resultReview';

const row = (result_year: string, program: string, recruit_unit: string, cut_70: string): ResultRow => ({
  university: '가대', result_year, round: '수시', admission_type: '종합', program, recruit_unit,
  quota: '', applicants: '', competition_rate: '', fill_count: '', fill_rate: '', cut_50: '', cut_70, cut_other: '',
  metric: '교과등급', basis: '', grade_system: '9', source_url: '', source_page: '', note: '',
});

describe('universityPlot 3개년 묶기', () => {
  it('해마다 띄어쓰기·괄호·꼬리가 다른 전형·학과를 한 학과 3개년으로 묶어요(최근 이름)', () => {
    const m = universityPlot([
      row('2024', '학생부종합 ( 농어촌학생전형 )', '국어국문학과', '3.1'),
      row('2025', '학생부종합(농어촌학생전형)', '국어국문학과', '3.0'),
      row('2026', '학생부종합(농어촌학생전형)', '국어국문학부(국어국문학)', '2.9'),
    ], '전체', '');
    expect(m.programs).toEqual(['학생부종합(농어촌학생전형)']);
    expect(m.departments.map(d => [d.name, d.points.length])).toEqual([['국어국문학부(국어국문학)', 3]]);
  });
  it('(인문)·(자연)은 다른 모집단위, 같은 해에 이름이 겹치면 합치지 않아요', () => {
    expect(yearUnitKey('산업보안학과(인문)')).not.toBe(yearUnitKey('산업보안학과(자연)'));
    const m = universityPlot([row('2026', '교과', '전자공학과', '2.0'), row('2026', '교과', '전자공학부', '2.5'), row('2025', '교과', '전자공학과', '2.1')], '전체', '');
    expect(m.departments.map(d => d.name).sort()).toEqual(['전자공학과', '전자공학부']);
  });
});
