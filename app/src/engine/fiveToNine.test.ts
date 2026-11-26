import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { actualBand, ceil1, convertFiveToNine, floor1, pctToG9, rawScoreToPct, uniformBand, type SubjectCombo } from './fiveToNine';
import type { ConversionConfig, ConversionTable, GradeSet, Subject } from './fiveToNineTypes';

const load = (f: string) => JSON.parse(readFileSync(resolve(process.cwd(), 'src/data', f), 'utf8'));
const baseCfg: ConversionConfig = load('conversion-config.json');
const tables: ConversionTable[] = load('sample-conversion-tables.json').tables;
const withRules = (ids: string[]): ConversionConfig => ({
  ...baseCfg,
  rules: { ...baseCfg.rules, ...Object.fromEntries(ids.map((id) => [id, { review_status: 'verified' as const }])) },
});
const cfg010 = withRules(['R-CONV-010']);

const sub = (p: Partial<Subject>): Subject => ({ name: '과목', group: '국어', type: '일반선택', credits: 1, ...p });

// v3.2-1 가상 학생: 3개 학기, 학점 비중 = 1등급 · 2등급(수강자 많음) · 2등급(수강자 13명)
function student(combo: SubjectCombo, shares: [number, number, number]): GradeSet {
  const group = { '전 교과': '국어', 국수영사과: '수학', 국수영사: '사회', 국수영과: '과학' }[combo];
  // 조합 밖 교과(5등급)가 섞여 있어도 걸러져야 한다
  const outside = { '전 교과': [], 국수영사과: ['정보'], 국수영사: ['정보', '과학'], 국수영과: ['정보', '사회'] }[combo];
  const noise = outside.map((g) => sub({ group: g, grade5: 5, credits: 3 }));
  return {
    '1-1': [sub({ group, grade5: 1, credits: shares[0] }), sub({ group: '체육', type: '체육예술', credits: 2 })],
    '1-2': [sub({ group, grade5: 2, credits: shares[1] }), ...noise],
    '2-1': [sub({ group, grade5: 2, credits: shares[2], enrolled: 13 })],
  };
}

const spec: [SubjectCombo, [number, number, number], number, number, number, number, [number, number], number][] = [
  // 조합, 학점 비중, g5, A-1, A-2, B, 표시 범위, 대표값. B는 독립 가상 직선 y=1.8x-0.2.
  ['전 교과', [69, 25, 6], 1.31, 2.2916, 2.0918, 2.1580, [2.0, 2.3], 2.1580],
  ['국수영사과', [76, 19, 5], 1.24, 2.1663, 1.9678, 2.0320, [1.9, 2.2], 2.0320],
  ['국수영사', [65, 30, 5], 1.35, 2.3632, 2.1657, 2.2300, [2.1, 2.4], 2.2300],
  ['국수영과', [82, 14, 4], 1.18, 2.0589, 1.8617, 1.9240, [1.8, 2.1], 1.9240],
];

