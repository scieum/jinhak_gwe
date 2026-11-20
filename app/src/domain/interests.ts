export interface Interest {
  id: string;
  university: string;
  program: string;
  department?: string;
  created_at: string;
}

// Keep legacy two-part IDs intact. Department-specific interests never inherit
// the selected state of a legacy program bookmark, including across result years.
export const interestId = (university: string, program: string, department?: string) => JSON.stringify([
  university.trim(), program.trim(), ...(department?.trim() ? [department.trim()] : []),
]);
export const programPath = (university: string, program: string) => `/program-detail?u=${encodeURIComponent(university)}&p=${encodeURIComponent(program)}`;
export const collectedProgramPath = (university: string, program: string, department?: string) => `/admission-results?view=collected&cu=${encodeURIComponent(university)}&cp=${encodeURIComponent(program)}${department ? `&cd=${encodeURIComponent(department)}` : ''}`;

export function parseInterests(value: unknown): Interest[] {
  const fail = (): never => { throw new Error('관심 전형 기록 형식을 확인해 주세요.'); };
  if (!Array.isArray(value) || value.length > 500) return fail();
  const ids = new Set<string>();
  return value.map(item => {
    if (!item || typeof item.university !== 'string' || !item.university.trim() || item.university.length > 200
      || typeof item.program !== 'string' || !item.program.trim() || item.program.length > 300
      || (item.department !== undefined && (typeof item.department !== 'string' || !item.department.trim() || item.department.length > 200))
      || typeof item.created_at !== 'string' || item.created_at.length > 40 || !Number.isFinite(Date.parse(item.created_at))) return fail();
    const university = item.university.trim(), program = item.program.trim(), department = item.department?.trim(), id = interestId(university, program, department);
    if (item.id !== id || ids.has(id)) return fail();
    ids.add(id);
    return { id, university, program, ...(department ? { department } : {}), created_at: item.created_at };
  });
}
