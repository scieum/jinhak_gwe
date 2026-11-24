import { useEffect, useState } from 'react';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { STUDENT_LOCK_EVENT, announceStudentLock, clearStudentLock, hasStudentPin, isStudentLocked, lockStudent, setStudentPin, unlockStudent } from '../domain/studentLock';
import { studentDb } from '../store/studentDb';

function useLocked() {
  const [locked, setLocked] = useState(isStudentLocked);
  useEffect(() => {
    const f = () => setLocked(isStudentLocked());
    window.addEventListener(STUDENT_LOCK_EVENT, f); window.addEventListener('storage', f);
    return () => { window.removeEventListener(STUDENT_LOCK_EVENT, f); window.removeEventListener('storage', f); };
  }, []);
  return locked;
}

/** page-header "잠금"(v2 시안 button-outline). 번호가 없으면 먼저 정하고 바로 잠가요. */
export function StudentLockButton({ className = 'button-outline teacher-lock__button' }: { className?: string }) {
  const [setup, setSetup] = useState(false), [pin, setPin] = useState(''), [confirm, setConfirm] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const lock = () => { lockStudent(); announceStudentLock(); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { if (pin !== confirm) throw new Error('두 번 입력한 잠금 번호가 달라요.'); await setStudentPin(pin); setSetup(false); setPin(''); setConfirm(''); setError(''); lock(); }
    catch (err) { setError(err instanceof Error ? err.message : '저장하지 못했어요.'); }
    finally { setBusy(false); }
  };
  return <>
    <button type="button" className={className} onClick={() => (hasStudentPin() ? lock() : setSetup(true))}>잠금</button>
    {setup && <Modal label="학생 화면 잠금 번호 정하기" onClose={() => { if (!busy) setSetup(false); }}>
      <form onSubmit={save} className="form-grid">
        <h3 className="t-heading-4">잠금 번호를 정해 주세요</h3>
        <p className="t-caption text-muted">잠그면 이 번호를 넣어야 학생 화면이 다시 열려요. 번호는 이 기기에만 암호화해서 저장돼요.</p>
        <label>잠금 번호(숫자 4~8자리)<input autoFocus type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin} onChange={e => setPin(e.target.value)} /></label>
        <label>잠금 번호 확인<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        {error && <p role="alert" className="error-note">{error}</p>}
        <div className="sample-confirm__actions"><ButtonOutline disabled={busy} onClick={() => setSetup(false)}>취소</ButtonOutline><ButtonPrimary type="submit" disabled={busy || !pin}>정하고 잠그기</ButtonPrimary></div>
      </form>
    </Modal>}
  </>;
}

/** 잠긴 동안 학생 화면 전체를 가려요(design.md lock-screen 모양, 교사 잠금 화면과 같은 틀). */
export function StudentLockGate() {
  const locked = useLocked();
  const [pin, setPin] = useState(''), [error, setError] = useState(''), [checking, setChecking] = useState(false), [forgot, setForgot] = useState(false);
  if (!locked) return null;
  const unlock = async (e: React.FormEvent) => {
    e.preventDefault(); setChecking(true);
    if (await unlockStudent(pin)) { setPin(''); setError(''); announceStudentLock(); }
    else setError('잠금 번호가 달라요. 다시 입력해 주세요.');
    setChecking(false);
  };
  // 번호를 잊으면 영영 못 여는 일을 막아요: 학생 기록을 지워야만 풀려요.
  const reset = async () => {
    setChecking(true);
    try { await studentDb.clearStudentData(); clearStudentLock(); setForgot(false); announceStudentLock(); }
    catch { setError('기록을 지우지 못했어요. 다시 시도해 주세요.'); }
    finally { setChecking(false); }
  };
  return <div className="teacher-lock" role="dialog" aria-modal="true" aria-label="학생 화면 잠금">
    <form onSubmit={unlock} className="teacher-lock__box">
      <Icon name="lock" size={32} />
      <h2 className="t-heading-3">학생 화면이 잠겼어요</h2>
      <p className="t-body-sm text-muted">성적과 기록을 보려면 잠금 번호를 입력해 주세요.</p>
      <label>잠금 번호<input autoFocus type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} aria-invalid={!!error} onChange={e => { setPin(e.target.value); setError(''); }} /></label>
      {error && <p role="alert" className="error-note">{error}</p>}
      <ButtonPrimary type="submit" disabled={!pin || checking}>잠금 풀기</ButtonPrimary>
      <p className="t-caption text-muted">학생 기록은 이 기기에만 저장돼요.</p>
      {forgot
        ? <><p className="t-body-sm">번호 없이 풀려면 이 기기의 학생 기록(성적·출결·모의고사·지원 계획)을 모두 지워야 해요. 되돌릴 수 없어요.</p>
          <div className="sample-confirm__actions"><ButtonOutline disabled={checking} onClick={() => setForgot(false)}>취소</ButtonOutline><ButtonOutline disabled={checking} onClick={() => void reset()}>기록 지우고 잠금 풀기</ButtonOutline></div></>
        : <button type="button" className="text-button t-link" onClick={() => setForgot(true)}>잠금 번호를 잊었어요</button>}
    </form>
  </div>;
}