describe('기존 A 방식 검산과 독립 가상 B 보간 (±0.001)', () => {
  test.each(spec)('%s', (combo, shares, g5, a1, a2, b, disp, rep) => {
    const r = convertFiveToNine(student(combo, shares), combo, cfg010, tables);
    expect(r.g5).toBeCloseTo(g5, 6);
    expect(r.a1).toMatchObject({ status: 'ok' });
    expect(r.a1.status === 'ok' && r.a1.value).toBeCloseTo(a1, 3);
    expect(r.a2.status === 'ok' && r.a2.value).toBeCloseTo(a2, 3);
    expect(r.b.status === 'ok' && r.b.value).toBeCloseTo(b, 3);
    expect(r.a3.status).toBe('pending');
    expect(r.display).toEqual({ min: disp[0], max: disp[1] });
    expect(r.representative!).toBeCloseTo(rep, 3);
    expect(r.semesters).toBe(3);
    expect(r.bTable?.semesterMismatch).toBe(false);
  });

  test('B 허락 전이면 A-1 · A-2 평균이 대표값 (v3.2-7)', () => {
    const r = convertFiveToNine(student('전 교과', [69, 25, 6]), '전 교과', cfg010, tables.filter((t) => t.license_status !== 'allowed'));
    expect(r.b).toEqual({ status: 'pending', reason: '실측표 사용 허락 확인 중이에요' });
    expect(r.representative!).toBeCloseTo(2.1917, 3);
    expect(r.display).toEqual({ min: 2.0, max: 2.3 });
  });

  test('수강자 13명 2등급 실제 구간 7.69~30.77% (시행지침 반올림)', () => {
    const [lo, hi] = actualBand(2, 13, baseCfg);
    expect(lo).toBeCloseTo(100 / 13, 6);
    expect(hi).toBeCloseTo(400 / 13, 6);
  });

  test('R-CONV-010 검수 전이면 명목 누적비로 A-2 (보정 전 2.1033)', () => {
    const r = convertFiveToNine(student('전 교과', [69, 25, 6]), '전 교과', baseCfg, tables);
    expect(r.a2.status === 'ok' && r.a2.value).toBeCloseTo(2.1033, 3);
  });
});

describe('NEVER-1 · 제외 · 고정', () => {
  test('검수 전 규칙은 숫자 없이 pending', () => {
    const cfg: ConversionConfig = { ...baseCfg, rules: {} };
    const r = convertFiveToNine(student('전 교과', [69, 25, 6]), '전 교과', cfg, []);
    expect(r.a1.status).toBe('pending');
    expect(r.a2.status).toBe('pending');
    expect(r.a3.status).toBe('pending');
    expect(r.min).toBeNull();
    expect(r.display).toBeNull();
  });

  test('검수 전 실측표는 허락돼 있어도 쓰지 않는다', () => {
    const t = { ...tables[0], review_status: 'pending' as const };
    const r = convertFiveToNine(student('전 교과', [69, 25, 6]), '전 교과', cfg010, [t]);
    expect(r.b).toEqual({ status: 'pending', reason: '실측표 검수 전이에요' });
  });

  test('9등급 값은 1.0 ~ 9.0으로 고정', () => {
    expect(pctToG9(0, baseCfg)).toBe(1);
    expect(pctToG9(100, baseCfg)).toBe(9);
  });

  test('수강자 5명 이하 · 석차등급 미산출은 환산에서 빼고 신뢰도에만', () => {
    const g: GradeSet = {
      '1-1': [
        sub({ grade5: 1, credits: 4 }),
        sub({ grade5: 5, credits: 4, enrolled: 5 }),
        sub({ type: '융합선택', grade5: null, credits: 2, achievement: 'A' }),
      ],
    };
    const r = convertFiveToNine(g, '전 교과', cfg010, []);
    expect(r.g5).toBe(1);
    expect(r.stats).toMatchObject({ rankedCount: 1, excludedCount: 2, smallCount: 2 });
    expect(r.trace.find((s) => s.id === 'excluded')?.value).toBe(2);
  });

  test('석차등급 과목이 없으면 unavailable · 신뢰도 낮음', () => {
    const r = convertFiveToNine({ '1-1': [sub({ type: '교양', credits: 1 })] }, '전 교과', cfg010, tables);
    expect(r.a1.status).toBe('unavailable');
    expect(r.confidence).toBe('낮음');
  });
});

