// 교사 샘플 = work/_data/demo-dataset.md "학급"(2학년 3반 28명). 실제 학생이 아니에요.
import type { CardRecord, ClassInfo, CounselPayload, HomeroomLog, Memo, Student } from '../../domain/classroom';
import type { MockGrades, SchoolGrades } from '../../domain/scoreImport';
import type { GradeRecord, Semester } from '../../domain/student';
import type { Target } from '../../domain/minimum';
import type { ClassSchedule } from '../../domain/classCalendar';
import type { Outcome } from '../../domain/outcomes';
import { SAMPLE_PREFIX, SAMPLE_STAMP, SAMPLE_UNIVERSITIES, sampleGrades } from './student';

/** 이 학급 코드 + 만든 시각이면 샘플 학급이에요(지우기 기준). */
export const SAMPLE_CLASS: ClassInfo = { key: 'class', name: '2학년 3반', code: 'SMPL', created_at: SAMPLE_STAMP };
const ALIASES = ['새벽', '들꽃', '노을', '단비', '햇살', '바람', '하늘', '이슬', '소나무', '별빛', '구름', '가람', '달빛', '시내', '바다', '봄비', '윤슬', '여울', '너울', '버들', '모래', '은하', '안개', '파도', '꽃잎', '서리', '샘물', '솔잎'];
const no = (n: number) => String(n).padStart(2, '0');
// 7번 하늘 = 학생 화면의 "나"(demo-dataset: 인문사회 · 희망 전공 정책·행정)
// 확정(잠금) 카드: card-collect v2 시안 표 "확정" 2 들꽃 · 13 달빛 · 18 여울 · 21 모래 · 28 솔잎(시안 기준 보강)
const LOCKED = new Set([2, 13, 18, 21, 28]);
export const sampleStudents: Student[] = ALIASES.map((alias, i) => ({ number: no(i + 1), alias, ...(i === 6 ? { track: '인문사회', major: '정책·행정' } : {}), ...(LOCKED.has(i + 1) ? { locked: true } : {}) }));

