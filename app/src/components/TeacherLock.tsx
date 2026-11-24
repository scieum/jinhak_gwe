import { useEffect, useState } from 'react';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { LOCK_MINUTES, checkPin, isExpired, loadLock, lockNow, saveLock, touch } from '../domain/teacherLock';

const EVENT = 'jinhak-teacher-lock';
export const announceLockChange = () => window.dispatchEvent(new Event(EVENT));

/** 교사 화면 위 잠금. 잠금 번호를 정한 기기에서만 동작해요. */
export function TeacherLockGate() {
  const [config, setConfig] = useState(loadLock);
  const [locked, setLocked] = useState(() => { const c = loadLock(); return !!c && isExpired(c); });
  const [pin, setPin] = useState(''), [error, setError] = useState(''), [checking, setChecking] = useState(false);
  useEffect(() => {
    const changed = () => { const c = loadLock(); setConfig(c); setLocked(!!c && isExpired(c)); };
    window.addEventListener(EVENT, changed);
    return () => window.removeEventListener(EVENT, changed);
  }, []);
  useEffect(() => {
    if (!config || locked) return;
    let last = 0;
    const active = () => { const now = Date.now(); if (now - last > 5000) { last = now; touch(now); } };
    const check = () => { if (isExpired(config)) setLocked(true); };
    const events = ['pointerdown', 'keydown', 'scroll'] as const;
    events.forEach(e => window.addEventListener(e, active, { passive: true }));
    const timer = window.setInterval(check, 15_000);
    document.addEventListener('visibilitychange', check);
    return () => { events.forEach(e => window.removeEventListener(e, active)); window.clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, [config, locked]);
  if (!config || !locked) return null;
  const unlock = async (e: React.FormEvent) => {
    e.preventDefault(); setChecking(true);
    if (await checkPin(pin, config)) { touch(); setLocked(false); setPin(''); setError(''); }
    else setError('잠금 번호가 달라요. 다시 입력해 주세요.');
    setChecking(false);
  };
  return <div className="teacher-lock" role="dialog" aria-modal="true" aria-label="교사 화면 잠금">
    <form onSubmit={unlock} className="teacher-lock__box">
      <Icon name="lock" size={32} />
      <h2 className="t-heading-3">교사 화면이 잠겼어요</h2>
      <p className="t-body-sm text-muted">{config.minutes}분 동안 쓰지 않아 잠갔어요. 학급 데이터를 보려면 잠금 번호를 입력해 주세요.</p>
      <label>잠금 번호<input autoFocus type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} aria-invalid={!!error} onChange={e => { setPin(e.target.value); setError(''); }} /></label>
      {error && <p role="alert" className="error-note">{error}</p>}
      <ButtonPrimary type="submit" disabled={!pin || checking}>잠금 풀기</ButtonPrimary>
      <p className="t-caption text-muted">잠금 번호를 잊었으면 이 기기의 학급 데이터를 지우고 다시 만들어야 해요.</p>
    </form>
  </div>;
}

/** page-header "잠금"(v2 시안 button-outline, 늘 보여요). 번호가 없으면 학생 잠금처럼 먼저 정하고 바로 잠가요. */
export function TeacherLockButton() {
  const [setup, setSetup] = useState(false), [pin, setPin] = useState(''), [confirm, setConfirm] = useState(''), [minutes, setMinutes] = useState(10), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const lock = () => { lockNow(); announceLockChange(); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { if (pin !== confirm) throw new Error('두 번 입력한 잠금 번호가 달라요.'); await saveLock(pin, minutes); setSetup(false); setPin(''); setConfirm(''); setError(''); lock(); }
    catch (err) { setError(err instanceof Error ? err.message : '저장하지 못했어요.'); }
    finally { setBusy(false); }
  };
  return <>
    <button type="button" className="button-outline teacher-lock__button" onClick={() => (loadLock() ? lock() : setSetup(true))}>잠금</button>
    {setup && <Modal label="교사 화면 잠금 번호 정하기" onClose={() => { if (!busy) setSetup(false); }}>
      <form onSubmit={save} className="form-grid">
        <h3 className="t-heading-4">잠금 번호를 정해 주세요</h3>
        <p className="t-caption text-muted">잠그면 이 번호를 넣어야 교사 화면이 다시 열려요. 정한 시간 동안 쓰지 않아도 잠겨요. 번호는 이 기기에만 암호화해서 저장돼요.</p>
        <label>잠금 번호(숫자 4~8자리)<input autoFocus type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin} onChange={e => setPin(e.target.value)} /></label>
        <label>잠금 번호 확인<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <label>쓰지 않으면 잠그기까지<select value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{LOCK_MINUTES.map(m => <option key={m} value={m}>{m}분</option>)}</select></label>
        {error && <p role="alert" className="error-note">{error}</p>}
        <div className="sample-confirm__actions"><ButtonOutline disabled={busy} onClick={() => setSetup(false)}>취소</ButtonOutline><ButtonPrimary type="submit" disabled={busy || !pin}>정하고 잠그기</ButtonPrimary></div>
      </form>
    </Modal>}
  </>;
}