describe('B 학기 기준 · 신뢰도', () => {
  test('같은 학기 표가 없으면 가장 가까운 표 + 신뢰도 한 단계 낮춤', () => {
    const many = (sems: number): GradeSet =>
      Object.fromEntries((['1-1', '1-2', '2-1', '2-2'] as const).slice(0, sems).map((k) => [k, Array.from({ length: 4 }, () => sub({ grade5: 2, credits: 3 }))]));
    const same = convertFiveToNine(many(3), '전 교과', cfg010, tables);
    const diff = convertFiveToNine(many(4), '전 교과', cfg010, tables);
    expect(same.bTable?.semesterMismatch).toBe(false);
    expect(diff.bTable?.semesterMismatch).toBe(true);
    expect(same.confidence).toBe('높음');
    expect(diff.confidence).toBe('보통');
    expect(diff.trace.find((s) => s.id === 'b')?.note).toContain('가장 가까운 표');
  });

  test('바깥쪽 반올림: 1.97 → 1.9, 2.0은 그대로', () => {
    expect(floor1(1.9728)).toBe(1.9);
    expect(floor1(2.0)).toBe(2.0);
    expect(ceil1(2.2916)).toBe(2.3);
    expect(ceil1(2.3)).toBe(2.3);
  });
});

describe('A-3 분포비율 보정 (R-CONV-011)', () => {
  const d = { A: 15, B: 25, C: 30, D: 20, E: 10 };
  test('원점수 85 → 90점(15%)과 80점(40%) 사이 27.5%', () => {
    expect(rawScoreToPct(85, d)).toBeCloseTo(27.5, 6);
  });

  test('검수 전엔 pending, 검수 뒤엔 석차등급 구간 안으로 자른다', () => {
    const g: GradeSet = { '1-1': [sub({ grade5: 1, credits: 1, rawScore: 99, distribution: d, fixedCutoff: true })] };
    expect(convertFiveToNine(g, '전 교과', cfg010).a3.status).toBe('pending');
    const r = convertFiveToNine(g, '전 교과', withRules(['R-CONV-010', 'R-CONV-011']));
    // 99점 → 누적 1.5% → 1등급 구간(0~10%) 안 → 9등급 1.0으로 고정
    expect(r.a3).toEqual({ status: 'ok', value: 1 });
    const clipped = convertFiveToNine({ '1-1': [sub({ grade5: 2, credits: 1, rawScore: 99, distribution: d, fixedCutoff: true })] },
      '전 교과', withRules(['R-CONV-011']));
    // 2등급인데 1.5%로 나와도 2등급 구간 아래 끝 10%로 자른다
    expect(clipped.a3.status === 'ok' && clipped.a3.value).toBeCloseTo(pctToG9(10, baseCfg), 6);
  });

  test('고정분할 과목이 없으면 unavailable', () => {
    const r = convertFiveToNine({ '1-1': [sub({ grade5: 1, rawScore: 99, distribution: d })] }, '전 교과', withRules(['R-CONV-011']));
    expect(r.a3.status).toBe('unavailable');
  });
});

