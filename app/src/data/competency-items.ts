/**
 * 대교협 공통 평가요소(2024 개편) 3대 역량 × 평가항목 10개 (work/saenggibu-ai/02-spec.md v2).
 * keywords: 기기 안 "낱말로 나눠 보기"용 참고 낱말. 평가 기준이 아니라 문장을 나누는 단서예요.
 */
export interface CompetencyItem { name: string; long: string; keywords: readonly string[] }
export interface Competency { key: 'academic' | 'career' | 'community'; name: string; items: readonly CompetencyItem[] }
export const COMPETENCIES: readonly Competency[] = [
  { key: 'academic', name: '학업역량', items: [
    { name: '학업성취도', long: '학업성취도', keywords: ['성취', '이해', '설명', '개념', '정확', '우수', '성적', '해결'] },
    { name: '학업태도', long: '학업태도', keywords: ['수업', '질문', '자기주도', '예습', '복습', '집중', '성실히 참여', '먼저 정리', '꾸준'] },
    { name: '탐구력', long: '탐구력', keywords: ['탐구', '실험', '분석', '조사', '원인', '가설', '검증', '측정', '보고서', '오차'] },
  ] },
  { key: 'career', name: '진로역량', items: [
    { name: '교과 이수 노력', long: '전공(계열) 관련 교과 이수 노력', keywords: ['이수', '선택 과목', '과목을 선택', '이어 듣', '수강', '심화 과목'] },
    { name: '교과 성취도', long: '전공(계열) 관련 교과 성취도', keywords: ['관련 교과', '전공 관련', '계열 관련', '관련 과목'] },
    { name: '진로 탐색', long: '진로 탐색 활동과 경험', keywords: ['진로', '진학', '희망', '학과', '전공', '직업', '계열'] },
  ] },
  { key: 'community', name: '공동체역량', items: [
    { name: '협업과 소통', long: '협업과 소통 능력', keywords: ['모둠', '협력', '협업', '토의', '토론', '소통', '함께', '친구들과'] },
    { name: '나눔과 배려', long: '나눔과 배려', keywords: ['배려', '나눔', '봉사', '도움', '돕', '멘토'] },
    { name: '성실·규칙준수', long: '성실성과 공동체의식(규칙준수)', keywords: ['규칙', '성실', '책임', '당번', '빠지지 않', '지킴', '약속'] },
    { name: '리더십', long: '리더십', keywords: ['리더', '반장', '부장', '회장', '이끌', '주도', '대표'] },
  ] },
];
export type CompetencyKey = Competency['key'];
export const ITEM_NAMES: readonly string[] = COMPETENCIES.flatMap(c => c.items.map(i => i.name));
export const competencyOf = (item: string) => COMPETENCIES.find(c => c.items.some(i => i.name === item))!;
