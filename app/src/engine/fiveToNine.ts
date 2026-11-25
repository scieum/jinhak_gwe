// 5등급 → 9등급 환산 (PRD 6-5, 9장 R-CONV). 순수 함수, 네트워크 없음.
import type {
  CandidateResult,
  Confidence,
  ConversionConfig,
  ConversionTable,
  GradeSet,
  MethodResult,
  Subject,
  TraceStep,
} from './fiveToNineTypes';

export const SUBJECT_COMBOS = {
  '전 교과': null,
  국수영사과: ['국어', '수학', '영어', '사회', '과학'],
  국수영사: ['국어', '수학', '영어', '사회'],
  국수영과: ['국어', '수학', '영어', '과학'],
} as const satisfies Record<string, readonly string[] | null>;
export type SubjectCombo = keyof typeof SUBJECT_COMBOS;

const RANK_TYPES = new Set(['공통', '일반선택', '진로선택', '융합선택']);

export const verified = (cfg: ConversionConfig, ruleId: string) => cfg.rules[ruleId]?.review_status === 'verified';

/** 꺾은선 보간. 범위 밖은 양 끝 값으로 고정 */
export function interpolate(x: number, xs: number[], ys: number[]): number {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return ys[i - 1] + ((x - xs[i - 1]) * (ys[i] - ys[i - 1])) / (xs[i] - xs[i - 1]);
  }
  return ys[ys.length - 1];
}

const GRADES5 = [1, 2, 3, 4, 5];
const GRADES9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** R-CONV-001: 5등급 값 → 누적비(%) */
export const g5ToPct = (g5: number, cfg: ConversionConfig) => interpolate(g5, GRADES5, cfg.centers5);
/** R-CONV-002·003: 누적비(%) → 9등급, 1.0~9.0 고정 */
export const pctToG9 = (p: number, cfg: ConversionConfig) => interpolate(p, cfg.centers9, GRADES9);

/**
 * R-CONV-010: 수강자수 n에서 등급의 실제 누적비 구간(%).
 * 시행지침: 등급별 누적 인원 = 수강자수 × 누적비율, 소수점 첫째 자리에서 반올림.
 */
export function actualBand(grade: number, n: number, cfg: ConversionConfig): [number, number] {
  const cum = (g: number) => (g <= 0 ? 0 : g >= 5 ? n : Math.round((n * cfg.cumulative5[g - 1]) / 100));
  return [(cum(grade - 1) / n) * 100, (cum(grade) / n) * 100];
}

const nominalBand = (grade: number, cfg: ConversionConfig): [number, number] => [
  grade <= 1 ? 0 : cfg.cumulative5[grade - 2],
  cfg.cumulative5[grade - 1],
];

/** R-CONV-011: 고정분할 경계(100·90·80·70·60·0점)의 누적비 사이에서 원점수 위치를 보간 */
export function rawScoreToPct(raw: number, d: Subject['distribution'] & object): number {
  const scores = [0, 60, 70, 80, 90, 100];
  const cums = [100, d.A + d.B + d.C + d.D, d.A + d.B + d.C, d.A + d.B, d.A, 0];
  return interpolate(raw, scores, cums);
}

/** R-CONV-013: 5등급 g의 누적 구간 [lo, hi] 안에서 백분위가 균등하다고 보고 9등급 기댓값과 가능한 최소~최대 */
export function uniformBand(grade: number, cfg: ConversionConfig, c9: number[]): { mean: number; min: number; max: number } {
  const [lo, hi] = nominalBand(grade, cfg);
  let sum = 0;
  const ks: number[] = [];
  c9.forEach((top, i) => {
    const overlap = Math.min(hi, top) - Math.max(lo, i ? c9[i - 1] : 0);
    if (overlap > 0) { sum += (i + 1) * overlap; ks.push(i + 1); }
  });
  return { mean: sum / (hi - lo), min: ks[0], max: ks[ks.length - 1] };
}

