export interface Interest {
  id: string;
  university: string;
  program: string;
  created_at: string;
}

// Names form a tuple so delimiters cannot cause collisions. An interest follows
// a named program across result years, without implying an application year.
export const interestId = (university: string, program: string) => JSON.stringify([university.trim(), program.trim()]);
export const programPath = (university: string, program: string) => `/program-detail?u=${encodeURIComponent(university)}&p=${encodeURIComponent(program)}`;

export function parseInterests(value: unknown): Interest[] {
  const fail = (): never => { throw new Error('관심 전형 기록 형식을 확인해 주세요.'); };
  if (!Array.isArray(value) || value.length > 500) return fail();
  const ids = new Set<string>();
  return value.map(item => {
    if (!item || typeof item.university !== 'string' || !item.university.trim() || item.university.length > 200
      || typeof item.program !== 'string' || !item.program.trim() || item.program.length > 300
      || typeof item.created_at !== 'string' || item.created_at.length > 40 || !Number.isFinite(Date.parse(item.created_at))) return fail();
    const university = item.university.trim(), program = item.program.trim(), id = interestId(university, program);
    if (item.id !== id || ids.has(id)) return fail();
    ids.add(id);
    return { id, university, program, created_at: item.created_at };
  });
}
