import { useEffect, useState } from 'react';
import { sameScoringProgram, scoringUniversityKey } from '../domain/interestScoring';
import type { Interest } from '../domain/interests';

interface Coverage { university: string; program: string; admission_year: number; status: string; missing: string[]; source: string }
let cache: Promise<Coverage[]> | null = null;
export function useScoringCoverage() {
  const [rows, setRows] = useState<Coverage[]>([]);
  useEffect(() => {
    let live = true;
    cache ??= fetch(`${import.meta.env.BASE_URL}data/scoring-coverage.json`).then(r => r.ok ? r.json() : null).then(v =>
      v?.format === 'jinhak-navi-scoring-coverage' && v.version === 1 && Array.isArray(v.entries)
        ? v.entries.filter((r: Coverage) => r && typeof r.university === 'string' && typeof r.program === 'string'
          && Number.isInteger(r.admission_year) && Array.isArray(r.missing) && r.missing.every(x => typeof x === 'string')) : []).catch(() => []);
    cache.then(value => { if (live) setRows(value); });
    return () => { live = false; };
  }, []);
  return rows;
}
export function coverageReason(rows: readonly Coverage[], interest: Interest, year: number): string | null {
  if (interest.program.includes('종합')) return '학생부종합은 서류·면접 등을 함께 평가해 교과 성적만으로 전형 총점을 산출할 수 없어요.';
  const found = rows.filter(r => r.admission_year === year && scoringUniversityKey(r.university) === scoringUniversityKey(interest.university) && sameScoringProgram(r.program, interest.program));
  if (found.length !== 1) return null;
  const r = found[0];
  if (r.missing.some(m => m.startsWith('rank_grade_points'))) return '이 전형의 2028학년도 등급별 환산점수표가 확인되지 않았어요. 모집요강의 점수표가 필요해요.';
  if (r.status === 'not_applicable') return '이 전형은 교과 성적을 정량 점수로 환산하지 않아요.';
  if (r.status === 'complete') return '원문 초안은 수집했으며, 적용 조건과 계산식을 대조하고 있어요.';
  return '반영 과목·배점·출결 등 환산에 필요한 규정을 확인하고 있어요.';
}
