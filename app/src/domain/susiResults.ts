import { parseCollectedIndex, parseCollectedRows, type CollectedEntry } from './collectedResults';
import type { ResultRow } from './resultReview';

export const SUSI_ISSUES: Record<string, string> = {
  different_values_requires_review: '같은 전형·학과·학년도에 다른 값이 있어 원문별 대조가 필요해요.',
  cut_order_requires_review: '50%·70% 컷의 순서와 원문 정렬 기준을 확인해 주세요.',
  aggregate_scope: '학과별 값이 아닌 합계 범위예요.',
  http_source_requires_review: '원문 주소가 HTTP여서 연결 상태를 확인해야 해요.',
  admission_type_unspecified: '원문 전형 유형이 비어 있어요.',
};
type SusiRow = ResultRow & { collectionIssues: string[] };
export const susiIssues = (row: ResultRow): readonly string[] => (row as Partial<SusiRow>).collectionIssues ?? [];
export const susiIssueText = (code: string) => SUSI_ISSUES[code] ?? '자료의 값과 출처를 원문에서 확인해 주세요.';
export function parseSusiIndex(value: unknown) {
  const index = parseCollectedIndex(value);
  const extra = value as { dataset?: string; review_format?: string };
  if (extra.dataset !== 'organized-susi' || extra.review_format !== 'susi-row-review-v1'
    || index.universities.some(e => Object.keys(e.rounds).length !== 1 || e.rounds.수시 !== e.rows)) throw new Error('수시 자료 목록 형식이 올바르지 않아요.');
  return index;
}
export function parseSusiRows(value: unknown, entry: CollectedEntry): ResultRow[] {
  const rows = parseCollectedRows(value, entry);
  const v = value as { review_format?: string; review_codes?: unknown; review_flags?: unknown };
  if (v.review_format !== 'susi-row-review-v1' || !Array.isArray(v.review_codes) || !v.review_codes.every(c => typeof c === 'string')
    || !Array.isArray(v.review_flags) || v.review_flags.length !== rows.length || rows.some(r => r.round !== '수시')) throw new Error('수시 자료의 확인 항목이 올바르지 않아요.');
  const codes = v.review_codes as string[], flags = v.review_flags;
  return rows.map((row, i): SusiRow => {
    const ids = flags[i];
    if (!Array.isArray(ids) || ids.some(n => !Number.isSafeInteger(n) || n < 0 || n >= codes.length)) throw new Error('수시 자료 확인 항목이 손상됐어요.');
    return { ...row, collectionIssues: ids.map(n => codes[n]) };
  });
}
