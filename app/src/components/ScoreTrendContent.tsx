import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { cutTableFor, mockExams } from '../data/mock-exams';
import { dataAsOf } from '../data/catalog';
import { sampleMinimums, type MinimumCriterion } from '../data/sample/mockScore';
import { sampleTrendMocks } from '../data/sample/scoreTrend';
import { isSampleMode, useSampleMode } from '../data/sample/mode';
import { AREAS, readGrade, type Area, type CutTable, type GradeRead, type MockScore } from '../domain/mock';
import { mockTrend } from '../domain/mockTrend';
import { CORE, gradesForMinimum, judgeMinimum, minimumSum, type Core, type Judged, type Verdict } from '../domain/minimum';
import type { MockGrades } from '../domain/scoreImport';
import { gradeSummary, semesters, type StudentBackup } from '../domain/student';
import type { ApplicationPlan } from '../domain/planner';
import { passesReview } from '../engine/types';
import { studentDb, useStudent } from '../store/studentDb';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { ScreenActions } from './ScreenActions';
import { SegmentedControl } from './SegmentedControl';
import { UniversityLogo } from './UniversityLogo';
import { TargetMinimumReference } from './TargetMinimumReference';
import '../styles/score-trend.css';

/* 성적 추이 — work/score-trend/02-spec.md · Figma 346:277667(score-trend/390 346:277668 · score-trend/1440 346:277682 + 상태 33장).
   모의고사가 처음 선택되고, 목표 대학 수능 최저 현황은 본문(모바일) · 오른쪽 보조 패널(PC)에 늘 보여요.
   예상 등급은 검수된(샘플 모드는 sample 표식) 등급컷 표 읽기만 하고, 범위 · 검수 전은 숫자를 만들지 않아요(NEVER-1). */

// ── 숫자 · 문장
const r1 = (v: number) => Math.round(v * 10) / 10;
const f1 = (v: number) => r1(v).toFixed(1);
const fg = (v: number) => Number.isInteger(v) ? String(v) : f1(v); // 등급 3 · 3.5
const FINAL_DIGIT = '0136780'; // 영·일·삼·육·칠·팔 = 받침 있음
const hasFinal = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
const ida = (s: string) => /\d$/.test(s) ? (FINAL_DIGIT.includes(s.at(-1)!) ? '이에요' : '예요') : '이에요';
const monthOf = (exam: string) => exam.match(/(\d{1,2})월/)?.[1];
const shortExam = (exam: string) => monthOf(exam) ? `${monthOf(exam)}월` : exam.replace(/\(.*\)/, '').trim();
const semLabel = (s: string) => `${s[0]}학년 ${s[2]}학기`;
function moved(first: number, last: number, from: string) {
  const d = r1(first - last);
  return d > 0 ? `${from}보다 ${f1(d)}등급 좋아졌어요` : d < 0 ? `${from}보다 ${f1(-d)}등급 내려갔어요` : `${from}와 같아요`;
}
const range = (vals: number[]) => { const lo = Math.min(...vals), hi = Math.max(...vals); return lo === hi ? f1(lo) : `${f1(lo)}~${f1(hi)}`; };

// ── 모의고사 표 · 계열
type Cell = { text: string; value: number | null; range?: boolean };
const single = (g: GradeRead) => g.status === 'ready' && g.min === g.max;
function areaCell(raw: number | undefined, g: GradeRead): Cell {
  if (raw === undefined) return { text: '—', value: null };
  if (g.status !== 'ready') return { text: '준비 중', value: null };
  return g.min === g.max ? { text: String(g.min), value: g.min } : { text: `${g.min}~${g.max}`, value: null, range: true };
}
/** 탐구 = 탐구1 · 탐구2 등급 평균(시안 3.5). 한 과목만 있으면 그 과목. 범위 · 준비 중이 섞이면 숫자를 내지 않아요. */
function tamguCell(raw: MockScore['raw'], table: CutTable | undefined): Cell {
  const keys = (['탐구1', '탐구2'] as Area[]).filter(k => raw[k] !== undefined);
  const used = keys.length ? keys : (['통합사회', '통합과학'] as Area[]).filter(k => raw[k] !== undefined);
  if (!used.length) return { text: '—', value: null };
  const gs = used.map(k => readGrade(raw[k], k, table));
  if (gs.some(g => g.status !== 'ready')) return { text: '준비 중', value: null };
  if (!gs.every(single)) return { text: gs.map(g => g.status === 'ready' ? (g.min === g.max ? g.min : `${g.min}~${g.max}`) : '').join('·'), value: null, range: true };
  const v = gs.reduce((n, g) => n + (g as { min: number }).min, 0) / gs.length;
  return { text: fg(v), value: v };
}
export interface MockRow { exam: string; label: string; order: number; raw: MockScore['raw']; cells: Record<'국어' | '수학' | '영어' | '탐구' | '평균', Cell> }
export function mockRows(mocks: readonly MockScore[]): MockRow[] {
  const tables = [...new Set(mocks.map(m => m.exam))].map(cutTableFor).filter((t): t is CutTable => !!t);
  return mockTrend(mocks, tables, mockExams).map(row => {
    const table = tables.find(t => t.exam === row.exam);
    const area = (k: Area) => { const a = row.areas.find(x => x.key === k)!; return areaCell(a.raw, a.grade); };
    const cells = { 국어: area('국어'), 수학: area('수학'), 영어: area('영어'), 탐구: tamguCell(row.raw, table) } as MockRow['cells'];
    const four = [cells.국어, cells.수학, cells.영어, cells.탐구];
    const avg = four.every(c => c.value !== null) ? r1(four.reduce((n, c) => n + c.value!, 0) / 4) : null;
    cells.평균 = avg === null ? { text: '—', value: null } : { text: f1(avg), value: avg };
    return { exam: row.exam, label: shortExam(row.exam), order: row.order, raw: row.raw, cells };
  });
}
const MOCK_AREAS = ['평균', '국어', '수학', '영어', '탐구'] as const;
type MockArea = typeof MOCK_AREAS[number];