// 상담카드 제출 21명 · 미제출 7명(teacher-dashboard v2 시안 표: 3 노을 · 4 단비 · 11 구름 · 12 가람 · 16 봄비 · 20 버들 · 26 서리).
const UNSUBMITTED = new Set([3, 4, 11, 12, 16, 20, 26]);
// 경고: 15 바다 · 5 햇살 2개, 22 은하 · 18 여울 1개(card-collect v2 시안: 바다·햇살 = 소신·위험 쏠림 + 면접 일정 겹침, 은하 = 쏠림, 여울 = 면접 겹침)
const SKEW = { code: 'R-CARD-003', title: '소신·위험 쪽으로 쏠렸어요', message: '6장 중 4장 이상이 소신·위험이에요. 입결과 비교하면 안정에 드는 카드를 1장 이상 넣어 보세요.' };
const CLASH = { code: 'R-CARD-002', title: '면접 일정이 겹쳐요', message: '같은 날 면접이 2개 있어요. 두 대학 일정을 다시 확인해 보세요.' };
const WARNINGS: Record<number, typeof SKEW[]> = { 5: [SKEW, CLASH], 15: [SKEW, CLASH], 18: [CLASH], 22: [SKEW] };
/** 하늘이 샘플 모드 수시로에서 보던 판정(관심 대학 6곳 순서). tests/sample-judgment.test.ts가 judgeUniversity 결과와 같은지 확인해요. */
export const SAMPLE_CARD_VERDICTS = ['안정', '안정', '적정', '적정', '소신', '경계'] as const;
// 7번 하늘은 데모의 수시 6장. 다른 학생 카드(대학 · 학생이 본 판정)는 데모에 없어서 card-collect v2 시안 표 값으로 채워요(시안 기준 보강, 대학 이름 줄임 = "○○대학교").
const HANUL_SLOTS = SAMPLE_UNIVERSITIES.map(([university, department, program], i) => ({ priority: i + 1, university, program, department, judgment: SAMPLE_CARD_VERDICTS[i] }));
// counsel v2 시안 "카드 v3 · 11-10 받음" · "6번 칸 교체 (국민대 행정학과 → 중앙대 공공인재학부)": v1·v2는 6번 칸이 국민대였어요.
const HANUL_OLD = HANUL_SLOTS.map((s, i) => i === 5 ? { ...s, university: '국민대학교', department: '행정학과', program: '학생부교과' } : s);
const CARD_SLOTS: Record<number, string> = {
  1: '건국 소신,한양 적정,연세 적정,경희 안정,동국 안정,고려 안정', 2: '성균관 적정,중앙 소신,강원 적정,건국 안정,한양 안정',
  5: '연세 소신,고려 소신,성균관 소신,한양 위험,경희 적정,중앙 소신', 6: '고려 적정,한림 소신,성균관 적정,중앙 안정,강원 안정,건국 적정',
  8: '강원 적정,건국 적정,한양 안정,연세 안정,경희 소신', 9: '한림 소신,성균관 적정,중앙 적정,강원 안정,건국 안정,한양 안정',
  10: '경희 적정,동국 소신,고려 적정,한림 안정', 13: '동국 소신,고려 적정,한림 적정,성균관 안정,중앙 안정,강원 안정',
  14: '한양 적정,연세 소신,경희 적정,동국 안정,고려 안정', 15: '고려 위험,연세 위험,성균관 소신,한양 소신,중앙 소신,동국 적정',
  17: '연세 소신,경희 적정,동국 적정,고려 안정,한림 안정,성균관 안정', 18: '경희 적정,동국 적정,건국 안정,강원 안정,중앙 소신,한양 소신',
  19: '한림 안정,성균관 적정,중앙 적정,강원 소신,건국 안정,한양 안정', 21: '건국 소신,한양 적정,연세 적정,경희 안정,동국 안정,고려 안정',
  22: '성균관 위험,한양 소신,중앙 소신,경희 소신,동국 적정', 23: '동국 안정,고려 적정,한림 적정,성균관 소신,중앙 안정,강원 안정',
  24: '한양 적정,연세 적정,경희 안정,동국 안정,고려 소신,한림 적정', 25: '중앙 소신,강원 적정,건국 적정,한양 안정,연세 안정,경희 안정',
  27: '연세 안정,경희 적정,동국 적정,고려 소신,한림 안정,성균관 안정', 28: '강원 적정,건국 적정,한양 안정,연세 안정',
};
const slotsOf = (n: number): CounselPayload['slots'] => n === 7 ? HANUL_SLOTS : (CARD_SLOTS[n] ?? '').split(',').filter(Boolean)
  .map((x, i) => { const [u, judgment] = x.split(' '); return { priority: i + 1, university: `${u}대학교`, judgment }; });
const card = (n: number, slots: CounselPayload['slots'] = slotsOf(n)): CounselPayload => ({ scenario: 'A안', slots, exempt: [], warnings: WARNINGS[n] ?? [] });
const record = (number: string, date: string, c: CounselPayload, seen = true): CardRecord => ({ number, created_at: `${date}T09:00:00.000Z`, received_at: `${date}T10:00:00.000Z`, seen, card: c });
// 새 버전(아직 안 본 두 번째 카드): 5 햇살 · 9 소나무 · 24 파도(card-collect v2 시안). 첫 버전(11-10)은 마지막 칸이 없었어요.
const NEW_VERSION = new Set([5, 9, 24]);
// 하늘 카드 v1 10-13 · v2 10-27 · v3 11-10(시안). 나머지는 데이터 기준일(11-18)에 한 번.
export const sampleCards: CardRecord[] = [
  record('07', '2026-10-13', card(7, HANUL_OLD)), record('07', '2026-10-27', card(7, HANUL_OLD)),
  ...[...NEW_VERSION].map(n => record(no(n), '2026-11-10', card(n, slotsOf(n).slice(0, -1)))),
  ...sampleStudents.filter((_, i) => !UNSUBMITTED.has(i + 1)).map(s => record(s.number, s.number === '07' ? '2026-11-10' : '2026-11-18', card(Number(s.number)), !NEW_VERSION.has(Number(s.number)))),
];

