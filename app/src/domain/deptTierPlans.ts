import type { AdmissionPlan, PlanCatalog, PlanProgram } from './admissionPlans';
import type { ReleasedUnit } from './resultReview';
import { currentUniversityName } from './universityIdentity';
import type { TierType } from './deptTier';

const identity = (name: string) => currentUniversityName(name).normalize('NFKC').replace(/\s/g, '');

/** 대학명 별칭만 정규화한다. 학과·캠퍼스·전형명은 추측해 대응시키지 않는다. */
export function indexTierPlans(catalog: PlanCatalog | null) {
  const index = new Map<string, AdmissionPlan[]>();
  for (const plan of catalog?.entries ?? []) {
    const key = identity(plan.university);
    index.set(key, [...index.get(key) ?? [], plan]);
  }
  return index;
}
export function plansForTier(index: Map<string, AdmissionPlan[]>, university: string, type: TierType) {
  return (index.get(identity(university)) ?? []).map(plan => ({
    plan,
    programs: plan.programs.filter(p => p.round === '수시' && p.type.replace(/\s|학생부/g, '') === type),
  }));
}

/** 이 모집단위의 2028 인원. 모집단위 이름이 정확히 같은 것만(별칭 · 이름 바뀜 추정 없음). 공동선발은 총원 그대로. */
export function unitPlanQuota(program: PlanProgram, unit: string) {
  const row = program.units?.find(([name]) => name === unit);
  if (row) return { kind: 'unit' as const, quota: row[1], pages: row[2] };
  const pool = program.pooled?.find(p => p.units.includes(unit));
  return pool ? { kind: 'pooled' as const, quota: pool.quota, units: pool.units.length, pages: pool.pages } : null;
}
/** 비교 기준 = 같은 대학 · 모집단위 · 학년도 · 전형 이름(공백만 무시하고 정확히 같은)의 입결 행 모집인원. 값이 둘 이상으로 갈리면 비교하지 않는다. */
export function resultQuota(units: readonly ReleasedUnit[], university: string, unit: string, program: string, year: number) {
  const key = (s: string) => s.normalize('NFKC').replace(/\s/g, '');
  const found = new Set(units.filter(u => u.university === university).flatMap(u => u.rows)
    .filter(r => r.round === '수시' && r.recruit_unit === unit && r.result_year === String(year) && key(r.program) === key(program) && /^\d+$/.test(r.quota))
    .map(r => Number(r.quota)));
  return found.size === 1 ? [...found][0] : null;
}
/** 대학별 환산 화면과 같은 표기: +2 · −1 · 0 (유니코드 마이너스) */
export const quotaDelta = (now: number, before: number) => now > before ? `+${now - before}` : now < before ? `−${before - now}` : '0';
