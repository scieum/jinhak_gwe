import { supabase } from './supabase';

/** 교사·관리자 계정(PRD 7-3·7-4). 역할은 서버 profiles.role 에서만 읽어요. */
export type Role = 'teacher' | 'admin';
const NETWORK = '서버에 연결하지 못했어요. 잠시 후 다시 시도하세요.';
const message = (e: { code?: string; message?: string } | null | undefined, fallback = NETWORK) => {
  switch (e?.code) {
    case 'invalid_credentials': return '이메일 또는 비밀번호가 올바르지 않아요.';
    case 'email_not_confirmed': return '아직 이메일 확인이 끝나지 않았어요. 가입할 때 받은 메일의 링크를 눌러 주세요.';
    case 'user_already_exists': case 'email_exists': return '이미 가입한 이메일이에요. 로그인하거나 비밀번호 찾기를 써 주세요';
    case 'weak_password': return '비밀번호를 더 길고 어렵게 정해 주세요.';
    case 'over_email_send_rate_limit': case 'over_request_rate_limit': return '요청이 많아요. 잠시 후 다시 시도해 주세요.';
    default: return fallback;
  }
};
const client = () => { if (!supabase) throw new Error('계정 서버를 준비하고 있어요.'); return supabase; };
const back = (path: string) => `${location.origin}${import.meta.env.BASE_URL}${path}`;

export async function signIn(email: string, password: string): Promise<Role> {
  const { data, error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) throw new Error(message(error));
  const { data: profile, error: pe } = await client().from('profiles').select('role, school_name').eq('id', data.user.id).single();
  if (pe || !profile?.school_name) { await client().auth.signOut(); throw new Error('학교 정보가 없는 계정이에요. 회원가입을 다시 해 주세요.'); }
  return profile.role === 'admin' ? 'admin' : 'teacher';
}
export async function signUp(f: { email: string; password: string; name: string; school_code: string; school_name: string }) {
  const { data, error } = await client().auth.signUp({ email: f.email.trim(), password: f.password,
    options: { emailRedirectTo: back('login'), data: { name: f.name.trim(), school_code: f.school_code, school_name: f.school_name } } });
  if (error) throw new Error(message(error));
  // 이미 있는 이메일이면 Supabase가 오류 대신 빈 identities를 돌려줘요(계정 있는지 숨기는 동작).
  if (data.user && !data.user.identities?.length) throw new Error(message({ code: 'user_already_exists' }));
}
export async function resetPassword(email: string) {
  const { error } = await client().auth.resetPasswordForEmail(email.trim(), { redirectTo: back('login') });
  if (error) throw new Error(message(error));
}
export async function signOut() { await supabase?.auth.signOut(); }
export async function currentAccount(): Promise<{ email: string; name: string; school: string; role: Role } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabase.from('profiles').select('name, school_name, role').eq('id', data.user.id).single();
  return p ? { email: data.user.email ?? '', name: p.name, school: p.school_name, role: p.role === 'admin' ? 'admin' : 'teacher' } : null;
}
