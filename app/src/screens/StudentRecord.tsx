import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { ClassGate } from '../components/ClassGate';
import { Icon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { dataAsOf } from '../data/catalog';
import { useSampleMode } from '../data/sample';
import { nextState, soonestCounsel, type Student } from '../domain/classroom';
import { CORE, describe } from '../domain/minimum';
import { fiveToNineFor } from '../domain/results';
import { schoolAverage } from '../domain/scoreImport';
import { gradeSummary } from '../domain/student';
import { TOTAL, axis, examMonth, examShort, labelPositions, mockTrend, schoolTrend, semesterSentence, trendSentence, type Series } from '../domain/studentRecord';
import type { ClassState } from '../store/teacherDb';
import { JudgeMark } from './CardCollect';
import { VerdictBadge, judgeStudent } from './MinimumBoard';
import { counselPath } from './TeacherDashboard';
import '../styles/student-record.css';

type Tab = 'trend' | 'minimum' | 'counsel' | 'susiro';
const today = () => new Date().toLocaleDateString('sv-SE');

function useDesktop() {
  const query = '(min-width: 1024px)';
  const [desktop, setDesktop] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia(query), update = () => setDesktop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

export function StudentRecord() {
  return <ClassGate slug="student-record" title="학생 기록">{c => <Record {...c} />}</ClassGate>;
}

function Record(c: ClassState & { info: NonNullable<ClassState['info']> }) {
  const { info, students, school, mocks, memos, cards } = c;
  const desktop = useDesktop(), sample = useSampleMode();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>('trend');
  // 주소에 번호가 없으면 상담 화면처럼 다음 상담이 가장 이른 학생, 없으면 성적이 있는 첫 학생(없으면 첫 학생)으로 열어요.
  const scored = (n: string) => school.some(g => g.number === n) || mocks.some(m => m.number === n);
  const s = students.find(x => x.number === params.get('n')) ?? soonestCounsel(students, memos, new Date().toLocaleDateString('sv-SE')) ?? students.find(x => scored(x.number)) ?? students[0];
  const grades = school.find(g => g.number === s.number), myMocks = mocks.filter(m => m.number === s.number);
  const sch = schoolTrend(grades), mk = mockTrend(myMocks), records = grades?.records ?? [];
  const average = records.length ? gradeSummary(records).average : schoolAverage(grades);
  const nine = records.length ? fiveToNineFor(records, TOTAL) : null; // 검수된 R-CONV-003·004만 계산(NEVER-1)
  const totalValues = sch.series[0].values.filter((v): v is number => v !== null);
  const myMemos = memos.filter(m => m.number === s.number).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const card = cards.filter(x => x.number === s.number).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const lastExam = mk.columns.at(-1);

  const name = `${Number(s.number)}번 ${s.alias}`;
  const meta = [info.name, s.track, s.major && `희망 전공 ${s.major}`].filter(Boolean).join(' · ');
  const count = records.length ? `입력 과목 ${records.length}개` : '';
  const range = nine?.display ? `약 ${nine.display.min.toFixed(1)}~${nine.display.max.toFixed(1)}` : '';
  const subs = [
    range && ['9등급 환산', desktop && nine?.representative != null ? `${range} (대표 ${nine.representative.toFixed(1)})` : range],
    totalValues.length > 1 && ['학기 추이', totalValues.map(v => v.toFixed(1)).join(' → ')],
    desktop && s.major && ['희망 전공', s.major],
  ].filter(Boolean) as [string, string][];
  const note = desktop
    ? [range && '환산 9등급은 추정 범위예요', lastExam && `수능 최저는 ${examMonth(lastExam)} 모의고사 기준 충족 현황이에요`, '대학 공식 자료가 최종 기준이에요', sample && '샘플 숫자는 예시예요', `데이터 기준일 ${dataAsOf}`].filter(Boolean).join(' · ')
    : `불러온 성적표 기준이에요. 학교·평가기관 공식 성적표가 최종 기준이에요 · 데이터 기준일 ${dataAsOf}`;

  const headSlot = desktop ? document.querySelector('.topbar__heading') : null;
  const actionSlot = document.getElementById(desktop ? 'topbar-screen-actions' : 'appbar-actions');

  return <>
    {headSlot && createPortal(<><h1 className="srec-title">{name}</h1>{(meta || count) && <p className="srec-lead">{[meta, count].filter(Boolean).join(' · ')}</p>}</>, headSlot)}
    {actionSlot && createPortal(desktop ? <span className="data-status-badge srec-asof">데이터 기준일 {dataAsOf}</span>
      : <Link className="icon-button" to={counselPath(s.number)} aria-label="상담 쓰기"><Icon name="message-square" /></Link>, actionSlot)}
    <div className="srec-head">
      {!desktop && <div><h2 className="srec-name">{name}</h2>{meta && <p className="srec-meta">{meta}</p>}</div>}
      <div className="srec-hero">
        <div className="stat-tile">
          <span className="srec-label">{average === null ? '내신' : ['내신 5등급 평균', desktop ? (records.length ? '학점 가중' : '') : count].filter(Boolean).join(' · ')}</span>
          <strong className="srec-key num">{average === null ? '–' : average.toFixed(1)}</strong>
          {semesterSentence(sch.series[0], sch.columns) && <p className="srec-sentence">{semesterSentence(sch.series[0], sch.columns)}</p>}
        </div>
        {subs.length > 0 && <dl className="srec-subs">{subs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl>}
      </div>
    </div>
    <SegmentedControl label="기록 탭" value={tab} onChange={setTab} options={[{ value: 'trend', label: '성적 추이' }, { value: 'minimum', label: '수능 최저' }, { value: 'counsel', label: `상담 ${myMemos.length}` }, { value: 'susiro', label: '수시로' }]} />

    {tab === 'trend' && (!grades && !myMocks.length ? <div className="empty-state"><h3 className="t-heading-3">아직 불러온 성적이 없어요</h3><p>성적표를 불러오면 학기별·회차별 등급 흐름을 여기에서 볼 수 있어요.</p><Link className="button-outline" to="/teacher/score-import">성적 불러오기</Link></div>
      : <div className="srec-cards">
        <TrendCard key={`s${s.number}`} title="내신 학기별 평균 등급" columns={sch.columns} series={sch.series} school />
        <TrendCard key={`m${s.number}`} title="모의고사 회차별 영역 등급" columns={mk.columns} series={mk.series} school={false} />
      </div>)}

    {tab === 'minimum' && <MinimumTab student={s} c={c} exams={[...mk.columns].reverse()} />}

    {tab === 'counsel' && (!myMemos.length ? <p className="text-muted">아직 남긴 상담 메모가 없어요. <Link to={counselPath(s.number)}>상담 쓰기 ›</Link></p>
      : <ol className="counsel-timeline">{myMemos.map(m => { const st = nextState(m, today()); return <li key={m.id}><p className="t-caption"><span className="num">{m.date}</span> · <strong>{m.area}</strong></p><p>{m.text}</p>{st && <p className="t-body-sm">다음에 볼 것 · {m.next} · <strong>{st}</strong></p>}</li>; })}</ol>)}

    {tab === 'susiro' && (!card ? <p className="text-muted">아직 받은 수시로 카드가 없어요.</p> : <>
      <p className="t-caption text-muted">{card.card.scenario} · {card.received_at.slice(0, 10)} 받음</p>
      <table className="data-table"><thead><tr><th>칸</th><th>대학 · 전형</th><th>고사</th><th>판정</th><th>메모</th></tr></thead>
        <tbody>{card.card.slots.map((x, i) => <tr key={i}><td className="num">{i + 1}</td><td>{x.university}<br /><span className="t-caption text-muted">{[x.program, x.department].filter(Boolean).join(' · ')}</span></td>
          <td className="num">{x.exam_date ? `${x.exam_kind} ${x.exam_date}` : '–'}</td><td>{JudgeMark({ value: x.judgment }) ?? <span className="t-caption text-muted">판정 준비 중</span>}</td><td className="t-body-sm">{x.memo || '–'}</td></tr>)}</tbody></table>
      {card.card.warnings.map((w, i) => <div key={i} className="warning-callout"><strong>▲ {w.title}</strong><p className="t-body-sm">{w.message}</p></div>)}</>)}

    <p className="disclaimer-note"><Icon name="info" size={16} /><span>{note}</span></p>
  </>;
}

function MinimumTab({ student, c, exams }: { student: Student; c: ClassState; exams: string[] }) {
  if (!exams.length) return <p className="text-muted">모의고사 성적이 없어요. 성적 불러오기에서 올리면 1순위 목표 충족 현황을 볼 수 있어요.</p>;
  const { target } = judgeStudent(student.number, exams[0], c);
  return <>
    <p className="t-body">1순위 목표: {target?.university ?? '없음'} {target?.criterion && <><span className="t-caption">· {describe(target.criterion)}</span> <span className="data-status-badge">교사 입력 · 미검수</span></>}</p>
    <table className="data-table"><thead><tr><th>시험</th>{CORE.map(a => <th key={a} className="num">{a[0]}</th>)}<th>판정</th><th>이유</th></tr></thead>
      <tbody>{exams.map(e => { const j = judgeStudent(student.number, e, c).judged; return <tr key={e}><td>{e}</td>{CORE.map(a => <td key={a} className="num">{j.values[a] ?? '–'}</td>)}<td><VerdictBadge v={j.verdict} /></td><td className="t-body-sm">{j.reason}</td></tr>; })}</tbody></table>
    <Link className="t-link" to="/teacher/minimum-board">수능 최저 판정에서 기준 넣기 ›</Link></>;
}

/** 내신 · 모의고사 카드(v2 시안): 제목 · 규칙 문장 → 계열 칩(하나만) → 선 차트 → 표. 모의고사는 전체 · 최근 4회. */
function TrendCard({ title, columns, series, school }: { title: string; columns: string[]; series: Series[]; school: boolean }) {
  const [focus, setFocus] = useState(school ? TOTAL : '수학');
  const [recent, setRecent] = useState<'all' | 'recent'>('all');
  const from = !school && recent === 'recent' ? Math.max(0, columns.length - 4) : 0;
  const cols = columns.slice(from), rows = series.map(s => ({ ...s, values: s.values.slice(from) }));
  const sel = rows.find(s => s.name === focus) ?? rows[0];
  const filled = cols.filter((_, i) => rows.some(s => s.values[i] !== null)).length;
  const head = (c: string) => school ? c : examShort(c);
  if (!sel || !columns.length) return <article className="srec-card"><h3 className="srec-card__title">{title}</h3>
    <p className="srec-card__lead text-muted">{school ? '아직 불러온 내신이 없어요. 성적 불러오기에서 내신 성적표를 올려요.' : '아직 불러온 모의고사가 없어요. 성적 불러오기에서 모의고사 성적표를 올려요.'}</p>
    <Link className="t-link" to="/teacher/score-import">성적 불러오기 ›</Link></article>;
  return <article className="srec-card">
    <div className="srec-card__head">
      <div><h3 className="srec-card__title">{title}</h3><p className="srec-card__lead">{trendSentence(sel, cols, school)}</p></div>
      {!school && <SegmentedControl label="모의고사 기간" value={recent} onChange={setRecent} options={[{ value: 'all', label: '전체' }, { value: 'recent', label: '최근 4회' }]} />}
    </div>
    {filled < 2 ? <p className="srec-card__lead text-muted">{school ? '학기가 두 개 이상 있어야 흐름을 볼 수 있어요.' : '모의고사가 두 번 이상 있어야 흐름을 볼 수 있어요.'}</p> : <>
      <div className="srec-chips" role="group" aria-label={`${title} 계열`}>{rows.map(s => <button key={s.name} type="button" className="filter-chip" aria-pressed={s.name === sel.name} onClick={() => setFocus(s.name)}>{s.name}</button>)}</div>
      <TrendChart label={title} columns={cols.map(c => school ? c : examMonth(c))} series={rows} selected={sel.name} school={school} />
    </>}
    <table className={`data-table srec-table srec-table--${school ? 'school' : 'mock'}`}><caption className="sr-only">{title} 표</caption>
      <thead><tr><th scope="col">{school ? '과목' : '영역'}</th>{cols.map(c => <th key={c} scope="col" className="num">{head(c)}</th>)}</tr></thead>
      <tbody>{rows.map(s => <tr key={s.name} className={s.name === sel.name ? 'is-selected' : undefined}><th scope="row">{s.name}</th>{s.values.map((v, i) => <td key={i} className="num">{v === null ? '–' : school ? v.toFixed(1) : v}</td>)}</tr>)}</tbody></table>
  </article>;
}

/** grade-trend-chart: 1이 위, 고른 계열 하나만 2px Route Blue + 점, 나머지 1px 회색 + 선 끝 이름표. 빈 값은 선을 끊어요. */
function TrendChart({ label, columns, series, selected, school }: { label: string; columns: string[]; series: Series[]; selected: string; school: boolean }) {
  const ref = useRef<SVGSVGElement>(null), [W, setW] = useState(504);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const update = () => { if (el.clientWidth) setW(el.clientWidth); };
    update();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(update); ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = 220, TOP = 11.5, BOTTOM = 179.5, ticks = axis(series, school), lo = ticks[0], hi = ticks.at(-1)!;
  const x = (i: number) => columns.length < 2 ? (W - 64) / 2 : 32 + i * (W - 96) / (columns.length - 1);
  const y = (v: number) => hi === lo ? (TOP + BOTTOM) / 2 : TOP + (v - lo) * (BOTTOM - TOP) / (hi - lo);
  const path = (vals: (number | null)[]) => vals.map((v, i) => v === null ? '' : `${i && vals[i - 1] !== null ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
  const lastOf = (s: Series) => { const i = s.values.map((v, k) => v === null ? -1 : k).filter(k => k >= 0).at(-1); return i === undefined ? null : { i, v: s.values[i]! }; };
  const ends = series.map((s, order) => ({ s, order, end: lastOf(s) })).filter(e => e.end)
    .sort((a, b) => a.end!.v - b.end!.v || Number(b.s.name === selected) - Number(a.s.name === selected) || a.order - b.order);
  const pos = labelPositions(ends.map(e => ({ key: e.s.name, y: y(e.end!.v) })));
  const sel = series.find(s => s.name === selected)!;
  const fmt = (v: number) => school ? v.toFixed(1) : String(v);
  return <svg ref={ref} className="trend-chart" width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
    aria-label={`${label} · ${selected}, 1이 위, ${columns.map((c, i) => `${c} ${sel.values[i] === null ? '없음' : fmt(sel.values[i]!)}`).join(', ')}`}>
    {ticks.map(t => <text key={t} x={24} y={y(t) + 4} textAnchor="end" className="srec-tick">{fmt(t)}</text>)}
    {columns.map((c, i) => <text key={c + i} x={x(i)} y={201} textAnchor="middle" className="srec-tick">{c}</text>)}
    {series.filter(s => s.name !== selected).map(s => <path key={s.name} d={path(s.values)} className="srec-line" />)}
    <path d={path(sel.values)} className="srec-line srec-line--on" />
    {sel.values.map((v, i) => v === null ? null : <g key={i}><circle cx={x(i)} cy={y(v)} r={6} fill="#fff" /><circle cx={x(i)} cy={y(v)} r={4} className="srec-dot" /></g>)}
    {ends.map(e => <text key={e.s.name} x={W - 56} y={pos[e.s.name] + 4} className={e.s.name === selected ? 'srec-tick srec-tick--value' : 'srec-tick'}>{e.s.name === selected ? fmt(e.end!.v) : e.s.name}</text>)}
  </svg>;
}
