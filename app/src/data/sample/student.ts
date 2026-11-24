// 학생 샘플 = work/_data/demo-dataset.md의 "나"(7번 하늘). 값은 그 파일 그대로예요. 실제 성적·입결이 아니에요.
import type { AttendanceRecord, GradeRecord, Semester, SubjectType } from '../../domain/student';
import type { ApplicationPlan, ChecklistStep, CounselTask, EligibilityItem } from '../../domain/planner';
import type { Board, BoardSlot } from '../../domain/board';
import type { Interest } from '../../domain/interests';
import { interestId } from '../../domain/interests';

/** 문자열 id를 쓰는 샘플 행은 모두 이 접두어로 시작해요. 지우기는 이 접두어로 샘플만 골라요. */
export const SAMPLE_PREFIX = 'sample-';
export const SAMPLE_STAMP = '2026-11-18T00:00:00.000Z';
const kst = (d: string) => new Date(`${d}:00+09:00`).toISOString(); // '2026-11-14T21:10' → UTC ISO

type Dist = [number, number, number, number, number];
type Row = [name: string, group: string, type: SubjectType, credits: number, rank: number | null, extra?: Partial<GradeRecord>];
const full = (raw: number, mean: number, ach: GradeRecord['achievement'], d: Dist, n: number): Partial<GradeRecord> =>
  ({ raw_score: raw, subject_mean: mean, achievement: ach, achievement_distribution: d, enrolled_count: n });
const SEMESTER_ROWS: Record<Semester, Row[]> = {
  '1-1': [['공통국어1', '국어', '공통', 4, 2], ['공통수학1', '수학', '공통', 4, 2], ['공통영어1', '영어', '공통', 4, 1],
    ['통합사회1', '사회', '공통', 4, 2], ['한국사1', '사회', '공통', 3, 1, full(96, 74.5, 'A', [26.0, 29.1, 22.8, 13.6, 8.5], 265)], ['통합과학1', '과학', '공통', 4, 2]],
  '1-2': [['공통국어2', '국어', '공통', 4, 2], ['공통수학2', '수학', '공통', 4, 1, full(94, 64.5, 'A', [18.3, 26.0, 27.9, 16.6, 11.2], 263)], ['공통영어2', '영어', '공통', 4, 1],
    ['통합사회2', '사회', '공통', 4, 2], ['한국사2', '사회', '공통', 3, 2], ['통합과학2', '과학', '공통', 4, 1]],
  '2-1': [['문학', '국어', '일반선택', 4, 1, full(94, 71.4, 'A', [21.3, 30.2, 25.6, 14.1, 8.8], 132)],
    ['대수', '수학', '일반선택', 4, 1, full(95, 64.8, 'A', [17.9, 26.4, 28.1, 16.3, 11.3], 132)],
    ['영어Ⅰ', '영어', '일반선택', 4, 2, full(89, 73.2, 'B', [24.1, 28.7, 24.0, 14.6, 8.6], 132)],
    // 분포비율 E를 2.3으로 잘못 넣은 상태(합계 98.5 → 확인 필요 1). 바른 값은 3.8.
    ['여행지리', '사회', '융합선택', 2, null, full(92, 80.3, 'A', [38.5, 30.8, 19.2, 7.7, 2.3], 26)],
    ['물리학', '과학', '일반선택', 3, 1, full(93, 68.5, 'A', [19.4, 27.8, 26.1, 15.9, 10.8], 58)],
    ['운동과 건강', '체육', '체육예술', 2, null, { achievement: 'A' }]],
  '2-2': [['독서와 작문', '국어', '일반선택', 4, 1, full(93, 70.2, 'A', [22.0, 29.5, 25.0, 14.5, 9.0], 131)],
    ['미적분Ⅰ', '수학', '일반선택', 4, 1, full(96, 61.7, 'A', [16.8, 25.9, 28.4, 17.2, 11.7], 131)],
    ['영어Ⅱ', '영어', '일반선택', 4, 1, full(94, 72.6, 'A', [25.2, 28.1, 23.9, 14.2, 8.6], 131)],
    ['사회와 문화', '사회', '일반선택', 3, 1, full(92, 69.8, 'A', [23.5, 27.6, 25.4, 14.9, 8.6], 74)],
    ['화학', '과학', '일반선택', 3, 2, full(85, 66.4, 'B', [18.6, 25.1, 27.0, 17.3, 12.0], 61)],
    ['진로와 직업', '교양', '교양', 2, null, { achievement: 'P' }]],
  '3-1': [], '3-2': [],
};
export const sampleGrades: GradeRecord[] = Object.entries(SEMESTER_ROWS).flatMap(([semester, rows]) => rows.map(([name, subject_group, type, credits, rank_grade, extra], i) => ({
  id: `${SAMPLE_PREFIX}g-${semester}-${i + 1}`, semester: semester as Semester, name, subject_group, type, credits, rank_grade, is_joint: false, division: 'unknown' as const, ...extra,
})));

