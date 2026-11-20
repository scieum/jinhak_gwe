import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { MEMO_AREAS, nextState, studentLabel, submissionRows, type CardRecord, type Memo, type MemoArea, type Student } from '../domain/classroom';
import { teacherDb, type ClassState } from '../store/teacherDb';
import { REPLY_MAX, makeReply } from '../domain/reply';
import { packExchange } from '../io/exchange';
import { downloadFile } from '../io/backup';
import { JudgeMark } from './CardCollect';
import { WarningBadge } from './TeacherDashboard';

const today = () => new Date().toLocaleDateString('sv-SE');
type ListFilter = 'all' | 'none' | 'waiting';

export function Counsel() {
  return <ClassGate slug="counsel" title="학생 상담">{c => <CounselBody {...c} />}</ClassGate>;
}

function CounselBody({ info, students, cards, memos }: ClassState & { info: NonNullable<ClassState['info']> }) {
  const [params, setParams] = useSearchParams();
  const current = students.find(s => s.number === params.get('n')) ?? students[0];
  const [area, setArea] = useState<MemoArea>('진로'), [text, setText] = useState(''), [next, setNext] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [query, setQuery] = useState(''), [listFilter, setListFilter] = useState<ListFilter>('all'), [pending, setPending] = useState<string | null>(null), [timelineArea, setTimelineArea] = useState<MemoArea | 'all'>('all');
  const mine = (n: string) => memos.filter(m => m.number === n), waiting = (n: string) => mine(n).some(m => nextState(m, today()) === '대기' || nextState(m, today()) === '기한 지남');
  const myCards = cards.filter(c => c.number === current.number).sort((a, b) => b.created_at.localeCompare(a.created_at)), latest = myCards[0];
  useEffect(() => { if (latest && !latest.seen) teacherDb.cards.update(latest.id!, { seen: true }); }, [latest]);

  const choose = (n: string) => { setParams({ n }); setPending(null); setError(''); setMessage(''); };
  const ask = (n: string) => { if (n === current.number) return; if (text.trim()) setPending(n); else choose(n); };
  const save = async () => {
    if (!text.trim()) { setError('메모 내용이 비어 있어요. 한 글자 이상 적고 저장해 주세요.'); return false; }
    await teacherDb.memos.add({ number: current.number, date: today(), area, text: text.trim().slice(0, 2000), next: next.trim().slice(0, 200), next_done: false, created_at: new Date().toISOString() });
    setText(''); setNext(''); setError(''); setMessage('상담 메모를 저장했어요'); return true;
  };
  const list = students.filter(s => (!query.trim() || studentLabel(s).includes(query.trim())) && (listFilter === 'all' || (listFilter === 'none' ? !mine(s.number).length : waiting(s.number))));
  const myMemos = mine(current.number).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const timeline: ({ kind: 'memo'; at: string; memo: Memo } | { kind: 'system'; at: string; card: CardRecord; v: number })[] = [
    ...myMemos.filter(m => timelineArea === 'all' || m.area === timelineArea).map(m => ({ kind: 'memo' as const, at: m.created_at, memo: m })),
    ...(timelineArea === 'all' || timelineArea === '수시로' ? myCards.map((c, i) => ({ kind: 'system' as const, at: c.received_at, card: c, v: myCards.length - i })) : []),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const row = submissionRows([current], cards)[0];

  return <div className="counsel-layout">
    <aside className="counsel-list" aria-label="학생 목록"><h3 className="t-heading-4">우리 반 {students.length}명</h3>
      <input type="search" aria-label="번호·별칭으로 찾기" placeholder="번호·별칭으로 찾기" value={query} onChange={e => setQuery(e.target.value)} />
      <SegmentedControl label="학생 거르기" value={listFilter} onChange={setListFilter} options={[{ value: 'all', label: `전체 ${students.length}` }, { value: 'none', label: `상담 없음 ${students.filter(s => !mine(s.number).length).length}` }, { value: 'waiting', label: `대기 있음 ${students.filter(s => waiting(s.number)).length}` }]} />
      <ul>{list.map(s => <li key={s.number}><button className={`student-row${s.number === current.number ? ' is-selected' : ''}`} aria-current={s.number === current.number} onClick={() => ask(s.number)}>
        <span className="num">{studentLabel(s)}</span><WarningBadge count={submissionRows([s], cards)[0].warnings} /></button></li>)}</ul></aside>

    <section className="counsel-main" aria-label="상담 기록">
      <div className="section-row"><div><h3 className="t-heading-2">{info.name} {Number(current.number)}번 {current.alias}</h3>
        <p className="t-caption text-muted">상담 {myMemos.length}회{myMemos[0] ? ` · 마지막 ${myMemos[0].date}` : ''}</p></div>
        <Link className="button-outline" to={`/teacher/student-record?n=${current.number}`}>학생 기록 열기</Link></div>
      <div className="section-row"><SegmentedControl label="영역" value={area} onChange={setArea} options={MEMO_AREAS.map(a => ({ value: a, label: a }))} /><span className="t-caption text-muted num">오늘 {today()}</span></div>
      <label className="sr-only" htmlFor="memo-text">상담 메모</label>
      <textarea id="memo-text" rows={4} maxLength={2000} value={text} aria-invalid={!!error} placeholder="상담하면서 바로 적어요. 학생이 한 말, 같이 정한 것을 남겨요."
        onChange={e => { setText(e.target.value); setError(''); }} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }} />
      {error && <p role="alert" className="error-note">{error}</p>}
      <input aria-label="다음에 볼 것" maxLength={200} value={next} onChange={e => setNext(e.target.value)} placeholder="다음에 볼 것 (선택) · 예: 11-25까지 수학 오답 같이 보기" />
      <div className="toolbar"><span className="t-caption text-muted">Ctrl + Enter로 저장</span><ButtonPrimary onClick={save}>메모 저장</ButtonPrimary></div>
      {message && <p role="status" className="toast">{message}</p>}
      {timeline.length === 0 ? <div className="empty-state"><h3 className="t-heading-4">아직 남긴 상담 메모가 없어요</h3><p>위 칸에 첫 상담 내용을 적고 저장하면 여기에 날짜순으로 쌓여요.</p></div> : <>
        <SegmentedControl label="메모 거르기" value={timelineArea} onChange={setTimelineArea} options={[{ value: 'all', label: `전체 ${myMemos.length}` }, ...MEMO_AREAS.map(a => ({ value: a, label: `${a} ${myMemos.filter(m => m.area === a).length}` }))]} />
        <ol className="counsel-timeline">{timeline.map(t => t.kind === 'system'
          ? <li key={`c${t.card.id}`} className="counsel-timeline__system t-caption text-muted"><span className="num">{t.at.slice(0, 10)}</span> 수시로 카드 v{t.v} 받음 · {t.card.card.scenario} {t.card.card.slots.length}장</li>
          : <TimelineMemo key={t.memo.id} memo={t.memo} />)}</ol></>}
    </section>

    <aside className="counsel-summary" aria-label="학생 요약"><h3 className="t-heading-4">학생 요약</h3><p className="t-caption text-muted">읽기 전용</p>
      <h4 className="t-heading-4">수시로 6장</h4>
      {!latest ? <p className="t-body-sm text-muted">아직 받은 수시로 카드가 없어요. 카드를 받으면 칸과 경고가 여기에 보여요.</p> : <>
        <p className="t-caption text-muted">카드 v{myCards.length} · {latest.received_at.slice(0, 10)} 받음 · {latest.card.scenario}</p>
        <table className="data-table"><thead><tr><th>칸</th><th>대학 · 전형</th><th>판정</th></tr></thead>
          <tbody>{latest.card.slots.map((s, i) => <tr key={i}><td className="num">{i + 1}</td><td>{s.university}<br /><span className="t-caption text-muted">{[s.program, s.department].filter(Boolean).join(' · ')}</span></td>
            <td>{JudgeMark({ value: s.judgment }) ?? <span className="t-caption text-muted">판정 준비 중</span>}</td></tr>)}</tbody></table>
        {latest.card.warnings.map((w, i) => <div key={i} className="warning-callout"><strong>▲ {w.title}</strong><p className="t-body-sm">{w.message}</p></div>)}
        <LockToggle student={current} status={row.status} />
        <ReplyBox code={info.code} student={current} card={latest} /></>}
      <p className="disclaimer-note">ⓘ 판정과 경고는 학생이 카드를 보낸 때 기준이에요 · 대학 공식 자료가 최종 기준이에요</p></aside>

    {pending && <Modal label="저장하지 않은 메모가 있어요" onClose={() => setPending(null)}><h3 className="t-heading-3">저장하지 않은 메모가 있어요</h3>
      <p>{Number(current.number)}번 {current.alias}에게 쓰던 메모를 저장할까요? 저장하지 않으면 지워져요.</p>
      <div className="toolbar"><button className="text-button" onClick={() => setPending(null)}>계속 쓰기</button>
        <ButtonOutline onClick={() => { setText(''); setNext(''); choose(pending); }}>저장하지 않고 바꾸기</ButtonOutline>
        <ButtonPrimary onClick={async () => { if (await save()) choose(pending); }}>저장하고 바꾸기</ButtonPrimary></div></Modal>}
  </div>;
}

function TimelineMemo({ memo }: { memo: Memo }) {
  const state = nextState(memo, today());
  return <li className="counsel-timeline__memo"><p className="t-caption"><span className="num">{memo.date}</span> · <strong>{memo.area}</strong></p><p>{memo.text}</p>
    {state && <p className="t-body-sm">다음에 볼 것 · {memo.next} · <strong>{state}</strong> {state !== '완료' && <button className="text-button" onClick={() => teacherDb.memos.update(memo.id!, { next_done: true })}>완료로 표시</button>}</p>}
    <p className="t-caption text-muted num">{memo.created_at.slice(11, 16)}</p></li>;
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
