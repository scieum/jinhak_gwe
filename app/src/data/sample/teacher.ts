// 교사 샘플 = work/_data/demo-dataset.md "학급"(2학년 3반 28명). 실제 학생이 아니에요.
import type { CardRecord, ClassInfo, CounselPayload, HomeroomLog, Student } from '../../domain/classroom';
import type { MockGrades } from '../../domain/scoreImport';
import type { ClassSchedule } from '../../domain/classCalendar';
import { SAMPLE_STAMP, SAMPLE_UNIVERSITIES } from './student';

/** 이 학급 코드 + 만든 시각이면 샘플 학급이에요(지우기 기준). */
export const SAMPLE_CLASS: ClassInfo = { key: 'class', name: '2학년 3반', code: 'SMPL', created_at: SAMPLE_STAMP };
const ALIASES = ['새벽', '들꽃', '노을', '단비', '햇살', '바람', '하늘', '이슬', '소나무', '별빛', '구름', '가람', '달빛', '시내', '바다', '봄비', '윤슬', '여울', '너울', '버들', '모래', '은하', '안개', '파도', '꽃잎', '서리', '샘물', '솔잎'];
const no = (n: number) => String(n).padStart(2, '0');
export const sampleStudents: Student[] = ALIASES.map((alias, i) => ({ number: no(i + 1), alias }));

// 상담카드 제출 21명 · 미제출 7명. 미제출 번호는 데모에 없어서 경고·상담 학생과 겹치지 않게 골랐어요(보고 대상).
const UNSUBMITTED = new Set([16, 21, 23, 25, 26, 27, 28]);
// 경고: 15 바다 · 5 햇살 2개, 22 은하 · 18 여울 1개
const WARNINGS: Record<number, number> = { 5: 2, 15: 2, 18: 1, 22: 1 };
const warning = (i: number) => i === 0
  ? { code: 'R-CARD-002', title: '면접 일정이 겹쳐요', message: '같은 날 면접이 2개 있어요. 두 대학 일정을 다시 확인해 보세요.' }
  : { code: 'R-CARD-004', title: '수능 최저 확인이 필요해요', message: '수능 최저 기준을 아직 확인하지 않은 카드가 있어요.' };
const card = (n: number): CounselPayload => ({
  scenario: 'A안',
  // 7번 하늘만 데모의 수시 6장을 실어요(판정 표시 없음). 다른 학생 카드 내용은 데모에 없어서 비워 둬요.
  slots: n === 7 ? SAMPLE_UNIVERSITIES.map(([university, department, program], i) => ({ priority: i + 1, university, program, department, judgment: null })) : [],
  exempt: [], warnings: Array.from({ length: WARNINGS[n] ?? 0 }, (_, i) => warning(i)),
});
export const sampleCards: CardRecord[] = sampleStudents.filter((_, i) => !UNSUBMITTED.has(i + 1)).map(s => ({
  number: s.number, created_at: '2026-11-18T09:00:00.000Z', received_at: '2026-11-18T10:00:00.000Z', seen: true, card: card(Number(s.number)),
}));

// 누가기록: 이번 달 기록 있음 25명 · 없음 3명(18 여울 · 21 모래 · 28 솔잎)
export const sampleLogs: HomeroomLog[] = [{
  date: '2026-11-13', area: '진로', text: '학급 진로 활동: 희망 전공 조사지 작성', created_at: '2026-11-13T08:00:00.000Z',
  numbers: sampleStudents.map(s => s.number).filter(n => !['18', '21', '28'].includes(n)),
}];

// 7번 하늘 모의고사(9등급) 3·6·9·10월: 국어 3·2·3·3 / 수학 3·2·2·2 / 영어 2·2·1·2 / 탐구1 3·3·3·3 / 탐구2 4·3·3·3
const MOCK = { 국어: [3, 2, 3, 3], 수학: [3, 2, 2, 2], 영어: [2, 2, 1, 2], 탐구1: [3, 3, 3, 3], 탐구2: [4, 3, 3, 3] } as const;
export const sampleMocks: MockGrades[] = [[3, '학평'], [6, '모평'], [9, '모평'], [10, '학평']].map(([month, kind], i) => ({
  number: '07', exam: `2026년 ${month}월 ${kind}`, updated_at: SAMPLE_STAMP,
  grades: Object.fromEntries(Object.entries(MOCK).map(([area, v]) => [area, v[i]])),
}));

// 우리 반 입시 일정: 하늘의 고사 일정(calendar 상세 예시 E4 · E5 · E7 · E8)과 같은 날
export const sampleSchedules: ClassSchedule[] = [
  { university: '경희대학교', program: '학생부교과(지역균형)', kind: '면접·실기', date: '2026-11-21' },
  { university: '건국대학교', program: '학생부교과', kind: '면접·실기', date: '2026-11-21' },
  { university: '중앙대학교', program: '학생부교과', kind: '서류 제출', date: '2026-11-27', time: '17:00' },
  { university: '동국대학교', program: '학생부교과', kind: '면접·실기', date: '2026-12-05' },
];
