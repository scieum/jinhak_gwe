import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStudent } from '../store/studentDb';
import { applicationEvents, calendarIcs, eventStatus, monthDays, shiftMonth, type ApplicationEvent } from '../domain/calendar';
import { safeSourceUrl, seoulDate } from '../domain/planner';
import { downloadFile } from '../io/backup';
import { ButtonOutline } from '../components/Buttons';
import { SegmentedControl } from '../components/SegmentedControl';
import { Modal } from '../components/Modal';
import '../styles/application-calendar.css';

export function ApplicationCalendar() {
  const state = useStudent(), [query, setQuery] = useSearchParams();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  const today = seoulDate(now);
  const [month, setMonth] = useState(() => seoulDate().slice(0, 7));
  const [day, setDay] = useState<string | null>(null), [view, setView] = useState<'month' | 'list'>('month');
  const [kind, setKind] = useState('all'), [completed, setCompleted] = useState(false), [detailId, setDetailId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const applications = state?.data?.planning?.applications ?? [];
  const selected = query.get('plan') ?? '';
  const events = applicationEvents(applications, state?.data?.boards ?? []).filter(e => (!selected || e.application.id === selected) && (kind === 'all' || e.kind === kind) && (completed || !e.done));
  const inMonth = events.filter(e => e.date?.startsWith(month));
  const displayed = day ? inMonth.filter(e => e.date === day) : inMonth;
  const undated = events.filter(e => !e.date);
  const detail = events.find(e => e.id === detailId);
  const upcoming = events.filter(e => e.date && !['완료', '기한 지남'].includes(eventStatus(e, today, now)));
  const navigate = (delta: number) => { setMonth(shiftMonth(month, delta)); setDay(null); };
  const eventRows = (items: ApplicationEvent[]) => <ul className="calendar-events">{items.map(e => <li key={e.id}>
    <button type="button" onClick={() => setDetailId(e.id)} aria-label={`${e.application.university} ${e.application.department} ${e.title} 일정 상세`}>
      <span><strong>{e.application.university} · {e.application.department || '학과 미지정'}</strong><span>{e.application.year}학년도 · {e.application.program} · {e.title}</span>{e.boards.length > 0 && <span>{e.boards.join(' · ')}에 기록</span>}</span>
      <span className="calendar-event-date"><strong>{e.date ?? '날짜 미정'}{e.time && ` ${e.time}`}</strong><span>{eventStatus(e, today, now)}</span></span>
    </button>
  </li>)}</ul>;
  return <section className="student-screen application-calendar" data-slug="calendar">
    <div className="screen-heading"><div><h2 className="t-heading-1">입시 일정</h2><p className="text-muted">원서·서류 마감과 고사 날짜를 한곳에서 확인해요.</p></div><Link className="button-outline" to="/application-checklist">일정 입력·수정</Link></div>
    {!state ? <p role="status">일정을 불러오고 있어요.</p> : !state.data ? <p role="alert">{state.error}</p> : <>
      <div className="calendar-filters">
        <label>지원 전형<select value={selected} onChange={e => { setQuery(e.target.value ? { plan: e.target.value } : {}); setDetailId(null); }}>{selected && !applications.some(a => a.id === selected) && <option value={selected}>삭제되었거나 없는 전형</option>}<option value="">전체 전형</option>{applications.map(a => <option key={a.id} value={a.id}>{a.year} · {a.university} · {a.program} · {a.department || '학과 미지정'}</option>)}</select></label>
        <label>일정 종류<select value={kind} onChange={e => setKind(e.target.value)}><option value="all">전체</option><option value="checklist">원서·서류</option><option value="exam">면접·논술·실기</option></select></label>
        <label className="calendar-completed"><input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)} />완료 일정 포함</label>
      </div>
      {selected && !applications.some(a => a.id === selected) && <p role="alert">이 전형을 찾지 못했어요. 전체 전형을 선택하거나 지원 준비 기록을 확인해 주세요.</p>}
      <div className="calendar-toolbar"><div className="toolbar"><ButtonOutline aria-label="이전 달" onClick={() => navigate(-1)}>‹</ButtonOutline><h3 className="t-heading-2" aria-live="polite">{month.slice(0, 4)}년 {Number(month.slice(5))}월</h3><ButtonOutline aria-label="다음 달" onClick={() => navigate(1)}>›</ButtonOutline><ButtonOutline onClick={() => { setMonth(today.slice(0, 7)); setDay(today); }}>오늘</ButtonOutline></div><SegmentedControl label="일정 보기" value={view} onChange={setView} options={[{ value: 'month', label: '월간' }, { value: 'list', label: '목록' }]} /></div>
      {view === 'month' && <table className="calendar-month"><caption className="sr-only">{month} 일정 달력 · 날짜를 누르면 해당 날짜의 일정을 표시해요</caption><thead><tr>{[...'일월화수목금토'].map(d => <th key={d} scope="col">{d}</th>)}</tr></thead><tbody>{monthDays(month).map((week, i) => <tr key={i}>{week.map((date, j) => {
        const count = date ? inMonth.filter(e => e.date === date).length : 0;
        return <td key={j}>{date && <button type="button" aria-label={`${date}${count ? ` 일정 ${count}개` : ' 일정 없음'}`} aria-current={date === today ? 'date' : undefined} aria-pressed={date === day} onClick={() => setDay(date === day ? null : date)}><span>{Number(date.slice(8))}</span>{count > 0 && <span className="calendar-day-count">{count}건</span>}</button>}</td>;
      })}</tr>)}</tbody></table>}
      <div className="section-row"><h3 className="t-heading-3">{day ? `${day} 일정` : '이번 달 일정'} · {displayed.length}개</h3>{day && <button className="text-button" onClick={() => setDay(null)}>이번 달 전체 보기</button>}</div>
      {displayed.length ? eventRows(displayed) : <p className="calendar-empty">등록한 일정이 없어요. 체크리스트에서 마감일을, 수시로에서 고사 날짜를 입력해 주세요.</p>}
      <div className="calendar-upcoming"><div><strong>다가오는 일정</strong><p className="text-muted">{upcoming[0] ? `${upcoming[0].application.university} · ${upcoming[0].title} · ${upcoming[0].date}${upcoming[0].time ? ` ${upcoming[0].time}` : ''}` : '날짜가 확인된 미완료 일정이 없어요.'}</p></div><strong>{upcoming[0] ? eventStatus(upcoming[0], today, now) : '날짜 미정'}</strong></div>
      {undated.length > 0 && <details><summary>날짜 미정 {undated.length}개 · 입력한 날짜가 없어 달력에 표시하지 않아요</summary>{eventRows(undated)}</details>}
      <div className="toolbar"><span className="prep-status">내가 입력한 일정 · 한국 시간</span><ButtonOutline disabled={!inMonth.length} onClick={() => { try { downloadFile(calendarIcs(inMonth, now), `jinhak-calendar-${month}.ics`, 'text/calendar;charset=utf-8'); setError(''); } catch { setError('일정을 내보내지 못했어요. 브라우저 다운로드 권한을 확인해 주세요.'); } }}>이번 달 {inMonth.length}개 .ics 내보내기</ButtonOutline></div>
      {error && <p role="alert">{error}</p>}
      <p className="t-caption text-muted">날짜는 내가 저장한 기록이에요. 대학 공식 모집요강에서 최종 확인해 주세요. 날짜 미정 항목은 내보내지 않으며 자동 알림은 전송하지 않아요. 수정한 일정은 다시 내보내 주세요.</p>
      {!applications.length && <Link className="button-outline" to="/application-checklist">지원할 전형부터 등록하기</Link>}
    </>}
    {detail && <Modal label="입시 일정 상세" onClose={() => setDetailId(null)}><div className="section-row"><h3 className="t-heading-3">{detail.title}</h3><ButtonOutline onClick={() => setDetailId(null)}>닫기</ButtonOutline></div><strong>{detail.application.university} · {detail.application.department || '학과 미지정'}</strong><p>{detail.application.year}학년도 · {detail.application.program}</p><p>{detail.date ?? '날짜 미정'} {detail.time ?? ''} · {eventStatus(detail, today, now)}</p>{detail.boards.length > 0 && <p>{detail.boards.join(' · ')}에 기록 · 안마다 고사 날짜가 다르면 각각 표시돼요.</p>}<p className="text-muted">내가 입력한 일정 · 한국 시간 기준</p><p>{detail.note}</p>{detail.source && safeSourceUrl(detail.source) && <a href={detail.source} target="_blank" rel="noreferrer">등록한 원문 확인 ↗</a>}<Link className="button-outline" to={detail.kind === 'exam' ? '/susiro' : `/application-checklist?plan=${encodeURIComponent(detail.application.id)}`}>일정 수정하러 가기</Link></Modal>}
  </section>;
}