// 하늘 상담 메모 4회(counsel v2 시안 지난 메모). 11-12 메모의 다음에 볼 것(11-24) = 이번 주 상담 11/24(화).
type M = [date: string, area: Memo['area'], text: string, next: string, time: string];
const MEMOS: M[] = [
  ['2026-11-12', '수시로', '6장 가운데 소신은 한양대 정책학과, 경계는 중앙대 공공인재학부예요. 칸은 그대로 두고 최저 근접 과목을 먼저 챙기기로 했어요.', '11-24까지 · 탐구 오답 같이 보기', '07:40'],
  ['2026-11-03', '성적', '10월 모의고사 국 3 · 수 2 · 영 2 · 탐 3 · 3이에요. 탐구 두 과목이 3등급이라 경희대 최저에 근접이에요.', '', '03:50'],
  ['2026-10-20', '진로', '정책·행정 희망은 그대로예요. 행정학과와 정책학과의 차이를 같이 정리했어요.', '', '06:10'],
  ['2026-09-22', '생활', '등교 전 1시간 영어 단어 공부를 시작했다고 해요. 아침 컨디션은 괜찮다고 해요.', '', '04:00'],
];
// 이번 주 상담(demo-dataset 11/24 하늘 · 11/25 바다 · 11/27 은하): 바다 · 은하는 데모에 메모가 없어서 "다음에 볼 것" 기한만 있는 메모를 하나씩 둬요(보강).
const OTHER_MEMOS: Memo[] = [
  { number: '15', date: '2026-11-13', area: '수시로', text: '카드 조합 경고 2개를 같이 보기로 했어요.', next: '11-25까지 · 소신·위험 칸 다시 보기', next_done: false, created_at: '2026-11-13T07:00:00.000Z' },
  { number: '22', date: '2026-11-13', area: '수시로', text: '수능 최저 미충족이라 칸을 같이 보기로 했어요.', next: '11-27까지 · 최저 없는 전형 찾아 오기', next_done: false, created_at: '2026-11-13T07:30:00.000Z' },
];
export const sampleMemos: Memo[] = [...MEMOS.map(([date, area, text, next, time]): Memo => ({ number: '07', date, area, text, next, next_done: false, created_at: `${date}T${time}:00.000Z` })), ...OTHER_MEMOS];
// 학급 성적(teacher-dashboard v2 시안 "학생 한눈에" 5등급 평균). 16 봄비는 성적 없음, 7 하늘은 아래 demo-dataset 값.
const G5: Record<number, number> = { 1: 1.5, 2: 1.1, 3: 2.1, 4: 1.8, 5: 1.3, 6: 1.3, 8: 2.0, 9: 1.1, 10: 1.4, 11: 2.2, 12: 1.7, 13: 1.2, 14: 1.5, 15: 2.0,
  17: 1.3, 18: 1.6, 19: 2.0, 20: 1.4, 21: 1.1, 22: 2.1, 23: 1.6, 24: 1.7, 25: 1.4, 26: 2.2, 27: 1.8, 28: 1.3 };
const SUBJECTS: [Semester, string[]][] = [['1-1', ['공통국어1', '공통수학1', '공통영어1', '통합사회1', '통합과학1']], ['1-2', ['공통국어2', '공통수학2', '공통영어2', '통합사회2', '통합과학2']],
  ['2-1', ['문학', '대수', '영어Ⅰ', '세계시민과 지리', '물리학']], ['2-2', ['독서와 작문', '미적분Ⅰ', '영어Ⅱ', '사회와 문화', '화학']]];
const GROUPS = ['국어', '수학', '영어', '사회', '과학'];
/** 과목 20개(4학점)를 평균이 G5가 되게 두 등급으로 채워요. 숫자 큰 등급을 앞 학기에 둬서 성적 하락 신호가 생기지 않아요. 환산 범위는 앱 5 to 9 엔진이 이 과목으로 계산해요. */
function classGrades(n: number, g5: number): SchoolGrades {
  const base = Math.floor(g5 + 1e-9), worse = Math.round((g5 - base) * 20);
  const records: GradeRecord[] = SUBJECTS.flatMap(([semester, names], si) => names.map((name, gi) => ({
    id: `${SAMPLE_PREFIX}t${no(n)}-${semester}-${gi + 1}`, semester, name, subject_group: GROUPS[gi], type: si < 2 ? '공통' as const : '일반선택' as const,
    credits: 4, rank_grade: base + (si * 5 + gi < worse ? 1 : 0), is_joint: false, division: 'unknown' as const })));
  const semesters = Object.fromEntries(SUBJECTS.map(([sem]) => { const r = records.filter(x => x.semester === sem); return [sem, r.reduce((a, x) => a + x.rank_grade!, 0) / r.length]; }));
  return { number: no(n), semesters, updated_at: SAMPLE_STAMP, records };
}
// 하늘 내신 학기 평균(demo-dataset 학기 평균 1-1 1.7 → 2-2 1.2). 단순 평균 약 1.4. 하늘이 [0]이에요(tests/student-record).
export const sampleSchool: SchoolGrades[] = [{ number: '07', semesters: { '1-1': 1.7, '1-2': 1.5, '2-1': 1.3, '2-2': 1.2 }, updated_at: SAMPLE_STAMP, records: sampleGrades },
  ...Object.entries(G5).map(([n, g]) => classGrades(Number(n), g))];
