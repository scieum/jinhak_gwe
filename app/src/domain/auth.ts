/**
 * 교사·관리자 계정(PRD 7-3·7-4, work/_ref/lab-stock-auth.md). 역할은 서버에서만 정해져요.
 * 2026-11-20 사용자 결정: 이메일을 모으지 않고 아이디로 가입, 메일 확인 없음, 고등학교만.
 */
export const SIDO = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시', '경기도', '강원특별자치도',
  '충청북도', '충청남도', '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도'] as const;
export const SCHOOL_LEVEL = '고등학교';
export const TERMS = [
  { key: 'service', label: '서비스 이용약관 동의 (필수)' },
  { key: 'privacy', label: '개인정보 수집·이용 동의 (필수)' },
  { key: 'age', label: '만 14세 이상입니다 (필수)' },
] as const;

export interface SignupForm { sido: string; region: string; school: string; name: string; id: string; password: string; confirm: string; terms: Record<string, boolean> }
export type SignupErrors = Partial<Record<'school' | 'name' | 'id' | 'password' | 'confirm' | 'terms', string>>;

/** 아이디: 영문 소문자로 시작, 영문·숫자·. _ - 로 4~20자. */
const ID = /^[a-z][a-z0-9._-]{3,19}$/;
export const validId = (id: string) => ID.test(id.trim().toLowerCase());
/** Supabase 계정은 이메일 칸이 꼭 필요해서, 메일을 받을 수 없는 예약 주소(example.com, RFC 2606)로 바꿔 넣어요. */
export const ID_DOMAIN = 'example.com';
export const idToEmail = (id: string) => `${id.trim().toLowerCase()}@${ID_DOMAIN}`;
export const emailToId = (email: string) => (email.endsWith(`@${ID_DOMAIN}`) ? email.slice(0, -ID_DOMAIN.length - 1) : email);

export function checkSignup(f: SignupForm): SignupErrors {
  const e: SignupErrors = {};
  if (!f.school) e.school = '학교를 골라 주세요';
  if (!f.name.trim()) e.name = '이름을 입력해 주세요';
  if (!validId(f.id)) e.id = '아이디는 영문 소문자로 시작하고, 영문·숫자·. _ - 로 4~20자예요';
  if (f.password.length < 8) e.password = '비밀번호를 8자 이상으로 입력해 주세요';
  if (f.confirm !== f.password) e.confirm = '비밀번호가 서로 달라요. 한 번 더 확인해 주세요';
  if (!TERMS.every(t => f.terms[t.key])) e.terms = '필수 약관에 동의해 주세요';
  return e;
}

// 계정 서버 설정(app/.env.local)이 없을 때는 보내지 않고 이 안내만 보여요.
export const NOT_READY = '계정 서버를 준비하고 있어요. 지금은 이 기기에서 교사 모드를 바로 쓸 수 있어요(학급 데이터는 이 기기에만 저장돼요).';
