import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Modal } from '../components/Modal';
import { ActionLink, BoardHead, BoardTable, Chips, Disclaimer, Mark, NotifyButton, RowCard, TodayCard, ViewOnly, someOf, useDesktop, who, type Tone, type TodayRow } from '../components/TeacherBoard';
import { dataAsOf } from '../data/catalog';
import { useSampleMode } from '../data/sample';
import { nextDue, nextState, submissionRows, type SubmissionRow } from '../domain/classroom';
import { fiveToNineFor } from '../domain/results';
import { decline, schoolAverage, type SchoolGrades } from '../domain/scoreImport';
import { examMonth } from '../domain/studentRecord';
import { referenceConversion } from '../domain/referenceConversion';
import { downloadFile } from '../io/backup';
import { xlsxOf } from '../io/grades';
import { teacherDb, type ClassState } from '../store/teacherDb';
import { examsByRecent, type Verdict } from '../domain/minimum';
import { judgeStudent } from './MinimumBoard';
import { announceLockChange } from '../components/TeacherLock';
import { ServerSync } from '../components/ServerSync';
import { LOCK_MINUTES, clearLock, loadLock, saveLock } from '../domain/teacherLock';

export const counselPath = (number: string) => `/teacher/counsel?n=${number}`;
export function WarningBadge({ count }: { count: number }) {
  return count ? <span className="judge-badge judge-reach">▲ 경고 {count}</span> : <span className="text-muted">–</span>;
}

/** 학생 계산기와 같은 v0.4 참고 환산. */
export function g9Label(g5: number | null) {
  if (g5 === null) return '성적 없음';
  const range = referenceConversion(g5)?.grade9Range;
  return range ? `약 ${range[0].toFixed(2)}~${range[1].toFixed(2)}` : '환산 불가';
}
/** 학생의 가장 최근 모의고사로 본 1순위 수능 최저(교사가 넣은 목표 기준). 목표나 모의고사가 없으면 null. */
export function latestMinimum(n: string, c: Pick<ClassState, 'mocks' | 'targets'>) {
  const exam = examsByRecent(c.mocks.filter(m => m.number === n).map(m => m.exam))[0];
  if (!exam) return null;
  const r = judgeStudent(n, exam, c);
  return r.target ? { ...r, exam } : null;
}
/** 상담 필요 신호(teacher-dashboard 02-spec: 최저 근접·미충족 · 카드 위험 경고 · 성적 하락). 우리 반 홈과 학생 상담이 같이 써요. */
export function signals(r: SubmissionRow, g?: SchoolGrades, min?: Verdict | null) {
  const out: string[] = [], d = decline(g);
  if (min === '미충족' || min === '근접') out.push(`수능 최저(1순위) ${min}`);
  if (r.warnings) out.push(`카드 조합 경고 ${r.warnings}개 · ${r.latest!.card.warnings[0].title}`);
  if (d !== null) out.push(`지난 학기보다 5등급 평균이 ${d.toFixed(1)} 내려갔어요`);
  return out;
}

/** 과목 성적은 학점 가중평균, 학기 평균만 있으면 학기 단순평균을 같은 참고 모델에 입력. */
function gradeOf(g?: SchoolGrades) {
  const r = g?.records?.length ? fiveToNineFor(g.records, '전 교과') : null;
  if (r && r.min !== null && r.max !== null && r.g5 !== null) return { g5: r.g5, g9: `약 ${r.min.toFixed(2)}~${r.max.toFixed(2)}`, sortKey: r.min };
  const g5 = schoolAverage(g);
  return { g5, g9: g9Label(g5), sortKey: g5 === null ? 99 : g5 };
}
const TONE: Partial<Record<Verdict, Tone>> = { 미충족: 'risk', 근접: 'fit', 충족: 'safe' };
const today = () => new Date().toLocaleDateString('sv-SE');
/** 이번 주(오늘~일요일) 상담: 학생 상담 메모의 "다음에 볼 것" 기한(대기). */
function weekEnd(day: string) { const d = new Date(`${day}T00:00:00`); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return d.toLocaleDateString('sv-SE'); }
const monthDay = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

type Filter = 'all' | 'need' | 'unmet' | 'missing';
type Sort = 'priority' | 'g9' | 'warn';

export function TeacherDashboard() {
  return <ClassGate slug="teacher-dashboard" title="우리 반 홈" setup>{c => <Dashboard {...c} />}</ClassGate>;
}

