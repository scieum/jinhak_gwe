// 모의고사 샘플(mock-score v2 시안 346:140444 데모). 원점수·등급컷·최저 기준은 모두 예시 값이에요. 실제 등급컷·모집요강이 아니에요.
// 등급은 teacher.ts 7번 하늘 9등급(3월 국3 수3 영2 탐3·4 / 6월 국2 수2 영2 탐3·3)과 같게 읽혀요.
import type { CutTable, MockScore } from '../../domain/mock';
import type { Criterion } from '../../domain/minimum';
import type { Provenance } from '../../engine/types';
import { SAMPLE_STAMP } from './student';

export const sampleMockScores: MockScore[] = [
  { exam: '2026년 3월 학력평가(고2)', raw: { 국어: 79, 수학: 76, 영어: 83, 탐구1: 39, 탐구2: 33 }, updated_at: SAMPLE_STAMP },
  { exam: '2026년 6월 학력평가(고2)', raw: { 국어: 88, 수학: 84, 영어: 86, 탐구1: 41, 탐구2: 40 }, updated_at: SAMPLE_STAMP },
];
const point = (...xs: number[]) => xs.map((v, i) => ({ grade: i + 1, min: v, max: v }));
const areas: CutTable['areas'] = {
  국어: { absolute: false, cuts: point(92, 85, 78, 70) }, 수학: { absolute: false, cuts: point(90, 82, 74, 66) },
  영어: { absolute: true, cuts: point(90, 80, 70, 60) }, 탐구1: { absolute: false, cuts: point(47, 43, 38, 32) }, 탐구2: { absolute: false, cuts: point(47, 43, 38, 32) },
};
const SOURCE = '샘플 데이터(가상) · 강원진학지원센터 등록 예상 등급컷';
export const sampleCutTables: CutTable[] = [3, 6].map(m => ({
  id: `sample-cut-2026-${m}`, source: SOURCE, review_status: 'draft', sample: true,
  exam: `2026년 ${m}월 학력평가(고2)`, version: `2026-${m}학평-v2`, as_of: '2026-11-18', areas,
}));

/** 수시로 카드의 수능 최저 기준(예시). sample 표식 = 모집요강 반영(샘플 모드에서만 판정), 표식 없음 = 교사 입력 · 미검수(판정 안 함). */
export interface MinimumCriterion extends Provenance { university: string; scope: string; rule: string; extra: string; criterion: Criterion }
const all = ['국어', '수학', '영어', '탐구'] as Criterion['areas'];
export const sampleMinimums: MinimumCriterion[] = [
  { id: 'sample-min-khu', source: '샘플 데이터(가상) · 모집요강', review_status: 'draft', sample: true, university: '경희대학교',
    scope: '국·수·영·탐(1과목) 중', rule: '2개 합 3 이내', extra: '수학 포함', criterion: { areas: all, count: 2, sum: 3, required: '수학', history_max: null, tamgu: 'best' } },
  // 한국사 4 이내: 모의고사 화면이 한국사 원점수를 받지 않아(시안 영역 5개) 판정에서 빼요. 시안대로 나머지 기준으로만 충족을 봐요.
  { id: 'sample-min-skku', source: '샘플 데이터(가상) · 모집요강', review_status: 'draft', sample: true, university: '성균관대학교',
    scope: '국·수·영·탐(1과목) 중', rule: '3개 합 7 이내', extra: '한국사 4 이내', criterion: { areas: all, count: 3, sum: 7, required: null, history_max: null, tamgu: 'best' } },
  { id: 'sample-min-dgu', source: '교사 입력', review_status: 'draft', university: '동국대학교',
    scope: '국·수·영·탐 중', rule: '2개 합 5 이내', extra: '', criterion: { areas: all, count: 2, sum: 5, required: null, history_max: null, tamgu: 'best' } },
];