// ── 내신
const SCHOOL_AREAS = ['전 교과', '국어', '수학', '영어', '사회', '과학'] as const;
type SchoolArea = typeof SCHOOL_AREAS[number];
const SHORT: Record<string, string> = { 국어: '국', 수학: '수', 영어: '영', 사회: '사', 과학: '과', 탐구: '탐' };
export function schoolSeries(grades: StudentBackup['grades']) {
  const avg = (gs: typeof grades, group?: string) => { const a = gradeSummary(gs, group ? [group] : undefined).average; return a === null ? null : r1(a); };
  const last = semesters.reduce((n, s, i) => gradeSummary(grades.filter(g => g.semester === s)).average !== null ? i : n, -1);
  const cols = semesters.slice(0, last + 1);
  return {
    columns: [...cols],
    series: SCHOOL_AREAS.map(name => ({ name, values: cols.map(s => avg(grades.filter(g => g.semester === s), name === '전 교과' ? undefined : name)) })),
    total: SCHOOL_AREAS.map(name => avg(grades, name === '전 교과' ? undefined : name)),
  };
}

// ── 수능 최저(목표 대학)
const MARK: Partial<Record<Verdict, string>> = { 충족: '●', 근접: '▲', 미충족: '✕' };
const TONE: Record<Verdict, string> = { 충족: 'safe', 근접: 'fit', 미충족: 'risk', '자료 부족': 'none', '판정 불가': 'none' };
type TargetRow = { no: number; app: ApplicationPlan; m: MinimumCriterion | null; judged: Judged | null; sum: number | null; need: string; picked: string };
function lower(g: MockGrades, a: Core): MockGrades {
  const grades = { ...g.grades };
  for (const k of a === '탐구' ? ['탐구1', '탐구2'] : [a]) if (typeof grades[k] === 'number') grades[k] = Math.max(1, grades[k]! - 1);
  return { ...g, grades };
}
function targetRows(apps: ApplicationPlan[], mock: MockScore | undefined): TargetRow[] {
  const minimums = isSampleMode() ? sampleMinimums : [];
  const g = mock ? gradesForMinimum(mock, cutTableFor(mock.exam)) : null;
  return apps.map((app, i) => {
    const m = minimums.find(x => x.university === app.university) ?? null;
    if (!m || !passesReview(m)) return { no: i + 1, app, m, judged: null, sum: null, need: '기준 검수 전이라 판정하지 않았어요', picked: '' };
    const c = m.criterion, judged = judgeMinimum(mock?.exam ?? '', g ?? undefined, c), sum = g ? minimumSum(g, c) : null, v = judged.values;
    const rest = CORE.filter(a => c.areas.includes(a) && a !== c.required && v[a] !== undefined).sort((a, b) => v[a]! - v[b]!);
    const picked = [...(c.required ? [c.required] : []), ...rest].slice(0, c.count).map(a => `${a} ${v[a]}`).join(' + ');
    let need = judged.reason;
    if (judged.verdict === '충족') need = '지금 성적으로 충족해요. 이 등급을 지키면 돼요';
    if (judged.verdict === '미충족' && sum !== null) need = `등급 합을 ${sum - c.sum} 줄여야 해요`;
    if (judged.verdict === '근접' && g) {
      const ok = CORE.filter(a => c.areas.includes(a) && v[a] !== undefined && v[a]! > 1 && (minimumSum(lower(g, a), c) ?? 99) <= c.sum);
      const head = ok.slice(0, -1).join(', '), or = head && (hasFinal(head) ? '이나' : '나');
      need = `${ok.length > 1 ? `${head}${or} ${ok.at(-1)} 중 하나만` : `${ok[0]}만`} 1등급 올리면 충족해요`;
    }
    return { no: i + 1, app, m, judged, sum, need, picked };
  });
}
function traceSteps(t: TargetRow, exam: string): [string, string][] {
  const c = t.m!.criterion, ym = exam.match(/(\d{4})년 (\d{1,2})월/);
  const rule: Record<Verdict, string> = { 근접: '한 영역만 1등급 올려서 기준 안에 들면 근접', 충족: '등급 합이 기준 안이면 충족', 미충족: '한 영역을 1등급 올려도 기준 밖이면 미충족', '자료 부족': '필요한 영역 성적이 없으면 자료 부족', '판정 불가': '대학 기준이 없으면 판정 불가' };
  return [
    ['기준 시험', ym ? `${ym[1]} ${ym[2]}월 모의고사` : exam],
    ['반영 영역', `${t.m!.scope.replace(/\s*중$/, '')} 중 ${c.count}개${c.required ? `, ${c.required} 포함` : ''}`],
    ['고른 영역', t.picked ? `${t.picked} (${c.required ? `${c.required}은 꼭 넣고, 나머지는 ` : ''}가장 좋은 등급)` : '—'],
    ['등급 합', t.sum === null ? '—' : String(t.sum)],
    ['기준', `${c.sum} 이내`],
    ['판정 규칙', rule[t.judged!.verdict]],
  ];
}
const saveTargets = (ids: string[]) => studentDb.saveTargetPriorities(ids);
/** 정한 순위가 없으면 최저 기준이 있는 지원 준비 전형부터 3개. */
function defaultTargets(apps: ApplicationPlan[]) {
  const has = (a: ApplicationPlan) => (isSampleMode() ? sampleMinimums : []).some(m => m.university === a.university);
  return [...apps.filter(has), ...apps.filter(a => !has(a))].slice(0, 3).map(a => a.id);
}

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

