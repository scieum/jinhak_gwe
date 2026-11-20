import type { GradeRecord } from '../src/domain/student';
import type { ScoringRule } from '../src/engine/scoring';

export const subject = (patch: Partial<GradeRecord> = {}): GradeRecord => ({ id: 'math', name: '대수', subject_group: '수학',
  type: '일반선택', semester: '1-1', credits: 4, rank_grade: 2, is_joint: false, achievement: 'A', ...patch });
// Synthetic rule, not a real university's reviewed policy.
export const scoringRule = (patch: Partial<ScoringRule> = {}): ScoringRule => ({
  id: 'synthetic-test-only', source: 'synthetic fixture', review_status: 'verified', admission_year: 2028,
  university: '테스트 대학', program: '가상 교과', version: 1, semesters: ['1-1', '1-2', '2-1', '3-1'],
  subject_groups: ['국어', '수학', '영어', '사회', '과학'], selection: { mode: 'all' }, credit_weighted: true,
  rank_grade_points: { 1: 100, 2: 96, 3: 90, 4: 80, 5: 60 }, achievement_points: { A: 100, B: 95, C: 90, D: 80, E: 60 },
  achievement_blend: { mode: 'none' }, no_rank_subject_policy: 'exclude', joint_curriculum_policy: 'include',
  grade_max_score: 100, base_score: 0, max_score: 100, rounding: { digits: 2, mode: 'round' }, ...patch,
});
