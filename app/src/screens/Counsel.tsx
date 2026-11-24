import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { UniversityLogo } from '../components/UniversityLogo';
import { MEMO_AREAS, nextDue, nextState, submissionRows, type CardRecord, type Memo, type MemoArea, type Student } from '../domain/classroom';
import { examsByRecent } from '../domain/minimum';
import { schoolAverage } from '../domain/scoreImport';
import { g5ToPct, pctToG9, verified } from '../engine/fiveToNine';
import type { ConversionConfig } from '../engine/fiveToNineTypes';
import fiveToNineConfig from '../data/conversion-config.json';
import { dataAsOf } from '../data/catalog';
import { useSampleMode } from '../data/sample';
import { SAMPLE_CLASS } from '../data/sample/teacher';
import { teacherDb, type ClassState } from '../store/teacherDb';
import { REPLY_MAX, makeReply } from '../domain/reply';
import { packExchange } from '../io/exchange';
import { downloadFile } from '../io/backup';
import { JudgeMark } from './CardCollect';
import { judgeStudent } from './MinimumBoard';
import { WarningBadge, signals } from './TeacherDashboard';
import '../styles/counsel.css';

const today = () => new Date().toLocaleDateString('sv-SE');
const short = (u: string) => u.replace(/대학교$/, '대');
const md = (d: string) => d.slice(5);
const cfg = fiveToNineConfig as ConversionConfig;
type ListFilter = 'all' | 'need';
type HistoryFilter = 'all' | '수시로' | 'waiting';
type Item = { kind: 'memo'; at: string; memo: Memo } | { kind: 'system'; at: string; card: CardRecord; v: number };

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

export function Counsel() {
  return <ClassGate slug="counsel" title="학생 상담">{c => <CounselBody {...c} />}</ClassGate>;
}

