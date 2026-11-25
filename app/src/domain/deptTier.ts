// 학과별 입결 구간표(work/dept-tier/02-spec.md). 공개(관리자 2명 검수) 9등급 교과 70% 컷을 학생이 고른 폭의 층으로 나누기만 한다.
// 새 환산·보간 없음(NEVER-1). 모든 경계 계산은 0.01 단위 정수(컷 c → 100c)라 소수 오차가 없다.
import { RESULT_COLUMNS, type ReleasedUnit, type ResultRow } from './resultReview';
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

/** 가장 작은 컷의 층 ~ 가장 큰 컷의 층만, 그 사이 빈 층은 남긴다. 층 안은 컷이 작은(등급이 높은) 순 → 대학 → 모집단위 가나다(2026-11-25 사용자 요청). */
export function buildLayers(cells: readonly TierCell[], w100: number): Layer[] {
  if (!cells.length) return [];
  const at = cells.map(c => ({ c, lo: lowerBound(Math.round(c.cut * 100), w100) }));
  const first = Math.min(...at.map(x => x.lo)), last = Math.max(...at.map(x => x.lo)), out: Layer[] = [];
  for (let lo = first; lo <= last; lo += w100) {
    const hi = Math.min(lo + w100, TOP);
    out.push({ lo, hi, label: `${fmt(lo, w100)}~${fmt(hi, w100)}`, cells: at.filter(x => x.lo === lo).map(x => x.c)
      .sort((a, b) => a.cut - b.cut || a.university.localeCompare(b.university, 'ko') || a.unit.localeCompare(b.unit, 'ko')) });
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

/** 지원 자격이 제한된 특별 전형 종류. 전형 이름(공백 무시)에 낱말이 있으면 그 종류, 학생이 켠 종류만 층에 넣는다(2026-11-25 사용자 요청, 목록은 여기 한 곳).
 *  지역인재는 특별 전형이 아니라 학생의 시·도 권역으로 따로 거른다(LOCAL_TALENT_ZONES). */
export const SPECIAL_KINDS = [
  { kind: '특성화고', words: ['특성화고', '재직자'] },
  { kind: '기회균형', words: ['기초생활', '수급자', '차상위', '저소득', '한부모', '기회균형', '고른기회', '사회통합', '배려'] },
  { kind: '농어촌', words: ['농어촌'] },
  { kind: '장애·특수교육', words: ['장애', '특수교육'] },
  { kind: '북한이탈', words: ['북한이탈', '새터민'] },
  { kind: '재외국민·서해5도', words: ['재외국민', '서해5도'] },
  { kind: '보훈·국가유공', words: ['보훈', '국가유공'] },
  { kind: '기타', words: ['만학도', '성인학습', '평생학습', '도서벽지', '군위탁', '다문화'] },
] as const;
export type SpecialKind = typeof SPECIAL_KINDS[number]['kind'];
const squash = (program: string) => program.normalize('NFKC').replace(/\s/g, '');
export const specialKind = (program: string): SpecialKind | null => {
  const name = squash(program);
  return SPECIAL_KINDS.find(k => k.words.some(w => name.includes(w)))?.kind ?? null;
};
export const isSpecialProgram = (program: string) => specialKind(program) !== null;
export const isLocalTalent = (program: string) => squash(program).includes('지역인재');

/** 지역인재 법정 권역(지방대학육성법). 시·도 이름(전체 · 줄임 · '전남광주' 같은 합친 이름)에 낱말이 있으면 그 권역. 수도권은 권역이 없다.
 *  대학 · 전형별 세부 요건(특정 도만, 중학교부터 등)은 판단하지 않는다 → 칸에 '원문 확인'. */
export const LOCAL_TALENT_ZONES = {
  강원: ['강원'],
  충청권: ['대전', '세종', '충북', '충남', '충청'],
  호남권: ['광주', '전북', '전남', '전라'],
  '대구·경북권': ['대구', '경북', '경상북'],
  '부산·울산·경남권': ['부산', '울산', '경남', '경상남'],
  제주: ['제주'],
} as const satisfies Record<string, readonly string[]>;
export const zoneOf = (place: string) =>
  (Object.keys(LOCAL_TALENT_ZONES) as (keyof typeof LOCAL_TALENT_ZONES)[]).find(z => LOCAL_TALENT_ZONES[z].some(w => place.includes(w))) ?? null;
/** 학생 시·도가 대학 소재 시·도(캠퍼스 여럿이면 하나라도)와 같은 권역이면 '지원 자격 해당 가능'. 모르면 false(제외 목록으로). */
export const localTalentMatch = (studentSido: string, univRegions: readonly string[]) => {
  const z = studentSido ? zoneOf(studentSido) : null;
  return !!z && univRegions.some(r => zoneOf(r) === z);
};

export interface TierFilter { kinds?: readonly SpecialKind[]; localOk?: (university: string) => boolean }
export type TierData =
  | { status: 'pending'; candidates: number; pending: number; special: number; kinds: Partial<Record<SpecialKind, number>>; local: number }
  | { status: 'short' | 'ok'; candidates: number; pending: number; other: number; special: number; kinds: Partial<Record<SpecialKind, number>>; local: number; year: number; cells: TierCell[] };

/** 계열표에서 고른 묶음의 모집단위 → 같은 전형 유형의 공개 9등급 교과 70% 컷. 한 표는 가장 최근 한 학년도만.
 *  모집단위마다 일반 전형 칸 하나 + 켠 특별 전형 종류 · 권역이 맞는 지역인재마다 칸 하나씩.
 *  kinds = 종류별 칸 수(켜면 들어갈 것), special = 꺼서 뺀 특별 전형 칸 수, local = 권역이 안 맞거나 모르는 지역인재 칸 수(같은 학년도). */
export function tierData(units: readonly ReleasedUnit[], fields: readonly FieldRow[], group: TierGroup, type: TierType, filter: TierFilter = {}): TierData {
  const rows = tierFields(fields).filter(f => sameGroup(f as TierGroup, group));
  const keyOf = (program: string) => `${specialKind(program) ?? ''}|${isLocalTalent(program) ? 1 : ''}`;
  const lookup = (key: string) => {
    const only = units.map(u => ({ ...u, rows: u.rows.filter(r => keyOf(r.program) === key) }));
    const cache = new Map<string, ReturnType<typeof departmentsOf>>();
    return (f: FieldRow) => {
      if (!cache.has(f.university)) cache.set(f.university, departmentsOf(only, f.university));
      const d = cache.get(f.university)!.find(d => d.unit === f.unit && d.type === type);
      return d && d.cut !== null && d.year !== null ? { f, d: { ...d, cut: d.cut, year: d.year } } : null;
    };
  };
  const keys = [...new Set(units.flatMap(u => u.rows.map(r => keyOf(r.program))))].map(key => {
    const [kind, local] = key.split('|');
    return { find: lookup(key), kind: (kind || null) as SpecialKind | null, local: !!local };
  });
  const found = rows.map(f => keys.flatMap(k => { const hit = k.find(f); return hit ? [{ ...hit, kind: k.kind, local: k.local }] : []; }));
  const pending = found.filter(x => !x.length).length, hits = found.flat();
  const localOk = (h: typeof hits[number]) => !h.local || !!filter.localOk?.(h.f.university);
  const shown = hits.filter(h => (!h.kind || !!filter.kinds?.includes(h.kind)) && localOk(h));
  const year = shown.length ? Math.max(...shown.map(x => x.d.year)) : null;
  const inYear = hits.filter(h => year === null || h.d.year === year);
  const kinds: Partial<Record<SpecialKind, number>> = {};
  for (const h of inYear) if (h.kind && localOk(h)) kinds[h.kind] = (kinds[h.kind] ?? 0) + 1;
  const counts = {
    kinds, local: inYear.filter(h => !localOk(h)).length,
    special: SPECIAL_KINDS.reduce((n, { kind }) => n + (filter.kinds?.includes(kind) ? 0 : kinds[kind] ?? 0), 0),
  };
  if (year === null) return { status: 'pending', candidates: rows.length, pending, ...counts };
  const cells = shown.filter(x => x.d.year === year).map(x => ({ university: x.f.university, unit: x.f.unit, program: x.d.program, cut: x.d.cut }));
  return { status: cells.length < MIN_CELLS ? 'short' : 'ok', candidates: rows.length, pending, other: shown.length - cells.length, ...counts, year, cells };
}

/** app/public/data/dept-tier.json(app/tools/build_dept_tier.py): 수시 정리본의 9등급 교과등급 70% 컷 + 계열표 초안(학과명 규칙 추천, 검수 전).
 *  구간표가 그대로 쓰도록 ReleasedUnit · FieldRow 모양으로 바꾼다. 값은 원문 문자열 그대로(환산 없음). 형식이 어긋난 행은 버린다. */
export function parseTierDraft(value: unknown): { units: ReleasedUnit[]; fields: FieldRow[] } {
  const v = value as { format?: string; version?: number; fields?: unknown[]; rows?: unknown[] };
  if (v?.format !== 'jinhak-navi-dept-tier' || v.version !== 1 || !Array.isArray(v.fields) || !Array.isArray(v.rows)) return { units: [], fields: [] };
  const strings = (x: unknown, n: number): x is string[] => Array.isArray(x) && x.length === n && x.every(s => typeof s === 'string' && s.trim() !== '');
  const fields = (v.fields.filter(f => strings(f, 5) && MAJORS.includes(f[4])) as string[][]).map(([university, unit, small, mid, major]) => ({ university, unit, small, mid, major }));
  const byUniversity = new Map<string, ResultRow[]>();
  for (const r of v.rows) {
    // 7번째 칸(있으면) = 그 행 모집인원, 숫자거나 빈칸. 전형계획 모달의 증감 비교 기준
    const quota = Array.isArray(r) && r.length === 7 && typeof r[6] === 'string' && /^\d*$/.test(r[6]) ? r[6] : null;
    const head: unknown = quota === null ? r : (r as unknown[]).slice(0, 6);
    if (!strings(head, 6) || !['교과', '종합'].includes(head[2]) || !/^20\d\d$/.test(head[4]) || !(Number(head[5]) >= 1 && Number(head[5]) <= 9)) continue;
    const [university, recruit_unit, admission_type, program, result_year, cut_70] = head;
    const row = { ...EMPTY_ROW, university, recruit_unit, admission_type, program, result_year, cut_70, quota: quota ?? '', round: '수시', metric: '교과등급', grade_system: '9' };
    byUniversity.set(university, [...byUniversity.get(university) ?? [], row]);
  }
  const units = [...byUniversity].map(([university, rows]): ReleasedUnit => ({ university, rows, year: Number(rows[0].result_year), source_url: '', license: 'allowed', approvals: [] }));
  return { units, fields };
}
const EMPTY_ROW = Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])) as ResultRow;
