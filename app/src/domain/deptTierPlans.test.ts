import { expect, test } from 'vitest';
import type { AdmissionPlan, PlanCatalog } from './admissionPlans';
import { indexTierPlans, plansForTier } from './deptTierPlans';

const plan = (id: string, university: string, campus: string): AdmissionPlan => ({
  id, university, campus, region: '서울', year: 2028, review_status: 'draft', documents: [], notices: [],
  programs: [
    { name: '교과', round: '수시', type: '교과' },
    { name: '종합', round: '수시', type: '학생부종합' },
    { name: '정시 교과', round: '정시', type: '교과' },
  ] as AdmissionPlan['programs'],
});
test('같은 대학의 캠퍼스는 별도로 유지하고 수시 유형만 연결한다', () => {
  const catalog = { entries: [plan('a', '시험대학교', '서울'), plan('b', '시험대학교', '분교'), plan('c', '시험대학교(별도)', '별도')] } as PlanCatalog;
  const index = indexTierPlans(catalog);
  const rows = plansForTier(index, '시험대학교', '교과');
  expect(rows.map(r => r.plan.campus)).toEqual(['서울', '분교']);
  expect(rows.map(r => r.programs.map(p => p.name))).toEqual([['교과'], ['교과']]);
  expect(plansForTier(index, '시험대학교(별도)', '종합').map(r => r.plan.id)).toEqual(['c']);
  expect(plansForTier(index, '시험대', '교과')).toEqual([]);
  expect(plansForTier(indexTierPlans(null), '시험대학교', '교과')).toEqual([]);
});

test('학과 인원은 이름이 정확히 같은 모집단위만, 공동선발은 총원 그대로, 증감은 같은 전형 이름 입결과만', async () => {
  const { quotaDelta, resultQuota, unitPlanQuota } = await import('./deptTierPlans');
  const program = { name: '교과우수', units: [['경영학과', 12, [3]], ['국문과', '약간 명', [4]]], pooled: [{ quota: 30, units: ['자유전공', '인문계열'], pages: [5] }] } as unknown as AdmissionPlan['programs'][number];
  expect(unitPlanQuota(program, '경영학과')).toEqual({ kind: 'unit', quota: 12, pages: [3] });
  expect(unitPlanQuota(program, '경영학부')).toBeNull();
  expect(unitPlanQuota(program, '국문과')?.quota).toBe('약간 명');
  expect(unitPlanQuota(program, '인문계열')).toEqual({ kind: 'pooled', quota: 30, units: 2, pages: [5] });
  const row = (program: string, quota: string, result_year = '2026') => ({ round: '수시', recruit_unit: '경영학과', program, quota, result_year });
  const units = [{ university: '시험대학교', rows: [row('교과 우수', '10'), row('교과우수', '7', '2025'), row('지역균형', '3')] }] as never;
  expect(resultQuota(units, '시험대학교', '경영학과', '교과우수', 2026)).toBe(10);
  expect(resultQuota(units, '시험대학교', '경영학과', '교과우수전형', 2026)).toBeNull();
  expect([quotaDelta(12, 10), quotaDelta(9, 10), quotaDelta(10, 10)]).toEqual(['+2', '−1', '0']);
});