const zero = { illness: 0, unexcused: 0, other: 0 };
export const sampleAttendance: AttendanceRecord[] = [
  { year: 1, school_days: 191, absence: { ...zero, illness: 1 }, tardy: { ...zero }, early_leave: { ...zero }, class_absence: { ...zero } },
  { year: 2, school_days: 190, absence: { ...zero, illness: 2 }, tardy: { ...zero, unexcused: 1 }, early_leave: { ...zero, illness: 1 }, class_absence: { ...zero } },
];

// 관심 대학 6곳(수시 6장), 모든 화면에서 같은 순서. 전형 이름은 데모 데이터처럼 "학생부종합"만 써요.
export const SAMPLE_UNIVERSITIES = [
  ['경희대학교', '행정학과'], ['건국대학교', '행정학과'], ['성균관대학교', '행정학과'],
  ['동국대학교', '행정학과'], ['한양대학교', '정책학과'], ['중앙대학교', '공공인재학부'],
] as const;
const PROGRAM = '학생부종합';
export const sampleInterests: Interest[] = SAMPLE_UNIVERSITIES.map(([university, department], i) => ({
  id: interestId(university, PROGRAM, department), university, program: PROGRAM, department, created_at: `2026-11-10T00:00:0${i}.000Z`,
}));

const appId = (i: number) => `${SAMPLE_PREFIX}app-${i + 1}`;
const step = (a: number, n: number, title: string, status: ChecklistStep['status'], due: string | null, checked: string | null, note = '', source_url = ''): ChecklistStep =>
  ({ id: `${SAMPLE_PREFIX}s-${a}-${n}`, title, status, due_at: due, note, source_url, checked_at: checked ? kst(checked) : null });
const elig = (a: number, n: number, title: string, status: EligibilityItem['status'], checked: string | null, note = '', source_url = ''): EligibilityItem =>
  ({ id: `${SAMPLE_PREFIX}e-${a}-${n}`, title, status, note, source_url, checked_at: checked ? kst(checked) : null });
const LINK = 'https://admission.example.ac.kr/2028/plan.pdf';
// 다른 전형은 앱 기본 항목(원서 작성 ~ 서류 도착 확인)을 확인 전으로 둬요.
const defaultSteps = (a: number) => ['원서 작성', '전형료 결제', '접수 완료 확인', '제출서류 준비·제출', '서류 도착 확인'].map((t, n) => step(a, n + 1, t, 'pending', null, null));
const defaultElig = (a: number) => ['전형별 지원 자격', '졸업연도·재학 조건', '지역·학교 조건', '학교장추천 필요 여부'].map((t, n) => elig(a, n + 1, t, 'unknown', null));

