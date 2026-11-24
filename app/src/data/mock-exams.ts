import { reviewed } from '../engine/types';
import type { CutTable } from '../domain/mock';
import { sampleCutTables } from './sample/mockScore';

export const mockExams = ['2026년 3월 학력평가(고2)', '2026년 6월 학력평가(고2)', '2026년 9월 학력평가(고2)', '2026년 10월 학력평가(고2)', '2026년 11월 학력평가(고2)', '2027년 3월 학력평가', '2027년 5월 학력평가', '2027년 6월 모의평가', '2027년 7월 학력평가', '2027년 9월 모의평가', '2027년 10월 학력평가', '2028학년도 수능'] as const;
// Reviewed expected-cut tables (version, as-of date, source) are added by the data release process. None is reviewed yet.
export const cutTables: readonly CutTable[] = [];
/** 이 시험에 지금 읽을 수 있는 등급컷. 샘플 표(sample 표식)는 샘플 모드에서만 통과해요(NEVER-1). */
export const cutTableFor = (exam: string) => [...cutTables, ...sampleCutTables].find(t => t.exam === exam && reviewed(t));