function CounselBody(c: ClassState & { info: NonNullable<ClassState['info']> }) {
  const { info, students, cards, memos, mocks, school } = c;
  const desktop = useDesktop(), sampleMode = useSampleMode();
  const [params, setParams] = useSearchParams();
  const [area, setArea] = useState<MemoArea>('진로'), [text, setText] = useState(''), [next, setNext] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [query, setQuery] = useState(''), [listFilter, setListFilter] = useState<ListFilter>('all'), [pending, setPending] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all'), [picking, setPicking] = useState(false), [showAll, setShowAll] = useState(false);

  const now = today();
  const mine = (n: string) => memos.filter(m => m.number === n);
  const waiting = (m: Memo) => { const s = nextState(m, now); return s === '대기' || s === '기한 지남'; };
  /** 다음 상담 = 대기 중인 "다음에 볼 것" 기한 가운데 오늘 이후 가장 이른 날 */
  const upcoming = (n: string) => mine(n).filter(m => nextState(m, now) === '대기').map(m => nextDue(m.next, Number(m.date.slice(0, 4)))).filter((d): d is string => !!d && d >= now).sort()[0] ?? null;
  const soonest = students.map(s => ({ s, due: upcoming(s.number) })).filter(x => x.due).sort((a, b) => a.due!.localeCompare(b.due!))[0];
  const current = students.find(s => s.number === params.get('n')) ?? soonest?.s ?? students[0];
  const myCards = cards.filter(x => x.number === current.number).sort((a, b) => b.created_at.localeCompare(a.created_at)), latest = myCards[0];
  useEffect(() => { if (latest && !latest.seen) teacherDb.cards.update(latest.id!, { seen: true }); }, [latest]);

  const rows = submissionRows(students, cards), rowOf = (n: string) => rows.find(r => r.student.number === n)!;
  const grade = (n: string) => school.find(g => g.number === n);
  const need = (n: string) => signals(rowOf(n), grade(n)).length > 0;
  const g9Of = (n: string) => { const g5 = schoolAverage(grade(n)); if (g5 === null || !verified(cfg, 'R-CONV-003')) return null; const pct = g5ToPct(g5, cfg); return { g5, pct, g9: pctToG9(pct, cfg) }; };
  const lastExam = (n: string) => examsByRecent(mocks.filter(m => m.number === n).map(m => m.exam))[0];
  const minOf = (n: string) => { const exam = lastExam(n); if (!exam) return null; const r = judgeStudent(n, exam, c); return r.target ? { ...r, exam } : null; };
  const line2 = (s: Student) => {
    const g = g9Of(s.number), m = minOf(s.number), due = upcoming(s.number), k = mine(s.number).length;
    const parts = [g && `약 ${g.g9.toFixed(1)}`, m && `최저 ${m.judged.verdict}`, due && `상담 ${md(due)}`].filter(Boolean);
    return parts.length ? parts.join(' · ') : k ? `상담 ${k}회` : '상담 기록 없음';
  };

  const choose = (n: string) => { setParams({ n }); setPending(null); setError(''); setMessage(''); setPicking(false); setShowAll(false); };
  const ask = (n: string) => { if (n === current.number) { setPicking(false); return; } if (text.trim()) { setPicking(false); setPending(n); } else choose(n); };
  const save = async () => {
    if (!text.trim()) { setError('메모 내용이 비어 있어요. 한 글자 이상 적고 저장해 주세요.'); return false; }
    await teacherDb.memos.add({ number: current.number, date: today(), area, text: text.trim().slice(0, 2000), next: next.trim().slice(0, 200), next_done: false, created_at: new Date().toISOString() });
    setText(''); setNext(''); setError(''); setMessage('상담 메모를 저장했어요'); return true;
  };

  const needCount = students.filter(s => need(s.number)).length;
  const list = students.filter(s => (!query.trim() || `${Number(s.number)}번 ${s.number} ${s.alias}`.includes(query.trim())) && (listFilter === 'all' || need(s.number)));
  const myMemos = mine(current.number).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const items: Item[] = [
    ...myMemos.map(m => ({ kind: 'memo' as const, at: m.created_at, memo: m })),
    ...myCards.map((x, i) => ({ kind: 'system' as const, at: x.received_at, card: x, v: myCards.length - i })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const shown = items.filter(t => historyFilter === 'all' || (historyFilter === '수시로' ? t.kind === 'system' || t.memo.area === '수시로' : t.kind === 'memo' && waiting(t.memo)));
  const visible = desktop || showAll ? shown : shown.slice(0, 3);
  const due = upcoming(current.number), name = `${info.name} ${Number(current.number)}번 ${current.alias}`;
  const lead = soonest ? `${Number(soonest.due!.slice(5, 7))}월 ${Number(soonest.due!.slice(8))}일 ${Number(soonest.s.number)}번 ${soonest.s.alias} 상담이 잡혀 있어요.` : '';
  // NEVER-1: 샘플 학급 카드의 판정은 샘플 모드일 때만 보여요(sample 표식 규칙으로 만든 판정).
  const isSampleClass = info.code === SAMPLE_CLASS.code && info.created_at === SAMPLE_CLASS.created_at;
  const judgment = (j?: string | null) => isSampleClass && !sampleMode ? null : j;

  const headSlot = desktop ? document.querySelector('.topbar__heading') : null;
  const g = g9Of(current.number), m = minOf(current.number), exam = lastExam(current.number);
  const mock = exam ? mocks.find(x => x.number === current.number && x.exam === exam) : undefined;
  const examName = exam?.replace(/^\d{4}년\s*/, '');
  const slots = latest?.card.slots ?? [];
  const counts = (['안정', '적정', '소신', '위험', '경계'] as const).map(v => [v, slots.filter(s => judgment(s.judgment) === v).length] as const).filter(([, n]) => n);
  const warnings = latest?.card.warnings ?? [];
  const meta = (mobile: boolean) => [`상담 ${myMemos.length}회`, due ? `다음${mobile ? '' : ' 상담'} ${md(due)}` : myMemos[0] ? `마지막 ${md(myMemos[0].date)}` : ''].filter(Boolean).join(' · ');

  const studentList = <>
    <label className="cs-search text-input"><Icon name="search" size={20} /><input type="search" aria-label="번호·별칭으로 찾기" placeholder="번호·별칭으로 찾기" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className="cs-chips" role="group" aria-label="학생 거르기">
      <button type="button" className="filter-chip" aria-pressed={listFilter === 'all'} onClick={() => setListFilter('all')}>전체 {students.length}</button>
      <button type="button" className="filter-chip" aria-pressed={listFilter === 'need'} onClick={() => setListFilter('need')}>상담 필요 {needCount}</button></div>
    <ul className="cs-students">{list.map(s => { const r = rowOf(s.number); return <li key={s.number}><button type="button" className={`cs-student${s.number === current.number ? ' is-selected' : ''}`} aria-current={s.number === current.number} onClick={() => ask(s.number)}>
      <span className="cs-student__line1"><span className="cs-student__who"><strong className="num">{Number(s.number)}번</strong> {s.alias}</span>
        <span className="cs-student__badges"><span className="data-status-badge">{r.status}</span>{r.warnings > 0 && <WarningBadge count={r.warnings} />}</span></span>
      <span className="cs-student__line2 num">{line2(s)}</span></button></li>; })}
      {!list.length && <li className="t-body-sm text-muted cs-students__empty">{listFilter === 'need' ? '상담이 필요한 학생이 없어요' : '찾는 학생이 없어요'}</li>}</ul>
  </>;

  const statTile = <div className="stat-tile cs-stat"><span className="t-caption text-muted">환산 9등급 (추정)</span>
    <strong className="num key-number">{g ? `약 ${g.g9.toFixed(1)}` : '–'}</strong>
    <span className="t-body-sm num">{g ? `A-1 평균 기반 · 내신 5등급 ${g.g5.toFixed(1)}` : '내신 학기 평균을 불러오면 보여요'}</span></div>;
  const trace = <details className="trace-accordion cs-trace"><summary>어떻게 계산했나요?<Icon name="chevron-down" size={20} /></summary>
    {g ? <ol className="t-body-sm num"><li>내신 5등급 평균 {g.g5.toFixed(2)} (불러온 학기 평균의 단순 평균)</li><li>5등급 누적비 약 {g.pct.toFixed(1)}% (R-CONV-003)</li><li>9등급 누적비 구간에서 옮기면 약 {g.g9.toFixed(1)} (A-1)</li></ol>
      : <p className="t-body-sm">성적 불러오기에서 내신 학기 평균을 올리면 계산 단계가 여기에 보여요.</p>}</details>;
  const minLine = m && <p className="t-body-sm">수능 최저 {m.judged.verdict} · 1순위 {short(m.target!.university)} 기준</p>;
  const countLine = counts.map(([v, n]) => `${v} ${n}`).join(' · ');

  const memoForm = <>
    <SegmentedControl label="영역" value={area} onChange={setArea} options={MEMO_AREAS.map(a => ({ value: a, label: a }))} />
    <label className="sr-only" htmlFor="memo-text">상담 메모</label>
    <textarea id="memo-text" className="cs-memo" rows={4} maxLength={2000} value={text} aria-invalid={!!error} placeholder="상담하면서 바로 적어요. 학생이 한 말, 같이 정한 것을 남겨요."
      onChange={e => { setText(e.target.value); setError(''); }} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }} />
    {error && <p role="alert" className="error-note">{error}</p>}
    <input className="cs-next" aria-label="다음에 볼 것" maxLength={200} value={next} onChange={e => setNext(e.target.value)} placeholder="다음에 볼 것 (선택) · 예: 11-28까지 탐구 오답 같이 보기" />
    <div className="cs-save"><span className="t-caption text-muted">Ctrl + Enter로 저장</span><ButtonPrimary onClick={save}>메모 저장</ButtonPrimary></div>
    {message && <p role="status" className="toast">{message}</p>}
  </>;

  const timeline = items.length === 0 ? <div className="empty-state"><h3 className="t-heading-4">아직 남긴 상담 메모가 없어요</h3><p>위 칸에 첫 상담 내용을 적고 저장하면 여기에 날짜순으로 쌓여요.</p></div>
    : <ol className="counsel-timeline">{visible.map(t => t.kind === 'system'
      ? <li key={`c${t.card.id ?? t.at}`} className="counsel-timeline__system"><p className="t-caption text-muted num">{t.at.slice(0, 10)}</p><p className="t-body-sm text-muted">수시로 카드 v{t.v} 받음 · {t.card.card.scenario} {t.card.card.slots.length}장</p></li>
      : <TimelineMemo key={t.memo.id} memo={t.memo} />)}
      {!visible.length && <li className="t-body-sm text-muted">이 조건에 맞는 기록이 없어요</li>}</ol>;

  const lockReply = latest && <div className="cs-actions"><LockToggle student={current} status={rowOf(current.number).status} /><ReplyBox code={info.code} student={current} card={latest} /></div>;

  const summary: ReactNode = desktop ? <aside className="cs-panel cs-summary" aria-label="학생 요약">
    <div className="cs-summary__head"><h3 className="t-heading-4">학생 요약</h3><p className="t-caption text-muted">읽기 전용{examName ? ` · ${examName}까지 반영` : ''}</p></div>
    {statTile}
    {mock && <div className="cs-mock"><p className="t-caption text-muted">{examName} (9등급)</p><p className="num cs-mock__value">국 {mock.grades.국어 ?? '–'} · 수 {mock.grades.수학 ?? '–'} · 영 {mock.grades.영어 ?? '–'} · 탐 {mock.grades.탐구1 ?? '–'} · {mock.grades.탐구2 ?? '–'}</p></div>}
    {trace}
    <div className="cs-susi-head"><h4 className="t-heading-4">수시로 {slots.length || 6}장</h4>{latest && <span className="t-caption text-muted num">카드 v{myCards.length} · {md(latest.received_at.slice(0, 10))} 받음</span>}</div>
    {!latest ? <p className="t-body-sm text-muted">아직 받은 수시로 카드가 없어요. 카드를 받으면 칸과 경고가 여기에 보여요.</p> : <>
      {slots.length > 0 && <table className="data-table cs-table"><thead><tr><th>대학 · 학과</th><th>판정</th></tr></thead>
        <tbody>{slots.map((s, i) => <tr key={i}><td><span className="cs-univ"><UniversityLogo university={s.university} /><span>{short(s.university)} {s.department || s.program}</span></span></td>
          <td><JudgeMark value={judgment(s.judgment)} /></td></tr>)}</tbody></table>}
      <p className="t-caption text-muted">{[countLine, warnings.length ? `조합 경고 ${warnings.length}개` : '조합 경고 없음'].filter(Boolean).join(' · ')}</p>
      {warnings.map((w, i) => <div key={i} className="warning-callout"><strong>▲ {w.title}</strong><p className="t-body-sm">{w.message}</p></div>)}</>}
    {minLine}
    {lockReply}
  </aside> : <section className="cs-card cs-summary" aria-label="학생 요약">
    <div className="cs-head"><div><h3 className="t-heading-4">{name}</h3><p className="t-caption text-muted num">{meta(true)}</p></div>
      <button type="button" className="button-pill-soft" onClick={() => setPicking(true)}>학생 바꾸기</button></div>
    {statTile}
    {latest && <p className="t-body-sm num">수시로 {slots.length}장{countLine ? ` · ${countLine}` : ''}</p>}
    {minLine}
    {trace}
  </section>;

  const write = desktop ? memoForm : <section className="cs-card cs-write" aria-label="메모 쓰기"><div className="cs-card__head"><h3 className="t-heading-4">상담 메모</h3><span className="t-caption text-muted num">오늘 {md(now)}</span></div>{memoForm}</section>;
  const history = desktop ? <>
    <div className="cs-history-head"><h3 className="t-heading-4">지난 메모</h3>
      <div className="cs-chips" role="group" aria-label="메모 거르기">
        <button type="button" className="filter-chip" aria-pressed={historyFilter === 'all'} onClick={() => setHistoryFilter('all')}>전체 {items.length}</button>
        <button type="button" className="filter-chip" aria-pressed={historyFilter === '수시로'} onClick={() => setHistoryFilter('수시로')}>수시로 {items.filter(t => t.kind === 'system' || t.memo.area === '수시로').length}</button>
        <button type="button" className="filter-chip" aria-pressed={historyFilter === 'waiting'} onClick={() => setHistoryFilter('waiting')}>대기 {myMemos.filter(waiting).length}</button></div></div>
    {timeline}</> : <section className="cs-card cs-history" aria-label="지난 메모"><div className="cs-card__head"><h3 className="t-heading-4">지난 메모</h3><span className="t-caption text-muted num">{items.length}건</span></div>
      {timeline}
      {!showAll && shown.length > visible.length && <button type="button" className="button-pill-soft cs-more" onClick={() => setShowAll(true)}>전체 {shown.length}건 보기</button>}</section>;

  return <div className="cs">
    {headSlot && lead && createPortal(<p className="t-body-lg cs-lead">{lead} 메모는 상담하면서 바로 남겨요.</p>, headSlot)}
    {desktop ? <div className="cs-layout">
      <aside className="cs-panel cs-list" aria-label="학생 목록"><h3 className="t-heading-4">우리 반 {students.length}명</h3>{studentList}</aside>
      <section className="cs-panel cs-main" aria-label="상담 기록">
        <div className="cs-head"><div><h3 className="t-heading-2">{name}</h3><p className="t-caption text-muted num">{meta(false)}</p></div>
          <Link className="button-outline" to={`/teacher/student-record?n=${current.number}`}>학생 기록 열기</Link></div>
        {write}{history}
      </section>
      {summary}
    </div> : <div className="cs-stack">
      {lead && <p className="cs-note t-body-sm">ⓘ {lead}</p>}
      {summary}{write}{history}
      {lockReply && <section className="cs-card" aria-label="확정 잠금 · 답장">{lockReply}</section>}
    </div>}
    <p className="disclaimer-note">ⓘ 환산 9등급은 추정 범위예요 · 판정과 최저 충족 현황은 대학 공식 자료가 최종 기준이에요 · 판정과 경고는 학생이 카드를 보낸 때 기준이에요 · 데이터 기준일 {dataAsOf}</p>

    {picking && <Modal label="학생 바꾸기" onClose={() => setPicking(false)}><div className="cs-picker"><div className="section-row"><h3 className="t-heading-3">학생 바꾸기</h3><button type="button" className="text-button" onClick={() => setPicking(false)}>닫기</button></div>{studentList}</div></Modal>}
    {pending && <Modal label="저장하지 않은 메모가 있어요" onClose={() => setPending(null)}><h3 className="t-heading-3">저장하지 않은 메모가 있어요</h3>
      <p>{Number(current.number)}번 {current.alias}에게 쓰던 메모를 저장할까요? 저장하지 않으면 지워져요.</p>
      <div className="toolbar"><button className="text-button" onClick={() => setPending(null)}>계속 쓰기</button>
        <ButtonOutline onClick={() => { setText(''); setNext(''); choose(pending); }}>저장하지 않고 바꾸기</ButtonOutline>
        <ButtonPrimary onClick={async () => { if (await save()) choose(pending); }}>저장하고 바꾸기</ButtonPrimary></div></Modal>}
  </div>;
}

