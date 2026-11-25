import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { studentDb, usePlanner } from '../store/studentDb';
import { admissionYear } from '../data/catalog';
import { PlanEditor } from '../components/PlanEditor';
import { eligibilityStates, newApplication, newCounselTask, stepStates, taskDeadline, updateApplicationIdentity,
  type ApplicationPlan, type ChecklistStep, type CounselTask, type EligibilityItem } from '../domain/planner';
import '../styles/preparation.css';
import '../styles/counsel-tasks.css';
import { Icon } from '../components/Icon';
import { PreparationOverview, usePreparationDesktop } from '../components/PreparationOverview';

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
function Feedback({ error, message }: { error: string; message: string }) { return <>{error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}</>; }
function DeleteConfirm({ title, children, busy, error, onClose, onDelete }: { title: string; children: ReactNode; busy: boolean; error: string; onClose: () => void; onDelete: () => void }) {
  return <Modal label={title} onClose={() => { if (!busy) onClose(); }}><h3 className="t-heading-3">{title}</h3><p>{children}</p><Feedback error={error} message="" /><div className="toolbar"><ButtonPrimary disabled={busy} onClick={onDelete}>삭제</ButtonPrimary><ButtonOutline disabled={busy} onClick={onClose}>취소</ButtonOutline></div></Modal>;
}