// 1순위 목표 수능 최저(교사 입력 예시, 실제 경희대 기준 아님). 3합 6이라 10월 학평으로 demo-dataset 판정이 나와요.
const CRITERION: Target['criterion'] = { areas: ['국어', '수학', '영어', '탐구'], count: 3, sum: 6, required: null, history_max: null, tamgu: 'best' };
export const sampleTargets: Target[] = sampleStudents.map(s => ({ number: s.number, university: '경희대학교', source: 'teacher', updated_at: SAMPLE_STAMP, criterion: CRITERION }));

// 누가기록: 이번 달 기록 있음 25명 · 없음 3명(18 여울 · 21 모래 · 28 솔잎)
export const sampleLogs: HomeroomLog[] = [{
  date: '2026-11-13', area: '진로', text: '학급 진로 활동: 희망 전공 조사지 작성', created_at: '2026-11-13T08:00:00.000Z',
  numbers: sampleStudents.map(s => s.number).filter(n => !['18', '21', '28'].includes(n)),
}];

// 7번 하늘 모의고사(9등급) 3·6·9·10월: 국어 3·2·3·3 / 수학 3·2·2·2 / 영어 2·2·1·2 / 탐구1 3·3·3·3 / 탐구2 4·3·3·3
const MOCK = { 국어: [3, 2, 3, 3], 수학: [3, 2, 2, 2], 영어: [2, 2, 1, 2], 탐구1: [3, 3, 3, 3], 탐구2: [4, 3, 3, 3] } as const;
const EXAMS = [[3, '학평'], [6, '모평'], [9, '모평'], [10, '학평']] as const;
export const sampleMocks: MockGrades[] = EXAMS.map(([month, kind], i) => ({
  number: '07', exam: `2026년 ${month}월 ${kind}`, updated_at: SAMPLE_STAMP,
  grades: Object.fromEntries(Object.entries(MOCK).map(([area, v]) => [area, v[i]])),
}));
// 반 학생 모의고사(네 회차 같은 등급). demo-dataset 최저: 미충족 5명(15 · 22 · 3 · 11 · 26) · 근접 3명(7 · 18 · 24) · 자료 부족 1명(16, 영어만) · 충족 19명.
const MET = { 국어: 2, 수학: 2, 영어: 2, 탐구1: 2, 탐구2: 3 }, NEAR = { 국어: 3, 수학: 2, 영어: 2, 탐구1: 3, 탐구2: 3 }, UNMET = { 국어: 3, 수학: 3, 영어: 3, 탐구1: 4, 탐구2: 4 };
const mockOf = (n: number) => [3, 11, 15, 22, 26].includes(n) ? UNMET : [18, 24].includes(n) ? NEAR : n === 16 ? { 영어: 3 } : MET;
export const sampleClassMocks: MockGrades[] = sampleStudents.filter(s => s.number !== '07').flatMap(s => EXAMS.map(([month, kind]) => ({
  number: s.number, exam: `2026년 ${month}월 ${kind}`, updated_at: SAMPLE_STAMP, grades: mockOf(Number(s.number)) })));

// 우리 반 입시 일정: 하늘의 고사 일정(calendar 상세 예시 E4 · E5 · E7 · E8)과 같은 날
export const sampleSchedules: ClassSchedule[] = [
  { university: '경희대학교', program: '학생부교과(지역균형)', kind: '면접·실기', date: '2026-11-21' },
  { university: '건국대학교', program: '학생부교과', kind: '면접·실기', date: '2026-11-21' },
  { university: '중앙대학교', program: '학생부교과', kind: '서류 제출', date: '2026-11-27', time: '17:00' },
  { university: '동국대학교', program: '학생부교과', kind: '면접·실기', date: '2026-12-05' },
];

