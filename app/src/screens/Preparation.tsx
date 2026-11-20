import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { studentDb, usePlanner } from '../store/studentDb';
import { admissionYear } from '../data/catalog';
import { PlanEditor } from '../components/PlanEditor';
import { eligibilityStates, eligibilitySummary, newApplication, newCounselTask, safeSourceUrl, stepDeadline, stepStates, taskDeadline, updateApplicationIdentity,
  type ApplicationPlan, type ChecklistStep, type CounselTask, type EligibilityItem } from '../domain/planner';
import '../styles/preparation.css';

function useActions() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const run = async (action: () => Promise<void>, success = '기기에 저장했어요.') => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  return { busy, error, message, run, reset: () => { setError(''); setMessage(''); } };
}
function useNow() { const [now, setNow] = useState(new Date()); useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []); return now; }
const stamp = (iso: string | null) => iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '아직 확인하지 않음';
function SourceLink({ url }: { url: string }) { return url && safeSourceUrl(url) ? <a className="t-link" href={url} target="_blank" rel="noreferrer">등록한 자료 열기 ↗</a> : <span className="text-muted">자료 링크 미등록</span>; }
function Feedback({ error, message }: { error: string; message: string }) { return <>{error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}</>; }
function DeleteConfirm({ title, children, busy, error, onClose, onDelete }: { title: string; children: ReactNode; busy: boolean; error: string; onClose: () => void; onDelete: () => void }) {
  return <Modal label={title} onClose={() => { if (!busy) onClose(); }}><h3 className="t-heading-3">{title}</h3><p>{children}</p><Feedback error={error} message="" /><div className="toolbar"><ButtonPrimary disabled={busy} onClick={onDelete}>삭제</ButtonPrimary><ButtonOutline disabled={busy} onClick={onClose}>취소</ButtonOutline></div></Modal>;
}

