import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { monthDays, shiftMonth } from '../domain/calendar';
import {
  EVENT_KINDS, FINAL_VALUES, KIND_TOKEN, STAGE1_VALUES, activePeriods, applications, cellLabel, checkSchedule, dayCounts, doneKey, findOutcome, groupRows,
  latestSlots, longDate, missingResults, rowStatus, scheduleRows, shortDate, studentName, weekDays, withResult,
  type ClassSchedule, type EventKind, type RowGroup, type RowResult, type ScheduleRow,
} from '../domain/classCalendar';
import { seoulDate } from '../domain/planner';
import { admissionYear } from '../data/catalog';
import { useSampleMode } from '../data/sample/mode';
import { downloadFile, printTable } from '../io/backup';
import { hwpxOf } from '../io/hwpx';
import { xlsxOf } from '../io/grades';
import { teacherDb, type ClassState } from '../store/teacherDb';
import '../styles/application-calendar.css';
import '../styles/class-calendar.css';

type Ready = ClassState & { info: NonNullable<ClassState['info']> };
type View = 'month' | 'week' | 'list';
type Toast = { title: string; body?: string };
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DISCLAIMER = '학생이 보낸 카드와 직접 입력한 일정 · 결과예요 · 대학 공식 발표가 최종 기준이에요 · 학생은 번호·별칭으로만 보여요';

export function ClassCalendar() {
  return <ClassGate slug="class-calendar" title="우리 반 입시 일정">{c => <Screen {...c} />}</ClassGate>;
}

export const EventMark = ({ kind }: { kind: EventKind }) => <span className="event-mark" data-kind={KIND_TOKEN[kind]} aria-hidden="true" />;
export const EventTag = ({ kind }: { kind: EventKind }) => <span className="event-tag" data-kind={KIND_TOKEN[kind]}><EventMark kind={kind} />{kind}</span>;

function useWide() {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)') : null;
  const [wide, setWide] = useState(query?.matches ?? false);
  useEffect(() => { if (!query) return; const on = () => setWide(query.matches); query.addEventListener?.('change', on); return () => query.removeEventListener?.('change', on); }, [query]);
  return wide;
}