export function Preparation({ view }: { view: 'checklist' | 'eligibility' }) {
  const state = usePlanner(), actions = useActions(), now = useNow(), desktop = usePreparationDesktop();
  const [headerSlots, setHeaderSlots] = useState<{ heading: Element; actions: Element } | null>(null);
  useEffect(() => { const heading = document.querySelector('.topbar__heading'), actions = document.getElementById('topbar-screen-actions'); if (heading && actions) setHeaderSlots({ heading, actions }); }, []);
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
  const addPlan = <button className={view === 'checklist' || !desktop ? 'button-pill-soft' : 'button-primary'} aria-label="+ 지원 전형 추가" disabled={!state?.data || actions.busy} onClick={() => open(() => setPlanEdit(newApplication(admissionYear)))}><Icon name="plus" size={20} />지원 전형 추가</button>;
  const description = view === 'checklist' ? '접수부터 서류 도착까지, 빠뜨린 단계가 없는지 확인해요.' : '모집요강을 확인하며 내 조건과 필요한 증빙을 정리해요.';
  return <section className={`student-screen preparation preparation--${view}`} data-slug={view === 'checklist' ? 'application-checklist' : 'eligibility-check'}>
    {desktop && headerSlots ? <>{createPortal(<p className="prep-header-description">{description}</p>, headerSlots.heading)}{createPortal(<div className="prep-header-action">{addPlan}</div>, headerSlots.actions)}</> : <div className="screen-heading prep-heading"><div><h2 className="t-heading-1">{title}</h2><p>{description}</p></div>{(desktop || !selected) && addPlan}</div>}
    {!state ? <p role="status">준비 기록을 읽고 있어요.</p> : !state.data ? <p role="alert">{state.error}</p> : <>
      <Feedback {...actions} />
      {!selected ? <div className="empty-state"><h3 className="t-heading-3">준비할 전형을 먼저 추가해 주세요</h3><p>대학·전형 이름과 모집요강 링크를 직접 등록할 수 있어요. 추가한 전형은 체크리스트와 자격 확인표에서 함께 사용해요.</p></div> : <PreparationOverview view={view} applications={applications} selected={selected} now={now} desktop={desktop} busy={actions.busy} addPlan={addPlan} select={id => setQuery({ plan: id })} editPlan={() => open(() => setPlanEdit(selected))} deletePlan={() => open(() => setPlanDelete(selected))} editStep={item => open(() => setStepEdit(item))} editEligibility={item => open(() => setEligibilityEdit(item))} deleteItem={item => open(() => setItemDelete(item))} />}
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

type TaskStatus = 'pending' | '오늘까지' | '기한 지남' | 'done' | 'all';
const KIND_LABEL: Record<CounselTask['kind'], string> = { question: '상담 전 질문', action: '상담 후 할 일' };
const planLabel = (a: ApplicationPlan) => [a.university, a.department || a.program].filter(Boolean).join(' ');
const deadlineTone = (label: string) => label === '기한 지남' || label === '오늘까지' ? 'strong' : label === '예정' ? 'soft' : 'muted';

export function CounselTasks() {
  const state = usePlanner(), actions = useActions(), now = useNow(), desktop = usePreparationDesktop();
  const [headerSlots, setHeaderSlots] = useState<{ heading: Element; actions: Element } | null>(null);
  useEffect(() => { const heading = document.querySelector('.topbar__heading'), slot = document.getElementById('topbar-screen-actions'); if (heading && slot) setHeaderSlots({ heading, actions: slot }); }, []);
  const [query, setQuery] = useSearchParams();
  const [edit, setEdit] = useState<CounselTask | null>(null), [deleting, setDeleting] = useState<CounselTask | null>(null), [picking, setPicking] = useState(false);
  const [status, setStatus] = useState<TaskStatus>('pending'), [kind, setKind] = useState<'all' | CounselTask['kind']>('all');
  const data = state?.data, plan = query.get('plan') ?? '', apps = data?.applications ?? [], tasks = data?.tasks ?? [];
  const planOf = (t: CounselTask) => { const a = apps.find(x => x.id === t.application_id); return a ? planLabel(a) : '공통 상담'; };
  const linked = apps.find(a => a.id === plan);
  const setPlan = (v: string) => setQuery(v ? { plan: v } : {});
  // 칩 숫자 · 숫자 줄은 고른 전형 · 구분 안에서 세요(02-spec 390-plan)
  const scope = tasks.filter(t => (!plan || (plan === 'common' ? !t.application_id : t.application_id === plan)) && (kind === 'all' || t.kind === kind));
  const deadline = (t: CounselTask) => taskDeadline(t, now);
  const n = { pending: scope.filter(t => !t.done).length, today: scope.filter(t => deadline(t) === '오늘까지').length, late: scope.filter(t => deadline(t) === '기한 지남').length, done: scope.filter(t => t.done).length, all: scope.length };
  const visible = scope.filter(t => status === 'all' || (status === 'done' ? t.done : status === 'pending' ? !t.done : deadline(t) === status))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || b.updated_at.localeCompare(a.updated_at));
  const questions = tasks.filter(t => t.kind === 'question' && !t.done);
  const open = (task: CounselTask) => { actions.reset(); setEdit(task); };
  const add = (k?: CounselTask['kind']) => open({ ...newCounselTask(linked ? plan : null), ...(k && { kind: k }) });
  const reset = () => { setStatus('pending'); setKind('all'); setPlan(''); };
  const chip = (on: boolean, label: string, click: () => void) => <button key={label} type="button" className="filter-chip" aria-pressed={on} disabled={actions.busy} onClick={click}>{label}</button>;
  const statusChips = ([['pending', `진행할 항목 ${n.pending}`], ...(n.today ? [['오늘까지', `오늘까지 ${n.today}`]] : []), ...(n.late ? [['기한 지남', `기한 지남 ${n.late}`]] : []), ['done', `완료 ${n.done}`], ['all', `전체 ${n.all}`]] as [TaskStatus, string][])
    .map(([v, label]) => chip(status === v, label, () => setStatus(v)));
  const kinds: ['all' | CounselTask['kind'], string][] = [['all', '전체'], ['question', KIND_LABEL.question], ['action', KIND_LABEL.action]];
  const plans: [string, string][] = [['', '모든 전형'], ['common', '공통 상담'], ...apps.map(a => [a.id, planLabel(a)] as [string, string])];
  const selectChip = (label: string, name: string, value: string, options: [string, string][], change: (v: string) => void) =>
    <label className={`filter-chip ct-select${value ? ' is-on' : ''}`}><span aria-hidden="true">{value ? options.find(([v]) => v === value)?.[1] : label}</span>
      <select aria-label={name} disabled={actions.busy} value={value} onChange={e => change(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><Icon name="chevron-down" size={16} /></label>;
  const share = <button type="button" className={desktop ? 'button-outline' : 'button-pill-soft'} disabled={!data || actions.busy} onClick={() => setPicking(true)}>상담카드에 담기</button>;
  const addButton = <ButtonPrimary aria-label="질문·할 일 추가" disabled={!data || actions.busy} onClick={() => add()}><Icon name="plus" size={20} />{desktop ? '질문·할 일 추가' : '추가'}</ButtonPrimary>;
  const description = '상담 전에 궁금한 점을 모으고, 상담 뒤 해야 할 일을 챙겨요.';
  const countLine = <p className="ct-count">진행할 항목 {n.pending}개{n.today > 0 && ` · 오늘까지 ${n.today}개`}{n.late > 0 && <> · <strong>기한 지남 {n.late}개</strong></>}</p>;
  return <section className="student-screen preparation counsel-tasks" data-slug="counsel-tasks">
    {desktop && headerSlots ? <>{createPortal(<p className="prep-header-description">{description}</p>, headerSlots.heading)}{createPortal(<div className="ct-header-actions">{share}{addButton}</div>, headerSlots.actions)}</>
      : <div className="ct-head">{addButton}<p className="ct-lead">{description}</p>{!desktop && tasks.length > 0 && <div className="ct-count-row">{countLine}{share}</div>}</div>}
    {!state ? <p role="status">상담 기록을 읽고 있어요.</p> : !data ? <p role="alert">{state.error}</p> : <>
      <Feedback {...actions} />
      {!tasks.length ? <div className="empty-state"><Icon name="message-square" size={24} /><h3 className="t-heading-3">아직 적은 상담 질문이 없어요</h3><p>상담 전에 궁금한 점을 적어 두면 상담 때 놓치지 않아요.</p><ButtonPrimary disabled={actions.busy} onClick={() => add('question')}>+ 첫 질문 적기</ButtonPrimary></div> : <>
        {desktop && countLine}
        {desktop ? <div className="ct-filters">
          <div className="ct-filter-row" role="group" aria-label="상태와 구분"><span className="ct-filter-label">상태</span>{statusChips}<span className="ct-filter-gap" aria-hidden="true" /><span className="ct-filter-label">구분</span>{kinds.map(([v, label]) => chip(kind === v, label, () => setKind(v)))}</div>
          <div className="ct-filter-row" role="group" aria-label="전형"><span className="ct-filter-label">전형</span>{plans.map(([v, label]) => chip(plan === v, label, () => setPlan(v)))}</div>
        </div> : <div className="ct-chips" role="group" aria-label="거르기">{statusChips}
          {selectChip('구분', '상담 구분', kind === 'all' ? '' : kind, kinds.map(([v, l]) => [v === 'all' ? '' : v, l]), v => setKind((v || 'all') as typeof kind))}
          {selectChip('전형', '전형별 보기', plan, plans, setPlan)}</div>}
        {!visible.length ? <div className="empty-state"><Icon name="search" size={24} /><h3 className="t-heading-3">이 조건에 맞는 항목이 없어요</h3><p>구분이나 전형을 바꾸면 다른 항목이 보여요.</p><ButtonPrimary onClick={reset}>전체 보기</ButtonPrimary></div>
          : <div className="ct-list">{visible.map(t => { const label = deadline(t); return <article className={`ct-card${t.done ? ' is-done' : ''}`} key={t.id}>
            <p className="ct-caption">{KIND_LABEL[t.kind]} · {planOf(t)}{t.session_date && ` · 상담일 ${t.session_date}`}</p>
            <h3 className="ct-title">{t.title}</h3>
            <p className={`ct-deadline ct-deadline--${deadlineTone(label)}`}><Icon name="calendar" size={16} />{t.done ? `완료 · ${stamp(t.completed_at)}` : `${label}${t.due_date ? ` · ${t.due_date.slice(5)}까지` : ''}`}</p>
            {t.note && <p className="ct-memo">{t.note}</p>}
            <div className="ct-actions"><ButtonOutline disabled={actions.busy} onClick={() => void actions.run(async () => { await studentDb.saveTask({ ...t, done: !t.done, completed_at: t.done ? null : new Date().toISOString(), updated_at: new Date().toISOString() }); }, t.done ? '다시 진행할 항목으로 바꿨어요.' : '완료로 기록했어요.')}>{t.done ? '다시 진행' : t.kind === 'question' ? '물어봤어요' : '완료로 표시'}</ButtonOutline>
              <ButtonOutline aria-label={`${t.title} 수정`} disabled={actions.busy} onClick={() => open(t)}>수정</ButtonOutline></div>
          </article>; })}</div>}
        {linked && <p className="ct-caption">+ 추가하면 {planLabel(linked)}가 연결돼요</p>}
      </>}
      <div className="ct-foot"><p className="ct-storage">기한은 한국 날짜 기준이에요 · 이 기기에만 저장돼요</p><div className="ct-links"><Link to="/application-checklist">지원 전형 관리 ›</Link><Link to="/grade-input">암호화 백업·복원 ›</Link></div></div>
    </>}
    {edit && data && <TaskEditor initial={edit} applications={data.applications} busy={actions.busy} error={actions.error} onClose={() => setEdit(null)} onSave={t => actions.run(async () => { await studentDb.saveTask({ ...t, updated_at: new Date().toISOString() }); setEdit(null); })}
      onDelete={data.tasks.some(t => t.id === edit.id) ? () => { setEdit(null); setDeleting(edit); } : undefined} />}
    {deleting && <DeleteConfirm title="상담 항목을 삭제할까요?" busy={actions.busy} error={actions.error} onClose={() => setDeleting(null)} onDelete={() => void actions.run(async () => { await studentDb.tasks.delete(deleting.id); setDeleting(null); }, '상담 항목을 삭제했어요.')}>{deleting.title}의 메모와 완료 기록도 함께 삭제해요.</DeleteConfirm>}
    {picking && <Modal label="상담카드에 담을 질문" onClose={() => setPicking(false)}><h3 className="t-heading-3">상담카드에 담을 질문</h3>
      {questions.length ? <ul className="ct-pick">{questions.map(q => <li key={q.id}><strong>{q.title}</strong><small>{planOf(q)}</small></li>)}</ul> : <p>진행 중인 상담 전 질문이 없어요.</p>}
      {/* shortcut: 상담카드 형식에 질문 칸이 아직 없어 목록만 보여 줘요. 상담카드 · 카드 수합 형식 변경(K1)이 정해지면 담기를 구현 */}
      <p className="t-caption text-muted">질문을 상담카드에 함께 담아 보내는 기능은 준비 중이에요. 지금은 수시로에서 상담카드를 보내고, 상담 때 이 목록을 함께 보여 주세요.</p>
      <div className="toolbar"><ButtonOutline onClick={() => setPicking(false)}>닫기</ButtonOutline><Link className="button-primary" to="/susiro">수시로로 가기</Link></div></Modal>}
  </section>;
}
function TaskEditor({ initial, applications, busy, error, onSave, onClose, onDelete }: EditorProps<CounselTask> & { applications: ApplicationPlan[]; onDelete?: () => void }) {
  const [draft, set] = useState(initial);
  return <Modal label="상담 항목 편집" onClose={() => { if (!busy) onClose(); }}><h3 className="t-heading-3">상담 질문·할 일</h3><form className="prep-form" onSubmit={e => { e.preventDefault(); void onSave(draft); }}><label>구분<select value={draft.kind} onChange={e => set({ ...draft, kind: e.target.value as CounselTask['kind'] })}><option value="question">상담 전 질문</option><option value="action">상담 후 할 일</option></select></label><label>제목<input required maxLength={200} value={draft.title} onChange={e => set({ ...draft, title: e.target.value })} /></label><label>연결할 전형<select value={draft.application_id ?? ''} onChange={e => set({ ...draft, application_id: e.target.value || null })}><option value="">공통 상담</option>{applications.map(a => <option key={a.id} value={a.id}>{a.year} · {a.university} · {a.program}</option>)}</select></label><div className="form-grid"><label>상담일(선택)<input type="date" value={draft.session_date ?? ''} onChange={e => set({ ...draft, session_date: e.target.value || null })} /></label><label>기한(선택)<input type="date" value={draft.due_date ?? ''} onChange={e => set({ ...draft, due_date: e.target.value || null })} /></label></div><label>상담 메모·다음 행동<textarea maxLength={2000} rows={4} value={draft.note} onChange={e => set({ ...draft, note: e.target.value })} /></label><EditorActions {...{ busy, error, onClose }} />{onDelete && <button type="button" className="prep-danger" disabled={busy} onClick={onDelete}>삭제</button>}</form></Modal>;
}
