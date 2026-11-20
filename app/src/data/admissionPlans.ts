import { parsePlanCatalog } from '../domain/admissionPlans';

export async function loadAdmissionPlans() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/admission-plans.json`);
  if (!response.ok) throw new Error('전형계획 자료를 불러오지 못했어요. 다시 시도해 주세요.');
  return parsePlanCatalog(await response.json());
}