const STEPS: Record<number, ChecklistStep[]> = {
  // application-checklist 상세 예시 · 전형 A(경희대학교) 8항목
  0: [step(0, 1, '모집요강 읽기', 'done', '2026-11-15T18:00', '2026-11-14T21:10', '', LINK),
    step(0, 2, '학교생활기록부 사본 확인', 'progress', '2026-11-18T18:00', '2026-11-17T19:40', '담임 선생님께 봉사 시간 정정 문의'),
    step(0, 3, '담임 선생님 상담 신청', 'pending', '2026-11-20T18:00', null),
    step(0, 4, '원서 작성', 'pending', null, null),
    step(0, 5, '전형료 결제', 'pending', '2027-09-15T18:00', null, '결제 영수증 캡처해 두기'),
    step(0, 6, '접수 완료 확인', 'pending', null, null),
    step(0, 7, '제출서류 준비·제출', 'na', null, '2026-11-14T21:12', '서류 제출 없는 전형으로 등록'),
    step(0, 8, '서류 도착 확인', 'na', null, '2026-11-14T21:12')],
  // calendar 상세 예시 E1 · E2 · E3 · E6(체크리스트 기록)
  2: [...defaultSteps(2), step(2, 6, '서류 제출', 'done', '2026-11-05T17:00', '2026-11-05T16:30')],
  3: [...defaultSteps(3), step(3, 6, '추천서 제출', 'pending', '2026-11-13T17:00', null)],
  4: [...defaultSteps(4), step(4, 6, '서류 제출 마감', 'pending', '2026-11-20T18:00', null, '', LINK)],
  5: [...defaultSteps(5), step(5, 6, '서류 제출', 'pending', '2026-11-27T17:00', null)],
};
const ELIGIBILITY: Record<number, EligibilityItem[]> = {
  // eligibility-check 상세 예시 · 경희대학교 5항목
  0: [elig(0, 1, '전형별 지원 자격', 'met', '2026-11-18T16:40', '국내 고교 졸업 예정자 · 모집요강 12쪽 확인', LINK),
    elig(0, 2, '졸업연도·재학 조건', 'met', '2026-11-18T16:42', '2028년 2월 졸업 예정자만 · 졸업생 제외', LINK),
    elig(0, 3, '지역·학교 조건', 'na', '2026-11-19T09:10', '지역 제한이 없는 전형이에요'),
    elig(0, 4, '학교장추천 필요 여부', 'unknown', null),
    elig(0, 5, '사회 진로선택 이수 과목 수', 'unmet', '2026-11-19T21:05', '지금 2과목 이수 · 모집요강 3과목 이상 · 3학년 수강 계획을 담임 선생님께 문의', LINK)],
};
export const sampleApplications: ApplicationPlan[] = SAMPLE_UNIVERSITIES.map(([university, department], i) => ({
  id: appId(i), year: 2028, university, program: PROGRAM, department, source_url: i === 0 ? LINK : '',
  steps: STEPS[i] ?? defaultSteps(i), eligibility: ELIGIBILITY[i] ?? defaultElig(i), created_at: SAMPLE_STAMP, updated_at: SAMPLE_STAMP,
}));

// counsel-tasks 상세 예시 T1~T8. 전형 순서는 관심 대학 6곳과 같아요(null = 공통 상담).
type T = [kind: CounselTask['kind'], app: number | null, session: string, due: string | null, title: string, note: string, completed?: string];
const TASKS: T[] = [
  ['action', null, '2026-11-17', '2026-11-19', '면접 예상 질문 10개 적어 오기', '생기부 활동마다 한 개씩. 다음 상담 때 선생님께 보여 드리기'],
  ['action', 2, '2026-11-17', '2026-11-20', '학교장추천 필요 여부 모집요강에서 확인하기', ''],
  ['question', 0, '2026-11-24', '2026-11-24', '교과 전형 수능 최저 기준은 어디서 확인하나요?', '2028 전형계획과 모집요강 중 무엇을 먼저 볼지'],
  ['action', 3, '2026-11-17', '2026-11-27', '2028 전형계획에서 모집인원 찾아 적기', ''],
  ['question', 4, '2026-11-24', null, '종합 전형 준비로 겨울방학에 무엇부터 할까요?', '독서 · 탐구 활동 중 하나만 고른다면'],
  ['question', null, '2026-11-24', null, '6장 지원 순서는 어떤 기준으로 정하면 좋을까요?', ''],
  ['action', 0, '2026-11-10', '2026-11-14', '2028 교과 전형 모집인원 찾아보기', '시행계획 기준으로 적어 둠', '2026-11-13T16:20'],
  ['question', null, '2026-11-10', null, '내신과 모의고사 중 지금 어디에 시간을 더 쓸까요?', '', '2026-11-10T15:10'],
];
export const sampleTasks: CounselTask[] = TASKS.map(([kind, app, session_date, due_date, title, note, completed], i) => ({
  id: `${SAMPLE_PREFIX}t-${i + 1}`, application_id: app === null ? null : appId(app), kind, title, note, session_date, due_date,
  done: !!completed, completed_at: completed ? kst(completed) : null, created_at: SAMPLE_STAMP, updated_at: SAMPLE_STAMP,
}));

// 수시로 A안 = 관심 대학 6곳 순서. 고사 일정은 calendar 상세 예시(E4 · E5 · E7 · E8 · U1 · U2).
const EXAMS: [BoardSlot['exam_kind'], string | null][] = [['면접', '2026-11-21'], ['면접', '2026-11-21'], ['논술', '2026-11-28'], ['면접', '2026-12-05'], ['면접', null], ['면접', null]];
export const sampleBoards: Board[] = [{
  id: `${SAMPLE_PREFIX}board-a`, name: 'A안', exempt: [], updated_at: SAMPLE_STAMP,
  slots: EXAMS.map(([exam_kind, exam_date], i) => ({ application_id: appId(i), exam_kind, exam_date, csat: 'check', memo: '' })),
}];