// ── grade-trend-chart: 1이 위, 고른 계열만 2px Route Blue + 점, 나머지 1px text-faint + 선 끝 이름표. 빈 값 · 범위는 선을 끊어요.
type Series = { name: string; values: (number | null)[] };
function ticksFor(series: Series[], school: boolean, full: boolean): number[] {
  const vals = series.flatMap(s => s.values).filter((v): v is number => v !== null);
  const make = (lo: number, hi: number, step: number) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => r1(lo + i * step));
  if (full || !vals.length) return school ? make(1, 5, 0.5) : make(1, 9, 1);
  const min = Math.min(...vals), max = Math.max(...vals);
  // 내신 = 데이터 ±0.5, 모의고사 = 1~5 기본(demo-dataset 그래프 축 기본값), 넘치면 늘려요
  if (school) return make(Math.floor((min - 0.5) * 2) / 2, Math.ceil((max + 0.5) * 2) / 2, 0.5);
  const lo = Math.max(1, Math.floor(min - 0.5)), hi = Math.min(9, Math.max(5, Math.ceil(max + 0.5)));
  return make(lo, hi, hi - lo > 4 ? 1 : 0.5);
}
function TrendChart({ label, columns, series, selected, ticks, school, accentValue }: { label: string; columns: string[]; series: Series[]; selected: string; ticks: number[]; school: boolean; accentValue: boolean }) {
  const ref = useRef<SVGSVGElement>(null), [W, setW] = useState(350);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const update = () => { if (el.clientWidth) setW(el.clientWidth); };
    update();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(update); ro.observe(el); return () => ro.disconnect();
  }, []);
  const H = 220, TOP = 12, BOTTOM = 180, lo = ticks[0], hi = ticks.at(-1)!;
  // 시안처럼 점 · 선 위치를 정수 px로 반올림해요(2px 선이 흐려지지 않게)
  const x = (i: number) => Math.round(columns.length < 2 ? (W - 64) / 2 : 32 + i * (W - 96) / (columns.length - 1));
  const y = (v: number) => Math.round(TOP + (v - lo) * (BOTTOM - TOP) / (hi - lo));
  const path = (vals: (number | null)[]) => vals.map((v, i) => v === null ? '' : `${i && vals[i - 1] !== null ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
  const tick = (v: number) => school ? v.toFixed(1) : String(v);
  const sel = series.find(s => s.name === selected)!;
  const lastOf = (s: Series) => s.values.at(-1) ?? null;
  const ends = series.map((s, order) => ({ s, order, v: lastOf(s) })).filter(e => e.v !== null)
    .sort((a, b) => a.v! - b.v! || Number(b.s.name === selected) - Number(a.s.name === selected) || a.order - b.order);
  let prev = -Infinity; // 시안: 이름표 상자(17)를 값 높이에 두고 겹치면 13씩 아래로
  const tops = ends.map(e => (prev = Math.max(y(e.v!) - 8.5, prev + 13)));
  const firstIdx = sel.values.findIndex(v => v !== null), lastIdx = sel.values.map((v, i) => v === null ? -1 : i).filter(i => i >= 0).at(-1) ?? -1;
  const base = firstIdx >= 0 && lastIdx > firstIdx ? sel.values[firstIdx]! : null;
  const read = sel.values.map((v, i) => `${columns[i]} ${v === null ? '표시할 등급 없음' : school ? v.toFixed(1) : fg(v)}`).join(', ');
  return <svg ref={ref} className="trend-chart trd-chart" width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} ${selected} 등급, ${read}. 1등급이 위예요.`}>
    {ticks.map(t => <text key={t} x={24} y={y(t) + 4} textAnchor="end" className="trd-tick">{tick(t)}</text>)}
    {columns.map((c, i) => <text key={c + i} x={x(i)} y={201} textAnchor="middle" className="trd-tick">{c}</text>)}
    {base !== null && <><line x1={x(firstIdx)} x2={x(lastIdx)} y1={y(base) + 0.5} y2={y(base) + 0.5} className="trd-baseline" />
      <text x={x(firstIdx)} y={y(base) - 8} className="trd-tick">{columns[firstIdx]} {school ? base.toFixed(1) : fg(base)}</text></>}
    {series.filter(s => s.name !== selected).map(s => <path key={s.name} d={path(s.values)} className="trd-line" />)}
    <path d={path(sel.values)} className="trd-line trd-line--on" />
    {sel.values.map((v, i) => v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={4.5} className="trd-dot" />)}
    {ends.map((e, i) => <text key={e.s.name} x={W - 56} y={tops[i] + 13} className={e.s.name === selected ? `trd-tick trd-tick--value${accentValue ? ' trd-tick--accent' : ''}` : 'trd-tick'}>{e.s.name === selected ? (school ? e.v!.toFixed(1) : fg(e.v!)) : e.s.name}</text>)}
  </svg>;
}

