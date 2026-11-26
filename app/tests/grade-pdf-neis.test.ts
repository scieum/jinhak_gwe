import { describe, expect, it } from 'vitest';
import { parseNeisRecordText } from '../src/io/grades';

// 학교생활기록부Ⅱ '7. 교과학습발달상황' 배치를 흉내 낸 가짜 자료(실제 학생 정보 없음).
// 학기 칸은 병합 칸이라 각 학기 첫 과목 앞에 한 번만 나오고, 교과 · 과목 이름이 두 줄로 꺾이기도 해요.
const SAMPLE = `7. 교과학습발달상황
[1학년]
학기 교과 과목 학점 원점수/ 과목평균 성취도 성취도별 분포비율 석차 등급 수강 자수 비고
1
국어 공통국어1 4 90/60.0 A
A(20.0) B(20.0) C(20.0)
D(20.0) E(20.0) 1 200
사회(역사/
도덕포함) 한국사1 3 80/60.5 B
A(10.0) B(20.0) C(30.0)
D(20.0) E(20.0) 3 200
2
수학 공통수학2 4 70/50.0 C
A(10.0) B(10.0) C(30.0)
D(30.0) E(20.0) 4 198
이수학점 합계 11
과 목 세부능력 및 특기사항
공통국어1: 과학 탐구 보고서를 쓰고 국어 시간에 발표함. 4 90/60 같은 숫자를 글에서 써도 과목으로 읽지 않아요.
<체육·예술 / 과학탐구실험>
학기 교과 과목 학점 성취도 비고
1
과학 과학탐구실험1 1 A
체육 체육1 2 B
2
예술 음악 3 A
이수학점 합계 6
<교양교과>
학기 교과 과목 학점 이수여부 비고
[2학년]
학기 교과 과목 학점 원점수/ 과목평균 성취도 성취도별 분포비율 석차 등급 수강 자수 비고
1
사회(역사/
도덕포함)
현대사회와
윤리 4 95/59.0 A
A(23.6) B(19.4) C(16.7)
D(23.6) E(16.7) 1 72
영어 영어Ⅰ 4 79/53.8 A
A(21.4) B(14.4) C(15.9)
D(12.4) E(35.8) 2 201
이수학점 합계 8
<체육·예술 / 과학탐구실험>
1 체육 스포츠 생활1 2 A
<교양교과>
학기 교과 과목 학점 이수여부 비고
1 교양 인체 구조와 기능 2 P 타기관, 공동교육과정
이수학점 합계 2`;

describe('학교생활기록부Ⅱ PDF 성적 읽기', () => {
  const { grades } = parseNeisRecordText(SAMPLE);
  const at = (name: string) => grades.find(g => g.name === name)!;

  it('학년 · 병합된 학기 칸으로 학기를 정하고 교과 이름이 두 줄로 꺾여도 읽어요', () => {
    expect(grades.map(g => [g.semester, g.name])).toEqual([
      ['1-1', '공통국어1'], ['1-1', '한국사1'], ['1-2', '공통수학2'],
      ['1-1', '과학탐구실험1'], ['1-1', '체육1'], ['1-2', '음악'],
      ['2-1', '현대사회와 윤리'], ['2-1', '영어Ⅰ'], ['2-1', '스포츠 생활1'], ['2-1', '인체 구조와 기능'],
    ]);
  });

  it('원점수 · 과목평균 · 성취도 · 분포비율 · 석차등급 · 수강자수를 그대로 옮겨요', () => {
    expect(at('한국사1')).toMatchObject({ credits: 3, raw_score: 80, subject_mean: 60.5, achievement: 'B', rank_grade: 3, enrolled_count: 200, achievement_distribution: [10, 20, 30, 20, 20] });
    expect(at('현대사회와 윤리')).toMatchObject({ credits: 4, raw_score: 95, subject_mean: 59, achievement: 'A', rank_grade: 1, enrolled_count: 72 });
  });

  it('체육 · 예술 · 과탐실험은 성취도만, 교양은 이수 여부로 읽어요', () => {
    expect(at('체육1')).toMatchObject({ achievement: 'B', rank_grade: null });
    expect(at('체육1').raw_score).toBeUndefined();
    expect(at('인체 구조와 기능')).toMatchObject({ type: '교양', achievement: 'P' });
  });
});
