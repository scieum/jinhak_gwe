import { supabase } from './supabase';
import { emailToId, idToEmail } from '../domain/auth';

/** 교사·관리자 계정(PRD 7-3·7-4). 아이디 계정(메일 확인 없음). 역할은 서버 profiles.role 에서만 읽어요. */
export type Role = 'teacher' | 'admin';
const NETWORK = '서버에 연결하지 못했어요. 잠시 후 다시 시도하세요.';
const message = (e: { code?: string } | null | undefined, fallback = NETWORK) => {
  switch (e?.code) {
    case 'invalid_credentials': return '아이디 또는 비밀번호가 올바르지 않아요.';
    case 'email_not_confirmed': return '계정 확인이 아직 켜져 있어요. 관리자에게 알려 주세요.';
    case 'user_already_exists': case 'email_exists': return '이미 쓰는 아이디예요. 다른 아이디를 정해 주세요';
    case 'weak_password': return '비밀번호를 더 길고 어렵게 정해 주세요.';
    case 'email_address_invalid': return '아이디를 다시 확인해 주세요.';
    case 'over_request_rate_limit': case 'over_email_send_rate_limit': return '요청이 많아요. 잠시 후 다시 시도해 주세요.';
    default: return fallback;
  }
};
const client = () => { if (!supabase) throw new Error('계정 서버를 준비하고 있어요.'); return supabase; };

async function roleOf(userId: string): Promise<Role> {
  const { data: profile, error } = await client().from('profiles').select('role, school_name').eq('id', userId).single();
  if (error || !profile?.school_name) { await client().auth.signOut(); throw new Error('학교 정보가 없는 계정이에요. 회원가입을 다시 해 주세요.'); }
  return profile.role === 'admin' ? 'admin' : 'teacher';
}

export async function signIn(id: string, password: string): Promise<Role> {
  const { data, error } = await client().auth.signInWithPassword({ email: idToEmail(id), password });
  if (error || !data.user) throw new Error(message(error));
  return roleOf(data.user.id);
}
/** 가입하면 바로 로그인돼요(대시보드 Confirm email 꺼짐). 켜져 있으면 null을 돌려줘요. */
export async function signUp(f: { id: string; password: string; name: string; school_code: string; school_name: string }): Promise<Role | null> {
  const { data, error } = await client().auth.signUp({ email: idToEmail(f.id), password: f.password,
    options: { data: { name: f.name.trim(), school_code: f.school_code, school_name: f.school_name } } });
  if (error) throw new Error(message(error));
  if (data.user && !data.user.identities?.length) throw new Error(message({ code: 'user_already_exists' }));
  return data.session && data.user ? roleOf(data.user.id) : null;
}
export async function signOut() { await supabase?.auth.signOut(); }
export async function currentAccount(): Promise<{ id: string; name: string; school: string; role: Role } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabase.from('profiles').select('name, school_name, role').eq('id', data.user.id).single();
  return p ? { id: emailToId(data.user.email ?? ''), name: p.name, school: p.school_name, role: p.role === 'admin' ? 'admin' : 'teacher' } : null;
}
