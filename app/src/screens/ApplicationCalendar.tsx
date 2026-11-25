import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useStudent } from '../store/studentDb';
import { applicationEvents, calendarIcs, eventStatus, monthDays, shiftMonth, type ApplicationEvent } from '../domain/calendar';
import { longDate, shortDate } from '../domain/classCalendar';
import { safeSourceUrl, seoulDate } from '../domain/planner';
import { downloadFile } from '../io/backup';
import { useSampleMode } from '../data/sample/mode';
import { ButtonOutline } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { Modal } from '../components/Modal';
import { usePreparationDesktop } from '../components/PreparationOverview';
import '../styles/class-calendar.css'; // 일정 종류 표식 · 태그(event-mark · event-tag) 공용 규칙
import '../styles/application-calendar.css';

// v2 시안 calendar(Figma 627:168318 모바일 · 627:168449 PC). 종류는 기록 출처로만: 체크리스트 = 원서·서류(doc), 수시로 고사 = 면접·논술·실기(exam).
const KINDS = [['checklist', 'doc', '원서·서류'], ['exam', 'exam', '면접·논술·실기']] as const;
const KIND = { checklist: KINDS[0], exam: KINDS[1] };
const Mark = ({ kind }: { kind: 'doc' | 'exam' }) => <span className="event-mark" data-kind={kind} aria-hidden="true" />;
const Tag = ({ e }: { e: ApplicationEvent }) => <span className="event-tag" data-kind={KIND[e.kind][1]}><Mark kind={KIND[e.kind][1]} />{KIND[e.kind][2]}</span>;
const short = (u: string) => u.replace(/대학교$/, '대');

