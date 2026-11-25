// 최저로 찾기 샘플(v2 시안 minimum-search/390 · 1440, 346:131097 · 346:131123). 대학명은 실제, 기준·숫자는 모두 가상이에요.
// 내 등급은 성적 추이 샘플 10월(국 3 · 수 2 · 영 2 · 탐 3 · 한국사 없음)로 읽어요. 그 등급으로 판정하면 시안 숫자가 그대로 나와요:
// 검수 기준 152개 = 충족 48 · 근접 21 · 미충족 71 · 자료 부족 12, 한 영역 1등급 올리면 국어 +15 · 수학 +9 · 영어 +12 · 탐구 +7, 검수 전 37개.
// 시안에 그려진 8행(강원 … 한림)이 판정마다 가나다 첫 줄이 되도록 나머지 행은 그 뒤 이름으로 채웠어요.
import type { Core, Criterion, MinimumRule } from '../../domain/minimum';

const ALL: Core[] = ['국어', '수학', '영어', '탐구'];
const SOURCE = '2028 모집요강';
type Line = [university: string, unit: string, admission: string, criterion: Partial<Criterion>];
const c = (count: number, sum: number, more: Partial<Criterion> = {}): Partial<Criterion> => ({ count, sum, ...more });

// 시안에 그려진 행(1440 표 8행 · 390 충족 3행)
const DRAWN: Line[] = [
  ['강원대학교', '간호학과', '교과(일반)', c(2, 6)],
  ['경희대학교', '경영학과', '교과(지역균형)', c(2, 5)],
  ['성균관대학교', '글로벌경영학과', '교과(학교장추천)', c(3, 7)],
  ['중앙대학교', '경영학부', '교과(지역균형)', c(3, 6)],
  ['한양대학교', '컴퓨터소프트웨어학부', '교과(추천형)', c(2, 3, { required: '수학' })],
  ['연세대학교', '경영학과', '교과(추천형)', c(3, 5, { required: '국어', also: '수학' })],
  ['고려대학교', '경영학과', '교과(학교추천)', c(4, 7)],
  ['한림대학교', '간호학과', '교과', c(3, 7, { history_max: 4 })],
];
const UNITS = ['경제학과', '국어국문학과', '기계공학과', '미디어학과', '사회복지학과', '수학과', '영어영문학과', '전자공학과', '컴퓨터공학과', '행정학과', '화학과', '환경공학과'];
/** 이름 순으로 시안 행 뒤에 오는 대학에 학과를 돌려 붙여요. */
const fill = (universities: string[], n: number, criterion: (i: number) => Partial<Criterion>): Line[] =>
  Array.from({ length: n }, (_, i) => [universities[i % universities.length], UNITS[Math.floor(i / universities.length) % UNITS.length], '교과', criterion(i)]);
// 근접 21개 = 시안 2(중앙: 네 영역 모두 · 한양: 수·영) + 아래 19 → 영역별 새로 충족 국 15 · 수 9 · 영 12 · 탐 7
const NEAR: Partial<Criterion>[] = [
  ...Array(7).fill(c(2, 4, { required: '국어' })), // 국·수·영
  ...Array(3).fill(c(2, 4, { areas: ['국어', '영어'] })), // 국·영
  ...Array(3).fill(c(1, 2, { areas: ['국어'] })), // 국
  c(2, 5, { areas: ['국어', '탐구'] }), // 국·탐
  ...Array(5).fill(c(1, 2, { areas: ['탐구'] })), // 탐
];
const LINES: Line[] = [
  ...DRAWN,
  ...fill(['세종대학교', '숙명여자대학교', '숭실대학교', '아주대학교', '이화여자대학교', '인하대학교', '한국외국어대학교', '홍익대학교'], 45, i => c(2 + i % 2, 5 + i % 2 * 2)),
  ...fill(['홍익대학교', '한양대학교(ERICA)'], 19, i => NEAR[i]),
  ...fill(['이화여자대학교', '인하대학교', '중앙대학교', '한국외국어대학교', '한양대학교', '홍익대학교'], 69, i => c(3, 5 - i % 2)),
  ...fill(['한양대학교', '홍익대학교'], 11, () => c(3, 7, { history_max: 4 })),
];
const REGION: Record<string, string> = { 강원대학교: '강원', 한림대학교: '강원', 아주대학교: '경기', 인하대학교: '인천', '한양대학교(ERICA)': '경기' };
const field = (unit: string) => /간호/.test(unit) ? '의약' : /공학|컴퓨터|소프트웨어|수학|화학/.test(unit) ? '자연' : /국문|영문/.test(unit) ? '인문' : '사회';

export const sampleMinimumRules: MinimumRule[] = LINES.map(([university, unit, admission, criterion], i) => ({
  id: `sample-min-search-${i + 1}`, source: SOURCE, review_status: 'draft', sample: true, reviewed_at: '2026-11-18',
  university, unit, admission, kind: admission.replace(/\(.*\)$/, ''), field: field(unit), region: REGION[university] ?? '서울',
  criterion: { areas: ALL, required: null, history_max: null, tamgu: 'best', count: 3, sum: 7, ...criterion },
}));
/** 검수 전이라 판정하지 않은 전형 수(시안 37개). */
export const SAMPLE_MINIMUM_PENDING = 37;
