import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { ScreenActions } from '../components/ScreenActions';
import { SegmentedControl } from '../components/SegmentedControl';
import { studentDb, useStudent } from '../store/studentDb';
import { SendToTeacher } from '../components/SendToTeacher';
import { UniversityLogo } from '../components/UniversityLogo';
import { boardWarnings, csatStates, examKinds, isExempt, LIMIT, newBoard, SCENARIO_NAMES, type Board, type BoardSlot, type CardWarning } from '../domain/board';
import type { ApplicationPlan } from '../domain/planner';
import { judgeUniversity } from '../domain/results';
import { dataAsOf } from '../data/catalog';
import { useSampleMode } from '../data/sample/mode';
import '../styles/susiro.css';

/** .jnavi counsel_card payload. 판정은 검수된 판정이 생기기 전까지 null(NEVER-1). */
export const counselCard = (board: Board, apps: readonly ApplicationPlan[]) => {
  const app = (s: BoardSlot) => { const a = apps.find(x => x.id === s.application_id)!; return { university: a.university, program: a.program, department: a.department, year: a.year, exam_kind: s.exam_kind, exam_date: s.exam_date, csat: s.csat, memo: s.memo }; };
  const name = (id: string) => apps.find(x => x.id === id)?.university ?? '지운 전형';
  return { scenario: board.name, slots: board.slots.map((s, i) => ({ priority: i + 1, ...app(s), judgment: null })), exempt: board.exempt.map(app),
    warnings: boardWarnings(board, name).map(w => ({ code: w.code, title: w.title, message: w.message })) };
};

const JUDGE = { 안정: ['judge-safe', '●'], 적정: ['judge-fit', '◐'], 소신: ['judge-reach', '▲'], 위험: ['judge-risk', '■'] } as const;
type Verdict = keyof typeof JUDGE | '경계';
const TYPES = ['교과', '종합', '논술'] as const;
const typeOf = (program: string) => TYPES.find(t => program.includes(t));
const byName = (a: Board, b: Board) => a.name.localeCompare(b.name, 'ko');
const DAYS = '일월화수목금토';
const examText = (s: BoardSlot, long: boolean) => {
  if (s.exam_kind === 'none') return '고사 없음';
  if (!s.exam_date) return `${s.exam_kind} 일정 미정`;
  const [, m, d] = s.exam_date.split('-');
  return `${s.exam_kind} ${m}.${d}${long ? `(${DAYS[new Date(`${s.exam_date}T00:00:00`).getDay()]})` : ''}`;
};
// 경고 요약 바(모바일) 한 줄: "면접 일정이 겹쳐요" → "면접 일정 겹침", "소신·위험 쪽으로 쏠렸어요" → "소신·위험 쏠림"
const shortTitle = (w: CardWarning) => w.title.replace('이 겹쳐요', ' 겹침').replace(' 쪽으로 쏠렸어요', ' 쏠림');
const PENDING = '판정 기준이 검수되면 소신·위험 쏠림도 함께 점검해요.';
const SCENARIO_HINT = '최대 5개 안을 만들 수 있어요. 복사한 안의 카드·메모·일정은 원래 안과 따로 수정돼요.';

/** PC(≥1024)는 3×2 카드·오른쪽 점검 패널, 모바일은 6칸 목록·경고 요약 바·시트예요. */
function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(min-width: 1024px)'), update = () => setDesktop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

function SheetHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return <div className="susi-sheet__head"><div><h3 className="t-heading-4">{title}</h3>{sub && <p className="t-caption text-muted">{sub}</p>}</div>
    <button type="button" className="susi-sheet__close" aria-label={`${title} 닫기`} onClick={onClose}><Icon name="x" /></button></div>;
}

function Confirm({ title, body, action, error, busy, onCancel, onConfirm, cancel = '취소' }: { title: string; body: string; action: string; error?: string; busy: boolean; onCancel: () => void; onConfirm: () => void; cancel?: string }) {
  return <><h3 className="t-heading-4">{title}</h3><p>{body}</p>
    {error && <p role="alert" className="error-note">{error}</p>}
    <div className="susi-confirm-actions"><ButtonOutline disabled={busy} onClick={onCancel}>{cancel}</ButtonOutline><ButtonPrimary disabled={busy} onClick={onConfirm}>{action}</ButtonPrimary></div></>;
}

