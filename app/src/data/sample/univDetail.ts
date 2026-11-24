// 샘플 모드에서만 대학 상세(univ-detail)가 보여 주는 데모: 시안 경희대학교 2028 전형 7개 · 전년 대비 바뀐 점 4건.
// 값: Figma univ-detail/1440(346:144159) · /390(346:143371) 그대로. 대학명은 실제, 숫자는 모두 가상이에요. public/data의 실제 공개 파일은 건드리지 않아요.
import { programPath } from '../../domain/interests';
import type { UdProgram, UdView } from '../../domain/univDetail';

const U = '경희대학교', SOURCE = 'https://admission.example.ac.kr/2028/plan';
// 전형명, 유형, 세부 유형, 모집인원, 수능최저, 면접, 전형요소
type Line = [name: string, type: UdProgram['type'], sub: string, quota: number, minimum: UdProgram['minimum'], interview: UdProgram['interview'], method: string];
const LINES: Line[] = [
  ['학생부교과 지역균형전형', '교과', '지역균형', 98, '있음', '없음', '교과 100%'],
  ['학생부종합 네오르네상스전형', '종합', '일반', 320, '없음', '있음', '1단계 서류 100% · 2단계 서류 70% + 면접 30%'],
  ['학생부종합 고른기회전형', '종합', '고른기회', 60, '없음', '있음', '1단계 서류 100% · 2단계 서류 70% + 면접 30%'],
  ['논술우수자전형', '논술', '일반', 150, '있음', '없음', '논술 90% + 학생부 10%'],
  ['실기우수자전형', '기타', '실기', 45, '없음', '없음', '실기 70% + 학생부 30%'],
  ['체육특기자전형', '기타', '특기자', 20, '없음', '있음', '실적 60% + 면접 40%'],
  ['수능 가군 일반전형', '정시', '일반', 410, '해당 없음', '없음', '수능 100%'],
];
// 지역균형은 샘플 입결(public.ts)의 전형명으로 이어서 전형 상세가 비지 않게 해요
const DETAIL: Record<string, string> = { '학생부교과 지역균형전형': '학생부교과(지역균형)' };

export const sampleUnivDetail: UdView = {
  university: U, place: '서울 · 사립 · 서울캠퍼스', status: '시행계획 기준', checked: '2026-11-18', homepage: 'https://www.khu.ac.kr',
  headline: { pc: '교과 지역균형 모집인원이 22명 줄고, 수능최저가 2개 영역 합 6으로 바뀌었어요', mobile: '교과 지역균형 모집인원이 22명 줄었어요' },
  source: { url: SOURCE, label: '출처: 2028학년도 대입전형 시행계획 12~15쪽', short: '2028학년도 시행계획 12~15쪽' },
  changes: [
    { program: '학생부교과 지역균형전형', item: '모집인원', prev: '120명', next: '98명', delta: -22 },
    { program: '학생부교과 지역균형전형', item: '수능최저', prev: '2개 영역 합 7', next: '2개 영역 합 6' },
    { program: '학생부종합 네오르네상스전형', item: '면접', prev: '없음', next: '2단계 면접 30%' },
    { program: '논술우수자전형', item: '전형요소 비율', prev: '논술 100%', next: '논술 90% + 학생부 10%' },
  ],
  programs: LINES.map(([name, type, sub, quota, minimum, interview, method]) => ({
    name, type, sub, quota, minimum, interview, round: type === '정시' ? '정시' : '수시', path: programPath(U, DETAIL[name] ?? name), source: SOURCE,
    facts: [['모집인원', `${quota}명`], ['전형요소', method], ['수능최저', minimum === '있음' ? '2개 영역 합 6 이내' : minimum], ['면접', interview],
      ...(name === '학생부교과 지역균형전형' ? [['학교장 추천', '학교당 10명'] as [string, string]] : [])],
  })),
};
