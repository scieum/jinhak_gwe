import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { studentDb, useStudent } from '../store/studentDb';
import { SendToTeacher } from '../components/SendToTeacher';
import { boardWarnings, csatStates, examKinds, isExempt, LIMIT, newBoard, SCENARIO_NAMES, type Board, type BoardSlot } from '../domain/board';
import type { ApplicationPlan } from '../domain/planner';
import '../styles/susiro.css';

/** .jnavi counsel_card payload. 판정은 검수된 판정이 생기기 전까지 null(NEVER-1). */
export const counselCard = (board: Board, apps: readonly ApplicationPlan[]) => {
  const app = (s: BoardSlot) => { const a = apps.find(x => x.id === s.application_id)!; return { university: a.university, program: a.program, department: a.department, year: a.year, exam_kind: s.exam_kind, exam_date: s.exam_date, csat: s.csat, memo: s.memo }; };
  const name = (id: string) => apps.find(x => x.id === id)?.university ?? '지운 전형';
  return { scenario: board.name, slots: board.slots.map((s, i) => ({ priority: i + 1, ...app(s), judgment: null })), exempt: board.exempt.map(app),
    warnings: boardWarnings(board, name).map(w => ({ code: w.code, title: w.title, message: w.message })) };
};

export function Susiro() {
  const state = useStudent();
  const [initialBoard] = useState(() => newBoard('A안'));
  const [boardId, setBoardId] = useState(''), [picking, setPicking] = useState<{ id: string; create: boolean } | null>(null);
  const [editing, setEditing] = useState<{ boardId: string; slot: BoardSlot } | null>(null), [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState<Board | null>(null), [busy, setBusy] = useState(false), lock = useRef(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [focus, setFocus] = useState<string[]>([]);
  if (!state) return <section className="student-screen" data-slug="susiro"><p role="status">기기에 저장된 기록을 읽고 있어요.</p></section>;
  if (!state.data) return <section className="student-screen" data-slug="susiro"><p role="alert">{state.error}</p></section>;
  const apps = state.data.planning?.applications ?? [], boards = state.data.boards ?? [];
  const orderedBoards = [...boards].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const board = boards.find(b => b.id === boardId) ?? orderedBoards[0] ?? initialBoard;
  const app = (id: string) => apps.find(a => a.id === id);
  const name = (id: string) => app(id)?.university ?? '지운 전형';
  const warnings = boardWarnings(board, name);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const add = (a: ApplicationPlan) => picking && run(async () => {
    const next = await studentDb.changeBoard(picking.id, { kind: 'add', application_id: a.id }, picking.create);
    setBoardId(next.id); setPicking(null); setMessage(`${next.name}에 카드를 담았어요.`);
  });
  const addScenario = (copy = false) => run(async () => {
    const next = await studentDb.createScenario(copy ? board.id : undefined);
    setBoardId(next.id); setFocus([]); setMessage(copy ? `${board.name}을 ${next.name}으로 복사했어요.` : `${next.name}을 만들었어요.`);
  });
  const pickedBoard = picking ? boards.find(b => b.id === picking.id) : undefined;
  const pickable = apps.filter(a => ![...(pickedBoard?.slots ?? []), ...(pickedBoard?.exempt ?? [])].some(s => s.application_id === a.id));
  const slotView = (s: BoardSlot, rank: number | null, index = -1) => { const a = app(s.application_id);
    return <li key={s.application_id} className={`susi-slot${focus.includes(s.application_id) ? ' susi-slot--focus' : ''}`}>
      <span className="susi-slot__rank num">{rank ?? '제외'}</span>
      <div className="susi-slot__body"><strong>{a?.university ?? '지운 전형'}</strong><span className="t-caption text-muted">{a ? [`${a.year}학년도`, a.program, a.department].filter(Boolean).join(' · ') : '목록에서 지운 전형이에요. 이 칸을 비워 주세요.'}</span>
        <span className="susi-slot__chips"><span className="judge-badge judge-none">— 판정 준비 중</span>
          {s.exam_kind !== 'none' && <span className="data-status-badge">{s.exam_kind}{s.exam_date ? ` ${s.exam_date.slice(5).replace('-', '.')}` : ' 일정 미정'}</span>}
          <span className="data-status-badge">{csatStates[s.csat]}</span></span>
        {s.memo && <span className="t-caption text-muted">{s.memo}</span>}</div>
      <div className="susi-slot__actions">{rank !== null && <><button className="text-button" aria-label={`${rank}순위 위로`} disabled={busy || index === 0} onClick={() => void run(async () => { await studentDb.changeBoard(board.id, { kind: 'move', application_id: s.application_id, delta: -1 }); })}>↑</button>
        <button className="text-button" aria-label={`${rank}순위 아래로`} disabled={busy || index === board.slots.length - 1} onClick={() => void run(async () => { await studentDb.changeBoard(board.id, { kind: 'move', application_id: s.application_id, delta: 1 }); })}>↓</button></>}
        <button className="text-button" disabled={busy} onClick={() => { setError(''); setEditing({ boardId: board.id, slot: s }); }}>상세</button></div></li>; };

  return <section className="student-screen susiro" data-slug="susiro" aria-label="수시로">
    <div className="screen-heading"><div><h2 className="t-heading-1">수시로</h2><p className="num">6회 제한 {board.slots.length}/{LIMIT}장{board.exempt.length > 0 && ` · 6회 제외 ${board.exempt.length}장`}</p></div>
      <div><ButtonPrimary disabled={busy || (!board.slots.length && !board.exempt.length)} onClick={() => setSharing(true)}>상담카드 보내기</ButtonPrimary>
        {!board.slots.length && !board.exempt.length && <p className="t-caption text-muted">1장 이상 담아야 보낼 수 있어요</p>}</div></div>
    <fieldset className="toolbar susi-scenarios" disabled={busy}><legend className="sr-only">시나리오 관리</legend>{boards.length > 0 && <SegmentedControl label="시나리오" value={board.id} onChange={id => { setBoardId(id); setFocus([]); setError(''); setMessage(''); }} options={orderedBoards.map(b => ({ value: b.id, label: b.name }))} />}
      <ButtonOutline disabled={boards.length >= SCENARIO_NAMES.length} onClick={() => void addScenario()}>+ 새 안</ButtonOutline>
      <ButtonOutline disabled={boards.length >= SCENARIO_NAMES.length || board === initialBoard} onClick={() => void addScenario(true)}>현재 안 복사</ButtonOutline>
      <ButtonOutline disabled={board === initialBoard} onClick={() => { setError(''); setDeleting(board); }}>현재 안 삭제</ButtonOutline></fieldset>
    <p className="t-caption text-muted">최대 5개 안을 만들 수 있어요. 복사한 안의 카드·메모·일정은 원래 안과 따로 수정돼요.</p>
    {error && !picking && !editing && !deleting && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}
    {warnings.length > 0 && <div className="warning-list" aria-label="조합 점검">{warnings.map(w => <button key={w.code + w.title} className="warning-callout" onClick={() => setFocus(w.slots)}>
      <strong>▲ {w.title}</strong><span>{w.message}</span></button>)}</div>}
    <p className="t-caption text-muted">판정 기준이 검수되면 소신·위험 쏠림도 함께 점검해요. 지금은 고사 일정 겹침과 6장 제한만 점검해요.</p>
    {!board.slots.length && !board.exempt.length && <div className="empty-state"><h3 className="t-heading-3">아직 담은 대학이 없어요</h3>
      <p>원서·서류 체크리스트에 등록한 전형을 빈 칸에 담으면 여기에 6칸으로 모여요.</p></div>}
    <ol className="susi-board">{board.slots.map((s, i) => slotView(s, i + 1, i))}
      {Array.from({ length: LIMIT - board.slots.length }, (_, i) => <li key={`empty-${i}`} className="susi-slot susi-slot--empty"><button className="text-button" disabled={busy} onClick={() => { setError(''); setPicking({ id: board.id, create: board === initialBoard }); }}>+ 대학 담기</button></li>)}</ol>
    {board.slots.length === LIMIT && <ButtonOutline disabled={busy} onClick={() => { setError(''); setPicking({ id: board.id, create: false }); }}>6회 제외 전형 담기</ButtonOutline>}
    {board.exempt.length > 0 && <><p className="t-caption text-muted">6회 제외 {board.exempt.length}장</p><ul className="susi-board">{board.exempt.map(s => slotView(s, null))}</ul></>}
    <p className="disclaimer-note">ⓘ 대학 공식 자료가 최종 기준이에요 · 6회 제외 기관은 과학기술원·사관학교·경찰대 목록으로 나눠요</p>

    {picking && <Modal label="대학 담기" onClose={() => { if (!busy) setPicking(null); }}><h3 className="t-heading-3">담을 전형 고르기</h3>
      {error && <p role="alert" className="error-note">{error}</p>}
      {pickable.map(a => <button key={a.id} disabled={busy || ((pickedBoard?.slots.length ?? 0) >= LIMIT && !isExempt(a.university))} className="univ-card susi-pick" aria-label={[a.university, `${a.year}학년도`, a.program, a.department].filter(Boolean).join(' · ')} onClick={() => void add(a)}>
        <strong>{a.university}</strong><span className="t-caption text-muted">{[`${a.year}학년도`, a.program, a.department].filter(Boolean).join(' · ')}</span></button>)}
      {!apps.length && <p>먼저 원서·서류 체크리스트에서 지원할 전형을 등록해 주세요.</p>}
      {apps.length > 0 && !pickable.length && <p>등록한 전형을 모두 이 안에 담았어요.</p>}
      {(pickedBoard?.slots.length ?? 0) >= LIMIT && <p className="notice">6장을 모두 채웠어요. 6회 제외 전형만 추가할 수 있어요.</p>}
      <div className="toolbar">{!busy && <Link className="button-outline" to="/application-checklist">전형 등록하러 가기</Link>}<ButtonOutline disabled={busy} onClick={() => setPicking(null)}>닫기</ButtonOutline></div></Modal>}
    {editing && <SlotEditor slot={editing.slot} title={name(editing.slot.application_id)} busy={busy} error={error} onClose={() => setEditing(null)}
      onSave={s => void run(async () => { await studentDb.changeBoard(editing.boardId, { kind: 'update', slot: s }); setEditing(null); setMessage('칸을 저장했어요.'); })}
      onClear={() => void run(async () => { await studentDb.changeBoard(editing.boardId, { kind: 'remove', application_id: editing.slot.application_id }); setEditing(null); setMessage('칸을 비웠어요.'); })} />}
    {deleting && <Modal label="수시로 안 삭제 확인" onClose={() => { if (!busy) setDeleting(null); }}><h3 className="t-heading-3">{deleting.name}을 삭제할까요?</h3>
      <p>이 안의 카드 배치·메모·일정을 지워요. 지원 준비 체크리스트, 관심 전형과 다른 안은 유지돼요.</p>
      {error && <p role="alert" className="error-note">{error}</p>}
      <div className="toolbar"><ButtonOutline disabled={busy} onClick={() => setDeleting(null)}>취소</ButtonOutline><ButtonPrimary disabled={busy} onClick={() => void run(async () => {
        await studentDb.deleteBoard(deleting.id); setBoardId(''); setFocus([]); setDeleting(null); setMessage(`${deleting.name}을 삭제했어요.`);
      })}>안 삭제</ButtonPrimary></div></Modal>}
    {sharing && <SendToTeacher title="상담카드" kind="counsel_card" payload={counselCard(board, apps)} filename={`상담카드_${board.name}`} onClose={() => setSharing(false)} onDone={setMessage}>
      <p>{board.name}의 {board.slots.length + board.exempt.length}장과 순위·메모를 상담카드 파일(.jnavi)로 저장해요. 파일을 담임 선생님께 전달해 주세요. 파일에는 내 성적이 들어가지 않아요.</p></SendToTeacher>}
  </section>;
}

function SlotEditor({ slot, title, busy, error, onSave, onClear, onClose }: { slot: BoardSlot; title: string; busy: boolean; error: string; onSave: (s: BoardSlot) => void; onClear: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState(slot);
  return <Modal label={`${title} 칸 상세`} onClose={() => { if (!busy) onClose(); }}><h3 className="t-heading-3">{title}</h3>
    {error && <p role="alert" className="error-note">{error}</p>}
    <fieldset className="form-grid susi-scenarios" disabled={busy}><legend className="sr-only">카드 정보</legend>
      <label>고사<select value={draft.exam_kind} onChange={e => setDraft({ ...draft, exam_kind: e.target.value as BoardSlot['exam_kind'], exam_date: e.target.value === 'none' ? null : draft.exam_date })}>
        {Object.entries(examKinds).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      {draft.exam_kind !== 'none' && <label>고사일<input type="date" value={draft.exam_date ?? ''} onChange={e => setDraft({ ...draft, exam_date: e.target.value || null })} /></label>}
      <label>수능최저<select value={draft.csat} onChange={e => setDraft({ ...draft, csat: e.target.value as BoardSlot['csat'] })}>
        {Object.entries(csatStates).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label>메모<textarea maxLength={200} rows={3} value={draft.memo} onChange={e => setDraft({ ...draft, memo: e.target.value })} /></label>
    </fieldset>
    <div className="toolbar"><ButtonOutline disabled={busy} onClick={onClear}>이 칸 비우기</ButtonOutline><ButtonOutline disabled={busy} onClick={onClose}>취소</ButtonOutline><ButtonPrimary disabled={busy} onClick={() => onSave(draft)}>{busy ? '저장 중' : '저장'}</ButtonPrimary></div></Modal>;
}