function Judge({ verdict, plain = false }: { verdict: Verdict; plain?: boolean }) {
  const mark = MARK[verdict], tone = TONE[verdict];
  return <span className={`judge-badge trd-badge trd-badge--${tone}${plain ? ' trd-badge--plain' : ''}`}>{mark && <span className={`trd-mark trd-mark--${tone}`} aria-hidden="true" />}<span>{verdict}</span></span>;
}
const Badge = ({ children }: { children: ReactNode }) => <span className="data-status-badge trd-status">{children}</span>;
function Note({ children }: { children: ReactNode }) {
  return <p className="disclaimer-note trd-note"><Icon name="info" size={16} /><span>{children}</span></p>;
}

// ── 화면
export function ScoreTrendScreen() {
  useSampleMode();
  const state = useStudent(), desktop = useDesktop();
  const actions = desktop && <><span className="data-status-badge trd-asof">데이터 기준일 {dataAsOf}</span><Link className="button-outline" to="/grade-input">성적 입력·수정</Link></>;
  return <section data-slug="score-trend" aria-label="성적 추이" className="student-screen score-trend">
    <div className="screen-heading"><h2 className="t-heading-1">성적 추이</h2><ScreenActions>{actions}</ScreenActions></div>
    {!state ? <p role="status" className="t-body-sm text-muted trd-loading">기기에 저장된 성적을 읽고 있어요.</p>
      : !state.data ? <div className="trd-error" role="alert"><Icon name="triangle-alert" size={20} /><p>{state.error || '이 브라우저에서 기기 저장소를 열 수 없어요. 저장 권한과 비공개 모드를 확인해 주세요.'}</p><button type="button" className="button-outline" onClick={() => window.location.reload()}>다시 불러오기</button></div>
      : <ScoreTrendContent data={state.data} desktop={desktop} />}
  </section>;
}

