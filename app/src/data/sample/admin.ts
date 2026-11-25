// 관리자 샘플 = demo-dataset "admin-wiki · admin-fields 상세 예시". 검수 기록 예시이고 실제 승인이 아니에요.
// sample: true 표시가 있는 초안은 공개 파일 내보내기에서 빠지거나(위키) 막혀요(계열표).
import type { WikiDraft } from '../../domain/wikiReview';
import type { FieldDraft } from '../../domain/fieldReview';
import { newRuleDraft, runTest, type RuleDraft, type RuleStatus, type TestCase } from '../../domain/ruleEditor';
import { rel } from './sampleClock';
import type { WikiItem, WikiSectionKey } from '../../domain/univWiki';
import { wikiKey } from '../../domain/wikiReview';
import { SAMPLE_STAMP } from './student';

const URL = 'https://admission.example.ac.kr/2028/plan.pdf';
const at = (d: string) => new Date(`${d}:00+09:00`).toISOString();
const plan = (u: string, page: string) => `2028학년도 ${u} 대입전형 시행계획 ${page}쪽`;
const item = (heading: string, text: string, source_label: string, source_url = URL): WikiItem => ({ heading, text, source_label, source_url });
const draft = (university: string, section: WikiSectionKey, items: WikiItem[], approvals: [string, string][]): WikiDraft & { sample: true } =>
  ({ key: wikiKey(university, section), university, section, items, approvals: approvals.map(([reviewer, t]) => ({ reviewer, at: at(t) })), updated_at: SAMPLE_STAMP, sample: true });

const KHU = '경희대학교', KNU = '강원대학교', KU = '고려대학교';
const khuNotes = [
  item('학생부교과 지역균형전형', '석차등급이 있는 과목은 등급으로, 성취도만 있는 과목은 성취도로 반영해요.', plan(KHU, '9~10')),
  item('학생부종합 네오르네상스전형', '1단계 서류 100%로 3배수를 뽑고, 2단계에서 면접 30%를 더해요.', plan(KHU, '14')),
  item('논술우수자전형', '2028학년도에도 수능 최저 기준이 있어요.', plan(KHU, '21')),
];
const khuMinimum = [
  item('학생부교과 지역균형전형', '국·수·영·탐(1과목) 중 2개 영역 등급 합 5 이내, 한국사 5등급 이내예요.', plan(KHU, '21')),
  item('학생부종합 네오르네상스전형', '수능 최저 기준이 없어요.', plan(KHU, '21')),
  item('논술우수자전형(인문)', '국·수·영·탐(1과목) 중 2개 영역 등급 합 5 이내, 한국사 5등급 이내예요.', plan(KHU, '21')),
];
export const sampleWikiDrafts: (WikiDraft & { sample: true })[] = [
  // R1: 2번 출처 주소 http, 4번 출처 이름 빈 칸 → 고칠 곳 2개
  draft(KNU, 'programs', [
    item('학생부교과(일반)', '수시 모집 전형이에요.', plan(KNU, '6~7')),
    item('학생부교과(지역인재)', '수시 모집 전형이에요.', plan(KNU, '6~7'), 'http://admission.example.ac.kr/2028/plan.pdf'),
    item('학생부종합(미래인재)', '수시 모집 전형이에요.', plan(KNU, '6~7')),
    item('실기 전형', '수시 모집 전형이에요.', ''),
  ], []),
  draft(KNU, 'minimum', [
    item('학생부교과(일반)전형', '수능 최저 기준이 있어요. 영역과 등급 합은 모집단위마다 달라서 원문 표를 따라요.', plan(KNU, '21')),
    item('학생부종합(미래인재)전형', '수능 최저 기준이 없어요.', plan(KNU, '21')),
  ], [['관리자 C', '2026-11-19T11:00']]),
  draft(KHU, 'notes', khuNotes, [['관리자 A', '2026-11-15T10:00'], ['관리자 B', '2026-11-16T09:30']]),
  draft(KHU, 'method', [
    item('학생부교과 지역균형전형', '국어 · 수학 · 영어 · 사회(역사·도덕 포함) · 과학의 모든 과목을 반영해요. 석차등급이 있는 과목은 등급 점수, 성취도만 있는 과목은 성취도 점수로 반영해요.', plan(KHU, '9~10')),
    item('학생부종합 네오르네상스전형', '학생부 전체를 서류 정성평가로 반영해요. 교과 점수 계산은 없어요.', plan(KHU, '14')),
    item('논술우수자전형', '학생부를 반영하지 않고 논술 100%로 뽑아요.', plan(KHU, '18')),
  ], [['관리자 A', '2026-11-19T15:10']]),
  draft(KHU, 'minimum', khuMinimum, [['관리자 A', '2026-11-15T10:05'], ['관리자 C', '2026-11-16T09:40']]),
  draft(KU, 'changes', [
    item('학생부교과 학교추천전형', '서류 반영 방법이 바뀌었어요. 바뀐 내용은 원문 5쪽 표에 있어요.', plan(KU, '5')),
    item('논술전형', '2028학년도에 논술전형을 새로 뽑아요.', plan(KU, '5')),
  ], []),
];

// admin-fields 상세 예시: 데모가 이름을 준 10행만 넣어요(186행 전체는 데모에 없어요). 상태 S-one = 1인 승인. 승인자는 관리자 B — 샘플 로그인(관리자 A)이 두 번째 검수자로 "표 전체 승인"을 누를 수 있게(시안 1440·390).
const FIELD_ROWS: [string, string][] = [['가천대학교', '행정학과'], ['가톨릭대학교', '행정학과'], ['강원대학교', '행정·심리학부'], ['건국대학교', '행정학과'], ['경희대학교', '행정학과'],
  ['동국대학교', '행정학과'], ['성균관대학교', '행정학과'], ['중앙대학교', '공공인재학부'], ['한양대학교', '정책학과'], ['한양대학교', '행정학과']];
