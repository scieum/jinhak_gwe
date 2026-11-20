import type { CutTable } from '../domain/mock';

export const mockExams = ['2026년 11월 학력평가(고2)', '2027년 3월 학력평가', '2027년 5월 학력평가', '2027년 6월 모의평가', '2027년 7월 학력평가', '2027년 9월 모의평가', '2027년 10월 학력평가', '2028학년도 수능'] as const;
// Reviewed expected-cut tables (version, as-of date, source) are added by the data release process. None is reviewed yet.
export const cutTables: readonly CutTable[] = [];
