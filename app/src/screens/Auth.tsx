import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { NOT_READY, SCHOOL_LEVEL, SIDO, TERMS, checkSignup, validId, type SignupErrors, type SignupForm } from '../domain/auth';
import { signIn, signUp } from '../io/account';
import { searchSchools, supabase, type School } from '../io/supabase';
import '../styles/auth.css';

// v2 시안(login 467:151) 2×2 순서·줄바꿈 그대로
const INTRO = [
  { icon: 'qr-code', title: '상담카드 수합', text: '학생이 보낸 QR·파일 상담카드를\n한 표로 모아요' },
  { icon: 'users', title: '학교별 분리', text: '우리 학교·우리 반 학생 기록만 보여요.\n학생은 번호·별칭으로만 저장해요' },
  { icon: 'search', title: 'NEIS 학교 선택', text: '회원가입 때 시/도와 학교 이름으로\n우리 고등학교를 골라요' },
  { icon: 'check', title: '수능 최저 충족 현황', text: '반 학생의 수능 최저 충족 현황을\n한눈에 정리해요. 예측이 아니에요' },
];

// 시안: 모바일은 폼 카드 아래, PC는 폼 아래에 "○○ ›" 알약 버튼 한 줄
function SwitchRow({ question, to, label }: { question: string; to: string; label: string }) {
  return <p className="auth__switch"><span className="t-body-sm text-muted">{question}</span><Link className="button-pill-soft t-link" to={to}>{label} ›</Link></p>;
}

function AuthShell({ slug, label, other, switchRow, children }: { slug: string; label: string; other: { to: string; label: string }; switchRow?: ReactNode; children: ReactNode }) {
  return <div className="auth" data-slug={slug} aria-label={label}>
    <header className="auth__header"><Link to="/home" aria-label="U:NAVI 홈"><BrandLogo /></Link><Link className="button-outline" to={other.to}>{other.label}</Link></header>
    <div className="auth__body"><main className="auth__form">{children}{switchRow}</main>
      <aside className="auth__intro" aria-label="서비스 소개"><div className="auth__intro-inner"><h2 className="t-heading-2">우리 반 진학 상담, 한 화면에서 이어 봐요</h2>
        <p className="t-body-lg text-muted">학생이 보낸 상담카드·성적을 모아 수능 최저·수시 6장을 한눈에 봐요</p>
        <ul>{INTRO.map(i => <li key={i.title} className="auth__card"><Icon name={i.icon} className="auth__icon" /><h3 className="t-heading-4">{i.title}</h3><p className="t-body-sm text-muted">{i.text}</p></li>)}</ul>
        <p className="t-caption text-muted">학생은 로그인 없이 써요. 상담카드는 QR·파일로 선생님께 보내요</p></div></aside></div>
  </div>;
}

function NotReady() {
  return <div className="auth__band" role="status"><Icon name="info" size={16} className="auth__icon" /><p className="t-body-sm">{NOT_READY} <Link className="t-link" to="/teacher/teacher-dashboard">이 기기에서 교사 모드 쓰기 ›</Link></p></div>;
}
const Band = ({ children }: { children: ReactNode }) => <div className="auth__band" role="status"><Icon name="info" size={16} className="auth__icon" /><p className="t-body-sm">{children}</p></div>;
function FieldError({ text }: { text?: string }) {
  return text ? <p className="field-error t-caption"><Icon name="triangle-alert" size={16} /> {text}</p> : null;
}
// toggle=false: 시안의 "비밀번호 확인" 칸은 보기 아이콘이 없다
function Password({ id, label, value, onChange, placeholder, error, toggle = true }: { id: string; label: ReactNode; value: string; onChange: (v: string) => void; placeholder: string; error?: string; toggle?: boolean }) {
  const [shown, setShown] = useState(false);
  return <div className="auth__field"><label htmlFor={id}>{label}</label>
    <div className="password-field"><input id={id} type={shown ? 'text' : 'password'} value={value} placeholder={placeholder} aria-invalid={!!error} autoComplete={id === 'login-password' ? 'current-password' : 'new-password'} onChange={e => onChange(e.target.value)} />
      {toggle && <button type="button" className="icon-button" aria-label="비밀번호 보기" aria-pressed={shown} onClick={() => setShown(!shown)}><Icon name="eye-off" size={20} /></button>}</div>
    <FieldError text={error} /></div>;
}

