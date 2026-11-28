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

// 2026-11-28 사용자 요청: 전형계획 하트는 캠퍼스 없이 '가톨릭대학교'로 저장돼요. 규칙의 university_aliases로 같은 대학을 찾되,
// 이름만으로 캠퍼스를 모를 때는 규칙의 캠퍼스 모집단위(units)에 담은 학과가 있어야 그 캠퍼스 규칙을 써요.
const viaPlanName = (p: ProgramData, interest: Target) => !!p.rule?.publication?.university_aliases?.some(a => scoringUniversityKey(a) === scoringUniversityKey(interest.university));
const sameUniversity = (p: ProgramData, interest: Target, department: string) => {
  const units = p.rule?.publication?.units;
  if (viaPlanName(p, interest)) return !units || (!!department && units.some(u => clean(u) === department));
  return scoringUniversityKey(p.university) === scoringUniversityKey(interest.university);
};
const needsDepartment = (p: ProgramData, interest: Target) => !!p.rule?.publication?.units && viaPlanName(p, interest);

/** Match the saved admission, never another program at the same university. */
export function scoringProgramFor(interest: Target, all: readonly ProgramData[], year: number): { program: ProgramData | null; reason: string } {
  const department = clean(interest.department ?? '');
  const candidates = all.filter(p => p.admission_year === year
    && sameUniversity(p, interest, department)
    && matchesProgram(p, interest.program));
  const specific = department ? candidates.filter(p => clean(p.department) === department) : [];
  const scoped = specific.length ? specific : candidates.filter(p => !p.department.trim());
  const eligible = scoped.filter(p => p.rule && reviewed(p.rule)
    && p.rule.admission_year === year
    && (sameScoringProgram(p.rule.program, interest.program) || p.rule.publication?.previous_programs?.some(alias => sameScoringProgram(alias, interest.program))));
  if (eligible.length === 1) return { program: eligible[0], reason: '' };
  if (eligible.length > 1) return { program: null, reason: '같은 전형에 환산 규칙이 여러 개라 적용 규칙 확인이 필요해요.' };
  if (!department && (candidates.some(p => p.department.trim()) || all.some(p => p.admission_year === year && needsDepartment(p, interest) && matchesProgram(p, interest.program)))) return { program: null, reason: '학과를 고르면 해당 모집단위의 환산 규칙을 확인해요.' };
  return { program: null, reason: `${year}학년도 이 대학·전형의 검수된 환산 규칙이 아직 없어요.` };
}
