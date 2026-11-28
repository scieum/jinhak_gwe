import type { AdmissionPlan, PlanCatalog, PlanProgram } from './admissionPlans';
import type { ReleasedUnit, ResultRow } from './resultReview';
import type { FieldRow } from './univWiki';
import { currentUniversityName } from './universityIdentity';
import { yearUnitKey } from './yearNames';
import { TRACKS, type TrackId } from './specialTracks';
import { unitPlanQuota } from './deptTierPlans';
import { departmentOf, educationDepartment } from './trackDepartments';

type Membership = { track: TrackId; sub?: string };
export interface CollectedTrackUnit {
  key: string; university: string; unit: string; campus: string; region: string;
  memberships: Membership[]; plan?: AdmissionPlan;
  programs: { program: PlanProgram; quota: NonNullable<ReturnType<typeof unitPlanQuota>> }[];
  results: ResultRow[];
  ambiguousCampus: boolean;
}
const nameKey = (s: string) => currentUniversityName(s).normalize('NFKC').replace(/\s/g, '');
// 학과 이름 표기가 해마다·자료마다 달라도 같은 학과로(2026-11-27 3개년 점검)
const key = (u: string, d: string) => JSON.stringify([nameKey(u), yearUnitKey(d)]);
const institutes = new Set(['한국과학기술원', '광주과학기술원', '대구경북과학기술원', '울산과학기술원', '한국에너지공과대학교', '포항공과대학교']);

/** Name/field-table suggestions only. Never infer medical or contract status from '바이오'/'반도체'. */
export function classifyTrack(university: string, unit: string, field?: FieldRow): Membership[] {
  const n = unit.replace(/\s/g, ''), base = n.replace(/※/g, '').replace(/(?:\([^()]*\))+$/, ''), out: Membership[] = [];
  const add = (track: TrackId, sub?: string) => out.push({ track, sub });
  const medical: [RegExp, string][] = [[/^의(?:예|학)(?:과|부|전공)$/, '의예'], [/^치의(?:예|학)(?:과|부|전공)$/, '치의예'], [/^한의(?:예|학)(?:과|부|전공)$/, '한의예'], [/^약학(?:과|부|전공|계열)$/, '약학'], [/^수의(?:예|학)(?:과|부|전공)$/, '수의예']];
  const med = medical.find(([re]) => re.test(base));
  if (med) add('메디컬', med[1]);
  const health = ['간호', '물리치료', '작업치료', '임상병리', '방사선', '치위생'].find(s => n.startsWith(s));
  if (health) add('보건', health);
  else if (field?.mid === '보건') add('보건', '그 밖의 보건');
  if (/초등교육/.test(n) || /교육대학교$/.test(university)) add('교육', '교대(초등교육)');
  else if (educationDepartment(unit) || /교육(?:과|학과|학부|전공)$/.test(base) || field?.mid === '교육') add('교육', '사범대');
  if (institutes.has(currentUniversityName(university))) add('과기원');
  if (/체육|스포츠|운동건강/.test(n)) add('체육', /체육교육/.test(n) ? '체육교육' : /스포츠과학/.test(n) ? '스포츠과학' : '그 밖의 체육');
  const art = /디자인/.test(n) ? '디자인' : /음악|작곡|성악|기악|관현악/.test(n) ? '음악' : /연극|영화|연기/.test(n) ? '연극영화' : /무용/.test(n) ? '무용' : /미술|회화|조소|공예/.test(n) ? '미술' : null;
  if (art) add('예체능 실기', art);
  if (/계약학과|채용조건/.test(n) && !/재직|재교육/.test(n)) add('계약학과', '그 밖의 채용 조건형');
  if (/자유전공|자율전공|무전공/.test(n)) add('자유전공');
  if (/사관학교|경찰대학/.test(university)) add('특수목적대');
  return out;
}

