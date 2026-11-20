import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { Modal } from './Modal';
import { currentAccount, signOut } from '../io/account';
import { listServerClasses, loadClassFromServer, saveClassToServer, type ServerClass } from '../io/classSync';
import { supabase } from '../io/supabase';

type Account = Awaited<ReturnType<typeof currentAccount>>;
function useAccount() {
  const [account, setAccount] = useState<Account | undefined>(supabase ? undefined : null);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    const load = () => currentAccount().then(a => { if (live) setAccount(a); }).catch(() => { if (live) setAccount(null); });
    load();
    const { data } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);
  return account;
}
const when = (iso: string) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });

/** 우리 반 홈 > 학급 관리: 계정과 서버 보관. 서버 설정이 없으면 아무것도 그리지 않아요. */
export function ServerSync() {
  const account = useAccount();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(''), [confirm, setConfirm] = useState<ServerClass | null>(null), [list, setList] = useState<ServerClass[] | null>(null);
  if (!supabase || account === undefined) return null;
  if (!account) return <p className="t-body-sm">로그인하면 학급 데이터를 서버에 보관하고 다른 기기에서 이어 쓸 수 있어요. <Link className="t-link" to="/login">로그인 ›</Link></p>;
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(''); setMessage(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요.'); } finally { setBusy(false); } };
  return <fieldset className="form-grid"><legend className="t-heading-4">서버 보관</legend>
    <p className="t-caption text-muted">{account.school} · {account.name} · {account.email}</p>
    <div className="toolbar"><ButtonOutline disabled={busy} onClick={() => run(async () => setMessage(`서버에 저장했어요 · ${when(await saveClassToServer())}`))}>서버에 저장</ButtonOutline>
      <ButtonOutline disabled={busy} onClick={() => run(async () => setList(await listServerClasses()))}>서버에서 불러오기</ButtonOutline>
      <ButtonOutline onClick={() => void signOut()}>로그아웃</ButtonOutline></div>
    {list && (!list.length ? <p className="t-body-sm text-muted">서버에 저장한 학급이 없어요.</p>
      : <ul className="menu-rows">{list.map(c => <li key={c.class_code}><button type="button" className="menu-row" onClick={() => setConfirm(c)}><span><strong>{c.class_name}</strong><span className="t-caption text-muted">학급 코드 {c.class_code} · {when(c.updated_at)} 저장</span></span></button></li>)}</ul>)}
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}
    {confirm && <Modal label="서버에서 불러오기" onClose={() => setConfirm(null)}><h3 className="t-heading-3">{confirm.class_name}을 불러올까요?</h3>
      <p>이 기기의 학급 데이터(명단·카드·메모·성적)를 {when(confirm.updated_at)}에 서버에 저장한 내용으로 바꿔요. 이 기기에서 그 뒤에 고친 내용은 사라져요.</p>
      <div className="toolbar"><ButtonOutline onClick={() => setConfirm(null)}>취소</ButtonOutline>
        <ButtonPrimary disabled={busy} onClick={() => { const c = confirm; setConfirm(null); void run(async () => { await loadClassFromServer(c.class_code); setList(null); setMessage(`${c.class_name}을 불러왔어요.`); }); }}>바꿔서 불러오기</ButtonPrimary></div></Modal>}
  </fieldset>;
}

/** 새 기기의 빈 학급 화면: 서버에 저장한 학급이 있으면 바로 불러와요. */
export function ServerRestore() {
  const account = useAccount();
  const [list, setList] = useState<ServerClass[]>([]), [error, setError] = useState('');
  useEffect(() => { if (account) listServerClasses().then(setList).catch(() => setList([])); }, [account]);
  if (!account || !list.length) return null;
  return <div className="menu-rows"><p className="t-body-sm">서버에 저장한 학급이 있어요.</p>
    {list.map(c => <button key={c.class_code} type="button" className="menu-row" onClick={() => loadClassFromServer(c.class_code).catch(e => setError(e instanceof Error ? e.message : '불러오지 못했어요.'))}>
      <span><strong>{c.class_name} 불러오기</strong><span className="t-caption text-muted">학급 코드 {c.class_code} · {when(c.updated_at)} 저장</span></span></button>)}
    {error && <p role="alert" className="error-note">{error}</p>}</div>;
}