export function Preparation({ view }: { view: 'checklist' | 'eligibility' }) {
  const state = usePlanner(), actions = useActions(), now = useNow();
  const [query, setQuery] = useSearchParams();
  const [planEdit, setPlanEdit] = useState<ApplicationPlan | null>(null), [planDelete, setPlanDelete] = useState<ApplicationPlan | null>(null);
  const [stepEdit, setStepEdit] = useState<ChecklistStep | null>(null), [eligibilityEdit, setEligibilityEdit] = useState<EligibilityItem | null>(null);
  const [itemDelete, setItemDelete] = useState<{ id: string; title: string } | null>(null);
  const applications = state?.data?.applications ?? [];
  const selected = applications.find(p => p.id === query.get('plan')) ?? applications[0];
  const title = view === 'checklist' ? '원서·서류 체크리스트' : '지원 자격 확인표';
  const open = (action: () => void) => { actions.reset(); action(); };
  const savePlan = (next: ApplicationPlan) => actions.run(async () => {
    const old = applications.find(a => a.id === next.id);
    let id = next.id;
    if (old) await studentDb.saveApplication(updateApplicationIdentity(old, next));
    else id = (await studentDb.addApplication(next)).id;
    setPlanEdit(null); setQuery({ plan: id });
  });
  const saveStep = (next: ChecklistStep) => selected && actions.run(async () => {
    const step = { ...next, checked_at: next.status === 'pending' ? null : new Date().toISOString() };
    await studentDb.saveApplication({ ...selected, updated_at: new Date().toISOString(), steps: selected.steps.some(s => s.id === step.id) ? selected.steps.map(s => s.id === step.id ? step : s) : [...selected.steps, step] });
    setStepEdit(null);
  });
  const saveEligibility = (next: EligibilityItem) => selected && actions.run(async () => {
    const item = { ...next, checked_at: next.status === 'unknown' ? null : new Date().toISOString() };
    await studentDb.saveApplication({ ...selected, updated_at: new Date().toISOString(), eligibility: selected.eligibility.some(e => e.id === item.id) ? selected.eligibility.map(e => e.id === item.id ? item : e) : [...selected.eligibility, item] });
    setEligibilityEdit(null);
  });
  return <section className="student-screen preparation" data-slug={view === 'checklist' ? 'application-checklist' : 'eligibility-check'}>
    <div className="screen-heading"><div><h2 className="t-heading-1">{title}</h2><p className="text-muted">{view === 'checklist' ? '접수부터 서류 도착까지, 빠뜨린 단계가 없는지 확인해요.' : '모집요강을 확인하며 내 조건과 필요한 증빙을 정리해요.'}</p></div><ButtonPrimary disabled={!state?.data || actions.busy} onClick={() => open(() => setPlanEdit(newApplication(admissionYear)))}>+ 지원 전형 추가</ButtonPrimary></div>
    {!state ? <p role="status">준비 기록을 읽고 있어요.</p> : !state.data ? <p role="alert">{state.error}</p> : <>
      <Feedback {...actions} />
      {!selected ? <div className="empty-state"><h3 className="t-heading-3">준비할 전형을 먼저 추가해 주세요</h3><p>대학·전형 이름과 모집요강 링크를 직접 등록할 수 있어요. 추가한 전형은 체크리스트와 자격 확인표에서 함께 사용해요.</p></div> : <>
        <label>준비할 전형<select value={selected.id} onChange={e => setQuery({ plan: e.target.value })}>{applications.map(a => <option key={a.id} value={a.id}>{a.year} · {a.university} · {a.program}{a.department && ` · ${a.department}`}</option>)}</select></label>
        <article className="univ-card"><div className="section-row"><div><p className="t-caption">{selected.year}학년도 · 내가 등록한 전형</p><h3 className="t-heading-3">{selected.university} · {selected.program}</h3><p>{selected.department || '모집단위 미입력'}</p></div><div className="toolbar"><ButtonOutline disabled={actions.busy} onClick={() => open(() => setPlanEdit(selected))}>전형 정보 수정</ButtonOutline><ButtonOutline disabled={actions.busy} onClick={() => open(() => setPlanDelete(selected))}>전형 삭제</ButtonOutline></div></div><SourceLink url={selected.source_url} />
          <div className="toolbar"><Link className="button-outline" to={`/${view === 'checklist' ? 'eligibility-check' : 'application-checklist'}?plan=${selected.id}`}>{view === 'checklist' ? '지원 자격 확인하기' : '원서·서류 확인하기'}</Link><Link className="button-outline" to={`/counsel-tasks?plan=${selected.id}`}>상담 질문·할 일</Link><Link className="button-outline" to="/susiro">수시로에서 카드 담기</Link><Link className="button-outline" to="/admission-results?view=interests">관심 전형 모아보기</Link></div></article>
        {view === 'checklist' ? <>
          <div className="stats"><div>완료 <strong>{selected.steps.filter(s => s.status === 'done').length}</strong></div><div>확인·진행 중 <strong>{selected.steps.filter(s => s.status === 'pending' || s.status === 'progress').length}</strong></div><div>기한 지남 <strong>{selected.steps.filter(s => stepDeadline(s, now) === '기한 지남').length}</strong></div><div>해당 없음 <strong>{selected.steps.filter(s => s.status === 'na').length}</strong></div></div>
          <p className="notice">결제·접수·서류 제출은 각각 확인해 주세요. 날짜와 완료 상태는 내가 등록한 기록이며, 접수처·대학 입학처에서 최종 확인해요. 마감 시각은 한국 시간 기준이에요.</p>
          <div className="prep-grid">{selected.steps.map(s => <article className="univ-card" key={s.id}><div className="section-row"><h3 className="t-heading-3">{s.title}</h3><span className="prep-status">{stepStates[s.status]}</span></div><p className={stepDeadline(s, now) === '기한 지남' ? 'error-note' : ''}>{stepDeadline(s, now)}{s.due_at && ` · ${s.due_at.replace('T', ' ')} (한국 시간)`}</p>{s.note && <p className="prep-note">{s.note}</p>}<SourceLink url={s.source_url} /><small className="text-muted">확인 기록: {stamp(s.checked_at)}</small><div className="toolbar"><ButtonOutline disabled={actions.busy} onClick={() => open(() => setStepEdit(s))}>{s.title} 수정</ButtonOutline><button className="text-button" disabled={actions.busy} onClick={() => open(() => setItemDelete(s))}>{s.title} 삭제</button></div></article>)}</div>
          <ButtonOutline disabled={actions.busy || selected.steps.length >= 50} onClick={() => open(() => setStepEdit({ id: crypto.randomUUID(), title: '', status: 'pending', note: '', source_url: '', checked_at: null, due_at: null }))}>+ 체크 항목 추가</ButtonOutline>
        </> : <>
          <div className="stats"><div>내 확인 상태 <strong>{eligibilitySummary(selected.eligibility)}</strong></div><div>확인 필요 <strong>{selected.eligibility.filter(e => e.status === 'unknown').length}</strong></div></div>
          <p className="notice">아래는 직접 작성하는 확인표예요. 공통 항목 중 적용되지 않는 것은 ‘해당 없음’으로 표시해 주세요. 추천 배정이나 최종 지원 자격은 학교·대학에 확인해요.</p>
          <div className="prep-grid">{selected.eligibility.map(e => <article className="univ-card" key={e.id}><div className="section-row"><h3 className="t-heading-3">{e.title}</h3><span className="prep-status">{eligibilityStates[e.status]}</span></div><p className="prep-note">{e.note || '확인한 조건·근거 또는 문의할 담당자를 기록해 주세요.'}</p><SourceLink url={e.source_url} /><small className="text-muted">확인 기록: {stamp(e.checked_at)}</small><div className="toolbar"><ButtonOutline disabled={actions.busy} onClick={() => open(() => setEligibilityEdit(e))}>{e.title} 수정</ButtonOutline><button className="text-button" disabled={actions.busy} onClick={() => open(() => setItemDelete(e))}>{e.title} 삭제</button></div></article>)}</div>
          <ButtonOutline disabled={actions.busy || selected.eligibility.length >= 50} onClick={() => open(() => setEligibilityEdit({ id: crypto.randomUUID(), title: '', status: 'unknown', note: '', source_url: '', checked_at: null }))}>+ 자격 조건 추가</ButtonOutline>
        </>}
        <p className="t-caption text-muted">준비 기록은 이 브라우저에 저장돼요. <Link to="/grade-input">암호화 백업·복원</Link>에 함께 포함돼요.</p>
      </>}
    </>}
    {planEdit && <PlanEditor key={planEdit.id} initial={planEdit} applications={applications} existing={applications.some(a => a.id === planEdit.id)} busy={actions.busy} error={actions.error} onSave={savePlan} onClose={() => setPlanEdit(null)} />}
    {stepEdit && <StepEditor initial={stepEdit} busy={actions.busy} error={actions.error} onSave={saveStep} onClose={() => setStepEdit(null)} />}
    {eligibilityEdit && <EligibilityEditor initial={eligibilityEdit} busy={actions.busy} error={actions.error} onSave={saveEligibility} onClose={() => setEligibilityEdit(null)} />}
    {planDelete && <DeleteConfirm title="지원 전형을 삭제할까요?" busy={actions.busy} error={actions.error} onClose={() => setPlanDelete(null)} onDelete={() => void actions.run(async () => { await studentDb.deleteApplication(planDelete.id); setPlanDelete(null); setQuery({}); }, '전형을 삭제했어요. 연결된 상담 기록은 남겨 두었어요.')}>{planDelete.university}의 체크리스트·자격 확인 기록을 삭제해요. 연결된 상담 질문·할 일은 전형 연결만 해제하고 보관해요.</DeleteConfirm>}
    {itemDelete && selected && <DeleteConfirm title="확인 항목을 삭제할까요?" busy={actions.busy} error={actions.error} onClose={() => setItemDelete(null)} onDelete={() => void actions.run(async () => { await studentDb.saveApplication({ ...selected, updated_at: new Date().toISOString(), ...(view === 'checklist' ? { steps: selected.steps.filter(s => s.id !== itemDelete.id) } : { eligibility: selected.eligibility.filter(e => e.id !== itemDelete.id) }) }); setItemDelete(null); }, '항목을 삭제했어요.')}>{itemDelete.title}의 상태와 메모도 함께 지워져요.</DeleteConfirm>}
  </section>;
}