// 결과 집계 샘플(result-summary 02-spec 1-1 · v2 시안): 지원 162 = 합격 21 + 충원 합격 9 + 불합격 118(1단계 불합격 35 포함) + 미등록 7 + 미입력 7,
// 합격한 학생 19명, 종합 1단계 통과 32. 대학 이름은 실제, 숫자·전형 배정은 모두 예시예요.
// 07 · 12 · 03 · 01 · 19 · 25는 시안 학생별 행. 01은 학생당 최대 6건으로 162건을 채우려고 논술 2건을 더했어요(보고 대상).
const PROGRAMS: Record<string, [Outcome['type'], string, string]> = {
  K1: ['교과', '강원대학교', '지역인재'], K2: ['교과', '한림대학교', '교과우수자'], K3: ['교과', '가톨릭관동대학교', '교과일반'], K4: ['교과', '경희대학교', '지역균형'],
  J1: ['종합', '강원대학교', '미래인재'], J2: ['종합', '연세대학교 미래캠퍼스', '학교생활우수자'], J3: ['종합', '중앙대학교', 'CAU융합형인재'], J4: ['종합', '성균관대학교', '학과모집'],
  O1: ['종합', '고려대학교', '학생부종합'], O2: ['종합', '서울시립대학교', '학생부종합'], O3: ['종합', '아주대학교', '학생부종합'], O4: ['종합', '인하대학교', '학생부종합'],
  O5: ['종합', '국민대학교', '학생부종합'], O6: ['종합', '단국대학교', '학생부종합'], O7: ['종합', '세종대학교', '학생부종합'], O8: ['종합', '가천대학교', '학생부종합'], O9: ['종합', '동국대학교', '학생부종합'],
  N1: ['논술', '중앙대학교', '논술'], N2: ['논술', '경희대학교', '논술'], N3: ['논술', '성균관대학교', '논술'], N4: ['논술', '한양대학교', '논술'],
  E1: ['기타', '강원대학교', '실기'], E2: ['기타', '한림대학교', '실기'],
};
// p 합격 · c 충원 합격 · f 불합격 · x 1단계 불합격 · r 미등록 · u 미입력. 종합은 p·c·r·f = 1단계 통과, x = 1단계 불합격, u = 모름
const RESULT_CODE: Record<string, Outcome['result']> = { p: '합격', c: '충원 합격', f: '불합격', x: '1단계 불합격', r: '미등록', u: '미입력' };
const APPLIED: Record<string, string> = {
  '01': 'J4x J2c J1f K2f N1f N2f', '02': 'J1x K1f N4f J2f K2f O4f', '03': 'J3f J4u J1f K4f K3f K2f', '04': 'K2u J4f J1f E2f O8x N1f',
  '05': 'K4p N4f K1f N1f J3x J1x', '06': 'N2f K3f O3x O7x J1x K1f', '07': 'K1p K2c K4f J1r J2x J3u', '08': 'K1p N1p J2x J1x N4f J3x',
  '09': 'K2p J1c N1f J2f K1f J4x', '10': 'J2p N2f J1f J4x O2x K4f', '11': 'K1p K4f J1x N3f O6f O1f', '12': 'J4f J3f K4f K1p K2r K3u',
  '13': 'K1p E2f N2f K3f O1x J3x', '14': 'K3p K2p J1f K1f J2f N4f', '15': 'K1c K2c O1f E1f J3x J4f', '16': 'O5u E2f K2f K1f N1f N2f',
  '17': 'O3f K1f J3x K2f N3f J1f', '18': 'N4u K4f K1r N2r K2f J1x', '19': 'K1c K3p K2f', '20': 'J1p J4f J2r K3f O9x K1f',
  '21': 'K2p J1p K1f E1f N1f J2x', '22': 'K1c N3f K3f O5x J2x J1x', '23': 'J4x K3r J3x K4f K1f J2x', '24': 'K1c K3p O4x J1x N3f J4x',
  '25': 'J1p J2f K1r', '26': 'K1p K3c E1f K4f J1x N3f', '27': 'K1u J2x K3f N3f O2f N2f', '28': 'K2p J3p K1p J4x N1f J2f',
};
export const sampleOutcomes: Outcome[] = Object.entries(APPLIED).flatMap(([number, line]) => line.split(' ').map(code => {
  const [type, university, program] = PROGRAMS[code.slice(0, 2)], result = RESULT_CODE[code[2]];
  return { number, university, program, type, result, stage1: type !== '종합' || result === '미입력' ? null : result !== '1단계 불합격' };
}));