function Screen(c: Ready) {
  const { info, students, cards, schedules, scheduleDone, outcomes } = c;
  const today = seoulDate(), wide = useWide(), sample = useSampleMode();
  const [month, setMonth] = useState(today.slice(0, 7)), [day, setDay] = useState(today), [rawView, setView] = useState<View>('month');
  const [student, setStudent] = useState(''), [kind, setKind] = useState<EventKind | ''>(''), [remaining, setRemaining] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null), [live, setLive] = useState('');
  const [form, setForm] = useState<Partial<ClassSchedule> | null>(null), [saveMenu, setSaveMenu] = useState(false);
  // PC page-header 자리(lead · "대학 일정 입력")는 셸 머리에 넣어요(학생 입시 일정과 같은 방식)
  const [slots, setSlots] = useState<{ heading: Element; actions: Element } | null>(null);
  useEffect(() => { const heading = document.querySelector('.topbar__heading'), actions = document.getElementById('topbar-screen-actions'); if (heading && actions) setSlots({ heading, actions }); }, []);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3000); return () => window.clearTimeout(t); }, [toast]);
  const view: View = rawView === 'week' && !wide ? 'month' : rawView;
  const { rows: all, undated } = useMemo(() => scheduleRows(cards, schedules, scheduleDone, outcomes), [cards, schedules, scheduleDone, outcomes]);
  const filtered = !!(student || kind || remaining);
  const rows = all.filter(r => (!student || r.number === student) && (!kind || r.kind === kind) && (!remaining || !r.done));
  const monthRows = rows.filter(r => r.date.startsWith(month)), dayRows = rows.filter(r => r.date === day);
  const week = weekDays(day), weekRows = rows.filter(r => week.includes(r.date));
  const name = (n: string) => studentName(students, n);

  if (!latestSlots(cards).length) return <div className="empty-state class-calendar-empty"><Icon name="calendar-check" size={48} />
    <h3 className="t-heading-4">아직 받은 상담카드가 없어요</h3><p>카드 수합에서 학생 카드를 받으면 지원한 대학 · 전형으로 일정이 생겨요. 학생은 번호·별칭으로만 보여요.</p>
    <Link className="button-primary" to="/teacher/card-collect">카드 수합으로 가기</Link></div>;

  const pick = (date: string) => { setDay(date); setMonth(date.slice(0, 7)); };
  const goMonth = (m: string) => { setMonth(m); setDay(m === today.slice(0, 7) ? today : `${m}-01`); setLive(`${m.slice(0, 4)}년 ${Number(m.slice(5))}월`); };
  const moveWeek = (delta: number) => pick(new Date(Date.parse(`${day}T00:00:00Z`) + delta * 7 * 86400000).toISOString().slice(0, 10));
  const clearFilters = () => { setStudent(''); setKind(''); setRemaining(false); };

  const toggleDone = async (r: ScheduleRow, on: boolean) => {
    const key = doneKey(r.number, r.university, r.program, r.kind);
    if (on) await teacherDb.scheduleDone.put({ key, number: r.number, university: r.university, program: r.program, kind: r.kind });
    else await teacherDb.scheduleDone.delete(key);
    setLive(`${name(r.number)} ${r.university} ${r.label} ${on ? '완료로 표시했어요' : '완료 표시를 껐어요'}`);
  };
  const setResult = async (r: ScheduleRow, value: RowResult) => {
    try {
      const o = findOutcome(outcomes, r), next = withResult(o, r, value);
      await teacherDb.outcomes.put(next);
      setToast({ title: value === '미입력' ? `${name(r.number)} · 미입력으로 되돌렸어요` : `${name(r.number)} · ${value}로 저장했어요`, body: '결과 집계에 반영했어요' });
    } catch { setToast({ title: '결과를 저장하지 못했어요. 다시 골라 주세요.' }); }
  };
  const exportFile = async (fmt: 'xlsx' | 'hwpx' | 'pdf') => {
    const list = view === 'week' ? weekRows : monthRows, period = view === 'week' ? `${week[0]}_주간` : month;
    const headers = ['날짜', '시각', '종류', '일정', '대학', '전형', '학생', '학과', '완료 · 결과'];
    const rows = [...list].sort((a, b) => a.date.localeCompare(b.date) || EVENT_KINDS.indexOf(a.kind) - EVENT_KINDS.indexOf(b.kind) || a.number.localeCompare(b.number))
      .map(r => [r.date, r.time, r.kind, r.label, r.university, r.program, name(r.number), r.department, r.result ? r.value : r.checkable ? (r.done ? '완료' : '') : '']);
    try {
      if (fmt === 'hwpx') {
        const file = `우리반일정_${info.name.replace(/\s/g, '')}_${period}.hwpx`;
        downloadFile(await hwpxOf(`우리 반 입시 일정 · ${info.name} · ${view === 'week' ? `${week[0]} 주간` : month}`, ['학생 번호·별칭과 일정 · 결과가 들어 있어요. 학교 밖으로 보내지 마세요.'], headers, rows), file, 'application/hwp+zip');
        setSaveMenu(false); setToast({ title: '한글(hwpx) 파일을 저장했어요', body: `${file} · 학생은 번호·별칭으로 들어가요` }); return;
      }
      if (fmt === 'pdf') {
        printTable(`우리 반 입시 일정 · ${info.name} · ${view === 'week' ? `${week[0]} 주간` : month}`, ['학생 번호·별칭과 일정 · 결과가 들어 있어요. 학교 밖으로 보내지 마세요.'], headers, rows);
        setSaveMenu(false); setToast({ title: '인쇄 창을 열었어요', body: "'PDF로 저장'을 고르면 파일로 남아요 · 학생은 번호·별칭으로 들어가요" }); return;
      }
      downloadFile(await xlsxOf('우리 반 입시 일정', headers, rows), `우리반일정_${info.name.replace(/\s/g, '')}_${period}.xlsx`, XLSX);
      setSaveMenu(false); setToast({ title: 'xlsx 파일을 저장했어요', body: `우리반일정_${info.name.replace(/\s/g, '')}_${period}.xlsx · 학생은 번호·별칭으로 들어가요` });
    } catch { setToast({ title: '파일을 저장하지 못했어요. 다시 저장해 주세요.' }); }
  };

  const todayCount = dayCounts(all, today);
  const missing = missingResults(all, today);
  const noSchedule = !schedules.length;
  const groupProps = { today, name, onEdit: (id: number) => setForm(schedules.find(s => s.id === id) ?? null), onDone: toggleDone, onResult: setResult };

  // v2 시안 class-calendar/390(489:68749) · 1440(487:68233). 칩 · 달력 · 범례 · 날짜 미정은 학생 입시 일정(ac-*) 부품을 같이 써요.
  const views = <SegmentedControl label="일정 보기" value={view} onChange={setView} options={[{ value: 'month', label: '월간' }, ...(wide ? [{ value: 'week' as View, label: '주간' }] : []), { value: 'list', label: '목록' }]} />;
  const addButton = !noSchedule && <ButtonOutline className="cc-add" onClick={() => setForm({})}><Icon name="plus" size={20} />대학 일정 입력</ButtonOutline>;
  const saveButton = <ButtonOutline className="cc-save" aria-label="저장" onClick={() => setSaveMenu(true)}><Icon name="download" size={20} />{wide && '저장'}</ButtonOutline>;
  const byKind = [...todayCount.byKind].sort((a, b) => b.count - a.count);
  const stats = <div className="cc-stats">
    <div className="stat-tile"><span className="cc-stat-label">오늘 반 일정</span><strong className="num">{todayCount.total}건</strong>
      <span className="cc-stat-sub num">{byKind.map(k => `${k.kind} ${k.count}`).join(wide ? ' · ' : '\n') || '오늘은 일정이 없어요'}</span></div>
    <div className="stat-tile"><span className="cc-stat-label">결과 미입력</span><strong className={`num${missing ? ' key-number' : ''}`}>{missing}건</strong><span className="cc-stat-sub">발표일이 지난 일정 기준</span></div>
  </div>;
  const chip = (label: string, on: boolean, click: () => void, mark?: EventKind) => <button key={label} type="button" className="filter-chip" aria-pressed={on} onClick={click}>{mark && <EventMark kind={mark} />}{label}</button>;
  const chips = <div className="ac-chips cc-chips" role="group" aria-label="일정 거르기">
    <label className="filter-chip ac-plan"><span aria-hidden="true">학생: {student ? name(student) : '전체'}</span>
      <select aria-label="학생" value={student} onChange={e => setStudent(e.target.value)}><option value="">전체</option>{students.map(s => <option key={s.number} value={s.number}>{s.number} · {s.alias}</option>)}</select>
      <Icon name="chevron-down" size={16} /></label>
    <span className="ac-divider" aria-hidden="true" />
    {chip('전체', !kind, () => setKind(''))}
    {EVENT_KINDS.map(k => chip(k, kind === k, () => setKind(kind === k ? '' : k), k))}
    <span className="ac-divider" aria-hidden="true" />
    {chip('남은 일만', remaining, () => setRemaining(!remaining))}
  </div>;
  const year = month.slice(0, 4);
  const calendar = <div className="ac-card ac-calendar cc-calendar">
    {view === 'week' ? <div className="ac-month-head">
      <ButtonOutline aria-label="이전 주" onClick={() => moveWeek(-1)}><Icon name="chevron-left" size={20} /></ButtonOutline>
      <h3 className="ac-month-title num">{shortDate(week[0])}~{shortDate(week[6])}</h3>
      <ButtonOutline aria-label="다음 주" onClick={() => moveWeek(1)}><Icon name="chevron-right" size={20} /></ButtonOutline>
      <ButtonOutline className="ac-today" onClick={() => pick(today)}>오늘</ButtonOutline></div>
    : <div className="ac-month-head">
      <ButtonOutline aria-label="이전 달" onClick={() => goMonth(shiftMonth(month, -1))}><Icon name="chevron-left" size={20} /></ButtonOutline>
      <label className="ac-month-title"><span className="num">{year}년 {Number(month.slice(5))}월</span><Icon name="chevron-down" size={20} />
        <select aria-label="달 고르기" value={month} onChange={e => goMonth(e.target.value)}>{Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`).map(m => <option key={m} value={m}>{year}년 {Number(m.slice(5))}월</option>)}</select></label>
      <ButtonOutline aria-label="다음 달" onClick={() => goMonth(shiftMonth(month, 1))}><Icon name="chevron-right" size={20} /></ButtonOutline>
      <ButtonOutline className="ac-today" onClick={() => pick(today)}>오늘</ButtonOutline></div>}
    {view === 'month' && <MonthGrid month={month} day={day} today={today} rows={rows} onPick={pick} />}
    {view === 'week' && <WeekTable days={week} rows={weekRows} today={today} day={day} name={name} onPick={pick} />}
    {view === 'list' && (monthRows.length ? [...new Set(monthRows.map(r => r.date))].sort().map(date => <section key={date} className="cc-list-day" aria-label={longDate(date)}>
      <h4 className="t-label text-muted num">{shortDate(date)}{date === today ? ' · 오늘' : ''}</h4>
      {groupRows(monthRows.filter(r => r.date === date)).map(g => <GroupCard key={g.key} group={g} showRows={!(g.rows.every(r => r.done) && date < today)} {...groupProps} />)}</section>)
      : <p className="text-muted cc-empty">{filtered ? '조건에 맞는 일정이 없어요' : '이번 달은 반 일정이 없어요.'}</p>)}
  </div>;

  const period = activePeriods(schedules, day);
  const dayPanel = <section className="cc-day" aria-label="그날 목록">
    <div className="ac-list-head"><h3 className="num">{longDate(day)} 일정 · {dayRows.length}건</h3>{view !== 'list' && <button type="button" className="text-button" onClick={() => setView('list')}>이번 달 전체 보기</button>}</div>
    {period.length > 0 && <button type="button" className="cc-period" onClick={() => pick(period[0].end!)}>
      <EventMark kind="충원 기간" /><span>충원 기간 진행 중 · {period[0].university} {period[0].program}{period.length > 1 ? ` 외 ${period.length - 1}개` : ''} · {shortDate(period[0].end!)} 마감</span><span aria-hidden="true">›</span></button>}
    {noSchedule && <div className="cc-card cc-notice"><p className="t-body">ⓘ 발표 · 서류 제출 날짜는 대학 일정을 한 번 넣으면 지원한 학생 모두에게 들어가요.</p><ButtonPrimary onClick={() => setForm({})}>대학 일정 입력</ButtonPrimary></div>}
    {dayRows.length ? groupRows(dayRows).map(g => <GroupCard key={g.key} group={g} {...groupProps} />)
      : filtered && all.some(r => r.date === day) ? <div className="cc-card"><p>조건에 맞는 일정이 없어요</p><button type="button" className="text-button t-link" onClick={clearFilters}>필터 모두 끄기</button></div>
      : <div className="cc-card"><p className="text-muted">이날은 반 일정이 없어요.</p></div>}
  </section>;
  const undatedBox = undated.length > 0 && <details className="ac-undated cc-undated"><summary><span><strong>날짜 미정 {undated.length}개</strong><small>학생 카드에 고사 날짜가 없는 일정이에요</small></span><Icon name="chevron-down" size={20} /></summary>
    <ul>{undated.map(u => <li key={`${u.university}|${u.program}|${u.label}`}><EventTag kind="면접·실기" /><span>{u.university} {u.program} · {u.label} · {u.numbers.length}명</span>
      <button type="button" className="text-button" onClick={() => setForm({ university: u.university, program: u.program, kind: '면접·실기' })}>날짜 넣기</button></li>)}</ul></details>;
  const note = <p className="disclaimer-note cc-note"><Icon name="info" size={16} /><span>{DISCLAIMER}{sample && ' · 샘플의 대학·숫자는 예시예요'}</span></p>;

  return <div className="class-calendar">
    {wide ? slots && <>{createPortal(<p className="ac-header-lead">날짜를 누르면 그날 누가 무엇인지 보고, 완료와 결과를 바로 넣어요.</p>, slots.heading)}{addButton && createPortal(addButton, slots.actions)}</>
      : <div className="cc-head"><div className="cc-title-row">{saveButton}</div><p className="cc-lead">{info.name} · {admissionYear}학년도 수시 · 날짜를 누르면 그날 누가 무엇인지 보여요.</p>{views}</div>}
    {wide ? <>
      <div className="cc-toolbar">{chips}{views}{saveButton}</div>
      <div className="cc-body">
        <div className="cc-left">{stats}{calendar}{note}</div>
        <div className="cc-right">{view !== 'list' && <div className="cc-panel">{dayPanel}</div>}{undatedBox}</div>
      </div>
    </> : <>
      {stats}{chips}{calendar}{addButton}
      <div className="cc-day-list">{view !== 'list' && dayPanel}{undatedBox}</div>
      {note}
    </>}

    <p role="status" className="sr-only">{live}</p>
    {toast && <div role="status" className="toast"><strong><Icon name="check" size={16} /> {toast.title}</strong>{toast.body && <span className="t-body-sm">{toast.body}</span>}</div>}
    {form && <ScheduleForm initial={form} cards={cards} outcomes={outcomes} onClose={() => setForm(null)} onDone={t => { setForm(null); setToast(t); }} />}
    {saveMenu && <Modal label="저장할 형식을 골라요" onClose={() => setSaveMenu(false)}><div className="cc-sheet">
      <h3 className="t-heading-4">저장할 형식을 골라요</h3>
      <p className="t-caption text-muted">{view === 'week' ? `${shortDate(week[0])}~${shortDate(week[6])} 일정` : `${Number(month.slice(5))}월 일정`} · {info.name} · {filtered ? '필터 적용' : '필터 없음'}</p>
      <ul className="cc-save-list">
        <li><button type="button" onClick={() => exportFile('xlsx')}><strong>엑셀 (xlsx)</strong><span className="t-caption text-muted">표로 열어 고치거나 인쇄해요</span></button></li>
        <li><button type="button" onClick={() => exportFile('hwpx')}><strong>한글 (hwpx)</strong><span className="t-caption text-muted">한글에서 열어 고치거나 인쇄해요</span></button></li>
        <li><button type="button" onClick={() => exportFile('pdf')}><strong>PDF (pdf)</strong><span className="t-caption text-muted">인쇄 창에서 PDF로 저장해요</span></button></li>
      </ul>
      <p className="t-caption">ⓘ 학생 번호·별칭과 일정 · 결과가 들어 있어요. 파일을 학교 밖으로 보내지 말고, 다 쓴 파일은 지워 주세요.</p>
      <div className="toolbar"><ButtonOutline onClick={() => setSaveMenu(false)}>취소</ButtonOutline></div></div></Modal>}
  </div>;
}

function MonthGrid({ month, day, today, rows, onPick }: { month: string; day: string; today: string; rows: ScheduleRow[]; onPick: (d: string) => void }) {
  const inMonth = rows.filter(r => r.date.startsWith(month));
  const move = (e: KeyboardEvent<HTMLTableElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    const next = new Date(Date.parse(`${day}T00:00:00Z`) + step * 86400000).toISOString().slice(0, 10);
    if (!next.startsWith(month)) return;
    e.preventDefault(); onPick(next);
    requestAnimationFrame(() => e.currentTarget?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus());
  };
  return <>
    <table className="ac-grid cc-month" onKeyDown={move}><caption className="sr-only">{month} 반 일정 달력 · 날짜를 누르면 그날 일정을 보여요</caption>
      <thead><tr>{[...'일월화수목금토'].map(d => <th key={d} scope="col">{d}</th>)}</tr></thead>
      <tbody>{monthDays(month).map((w, i) => <tr key={i}>{w.map((date, j) => {
        if (!date) return <td key={j} />;
        const { total, byKind } = dayCounts(inMonth, date);
        return <td key={j}><button type="button" data-date={date} tabIndex={date === day ? 0 : -1} aria-label={cellLabel(date, inMonth)} aria-current={date === today ? 'date' : undefined} aria-pressed={date === day} onClick={() => onPick(date)}>
          <span className="ac-day num">{Number(date.slice(8))}</span>{total > 0 && <span className="ac-count num">{total > 99 ? '99+' : total}건</span>}
          {total > 0 && <span className="ac-marks" aria-hidden="true">{EVENT_KINDS.map(k => byKind.some(b => b.kind === k) ? <EventMark key={k} kind={k} /> : <span key={k} className="event-mark-slot" />)}</span>}
        </button></td>;
      })}</tr>)}</tbody></table>
    {inMonth.length > 0 && <ul className="ac-legend cc-legend" aria-label="일정 종류">{EVENT_KINDS.map(k => <li key={k}><EventMark kind={k} />{k}</li>)}</ul>}
  </>;
}

function WeekTable({ days, rows, today, day, name, onPick }: { days: string[]; rows: ScheduleRow[]; today: string; day: string; name: (n: string) => string; onPick: (d: string) => void }) {
  const numbers = [...new Set(rows.map(r => r.number))].sort();
  if (!numbers.length) return <p className="text-muted cc-empty">이번 주는 반 일정이 없어요.</p>;
  return <div className="table-scroll"><table className="data-table cc-week"><caption className="sr-only">주간 반 일정 · 학생 행 × 요일</caption>
    <thead><tr><th scope="col">학생</th>{days.map(d => <th key={d} scope="col" className={d === today ? 'is-today' : ''} aria-current={d === today ? 'date' : undefined}>{shortDate(d).slice(3)}</th>)}</tr></thead>
    <tbody>{numbers.map(n => <tr key={n}><th scope="row" className="num">{name(n)}</th>{days.map(d => {
      const items = rows.filter(r => r.number === n && r.date === d);
      return <td key={d} className={d === day ? 'is-picked' : ''}>{items.length > 0 && <button type="button" className="cc-week-cell" aria-label={`${name(n)} ${longDate(d)} ${items.map(r => `${r.university} ${r.label}`).join(', ')}`} onClick={() => onPick(d)}>
        {items.slice(0, 2).map(r => <span key={r.id} className="cc-week-item" data-kind={KIND_TOKEN[r.kind]}><span>{r.label}</span><span>{r.university.replace(/대학교.*$/, '대')}</span><span className="text-muted">{r.result ? r.value : r.checkable ? rowStatus(r, today) : ''}</span></span>)}
        {items.length > 2 && <span className="t-caption">외 {items.length - 2}건</span>}</button>}</td>;
    })}</tr>)}</tbody></table></div>;
}

function GroupCard({ group: g, today, name, onEdit, onDone, onResult, showRows = true }: { group: RowGroup; today: string; name: (n: string) => string; onEdit: (id: number) => void;
  onDone: (r: ScheduleRow, on: boolean) => void; onResult: (r: ScheduleRow, v: RowResult) => void; showRows?: boolean }) {
  const left = g.rows.filter(r => !r.done).length, hasResult = g.rows.some(r => r.result);
  // 접기(시안 묶음): 완료 3명 이상 → 맨 아래 "완료 n명 보기", 발표 묶음 미입력 3명 넘으면 앞 2명만 두고 "미입력 n명 더 보기"(입력된 행 위)
  const doneRows = g.rows.filter(r => r.done && r.checkable), empty = g.rows.filter(r => r.result && r.value === '미입력');
  const foldDone = doneRows.length >= 3, folded = foldDone ? doneRows : empty.length > 3 ? empty.slice(2) : [];
  const shown = g.rows.filter(r => !folded.includes(r)), at = foldDone ? shown.length : 2;
  const row = (r: ScheduleRow) => <li key={r.id} className="cc-row">
    {r.checkable && <label className="cc-check"><input type="checkbox" checked={r.done} aria-label={`${name(r.number)} ${r.university} ${r.program} ${r.label} 완료`} onChange={e => onDone(r, e.target.checked)} /></label>}
    <span className="cc-who"><span className="cc-name num">{name(r.number)}</span>{r.department && <span className="cc-dept">{r.department}</span>}</span>
    {r.result ? <label className={`text-input cc-result${r.value === '미입력' ? ' is-empty' : ''}`}><span className="cc-field"><span>{r.value}</span><Icon name="chevron-down" size={20} /></span>
      <select aria-label={`${name(r.number)} ${r.university} ${r.program} ${r.label} 결과, ${r.value}`} value={r.value} onChange={e => onResult(r, e.target.value as RowResult)}>
        <option value="미입력">미입력</option>{(r.result === 'stage1' ? STAGE1_VALUES : FINAL_VALUES).map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      : r.checkable ? <span className={`cc-status num${r.done ? ' text-muted' : ''}`}>{rowStatus(r, today)}</span>
      : r.period && <span className="cc-status num text-muted">{shortDate(r.period.start)}~{shortDate(r.period.end)}</span>}
  </li>;
  const more = folded.length > 0 && <li key="more" className="cc-more"><details><summary>{foldDone ? `완료 ${folded.length}명 보기` : `미입력 ${folded.length}명 더 보기`}<Icon name="chevron-down" size={16} /></summary>
    <ul className="cc-rows">{folded.map(row)}</ul></details></li>;
  return <article className="cc-group" aria-label={`${g.university} ${g.program} ${g.label}`}>
    <header className="cc-group-head">
      <div className="cc-group-top"><EventTag kind={g.kind} />{g.source === 'teacher' && g.scheduleId !== undefined
        ? <button type="button" className="icon-button cc-edit" title="일정 고치기" aria-label={`${g.university} ${g.program} ${g.label} 일정 고치기`} onClick={() => onEdit(g.scheduleId!)}><Icon name="pencil" size={20} /></button>
        : g.source === 'card' && <span className="t-caption text-muted">학생 카드 날짜</span>}</div>
      <strong className="cc-univ">{g.university}{g.program && ` · ${g.program}`}{g.label !== g.kind && ` · ${g.label}`}</strong>
      <span className="cc-meta num">{g.rows.length}명 · {hasResult ? `미입력 ${left}` : g.rows.some(r => r.checkable) ? (left ? `남은 ${left}` : '모두 완료') : g.label}{g.time && ` · ${g.kind === '서류 제출' ? '마감 ' : ''}${g.time}`}</span>
    </header>
    {showRows ? <ul className="cc-rows">{shown.slice(0, at).map(row)}{more}{shown.slice(at).map(row)}</ul>
      : <details><summary className="t-body-sm">{g.label} · 완료 {g.rows.length}</summary><ul className="cc-rows">{g.rows.map(row)}</ul></details>}
    {hasResult && <p className="cc-sync"><span>결과는 결과 집계에 바로 반영돼요</span><Link to="/teacher/result-summary">결과 집계에서 보기 ›</Link></p>}
  </article>;
}

function ScheduleForm({ initial, cards, outcomes, onClose, onDone }: { initial: Partial<ClassSchedule>; cards: Ready['cards']; outcomes: Ready['outcomes'];
  onClose: () => void; onDone: (t: Toast) => void }) {
  const apps = applications(cards), editing = initial.id !== undefined;
  const [v, setV] = useState<Partial<ClassSchedule>>({ time: '', memo: '', ...initial });
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null), [error, setError] = useState('');
  const dirty = JSON.stringify({ time: '', memo: '', ...initial }) !== JSON.stringify(v);
  const app = apps.find(a => a.university === v.university && a.program === (v.program ?? ''));
  const appKey = v.university ? JSON.stringify([v.university, v.program ?? '']) : '';
  const problem = checkSchedule(v), title = editing ? '대학 일정 고치기' : '대학 일정 입력';
  const kept = outcomes.filter(o => o.university === initial.university && o.program === (initial.program ?? '') && (o.result !== '미입력' || o.stage1 !== null)).length;
  const close = () => dirty && !confirm ? setConfirm('leave') : onClose();
  const save = async () => {
    if (problem) { setError(problem); return; }
    const s: ClassSchedule = { university: v.university!, program: v.program ?? '', kind: v.kind!, date: v.date!, end: v.kind === '충원 기간' ? v.end : null, time: v.time || '', memo: (v.memo ?? '').slice(0, 300) };
    try {
      if (editing) await teacherDb.schedules.put({ ...s, id: initial.id }); else await teacherDb.schedules.add(s);
      onDone(editing ? { title: `${s.kind} 일정을 고쳤어요`, body: `${shortDate(s.date)} · ${s.university} ${s.program}` }
        : { title: `${s.kind} 일정을 ${app?.applied ?? 0}명에게 넣었어요`, body: `${shortDate(s.date)} · ${s.university} ${s.program}` });
    } catch { setError('일정을 저장하지 못했어요. 다시 저장해 주세요.'); }
  };
  const remove = async () => { await teacherDb.schedules.delete(initial.id!); onDone({ title: `${initial.kind} 일정을 지웠어요` }); };
  const field = (k: keyof ClassSchedule) => (e: { target: { value: string } }) => { setV({ ...v, [k]: e.target.value }); setError(''); };

  return <Modal label={confirm === 'leave' ? '저장하지 않고 나갈까요?' : confirm === 'delete' ? '이 일정을 지울까요?' : title} onClose={() => confirm ? setConfirm(null) : close()}><div className="cc-sheet">
    {confirm === 'leave' ? <><h3 className="t-heading-4">저장하지 않고 나갈까요?</h3><p>입력한 {v.university ?? ''} {v.program ?? ''} {v.kind ?? ''} 일정이 저장되지 않아요.</p>
      <div className="toolbar cc-actions"><ButtonOutline onClick={() => setConfirm(null)}>계속 입력</ButtonOutline><ButtonPrimary onClick={onClose}>나가기</ButtonPrimary></div></>
    : confirm === 'delete' ? <><h3 className="t-heading-4">이 일정을 지울까요?</h3>
      <p>{initial.university} {initial.program} {initial.kind}({shortDate(initial.date!).slice(0, 5)})가 {apps.find(a => a.university === initial.university && a.program === (initial.program ?? ''))?.applied ?? 0}명 모두에게서 지워져요. 이미 넣은 결과 {kept}건은 결과 집계에 그대로 남아요.</p>
      <div className="toolbar cc-actions"><ButtonOutline onClick={() => setConfirm(null)}>취소</ButtonOutline><ButtonPrimary onClick={remove}>지우기</ButtonPrimary></div></>
    : <>
      <div className="section-row"><h3 className="t-heading-4">{title}</h3><ButtonOutline onClick={close}>닫기</ButtonOutline></div>
      <label>대학 · 전형<select value={appKey} onChange={e => { const [university, program] = e.target.value ? JSON.parse(e.target.value) as [string, string] : ['', '']; setV({ ...v, university, program }); setError(''); }}>
        <option value="">고르기</option>
        {appKey && !app && <option value={appKey}>{v.university} · {v.program} · 지원 0명</option>}
        {apps.map(a => <option key={a.key} value={a.key}>{a.university}{a.program && ` · ${a.program}`} · 지원 {a.applied}명</option>)}</select></label>
      <label>일정 종류<span className="cc-kind-field">{v.kind && <EventMark kind={v.kind} />}<select value={v.kind ?? ''} onChange={field('kind')}><option value="">고르기</option>{EVENT_KINDS.map(k => <option key={k} value={k}>{k}</option>)}</select></span></label>
      {v.kind === '충원 기간' ? <div className="cc-two"><label>시작<input type="date" value={v.date ?? ''} onChange={field('date')} /></label><label>마감<input type="date" value={v.end ?? ''} min={v.date} onChange={field('end')} aria-invalid={!!v.date && !!v.end && v.end < v.date} /></label></div>
        : <label>날짜<input type="date" value={v.date ?? ''} onChange={field('date')} /></label>}
      <label>시각 (선택)<input type="time" value={v.time ?? ''} onChange={field('time')} placeholder="HH:MM" /></label>
      <label>메모 (선택)<textarea rows={3} maxLength={300} value={v.memo ?? ''} onChange={field('memo')} placeholder="예: 발표 확인 경로 입학처 누리집" /></label>
      {app && <p className="cc-callout">{editing ? `바꾸면 지원한 ${app.applied}명 모두의 일정이 함께 바뀌어요. 이미 넣은 결과는 그대로예요.`
        : `${app.university} ${app.program}에 지원한 ${app.applied}명 모두에게 들어가요. 결과는 발표 뒤 그날 목록에서 넣어요.`}
        {v.kind === '면접·실기' && app.withExamDate > 0 && ` 학생 카드에 날짜가 있는 ${app.withExamDate}명은 카드 날짜를 그대로 둬요.`}</p>}
      {(error || (problem && dirty)) && <p role={error ? 'alert' : undefined} className={error ? 'error-note' : 't-caption text-muted'}>{error || problem}</p>}
      {editing && <button type="button" className="button-danger-text" onClick={() => setConfirm('delete')}>이 일정 지우기</button>}
      <div className="toolbar cc-actions"><ButtonOutline onClick={close}>취소</ButtonOutline><ButtonPrimary disabled={!!problem} onClick={save}>저장</ButtonPrimary></div>
    </>}
  </div></Modal>;
}