interface EditorProps<T> { initial: T; busy: boolean; error: string; onSave: (value: T) => unknown; onClose: () => void }
function EditorActions({ busy, error, onClose }: Pick<EditorProps<unknown>, 'busy' | 'error' | 'onClose'>) {
  return <><Feedback error={error} message="" /><div className="toolbar"><ButtonPrimary type="submit" disabled={busy}>저장</ButtonPrimary><ButtonOutline disabled={busy} onClick={onClose}>취소</ButtonOutline></div></>;
}
function StepEditor({ initial, busy, error, onSave, onClose }: EditorProps<ChecklistStep>) {
  const [draft, set] = useState(initial);
  return <Modal label="체크 항목 편집" onClose={() => { if (!busy) onClose(); }}><h3 className="t-heading-3">체크 항목 편집</h3><form className="prep-form" onSubmit={e => { e.preventDefault(); void onSave(draft); }}>
    <label>항목 이름<input required maxLength={200} value={draft.title} onChange={e => set({ ...draft, title: e.target.value, status: 'pending', checked_at: null })} /></label><label>진행 상태<select value={draft.status} onChange={e => set({ ...draft, status: e.target.value as ChecklistStep['status'] })}>{Object.entries(stepStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>마감 일시(한국 시간, 모르면 비워 두세요)<input type="datetime-local" value={draft.due_at ?? ''} onChange={e => set({ ...draft, due_at: e.target.value || null })} /></label><label>확인할 자료 링크<input type="url" placeholder="https://" maxLength={2000} value={draft.source_url} onChange={e => set({ ...draft, source_url: e.target.value })} /></label><label>메모<textarea maxLength={2000} rows={3} value={draft.note} onChange={e => set({ ...draft, note: e.target.value })} /></label><EditorActions {...{ busy, error, onClose }} /></form></Modal>;
}
function EligibilityEditor({ initial, busy, error, onSave, onClose }: EditorProps<EligibilityItem>) {
  const [draft, set] = useState(initial);
  return <Modal label="자격 조건 편집" onClose={() => { if (!busy) onClose(); }}><h3 className="t-heading-3">자격 조건 확인</h3><form className="prep-form" onSubmit={e => { e.preventDefault(); void onSave(draft); }}>
    <label>확인할 조건<input required maxLength={200} value={draft.title} onChange={e => set({ ...draft, title: e.target.value, status: 'unknown', checked_at: null })} /></label><label>내 확인 상태<select value={draft.status} onChange={e => set({ ...draft, status: e.target.value as EligibilityItem['status'] })}>{Object.entries(eligibilityStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>모집요강·확인 자료 링크<input type="url" maxLength={2000} placeholder="https://" value={draft.source_url} onChange={e => set({ ...draft, source_url: e.target.value })} /></label><label>조건·확인 근거·문의할 담당자<textarea maxLength={2000} rows={4} value={draft.note} onChange={e => set({ ...draft, note: e.target.value })} /></label><p className="t-caption text-muted">증빙 원본을 올릴 필요는 없어요. 확인한 내용과 필요한 다음 행동을 기록해 주세요.</p><EditorActions {...{ busy, error, onClose }} /></form></Modal>;
}

export function CounselTasks() {
  const state = usePlanner(), actions = useActions(), now = useNow();
  const [query, setQuery] = useSearchParams();
  const [edit, setEdit] = useState<CounselTask | null>(null), [deleting, setDeleting] = useState<CounselTask | null>(null);
  const [filter, setFilter] = useState('pending'), [kind, setKind] = useState('all');
  const data = state?.data, plan = query.get('plan') ?? '';
  const visible = (data?.tasks ?? []).filter(t => (!plan || t.application_id === plan) && (kind === 'all' || t.kind === kind) && (filter === 'all' || t.done === (filter === 'done')))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || b.updated_at.localeCompare(a.updated_at));
  const open = (task: CounselTask) => { actions.reset(); setEdit(task); };
  return <section className="student-screen preparation" data-slug="counsel-tasks"><div className="screen-heading"><div><h2 className="t-heading-1">상담 질문·할 일</h2><p className="text-muted">상담 전에 궁금한 점을 모으고, 상담 뒤 해야 할 일을 챙겨요.</p></div><ButtonPrimary disabled={!data || actions.busy} onClick={() => open(newCounselTask(data?.applications.some(a => a.id === plan) ? plan : null))}>+ 질문·할 일 추가</ButtonPrimary></div>
    {!state ? <p role="status">상담 기록을 읽고 있어요.</p> : !data ? <p role="alert">{state.error}</p> : <><Feedback {...actions} />
      <div className="stats"><div>진행할 항목 <strong>{data.tasks.filter(t => !t.done).length}</strong></div><div>오늘까지 <strong>{data.tasks.filter(t => taskDeadline(t, now) === '오늘까지').length}</strong></div><div>기한 지남 <strong>{data.tasks.filter(t => taskDeadline(t, now) === '기한 지남').length}</strong></div><div>완료 <strong>{data.tasks.filter(t => t.done).length}</strong></div></div>
      <div className="toolbar"><label>전형별 보기<select value={plan} onChange={e => setQuery(e.target.value ? { plan: e.target.value } : {})}><option value="">모든 전형·공통 상담</option>{data.applications.map(a => <option key={a.id} value={a.id}>{a.year} · {a.university} · {a.program}</option>)}</select></label><label>상담 구분<select value={kind} onChange={e => setKind(e.target.value)}><option value="all">질문·할 일 전체</option><option value="question">상담 전 질문</option><option value="action">상담 후 할 일</option></select></label><label>완료 상태<select value={filter} onChange={e => setFilter(e.target.value)}><option value="pending">진행할 항목</option><option value="done">완료한 항목</option><option value="all">전체</option></select></label></div>
      {!visible.length && <div className="empty-state"><h3 className="t-heading-3">표시할 상담 항목이 없어요</h3><p>새 질문·할 일을 추가하거나 보기 조건을 바꿔 주세요.</p></div>}
      <div className="prep-grid">{visible.map(t => <article className="univ-card" key={t.id}><p className="t-caption">{t.kind === 'question' ? '상담 전 질문' : '상담 후 할 일'} · {data.applications.find(a => a.id === t.application_id)?.university ?? '공통 상담'}{t.session_date && ` · 상담일 ${t.session_date}`}</p><h3 className="t-heading-3">{t.title}</h3><p className={taskDeadline(t, now) === '기한 지남' ? 'error-note' : ''}>{taskDeadline(t, now)}{t.due_date && ` · ${t.due_date}까지`}</p>{t.note && <p className="prep-note">{t.note}</p>}{t.completed_at && <p className="t-caption text-muted">완료: {stamp(t.completed_at)}</p>}
        <div className="toolbar"><ButtonOutline disabled={actions.busy} onClick={() => void actions.run(async () => { await studentDb.saveTask({ ...t, done: !t.done, completed_at: t.done ? null : new Date().toISOString(), updated_at: new Date().toISOString() }); }, t.done ? '다시 진행할 항목으로 바꿨어요.' : '완료로 기록했어요.')}>{t.done ? '다시 진행' : '완료로 표시'}</ButtonOutline><ButtonOutline disabled={actions.busy} onClick={() => open(t)}>{t.title} 수정</ButtonOutline><button className="text-button" disabled={actions.busy} onClick={() => { actions.reset(); setDeleting(t); }}>{t.title} 삭제</button></div></article>)}</div>
      <p className="t-caption text-muted">기한은 한국 날짜 기준이에요. <Link to="/application-checklist">지원 전형 관리</Link> · <Link to="/grade-input">암호화 백업·복원</Link></p>
    </>}
    {edit && data && <TaskEditor initial={edit} applications={data.applications} busy={actions.busy} error={actions.error} onClose={() => setEdit(null)} onSave={t => actions.run(async () => { await studentDb.saveTask({ ...t, updated_at: new Date().toISOString() }); setEdit(null); })} />}
    {deleting && <DeleteConfirm title="상담 항목을 삭제할까요?" busy={actions.busy} error={actions.error} onClose={() => setDeleting(null)} onDelete={() => void actions.run(async () => { await studentDb.tasks.delete(deleting.id); setDeleting(null); }, '상담 항목을 삭제했어요.')}>{deleting.title}의 메모와 완료 기록도 함께 삭제해요.</DeleteConfirm>}
  </section>;
}
function TaskEditor({ initial, applications, busy, error, onSave, onClose }: EditorProps<CounselTask> & { applications: ApplicationPlan[] }) {
  const [draft, set] = useState(initial);
  return <Modal label="상담 항목 편집" onClose={() => { if (!busy) onClose(); }}><h3 className="t-heading-3">상담 질문·할 일</h3><form className="prep-form" onSubmit={e => { e.preventDefault(); void onSave(draft); }}><label>구분<select value={draft.kind} onChange={e => set({ ...draft, kind: e.target.value as CounselTask['kind'] })}><option value="question">상담 전 질문</option><option value="action">상담 후 할 일</option></select></label><label>제목<input required maxLength={200} value={draft.title} onChange={e => set({ ...draft, title: e.target.value })} /></label><label>연결할 전형<select value={draft.application_id ?? ''} onChange={e => set({ ...draft, application_id: e.target.value || null })}><option value="">공통 상담</option>{applications.map(a => <option key={a.id} value={a.id}>{a.year} · {a.university} · {a.program}</option>)}</select></label><div className="form-grid"><label>상담일(선택)<input type="date" value={draft.session_date ?? ''} onChange={e => set({ ...draft, session_date: e.target.value || null })} /></label><label>기한(선택)<input type="date" value={draft.due_date ?? ''} onChange={e => set({ ...draft, due_date: e.target.value || null })} /></label></div><label>상담 메모·다음 행동<textarea maxLength={2000} rows={4} value={draft.note} onChange={e => set({ ...draft, note: e.target.value })} /></label><EditorActions {...{ busy, error, onClose }} /></form></Modal>;
}