export function ScoreTrendContent({ data, desktop = false, onSaveTargets = saveTargets }: { data: StudentBackup; desktop?: boolean; onSaveTargets?: (ids: string[]) => Promise<void> }) {
  const sample = isSampleMode();
  const stored = data.mocks ?? [];
  const mocks = sample ? [...stored, ...sampleTrendMocks.filter(s => !stored.some(m => m.exam === s.exam))] : stored;
  const rows = mockRows(mocks), known = rows.filter(r => r.order >= 0), unknown = rows.filter(r => r.order < 0);
  const school = schoolSeries(data.grades);
  const [kind, setKind] = useState<'mock' | 'school'>('mock');
  const [mockArea, setMockArea] = useState<MockArea>('평균'), [schoolArea, setSchoolArea] = useState<SchoolArea>('전 교과');
  const [mockFull, setMockFull] = useState(false), [schoolFull, setSchoolFull] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null), [targetsOpen, setTargetsOpen] = useState(false);
  const [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t); }, [toast]);
  const [targetIds, setTargetIds] = useState<string[] | null>(null);
  useEffect(() => setTargetIds(null), [data.targetPriorities]);

  // 모의고사 계열
  const mockCols = known.map(r => r.label);
  const mockSeries: Series[] = MOCK_AREAS.map(a => ({ name: a, values: known.map(r => r.cells[a].value) }));
  const avgVals = known.map(r => r.cells.평균.value).filter((v): v is number => v !== null);
  const avgRows = known.filter(r => r.cells.평균.value !== null), firstAvg = avgRows[0], lastAvg = avgRows.at(-1);
  const examSpan = known.length ? (() => { const a = known[0].exam.match(/(\d{4})년 (\d{1,2})월/), b = known.at(-1)!.exam.match(/(\d{4})년 (\d{1,2})월/);
    return a && b ? `${a[1]}년 ${a[2]}월${known.length > 1 ? `~${a[1] === b[1] ? '' : `${b[1]}년 `}${b[2]}월` : ''}` : shortExam(known[0].exam); })() : '';
  // 내신 계열
  const schoolCols = school.columns, schoolAll = school.series[0].values;
  const schoolVals = schoolAll.filter((v): v is number => v !== null);
  const firstSem = schoolCols[schoolAll.findIndex(v => v !== null)], lastSemIdx = schoolAll.map((v, i) => v === null ? -1 : i).filter(i => i >= 0).at(-1) ?? -1;

  const mockSummary = !avgVals.length ? '평균을 낼 수 있는 회차가 아직 없어요. 표에서 원점수를 확인할 수 있어요.'
    : avgVals.length === 1 ? `모의고사가 한 번 있어요. ${firstAvg!.label} 평균은 ${f1(avgVals[0])}등급이에요.`
    : `최근 ${avgVals.length}회 평균 등급 범위는 ${range(avgVals)}${ida(range(avgVals))}. ${moved(firstAvg!.cells.평균.value!, lastAvg!.cells.평균.value!, firstAvg!.label)}.`;
  const schoolSummary = !schoolVals.length ? '' : schoolVals.length === 1 ? `${semLabel(firstSem)} 전 교과 평균은 ${f1(schoolVals[0])}등급이에요.`
    : `최근 ${schoolVals.length}학기 전 교과 평균 범위는 ${range(schoolVals)}${ida(range(schoolVals))}. ${moved(schoolVals[0], schoolVals.at(-1)!, semLabel(firstSem))}.`;

  // 목표 대학
  const apps = data.planning?.applications ?? [];
  const ids = (targetIds ?? data.targetPriorities ?? defaultTargets(apps)).filter(id => apps.some(a => a.id === id)).slice(0, 3);
  const basisRow = known.at(-1);
  const basis = basisRow ? mocks.find(m => m.exam === basisRow.exam) : undefined;
  const targets = targetRows(ids.map(id => apps.find(a => a.id === id)!), basis);
  const active = targets.find(t => t.no === selected && t.judged) ?? targets.find(t => t.judged);
  const count = (v: Verdict) => targets.filter(t => t.judged?.verdict === v).length;
  const pending = targets.filter(t => !t.judged).length;

  // ── 조각
  const segMock = <SegmentedControl label="모의고사 영역" value={mockArea} onChange={setMockArea} options={MOCK_AREAS.map(a => ({ value: a, label: a }))} />;
  const segSchool = <SegmentedControl label="내신 교과" value={schoolArea} onChange={setSchoolArea} options={SCHOOL_AREAS.map(a => ({ value: a, label: a }))} />;
  const fullButton = (on: boolean, set: (v: boolean) => void) => <button type="button" className="button-pill-soft trd-full" aria-pressed={on} onClick={() => set(!on)}>{on && <Icon name="check" size={16} />}전체 눈금</button>;
  const selMock = mockSeries.find(s => s.name === mockArea)!, selSchool = school.series.find(s => s.name === schoolArea)!;
  const rangeRows = known.filter(r => r.cells[mockArea].range);
  const mockChart = !rows.length ? null : !selMock.values.some(v => v !== null)
    ? <div className="trd-pending"><Badge>준비 중</Badge><p className="t-body-sm">{mockArea}의 표시할 등급이 없어요. 검수된 등급컷이 등록되면 추이를 보여 드려요.</p></div>
    : <><TrendChart label="모의고사" columns={mockCols} series={mockSeries} selected={mockArea} ticks={ticksFor(mockSeries, false, mockFull)} school={false} accentValue={!desktop} />
      {known.length === 1 && <p className="t-caption text-muted trd-chart-note">한 번뿐이라 선으로 잇지 않았어요. 다음 회차를 넣으면 흐름이 보여요.</p>}
      {rangeRows.length > 0 && <p className="t-caption text-muted trd-chart-note">{rangeRows.map(r => r.label).join(' · ')}은 예상 등급이 {rangeRows.map(r => r.cells[mockArea].text).join(' · ')}등급 범위라 점으로 찍지 않았어요. 표에서 볼 수 있어요.</p>}</>;
  const schoolChart = selSchool.values.some(v => v !== null)
    ? <TrendChart label="내신" columns={schoolCols} series={school.series} selected={schoolArea} ticks={ticksFor(school.series, true, schoolFull)} school accentValue={!desktop} />
    : <div className="trd-pending"><p className="t-body-sm">{schoolArea}의 평균을 낼 수 있는 성적이 없어요.</p></div>;

  const mockCols6 = desktop ? ['국', '수', '영', '탐'] : ['국어', '수학', '영어', '탐구'];
  const lastKnown = known.at(-1)?.exam;
  const mockTable = <table className="data-table trd-table trd-table--mock"><caption className="sr-only">모의고사 회차별 영역 등급. 회차를 누르면 원점수를 볼 수 있어요.</caption>
    <thead><tr><th scope="col">회차</th>{mockCols6.map(c => <th scope="col" key={c} className="num">{c}</th>)}<th scope="col" className="num">평균</th></tr></thead>
    <tbody>{rows.map(r => {
      const open = expanded === r.exam, latest = r.exam === lastKnown && !open;
      return [<tr key={r.exam} className={latest ? 'is-selected' : undefined}>
        <th scope="row">{r.order < 0 ? <Link className="trd-rowlink" aria-label={`${r.exam} 성적 수정`} to={`/mock-score?exam=${encodeURIComponent(r.exam)}`}>순서 미확인</Link>
          : <button type="button" className="trd-rowbtn" aria-expanded={open} aria-label={`${r.exam} 원점수 ${open ? '접기' : '펼치기'}`} onClick={() => setExpanded(open ? null : r.exam)}>{r.label}</button>}</th>
        {(['국어', '수학', '영어', '탐구', '평균'] as const).map(a => <td key={a} className="num">{r.cells[a].text}</td>)}</tr>,
      open && <tr key={`${r.exam}-raw`} className="trd-expand"><td colSpan={6}><table className="trd-rawtable"><caption className="sr-only">{r.exam} 원점수</caption><thead><tr><th scope="col">영역</th><th scope="col" className="num">원점수</th><th scope="col" className="num">예상 등급</th></tr></thead>
        <tbody>{AREAS.filter(a => r.raw[a.key] !== undefined).map(({ key: a, max }) => { const g = readGrade(r.raw[a], a, cutTableFor(r.exam));
          return <tr key={a}><th scope="row">{a}</th><td className="num">{r.raw[a]}/{max}</td><td className="num">{g.status === 'ready' ? (g.min === g.max ? g.min : `${g.min}~${g.max}`) : '준비 중'}</td></tr>; })}</tbody></table>
        <Link className="t-link" to={`/mock-score?exam=${encodeURIComponent(r.exam)}`}>{r.label} 성적 수정 ›</Link></td></tr>];
    })}</tbody></table>;
  const schoolTable = <table className="data-table trd-table trd-table--school"><caption className="sr-only">내신 학기별 교과 평균 등급</caption>
    <thead><tr><th scope="col">학기</th>{SCHOOL_AREAS.map(a => <th scope="col" key={a} className="num">{a === '전 교과' ? a : SHORT[a]}</th>)}</tr></thead>
    <tbody>{schoolCols.map((s, i) => <tr key={s} className={i === lastSemIdx ? 'is-selected' : undefined}><th scope="row">{s}</th>{school.series.map(se => <td key={se.name} className="num">{se.values[i] === null ? '—' : se.values[i]!.toFixed(1)}</td>)}</tr>)}
      <tr><th scope="row">전체</th>{school.total.map((v, i) => <td key={i} className="num">{v === null ? '—' : v.toFixed(1)}</td>)}</tr></tbody></table>;
  const mockLink = <Link className="t-link trd-link" to="/mock-score">모의고사 성적 입력·수정 ›</Link>;
  const orderNote = unknown.length > 0 && <p className="t-caption text-muted trd-chart-note">시험 목록 밖의 기록 {unknown.length}개는 차트에 넣지 않았어요. 성적 입력에서 시험을 다시 골라 주세요.</p>;
  const empty = (title: string, body: string, action: ReactNode) => <div className="empty-state trd-empty"><Icon name="chart-column" size={48} /><h3 className="t-heading-4">{title}</h3><p className="t-body-sm">{body}</p>{action}</div>;
  const mockEmpty = empty('아직 입력한 모의고사 성적이 없어요', '원점수를 입력하면 회차별 흐름을 선으로 보여 드려요.', <Link className="button-primary" to="/mock-score">모의고사 성적 입력</Link>);
  const schoolEmpty = empty('평균을 낼 수 있는 내신 성적이 없어요', '과목과 등급을 입력하면 학기별 추이를 볼 수 있어요.', <Link className="button-primary" to="/grade-input">내신 성적 입력</Link>);

  const targetItem = (t: TargetRow) => {
    const on = desktop && active && t === active;
    const criteria = t.m && t.judged ? `${t.m.scope} ${t.m.rule}${t.m.extra ? ` · ${t.m.extra}` : ''}` : '';
    const value = t.judged && <div className="trd-result">{t.sum !== null && <span className="trd-value"><strong className="num">{t.sum}</strong><span className="num"> / 기준 {t.m!.criterion.sum}</span></span>}<Judge verdict={t.judged.verdict} /></div>;
    const name = `${t.no}순위 · ${t.app.university} ${t.app.department}`.trim();
    return <li key={t.app.id} className={`trd-target${on ? ' is-selected' : ''}`}>
      <UniversityLogo university={t.app.university} planId={t.app.id} />
      <div className="trd-target__info">
        {desktop && t.judged ? <button type="button" className="trd-target__name" aria-pressed={!!on} onClick={() => setSelected(t.no)}>{name}</button> : <strong className="trd-target__name">{name}</strong>}
        {criteria && <span className="trd-target__criteria">{criteria}</span>}
        <Badge>{t.judged ? '모집요강 반영' : '준비 중'}</Badge>
        {desktop && value}
        <p className="trd-target__need">{t.need}</p>
        {!sample && <TargetMinimumReference key={JSON.stringify([t.app.year, t.app.university, t.app.program, t.app.department, t.app.source_selection])} target={t.app} />}
      </div>
      {!desktop && value}
    </li>;
  };
  const trace = (open: boolean) => active && <details className="trace-accordion trd-trace" open={open || undefined}><summary><span>어떻게 계산했나요?{desktop ? ` · ${active.app.university}` : ''}</span><Icon name="chevron-down" size={20} /></summary>
    <ol>{traceSteps(active, basis!.exam).map(([l, v], i) => <li key={l}><span className="trd-trace__label">{i + 1}. {l}</span><span className="trd-trace__value">{v}</span></li>)}
      <li className="trd-trace__final"><span>결과</span><span>{active.judged!.verdict}</span></li></ol>
    {!desktop && <div className="trd-judgeline"><Judge verdict={active.judged!.verdict} /><p>{active.need}</p></div>}
  </details>;
  const caption = basisRow ? `${basisRow.label} 모의고사 기준` : '';
  const targetList = !apps.length || !ids.length
    ? empty('목표 대학을 정하면 최저 현황을 볼 수 있어요', '지원 준비에 등록한 대학 중 1~3순위까지 정할 수 있어요.', <button type="button" className="button-primary" onClick={() => setTargetsOpen(true)}>목표 대학 정하기</button>)
    : <>{!basis && <p className="t-body-sm text-muted trd-target-msg">모의고사 성적을 넣으면 목표 대학 최저 현황을 볼 수 있어요.</p>}<ul className="trd-targets__list">{targets.map(targetItem)}</ul></>;
  const note = <Note>대학 공식 모집요강이 최종 기준이에요 · 충족 현황은 모의고사 등급으로 본 참고 정보예요 · 모의고사 등급은 성적 통지표가 최종 기준이에요 · {sample ? `데이터 기준일 ${dataAsOf} · 샘플의 대학·숫자는 예시예요` : '참고자료별 원문 수집일은 근거에서 확인해 주세요'}</Note>;
  const dialogs = <>{targetsOpen && <TargetPicker apps={apps} ids={ids} desktop={desktop} onClose={() => setTargetsOpen(false)} onSave={async next => { await onSaveTargets(next); setTargetIds(next); setTargetsOpen(false); setToast('목표 대학을 저장했어요'); }} />}
    {toast && <p className="toast" role="status">{toast}</p>}</>;

  if (!desktop) {
    const isMock = kind === 'mock';
    const actionSlot = document.getElementById('appbar-actions');
    const targetAction = <button type="button" className="button-pill-soft trd-target-action" aria-haspopup="dialog" onClick={() => setTargetsOpen(true)}>목표 대학</button>;
    return <div className="trd-mobile">
      {actionSlot ? createPortal(targetAction, actionSlot) : targetAction}
      <SegmentedControl label="성적 종류" value={kind} onChange={setKind} options={[{ value: 'school', label: '내신' }, { value: 'mock', label: '모의고사' }]} />
      {isMock ? (!rows.length ? mockEmpty : <>
        <p className="trd-summary">{mockSummary.split(/(\d+\.\d등급 (?:좋아졌어요|내려갔어요)\.)/).map((part, i) => i % 2 ? <span className="trd-summary-change" key={i}>{part}</span> : part)}</p>{segMock}
        <div className="trd-chart-block"><div className="trd-chart-head"><span className="t-caption text-muted">{examSpan} 모의고사 · 1등급이 위예요</span>{fullButton(mockFull, setMockFull)}</div>{mockChart}</div>
        <div className="trd-table-block">{mockTable}{orderNote}{mockLink}</div></>)
        : !schoolVals.length ? schoolEmpty : <>
        <p className="trd-summary">{schoolSummary}</p>{segSchool}
        <div className="trd-chart-block"><div className="trd-chart-head"><span className="t-caption text-muted">{semLabel(schoolCols[0])}~{semLabel(schoolCols[lastSemIdx])} · 5등급제 · 1등급이 위예요</span>{fullButton(schoolFull, setSchoolFull)}</div>{schoolChart}</div>
        <div className="trd-table-block">{schoolTable}<Link className="t-link trd-link" to="/grade-input">내신 성적 입력·수정 ›</Link></div></>}
      <section className="trd-targets" aria-labelledby="trd-targets-title"><div className="trd-targets__head"><h3 id="trd-targets-title">목표 대학 최저 현황</h3>{caption && <span className="t-caption text-muted">{caption}</span>}</div>{targetList}</section>
      {basis && trace(false)}
      {note}{dialogs}
    </div>;
  }

  const lastSem = lastSemIdx >= 0 ? schoolCols[lastSemIdx] : null;
  const both = [avgVals.length > 1 && r1(avgVals[0] - avgVals.at(-1)!) > 0, schoolVals.length > 1 && r1(schoolVals[0] - schoolVals.at(-1)!) > 0];
  const pcSummary = [avgVals.length ? `모의고사는 최근 ${avgVals.length}회 평균 범위 ${range(avgVals)}` : '', schoolVals.length ? `내신은 ${schoolVals.length}학기 전 교과 평균 범위 ${range(schoolVals)}` : ''].filter(Boolean).join(', ');
  const improved = both[0] && both[1] ? ' 둘 다 처음보다 좋아졌어요.' : both[0] ? ' 모의고사는 처음보다 좋아졌어요.' : both[1] ? ' 내신은 처음보다 좋아졌어요.' : '';
  return <div className="trd-layout">
    <div className="trd-main">
      <div className="trd-band">
        <div className="stat-tile trd-hero"><span className="t-caption text-muted">최근 모의고사 평균</span><strong>{lastAvg ? `${f1(lastAvg.cells.평균.value!)}등급` : '—'}</strong>
          <p>{lastAvg ? (avgVals.length > 1 ? `${lastAvg.label} · ${moved(firstAvg!.cells.평균.value!, lastAvg.cells.평균.value!, firstAvg!.label)}` : `${lastAvg.label} · 한 번 본 시험이에요`) : '성적 입력 전이에요'}</p></div>
        <div className="trd-side">
          <div className="trd-pairs">
            <div className="trd-pair"><span>모의고사 평균 범위</span><strong className="num">{avgVals.length ? range(avgVals) : '—'}</strong><span>최근 {avgVals.length}회</span></div>
            <div className="trd-pair"><span>최근 내신 평균</span><strong className="num">{lastSem ? `${f1(schoolAll[lastSemIdx]!)}등급` : '—'}</strong><span>{lastSem ? `${semLabel(lastSem)} · 5등급제` : '성적 입력 전'}</span></div>
            <div className="trd-pair"><span>목표 대학 최저</span><strong className="num trd-pair__judge">{targets.some(t => t.judged) ? (['충족', '근접', '미충족', '자료 부족'] as Verdict[]).filter(v => count(v)).map(v => <span key={v} className="trd-pair__count"><Judge verdict={v} plain />{count(v)}</span>) : '—'}</strong></div>
          </div>
          {pending > 0 && <span className="trd-side__sub">검수 전이라 판정하지 않은 전형 {pending}개</span>}
        </div>
      </div>
      {pcSummary && <p className="trd-pc-summary">{pcSummary}{ida(pcSummary)}.{improved}</p>}
      <div className="trd-cards">
        <article className="trd-card" aria-labelledby="trd-school-title">
          <div className="trd-card__head"><div><h3 id="trd-school-title">내신 학기별 평균 등급</h3><p className="t-caption text-muted">{schoolVals.length}학기 · 5등급제 · 1등급이 위예요</p></div>{schoolVals.length > 0 && fullButton(schoolFull, setSchoolFull)}</div>
          {schoolVals.length ? <>{segSchool}{schoolChart}{schoolTable}</> : schoolEmpty}
        </article>
        <article className="trd-card" aria-labelledby="trd-mock-title">
          <div className="trd-card__head"><div><h3 id="trd-mock-title">모의고사 영역별 등급</h3><p className="t-caption text-muted">{examSpan ? `${examSpan} · ` : ''}1등급이 위예요</p></div>{rows.length > 0 && fullButton(mockFull, setMockFull)}</div>
          {rows.length ? <>{segMock}{mockChart}{mockTable}{orderNote}{mockLink}</> : empty('아직 입력한 모의고사 성적이 없어요', '원점수를 입력하면 회차별 흐름을 선으로 보여 드려요.', <Link className="t-link" to="/mock-score">모의고사 성적 입력 ›</Link>)}
        </article>
      </div>
    </div>
    <aside className="trd-panel" aria-labelledby="trd-panel-title">
      <div className="trd-panel__head"><div><h3 id="trd-panel-title">목표 대학 최저 현황</h3>{caption && <p className="t-caption text-muted">{caption}</p>}</div>{ids.length > 0 && <button type="button" className="button-pill-soft" onClick={() => setTargetsOpen(true)}>목표 대학 바꾸기</button>}</div>
      {targetList}
      {basis && trace(true)}
      {active && basis && <div className="trd-judgeline"><Judge verdict={active.judged!.verdict} /><p>{active.need}</p></div>}
      {note}
    </aside>
    {dialogs}
  </div>;
}

