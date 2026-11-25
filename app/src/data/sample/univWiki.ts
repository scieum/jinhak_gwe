// 샘플 모드에서만 대학 위키(univ-detail-wiki)가 보여 주는 데모: 시안 univ-detail-wiki/1440(365:38171) · /390(365:38085) 그대로.
// 대학명은 실제, 요약·숫자는 모두 가상이에요(검수 기록 예시 · 실제 시행계획 아님). 실제 공개 파일은 건드리지 않아요.
const SOURCE = 'https://admission.example.ac.kr/2028/plan.pdf';
const page = (p: string) => `출처: 2028학년도 경희대학교 대입전형 시행계획 ${p}쪽`;

export interface WikiDemoSource { label: string; url: string }
export interface WikiDemo {
  reviewed: string;
  notes: { text: string; source: WikiDemoSource }[];
  method: { rows: { program: string; subjects: string; how: string; years: string; attendance: string; source: WikiDemoSource }[]; source: WikiDemoSource };
  minimum: { rows: { program: string; rule: string; history: string }[]; source: WikiDemoSource };
  elements: { rows: { program: string; stage: string; ratio: string }[]; source: WikiDemoSource };
}
const src = (p: string): WikiDemoSource => ({ label: page(p), url: SOURCE });

export const sampleWikiDemo: WikiDemo = {
  reviewed: '2026-11-16',
  notes: [
    { text: '학생부교과 지역균형전형은 석차등급이 있는 과목은 등급으로, 성취도만 있는 과목은 성취도로 반영해요', source: src('9~10') },
    { text: '학생부종합 네오르네상스전형은 1단계 서류 100%로 3배수를 뽑고, 2단계에서 면접 30%를 더해요', source: src('14') },
    { text: '논술우수자전형은 2028학년도에도 수능 최저 기준이 있어요', source: src('21') },
  ],
  method: {
    rows: [
      { program: '학생부교과 지역균형전형', subjects: '국어 · 수학 · 영어 · 사회(역사·도덕 포함) · 과학의 모든 과목', how: '석차등급 과목 = 등급 점수, 성취도만 있는 과목 = 성취도 점수', years: '구분 없음', attendance: '반영하지 않음', source: src('9~10') },
      { program: '학생부종합 네오르네상스전형', subjects: '학생부 전체', how: '서류 정성평가(교과 점수 계산 없음)', years: '해당 없음', attendance: '서류에 포함', source: src('14') },
      { program: '논술우수자전형', subjects: '반영하지 않음', how: '논술 100%', years: '해당 없음', attendance: '반영하지 않음', source: src('18') },
    ],
    source: src('9~10 · 14 · 18'),
  },
  minimum: {
    rows: [
      { program: '학생부교과 지역균형전형', rule: '국·수·영·탐(1과목) 중 2개 영역 등급 합 5 이내', history: '5등급 이내' },
      { program: '학생부종합 네오르네상스전형', rule: '없음', history: '없음' },
      { program: '논술우수자전형(인문)', rule: '국·수·영·탐(1과목) 중 2개 영역 등급 합 5 이내', history: '5등급 이내' },
    ],
    source: src('21'),
  },
  elements: {
    rows: [
      { program: '학생부교과 지역균형전형', stage: '일괄', ratio: '학생부 교과 100%' },
      { program: '학생부종합 네오르네상스전형', stage: '2단계', ratio: '1단계 서류 100%(3배수) → 2단계 1단계 성적 70% + 면접 30%' },
      { program: '논술우수자전형', stage: '일괄', ratio: '논술 100%' },
    ],
    source: src('12~15'),
  },
};

/** 입결이 비슷한 대학 데모(시안): 경희대학교 행정학과 교과 70% 컷 3.1, 2026학년도 · 9등급. */
export const sampleSimilarDemo = {
  base: { unit: '행정학과', type: '교과' as const, cut: 3.1, year: 2026 },
  rows: [
    { university: '건국대학교', unit: '행정학과', cut: 3.2, diff: 0.1, relation: '같은 계열' as const },
    { university: '동국대학교', unit: '행정학과', cut: 2.8, diff: -0.3, relation: '같은 계열' as const },
    { university: '성균관대학교', unit: '행정학과', cut: 2.7, diff: -0.4, relation: '같은 계열' as const },
  ],
};