function Dashboard(c: ClassState & { info: NonNullable<ClassState['info']> }) {
  const { info, students, cards, school, memos } = c;
  const desktop = useDesktop(), sample = useSampleMode();
  const [filter, setFilter] = useState<Filter>('all'), [sort, setSort] = useState<Sort>('priority'), [showAll, setShowAll] = useState(false);
  const now = today(), end = weekEnd(now);
  const grade = (n: string) => school.find(g => g.number === n);
  const base = submissionRows(students, cards).map(r => {
    const n = r.student.number, min = latestMinimum(n, c)?.judged.verdict ?? null, why = signals(r, grade(n), min);
    // 줄 표식(시안 첫 열): 최저 미충족 ■ → 카드 경고 ▲ → 최저 근접 ◐ → 카드 미제출 ▲
    const tier = min === '미충족' ? 0 : r.warnings ? 1 : min === '근접' ? 2 : !r.latest ? 3 : 4;
    return { ...r, n, min, need: why.length > 0, tier, grade: gradeOf(grade(n)) };
  });
  const byPriority = [...base].sort((a, b) => a.tier - b.tier || b.warnings - a.warnings || a.n.localeCompare(b.n));
  const missing = byPriority.filter(r => !r.latest).sort((a, b) => a.n.localeCompare(b.n)).map(r => r.student);
  const unmet = base.filter(r => r.min === '미충족').length, near = base.filter(r => r.min === '근접').length, need = base.filter(r => r.need).length;
  const exam = examsByRecent(c.mocks.map(m => m.exam))[0], month = exam ? examMonth(exam) : '';
  const week = students.map(s => ({ s, due: memos.filter(m => m.number === s.number && nextState(m, now) === '대기').map(m => nextDue(m.next, Number(m.date.slice(0, 4))))
    .filter((d): d is string => !!d && d >= now && d <= end).sort()[0] })).filter(x => x.due).sort((a, b) => a.due!.localeCompare(b.due!));
  const submitted = students.length - missing.length;
  const showMissing = () => { setFilter('missing'); setShowAll(true); };

  const todo: TodayRow[] = [
    desktop ? { icon: 'upload', count: `${missing.length}명`, title: '상담카드를 아직 안 냈어요', sub: `${students.length}명 중 ${submitted}명 제출${missing.length ? ` · ${someOf(missing)}` : ''}`, action: <NotifyButton code={info.code} missing={missing} /> }
      : { icon: 'upload', count: '', title: `상담카드 미제출 ${missing.length}명`, sub: `${students.length}명 중 ${submitted}명이 냈어요`, action: <button type="button" className="tb-action" onClick={showMissing}>명단 보기 ›</button> },
    ...(month ? [desktop ? { icon: 'book-open', count: `${unmet}명`, title: '수능 최저(1순위)를 아직 못 채웠어요', sub: `${month} 모의고사 기준 충족 현황 · 근접 ${near}명은 따로 세요`, action: <ActionLink to="/teacher/minimum-board">학생 확인하기 ›</ActionLink> }
      : { icon: 'book-open', count: '', title: `수능 최저 미충족 ${unmet}명`, sub: `${month} 모의고사 기준 · 근접 ${near}명`, action: <ActionLink to="/teacher/minimum-board">학생 보기 ›</ActionLink> }] : []),
    desktop ? { icon: 'message-square', count: `${week.length}명`, title: '이번 주 상담이 잡혀 있어요', sub: week.length ? week.map(x => `${monthDay(x.due!)} ${who(x.s)}`).join(' · ') : '이번 주에 잡힌 상담이 없어요', action: <ActionLink to={week[0] ? `/teacher/counsel?n=${week[0].s.number}` : '/teacher/counsel'}>상담 화면 열기 ›</ActionLink> }
      : { icon: 'message-square', count: '', title: `이번 주 상담 ${week.length}명`, sub: week.length ? `${monthDay(week[0].due!)} ${who(week[0].s)}부터` : '이번 주에 잡힌 상담이 없어요', action: <ActionLink to={week[0] ? `/teacher/counsel?n=${week[0].s.number}` : '/teacher/counsel'}>일정 보기 ›</ActionLink> },
  ];
  // "아래 N가지" = 오늘 할 일 줄 + 학생 한눈에 표
  const lead = `${info.name} ${students.length}명 중 ${need}명이 상담이 필요해요. 오늘은 아래 ${todo.length + 1}가지부터 챙겨요.`;
  const note = [base.some(r => r.grade.g5 !== null) && '환산 9등급은 추정 범위예요', month && `수능 최저는 ${month} 모의고사 기준 충족 현황이에요`, '대학 공식 자료가 최종 기준이에요',
    sample && '샘플의 숫자는 예시예요', `데이터 기준일 ${dataAsOf}`].filter(Boolean).join(' · ');

  const pick = filter === 'need' ? (r: typeof base[number]) => r.need : filter === 'unmet' ? (r: typeof base[number]) => r.min === '미충족' : filter === 'missing' ? (r: typeof base[number]) => !r.latest : () => true;
  const sorted = sort === 'g9' ? [...byPriority].sort((a, b) => a.grade.sortKey - b.grade.sortKey) : sort === 'warn' ? [...byPriority].sort((a, b) => b.warnings - a.warnings) : byPriority;
  const shown = sorted.filter(pick);
  const chips: [Filter, string][] = [['all', `전체 ${students.length}`], ['need', `상담 필요 ${need}`], ['unmet', `최저 미충족 ${unmet}`], ['missing', `카드 미제출 ${missing.length}`]];
  const minLabel = (v: Verdict | null, long: boolean) => v && v !== '판정 불가' ? <Mark tone={TONE[v] ?? 'none'} label={long ? `최저 ${v}` : v} soft={long} /> : <span className="tb-muted">–</span>;
  const exportXlsx = async () => downloadFile(await xlsxOf('학생 한눈에', ['학생', '5등급 평균', '환산 9등급', '수능 최저(1순위)', '카드에 담은 대학', '카드', '경고'],
    shown.map(r => [who(r.student), r.grade.g5?.toFixed(1) ?? '', r.grade.g9, r.min ?? '', r.latest?.card.slots.length ?? '', r.latest ? '제출' : '미제출', r.warnings])),
    `학생한눈에_${info.name}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  if (!desktop) return <div className="tb tb--dashboard">
    <BoardHead desktop={false} lead="" />
    <div className="tb-head"><div className="screen-heading"><h2>{info.name}</h2></div><ViewOnly>{`${students.length}명 · 보기 전용이에요. 전체 기능은 PC에서 열 수 있어요.`}</ViewOnly></div>
    <TodayCard desktop={false} rule="" rows={todo} />
    <section className="tb-section" aria-label="학생 한눈에">
      <div className="tb-section__head"><h3 className="tb-section__title">학생 한눈에</h3><span className="tb-caption">주의 순</span></div>
      <Chips value={filter} options={chips} onChange={setFilter} />
      <div className="tb-list">{(showAll ? shown : shown.slice(0, 4)).map(r => <RowCard key={r.n} number={r.n} alias={r.student.alias} middle={r.grade.g5 !== null ? r.grade.g9 : '성적 없음'} to={counselPath(r.n)}
        badges={<><span className="tb-badge">{r.latest ? '제출' : '미제출'}</span>{minLabel(r.min, true)}</>} />)}</div>
      {!showAll && shown.length > 4 && <button type="button" className="tb-more" onClick={() => setShowAll(true)}>{shown.length}명 전체 보기 ›</button>}
    </section>
    <Disclaimer>{note}</Disclaimer>
  </div>;

  return <div className="tb tb--dashboard">
    <BoardHead desktop lead={lead} />
    <TodayCard desktop rule={`규칙으로 골랐어요 · ${now} 기준`} rows={todo} />
    <section className="tb-panel" aria-label="학생 한눈에">
      <div className="tb-toolbar">
        <div className="tb-toolbar__title"><h3>학생 한눈에</h3><span className="tb-caption">상담이 필요한 학생 먼저 · 같으면 번호 순</span></div>
        <Chips value={filter} options={chips} onChange={setFilter} />
        <div className="tb-toolbar__actions"><Link className="button-outline" to="/teacher/score-import">성적 불러오기</Link><ButtonOutline onClick={exportXlsx}>엑셀 내보내기</ButtonOutline></div>
      </div>
      <BoardTable label="학생 한눈에" columns={[{ label: '', className: 'is-mark' }, { label: '학생', className: 'is-flex' }, { label: '5등급 평균', className: 'is-right', width: 120 },
        { label: '환산 9등급', className: 'is-right', width: 150, sort: () => setSort(s => s === 'g9' ? 'priority' : 'g9') }, { label: '수능 최저(1순위)', width: 170 },
        { label: '관심 대학', className: 'is-right', width: 110 }, { label: '카드', className: 'is-center', width: 110 }, { label: '경고', width: 150, sort: () => setSort(s => s === 'warn' ? 'priority' : 'warn') }]}
        rows={shown.map(r => ({ key: r.n, cells: [
          [<Mark key="m" tone="risk" />, <Mark key="m" tone="reach" />, <Mark key="m" tone="fit" label="적정" />, <Mark key="m" tone="reach" />, null][r.tier],
          <Link to={counselPath(r.n)}>{who(r.student)}</Link>,
          r.grade.g5 !== null ? r.grade.g5.toFixed(1) : <span className="tb-muted">–</span>,
          r.grade.g5 !== null ? r.grade.g9 : <span className="tb-muted">성적 없음</span>,
          minLabel(r.min, false),
          r.latest ? r.latest.card.slots.length || <span className="tb-muted">–</span> : <span className="tb-muted">–</span>,
          r.latest ? <span className="tb-muted">제출</span> : <span className="tb-strong">미제출</span>,
          r.warnings ? <Mark tone="reach" label={`경고 ${r.warnings}`} /> : <span className="tb-muted">–</span>,
        ] }))} />
    </section>
    <Disclaimer>{note}</Disclaimer>
    <ClassAdmin info={info} />
  </div>;
}

/** 학급 관리(서버 동기화 · 자동 잠금 · 지우기): 시안 아래, 접어 둬요. */
function ClassAdmin({ info }: { info: NonNullable<ClassState['info']> }) {
  const [clearing, setClearing] = useState(false);
  return <>
    <details className="trace-accordion"><summary>학급 관리</summary>
      <p className="t-body-sm">학급 코드 {info.code} · 만든 날 {info.created_at.slice(0, 10)}</p>
      <ServerSync />
      <LockSettings />
      <ButtonOutline onClick={() => setClearing(true)}>이 기기에서 학급 데이터 지우기</ButtonOutline></details>
    {clearing && <Modal label="학급 데이터 지우기" onClose={() => setClearing(false)}><h3 className="t-heading-3">학급 데이터를 지울까요?</h3>
      <p>{info.name} 명단·받은 카드·상담 메모를 이 기기에서 모두 지워요. 되돌릴 수 없어요.</p>
      <div className="toolbar"><ButtonOutline onClick={() => setClearing(false)}>취소</ButtonOutline>
        <ButtonPrimary onClick={async () => { await teacherDb.clearClass(); clearLock(); announceLockChange(); setClearing(false); }}>모두 지우기</ButtonPrimary></div></Modal>}
  </>;
}

/** 자동 잠금 번호 정하기(학급 관리). */
function LockSettings() {
  const [on, setOn] = useState(() => !!loadLock()), [pin, setPin] = useState(''), [confirm, setConfirm] = useState(''), [minutes, setMinutes] = useState(loadLock()?.minutes ?? 10), [message, setMessage] = useState(''), [error, setError] = useState('');
  const save = async () => {
    try { if (pin !== confirm) throw new Error('두 번 입력한 잠금 번호가 달라요.'); await saveLock(pin, minutes); announceLockChange(); setOn(true); setPin(''); setConfirm(''); setError(''); setMessage(`${minutes}분 동안 쓰지 않으면 교사 화면을 잠가요.`); }
    catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
  };
  return <fieldset className="form-grid"><legend className="t-heading-4">자동 잠금</legend>
    <p className="t-caption text-muted">{on ? `켜져 있어요 · ${loadLock()?.minutes}분 동안 쓰지 않으면 잠가요.` : '꺼져 있어요. 잠금 번호를 정하면 쓰지 않을 때 교사 화면을 잠가요.'} 화면 잠금이라 기기 자체의 잠금도 함께 써 주세요.</p>
    <label>잠금 번호(숫자 4~8자리)<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin} onChange={e => setPin(e.target.value)} /></label>
    <label>잠금 번호 확인<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
    <label>잠그기까지<select value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{LOCK_MINUTES.map(m => <option key={m} value={m}>{m}분</option>)}</select></label>
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="toolbar"><ButtonOutline onClick={save}>{on ? '잠금 번호 바꾸기' : '자동 잠금 켜기'}</ButtonOutline>
      {on && <ButtonOutline onClick={() => { clearLock(); announceLockChange(); setOn(false); setMessage('자동 잠금을 껐어요.'); }}>자동 잠금 끄기</ButtonOutline>}</div>
  </fieldset>;
}