export const sampleFieldDraft: FieldDraft & { sample: true } = {
  key: 'current', rows: FIELD_ROWS.map(([university, unit]) => ({ university, unit, small: '행정·정책', mid: '사회과학' })),
  approvals: [{ reviewer: '관리자 B', at: at('2026-11-19T15:10') }], updated_at: SAMPLE_STAMP, sample: true,
};

/** 샘플 모드의 공개 위키 = 위 초안 중 2인 검수 완료(R3 · R5)만. 공개 파일 기준 위키 검수일 2026-11-16. */
export const sampleWikiFile = {
  format: 'jinhak-navi-univ-wiki', version: 1, fields: { reviewed_at: '', approvals: [], rows: [] },
  entries: [{ university: KHU, sections: Object.fromEntries(sampleWikiDrafts.filter(d => d.university === KHU && d.approvals.length >= 2)
    .map(d => [d.section, { reviewed_at: '2026-11-16', approvals: d.approvals, items: d.items }])) }],
};

// admin-rules 시안(346:252770 · 346:253552) 예시 규칙. 기대값은 아래 규칙으로 계산한 값(시안 98.32 · 91.20 · 97.70)이라 검수 근거가 아니에요.
type Ach = TestCase['years']['1']['achievement'];
const test = (n: number, name: string, y: [number, Ach][], absence: number): TestCase =>
  ({ id: `sample-test-${n}`, name, absence, tardy: 0, expected: 0, years: { 1: { grade: y[0][0], achievement: y[0][1] }, 2: { grade: y[1][0], achievement: y[1][1] }, 3: { grade: y[2][0], achievement: y[2][1] } } });
const ruleDraft = (key: string, university: string, program: string, version: number, status: RuleStatus, author: string, reviewer: string | null, day: string, tests: TestCase[], reject_reason = ''): RuleDraft & { sample: true } => {
  const base = newRuleDraft(author).rule, id = `sample-rule-${key}`, at = new Date(`${rel(day)}:00+09:00`).toISOString();
  const rule = { ...base, id, university, program, version, source: 'https://admission.example.ac.kr/2028/guide.pdf', review_status: status === '검수 완료' ? 'verified' as const : 'draft' as const,
    year_weights: { 1: 0.2, 2: 0.4, 3: 0.4 }, subject_groups: ['국어', '수학', '영어', '사회', '과학', '한국사'], rank_grade_points: { 1: 100, 2: 97, 3: 90, 4: 80, 5: 60 },
    achievement_blend: { mode: 'weighted' as const, rank_ratio: 0.7 }, no_rank_subject_policy: 'achievement_convert' as const,
    attendance_rule: { years: [1, 2, 3], tardy_to_absence: 3, max_score: 20, deduction_table: [{ absence_max: 0, points: 0 }, { absence_max: 2, points: 1 }, { absence_max: 5, points: 2 }, { absence_max: 365, points: 5 }] } };
  const done = tests.map(t => ({ ...t, id: `${t.id}-${key}`, expected: runTest(rule, t).actual ?? 0 }));
  const history = [{ at, who: reviewer ?? author, action: status === '검수 완료' ? '승인했어요 · 검수 완료' : status === '반려' ? `반려했어요 · ${reject_reason}` : status === '검수 대기' ? `검수를 요청했어요 · 테스트 ${done.length}/${done.length} 통과` : '임시 저장했어요' }];
  return { id, source_page: '모집요강 p.42', rule, tests: done, status, author, reviewer, reject_reason, history, updated_at: at, sample: true, ai_draft: true };
};
const T3 = [test(1, '학생 A', [[2, 'A'], [2, 'A'], [2, 'A']], 0), test(2, '학생 B', [[3, 'B'], [3, 'B'], [3, 'B']], 4), test(3, '학생 C', [[1, 'A'], [2, 'B'], [2, 'B']], 0)];
export const sampleRuleDrafts: (RuleDraft & { sample: true })[] = [
  ruleDraft('khu-v3', '경희대학교', '학생부교과(지역균형)', 3, '작성 중', '관리자 A', null, '2026-11-18T14:20', T3),
  ruleDraft('khu-v2', '경희대학교', '학생부교과(지역균형)', 2, '검수 완료', '관리자 C', '관리자 A', '2026-09-02T10:00', T3),
  ruleDraft('khu-essay', '경희대학교', '논술우수자', 1, '검수 대기', '관리자 C', null, '2026-11-18T09:10', T3),
  ruleDraft('kku', '건국대학교', '학생부교과(학교장추천)', 2, '검수 대기', '관리자 C', null, '2026-11-17T16:00', [...T3, test(4, '학생 D', [[4, 'C'], [3, 'B'], [3, 'B']], 1)]),
  ruleDraft('skku', '성균관대학교', '학생부교과(일반)', 1, '반려', '관리자 B', '관리자 A', '2026-11-16T11:00', T3, '2등급 점수가 모집요강 p.42와 같은지 다시 봐 주세요.'),
  ruleDraft('dgu', '동국대학교', '학생부교과(교과우수)', 2, '검수 완료', '관리자 B', '관리자 C', '2026-11-14T09:30', T3),
];