/** R-CONV-012: 후보 실측표마다 5등급 평균을 꺾은선 보간해 [가장 작은 값 ~ 가장 큰 값]. 표 범위 밖이면 그 표는 뺀다 */
function candidateTableRange(g5: number, cfg: ConversionConfig): CandidateResult {
  if (!verified(cfg, 'R-CONV-012')) return { status: 'pending', reason: 'R-CONV-012 검수 전' };
  const usable = (cfg.candidateTables ?? []).filter((t) => t.license_status === 'allowed' && t.review_status === 'verified');
  if (!usable.length) return { status: 'pending', reason: '후보 실측표 검수·사용 허락 전이에요' };
  const hits = usable.flatMap((t) => {
    const pts = [...t.points].sort((x, y) => x.avg5 - y.avg5);
    if (g5 < pts[0].avg5 - 1e-9 || g5 > pts[pts.length - 1].avg5 + 1e-9) return [];
    const hi = interpolate(g5, pts.map((p) => p.avg5), pts.map((p) => p.converted9));
    const lo = pts.find((p) => Math.abs(p.avg5 - g5) < 1e-9)?.converted9_low ?? hi;
    return [{ lo, hi, label: `${t.region} ${t.basis_semesters}개 학기 기준` }];
  });
  if (!hits.length) return { status: 'unavailable', reason: '후보 실측표 범위 밖이에요' };
  return { status: 'ok', value: null, min: Math.min(...hits.map((h) => h.lo)), max: Math.max(...hits.map((h) => h.hi)),
    note: hits.map((h) => h.label).join(' · ') };
}

/** R-CONV-013: 과목별 uniformBand를 학점 가중 평균 */
function uniformExpectation(ranked: Subject[], cfg: ConversionConfig): CandidateResult {
  if (!verified(cfg, 'R-CONV-013')) return { status: 'pending', reason: 'R-CONV-013 검수 전' };
  if (!cfg.cumulative9) return { status: 'unavailable', reason: '9등급 누적비율 설정이 없어요' };
  const bands = ranked.map((s) => ({ b: uniformBand(s.grade5 as number, cfg, cfg.cumulative9!), w: s.credits }));
  const avg = (k: 'mean' | 'min' | 'max') => weightedMean(bands.map(({ b, w }) => ({ v: b[k], w })));
  return { status: 'ok', value: avg('mean'), min: avg('min'), max: avg('max') };
}

const weightedMean = (items: { v: number; w: number }[]) =>
  items.reduce((s, i) => s + i.v * i.w, 0) / items.reduce((s, i) => s + i.w, 0);

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 부동소수 오차로 2.0이 1.9로 내려가지 않게 아주 작은 여유를 둔다
export const floor1 = (x: number) => Math.floor(x * 10 + 1e-9) / 10;
export const ceil1 = (x: number) => Math.ceil(x * 10 - 1e-9) / 10;

export interface FiveToNineResult {
  combo: SubjectCombo;
  g5: number | null;
  semesters: number;
  a1: MethodResult;
  a2: MethodResult;
  a3: MethodResult;
  b: MethodResult;
  min: number | null;
  max: number | null;
  representative: number | null;
  /** 바깥쪽 반올림 표시 범위(아래 내림 · 위 올림, 소수 첫째 자리) */
  display: { min: number; max: number } | null;
  spread: number | null;
  confidence: Confidence;
  stats: { rankedCount: number; excludedCount: number; smallCount: number; smallRatio: number };
  bTable: { id: string; source: string; basis_semesters: number; semesterMismatch: boolean } | null;
  /** 검수 전 후보 방식. min/max/representative/display 계산에는 넣지 않는다(NEVER-1) */
  candidates: Record<'R-CONV-012' | 'R-CONV-013', CandidateResult>;
  trace: TraceStep[];
}

