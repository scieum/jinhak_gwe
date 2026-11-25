import { parsePlanCatalog, withPlanFoundings } from '../domain/admissionPlans';
import { parseUnivMap } from '../domain/univMap';

export async function loadAdmissionPlans() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/admission-plans.json`);
  if (!response.ok) throw new Error('전형계획 자료를 불러오지 못했어요. 다시 시도해 주세요.');
  const catalog = parsePlanCatalog(await response.json());
  const campuses = await fetch(`${import.meta.env.BASE_URL}data/univ-map.json`)
    .then(r => r.ok ? r.json() : null).then(value => parseUnivMap(value).campuses).catch(() => []);
  return withPlanFoundings(catalog, campuses);
}