/** Keep campuses separate. Ambiguous historical campus matches stay unattached. */
export function collectTracks(catalog: PlanCatalog | null, released: readonly ReleasedUnit[], fields: readonly FieldRow[]): CollectedTrackUnit[] {
  const fieldMap = new Map(fields.map(f => [key(f.university, f.unit), f]));
  const grouped = new Map<string, CollectedTrackUnit>();
  const campuses = new Map<string, Set<string>>(), places = new Map<string, { campus: string; region: string }[]>();
  for (const plan of catalog?.entries ?? []) {
    const k = nameKey(plan.university), found = campuses.get(k) ?? new Set<string>();
    found.add(plan.campus); campuses.set(k, found);
    places.set(k, [...places.get(k) ?? [], { campus: plan.campus, region: plan.region }]);
  }
  // 2026-11-28 사용자 요청(중복 줄): 입결 '경북대학교(대구)'는 캠퍼스가 하나뿐인 '경북대학교'(대구)와 같은 대학으로 봐요.
  const suffixOf = (u: string) => /^(.+?)\(([^()]+)\)$/.exec(currentUniversityName(u));
  const canonical = (u: string) => {
    const m = suffixOf(u), only = m && places.get(nameKey(m[1]));
    return m && only?.length === 1 && (only[0].region === m[2] || only[0].campus.includes(m[2])) ? m[1] : u;
  };
  for (const plan of catalog?.entries ?? []) {
    for (const program of plan.programs.filter(p => p.round === '수시')) {
      const units = new Set([...(program.units ?? []).map(u => u[0]), ...(program.pooled ?? []).flatMap(p => p.units)]);
      for (const unit of units) {
        const memberships = classifyTrack(plan.university, unit, fieldMap.get(key(plan.university, unit)));
        if (!memberships.length) continue;
        const id = JSON.stringify([plan.id, unit]);
        const row: CollectedTrackUnit = grouped.get(id) ?? { key: id, university: plan.university, unit, campus: plan.campus, region: plan.region,
          memberships, plan, programs: [], results: [], ambiguousCampus: false };
        const quota = unitPlanQuota(program, unit);
        if (quota && !row.programs.some(p => p.program === program)) row.programs.push({ program, quota });
        grouped.set(id, row);
      }
    }
  }
  const byUnit = new Map<string, CollectedTrackUnit[]>();
  for (const row of grouped.values()) { const k = key(row.university, row.unit); byUnit.set(k, [...byUnit.get(k) ?? [], row]); }
  const seen = new Set<string>();
  for (const r of released.flatMap(u => u.rows)) {
    if (r.round !== '수시' || r.metric !== '교과등급' || r.grade_system !== '9' || !r.cut_70.trim() || !Number.isFinite(Number(r.cut_70)) || Number(r.cut_70) < 1 || Number(r.cut_70) > 9) continue;
    const univ = canonical(r.university);
    const signature = JSON.stringify([nameKey(univ), r.recruit_unit, r.result_year, r.admission_type, r.program, r.cut_70]);
    if (seen.has(signature)) continue;
    seen.add(signature);
    const k = key(univ, r.recruit_unit);
    let targets = byUnit.get(k) ?? [];
    // Another campus may have no extracted units yet; a single unit match is not proof of campus identity.
    let ambiguous = targets.length > 1 || (campuses.get(nameKey(univ))?.size ?? 0) > 1;
    // 입결 '중앙대학교(서울)'처럼 캠퍼스가 여럿이면, 괄호가 그 학과가 있는 캠퍼스 한 곳과만 맞을 때만 그 줄에 붙여요.
    const suffix = !targets.length && suffixOf(univ);
    if (suffix) {
      const hit = (byUnit.get(key(suffix[1], r.recruit_unit)) ?? []).filter(t => t.region === suffix[2] || t.campus.includes(suffix[2]));
      if (hit.length === 1) { targets = hit; ambiguous = false; }
    }
    if (targets.length === 1 && !ambiguous) { targets[0].results.push(r); continue; }
    if (ambiguous) targets.forEach(t => { t.ambiguousCampus = true; });
    const memberships = classifyTrack(r.university, r.recruit_unit, fieldMap.get(k));
    if (!memberships.length) continue;
    const id = `result:${k}`;
    const row: CollectedTrackUnit = grouped.get(id) ?? { key: id, university: currentUniversityName(univ), unit: r.recruit_unit,
      campus: '', region: '', memberships, programs: [], results: [], ambiguousCampus: ambiguous };
    row.results.push(r); grouped.set(id, row);
  }
  return [...grouped.values()].sort((a, b) => a.university.localeCompare(b.university, 'ko') || a.campus.localeCompare(b.campus, 'ko') || a.unit.localeCompare(b.unit, 'ko'));
}

export interface TrackFilters { track: TrackId; sub: string; department: string; type: string; region: string; query: string }
export function filterTrackCollection(rows: readonly CollectedTrackUnit[], f: TrackFilters) {
  const q = f.query.trim().normalize('NFKC').toLocaleLowerCase().replace(/\s/g, '');
  return rows.filter(r => r.memberships.some(m => m.track === f.track && (!f.sub || m.sub === f.sub))
    && (!f.department || departmentOf(r.unit, f.track) === f.department)
    && (!f.region || r.region === f.region)
    && (!q || `${r.university}${r.unit}${r.campus}`.normalize('NFKC').toLocaleLowerCase().replace(/\s/g, '').includes(q))
    && (!f.type || r.programs.some(p => p.program.type.replace(/학생부|\s/g, '') === f.type) || r.results.some(p => p.admission_type.replace(/학생부|\s/g, '') === f.type)));
}
export function readTrackFilters(p: URLSearchParams): TrackFilters {
  const track = TRACKS.find(t => t.id === p.get('track')) ?? TRACKS[0];
  return { track: track.id, sub: (track.subs as readonly string[]).includes(p.get('sub') ?? '') ? p.get('sub')! : '',
    department: p.get('department') ?? '',
    type: ['교과', '종합'].includes(p.get('type') ?? '') ? p.get('type')! : '', region: p.get('region') ?? '', query: p.get('q') ?? '' };
}