export function convertFiveToNine(
  grades: GradeSet,
  combo: SubjectCombo,
  cfg: ConversionConfig,
  tables: ConversionTable[] = [],
): FiveToNineResult {
  const trace: TraceStep[] = [];
  const groups: readonly string[] | null = SUBJECT_COMBOS[combo];
  const semesterKeys = Object.keys(grades).filter((k) => (grades[k as keyof GradeSet] ?? []).length > 0);
  const all = semesterKeys
    .flatMap((k) => grades[k as keyof GradeSet] ?? [])
    .filter((s) => RANK_TYPES.has(s.type) && (!groups || groups.includes(s.group)));

  // R-CONV-010: 수강자 5명 이하·석차등급 미산출은 환산에서 빼고 신뢰도에만 반영
  const isExcluded = (s: Subject) => s.grade5 == null || (s.enrolled != null && s.enrolled <= 5);
  const ranked = all.filter((s) => !isExcluded(s));
  const excludedCount = all.length - ranked.length;
  const smallCount = all.filter((s) => isExcluded(s) || (s.enrolled != null && s.enrolled <= cfg.confidence.smallClassMax)).length;
  const stats = { rankedCount: ranked.length, excludedCount, smallCount, smallRatio: all.length ? smallCount / all.length : 0 };

  const none = { status: 'unavailable', reason: '석차등급이 있는 과목이 없어요' } as const;
  if (!ranked.length) {
    return { combo, g5: null, semesters: semesterKeys.length, a1: none, a2: none, a3: none, b: none, min: null, max: null,
      representative: null, display: null, spread: null, confidence: '낮음', stats, bTable: null,
      candidates: { 'R-CONV-012': none, 'R-CONV-013': none }, trace };
  }

  const g5 = weightedMean(ranked.map((s) => ({ v: s.grade5 as number, w: s.credits })));
  trace.push({ id: 'g5', label: '학점 가중 5등급 평균', value: g5 });
  if (excludedCount) trace.push({ id: 'excluded', label: '환산에서 뺀 과목(수강자 5명 이하·석차등급 미산출)', value: excludedCount, rule: 'R-CONV-010' });

  // A-1
  let a1: MethodResult = { status: 'pending', reason: 'R-CONV-003 검수 전' };
  if (verified(cfg, 'R-CONV-003')) {
    const p = g5ToPct(g5, cfg);
    a1 = { status: 'ok', value: pctToG9(p, cfg) };
    trace.push({ id: 'a1-pct', label: '5등급 중앙 누적비로 보간', value: p, rule: 'R-CONV-001' });
    trace.push({ id: 'a1', label: 'A-1 평균 기반', value: a1.value, rule: 'R-CONV-003' });
  }

  // A-2: 과목별 누적비. 수강자수 보정은 R-CONV-010이 검수된 때만
  const useBand = verified(cfg, 'R-CONV-010');
  const band = (s: Subject): [number, number] =>
    useBand && s.enrolled != null ? actualBand(s.grade5 as number, s.enrolled, cfg) : nominalBand(s.grade5 as number, cfg);
  const subjectPct = (s: Subject) =>
    useBand && s.enrolled != null ? (band(s)[0] + band(s)[1]) / 2 : cfg.centers5[(s.grade5 as number) - 1];

  let a2: MethodResult = { status: 'pending', reason: 'R-CONV-004 검수 전' };
  if (verified(cfg, 'R-CONV-004')) {
    a2 = { status: 'ok', value: weightedMean(ranked.map((s) => ({ v: pctToG9(subjectPct(s), cfg), w: s.credits }))) };
    trace.push({
      id: 'a2',
      label: useBand ? 'A-2 과목 기반(수강자수 보정)' : 'A-2 과목 기반',
      value: a2.value,
      rule: useBand ? 'R-CONV-004 · R-CONV-010' : 'R-CONV-004',
      note: useBand ? undefined : '수강자수 보정(R-CONV-010)은 검수 전이라 명목 누적비를 썼어요',
    });
  }

  // A-3: 검수 전에는 계산하지 않는다(NEVER-1)
  let a3: MethodResult = { status: 'pending', reason: 'R-CONV-011 검수 전' };
  if (verified(cfg, 'R-CONV-011')) {
    const eligible = (s: Subject) => s.fixedCutoff === true && s.rawScore != null && s.distribution != null;
    if (!ranked.some(eligible)) {
      a3 = { status: 'unavailable', reason: '고정분할 과목이 없어 계산하지 않았어요' };
    } else {
      // 고정분할이 아닌 과목은 A-2 누적비를 그대로 써서 A-2와 같은 과목 집합으로 비교한다
      const pct = (s: Subject) => {
        if (!eligible(s)) return subjectPct(s);
        const [lo, hi] = band(s);
        return Math.min(hi, Math.max(lo, rawScoreToPct(s.rawScore as number, s.distribution!)));
      };
      a3 = { status: 'ok', value: weightedMean(ranked.map((s) => ({ v: pctToG9(pct(s), cfg), w: s.credits }))) };
      trace.push({ id: 'a3', label: 'A-3 분포비율 보정', value: a3.value, rule: 'R-CONV-011' });
    }
  } else {
    trace.push({ id: 'a3', label: 'A-3 분포비율 보정 — 검수 전이라 계산하지 않았어요', value: '준비 중', rule: 'R-CONV-011' });
  }

  // B: R-CONV-006·009
  const sems = semesterKeys.length;
  let b: MethodResult = { status: 'unavailable', reason: '등록된 실측표가 없어요' };
  let bTable: FiveToNineResult['bTable'] = null;
  const scoped = tables.filter((t) => t.subject_scope === combo);
  const pool = scoped.length ? scoped : tables;
  const byDistance = [...pool].sort((x, y) => Math.abs(x.basis_semesters - sems) - Math.abs(y.basis_semesters - sems));
  const usable = byDistance.filter((t) => t.license_status === 'allowed' && t.review_status === 'verified');
  const table = usable[0];
  if (table) {
    const pts = [...table.points].sort((x, y) => x.avg5 - y.avg5);
    const value = interpolate(g5, pts.map((p) => p.avg5), pts.map((p) => p.converted9));
    b = { status: 'ok', value };
    bTable = { id: table.id, source: table.source, basis_semesters: table.basis_semesters, semesterMismatch: table.basis_semesters !== sems };
    trace.push({ id: 'b', label: 'B 교육청 실측표: 평균 위치를 보간', value, rule: 'R-CONV-006 · R-CONV-009',
      note: `${table.source} · ${table.basis_semesters}개 학기 누적 · ${table.n}명` +
        (bTable.semesterMismatch ? ` · 내 성적은 ${sems}개 학기라 가장 가까운 표를 썼어요` : '') });
  } else if (byDistance.length) {
    const t = byDistance[0];
    b = { status: 'pending', reason: t.license_status !== 'allowed' ? '실측표 사용 허락 확인 중이에요' : '실측표 검수 전이에요' };
  }

  // 후보 방식: 검수 전이면 숫자를 내지 않고, 검수돼도 아래 범위·대표값에는 아직 넣지 않는다
  const candidates = { 'R-CONV-012': candidateTableRange(g5, cfg), 'R-CONV-013': uniformExpectation(ranked, cfg) };

  // 범위·대표값: 숫자가 나온 방법만
  const values = [a1, a2, a3, b].flatMap((m) => (m.status === 'ok' ? [m.value] : []));
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const spread = min != null && max != null ? max - min : null;
  const representative = values.length ? median(values) : null;
  const display = min != null && max != null ? { min: floor1(min), max: ceil1(max) } : null;
  if (display) trace.push({ id: 'range', label: '환산 범위(가장 작은 값 내림 ~ 가장 큰 값 올림) · 대표값(가운데 값)', value: `${display.min}~${display.max} · ${representative}` });

  // R-CONV-008: 걸리는 조건마다 한 단계씩 낮춘다
  const c = cfg.confidence;
  const downs = [
    ranked.length < c.minRankedSubjects,
    stats.smallRatio > c.maxSmallRatio,
    spread != null && spread > c.maxSpread,
    bTable?.semesterMismatch === true,
  ].filter(Boolean).length;
  const confidence = (['높음', '보통', '낮음'] as const)[Math.min(2, downs)];

  return { combo, g5, semesters: sems, a1, a2, a3, b, min, max, representative, display, spread, confidence, stats, bTable, candidates, trace };
}
