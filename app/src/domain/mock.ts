import { reviewed, type Provenance } from '../engine/types';

/** PRD 8 MockScore areas. */
export const AREAS = [
  { key: '국어', max: 100 }, { key: '수학', max: 100 }, { key: '영어', max: 100 },
  { key: '한국사', max: 50 }, { key: '통합사회', max: 50 }, { key: '통합과학', max: 50 },
  { key: '탐구1', max: 50 }, { key: '탐구2', max: 50 },
] as const;
/** 모의고사 화면(v2 시안 346:140444)이 받는 영역. 한국사·통합사회·통합과학은 예전 기록을 읽을 때만 받아요. */
export const SCREEN_AREAS = AREAS.filter(a => ['국어', '수학', '영어', '탐구1', '탐구2'].includes(a.key));
export type Area = typeof AREAS[number]['key'];
export interface MockScore { exam: string; raw: Partial<Record<Area, number>>; updated_at: string }
/** A grade cut can be published as a band (agencies disagree): [min, max] raw score for the lower bound of that grade. */
export interface AreaCuts { absolute: boolean; cuts: { grade: number; min: number; max: number }[] }
export interface CutTable extends Provenance { exam: string; version: string; as_of: string; areas: Partial<Record<Area, AreaCuts>> }
export type GradeRead = { status: 'ready'; min: number; max: number; absolute: boolean } | { status: 'pending'; reason: string };

export function validRaw(area: Area, value: number) {
  const max = AREAS.find(a => a.key === area)!.max;
  return Number.isInteger(value) && value >= 0 && value <= max;
}
/** Reads a registered table; it is a lookup, not a conversion. Unreviewed tables are never read (NEVER-1). */
export function readGrade(raw: number | undefined, area: Area, table: CutTable | undefined): GradeRead {
  if (raw === undefined) return { status: 'pending', reason: '원점수를 입력해 주세요' };
  if (!table || !reviewed(table)) return { status: 'pending', reason: '등급컷 준비 중' };
  const a = table.areas[area];
  if (!a || !a.cuts.length) return { status: 'pending', reason: '이 영역 등급컷 준비 중' };
  const cuts = [...a.cuts].sort((x, y) => x.grade - y.grade);
  for (const c of cuts) {
    if (raw >= c.max) return { status: 'ready', min: c.grade, max: c.grade, absolute: a.absolute };
    if (raw >= c.min) return { status: 'ready', min: c.grade, max: c.grade + 1, absolute: a.absolute };
  }
  return { status: 'ready', min: cuts[cuts.length - 1].grade + 1, max: cuts[cuts.length - 1].grade + 1, absolute: a.absolute };
}
/** 원점수가 걸친 컷 구간(표 읽기). 예: "1·2등급 컷 사이", "2등급 컷 86~88 안", "절대평가 80~89". */
export function cutRange(raw: number | undefined, area: Area, table: CutTable | undefined): string | null {
  const g = readGrade(raw, area, table), a = table?.areas[area];
  if (g.status !== 'ready' || !a || raw === undefined) return null;
  const cuts = [...a.cuts].sort((x, y) => x.grade - y.grade), cut = (n: number) => cuts.find(c => c.grade === n);
  const own = cut(g.min), upper = cut(g.min - 1);
  if (own && own.min < own.max && raw < own.max) return `${g.min}등급 컷 ${own.min}~${own.max} 안`;
  if (a.absolute) return own ? (upper ? `절대평가 ${own.max}~${upper.min - 1}` : `절대평가 ${own.max} 이상`) : `절대평가 ${cuts.at(-1)!.min} 미만`;
  return g.min === 1 ? '1등급 컷 위' : `${g.min - 1}·${g.min}등급 컷 사이`;
}
export const gradeLabel = (g: GradeRead) => g.status !== 'ready' ? g.reason : `${g.absolute ? '' : '약 '}${g.min === g.max ? g.min : `${g.min}~${g.max}`}등급`;

export function parseMocks(value: unknown): MockScore[] {
  const fail = (): never => { throw new Error('모의고사 기록 형식을 확인해 주세요.'); };
  if (!Array.isArray(value) || value.length > 50) return fail();
  const out = value.map((m: MockScore) => {
    if (!m || typeof m.exam !== 'string' || !m.exam.trim() || m.exam.length > 60 || typeof m.updated_at !== 'string' || !m.raw || typeof m.raw !== 'object') return fail();
    const raw: MockScore['raw'] = {};
    for (const [k, v] of Object.entries(m.raw)) { if (!AREAS.some(a => a.key === k) || typeof v !== 'number' || !validRaw(k as Area, v)) return fail(); raw[k as Area] = v; }
    return { exam: m.exam.trim(), raw, updated_at: m.updated_at };
  });
  if (new Set(out.map(m => m.exam)).size !== out.length) return fail();
  return out;
}
