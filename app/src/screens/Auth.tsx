import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { NOT_READY, SCHOOL_LEVELS, SIDO, TERMS, checkSignup, validEmail, type SignupErrors, type SignupForm } from '../domain/auth';
import { resetPassword, signIn, signUp } from '../io/account';
import { searchSchools, supabase, type School } from '../io/supabase';
import '../styles/auth.css';

const INTRO = [
  { icon: 'users', title: '학교별 분리', text: '우리 학교·우리 반 학생 기록만 보여요. 학생은 번호·별칭으로만 저장해요' },
  { icon: 'search', title: 'NEIS 학교 선택', text: '회원가입 때 시/도 → 학교급 → 학교 이름으로 우리 학교를 골라요' },
  { icon: 'qr-code', title: '상담카드 수합', text: '학생이 보낸 QR·파일 상담카드를 한 표로 모아요' },
  { icon: 'check', title: '수능 최저 충족 현황', text: '반 학생의 수능 최저 충족 현황을 한눈에 정리해요. 예측이 아니에요' },
];

function AuthShell({ slug, label, other, children }: { slug: string; label: string; other: { to: string; label: string }; children: ReactNode }) {
  return <div className="auth" data-slug={slug} aria-label={label}>
    <header className="auth__header"><Link to="/home" aria-label="진학내비 홈"><BrandLogo /></Link><Link className="button-outline" to={other.to}>{other.label}</Link></header>
    <div className="auth__body"><main className="auth__form">{children}</main>
      <aside className="auth__intro" aria-label="서비스 소개"><h2 className="t-heading-2">우리 반 진학 상담, 한 화면에서 이어 봐요</h2>
        <p className="t-body-lg text-muted">학생이 보낸 상담카드·성적을 모아 수능 최저·수시 6장을 한눈에 봐요</p>
        <ul>{INTRO.map(i => <li key={i.title} className="auth__card"><Icon name={i.icon} className="auth__icon" /><div><h3 className="t-heading-4">{i.title}</h3><p className="t-body-sm text-muted">{i.text}</p></div></li>)}</ul>
        <p className="t-caption text-muted">학생은 로그인 없이 써요. 상담카드는 QR·파일로 선생님께 보내요</p></aside></div>
  </div>;
}

function NotReady() {
  return <div className="auth__band" role="status"><Icon name="info" size={16} className="auth__icon" /><p className="t-body-sm">{NOT_READY} <Link className="t-link" to="/teacher/teacher-dashboard">이 기기에서 교사 모드 쓰기 ›</Link></p></div>;
}
const Band = ({ children }: { children: ReactNode }) => <div className="auth__band" role="status"><Icon name="info" size={16} className="auth__icon" /><p className="t-body-sm">{children}</p></div>;
function FieldError({ text }: { text?: string }) {
  return text ? <p className="field-error t-caption"><Icon name="triangle-alert" size={14} /> {text}</p> : null;
}
function Password({ id, label, value, onChange, placeholder, error }: { id: string; label: ReactNode; value: string; onChange: (v: string) => void; placeholder: string; error?: string }) {
  const [shown, setShown] = useState(false);
  return <div className="auth__field"><label htmlFor={id}>{label}</label>
    <div className="password-field"><input id={id} type={shown ? 'text' : 'password'} value={value} placeholder={placeholder} aria-invalid={!!error} autoComplete={id === 'login-password' ? 'current-password' : 'new-password'} onChange={e => onChange(e.target.value)} />
      <button type="button" className="icon-button" aria-label="비밀번호 보기" aria-pressed={shown} onClick={() => setShown(!shown)}><Icon name="eye-off" size={20} /></button></div>
    <FieldError text={error} /></div>;
}

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [view, setView] = useState<'login' | 'forgot'>('login');
  const [notReady, setNotReady] = useState(false), [error, setError] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false);
  const reset = () => { setNotReady(false); setError(''); setInfo(''); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); reset();
    if (!validEmail(email)) { setError('이메일 형식을 확인해 주세요'); return; }
    if (!supabase) { setNotReady(true); return; }
    setBusy(true);
    try {
      if (view === 'forgot') { await resetPassword(email); setInfo('비밀번호를 다시 정하는 링크를 메일로 보냈어요. 메일이 안 보이면 스팸함도 확인해 주세요.'); }
      else navigate((await signIn(email, password)) === 'admin' ? '/admin/admin-rules' : '/teacher/teacher-dashboard');
    } catch (x) { setError(x instanceof Error ? x.message : '서버에 연결하지 못했어요. 잠시 후 다시 시도하세요.'); }
    finally { setBusy(false); }
  };
  return <AuthShell slug="login" label="로그인" other={{ to: '/signup', label: '회원가입' }}>
    <form onSubmit={submit} noValidate>
      <h1 className="t-heading-2">{view === 'login' ? '로그인' : '비밀번호 찾기'}</h1>
      <p className="t-body-lg text-muted">{view === 'login' ? '개인 이메일로 로그인하세요' : '가입한 개인 이메일로 비밀번호를 다시 정하는 링크를 보내요'}</p>
      <div className="auth__field"><label htmlFor="login-email">개인 이메일</label><input id="login-email" type="email" autoComplete="email" value={email} placeholder="name@example.com" aria-invalid={!!error && view === 'forgot'} onChange={e => { setEmail(e.target.value); reset(); }} /></div>
      {view === 'login' && <Password id="login-password" label="비밀번호" value={password} onChange={v => { setPassword(v); reset(); }} placeholder="비밀번호를 입력하세요" />}
      <FieldError text={error} />
      {notReady && <NotReady />}{info && <Band>{info}</Band>}
      <ButtonPrimary type="submit" disabled={busy || !email || (view === 'login' && !password)}>{view === 'login' ? '로그인' : '재설정 메일 보내기'}</ButtonPrimary>
      <button type="button" className="text-button auth__center" onClick={() => { setView(view === 'login' ? 'forgot' : 'login'); reset(); }}>{view === 'login' ? '비밀번호 찾기' : '로그인으로 돌아가기'}</button>
      {view === 'login' && <p className="auth__center t-body-sm text-muted">아직 회원이 아니신가요? <Link className="button-pill-soft" to="/signup">회원가입 <Icon name="chevron-right" size={16} className="auth__icon" /></Link></p>}
    </form>
  </AuthShell>;
}

