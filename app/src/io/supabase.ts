import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 계정 서버(Supabase). app/.env.local 의 VITE_SUPABASE_URL · VITE_SUPABASE_PUBLISHABLE_KEY 가 있을 때만 켜져요.
 * publishable key는 브라우저 공개용이고, 데이터는 서버의 RLS가 지켜요(supabase/migrations).
 */
const url = import.meta.env.VITE_SUPABASE_URL ?? '', key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
export const supabase: SupabaseClient | null = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) && key ? createClient(url, key) : null;

/** NEIS 학교 검색. 코드는 supabase/functions/neis-schools, 대시보드에서 배포할 때 이름이 hyper-action으로 붙었어요(2026-11-20). */
const NEIS_FUNCTION = 'hyper-action';
export interface School { code: string; name: string; region: string; address: string }
export async function searchSchools(sido: string, level: string, q: string): Promise<School[]> {
  if (!supabase) throw new Error('학교 목록 연결을 준비하고 있어요.');
  const res = await fetch(`${url}/functions/v1/${NEIS_FUNCTION}?${new URLSearchParams({ sido, level, q })}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const body = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(body)) throw new Error(body?.error ?? '학교 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
  return body.filter((s: School) => s && typeof s.code === 'string' && typeof s.name === 'string').slice(0, 50);
}