function TimelineMemo({ memo }: { memo: Memo }) {
  const state = nextState(memo, today());
  return <li className="counsel-timeline__memo"><p className="t-caption text-muted num">{memo.date} · {memo.area}</p><p className="t-body">{memo.text}</p>
    {state && <p className="t-body-sm">다음에 볼 것 · {memo.next} · <strong>{state}</strong> {state !== '완료' && <button className="text-button" onClick={() => teacherDb.memos.update(memo.id!, { next_done: true })}>완료로 표시</button>}</p>}</li>;
}

function LockToggle({ student, status }: { student: Student; status: string }) {
  const locked = !!student.locked;
  return <div className="toolbar"><span className="t-body-sm">{locked ? '확정 잠금이에요. 새 카드를 받지 않아요.' : `지금 상태: ${status}`}</span>
    <ButtonOutline onClick={() => teacherDb.students.update(student.number, { locked: !locked })}>{locked ? '확정 잠금 풀기' : '최종 확정으로 잠그기'}</ButtonOutline></div>;
}

/** 교사 코멘트 → 학생에게 돌려줄 답장 파일(.jnavi). 보낸 내용은 상담 메모(수시로)에도 남겨요. */
function ReplyBox({ code, student, card }: { code: string; student: Student; card: CardRecord }) {
  const [text, setText] = useState(''), [error, setError] = useState(''), [done, setDone] = useState('');
  const send = async () => {
    try {
      const reply = makeReply(text, { scenario: card.card.scenario, created_at: card.created_at, slots: card.card.slots });
      downloadFile(await packExchange('teacher_reply', { class_code: code, number: student.number, alias: student.alias }, reply), `${student.number}_${student.alias}_선생님답장.jnavi`, 'application/json');
      await teacherDb.memos.add({ number: student.number, date: today(), area: '수시로', text: `답장 보냄 · ${reply.comment}`, next: '', next_done: false, created_at: new Date().toISOString() });
      setText(''); setError(''); setDone('답장 파일을 저장했어요. 학생에게 전달해 주세요.');
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
  };
  return <div className="reply-box"><label>{card.card.scenario} 카드에 답장<textarea rows={3} maxLength={REPLY_MAX} value={text} onChange={e => { setText(e.target.value); setError(''); setDone(''); }} placeholder="예: 3번 칸은 최저가 근접이라 11월까지 수학을 같이 보자." /></label>
    {error && <p role="alert" className="error-note">{error}</p>}{done && <p role="status" className="t-caption">{done}</p>}
    <ButtonOutline onClick={send}>답장 파일 저장</ButtonOutline></div>;
}
