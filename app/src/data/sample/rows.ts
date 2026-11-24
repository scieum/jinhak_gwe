// 어떤 학생 행이 샘플인지 가리는 규칙. 지우기(index.ts)와 백업 내보내기(io/backup.ts)가 같이 써요.
import type { StudentBackup } from '../../domain/student';
import { SAMPLE_PREFIX, legacySampleInterestIds, sampleAttendance, sampleInterests } from './student';

const canon = (v: unknown) => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);
export const isSampleId = (id: string | null | undefined) => !!id?.startsWith(SAMPLE_PREFIX);
// 키가 고정인 표(출결 학년 · 관심 전형 id)는 샘플 값 그대로일 때만 샘플로 봐요. 사용자가 고친 행은 사용자 것이에요.
export const isSampleAttendance = (a: unknown) => sampleAttendance.some(s => canon(s) === canon(a));
export const isSampleInterest = (i: { id: string; created_at: string }) => sampleInterests.some((s, k) => (s.id === i.id || legacySampleInterestIds[k] === i.id) && s.created_at === i.created_at);

/** 백업(.jnavi)에는 샘플 행을 넣지 않아요. 사용자 행이 샘플 전형을 가리키면 그 연결만 끊어요. */
export function stripSample(b: StudentBackup): StudentBackup {
  const keep = <T extends { id: string }>(rows: T[]) => rows.filter(r => !isSampleId(r.id));
  const drop = <S extends { application_id: string }>(slots: S[]) => slots.filter(s => !isSampleId(s.application_id));
  return { ...b, grades: keep(b.grades), attendance: b.attendance.filter(a => !isSampleAttendance(a)),
    ...(b.interests ? { interests: b.interests.filter(i => !isSampleInterest(i)) } : {}),
    ...(b.planning ? { planning: { applications: keep(b.planning.applications),
      tasks: keep(b.planning.tasks).map(t => isSampleId(t.application_id) ? { ...t, application_id: null } : t) } } : {}),
    ...(b.boards ? { boards: keep(b.boards).map(x => ({ ...x, slots: drop(x.slots), exempt: drop(x.exempt) })) } : {}) };
}

