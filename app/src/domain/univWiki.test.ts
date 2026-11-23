import { describe, expect, test } from 'vitest';
import { RESULT_COLUMNS, type ReleasedUnit, type ResultRow } from './resultReview';
import { departmentsOf, parseWiki, signed, similarUniversities, type FieldRow } from './univWiki';

const approvals = [{ reviewer: 'a', at: '2026-11-16' }, { reviewer: 'b', at: '2026-11-16' }];
const row = (university: string, unit: string, cut: string, type = '교과', year = '2026'): ResultRow => ({
  ...Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])) as ResultRow,
  university, result_year: year, round: '수시', admission_type: type, program: `학생부${type}`, recruit_unit: unit, cut_70: cut, metric: '교과등급',
});
const unit = (university: string, rows: ResultRow[]): ReleasedUnit => ({ university, year: 2026, source_url: 'https://x.ac.kr', license: 'allowed', approvals, rows });
// 시험용 가상 값(spec 1절 예시와 같은 숫자)
const units = [
  unit('경희대학교', [row('경희대학교', '행정학과', '3.1'), row('경희대학교', '정치외교학과', '2.6')]),
  unit('건국대학교', [row('건국대학교', '행정학과', '3.2')]),
  unit('동국대학교', [row('동국대학교', '행정학과', '2.8')]),
  unit('성균관대학교', [row('성균관대학교', '행정학과', '2.7')]),
  unit('한양대학교', [row('한양대학교', '정책학과', '2.5')]),
  unit('중앙대학교', [row('중앙대학교', '공공인재학부', '2.4'), row('중앙대학교', '행정학과', '3.0', '종합')]),
];
const fields: FieldRow[] = [
  ...['경희대학교', '건국대학교', '동국대학교', '성균관대학교', '중앙대학교'].map(university => ({ university, unit: '행정학과', small: '행정·정책', mid: '사회과학' })),
  { university: '중앙대학교', unit: '공공인재학부', small: '행정·정책', mid: '사회과학' },
  { university: '한양대학교', unit: '정책학과', small: '행정·정책', mid: '사회과학' },
  { university: '경희대학교', unit: '정치외교학과', small: '정치·외교', mid: '사회과학' },
];
const base = (u: string, d: string) => departmentsOf(units, u).find(x => x.unit === d)!;

describe('similarUniversities', () => {
  test('경희 행정 3.1 → 건국 +0.1, 동국 −0.3, 성균관 −0.4 (범위 밖·같은 대학·다른 전형 제외)', () => {
    const r = similarUniversities(units, fields, '경희대학교', base('경희대학교', '행정학과'));
    expect(r.status).toBe('ok');
    if (r.status === 'pending') return;
    expect(r.rows.map(x => [x.university, signed(x.diff), x.relation])).toEqual([
      ['건국대학교', '+0.1', '같은 계열'], ['동국대학교', '−0.3', '같은 계열'], ['성균관대학교', '−0.4', '같은 계열']]);
    expect(r.outside.map(x => signed(x.diff))).toEqual(['−0.6', '−0.7']);
  });
  test('정치외교 2.6 → 관련 계열 4곳, 차이 작은 순', () => {
    const r = similarUniversities(units, fields, '경희대학교', base('경희대학교', '정치외교학과'));
    if (r.status === 'pending') throw new Error('pending');
    expect(r.rows.map(x => `${x.university} ${signed(x.diff)} ${x.relation}`)).toEqual([
      '성균관대학교 +0.1 관련 계열', '한양대학교 −0.1 관련 계열', '동국대학교 +0.2 관련 계열', '중앙대학교 −0.2 관련 계열']);
  });
  test('3개 미만이면 자료 부족, 계열 미검수면 준비 중', () => {
    expect(similarUniversities(units.slice(0, 3), fields, '경희대학교', base('경희대학교', '행정학과')).status).toBe('short');
    expect(similarUniversities(units, fields.slice(1), '경희대학교', base('경희대학교', '행정학과')).status).toBe('pending');
  });
});

describe('parseWiki', () => {
  const item = { text: '지역균형전형 모집 인원이 늘었어요', source_label: '2028 시행계획 4쪽', source_url: 'https://x.ac.kr/plan.pdf' };
  test('검수자 2명 미만·출처 없는 섹션은 버린다', () => {
    const wiki = parseWiki({ format: 'jinhak-navi-univ-wiki', version: 1, fields: { reviewed_at: '2026-11-16', approvals: approvals.slice(0, 1), rows: fields },
      entries: [{ university: '경희대학교', sections: {
        notes: { reviewed_at: '2026-11-16', approvals, items: [item] },
        method: { reviewed_at: '2026-11-16', approvals: approvals.slice(0, 1), items: [item] },
        minimum: { reviewed_at: '2026-11-16', approvals, items: [{ ...item, source_url: 'http://x' }] } } }] });
    expect(Object.keys(wiki.sections.get('경희대학교')!)).toEqual(['notes']);
    expect(wiki.fields).toEqual([]);
  });
  test('형식이 다르면 빈 위키', () => expect(parseWiki(null).sections.size).toBe(0));
});
