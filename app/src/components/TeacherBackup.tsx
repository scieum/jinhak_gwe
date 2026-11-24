import { useRef, useState } from 'react';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { Modal } from './Modal';
import { decryptTeacherBackup, downloadFile, encryptTeacherBackup } from '../io/backup';
import { teacherDb } from '../store/teacherDb';
import { SAMPLE_CLASS } from '../data/sample/teacher';
import { clearSample, isSampleMode } from '../data/sample';
import { useToast } from '../shell/SampleBanner';

type Tables = Record<string, readonly unknown[]>;
const isSampleClass = (info?: { code?: unknown; created_at?: unknown }) => info?.code === SAMPLE_CLASS.code && info.created_at === SAMPLE_CLASS.created_at;
const count = (t: Tables, k: string) => t[k]?.length ?? 0;
/** 학급 이름(학생 N명 · 받은 카드 N장 · 상담 메모 N개 · 성적 N건) */
const summary = (t: Tables) => `${String((t.meta?.find(r => (r as { key?: string }).key === 'class') as { name?: string } | undefined)?.name ?? '이름 없는 학급')}(학생 ${count(t, 'students')}명 · 받은 카드 ${count(t, 'cards')}장 · 상담 메모 ${count(t, 'memos')}개 · 성적 ${count(t, 'mocks') + count(t, 'school')}건)`;
const snapshot = async (): Promise<Tables> => Object.fromEntries(await Promise.all(teacherDb.tables.map(async t => [t.name, await t.toArray()] as const)));

/** 교사 셸 사이드바 "백업"(v2 시안 button-pill-soft). 이 기기의 학급 데이터(teacherDb 모든 표)를 암호화 파일로 내려받거나, 그 파일로 되살려요.
 * 되살리기 시안은 없어 학생 되살리기(work/grade-input/02-spec.md 6-7 확인 창·문구)를 따라요. */
export function TeacherBackupButton() {
  const [open, setOpen] = useState(false), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState('');
  const [step, setStep] = useState<'backup' | 'restore'>('backup');
  const [picked, setPicked] = useState<{ file: string; tables: Tables; current: string; sample: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useToast();
  const guard = async (work: () => Promise<void>, fallback: string) => {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : fallback); } finally { setBusy(false); }
  };
  const run = () => guard(async () => {
    const info = await teacherDb.meta.get('class');
    if (!info) throw new Error('아직 학급이 없어요. 학급을 만든 뒤 백업해 주세요.');
    if (isSampleClass(info)) throw new Error('샘플 학급은 백업하지 않아요. 내 학급을 만든 뒤 백업해 주세요.');
    downloadFile(await encryptTeacherBackup(await snapshot() as Record<string, unknown[]>, password), `${info.name}_학급백업_${new Date().toLocaleDateString('sv-SE')}.jnavi`, 'application/json');
    setPassword(''); setDone('암호화 백업을 만들었어요.');
  }, '백업하지 못했어요.');
  const openFile = (file: File) => guard(async () => {
    if (file.size > 20_000_000) throw new Error('백업 파일은 20MB 이하예요.');
    const tables = await decryptTeacherBackup(await file.text(), password, teacherDb.tables.map(t => t.name));
    const now = await snapshot(), info = await teacherDb.meta.get('class'), sample = isSampleClass(info) || isSampleMode();
    setPicked({ file: file.name, tables, sample, current: info && !isSampleClass(info) ? summary(now) : '' });
  }, '백업 파일을 열지 못했어요.');
  const restore = () => picked && guard(async () => {
    // 샘플 학급은 샘플 지우기 규칙대로 먼저 정리하고 샘플 보기를 꺼요(샘플 띠가 되살린 실제 학급 위에 남지 않게).
    if (picked.sample) await clearSample();
    await teacherDb.restore(picked.tables);
    setOpen(false); setPicked(null); setPassword(''); setStep('backup'); setToast('백업을 되살렸어요.');
  }, '되살리지 못했어요. 지금 학급 기록은 그대로예요.');
  const close = () => { if (!busy) { setOpen(false); setPassword(''); setError(''); setDone(''); setStep('backup'); setPicked(null); } };
  const typePassword = (v: string) => { setPassword(v); setError(''); };
  return <>
    <button type="button" className="button-pill-soft" onClick={() => setOpen(true)}>백업</button>
    {open && !picked && step === 'backup' && <Modal label="학급 데이터 백업" onClose={close}>
      <form className="form-grid" onSubmit={e => { e.preventDefault(); void run(); }}>
        <h3 className="t-heading-4">학급 데이터를 백업해요</h3>
        <p className="t-caption text-muted">명단·받은 카드·상담 메모·성적을 암호로 잠근 파일 하나로 내려받아요. 암호를 잊으면 열 수 없어요.</p>
        <label>백업 암호(8자 이상)<input autoFocus type="password" autoComplete="new-password" value={password} onChange={e => typePassword(e.target.value)} /></label>
        {error && <p role="alert" className="error-note">{error}</p>}{done && <p role="status" className="t-caption">{done}</p>}
        <div className="sample-confirm__actions"><ButtonOutline disabled={busy} onClick={close}>닫기</ButtonOutline><ButtonPrimary type="submit" disabled={busy || password.length < 8}>백업 내려받기</ButtonPrimary></div>
        <button type="button" className="text-button t-link" disabled={busy} onClick={() => { setStep('restore'); setPassword(''); setError(''); setDone(''); }}>백업 파일 되살리기</button>
      </form>
    </Modal>}
    {open && !picked && step === 'restore' && <Modal label="백업 파일 되살리기" onClose={close}>
      <form className="form-grid" onSubmit={e => { e.preventDefault(); fileRef.current?.click(); }}>
        <h3 className="t-heading-4">백업 파일로 되살려요</h3>
        <p className="t-caption text-muted">백업할 때 정한 암호를 넣고 학급 백업 파일(.jnavi)을 골라 주세요. 바꾸기 전에 내용을 먼저 보여 드려요.</p>
        <label>백업 암호<input autoFocus type="password" autoComplete="current-password" value={password} onChange={e => typePassword(e.target.value)} /></label>
        <input hidden ref={fileRef} aria-label="학급 백업 파일" type="file" accept=".jnavi" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void openFile(f); }} />
        {error && <p role="alert" className="error-note">{error}</p>}
        <div className="sample-confirm__actions"><ButtonOutline disabled={busy} onClick={() => { setStep('backup'); setPassword(''); setError(''); }}>취소</ButtonOutline><ButtonPrimary type="submit" disabled={busy || password.length < 8}>백업 파일 열기</ButtonPrimary></div>
      </form>
    </Modal>}
    {open && picked && <Modal label="되살리기 확인" onClose={close}>
      <h3 className="t-heading-4">지금 이 기기의 학급 기록을 백업 내용으로 바꿀까요?</h3>
      <p>{summary(picked.tables)}으로 바뀌어요.</p>
      {picked.current && <p>지금 있는 {picked.current}은 모두 지워지고 되돌릴 수 없어요.</p>}
      {picked.sample && <p>샘플 데이터는 지우고 샘플 보기를 꺼요.</p>}
      <p className="t-caption text-muted">고른 파일: {picked.file}</p>
      {error && <p role="alert" className="error-note">{error}</p>}
      <div className="sample-confirm__actions"><ButtonOutline disabled={busy} onClick={() => { setPicked(null); setError(''); }}>취소</ButtonOutline><ButtonPrimary disabled={busy} onClick={() => void restore()}>되살리기</ButtonPrimary></div>
    </Modal>}
    {toast}
  </>;
}
