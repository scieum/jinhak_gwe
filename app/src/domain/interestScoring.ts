import type { ProgramData } from '../data/catalog';
import type { Interest } from './interests';
import { currentUniversityName } from './universityIdentity';
import { reviewed } from '../engine/types';

type Target = Pick<Interest, 'university' | 'program' | 'department'>;
const clean = (s: string) => s.normalize('NFKC').replace(/\s+/g, '');
// Keep campus qualifiers: a rule for another campus must never be substituted.
export const scoringUniversityKey = (s: string) => clean(currentUniversityName(s)).replace(/대학교/g, '대');
const track = (s: string) => s.includes('종합') ? '종합' : s.includes('교과') ? '교과' : '';
const programKey = (s: string) => clean(s).replace(/수시/g, '').replace(/학생부(교과|종합)/g, '').replace(/전형/g, '').replace(/[()[\]{}<>·,]/g, '');
export function sameScoringProgram(a: string, b: string) {
  if (track(a) && track(b) && track(a) !== track(b)) return false;
  return clean(a) === clean(b) || (!!programKey(a) && programKey(a) === programKey(b));
}
const matchesProgram = (p: ProgramData, name: string) => sameScoringProgram(p.program, name)
  || !!p.rule?.publication?.previous_programs?.some(alias => sameScoringProgram(alias, name));

/** Match the saved admission, never another program at the same university. */
export function scoringProgramFor(interest: Target, all: readonly ProgramData[], year: number): { program: ProgramData | null; reason: string } {
  const candidates = all.filter(p => p.admission_year === year
    && scoringUniversityKey(p.university) === scoringUniversityKey(interest.university)
    && matchesProgram(p, interest.program));
  const department = clean(interest.department ?? '');
  const specific = department ? candidates.filter(p => clean(p.department) === department) : [];
  const scoped = specific.length ? specific : candidates.filter(p => !p.department.trim());
  const eligible = scoped.filter(p => p.rule && reviewed(p.rule)
    && p.rule.admission_year === year
    && scoringUniversityKey(p.rule.university) === scoringUniversityKey(interest.university)
    && (sameScoringProgram(p.rule.program, interest.program) || p.rule.publication?.previous_programs?.some(alias => sameScoringProgram(alias, interest.program))));
  if (eligible.length === 1) return { program: eligible[0], reason: '' };
  if (eligible.length > 1) return { program: null, reason: '같은 전형에 환산 규칙이 여러 개라 적용 규칙 확인이 필요해요.' };
  if (!department && candidates.some(p => p.department.trim())) return { program: null, reason: '학과를 고르면 해당 모집단위의 환산 규칙을 확인해요.' };
  return { program: null, reason: `${year}학년도 이 대학·전형의 검수된 환산 규칙이 아직 없어요.` };
}