/** 목표 대학 정하기(390-target-sheet · 1440-target-modal): 지원 준비 전형 중 1~3순위. 바꾼 뒤 닫으면 확인 창. */
function TargetPicker({ apps, ids, desktop, onClose, onSave }: { apps: ApplicationPlan[]; ids: string[]; desktop: boolean; onClose: () => void; onSave: (ids: string[]) => Promise<void> }) {
  const initial = [ids[0] ?? apps[0]?.id ?? '', ids[1] ?? '', ids[2] ?? ''];
  const [draft, setDraft] = useState<string[]>(initial);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const saving = useRef(false);
  const changed = draft.join() !== initial.join();
  const close = () => { if (!saving.current) { if (changed) setConfirm(true); else onClose(); } };
  const save = async () => {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try { await onSave(draft.filter(Boolean)); } catch { setError('目標'.replace('目標', '목표') + ' 대학을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { saving.current = false; setBusy(false); }
  };
  if (confirm) return <Modal label="저장하지 않고 닫을까요?" onClose={() => setConfirm(false)}><div className="trd-dialog">
    <h3 className="t-heading-4">저장하지 않고 닫을까요?</h3><p>바꾼 목표 대학 순위가 사라져요.</p>
    <div className="trd-dialog__actions"><button type="button" className="button-outline" onClick={() => setConfirm(false)}>계속 고르기</button><button type="button" className="button-primary" onClick={onClose}>닫기</button></div></div></Modal>;
  return <Modal label="목표 대학 정하기" onClose={close}><div className={`trd-dialog${desktop ? '' : ' trd-dialog--sheet'}`}>
    <div className="trd-dialog__head"><h3 className="t-heading-4">목표 대학 정하기</h3>{desktop && <button type="button" className="trd-dialog__close" aria-label="목표 대학 정하기 닫기" onClick={close}><Icon name="x" /></button>}</div>
    {!apps.length ? <><div className="empty-state"><h4 className="t-heading-4">지원 준비에 등록한 전형이 없어요</h4><p>원서·서류 체크리스트에서 대학과 전형을 먼저 추가해 주세요.</p><Link className="button-primary" to="/application-checklist">지원 준비로 가기</Link></div>
      <div className="trd-dialog__actions"><button type="button" className="button-outline" onClick={onClose}>닫기</button></div></>
      : <><p className="t-caption text-muted">지원 준비에 등록한 전형 중에서 골라요</p>
        {['1순위', '2순위', '3순위(선택)'].map((label, i) => <label key={label} className="trd-field">{label}
          <select className="text-input" aria-label={label} disabled={busy} value={draft[i]} onChange={e => setDraft(d => d.map((v, k) => k === i ? e.target.value : v))}>
            {i > 0 && <option value="">비워 두기</option>}
            {apps.map(a => { const used = draft.findIndex((v, k) => k !== i && v === a.id); return <option key={a.id} value={a.id} disabled={used >= 0}>{a.university} {a.department} · {a.program}{used >= 0 ? ` (${used + 1}순위에 있어요)` : ''}</option>; })}
          </select></label>)}
        <Link className="t-link" to="/application-checklist">지원할 대학·전형 관리 ›</Link>
        {error && <p role="alert">{error}</p>}
        <div className="trd-dialog__actions"><button type="button" disabled={busy} className="button-outline" onClick={close}>취소</button><button type="button" className="button-primary" disabled={busy || !draft[0]} onClick={() => void save()}>{busy ? '저장 중' : '저장'}</button></div></>}
  </div></Modal>;
}
