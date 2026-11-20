/**
 * 교사·관리자 계정(PRD 7-3·7-4, work/_ref/lab-stock-auth.md). 역할은 서버에서만 정해져요.
 * 계정 서버(Supabase)와 NEIS 학교 목록은 서버 쪽에서 연결해요. 연결 전에는 보내지 않고 안내만 해요.
 */
export const SIDO = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도',
  '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도'] as const;
export const SCHOOL_LEVELS = ['초등학교', '중학교', '고등학교'] as const;
export const TERMS = [
  { key: 'service', label: '서비스 이용약관 동의 (필수)' },
  { key: 'privacy', label: '개인정보 수집·이용 동의 (필수)' },
  { key: 'age', label: '만 14세 이상입니다 (필수)' },
] as const;

export interface SignupForm { sido: string; region: string; level: string; school: string; name: string; email: string; password: string; confirm: string; terms: Record<string, boolean> }
export type SignupErrors = Partial<Record<'school' | 'name' | 'email' | 'password' | 'confirm' | 'terms', string>>;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validEmail = (e: string) => EMAIL.test(e.trim());

export function checkSignup(f: SignupForm): SignupErrors {
  const e: SignupErrors = {};
  if (!f.school) e.school = '학교를 골라 주세요';
  if (!f.name.trim()) e.name = '이름을 입력해 주세요';
  if (!validEmail(f.email)) e.email = '이메일 형식을 확인해 주세요';
  if (f.password.length < 8) e.password = '비밀번호를 8자 이상으로 입력해 주세요';
  if (f.confirm !== f.password) e.confirm = '비밀번호가 서로 달라요. 한 번 더 확인해 주세요';
  if (!TERMS.every(t => f.terms[t.key])) e.terms = '필수 약관에 동의해 주세요';
  return e;
}

// shortcut: 계정 서버가 없어 로그인·가입·비밀번호 찾기는 보내지 않고 이 안내만 보여요. Supabase를 붙일 때 이 자리에 호출을 넣어요.
export const NOT_READY = '계정 서버를 준비하고 있어요. 지금은 이 기기에서 교사 모드를 바로 쓸 수 있어요(학급 데이터는 이 기기에만 저장돼요).';
