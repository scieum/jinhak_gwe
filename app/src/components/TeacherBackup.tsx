import { useState } from 'react';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { Modal } from './Modal';
import { downloadFile, encryptTeacherBackup } from '../io/backup';
import { teacherDb } from '../store/teacherDb';
import { SAMPLE_CLASS } from '../data/sample/teacher';

/** 교사 셸 사이드바 "백업"(v2 시안 button-pill-soft). 이 기기의 학급 데이터(teacherDb 모든 표)를 암호화 파일로 내려받아요. */
export function TeacherBackupButton() {
  const [open, setOpen] = useState(false), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState('');
  const run = async () => {
    setBusy(true); setError('');
    try {
      const info = await teacherDb.meta.get('class');
      if (!info) throw new Error('아직 학급이 없어요. 학급을 만든 뒤 백업해 주세요.');
      if (info.code === SAMPLE_CLASS.code && info.created_at === SAMPLE_CLASS.created_at) throw new Error('샘플 학급은 백업하지 않아요. 내 학급을 만든 뒤 백업해 주세요.');
      const tables = Object.fromEntries(await Promise.all(teacherDb.tables.map(async t => [t.name, await t.toArray()] as const)));
      downloadFile(await encryptTeacherBackup(tables, password), `${info.name}_학급백업_${new Date().toLocaleDateString('sv-SE')}.jnavi`, 'application/json');
      setPassword(''); setDone('암호화 백업을 만들었어요.');
    } catch (e) { setError(e instanceof Error ? e.message : '백업하지 못했어요.'); }
    finally { setBusy(false); }
  };
  const close = () => { if (!busy) { setOpen(false); setPassword(''); setError(''); setDone(''); } };
  return <>
    <button type="button" className="button-pill-soft" onClick={() => setOpen(true)}>백업</button>
    {open && <Modal label="학급 데이터 백업" onClose={close}>
      <form className="form-grid" onSubmit={e => { e.preventDefault(); void run(); }}>
        <h3 className="t-heading-4">학급 데이터를 백업해요</h3>
        <p className="t-caption text-muted">명단·받은 카드·상담 메모·성적을 암호로 잠근 파일 하나로 내려받아요. 암호를 잊으면 열 수 없어요.</p>
        <label>백업 암호(8자 이상)<input autoFocus type="password" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} /></label>
        {error && <p role="alert" className="error-note">{error}</p>}{done && <p role="status" className="t-caption">{done}</p>}
        <div className="sample-confirm__actions"><ButtonOutline disabled={busy} onClick={close}>닫기</ButtonOutline><ButtonPrimary type="submit" disabled={busy || password.length < 8}>백업 내려받기</ButtonPrimary></div>
      </form>
    </Modal>}
  </>;
}
