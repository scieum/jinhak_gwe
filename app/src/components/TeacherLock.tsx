import { useEffect, useState } from 'react';
import { ButtonPrimary } from './Buttons';
import { Icon } from './Icon';
import { checkPin, isExpired, loadLock, lockNow, touch } from '../domain/teacherLock';

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

export function TeacherLockButton() {
  const [on, setOn] = useState(() => !!loadLock());
  useEffect(() => { const f = () => setOn(!!loadLock()); window.addEventListener(EVENT, f); return () => window.removeEventListener(EVENT, f); }, []);
  if (!on) return null;
  return <button type="button" className="button-outline teacher-lock__button" onClick={() => { lockNow(); announceLockChange(); }}><Icon name="lock" size={16} /> 잠금</button>;
}