export function ApplicationCalendar() {
  const state = useStudent(), [query, setQuery] = useSearchParams(), desktop = usePreparationDesktop(), sample = useSampleMode();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  const [slots, setSlots] = useState<{ heading: Element; actions: Element } | null>(null);
  useEffect(() => { const heading = document.querySelector('.topbar__heading'), actions = document.getElementById('topbar-screen-actions'); if (heading && actions) setSlots({ heading, actions }); }, []);
  const today = seoulDate(now);
  const [month, setMonth] = useState(() => seoulDate().slice(0, 7));
  const [day, setDay] = useState<string | null>(null), [view, setView] = useState<'month' | 'list'>('month');
  const [kind, setKind] = useState('all'), [completed, setCompleted] = useState(false), [detailId, setDetailId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const applications = state?.data?.planning?.applications ?? [];
  const selected = query.get('plan') ?? '';
  const missing = !!selected && !applications.some(a => a.id === selected);
  const events = applicationEvents(applications, state?.data?.boards ?? []).filter(e => (!selected || e.application.id === selected) && (kind === 'all' || e.kind === kind) && (completed || !e.done));
  const inMonth = events.filter(e => e.date?.startsWith(month));
  const displayed = day ? inMonth.filter(e => e.date === day) : inMonth;
  const undated = events.filter(e => !e.date);
  const detail = events.find(e => e.id === detailId);
  const upcoming = events.find(e => e.date && !['완료', '기한 지남'].includes(eventStatus(e, today, now)));
  const navigate = (delta: number) => { setMonth(shiftMonth(month, delta)); setDay(null); };
  const plan = applications.find(a => a.id === selected);
  const when = (e: ApplicationEvent) => e.date ? `${shortDate(e.date)}${e.time ? ` ${e.time}` : ''}` : '날짜 미정';

  const upcomingText = upcoming ? `${short(upcoming.application.university)} ${upcoming.application.department} · ${upcoming.title} · ${when(upcoming)}` : '';
  const lead = '원서·서류 마감과 고사 날짜를 한곳에서 확인해요.';
  const views = <SegmentedControl label="일정 보기" value={view} onChange={setView} options={[{ value: 'month', label: '월간' }, { value: 'list', label: '목록' }]} />;
  const stat = <button type="button" className="ac-upcoming" disabled={!upcoming} aria-label={upcoming ? `다가오는 일정 ${eventStatus(upcoming, today, now)} · ${upcomingText} 상세` : undefined} onClick={() => upcoming && setDetailId(upcoming.id)}>
    <span className="stat-tile"><span className="ac-stat-label">다가오는 일정</span>
      <strong className={upcoming ? 'num' : 'num ac-stat-none'}>{upcoming ? eventStatus(upcoming, today, now) : '날짜 미정'}</strong>
      <span className="ac-stat-sub">{upcoming ? upcomingText : '날짜가 확인된 미완료 일정이 없어요.'}</span></span>
    {!desktop && upcoming && <Icon name="chevron-right" />}
  </button>;
  const chip = (label: string, on: boolean, click: () => void, mark?: 'doc' | 'exam', aria?: string) => <button key={label} type="button" className="filter-chip" aria-pressed={on} aria-label={aria} onClick={click}>{mark && <Mark kind={mark} />}{label}</button>;
  const chips = <div className="ac-chips">
    <label className="filter-chip ac-plan"><span aria-hidden="true">전형: {plan ? short(plan.university) : missing ? '없는 전형' : '전체'}</span>
      <select aria-label="지원 전형" value={selected} onChange={e => { setQuery(e.target.value ? { plan: e.target.value } : {}); setDetailId(null); }}>{missing && <option value={selected}>삭제되었거나 없는 전형</option>}<option value="">전체 전형</option>{applications.map(a => <option key={a.id} value={a.id}>{a.year} · {a.university} · {a.program} · {a.department || '학과 미지정'}</option>)}</select>
      <Icon name="chevron-down" size={16} /></label>
    <span className="ac-divider" />
    {chip('전체', kind === 'all', () => setKind('all'))}
    {KINDS.map(([value, token, label]) => chip(label, kind === value, () => setKind(value), token))}
    <span className="ac-divider" />
    {chip('완료 포함', completed, () => setCompleted(!completed), undefined, '완료 일정 포함')}
  </div>;
  const [year, monthNo] = [month.slice(0, 4), Number(month.slice(5))];
  const calendar = <div className="ac-card ac-calendar">
    <div className="ac-month-head">
      <ButtonOutline aria-label="이전 달" onClick={() => navigate(-1)}><Icon name="chevron-left" size={20} /></ButtonOutline>
      <label className="ac-month-title"><span className="num" aria-live="polite">{year}년 {monthNo}월</span><Icon name="chevron-down" size={20} />
        <select aria-label="달 고르기" value={month} onChange={e => { setMonth(e.target.value); setDay(null); }}>{Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`).map(m => <option key={m} value={m}>{year}년 {Number(m.slice(5))}월</option>)}</select></label>
      <ButtonOutline aria-label="다음 달" onClick={() => navigate(1)}><Icon name="chevron-right" size={20} /></ButtonOutline>
      <ButtonOutline className="ac-today" onClick={() => { setMonth(today.slice(0, 7)); setDay(today); }}>오늘</ButtonOutline>
    </div>
    {view === 'month' && <>
      <table className="ac-grid"><caption className="sr-only">{month} 일정 달력 · 날짜를 누르면 해당 날짜의 일정을 표시해요</caption>
        <thead><tr>{[...'일월화수목금토'].map(d => <th key={d} scope="col">{d}</th>)}</tr></thead>
        <tbody>{monthDays(month).map((week, i) => <tr key={i}>{week.map((date, j) => {
          const items = date ? inMonth.filter(e => e.date === date) : [], exams = items.filter(e => e.kind === 'exam').length;
          return <td key={j}>{date && <button type="button" aria-label={`${date}${items.length ? ` 일정 ${items.length}개` : ' 일정 없음'}${exams > 1 ? ' · 고사 일정이 겹쳐요' : ''}`} aria-current={date === today ? 'date' : undefined} aria-pressed={date === day} onClick={() => setDay(date === day ? null : date)}>
            <span className="ac-day num">{Number(date.slice(8))}</span>
            {items.length > 0 && <><span className="ac-count num">{items.length}건{exams > 1 && <Icon name="triangle-alert" size={12} className="ac-overlap" />}</span>
              <span className="ac-marks">{KINDS.map(([value, token]) => items.some(e => e.kind === value) ? <Mark key={token} kind={token} /> : <span key={token} className="event-mark-slot" />)}</span></>}
          </button>}</td>;
        })}</tr>)}</tbody></table>
      {inMonth.length > 0 && <div className="ac-legend">{KINDS.map(([, token, label]) => <span key={token}><Mark kind={token} />{label}</span>)}</div>}
    </>}
  </div>;
  const row = (e: ApplicationEvent) => { const status = eventStatus(e, today, now); return <li key={e.id}>
    <button type="button" onClick={() => setDetailId(e.id)} aria-label={`${e.application.university} ${e.application.department} ${e.title} 일정 상세`}>
      <span className="ac-who"><strong>{short(e.application.university)} · {e.application.department || '학과 미지정'}</strong><span className="ac-line"><Tag e={e} /><span>{e.application.year}학년도 · {e.application.program} · {e.title}</span></span>{e.boards.length > 0 && <small>{e.boards.join(' · ')}에 기록</small>}</span>
      <span className="ac-when num">{desktop && e.date ? <><span>{shortDate(e.date)}</span>{e.time && <span>{e.time}</span>}</> : <span>{when(e)}</span>}{e.date && <span className="ac-status" data-status={status}>{status}</span>}</span>
    </button></li>; };
  const title = `${day ? `${longDate(day)} 일정` : '이번 달 일정'} · ${displayed.length}개`;
  const listHead = <div className="ac-list-head"><h3>{title}</h3>{day && <button type="button" className="text-button" onClick={() => setDay(null)}>이번 달 전체 보기</button>}</div>;
  const list = displayed.length ? <ul className="ac-events">{displayed.map(row)}</ul> : <p className="ac-empty">등록한 일정이 없어요. 체크리스트에서 마감일을, 수시로에서 고사 날짜를 입력해 주세요.</p>;
  const undatedBox = undated.length > 0 && <details className="ac-undated"><summary><span><strong>날짜 미정 {undated.length}개</strong><small>입력한 날짜가 없어 달력에 표시하지 않아요</small></span><Icon name="chevron-down" size={20} /></summary><ul className="ac-events">{undated.map(row)}</ul></details>;
  const exporter = <div className="ac-export"><span className="ac-source">내가 입력한 일정 · 한국 시간</span>
    <ButtonOutline disabled={!inMonth.length} onClick={() => { try { downloadFile(calendarIcs(inMonth, now), `jinhak-calendar-${month}.ics`, 'text/calendar;charset=utf-8'); setError(''); } catch { setError('일정을 내보내지 못했어요. 브라우저 다운로드 권한을 확인해 주세요.'); } }}><Icon name="download" size={20} />이번 달 {inMonth.length}개 .ics 내보내기</ButtonOutline>
    {error && <p role="alert">{error}</p>}</div>;
  const note = <p className="disclaimer-note ac-note"><Icon name="info" size={16} /><span>날짜는 내가 저장한 기록이에요. 대학 공식 모집요강에서 최종 확인해 주세요. 날짜 미정 항목은 내보내지 않으며 자동 알림은 전송하지 않아요. 수정한 일정은 다시 내보내 주세요.{sample && ' · 샘플의 대학·숫자는 예시예요'}</span></p>;
  const editLink = <Link className="button-outline ac-edit" to="/application-checklist">일정 입력·수정</Link>;
  const missingAlert = missing && <p role="alert" className="ac-alert">이 전형을 찾지 못했어요. 전체 전형을 선택하거나 지원 준비 기록을 확인해 주세요.</p>;
  const noPlans = !applications.length && <Link className="button-outline" to="/application-checklist">지원할 전형부터 등록하기</Link>;

  return <section className="student-screen application-calendar" data-slug="calendar">
    {desktop ? slots && <>{createPortal(<p className="ac-header-lead">{lead}</p>, slots.heading)}{createPortal(editLink, slots.actions)}</>
      : <div className="ac-head">{views}<p className="ac-lead">{lead}</p><Link className="ac-link" to="/application-checklist">일정 입력·수정 ›</Link></div>}
    {!state ? <p role="status">일정을 불러오고 있어요.</p> : !state.data ? <p role="alert">{state.error}</p> : desktop ? <>
      <div className="ac-toolbar">{chips}{views}</div>
      {missingAlert}
      <div className="ac-body">
        <div className="ac-left">{calendar}{note}</div>
        <div className="ac-right">{stat}
          <div className="ac-card ac-list-card">{listHead}{list}</div>
          <div className="ac-card ac-export-card">{undatedBox}{undatedBox && <hr />}{exporter}</div>
          {noPlans}
        </div>
      </div>
    </> : <>
      {stat}{chips}{missingAlert}{calendar}
      <div className="ac-list-section">{listHead}<div className="ac-card">{list}</div></div>
      {undatedBox}{exporter}{note}{noPlans}
    </>}
    {detail && <Modal label="입시 일정 상세" onClose={() => setDetailId(null)}><div className="section-row"><h3 className="t-heading-3">{detail.title}</h3><ButtonOutline onClick={() => setDetailId(null)}>닫기</ButtonOutline></div><Tag e={detail} /><strong>{detail.application.university} · {detail.application.department || '학과 미지정'}</strong><p>{detail.application.year}학년도 · {detail.application.program}</p><p>{detail.date ?? '날짜 미정'} {detail.time ?? ''} · {eventStatus(detail, today, now)}</p>{detail.boards.length > 0 && <p>{detail.boards.join(' · ')}에 기록 · 안마다 고사 날짜가 다르면 각각 표시돼요.</p>}<p className="text-muted">내가 입력한 일정 · 한국 시간 기준</p><p>{detail.note}</p>{detail.source && safeSourceUrl(detail.source) && <a href={detail.source} target="_blank" rel="noreferrer">등록한 원문 확인 ↗</a>}<Link className="button-outline" to={detail.kind === 'exam' ? '/susiro' : `/application-checklist?plan=${encodeURIComponent(detail.application.id)}`}>일정 수정하러 가기</Link></Modal>}
  </section>;
}
