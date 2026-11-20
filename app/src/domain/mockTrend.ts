import { AREAS, readGrade, type CutTable, type MockScore } from './mock';

/** Exam order comes from the catalog, never from the time a score was edited. */
export function mockTrend(scores: readonly MockScore[], tables: readonly CutTable[], examOrder: readonly string[]) {
  return scores.filter(score => AREAS.some(a => score.raw[a.key] !== undefined))
    .map(score => ({
      ...score,
      order: examOrder.indexOf(score.exam),
      areas: AREAS.map(({ key, max }) => ({
        key, max, raw: score.raw[key],
        grade: readGrade(score.raw[key], key, tables.find(t => t.exam === score.exam)),
      })),
    }))
    .sort((a, b) => (a.order < 0 ? Infinity : a.order) - (b.order < 0 ? Infinity : b.order) || a.exam.localeCompare(b.exam, 'ko'));
}
