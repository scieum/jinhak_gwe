// 성적 추이 샘플(score-trend 상세 시안 346:277667 데모, demo-dataset "7번 하늘" 모의고사 3·6·9·10월). 실제 성적이 아니에요.
// 3·6월은 모의고사 화면 샘플(mockScore.ts, 저장됨)을 그대로 쓰고, 9·10월은 이 화면에서 샘플 모드일 때만 덧붙여 보여요.
// 저장하지 않는 이유: 저장하면 모의고사 화면 기본 시험이 10월로 바뀌어 그 화면 시안(6월)과 달라져요.
// 등급은 mockScore.ts의 sample 표식 예시 등급컷(9·10월 포함)으로 읽어요 — 국 3·3 / 수 2·2 / 영 1·2 / 탐구1 3·3 / 탐구2 3·3.
import type { MockScore } from '../../domain/mock';
import { SAMPLE_STAMP } from './student';

export const sampleTrendMocks: MockScore[] = [
  { exam: '2026년 9월 학력평가(고2)', raw: { 국어: 80, 수학: 85, 영어: 92, 탐구1: 40, 탐구2: 39 }, updated_at: SAMPLE_STAMP },
  { exam: '2026년 10월 학력평가(고2)', raw: { 국어: 79, 수학: 83, 영어: 86, 탐구1: 41, 탐구2: 38 }, updated_at: SAMPLE_STAMP },
];