describe('후보 방식 R-CONV-012 · 013 (검수 전 draft)', () => {
  // 기관 표와 무관한 가상 데이터로 허락·검수·보간 분기를 확인한다.
  const open: ConversionConfig = {
    ...withRules(['R-CONV-012', 'R-CONV-013']),
    candidateTables: [
      { ...tables[0], id: 'synthetic-a', basis_semesters: 2, points: [
        { avg5: 1, converted9: 1.8 }, { avg5: 2, converted9: 3.6 }, { avg5: 3, converted9: 5.4 },
      ] },
      { ...tables[0], id: 'synthetic-b', basis_semesters: 2, points: [
        { avg5: 1, converted9: 1.9, converted9_low: 1.2 }, { avg5: 2, converted9: 3.8 }, { avg5: 3, converted9: 5.6 },
      ] },
    ],
  };
  const mix = (parts: [number, number][]): GradeSet => ({ '1-1': parts.map(([g, c]) => sub({ grade5: g, credits: c })) });
  const ok = (r: ReturnType<typeof convertFiveToNine>, id: 'R-CONV-012' | 'R-CONV-013') => {
    const c = r.candidates[id];
    if (c.status !== 'ok') throw new Error(c.reason);
    return c;
  };

  test('설정의 두 규칙은 draft이며 기관 후보표는 포함하지 않는다', () => {
    expect(baseCfg.rules['R-CONV-012'].review_status).toBe('draft');
    expect(baseCfg.rules['R-CONV-013'].review_status).toBe('draft');
    expect(baseCfg.candidateTables).toEqual([]);
  });

  test('검수 전이면 후보는 pending, 학생 결과(min/max/대표값/표시)는 후보를 열어도 같다', () => {
    for (const g of [student('전 교과', [69, 25, 6]), mix([[1, 3]]), mix([[1, 3], [3, 1]])]) {
      const before = convertFiveToNine(g, '전 교과', baseCfg, tables);
      expect(before.candidates['R-CONV-012'].status).toBe('pending');
      expect(before.candidates['R-CONV-013'].status).toBe('pending');
      const after = convertFiveToNine(g, '전 교과', open, tables);
      expect(after.candidates['R-CONV-013'].status).toBe('ok');
      for (const k of ['min', 'max', 'representative', 'display', 'spread', 'confidence'] as const) expect(after[k]).toEqual(before[k]);
    }
  });

  test('R-CONV-013 과목 1개 등급 기댓값 · 범위 (조사 문서 ②)', () => {
    const c9 = baseCfg.cumulative9!;
    expect(uniformBand(1, baseCfg, c9)).toEqual({ mean: 1.6, min: 1, max: 2 });
    expect(uniformBand(2, baseCfg, c9).mean).toBeCloseTo(3.4167, 3);
    expect(uniformBand(3, baseCfg, c9)).toEqual({ mean: 5, min: 4, max: 6 });
  });

  test('R-CONV-013 학점 가중: 1.0 → 1.60(1~2), 1·2 반반 → 2.51(1.5~3), 1등급 3/4+3등급 1/4 → 2.45(1.75~3)', () => {
    const one = ok(convertFiveToNine(mix([[1, 3]]), '전 교과', open), 'R-CONV-013');
    expect(one.value!).toBeCloseTo(1.6, 6);
    expect([one.min, one.max]).toEqual([1, 2]);
    const half = ok(convertFiveToNine(mix([[1, 3], [2, 3]]), '전 교과', open), 'R-CONV-013');
    expect(half.value!).toBeCloseTo(2.51, 2);
    expect([half.min, half.max]).toEqual([1.5, 3]);
    const d = ok(convertFiveToNine(mix([[1, 3], [3, 1]]), '전 교과', open), 'R-CONV-013');
    expect(d.value!).toBeCloseTo(2.45, 2);
    expect([d.min, d.max]).toEqual([1.75, 3]);
    const a = ok(convertFiveToNine(mix([[1, 9], [2, 1]]), '전 교과', open), 'R-CONV-013');
    expect(a.value!).toBeCloseTo(1.78, 2);
  });

  test('R-CONV-012 가상 표의 하한·상한·보간과 표 밖 unavailable', () => {
    expect(ok(convertFiveToNine(mix([[1, 3]]), '전 교과', open), 'R-CONV-012')).toMatchObject({ min: 1.2, max: 1.9 });
    const two = ok(convertFiveToNine(mix([[2, 3]]), '전 교과', open), 'R-CONV-012');
    expect([two.min, two.max]).toEqual([3.6, 3.8]);
    expect(two.note).toContain('2개 학기');
    const middle = ok(convertFiveToNine(mix([[1, 1], [2, 1]]), '전 교과', open), 'R-CONV-012');
    expect(middle.min).toBeCloseTo(2.7, 6);
    expect(middle.max).toBeCloseTo(2.85, 6);
    expect(convertFiveToNine(mix([[4, 3]]), '전 교과', open).candidates['R-CONV-012'].status).toBe('unavailable');
  });

  test('R-CONV-012 규칙만 열고 표가 허락 전이면 계산하지 않는다', () => {
    const r = convertFiveToNine(mix([[1, 3]]), '전 교과', { ...withRules(['R-CONV-012']), candidateTables: open.candidateTables!.map((t) => ({ ...t, license_status: 'pending' as const })) });
    expect(r.candidates['R-CONV-012']).toEqual({ status: 'pending', reason: '후보 실측표 검수·사용 허락 전이에요' });
  });
});
