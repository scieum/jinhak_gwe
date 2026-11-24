// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { parseCollectedIndex, parseCollectedRows } from '../src/domain/collectedResults';
import { defaultPlacementFilters, filterNationalRows, gradeCoordinate, parseNationalIndex, parseNationalRows, placementBounds, placementCoverage, PLACEMENT_FIELDS, pointLanes, STATISTIC_LABELS, universityPoints, type NationalPlacementRow } from '../src/domain/nationalPlacement';

const read = (path: string) => readFileSync(new URL(`../public/data/${path}`, import.meta.url));
const collection = parseCollectedIndex(JSON.parse(read('collected-results/index.json').toString('utf8')));
const index = parseNationalIndex(JSON.parse(read('national-placement/index.json').toString('utf8')), collection);

test('전국 수집 행을 하나도 빠뜨리지 않고 연결하며 추가 통계의 근거도 원문과 일치한다', () => {
  const sources = new Map(collection.universities.map(e => [e.university, parseCollectedRows(JSON.parse(read(`collected-results/${e.file}`).toString('utf8')), e)]));
  let total = 0;
  for (const year of index.years) {
    const bytes = read(`national-placement/${year.file}`), payload = JSON.parse(bytes.toString('utf8'));
    expect(bytes.byteLength).toBe(year.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(year.sha256);
    const rows = parseNationalRows(payload, year, collection), mismatches: string[] = [];
    for (const r of rows) {
      const original = sources.get(r.university)![r.sourceRow];
      if (original.result_year !== year.year || PLACEMENT_FIELDS.some(f => original[f] !== r[f])) mismatches.push(r.id);
      for (const statistic of Object.values(r.statistics ?? {})) {
        if (original.grade_system !== '9' || !['교과등급', '수능등급'].includes(original.metric)
          || !original.cut_other.includes(statistic.evidence) || gradeCoordinate(statistic.value) === null) mismatches.push(r.id);
      }
    }
    expect(mismatches).toEqual([]);
    const eligible = [...sources].flatMap(([university, original]) => original.flatMap((r, sourceRow) =>
      r.result_year === year.year ? [`${university}:${sourceRow}`] : []));
    expect(rows.map(r => r.id).sort()).toEqual(eligible.sort());
    expect(payload.status).toBe('draft');
    total += rows.length;
  }
  expect(total).toBe(collection.rows);
});

test('잘못된 원본 연결과 좌표 데이터 변조를 거부한다', () => {
  expect(() => parseNationalIndex({ ...index, collection_sha256: '0'.repeat(64) }, collection)).toThrow();
  const year = index.years[0], original = JSON.parse(read(`national-placement/${year.file}`).toString('utf8'));
  for (const mutate of [
    (v: typeof original) => { v.status = 'verified'; },
    (v: typeof original) => { v.rows[0][0] = -1; },
    (v: typeof original) => { v.rows[1] = [...v.rows[0]]; },
    (v: typeof original) => { v.sources = {}; },
    (v: typeof original) => { v.rows[0][1] = v.strings.length; },
    (v: typeof original) => { v.statistics[0][1] = 'cut_70'; },
    (v: typeof original) => { v.statistics[0][2] = -1; },
    (v: typeof original) => { v.statistics.push([...v.statistics[0]]); },
  ]) { const value = structuredClone(original); mutate(value); expect(() => parseNationalRows(value, year, collection)).toThrow(); }
});

const row = (o: Partial<NationalPlacementRow> = {}): NationalPlacementRow => ({ id: 'a', sourceRow: 0, year: '2026', university: '가상대', recruit_unit: '가상학과', program: '교과전형', admission_type: '교과', round: '수시', metric: '교과등급', grade_system: '9', basis: '테스트 기준', cut_50: '2.100', cut_70: '2.400', ...o });

test('모든 수집 대학을 연도·좌표 유무와 무관하게 연결하고 통계를 섞지 않는다', () => {
  const year = index.years[0], rows = parseNationalRows(JSON.parse(read(`national-placement/${year.file}`).toString('utf8')), year, collection);
  const coverage = placementCoverage(collection, rows, defaultPlacementFilters);
  expect(coverage.map(entry => entry.university).sort()).toEqual(collection.universities.map(entry => entry.university).sort());
  expect(coverage.reduce((sum, entry) => sum + entry.yearRows, 0)).toBe(year.rows);
  const halla = coverage.find(entry => entry.university === '한라대학교')!;
  expect(halla.visible).toBe(0);
  expect(halla.available.some(item => item.cut === 'cut_75')).toBe(true);
  expect(filterNationalRows(rows, { ...defaultPlacementFilters, university: '한라', cut: 'cut_75' }).length).toBeGreaterThan(0);
  expect(filterNationalRows(rows, { ...defaultPlacementFilters, university: '강원대학교', cut: 'cut_50' }).length).toBeGreaterThan(0);
  for (const cut of Object.keys(STATISTIC_LABELS) as (keyof typeof STATISTIC_LABELS)[]) {
    expect(filterNationalRows(rows, { ...defaultPlacementFilters, cut }).every(r => r.grade_system === '9' && r.metric === '교과등급')).toBe(true);
  }
});

test('지표·컷·등급 범위·전형을 분리하고 컷이 없는 자료나 잘못된 범위를 그리지 않는다', () => {
  const rows = [row(), row({ id: 'b', metric: '수능등급' }), row({ id: 'c', cut_70: '', cut_50: '2.2' }), row({ id: 'd', cut_70: '10' }), row({ id: 'e', round: '정시' })];
  expect(filterNationalRows(rows, defaultPlacementFilters).map(r => r.id)).toEqual(['a']);
  expect(filterNationalRows(rows, { ...defaultPlacementFilters, cut: 'cut_50', min: '2.2' }).map(r => r.id)).toEqual(['c']);
  expect(filterNationalRows(rows, { ...defaultPlacementFilters, metric: '수능등급' }).map(r => r.id)).toEqual(['b']);
  expect(filterNationalRows(rows, { ...defaultPlacementFilters, round: '정시' }).map(r => r.id)).toEqual(['e']);
  expect(filterNationalRows(rows, { ...defaultPlacementFilters, university: '없는대학' })).toEqual([]);
  expect(placementBounds({ ...defaultPlacementFilters, min: '3', max: '2' })).toBeNull();
  expect(placementBounds({ ...defaultPlacementFilters, min: '' })).toBeNull();
  expect(gradeCoordinate('3.5(평균)')).toBeNull();
  expect(filterNationalRows([row({ grade_system: '' })], defaultPlacementFilters)).toEqual([]);
});

test('같은 대학·값의 출처는 보존하고 겹친 점의 가로 좌표는 바꾸지 않는다', () => {
  const groups = universityPoints([row(), row({ id: 'b', cut_70: '2.4' }), row({ id: 'c', cut_70: '2.401' }), row({ id: 'd', university: '나대' })], 'cut_70');
  expect(groups).toHaveLength(2);
  expect(groups[0].points[0].records.map(r => r.id)).toEqual(['a', 'b']);
  const lanes = pointLanes(groups[0].points);
  expect(lanes[0].lane).not.toBe(lanes[1].lane);
  expect(lanes[0].x).toBeCloseTo(16 + (2.4 - 1) / 8 * 688);
  expect(lanes[1].x).toBeCloseTo(16 + (2.401 - 1) / 8 * 688);
  expect(groups[0].points[0].records[0].cut_70).toBe('2.400');
});

test('넓어진 그래프는 실제 트랙 너비로 좌표와 겹침을 다시 계산한다', () => {
  const points = universityPoints([row(), row({ id: 'b', cut_70: '2.6' }), row({ id: 'c', cut_70: '1' }), row({ id: 'd', cut_70: '9' })], 'cut_70')[0].points;
  const narrow = pointLanes(points), wide = pointLanes(points, 1440);
  expect(narrow[1].lane).not.toBe(narrow[2].lane);
  expect(wide[1].lane).toBe(wide[2].lane);
  expect(wide[0].x).toBe(16);
  expect(wide[1].x).toBeCloseTo(16 + (2.4 - 1) / 8 * (1440 - 32));
  expect(wide[3].x).toBe(1440 - 16);
});

test('전형 유형 탭 기타는 교과·종합·논술이 아닌 유형(실기 등)을 묶는다', () => {
  const rows = [row(), row({ id: 'b', admission_type: '실기' }), row({ id: 'c', admission_type: '논술' })];
  expect(filterNationalRows(rows, { ...defaultPlacementFilters, type: '기타' }).map(r => r.id)).toEqual(['b']);
  expect(filterNationalRows(rows, { ...defaultPlacementFilters, type: '논술' }).map(r => r.id)).toEqual(['c']);
});
