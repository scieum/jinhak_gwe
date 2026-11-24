// 학과별 입결 구간표(work/dept-tier/02-spec.md). 공개(관리자 2명 검수) 9등급 교과 70% 컷을 학생이 고른 폭의 층으로 나누기만 한다.
// 새 환산·보간 없음(NEVER-1). 모든 경계 계산은 0.01 단위 정수(컷 c → 100c)라 소수 오차가 없다.
import type { ReleasedUnit } from './resultReview';
import { departmentsOf, type FieldRow } from './univWiki';

export type Major = '인문' | '자연';
export type TierType = '교과' | '종합';
export interface TierGroup { major: Major; mid: string; small: string }
export interface TierCell { university: string; unit: string; program: string; cut: number }
/** lo · hi는 0.01 단위 정수(150 = 1.5). hi는 9.0을 넘지 않게 자른 값. */
export interface Layer { lo: number; hi: number; label: string; cells: TierCell[] }

export const WIDTH_PRESETS = [10, 20, 30, 50] as const;
export const DEFAULT_WIDTH = 50, MIN_WIDTH = 5, MAX_WIDTH = 100, MIN_CELLS = 3;
const BASE = 100, TOP = 900;

/** 폭이 소수 한 자리면 한 자리, 둘째 자리면 경계도 모두 둘째 자리(spec D5). */
export const fmt = (x100: number, w100: number) => (x100 / 100).toFixed(w100 % 10 ? 2 : 1);
export const widthText = (w100: number) => fmt(w100, w100);

export function lowerBound(cut100: number, w100: number) {
  const lo = BASE + Math.floor((cut100 - BASE) / w100) * w100;
  return cut100 === TOP && lo === TOP ? lo - w100 : lo; // 9.0은 마지막 층
}

/** 가장 작은 컷의 층 ~ 가장 큰 컷의 층만, 그 사이 빈 층은 남긴다. 층 안은 대학 → 모집단위 가나다. */
export function buildLayers(cells: readonly TierCell[], w100: number): Layer[] {
  if (!cells.length) return [];
  const at = cells.map(c => ({ c, lo: lowerBound(Math.round(c.cut * 100), w100) }));
  const first = Math.min(...at.map(x => x.lo)), last = Math.max(...at.map(x => x.lo)), out: Layer[] = [];
  for (let lo = first; lo <= last; lo += w100) {
    const hi = Math.min(lo + w100, TOP);
    out.push({ lo, hi, label: `${fmt(lo, w100)}~${fmt(hi, w100)}`, cells: at.filter(x => x.lo === lo).map(x => x.c)
      .sort((a, b) => a.university.localeCompare(b.university, 'ko') || a.unit.localeCompare(b.unit, 'ko')) });
  }
  return out;
}

export const RANGE_ERROR = '구간 폭은 0.05부터 1.0까지 넣을 수 있어요';
export const FORMAT_ERROR = '숫자로 소수 둘째 자리까지 넣을 수 있어요(예: 0.25)';
/** 직접 입력. 빈칸 = null(오류 아님, 직전 폭 유지). */
export function parseWidth(text: string): { w100: number } | { error: string } | null {
  const t = text.trim();
  if (!t) return null;
  if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(t)) return { error: FORMAT_ERROR };
  const [int, frac = ''] = t.split('.');
  const w100 = Number(int || 0) * 100 + Number(frac.padEnd(2, '0'));
  return w100 < MIN_WIDTH || w100 > MAX_WIDTH ? { error: RANGE_ERROR } : { w100 };
}

const MAJORS: readonly string[] = ['인문', '자연'];
/** 대계열이 빈(또는 인문·자연이 아닌) 계열표 행은 이 화면에 나오지 않는다(spec D3). */
export const tierFields = (fields: readonly FieldRow[]) => fields.filter(f => MAJORS.includes(f.major ?? ''));

export function groupsOf(fields: readonly FieldRow[]): TierGroup[] {
  const seen = new Map<string, TierGroup>();
  for (const f of tierFields(fields)) seen.set(`${f.major}|${f.mid}|${f.small}`, { major: f.major as Major, mid: f.mid, small: f.small });
  // 대계열만 인문 → 자연, 중계열 · 소계열은 계열표(관리자 검수표)에 적힌 순서 그대로(시안 칩 순서)
  return [...seen.values()].sort((a, b) => a.major.localeCompare(b.major, 'ko'));
}
export const sameGroup = (a: TierGroup, b: TierGroup) => a.major === b.major && a.mid === b.mid && a.small === b.small;

export type TierData =
  | { status: 'pending'; candidates: number; pending: number }
  | { status: 'short' | 'ok'; candidates: number; pending: number; year: number; cells: TierCell[] };

/** 계열표에서 고른 묶음의 모집단위 → 같은 전형 유형의 공개 9등급 교과 70% 컷. 한 표는 가장 최근 한 학년도만. */
export function tierData(units: readonly ReleasedUnit[], fields: readonly FieldRow[], group: TierGroup, type: TierType): TierData {
  const rows = tierFields(fields).filter(f => sameGroup(f as TierGroup, group)), cache = new Map<string, ReturnType<typeof departmentsOf>>();
  const found = rows.map(f => {
    if (!cache.has(f.university)) cache.set(f.university, departmentsOf(units, f.university));
    return { f, d: cache.get(f.university)!.find(d => d.unit === f.unit && d.type === type) };
  });
  const valid = found.filter(x => x.d?.cut != null && x.d.year != null);
  const pending = found.length - valid.length;
  if (!valid.length) return { status: 'pending', candidates: found.length, pending };
  const year = Math.max(...valid.map(x => x.d!.year!));
  const cells = valid.filter(x => x.d!.year === year).map(x => ({ university: x.f.university, unit: x.f.unit, program: x.d!.program, cut: x.d!.cut! }));
  return { status: cells.length < MIN_CELLS ? 'short' : 'ok', candidates: found.length, pending, year, cells };
}
