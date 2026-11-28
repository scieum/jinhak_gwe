import type { Interest } from './interests';
import type { ReferenceCut } from './interestComparison';
import { referenceConversion, referenceModelRelease } from './referenceConversion';
import { validateGrade, type GradeRecord } from './student';
import type { ScoringRule, ScoreResult } from '../engine/scoring';
import type { Calculation } from '../engine/types';

/** User-authorized reference policy (2026-11-28), NOT an official admission judgment. */
export const REFERENCE_POLICY = {
  version: 'reference-cut-v1', thresholds: [-0.3, 0.1, 0.4] as const,
  description: '참고 구간: 보수 쪽 추정등급 − 70% 컷이 −0.3 이하 안정, 0.1 이하 적정, 0.4 이하 소신, 그 밖 위험. 합격 여부를 예측하지 않는 자체 비교 기준이에요.',
};
export type ReferenceLabel = '안정' | '적정' | '소신' | '위험';
export type ReferenceAssessment = { status: 'pending'; reason: string } | {
  status: 'ready'; min: number; max: number; average5: number; subjects: number; scope: string;
  label: ReferenceLabel | null; favorableLabel: ReferenceLabel | null; boundary: boolean;
  position: string; difference: number; modelVersion: string; limitations: string[];
};

export function referenceAssessment(grades: readonly GradeRecord[], interest: Interest, ref: ReferenceCut | null | undefined,
  rule?: ScoringRule | null, score?: Calculation<ScoreResult> | null): ReferenceAssessment {
  if (!ref || !('value' in ref)) return { status: 'pending', reason: ref && 'reason' in ref ? ref.reason : '비교할 입결을 불러오는 중이에요.' };
  if (ref.row.grade_system !== '9' || ref.row.metric !== '교과등급' || ref.row.round !== '수시') return { status: 'pending', reason: '수시 9등급 교과 입결만 참고 판정에 사용해요.' };
  const selected = score?.status === 'ready' ? score.value.selected_ids : score?.trace.filter(t => t.subject_id && t.value !== undefined).map(t => t.subject_id!) ?? [];
  const hasSelection = !!rule && selected.length > 0;
  const ranked = grades.filter(g => !validateGrade(g).length && g.rank_grade !== null && !(g.enrolled_count !== undefined && g.enrolled_count <= 5)
    && (!hasSelection || selected.includes(g.id)));
  if (!ranked.length) return { status: 'pending', reason: '석차등급이 있는 성적을 입력하면 참고 판정을 볼 수 있어요.' };
  // This is explicitly a selected-subject credit average, not the university's point formula.
  const credits = ranked.reduce((sum, g) => sum + g.credits, 0);
  const average5 = ranked.reduce((sum, g) => sum + g.rank_grade! * g.credits, 0) / credits;
  const model = referenceConversion(average5, ranked.every(g => g.rank_grade === 1) ? 'exact_all_one' : 'rounded_average');
  if (!model?.grade9Range) return { status: 'pending', reason: '이 성적 구간은 참고 환산 자료가 부족해 판정하지 않아요.' };
  const [min, max] = model.grade9Range;
  const comprehensive = interest.program.includes('종합') || ref.row.admission_type === '종합' || ref.row.program.includes('종합');
  const classify = (v: number): ReferenceLabel => {
    const index = REFERENCE_POLICY.thresholds.findIndex(t => v <= ref.value + t + 1e-12);
    return (['안정', '적정', '소신', '위험'] as const)[index < 0 ? 3 : index];
  };
  const label = !comprehensive && ref.cut === 'cut_70' ? classify(max) : null;
  const favorableLabel = label ? classify(min) : null;
  return { status: 'ready', min, max, average5, subjects: ranked.length,
    scope: `${hasSelection ? '대학 규칙에서 선택된 과목' : '입력한 전 교과'} · 학점 가중평균`,
    label, favorableLabel, boundary: label !== favorableLabel,
    position: max < ref.value ? '추정 범위가 과거 컷보다 낮아요' : min > ref.value ? '추정 범위가 과거 컷보다 높아요' : '과거 컷이 추정 범위 안에 있어요',
    difference: max - ref.value, modelVersion: referenceModelRelease.version,
    limitations: [
      hasSelection ? '선택 과목의 5등급 평균을 참고 환산했어요. 대학별 점수표·성취도·학년별 가중치를 재현한 등급은 아니에요.' : '대학별 반영 방식이 확인되지 않아 전 교과 평균을 사용했어요. 대학별 환산점수와 구분해 주세요.',
      `${ref.year}학년도 입결과 현재 성적은 교육과정·모집단이 달라요. 지원 결과를 예측하지 않아요.`,
      ...(comprehensive ? ['학생부종합은 교과 위치만 비교해요. 서류·면접을 포함한 전형 적합도는 판정하지 않아요.'] : []),
      ...(ref.cut === 'cut_50' ? ['70% 컷이 없어 50% 컷과 위치만 비교해요. 안정·적정·소신·위험 구간은 적용하지 않아요.'] : []),
    ] };
}
