import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClassGate } from '../components/ClassGate';
import { SegmentedControl } from '../components/SegmentedControl';
import { nextState, studentLabel, type Student } from '../domain/classroom';
import { CORE, describe, examsByRecent } from '../domain/minimum';
import { MOCK_AREAS, SEMESTERS, schoolAverage } from '../domain/scoreImport';
import type { ClassState } from '../store/teacherDb';
import { JudgeMark } from './CardCollect';
import { VerdictBadge, judgeStudent } from './MinimumBoard';
import { counselPath } from './TeacherDashboard';

type Tab = 'trend' | 'minimum' | 'counsel' | 'susiro';
const today = () => new Date().toLocaleDateString('sv-SE');

export function StudentRecord() {
  return <ClassGate slug="student-record" title="학생 기록">{c => <Record {...c} />}</ClassGate>;
}

function Record(c: ClassState & { info: NonNullable<ClassState['info']> }) {
  const { info, students, school, mocks, memos, cards } = c;
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('trend');
  const s = students.find(x => x.number === params.get('n')) ?? students[0];
  const grades = school.find(g => g.number === s.number), myMocks = mocks.filter(m => m.number === s.number);
  const exams = examsByRecent(myMocks.map(m => m.exam)).reverse(), lastExam = exams.at(-1), last = myMocks.find(m => m.exam === lastExam);
  const lastSem = [...SEMESTERS].reverse().find(k => grades?.semesters[k] !== undefined);
  const myMemos = memos.filter(m => m.number === s.number).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const card = cards.filter(x => x.number === s.number).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return <>
    <div className="section-row"><div><h3 className="t-heading-1">{Number(s.number)}번 {s.alias}</h3><p className="t-caption text-muted">{info.name}</p></div>
      <label className="t-body-sm">학생 바꾸기 <select value={s.number} onChange={e => setParams({ n: e.target.value })}>{students.map(x => <option key={x.number} value={x.number}>{studentLabel(x)}</option>)}</select></label>
      <Link className="button-outline" to={counselPath(s.number)}>상담 쓰기</Link></div>
    <div className="stats">
      <div><span className="t-caption">{lastSem ? `${lastSem} 내신 전 교과` : '내신'}</span><strong className="num key-number">{lastSem ? grades!.semesters[lastSem]!.toFixed(1) : '–'}</strong><span className="t-caption text-muted">5등급 평균{schoolAverage(grades) !== null ? ` · 전체 ${schoolAverage(grades)!.toFixed(2)}` : ''}</span></div>
      <div><span className="t-caption">{lastExam ?? '모의고사'} 국 · 수 · 영</span><strong className="num">{last ? ['국어', '수학', '영어'].map(a => last.grades[a] ?? '–').join(' · ') : '–'}</strong><span className="t-caption text-muted">9등급</span></div>
    </div>
    <SegmentedControl label="기록 탭" value={tab} onChange={setTab} options={[{ value: 'trend', label: '성적 추이' }, { value: 'minimum', label: '수능 최저' }, { value: 'counsel', label: `상담 ${myMemos.length}` }, { value: 'susiro', label: '수시로' }]} />

    {tab === 'trend' && (!grades && !myMocks.length ? <div className="empty-state"><h3 className="t-heading-3">아직 불러온 성적이 없어요</h3><p>성적표를 불러오면 학기별·회차별 등급 흐름을 여기에서 볼 수 있어요.</p><Link className="button-outline" to="/teacher/score-import">성적 불러오기</Link></div>
      : <div className="record-cards">
        <article className="univ-card"><h4 className="t-heading-3">내신 5등급 평균</h4>
          <TrendChart label="내신 학기별 평균" max={5} columns={[...SEMESTERS]} series={[{ name: '전 교과', values: SEMESTERS.map(k => grades?.semesters[k] ?? null) }]} /></article>
        <article className="univ-card"><h4 className="t-heading-3">모의고사 영역 등급</h4>
          <TrendChart label="모의고사 회차별 등급" max={9} columns={exams} series={MOCK_AREAS.filter(a => a !== '한국사').map(a => ({ name: a, values: exams.map(e => myMocks.find(m => m.exam === e)?.grades[a] ?? null) }))} /></article>
      </div>)}

    {tab === 'minimum' && <MinimumTab student={s} c={c} exams={[...exams].reverse()} />}

    {tab === 'counsel' && (!myMemos.length ? <p className="text-muted">아직 남긴 상담 메모가 없어요. <Link to={counselPath(s.number)}>상담 쓰기 ›</Link></p>
      : <ol className="counsel-timeline">{myMemos.map(m => { const st = nextState(m, today()); return <li key={m.id}><p className="t-caption"><span className="num">{m.date}</span> · <strong>{m.area}</strong></p><p>{m.text}</p>{st && <p className="t-body-sm">다음에 볼 것 · {m.next} · <strong>{st}</strong></p>}</li>; })}</ol>)}


    {tab === 'susiro' && (!card ? <p className="text-muted">아직 받은 수시로 카드가 없어요.</p> : <>
      <p className="t-caption text-muted">{card.card.scenario} · {card.received_at.slice(0, 10)} 받음</p>
      <table className="data-table"><thead><tr><th>칸</th><th>대학 · 전형</th><th>고사</th><th>판정</th><th>메모</th></tr></thead>
        <tbody>{card.card.slots.map((x, i) => <tr key={i}><td className="num">{i + 1}</td><td>{x.university}<br /><span className="t-caption text-muted">{[x.program, x.department].filter(Boolean).join(' · ')}</span></td>
          <td className="num">{x.exam_date ? `${x.exam_kind} ${x.exam_date}` : '–'}</td><td>{JudgeMark({ value: x.judgment }) ?? <span className="t-caption text-muted">판정 준비 중</span>}</td><td className="t-body-sm">{x.memo || '–'}</td></tr>)}</tbody></table>
      {card.card.warnings.map((w, i) => <div key={i} className="warning-callout"><strong>▲ {w.title}</strong><p className="t-body-sm">{w.message}</p></div>)}</>)}

    <p className="disclaimer-note">ⓘ 불러온 성적표 기준이에요 · 학교·평가기관 공식 성적표가 최종 기준이에요 · 흐름은 저장된 값을 그대로 이은 것이고 예측이 아니에요</p>
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

/** 등급 선 차트: 1이 위. 고른 계열 하나만 강조(student-record 02-spec 공통 원칙). 빈 값은 점을 찍지 않고 선을 끊어요. */
function TrendChart({ label, columns, series, max }: { label: string; columns: string[]; series: { name: string; values: (number | null)[] }[]; max: number }) {
  const [focus, setFocus] = useState(series[0]?.name ?? '');
  const filled = columns.filter((_, i) => series.some(s => s.values[i] !== null)).length;
  const W = 520, H = 220, L = 32, R = 64, T = 12, B = 28;
  const x = (i: number) => L + (columns.length < 2 ? (W - L - R) / 2 : i * (W - L - R) / (columns.length - 1)), y = (v: number) => T + (v - 1) * (H - T - B) / (max - 1);
  const path = (vals: (number | null)[]) => vals.map((v, i) => v === null ? '' : `${i && vals[i - 1] !== null ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
  return <>
    {series.length > 1 && <SegmentedControl label={`${label} 계열`} value={focus} onChange={setFocus} options={series.map(s => ({ value: s.name, label: s.name }))} />}
    {filled < 2 ? <p className="t-body-sm text-muted">{columns.length && series[0].values.length ? '두 번 이상 있어야 흐름을 볼 수 있어요.' : ''}</p>
      : <svg className="trend-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} 선 차트, 1등급이 위`}>
        {Array.from({ length: max }, (_, i) => <g key={i}><line x1={L} x2={W - R} y1={y(i + 1)} y2={y(i + 1)} className="trend-grid" /><text x={L - 8} y={y(i + 1) + 4} textAnchor="end" className="trend-tick">{i + 1}</text></g>)}
        {columns.map((col, i) => <text key={col} x={x(i)} y={H - 8} textAnchor="middle" className="trend-tick">{col.replace(/^\d{4}년 /, '')}</text>)}
        {[...series].sort((a, b) => Number(a.name === focus) - Number(b.name === focus)).map(s => { const on = s.name === focus, lastI = s.values.map((v, i) => v === null ? -1 : i).filter(i => i >= 0).at(-1) ?? 0;
          return <g key={s.name} className={on ? 'trend-on' : 'trend-off'}><path d={path(s.values)} />{on && s.values.map((v, i) => v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={4} />)}
            {s.values[lastI] !== null && <text x={x(lastI) + 8} y={y(s.values[lastI]!) + 4} className="trend-tick">{s.name}</text>}</g>; })}
      </svg>}
    <table className="data-table"><caption className="sr-only">{label} 표</caption><thead><tr><th>계열</th>{columns.map(col => <th key={col} className="num">{col.replace(/^\d{4}년 /, '')}</th>)}</tr></thead>
      <tbody>{series.map(s => <tr key={s.name}><td>{s.name}</td>{s.values.map((v, i) => <td key={i} className="num">{v ?? '–'}</td>)}</tr>)}</tbody></table>
  </>;
}