export function Login() {
  const navigate = useNavigate();
  const [id, setId] = useState(''), [password, setPassword] = useState('');
  const [notReady, setNotReady] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const reset = () => { setNotReady(false); setError(''); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); reset();
    if (!validId(id)) { setError('아이디를 다시 확인해 주세요'); return; }
    if (!supabase) { setNotReady(true); return; }
    setBusy(true);
    try { navigate((await signIn(id, password)) === 'admin' ? '/admin/admin-rules' : '/teacher/teacher-dashboard'); }
    catch (x) { setError(x instanceof Error ? x.message : '서버에 연결하지 못했어요. 잠시 후 다시 시도하세요.'); }
    finally { setBusy(false); }
  };
  return <AuthShell slug="login" label="로그인" other={{ to: '/signup', label: '회원가입' }} switchRow={<><SwitchRow question="아직 회원이 아니신가요?" to="/signup" label="회원가입" /><p className="auth__switch auth__about"><span className="t-body-sm text-muted">U:NAVI가 처음이라면</span><Link className="t-link" to="/about">서비스 소개 보기 ›</Link></p></>}>
    <form className="auth__card-form" onSubmit={submit} noValidate>
      <h1 className="t-heading-2">로그인</h1>
      <p className="auth__sub t-body-lg text-muted">아이디로 로그인하세요</p>
      <div className="auth__field auth__lead"><label htmlFor="login-id">아이디</label><input id="login-id" autoComplete="username" autoCapitalize="none" value={id} placeholder="아이디를 입력하세요" onChange={e => { setId(e.target.value); reset(); }} /></div>
      <Password id="login-password" label="비밀번호" value={password} onChange={v => { setPassword(v); reset(); }} placeholder="비밀번호를 입력하세요" />
      <FieldError text={error} />
      {notReady && <NotReady />}
      <ButtonPrimary className="auth__submit" type="submit" disabled={busy || !id || !password}>로그인</ButtonPrimary>
      <p className="auth__note t-caption text-muted">비밀번호를 잊으면 관리자에게 초기화를 요청해 주세요.</p>
    </form>
  </AuthShell>;
}