const EMPTY: SignupForm = { sido: '', region: '', level: '고등학교', school: '', name: '', email: '', password: '', confirm: '', terms: {} };
export function Signup() {
  const [f, setF] = useState<SignupForm>(EMPTY), [errors, setErrors] = useState<SignupErrors>({}), [tried, setTried] = useState(false), [reading, setReading] = useState<typeof TERMS[number] | null>(null);
  const [query, setQuery] = useState(''), [schools, setSchools] = useState<School[] | null>(null), [picked, setPicked] = useState<School | null>(null), [searchError, setSearchError] = useState('');
  const [serverError, setServerError] = useState(''), [sent, setSent] = useState(''), [busy, setBusy] = useState(false), [notReady, setNotReady] = useState(false);
  const set = (patch: Partial<SignupForm>) => { const next = { ...f, ...patch }; setF(next); if (tried) setErrors(checkSignup(next)); };
  const pick = (s: School | null) => { setPicked(s); set({ region: s?.region ?? '', school: s?.code ?? '' }); };
  const filled = [f.sido, f.level, query.trim().length >= 2 ? 'q' : '', f.school].filter(Boolean).length;
  const allAgreed = TERMS.every(t => f.terms[t.key]);
  const search = async () => {
    setSearchError(''); pick(null);
    if (!f.sido || query.trim().length < 2) { setSearchError('시/도를 고르고 학교 이름을 두 글자 이상 적어 주세요.'); return; }
    try { const list = await searchSchools(f.sido, f.level, query.trim()); setSchools(list); if (!list.length) setSearchError('찾는 학교가 없어요. 이름을 다시 확인해 주세요.'); }
    catch (e) { setSchools(null); setSearchError(e instanceof Error ? e.message : '학교 목록을 불러오지 못했어요.'); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTried(true); setServerError('');
    const found = checkSignup(f); setErrors(found);
    if (!supabase) { setNotReady(true); return; }
    if (Object.keys(found).length || !picked) return;
    setBusy(true);
    try { await signUp({ email: f.email, password: f.password, name: f.name, school_code: picked.code, school_name: picked.name }); setSent(f.email.trim()); }
    catch (x) { setServerError(x instanceof Error ? x.message : '서버에 연결하지 못했어요. 잠시 후 다시 시도하세요.'); }
    finally { setBusy(false); }
  };
  const req = (text: string) => <>{text} <span className="t-caption text-muted">필수</span></>;
  if (sent) return <AuthShell slug="signup" label="회원가입" other={{ to: '/login', label: '로그인' }}><form onSubmit={e => e.preventDefault()}>
    <h1 className="t-heading-2">메일을 확인해 주세요</h1><p className="t-body-lg text-muted">{sent}으로 확인 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나요</p>
    <Band>메일이 안 보이면 스팸함도 확인해 주세요</Band><Link className="button-primary auth__link-button" to="/login">로그인하러 가기</Link></form></AuthShell>;
  return <AuthShell slug="signup" label="회원가입" other={{ to: '/login', label: '로그인' }}>
    <form onSubmit={submit} noValidate>
      <h1 className="t-heading-2">회원가입</h1><p className="t-body-lg text-muted">우리 학교를 고르고 계정을 만드세요</p>
      <h2 className="t-heading-4">1 학교 선택</h2>
      <Band>고른 학교의 기록만 보여요. 가입한 뒤에는 바꿀 수 없어요</Band>
      <div className="progress-steps" role="progressbar" aria-label="학교 선택 진행" aria-valuemin={0} aria-valuemax={4} aria-valuenow={filled}>{[0, 1, 2, 3].map(i => <i key={i} className={i < filled ? 'is-on' : ''} />)}</div>
      <div className="auth__field"><label htmlFor="sido">시/도</label><select id="sido" value={f.sido} onChange={e => { set({ sido: e.target.value }); pick(null); setSchools(null); }}><option value="">시/도 선택</option>{SIDO.map(s => <option key={s}>{s}</option>)}</select></div>
      <div className="auth__field"><span className="label">{req('학교급')}</span><SegmentedControl label="학교급" value={f.level} onChange={v => { set({ level: v }); pick(null); setSchools(null); }} options={SCHOOL_LEVELS.map(l => ({ value: l, label: l }))} /></div>
      <div className="auth__field"><label htmlFor="school-q">학교 이름</label>
        <div className="password-field"><input id="school-q" value={query} placeholder="예: 한빛고" onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }} />
          <button type="button" className="icon-button" aria-label="학교 찾기" onClick={() => void search()}><Icon name="search" size={20} /></button></div>
        <FieldError text={searchError || (!picked ? errors.school : undefined)} />
        {schools && schools.length > 0 && <ul className="school-list" aria-label="학교 검색 결과">{schools.map(s => <li key={s.code}><button type="button" className="menu-row" aria-pressed={picked?.code === s.code} onClick={() => pick(s)}>
          <span><strong>{s.name}</strong><span className="t-caption text-muted">{[s.region, s.address].filter(Boolean).join(' · ')}</span></span>{picked?.code === s.code && <Icon name="check" size={20} />}</button></li>)}</ul>}
        {picked && <p className="t-caption">고른 학교: <strong>{picked.name}</strong></p>}</div>
      <h2 className="t-heading-4 auth__section">2 계정</h2>
      <div className="auth__field"><label htmlFor="name">{req('이름')}</label><input id="name" value={f.name} autoComplete="name" placeholder="이름을 입력하세요" aria-invalid={!!errors.name} onChange={e => set({ name: e.target.value })} /><FieldError text={errors.name} /></div>
      <div className="auth__field"><label htmlFor="email">{req('개인 이메일')}</label><input id="email" type="email" value={f.email} autoComplete="email" placeholder="name@example.com" aria-invalid={!!errors.email} onChange={e => set({ email: e.target.value })} /><FieldError text={errors.email} /></div>
      <Password id="password" label={req('비밀번호')} value={f.password} onChange={v => set({ password: v })} placeholder="8자 이상 입력하세요" error={errors.password} />
      <Password id="password-confirm" label={req('비밀번호 확인')} value={f.confirm} onChange={v => set({ confirm: v })} placeholder="비밀번호를 한 번 더 입력하세요" error={errors.confirm} />
      <fieldset className="terms"><legend className="sr-only">약관</legend>
        <label className="terms__row terms__all"><input type="checkbox" checked={allAgreed} onChange={e => set({ terms: Object.fromEntries(TERMS.map(t => [t.key, e.target.checked])) })} /> 모두 동의</label>
        {TERMS.map(t => <div key={t.key} className="terms__row"><label><input type="checkbox" checked={!!f.terms[t.key]} onChange={e => set({ terms: { ...f.terms, [t.key]: e.target.checked } })} /> {t.label}</label>
          <button type="button" className="icon-button" aria-label={`${t.label.replace(' (필수)', '')} 보기`} onClick={() => setReading(t)}><Icon name="chevron-right" size={16} /></button></div>)}
        <FieldError text={errors.terms} /></fieldset>
      <FieldError text={serverError} />{notReady && <NotReady />}
      <ButtonPrimary type="submit" disabled={busy}>가입하기</ButtonPrimary>
      <p className="auth__center t-body-sm text-muted">이미 계정이 있으신가요? <Link className="button-pill-soft" to="/login">로그인 <Icon name="chevron-right" size={16} className="auth__icon" /></Link></p>
    </form>
    {reading && <Modal label={reading.label} onClose={() => setReading(null)}><h3 className="t-heading-4">{reading.label.replace(' (필수)', '')}</h3>
      <p className="t-body-sm">약관 전문은 서비스를 공개하기 전에 확정해 여기에 실어요.</p>
      <div className="toolbar"><ButtonOutline onClick={() => setReading(null)}>닫기</ButtonOutline><ButtonPrimary onClick={() => { set({ terms: { ...f.terms, [reading.key]: true } }); setReading(null); }}>동의하기</ButtonPrimary></div></Modal>}
  </AuthShell>;
}