type Sheet = 'pick' | 'warnings' | 'reorder' | 'scenario' | null;

export function Susiro() {
  const state = useStudent();
  useSampleMode(); // 샘플 전형·판정 규칙이 켜고 끌 때 바뀌어요
  const desktop = useDesktop();
  const [query, setQuery] = useSearchParams();
  // 아직 저장하지 않은 안(탭은 늘 A안 · B안 · C안부터 보여요). 처음 담을 때 그 이름으로 저장돼요.
  const [drafts] = useState(() => Object.fromEntries(SCENARIO_NAMES.map(n => [n, newBoard(n)])) as Record<string, Board>);
  const [boardId, setBoardId] = useState(''), [sheet, setSheet] = useState<Sheet>(null), [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState<{ boardId: string; slot: BoardSlot } | null>(null), [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState<Board | null>(null), [busy, setBusy] = useState(false), lock = useRef(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [focus, setFocus] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null), [dragId, setDragId] = useState<string | null>(null);
  useEffect(() => { if (!message) return; const t = window.setTimeout(() => setMessage(''), 3000); return () => window.clearTimeout(t); }, [message]);
  if (!state) return <section className="student-screen susiro" data-slug="susiro"><p role="status" className="t-body-sm text-muted">기기에 저장된 기록을 읽고 있어요.</p></section>;
  if (!state.data) return <section className="student-screen susiro" data-slug="susiro">
    <div role="alert" className="susi-error"><Icon name="triangle-alert" size={20} /><p>기기에 저장된 기록을 읽지 못했어요. 브라우저 저장 권한을 확인해 주세요.</p></div>
    <ButtonOutline onClick={() => window.location.reload()}>다시 읽기</ButtonOutline>
    <p className="disclaimer-note"><Icon name="info" size={16} /><span>대학 공식 자료가 최종 기준이에요 · 6회 제외 기관은 과학기술원·사관학교·경찰대 목록으로 나눠요</span></p></section>;

  const data = state.data, apps = data.planning?.applications ?? [], boards = data.boards ?? [];
  const saved = [...boards].sort(byName);
  const missing = SCENARIO_NAMES.filter(n => !saved.some(b => b.name === n)).slice(0, Math.max(0, 3 - saved.length));
  const tabs = [...saved, ...missing.map(n => drafts[n])].sort(byName);
  const board = tabs.find(b => b.id === boardId) ?? tabs[0];
  const draft = !boards.includes(board), full = boards.length >= SCENARIO_NAMES.length;
  const app = (id: string) => apps.find(a => a.id === id);
  const name = (id: string) => app(id)?.university ?? '지운 전형';
  // 될각과 같은 조건(같은 대학·모집단위의 교과 전형 입결)일 때만 판정해요. 그 밖은 판정 준비 중(NEVER-1).
  const judgment = (id: string) => { const a = app(id); return a ? judgeUniversity(data.grades, a.university, undefined, a.department || undefined) : null; };
  const judged = new Map([...board.slots, ...board.exempt].map(s => [s.application_id, judgment(s.application_id)]));
  const verdict = (id: string): Verdict | null => { const j = judged.get(id); return j ? (j.v.boundary ? '경계' : j.v.label) : null; };
  const warnings = boardWarnings(board, name, id => judged.get(id)?.v.label ?? null);
  // PC 시안 기본 상태(1440): 첫 경고가 선택돼 관련 칸·경고에 1px 잉크 테두리. 경고를 누르거나 칸을 비우면 그 선택을 따라요.
  const focused = focus ?? (desktop ? warnings[0]?.slots ?? [] : []);
  const filled = board.slots.length + board.exempt.length > 0;
  const anyJudged = board.slots.some(s => judged.get(s.application_id)), allJudged = board.slots.length > 0 && board.slots.every(s => judged.get(s.application_id));
  const typeCount = (t: string) => board.slots.filter(s => typeOf(app(s.application_id)?.program ?? '') === t).length;
  const others = board.slots.length - TYPES.reduce((n, t) => n + typeCount(t), 0);
  const typeLine = [...TYPES.map(t => `${t} ${typeCount(t)}`), ...(others ? [`기타 ${others}`] : []), `6회 제외 ${board.exempt.length}`].join(' · ');
  const dist: [Verdict, number][] = (['안정', '적정', '소신', '위험', '경계'] as Verdict[]).map(v => [v, board.slots.filter(s => verdict(s.application_id) === v).length] as [Verdict, number]).filter(([v, n]) => v !== '경계' || n > 0);

  const requested = app(query.get('plan') ?? '');
  const alreadyAdded = !!requested && [...board.slots, ...board.exempt].some(slot => slot.application_id === requested.id);
  const clearRequest = () => { const next = new URLSearchParams(query); next.delete('plan'); setQuery(next, { replace: true }); };
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const select = (id: string) => { setBoardId(id); setFocus(null); setPicked(null); setError(''); setMessage(''); };
  const openPick = () => { setError(''); setSheet('pick'); };
  const add = (a: ApplicationPlan) => run(async () => {
    const next = await studentDb.changeBoard(board.id, { kind: 'add', application_id: a.id }, draft && board.name);
    setBoardId(next.id); setSheet(null); setMessage(`${next.name}에 카드를 담았어요.`);
  });
  const addScenario = (copy = false) => { setMenu(false); setSheet(null); void run(async () => {
    const next = await studentDb.createScenario(copy ? board.id : undefined);
    select(next.id); setMessage(copy ? `${board.name}을 ${next.name}으로 복사했어요.` : `${next.name}을 만들었어요.`);
  }); };
  const askDelete = () => { setMenu(false); setSheet(null); setError(''); setDeleting(board); };
  const reorder = (ids: string[]) => run(async () => { await studentDb.changeBoard(board.id, { kind: 'order', ids }); setSheet(null); });
  const moveTo = (id: string, to: number) => { const ids = board.slots.map(s => s.application_id).filter(x => x !== id); ids.splice(to, 0, id); void reorder(ids); };
  const move = (id: string, delta: -1 | 1) => void run(async () => { await studentDb.changeBoard(board.id, { kind: 'move', application_id: id, delta }); });
  const exportPdf = () => { setMessage(`${board.name} 요약을 인쇄 창으로 보냈어요. 'PDF로 저장'을 고르면 파일로 남아요.`); window.print(); };
  const pickedBoard = board, pickable = apps.filter(a => ![...pickedBoard.slots, ...pickedBoard.exempt].some(s => s.application_id === a.id));
  const anyOpen = !!sheet || !!editing || !!deleting || sharing;

  const judgeBadge = (id: string) => { const v = verdict(id);
    return !v ? <span className="data-status-badge judge-pending">판정 준비 중</span> : v === '경계' ? <span className="judge-badge judge-edge">경계</span>
      : <span className={`judge-badge ${JUDGE[v][0]}`}><span aria-hidden="true">{JUDGE[v][1]}</span> {v}</span>; };
  const slotView = (s: BoardSlot, rank: number | null, index = -1) => { const a = app(s.application_id), title = a?.university ?? '지운 전형';
    const program = a ? [typeOf(a.program) ?? a.program, a.department].filter(Boolean).join(' · ') : '목록에서 지운 전형이에요. 이 칸을 비워 주세요.';
    const cls = ['susi-slot', rank === null && 'susi-slot--exempt', focused.includes(s.application_id) && 'susi-slot--focus', picked === s.application_id && 'susi-slot--picked', dragId === s.application_id && 'susi-slot--dragging'].filter(Boolean).join(' ');
    const drag = desktop && rank !== null ? { draggable: !busy, onDragStart: (e: DragEvent) => { setDragId(s.application_id); e.dataTransfer.effectAllowed = 'move'; },
      onDragOver: (e: DragEvent) => e.preventDefault(), onDrop: (e: DragEvent) => { e.preventDefault(); if (dragId && dragId !== s.application_id) moveTo(dragId, index); setDragId(null); }, onDragEnd: () => setDragId(null) } : {};
    return <li key={s.application_id} className={cls} {...drag}>
      <button type="button" className="susi-slot__open" disabled={busy} aria-label={`${rank ? `${rank}순위` : '6회 제외'} ${title} 상세`} onClick={() => { setError(''); setEditing({ boardId: board.id, slot: s }); }}>
        {rank !== null ? <span className="susi-slot__rank num">{rank}</span> : <span className="data-status-badge susi-slot__exempt">6회 제외</span>}
        <UniversityLogo university={a?.university} />
        <span className="susi-slot__info"><strong>{title}</strong><span className="susi-slot__program"><span>{program}</span>{a && <span>{csatStates[s.csat]}</span>}</span>
          {s.memo && desktop && <span className="susi-slot__memo">{s.memo}</span>}</span>
        <span className="susi-slot__badges">{judgeBadge(s.application_id)}<span className="data-status-badge num">{examText(s, desktop)}</span></span>
      </button>
      {rank !== null && <button type="button" className="susi-slot__grip" disabled={busy} aria-pressed={desktop ? picked === s.application_id : undefined}
        aria-label={desktop ? `${rank}순위 ${title} 순서 옮기기` : `${rank}순위 ${title} 순서 변경`} onClick={() => desktop ? setPicked(picked === s.application_id ? null : s.application_id) : setSheet('reorder')}
        onKeyDown={e => { if (!desktop || picked !== s.application_id) return;
          const delta = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : 0;
          if (delta) { e.preventDefault(); if (index + delta >= 0 && index + delta < board.slots.length) move(s.application_id, delta); }
          if (e.key === 'Escape') setPicked(null); }}><Icon name="grip-vertical" /></button>}</li>; };

  const callouts = (after?: () => void) => warnings.map(w => <button key={w.code + w.title} type="button" className={`warning-callout${w.slots.length && w.slots.every(id => focused.includes(id)) ? ' warning-callout--selected' : ''}`}
    onClick={() => { setFocus(w.slots); after?.(); }}><Icon name="triangle-alert" size={20} /><span><strong>{w.title}</strong><span>{w.message}</span></span></button>);
  const distView = (row: boolean) => anyJudged && <section className={`susi-dist${row ? ' susi-dist--row' : ''}`} aria-label="판정 분포"><h4 className="t-caption">판정 분포</h4>
    <ul>{dist.map(([v, n]) => <li key={v}>{v === '경계' ? <span className="judge-badge judge-edge">경계</span> : <span className={`judge-badge ${JUDGE[v][0]}`}><span aria-hidden="true">{JUDGE[v][1]}</span> {v}</span>}<strong className="num">{n}</strong></li>)}</ul></section>;
  const noWarning = <p className="t-body-sm text-muted">등록한 일정과 카드에서 확인할 항목이 없어요. 미정인 일정은 대학 발표 후 입력해 주세요.</p>;
  const disclaimer = <p className="disclaimer-note"><Icon name="info" size={16} /><span>대학 공식 자료가 최종 기준이에요 · 6회 제외 기관은 과학기술원·사관학교·경찰대 목록으로 나눠요</span></p>;
  const Send = query.has('plan') && requested ? ButtonOutline : ButtonPrimary; // 지원 준비 카드가 있는 동안은 그 카드 버튼이 주요 버튼
  const send = <>{!filled && <p className="t-caption text-muted">1장 이상 담아야 보낼 수 있어요</p>}<Send disabled={busy || !filled} onClick={() => setSharing(true)}>상담카드 보내기</Send></>;
  const scenarioTabs = <SegmentedControl label="시나리오" value={board.id} onChange={select} options={tabs.map(b => ({ value: b.id, label: b.name }))} />;
  const count = `6회 제한 ${board.slots.length}/${LIMIT}장`;
  const tiles: [string, number, string][] = [...TYPES.map(t => [t, typeCount(t), '6회 제한 칸'] as [string, number, string]), ['6회 제외', board.exempt.length, '6회 제한 밖']];

  return <section className="student-screen susiro" data-slug="susiro" aria-label="수시로">
    <ScreenActions><span className="data-status-badge susi-asof">시행계획 기준 · {dataAsOf}</span></ScreenActions>
    {!desktop && <div className="susi-check-bar">
      {warnings.length ? <button type="button" className="warning-callout susi-check-bar__button" onClick={() => setSheet('warnings')}><Icon name="triangle-alert" size={20} />
        <strong>경고 {warnings.length}개 · {shortTitle(warnings[0])}{warnings.length > 1 && ` 외 ${warnings.length - 1}개`}</strong><Icon name="chevron-down" size={20} /></button>
        : <button type="button" className="warning-callout warning-callout--neutral susi-check-bar__button" onClick={() => setSheet('warnings')}><Icon name="info" size={20} />
          <span><strong>조합 점검 0건</strong><span>{filled ? '확인할 항목이 없어요' : '카드를 담으면 점검해요.'}</span></span></button>}
      {filled && <p className="t-body-sm num">{typeLine}</p>}
      {filled && !allJudged && <p className="t-caption text-muted">{PENDING}</p>}
    </div>}

    {query.has('plan') && <section className="filter-panel susi-from-plan" aria-label="지원 준비에서 가져온 전형">{requested ? <><h3 className="t-heading-3">{requested.university} · {requested.department || '모집단위 미입력'}</h3><p>{requested.year}학년도 · {requested.program}</p><p className="t-caption text-muted">아래에서 담을 안을 선택한 뒤 추가해 주세요. 학년도·전형·학과를 그대로 연결해요.</p><div className="toolbar"><ButtonPrimary disabled={busy || alreadyAdded} onClick={() => void run(async () => { const next = await studentDb.changeBoard(board.id, { kind: 'add', application_id: requested.id }, draft && board.name); setBoardId(next.id); setFocus([requested.id]); clearRequest(); setMessage(`${next.name}에 ${requested.department || requested.program}을 담았어요.`); })}>{alreadyAdded ? `${board.name}에 이미 담았어요` : `이 전형을 ${board.name}에 담기`}</ButtonPrimary><ButtonOutline disabled={busy} onClick={clearRequest}>나중에 담기</ButtonOutline></div></>
      : <><div role="alert" className="susi-error"><Icon name="triangle-alert" size={20} /><p>연결된 지원 준비 기록을 찾지 못했어요. 체크리스트에서 다시 선택해 주세요.</p></div><div className="toolbar"><Link to="/application-checklist">지원 준비 확인</Link><button type="button" className="button-pill-soft" onClick={clearRequest}>안내 닫기</button></div></>}</section>}

    <div className="susi-layout"><div className="susi-main">
      <div className="susi-top">
        <fieldset className="susi-scenarios" disabled={busy}><legend className="sr-only">시나리오 관리</legend>{scenarioTabs}
          {desktop && <button type="button" className="button-pill-soft" disabled={full} onClick={() => addScenario()}><Icon name="plus" size={20} />새 안</button>}
          {!desktop && <button type="button" className="button-pill-soft" onClick={() => setSheet('scenario')}>안 관리</button>}</fieldset>
        {desktop && <><div className="susi-menu"><button type="button" className="button-pill-soft" aria-expanded={menu} disabled={busy} onClick={() => setMenu(!menu)}>안 관리 ▾</button>
          {menu && <div className="susi-menu__list" onKeyDown={e => { if (e.key === 'Escape') setMenu(false); }}>
            <button type="button" disabled={full || draft} onClick={() => addScenario(true)}>현재 안 복사</button>
            <button type="button" disabled={draft} onClick={askDelete}>현재 안 삭제</button></div>}</div>
          <strong className="susi-count num">{count}</strong>
          <ButtonOutline disabled={!filled} onClick={exportPdf}><Icon name="download" size={20} />PDF로 내보내기</ButtonOutline></>}
      </div>
      {desktop && (menu || full) && <p className="t-caption text-muted">{full ? '최대 5개 안을 만들 수 있어요. 사용하지 않는 안을 삭제한 뒤 다시 시도해 주세요.' : SCENARIO_HINT}</p>}
      {!desktop && <div className="susi-count-row"><p className="t-caption num">{count} · 6회 제외 {board.exempt.length}장</p>
        <button type="button" className="button-pill-soft" disabled={busy || board.slots.length < 2} onClick={() => setSheet('reorder')}><Icon name="arrow-up-down" size={20} />순서 변경</button></div>}
      {desktop && <div className="susi-tiles">{tiles.map(([label, n, caption]) => <div key={label} className="stat-tile"><span className="t-caption">{label}</span><strong className="num">{n}</strong><span className="t-body-sm text-muted">{caption}</span></div>)}</div>}
      {error && !anyOpen && <p role="alert" className="error-note">{error}</p>}
      {!filled && <div className="empty-state susi-empty"><Icon name="layout-grid" size={48} /><h3 className="t-heading-4">아직 담은 대학이 없어요</h3>
        <p>원서·서류 체크리스트에 등록한 전형을 빈 칸에 담으면 여기에 6칸으로 모여요.</p><ButtonPrimary disabled={busy} onClick={openPick}>전형 담기</ButtonPrimary></div>}
      {picked && <p className="t-caption text-muted">Space로 놓고 방향키로 옮겨요.</p>}
      <ol className="susi-board">{board.slots.map((s, i) => slotView(s, i + 1, i))}
        {Array.from({ length: LIMIT - board.slots.length }, (_, i) => <li key={`empty-${i}`} className="susi-slot susi-slot--empty"><button type="button" disabled={busy} onClick={openPick}>+ 대학 담기</button></li>)}</ol>
      {board.slots.length === LIMIT && <ButtonOutline disabled={busy} onClick={openPick}>6회 제외 전형 담기</ButtonOutline>}
      {board.exempt.length > 0 && <div className="susi-exempt"><p className="t-caption text-muted">6회 제외 {board.exempt.length}장</p><ul className="susi-board susi-board--exempt">{board.exempt.map(s => slotView(s, null))}</ul></div>}
      {!desktop && disclaimer}
    </div>
    {desktop && <aside className="susi-panel" aria-label="조합 점검"><div><h3 className="t-heading-4">조합 점검</h3><p className="t-caption text-muted">경고 {warnings.length}개</p></div>
      {warnings.length ? callouts() : noWarning}
      {distView(false)}
      {filled && !allJudged && <p className="t-caption text-muted">{PENDING} 지금은 고사 일정 겹침과 6장 제한만 점검해요.</p>}
      {disclaimer}{send}
    </aside>}</div>
    {!desktop && <div className="susi-send-bar">{send}</div>}

    {sheet === 'warnings' && <Modal label="조합 점검" onClose={() => setSheet(null)}><SheetHead title="조합 점검" sub={`경고 ${warnings.length}개`} onClose={() => setSheet(null)} />
      {warnings.length ? callouts(() => setSheet(null)) : noWarning}
      {distView(true)}
      {filled && !allJudged && <p className="t-caption text-muted">{PENDING} 지금은 고사 일정 겹침과 6장 제한만 점검해요.</p>}
      {warnings.length > 0 && <p className="t-caption text-muted">경고를 누르면 관련 칸을 표시해요.</p>}</Modal>}
    {sheet === 'pick' && <Modal label="대학 담기" onClose={() => { if (!busy) setSheet(null); }}><SheetHead title="담을 전형 고르기" onClose={() => { if (!busy) setSheet(null); }} />
      {error && <p role="alert" className="error-note">{error}</p>}
      {pickedBoard.slots.length >= LIMIT && pickable.length > 0 && <p className="warning-callout warning-callout--neutral">6장을 모두 채웠어요. 6회 제외 전형만 추가할 수 있어요.</p>}
      {pickable.length > 0 && <ul className="susi-pick-list">{pickable.map(a => { const exempt = isExempt(a.university); return <li key={a.id}><button type="button" disabled={busy || (pickedBoard.slots.length >= LIMIT && !exempt)} className="susi-pick" aria-label={[a.university, `${a.year}학년도`, a.program, a.department].filter(Boolean).join(' · ')} onClick={() => void add(a)}>
        <span><strong>{a.university}</strong><span className="t-body-sm text-muted">{[`${a.year}학년도`, a.program, a.department].filter(Boolean).join(' · ')}</span></span>{exempt && <span className="data-status-badge">6회 제외</span>}</button></li>; })}</ul>}
      {!apps.length && <p>먼저 원서·서류 체크리스트에서 지원할 전형을 등록해 주세요.</p>}
      {apps.length > 0 && !pickable.length && <p>등록한 전형을 모두 이 안에 담았어요.</p>}
      <div className="susi-confirm-actions susi-confirm-actions--row">{!busy && <Link className={apps.length ? 'button-outline' : 'button-primary'} to="/application-checklist">전형 등록하러 가기</Link>}<ButtonOutline disabled={busy} onClick={() => setSheet(null)}>닫기</ButtonOutline></div></Modal>}
    {sheet === 'reorder' && <ReorderSheet slots={board.slots} name={name} busy={busy} error={error} onClose={() => setSheet(null)} onApply={ids => void reorder(ids)} />}
    {sheet === 'scenario' && <Modal label="안 관리" onClose={() => setSheet(null)}><SheetHead title="안 관리" onClose={() => setSheet(null)} />
      <ul className="susi-actions">
        <li><button type="button" disabled={busy || full} onClick={() => addScenario()}>빈 새 안 만들기</button></li>
        <li><button type="button" disabled={busy || full || draft} onClick={() => addScenario(true)}>{board.name} 복사해서 새 안 만들기</button></li>
        <li><button type="button" disabled={busy || draft} onClick={askDelete}>{board.name} 삭제</button></li></ul>
      <p className="t-caption text-muted">{SCENARIO_HINT}</p></Modal>}
    {editing && <SlotEditor slot={editing.slot} title={name(editing.slot.application_id)} program={(a => a ? [a.program, a.department].filter(Boolean).join(' · ') : '')(app(editing.slot.application_id))} busy={busy} error={error} onClose={() => { setError(''); setEditing(null); }}
      onSave={s => void run(async () => { await studentDb.changeBoard(editing.boardId, { kind: 'update', slot: s }); setEditing(null); setMessage('칸을 저장했어요.'); })}
      onClear={() => void run(async () => { await studentDb.changeBoard(editing.boardId, { kind: 'remove', application_id: editing.slot.application_id }); setEditing(null); setFocus([]); setMessage('칸을 비웠어요.'); })} />}
    {deleting && <Modal label="수시로 안 삭제 확인" onClose={() => { if (!busy) setDeleting(null); }}>
      <Confirm title={`${deleting.name}을 삭제할까요?`} body="이 안의 카드 배치·메모·일정을 지워요. 지원 준비 체크리스트, 관심 전형과 다른 안은 유지돼요." action="안 삭제" error={error} busy={busy}
        onCancel={() => setDeleting(null)} onConfirm={() => void run(async () => { await studentDb.deleteBoard(deleting.id); select(''); setDeleting(null); setMessage(`${deleting.name}을 삭제했어요.`); })} /></Modal>}
    {sharing && <SendToTeacher title="상담카드" kind="counsel_card" payload={counselCard(board, apps)} filename={`상담카드_${board.name}`} onClose={() => setSharing(false)} onDone={setMessage}>
      <p>{board.name}의 {board.slots.length + board.exempt.length}장과 순위·메모를 상담카드 파일(.jnavi)로 저장해요. 파일을 담임 선생님께 전달해 주세요. 파일에는 내 성적이 들어가지 않아요.</p></SendToTeacher>}
    {message && <p role="status" className="toast">{message}</p>}
  </section>;
}

function ReorderSheet({ slots, name, busy, error, onClose, onApply }: { slots: BoardSlot[]; name: (id: string) => string; busy: boolean; error: string; onClose: () => void; onApply: (ids: string[]) => void }) {
  const [ids, setIds] = useState(() => slots.map(s => s.application_id)), [moved, setMoved] = useState<string | null>(null);
  const shift = (i: number, d: -1 | 1) => { const next = [...ids]; [next[i], next[i + d]] = [next[i + d], next[i]]; setIds(next); setMoved(next[i + d]); };
  const changed = ids.some((id, i) => id !== slots[i]?.application_id);
  return <Modal label="순서 변경" onClose={() => { if (!busy) onClose(); }}><SheetHead title="순서 변경" onClose={onClose} />
    <p className="t-caption text-muted">화살표로 순서를 옮겨요.</p>
    {error && <p role="alert" className="error-note">{error}</p>}
    <ol className="susi-reorder">{ids.map((id, i) => <li key={id} className={moved === id ? 'is-moved' : undefined}><span className="num">{i + 1}</span><strong>{name(id)}</strong>
      <button type="button" className="button-outline" aria-label={`${i + 1}순위 위로`} disabled={busy || i === 0} onClick={() => shift(i, -1)}>↑</button>
      <button type="button" className="button-outline" aria-label={`${i + 1}순위 아래로`} disabled={busy || i === ids.length - 1} onClick={() => shift(i, 1)}>↓</button>
      <Icon name="grip-vertical" /></li>)}</ol>
    <div className="susi-confirm-actions susi-confirm-actions--row susi-confirm-actions--grow"><ButtonOutline disabled={busy} onClick={onClose}>취소</ButtonOutline><ButtonPrimary disabled={busy} onClick={() => changed ? onApply(ids) : onClose()}>적용하기</ButtonPrimary></div></Modal>;
}

function SlotEditor({ slot, title, program, busy, error, onSave, onClear, onClose }: { slot: BoardSlot; title: string; program: string; busy: boolean; error: string; onSave: (s: BoardSlot) => void; onClear: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState(slot), [confirm, setConfirm] = useState<'clear' | 'leave' | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(slot);
  const close = () => { if (busy) return; if (dirty) setConfirm('leave'); else onClose(); };
  let body: ReactNode;
  if (confirm === 'clear') body = <Confirm title={`${title} 칸을 비울까요?`} body="순위·고사 일정·메모가 함께 지워져요. 원서·서류 체크리스트의 전형은 그대로예요." action="칸 비우기" error={error} busy={busy} onCancel={() => setConfirm(null)} onConfirm={onClear} />;
  else if (confirm === 'leave') body = <Confirm title="고친 내용을 저장하지 않고 닫을까요?" body="메모와 고사 일정이 고치기 전으로 돌아가요." action="저장하지 않고 닫기" cancel="계속 고치기" busy={busy} onCancel={() => setConfirm(null)} onConfirm={onClose} />;
  else body = <><SheetHead title={title} sub={program} onClose={close} />
    {error && <p role="alert" className="error-note">{error}</p>}
    <fieldset className="form-grid susi-editor" disabled={busy}><legend className="sr-only">카드 정보</legend>
      <label>고사<select value={draft.exam_kind} onChange={e => setDraft({ ...draft, exam_kind: e.target.value as BoardSlot['exam_kind'], exam_date: e.target.value === 'none' ? null : draft.exam_date })}>
        {Object.entries(examKinds).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      {draft.exam_kind !== 'none' && <label>고사일<input type="date" value={draft.exam_date ?? ''} onChange={e => setDraft({ ...draft, exam_date: e.target.value || null })} /></label>}
      <label>수능최저<select value={draft.csat} onChange={e => setDraft({ ...draft, csat: e.target.value as BoardSlot['csat'] })}>
        {Object.entries(csatStates).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label>메모<textarea maxLength={200} rows={4} value={draft.memo} onChange={e => setDraft({ ...draft, memo: e.target.value })} /></label>
      <p className="t-caption text-muted num">{draft.memo.length}/200</p>
    </fieldset>
    <div className="susi-confirm-actions susi-confirm-actions--row susi-editor__actions"><ButtonOutline disabled={busy} onClick={() => setConfirm('clear')}>이 칸 비우기</ButtonOutline><ButtonOutline disabled={busy} onClick={close}>취소</ButtonOutline><ButtonPrimary disabled={busy} onClick={() => onSave(draft)}>{busy ? '저장 중' : '저장'}</ButtonPrimary></div></>;
  return <Modal label={`${title} 칸 상세`} onClose={close}>{body}</Modal>;
}