const EMPTY: SignupForm = { sido: '', region: '', school: '', name: '', id: '', password: '', confirm: '', terms: {} };
export function Signup() {
  const navigate = useNavigate();
  const [f, setF] = useState<SignupForm>(EMPTY), [errors, setErrors] = useState<SignupErrors>({}), [tried, setTried] = useState(false), [reading, setReading] = useState<typeof TERMS[number] | null>(null);
  const [query, setQuery] = useState(''), [schools, setSchools] = useState<School[] | null>(null), [picked, setPicked] = useState<School | null>(null), [searchError, setSearchError] = useState('');
  const [serverError, setServerError] = useState(''), [pending, setPending] = useState(false), [busy, setBusy] = useState(false), [notReady, setNotReady] = useState(false);
  // 한 번에 여러 칸을 바꿔도(시/도 고르기 + 학교 비우기) 앞 변경을 덮어쓰지 않게 이전 값에서 이어 붙여요.
  const set = (patch: Partial<SignupForm>) => setF(prev => { const next = { ...prev, ...patch }; if (tried) setErrors(checkSignup(next)); return next; });
  const pick = (s: School | null) => { setPicked(s); set({ region: s?.region ?? '', school: s?.code ?? '' }); };
  const filled = [f.sido, query.trim().length >= 2 ? 'q' : '', f.school].filter(Boolean).length;
  const allAgreed = TERMS.every(t => f.terms[t.key]);
  const search = async () => {
    setSearchError(''); pick(null);
    if (!f.sido || query.trim().length < 2) { setSearchError('시/도를 고르고 학교 이름을 두 글자 이상 적어 주세요.'); return; }
    try { const list = await searchSchools(f.sido, SCHOOL_LEVEL, query.trim()); setSchools(list); if (!list.length) setSearchError('찾는 고등학교가 없어요. 이름을 다시 확인해 주세요.'); }
    catch (e) { setSchools(null); setSearchError(e instanceof Error ? e.message : '학교 목록을 불러오지 못했어요.'); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setServerError('');
    const found = checkSignup(f); setErrors(found);
    if (!supabase) { setNotReady(true); return; }
    if (Object.keys(found).length || !picked) return;
    setBusy(true);
    try {
      const role = await signUp({ id: f.id, password: f.password, name: f.name, school_code: picked.code, school_name: picked.name });
      if (role) navigate(role === 'admin' ? '/admin/admin-rules' : '/teacher/teacher-dashboard'); else setPending(true);
    } catch (x) { setServerError(x instanceof Error ? x.message : '서버에 연결하지 못했어요. 잠시 후 다시 시도하세요.'); }
    finally { setBusy(false); }
  };
  const req = (text: string) => <>{text}<span className="t-caption text-muted">필수</span></>;
  if (pending) return <AuthShell slug="signup" label="회원가입" other={{ to: '/login', label: '로그인' }}><form className="auth__card-form" onSubmit={e => e.preventDefault()}>
    <h1 className="t-heading-2">가입했어요</h1><p className="auth__sub t-body-lg text-muted">계정은 만들어졌지만 바로 로그인되지 않았어요. 관리자가 계정 확인 설정을 끄면 로그인할 수 있어요.</p>
    <Link className="button-primary auth__link-button" to="/login">로그인하러 가기</Link></form></AuthShell>;
  return <AuthShell slug="signup" label="회원가입" other={{ to: '/login', label: '로그인' }} switchRow={<SwitchRow question="이미 계정이 있으신가요?" to="/login" label="로그인" />}>
    <form className="auth__card-form" onSubmit={submit} noValidate>
      <h1 className="t-heading-2">회원가입</h1><p className="auth__sub t-body-lg text-muted">우리 고등학교를 고르고 계정을 만드세요</p>
      <h2 className="t-heading-4 auth__lead">1 학교 선택</h2>
      <Band>고른 학교의 기록만 보여요. 가입한 뒤에는 바꿀 수 없어요</Band>
      <div className="progress-steps progress-steps--3" role="progressbar" aria-label="학교 선택 진행" aria-valuemin={0} aria-valuemax={3} aria-valuenow={filled}>{[0, 1, 2].map(i => <i key={i} className={i < filled ? 'is-on' : ''} />)}</div>
      <div className="auth__field"><label htmlFor="sido">시/도</label><div className="password-field"><select id="sido" value={f.sido} onChange={e => { set({ sido: e.target.value }); pick(null); setSchools(null); }}><option value="">시/도 선택</option>{SIDO.map(s => <option key={s}>{s}</option>)}</select><Icon name="chevron-down" size={20} className="auth__select-icon" /></div></div>
      <div className="auth__field"><label htmlFor="school-q">학교 이름</label>
        <div className="password-field"><input id="school-q" value={query} placeholder="예: 한빛고" onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }} />
          <button type="button" className="icon-button" aria-label="학교 찾기" onClick={() => void search()}><Icon name="search" size={20} /></button></div>
        <FieldError text={searchError || (!picked ? errors.school : undefined)} />
        {schools && schools.length > 0 && <ul className="school-list" aria-label="학교 검색 결과">{schools.map(s => <li key={s.code}><button type="button" className="menu-row" aria-pressed={picked?.code === s.code} onClick={() => pick(s)}>
          <span><strong>{s.name}</strong><span className="t-caption text-muted">{[s.region, s.address].filter(Boolean).join(' · ')}</span></span>{picked?.code === s.code && <Icon name="check" size={20} />}</button></li>)}</ul>}
        {picked && <p className="t-caption">고른 학교: <strong>{picked.name}</strong></p>}</div>
      <h2 className="t-heading-4 auth__section">2 계정</h2>
      <div className="auth__field"><label htmlFor="name">{req('이름')}</label><input id="name" value={f.name} autoComplete="name" placeholder="이름을 입력하세요" aria-invalid={!!errors.name} onChange={e => set({ name: e.target.value })} /><FieldError text={errors.name} /></div>
      <div className="auth__field"><label htmlFor="signup-id">{req('아이디')}</label><input id="signup-id" value={f.id} autoComplete="username" autoCapitalize="none" placeholder="영문 소문자로 시작, 4~20자" aria-invalid={!!errors.id} onChange={e => set({ id: e.target.value.toLowerCase() })} /><FieldError text={errors.id} /></div>
      <Password id="password" label={req('비밀번호')} value={f.password} onChange={v => set({ password: v })} placeholder="8자 이상 입력하세요" error={errors.password} />
      <Password id="password-confirm" label={req('비밀번호 확인')} value={f.confirm} onChange={v => set({ confirm: v })} placeholder="비밀번호를 한 번 더 입력하세요" error={errors.confirm} toggle={false} />
      <fieldset className="terms"><legend className="sr-only">약관</legend>
        <label className="terms__row terms__all t-title"><input type="checkbox" checked={allAgreed} onChange={e => set({ terms: Object.fromEntries(TERMS.map(t => [t.key, e.target.checked])) })} /> 모두 동의</label>
        {TERMS.map(t => <div key={t.key} className="terms__row"><label className="t-body-sm"><input type="checkbox" checked={!!f.terms[t.key]} onChange={e => set({ terms: { ...f.terms, [t.key]: e.target.checked } })} /> {t.label}</label>
          <button type="button" className="icon-button" aria-label={`${t.label.replace(' (필수)', '')} 보기`} onClick={() => setReading(t)}><Icon name="chevron-right" size={16} /></button></div>)}
        <FieldError text={errors.terms} /></fieldset>
      <FieldError text={serverError} />{notReady && <NotReady />}
      <ButtonPrimary className="auth__submit" type="submit" disabled={busy}>가입하기</ButtonPrimary>
    </form>
    {reading && <Modal label={reading.label} onClose={() => setReading(null)}><h3 className="t-heading-4">{reading.label.replace(' (필수)', '')}</h3>
      <p className="t-body-sm">약관 전문은 서비스를 공개하기 전에 확정해 여기에 실어요.</p>
      <div className="toolbar"><ButtonOutline onClick={() => setReading(null)}>닫기</ButtonOutline><ButtonPrimary onClick={() => { set({ terms: { ...f.terms, [reading.key]: true } }); setReading(null); }}>동의하기</ButtonPrimary></div></Modal>}
  </AuthShell>;
}
