/** Exploratory questionnaire v0.1. Author-created, not a validated psychological instrument. */
export const STYLE_PROFILES = [
  { id: 'record', name: '꾸준히 쌓는 기록가', route: '학생부교과', short: '매일의 힘', description: '수업과 평가를 꾸준히 챙기는 준비 방식에 관심이 있어요.', check: '대학별 반영 교과·학년·성취도 처리와 수능최저, 지원 자격을 확인해 보세요.' },
  { id: 'explore', name: '깊이 파는 탐구가', route: '학생부종합', short: '질문의 힘', description: '궁금한 주제를 탐구하고 배운 과정을 설명하는 방식을 선호해요.', check: '실제 학생부에 남은 탐구 과정과 과목 이수, 대학별 서류·면접 평가 요소를 함께 확인해 보세요.' },
  { id: 'reason', name: '근거를 잇는 논증가', route: '논술', short: '논리의 힘', description: '자료를 해석하고 근거를 연결해 답을 구성하는 활동에 관심이 있어요.', check: '대학별 인문·수리 등 논술 유형과 기출, 제한시간, 수능최저를 확인해 보세요.' },
  { id: 'practice', name: '반복하며 만드는 실천가', route: '실기·실적', short: '표현의 힘', description: '직접 만들거나 수행하고 반복해서 다듬는 준비 방식을 선호해요.', check: '희망 전공의 실기 과제·실적 인정 범위·지원 자격과 실제 준비 경험을 먼저 확인해 보세요.' },
  { id: 'exam', name: '전략을 세우는 도전가', route: '수능 중심 전형', short: '집중의 힘', description: '시험의 시간 배분과 오답을 분석하며 준비하는 방식에 관심이 있어요.', check: '모의고사 성적 추이와 모집시기, 대학별 수능 반영 방식·영역별 조건을 확인해 보세요.' },
] as const;
export type StyleId = typeof STYLE_PROFILES[number]['id'];
export interface StyleQuestion { id: string; axis: StyleId; text: string }
export const STYLE_QUESTIONS: StyleQuestion[] = [
  { id: 'q01', axis: 'record', text: '큰 시험 하나보다 수업과 과제를 꾸준히 챙기는 준비 방식이 편해요.' },
  { id: 'q02', axis: 'explore', text: '수업에서 생긴 궁금증을 자료를 찾아 더 알아보는 편이에요.' },
  { id: 'q03', axis: 'reason', text: '글이나 수학 풀이에서 결론보다 근거가 어떻게 이어지는지 살펴보는 게 좋아요.' },
  { id: 'q04', axis: 'practice', text: '관심 있는 예체능·제작·수행 활동을 직접 해 보며 배우는 게 좋아요.' },
  { id: 'q05', axis: 'exam', text: '정해진 시간 안에 문제를 푸는 연습으로 나의 변화를 확인하는 게 좋아요.' },
  { id: 'q06', axis: 'record', text: '과목별 평가 일정과 해야 할 일을 나누어 관리하는 편이에요.' },
  { id: 'q07', axis: 'explore', text: '활동이 끝나면 무엇을 배웠고 다음에는 무엇을 바꿀지 돌아보는 편이에요.' },
  { id: 'q08', axis: 'reason', text: '같은 자료를 보고도 다른 해석이 가능한 이유를 비교하는 게 흥미로워요.' },
  { id: 'q09', axis: 'practice', text: '작품이나 동작을 반복해서 연습하고 피드백을 반영하는 과정이 잘 맞아요.' },
  { id: 'q10', axis: 'exam', text: '오답의 원인과 시간 배분을 분석해서 다음 시험 전략을 바꾸는 편이에요.' },
  { id: 'q11', axis: 'record', text: '여러 과목을 일정한 속도로 공부하는 계획을 유지하고 싶어요.' },
  { id: 'q12', axis: 'explore', text: '관심 주제를 고른 이유와 탐구한 과정을 내 말로 설명하고 싶어요.' },
  { id: 'q13', axis: 'reason', text: '제한된 시간에 글이나 풀이로 생각을 정리하는 연습을 해 보고 싶어요.' },
  { id: 'q14', axis: 'practice', text: '희망 전공과 관련된 실기나 수행을 정기적으로 연습하고 싶어요.' },
  { id: 'q15', axis: 'exam', text: '시험 결과를 보고 영역별 공부 비중을 조절하는 준비 방식이 잘 맞아요.' },
];
export const STYLE_OPTIONS = [
  { value: 0, label: '거의 그렇지 않아요' },
  { value: 1, label: '가끔 그래요' },
  { value: 2, label: '자주 그래요' },
  { value: 3, label: '매우 그래요' },
  { value: null, label: '아직 경험이 없거나 잘 모르겠어요' },
] as const;
export type StyleAnswer = 0 | 1 | 2 | 3 | null;
export type StyleAnswers = Record<string, StyleAnswer>;
export function summarizeStyle(answers: StyleAnswers) {
  if (STYLE_QUESTIONS.some(q => !Object.hasOwn(answers, q.id) ||
      ![null, 0, 1, 2, 3].includes(answers[q.id]))) {
    throw new Error('모든 문항에 답하거나 잘 모르겠어요를 선택해 주세요.');
  }
  const axes = STYLE_PROFILES.map(profile => {
    const questions = STYLE_QUESTIONS.filter(q => q.axis === profile.id);
    const known = questions.filter(q => answers[q.id] !== null);
    const sum = known.reduce((total, q) => total + (answers[q.id] ?? 0), 0);
    return { ...profile, answered: known.length, mean: known.length >= 2 ? sum / known.length : null,
      evidence: known.filter(q => (answers[q.id] ?? 0) >= 2).map(q => q.text) };
  });
  // Unknown is never scored as a low preference. No ranking until every axis is comparable.
  const insufficient = axes.some(a => a.mean === null);
  const highest = Math.max(...axes.map(a => a.mean ?? 0));
  const candidates = insufficient || highest < 2 ? [] : axes.filter(a => a.mean !== null && a.mean >= 2 && highest - a.mean <= 0.5);
  const kind: 'insufficient' | 'open' | 'mixed' | 'focused' = insufficient ? 'insufficient' : candidates.length === 0 ? 'open' : candidates.length > 1 ? 'mixed' : 'focused';
  return { axes, candidates, kind, title: kind === 'insufficient' ? '경험을 더 알아가는 탐색가' : kind === 'open' ? '가능성을 열어 둔 탐색가' : kind === 'mixed' ? '여러 길을 살피는 탐색가' : candidates[0].name };
}
