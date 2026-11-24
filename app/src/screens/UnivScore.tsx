import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Disclaimer } from '../components/CalculationDetails';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { ScreenActions } from '../components/ScreenActions';
import { UniversityLogo } from '../components/UniversityLogo';
import { admissionYear, dataAsOf, programs, type ProgramData } from '../data/catalog';
import { useReleasedRulesState } from '../data/releasedRules';
import { isSampleMode, useSampleMode } from '../data/sample/mode';
import { scoreUniversity } from '../engine/scoring';
import type { Trace } from '../engine/types';
import type { AttendanceRecord, GradeRecord } from '../domain/student';
import { studentDb, useStudent } from '../store/studentDb';
import { withReleasedRules } from './Results';
import '../styles/univ-score.css';

/* 대학별 환산 (work/univ-score/02-spec.md · Figma univ-score/390 346:131150 · univ-score/1440 346:131176 · 상태 31장).
   관심 대학마다 검수된 규칙으로만 교과·출결·합계를 계산해요(NEVER-1). 판정 색·판정 이름은 쓰지 않아요. */

type Sort = 'ratio' | 'diff' | 'name';
const SORTS: { key: Sort; label: string; help: string }[] = [
  { key: 'ratio', label: '환산 기준 순위', help: '대학 만점 대비 내 합계 비율 순서예요' },
  { key: 'diff', label: '순위 차이', help: '단순 평균 기준보다 환산 순위가 오른 대학부터예요' },
  { key: 'name', label: '대학 이름', help: '가나다 순서예요' },
];
const RANK_NOTE = '환산 기준 순위는 대학 만점 대비 내 합계 비율로, 단순 평균 기준 순위는 대학별 반영 교과 평균 등급으로 줄 세운 순서예요. 대학 선호도나 지원 결과를 뜻하지 않아요.';
const PENDING_NOTE = '대학 공식 자료와 대조한 규칙부터 공개해요. 등록되지 않은 대학은 임의로 계산하지 않아요.';
const ONE_NOTE = '대학을 2개 이상 담으면 유불리를 비교할 수 있어요';
const PICK_PATH = '/admissions-list';
const SHOWN_SUBJECTS = 3;

type Ready = { grade: number; attendance: number; total: number; max: number; attendance_deduction: number; average_rank: number | null };
type Row = {
  id: string; university: string; program: string; p?: ProgramData; trace: readonly Trace[];
  kind: 'ready' | 'input' | 'pending'; value?: Ready; reason?: string;
  ratioRank?: number; avgRank?: number;
};

const two = (v: number) => v.toFixed(2);
const signed = (v: number) => v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0';
const isAttendance = (reason = '') => reason.includes('출결');
const inputLine = (reason?: string) => isAttendance(reason) ? '반영 학년의 출결을 입력하면 계산해요' : reason ?? '성적을 더 입력하면 계산해요';
const inputAction = (reason?: string) => isAttendance(reason) ? '출결 입력하기' : '성적 입력하기';
const rankLine = (r: Row) => r.avgRank ? `단순 평균 기준 ${r.avgRank}위 → 이 대학 환산 기준 ${r.ratioRank}위` : `이 대학 환산 기준 ${r.ratioRank}위`;

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

/** 관심 대학(대학마다 하나) → 그 대학의 이번 학년도 전형 하나. 관심 전형과 같은 이름 → 규칙 있는 전형 → 아무 전형 순. */
function buildRows(interests: { university: string; program: string }[], all: ProgramData[], score: (p: ProgramData) => ReturnType<typeof scoreUniversity> | null): Row[] {
  const seen = new Set<string>(), rows: Row[] = [];
  for (const i of interests) {
    if (seen.has(i.university)) continue;
    seen.add(i.university);
    const mine = all.filter(p => p.university === i.university);
    const p = mine.find(x => x.rule && x.program === i.program) ?? mine.find(x => x.rule) ?? mine[0];
    const r = p?.rule ? score(p) : null;
    const base = { id: p?.id ?? `interest-${i.university}`, university: i.university, program: p?.program ?? i.program, p, trace: r?.trace ?? [] };
    if (r?.status === 'ready') rows.push({ ...base, kind: 'ready', value: r.value });
    else if (r && r.reason !== '환산 규칙 준비 중') rows.push({ ...base, kind: 'input', reason: r.reason });
    else rows.push({ ...base, kind: 'pending' });
  }
  // 순위는 계산된 대학끼리만 다시 세요.
  const ready = rows.filter(r => r.kind === 'ready');
  [...ready].sort((a, b) => b.value!.total / b.value!.max - a.value!.total / a.value!.max).forEach((r, k) => { r.ratioRank = k + 1; });
  [...ready].filter(r => r.value!.average_rank !== null).sort((a, b) => a.value!.average_rank! - b.value!.average_rank!).forEach((r, k) => { r.avgRank = k + 1; });
  return rows;
}
const diffOf = (r: Row) => r.avgRank && r.ratioRank ? r.avgRank - r.ratioRank : null;
function sortRows(rows: Row[], sort: Sort) {
  const group = (r: Row) => r.kind === 'ready' ? 0 : r.kind === 'input' ? 1 : 2; // 입력 부족은 계산된 대학 아래 · 준비 중 위
  const byName = (a: Row, b: Row) => a.university.localeCompare(b.university, 'ko');
  return [...rows].sort((a, b) => group(a) - group(b) || (group(a) ? 0
    : sort === 'name' ? byName(a, b) : sort === 'diff' ? (diffOf(b) ?? -99) - (diffOf(a) ?? -99) || a.ratioRank! - b.ratioRank! : a.ratioRank! - b.ratioRank!));
}

function TraceRows({ trace, open }: { trace: readonly Trace[]; open: boolean }) {
  const [all, setAll] = useState(false);
  const subjects = trace.filter(t => t.subject_id), hidden = all ? 0 : Math.max(0, subjects.length - SHOWN_SUBJECTS);
  const shown = new Set(subjects.slice(0, all ? subjects.length : SHOWN_SUBJECTS));
  const items = trace.filter(t => !t.subject_id || shown.has(t));
  const last = items.length - 1;
  return <details className="trace-accordion us-trace" open={open || undefined}><summary><span>어떻게 계산했나요?</span><Icon name="chevron-down" size={20} /></summary>
    {trace.length ? <ol>{items.map((t, i) => <li key={i} className={i === last ? 'us-trace__total' : undefined}><span>{t.detail}</span>{t.value !== undefined && <strong className="num">{t.value.toLocaleString('ko-KR', { maximumFractionDigits: 6 })}</strong>}
      {t.subject_id && t === subjects[Math.min(subjects.length, SHOWN_SUBJECTS) - 1] && !all && hidden > 0 && <button type="button" className="button-pill-soft" onClick={() => setAll(true)}>나머지 {hidden}과목 보기</button>}</li>)}</ol>
      : <p className="text-muted">검수된 규칙과 필요한 성적이 준비되면 계산 과정을 보여드려요.</p>}
    {all && subjects.length > SHOWN_SUBJECTS && <button type="button" className="button-pill-soft" onClick={() => setAll(false)}>접기</button>}
    <Disclaimer icon sample={isSampleMode()} />
  </details>;
}

/* v2 시안 trace-accordion: 번호 단계(이름 80 · 값) + 최종 합계. 단순한 규칙 모양(전 과목 · 성취도 미반영 · 학년 가중 없음 · 기본점 0)일 때만
   엔진 trace·성적에서 그대로 다시 세어 보여 주고, 다른 모양은 엔진 trace 목록(TraceRows)을 그대로 보여요(지어낸 단계 값 없음). */
const ORDINAL = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째'];
const num = (v: number, digits = 6) => v.toLocaleString('ko-KR', { maximumFractionDigits: digits });
function stepsOf(row: Row, grades: readonly GradeRecord[], attendance: readonly AttendanceRecord[]) {
  const rule = row.p?.rule, v = row.value;
  if (!rule || !v || row.kind !== 'ready' || rule.selection.mode !== 'all' || rule.achievement_blend.mode !== 'none' || rule.year_weights
    || rule.no_rank_subject_policy !== 'exclude' || rule.base_score !== 0) return null;
  const byId = new Map(grades.map((g, i) => [g.id, { g, i }]));
  const subjects = row.trace.filter(t => t.subject_id && byId.has(t.subject_id));
  const chosen = subjects.filter(t => t.value !== undefined).map(t => byId.get(t.subject_id!)!).sort((a, b) => a.i - b.i).map(x => x.g);
  const excluded = subjects.filter(t => t.value === undefined).map(t => ({ g: byId.get(t.subject_id!)!.g, why: t.detail.split('제외: ')[1] }));
  if (!chosen.length || chosen.some(g => g.rank_grade === null)) return null;
  const rankMax = Math.max(...Object.values(rule.rank_grade_points));
  const weight = (g: GradeRecord) => rule.credit_weighted ? g.credits : 1;
  const points = (g: GradeRecord) => rule.rank_grade_points[g.rank_grade!];
  const credits = chosen.reduce((n, g) => n + weight(g), 0), sum = chosen.reduce((n, g) => n + points(g) * weight(g), 0), avg = (sum / credits).toFixed(3);
  const types = [...new Set(excluded.map(x => x.g.type))].map(t => { const xs = excluded.filter(x => x.g.type === t);
    return `${t} ${xs.length}과목\n${xs.every(x => x.g.rank_grade === null) ? '석차등급 미산출\n→ 규칙상 제외' : xs.map(x => x.why ?? '규칙상 제외').join('\n')}`; });
  const subject = (g: GradeRecord) => `${g.name} ${g.rank_grade}등급\n→ ${points(g)}점${rule.credit_weighted ? ` × ${g.credits}학점` : ''}`;
  const steps: [string, string][] = [
    ['적용 규칙', `${rule.university} ${rule.admission_year}\n${rule.program} 규칙 v${rule.version}\n${rule.review_status === 'verified' ? '검수 완료' : '샘플 규칙(가상)'}`],
    ['반영 학기', `${rule.semesters[0]} ~ ${rule.semesters[rule.semesters.length - 1]}, ${rule.semesters.length}개 학기\n학년 가중 없음`],
    ['반영 과목', `${rule.subject_groups.join('·')}\n${chosen.length}과목, 학점 합 ${credits}`],
    ['제외한 과목', types.join('\n') || '없음'],
    ['과목별 적용\n점수 (예)', ''],
    ['석차등급\n점수 학점\n가중 평균', `${num(sum)} ÷ ${credits} = ${avg}`],
    ['성취도 점수\n학점 가중 평균', '이 규칙은 성취도를\n반영하지 않아요'],
    ['등급·성취도\n반영', `석차등급 점수만\n= ${avg}`],
    [`교과 환산\n(만점 ${num(rule.grade_max_score)})`, `${avg} × ${num(rule.grade_max_score / rankMax)} = ${two(v.grade)}`],
  ];
  const a = rule.attendance_rule;
  if (a) {
    const records = attendance.filter(r => a.years.includes(r.year));
    const absence = records.reduce((n, r) => n + r.absence.unexcused, 0), tardyOnly = records.reduce((n, r) => n + r.tardy.unexcused, 0);
    const tardy = records.reduce((n, r) => n + r.tardy.unexcused + r.early_leave.unexcused + r.class_absence.unexcused, 0), equivalent = absence + Math.floor(tardy / a.tardy_to_absence);
    const lines = [absence ? `미인정 결석 ${absence}일` : '', tardy ? `미인정 ${tardy === tardyOnly ? '지각' : '지각·조퇴·결과'} ${tardy}회` : '', !absence && !tardy ? '미인정 결석·지각 없음' : '',
      tardy ? `→ ${a.tardy_to_absence}회 ${tardy < a.tardy_to_absence ? '미만이라' : '마다 1일,'} 결석 ${equivalent}일` : '',
      v.attendance_deduction ? `감점 ${num(v.attendance_deduction)}점` : '감점 없음', `→ ${num(a.max_score)} − ${num(v.attendance_deduction)} = ${two(v.attendance)}`];
    steps.push(['출결', lines.filter(Boolean).join('\n')]);
  }
  const digits = rule.rounding.digits, mode = { round: '반올림', floor: '버림', ceil: '올림' }[rule.rounding.mode];
  const final = `${two(v.grade)}${a ? ` + ${two(v.attendance)}` : ''}\n= ${v.total.toFixed(digits)} / ${num(v.max)}\n소수 ${ORDINAL[digits] ?? `${digits + 1}번째`} 자리에서\n${mode}`;
  return { steps, chosen: chosen.map(subject), final };
}

function StepRows({ row, grades, attendance, open }: { row: Row; grades: readonly GradeRecord[]; attendance: readonly AttendanceRecord[]; open: boolean }) {
  const [all, setAll] = useState(false);
  const built = stepsOf(row, grades, attendance);
  if (!built) return <TraceRows trace={row.trace} open={open} />;
  const shown = all ? built.chosen : built.chosen.slice(0, SHOWN_SUBJECTS), hidden = built.chosen.length - shown.length;
  return <details className="trace-accordion us-trace us-steps" open={open || undefined}><summary><span>어떻게 계산했나요?</span><Icon name="chevron-down" size={20} /></summary>
    <ol>{built.steps.map(([label, value], i) => <li key={label}><span className="us-steps__label">{i + 1}. {label}</span>
      <span className="us-steps__value num">{i === 4 ? shown.join('\n') : value}</span>
      {i === 4 && (hidden > 0 || all) && built.chosen.length > SHOWN_SUBJECTS && <button type="button" className="button-pill-soft" onClick={() => setAll(!all)}>{all ? '접기' : `나머지 ${hidden}과목 보기`}</button>}</li>)}
      <li className="us-steps__final"><span>최종 합계</span><span className="num">{built.final}</span></li></ol>
    <Disclaimer icon sample={isSampleMode()} />
  </details>;
}

function Heart({ row, onRemove }: { row: Row; onRemove: (r: Row) => void }) {
  return <button type="button" className="interest-heart us-heart" aria-pressed="true" aria-label={`${row.university} 관심에서 빼기`} title={`${row.university} 관심에서 빼기`} onClick={() => onRemove(row)}><Icon name="heart" size={20} /></button>;
}

/** 오른쪽 패널(PC)과 전체 화면 상세(모바일)가 같이 써요. */
function Detail({ row, single, desktop, onRemove, grades, attendance }: { row: Row; single: boolean; desktop: boolean; onRemove: (r: Row) => void; grades: readonly GradeRecord[]; attendance: readonly AttendanceRecord[] }) {
  const v = row.value, digits = row.p?.rule?.rounding.digits ?? 2;
  return <div className="us-detail">
    {desktop && <header className="us-detail__head"><UniversityLogo university={row.university} /><div><h3 className="t-heading-3">{row.university}</h3><p className="t-body-sm text-muted">{row.program}</p></div><Heart row={row} onRemove={onRemove} /></header>}
    {!desktop && <header className="us-detail__head"><UniversityLogo university={row.university} /><div><h3 className="t-heading-3">{row.university}</h3><p className="t-body-sm text-muted">{row.program}</p></div><span className="data-status-badge">시행계획 기준</span></header>}
    {row.kind === 'ready' && v ? <>
      <div className="us-detail__total"><span className="t-caption text-muted">합계</span><p className="us-detail__value"><strong className="num">{v.total.toFixed(digits)}</strong> <span className="text-muted">/ {v.max.toLocaleString('ko-KR')}</span></p>
        {desktop ? <p className="t-body-sm num">교과 {two(v.grade)} · 출결 {two(v.attendance)}</p>
          : <dl className="us-detail__facts"><div><dt>교과</dt><dd className="num">{two(v.grade)}</dd></div><div><dt>출결</dt><dd className="num">{two(v.attendance)}</dd></div></dl>}
        {v.attendance_deduction > 0 && <p className="t-body-sm">출결 감점 {v.attendance_deduction}점이 있어요.</p>}</div>
      <p className="us-detail__rank">{single ? ONE_NOTE : rankLine(row)}</p>
      {!desktop && !single && <p className="t-caption text-muted">환산 기준 순위는 대학 만점 대비 내 합계 비율로 줄 세운 순서예요. 대학 선호도나 지원 결과를 뜻하지 않아요.</p>}
    </> : <div className="us-detail__total"><p>{isAttendance(row.reason) ? '합계는 출결을 입력하면 계산해요' : row.reason}</p>{isAttendance(row.reason) && <p className="t-body-sm text-muted">출결 입력 필요</p>}</div>}
    <StepRows key={row.id} row={row} grades={grades} attendance={attendance} open={desktop && row.kind === 'ready' || row.kind === 'input'} />
    {row.kind === 'input' && <Link className="button-primary" to="/grade-input">{inputAction(row.reason)}</Link>}
    {row.p?.source.startsWith('https://') && <a className="button-pill-soft us-source" href={row.p.source} target="_blank" rel="noreferrer"><Icon name="external-link" size={20} />원문 보기</a>}
  </div>;
}

function Empty({ icon, title, body, action }: { icon: string; title: string; body: string; action: ReactNode }) {
  return <div className="empty-state us-empty"><Icon name={icon} size={40} /><h3 className="t-heading-4">{title}</h3><p className="t-body-sm">{body}</p>{action}</div>;
}
function ErrorLine({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="us-error" role="alert"><Icon name="triangle-alert" size={20} /><p>{message}</p><button type="button" className="button-outline" onClick={onRetry}>다시 불러오기</button></div>;
}

export function UniversityScores() {
  useSampleMode(); // 샘플 전형(sample 규칙)이 켜고 끌 때 들어오고 빠져요
  const state = useStudent();
  const released = useReleasedRulesState();
  const desktop = useDesktop();
  const [sort, setSort] = useState<Sort>('ratio');
  const [selected, setSelected] = useState(''), [detail, setDetail] = useState('');
  const [sheet, setSheet] = useState(false), [confirm, setConfirm] = useState<Row | null>(null), [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }, [toast]);
  const headSlot = desktop && typeof document !== 'undefined' ? document.querySelector('.topbar__heading') : null;

  const data = state?.data;
  const interests = [...(data?.interests ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const all = withReleasedRules(programs, released.rules).filter(p => p.admission_year === admissionYear);
  const hasGrades = !!data?.grades.length;
  const rows = data ? sortRows(buildRows(interests, all, p => hasGrades ? scoreUniversity(data.grades, data.attendance, p.rule!) : null), sort) : [];
  const ready = rows.filter(r => r.kind === 'ready'), inputs = rows.filter(r => r.kind === 'input'), pendings = rows.filter(r => r.kind === 'pending');
  const universities = rows.length, single = universities === 1 || ready.length < 2, grouped = pendings.length >= 3;
  const selectable = rows.filter(r => r.kind !== 'pending');
  const active = selectable.find(r => r.id === selected) ?? selectable[0];
  const summary = !hasGrades ? [`관심 대학 ${universities}곳`, '성적을 입력하면 계산해요']
    : [`관심 대학 ${universities}곳`, `계산 ${ready.length}곳`, ...(inputs.length ? [`입력 필요 ${inputs.length}곳`] : []), ...(pendings.length ? [`준비 중 ${pendings.length}곳`] : [])];
  const sortName = SORTS.find(s => s.key === sort)!.label;

  const remove = async (row: Row) => {
    try {
      await studentDb.interests.where('university').equals(row.university).delete();
      setConfirm(null); setDetail(''); setSelected(''); setToast('관심 대학에서 뺐어요');
    } catch { setConfirm(null); setToast('관심 대학을 빼지 못했어요. 다시 시도해 주세요.'); }
  };

  const empty = !data ? null
    : !universities ? <Empty icon="folder" title="아직 담은 대학이 없어요" body="관심 대학을 담으면 대학마다 환산점수를 계산해 드려요" action={<Link className="button-primary" to={PICK_PATH}>관심 대학 담기</Link>} />
    : !hasGrades ? <Empty icon="file-text" title="아직 입력한 성적이 없어요" body="성적 입력 화면에서 과목을 추가해 주세요." action={<Link className="button-primary" to="/grade-input">성적 입력하기</Link>} />
    : null;
  const groupLine = <div className="us-group"><span className="data-status-badge">환산 규칙 준비 중</span><span className="t-body-sm">준비 중인 대학 {pendings.length}곳 — 검수가 끝나면 계산해요</span></div>;
  const oneSlot = universities === 1 && <Link className="us-slot" to={PICK_PATH}><Icon name="plus" size={20} />관심 대학 담기</Link>;

  // ---- 모바일 카드
  const card = (r: Row) => {
    const head = <><UniversityLogo university={r.university} /><span className="us-card__name"><strong className="t-heading-3">{r.university}</strong><span className="t-body-sm text-muted">{r.program}</span></span></>;
    if (r.kind === 'pending') return <li key={r.id} className={`us-card us-card--pending${grouped ? ' us-card--compact' : ''}`}><div className="us-card__head">{head}{!grouped && <span className="data-status-badge">환산 규칙 준비 중</span>}</div>{!grouped && <p className="t-body-sm text-muted">검수가 끝나면 계산해요</p>}</li>;
    return <li key={r.id} className="us-card"><button type="button" className="us-card__open" aria-label={`${r.university} ${r.program} 환산 상세`} onClick={() => setDetail(r.id)}>
      <span className="us-card__head">{head}<Icon name="chevron-right" size={24} /></span>
      {r.kind === 'ready' && r.value ? <>
        <span className="us-card__cells"><span><span className="t-caption text-muted">교과</span><strong className="num">{two(r.value.grade)}</strong></span><span><span className="t-caption text-muted">출결</span><strong className="num">{two(r.value.attendance)}</strong></span>
          <span><span className="t-caption text-muted">합계</span><span><strong className="num">{r.value.total.toFixed(r.p?.rule?.rounding.digits ?? 2)}</strong> <span className="t-caption text-muted num">/ {r.value.max.toLocaleString('ko-KR')}</span></span></span></span>
        <span className="t-body-sm">{single ? ONE_NOTE : rankLine(r)}</span></>
        : <span className="t-body-sm">{inputLine(r.reason)} <span className="us-link">{inputAction(r.reason)} ›</span></span>}
    </button></li>;
  };

  // ---- PC 표
  const sortHead = (key: Sort, label: string, ascending = false) => {
    const on = sort === key;
    return <button type="button" className="us-sort" aria-label={`${label} 기준 정렬`} aria-pressed={on} onClick={() => setSort(key)} disabled={!ready.length}>
      <span>{on ? `${label} ${ascending ? '▲' : '▼'}` : label}</span>{!on && <Icon name="arrow-up-down" size={16} />}</button>;
  };
  const tableRow = (r: Row) => {
    const digits = r.p?.rule?.rounding.digits ?? 2, on = r.kind !== 'pending' && r.id === active?.id;
    const name = <span className="us-table__univ"><UniversityLogo university={r.university} />{r.kind === 'pending' ? <span>{r.university}</span>
      : <button type="button" className="us-table__pick" aria-pressed={on} aria-label={`${r.university} ${r.program} 환산 근거 보기`} onClick={() => setSelected(r.id)}>{r.university}</button>}</span>;
    return <tr key={r.id} className={on ? 'is-selected' : undefined} onClick={r.kind === 'pending' ? undefined : () => setSelected(r.id)}>
      <td>{name}</td><td className="t-body-sm">{r.program}</td>
      {r.kind === 'ready' && r.value ? <><td className="num">{two(r.value.grade)}</td><td className="num">{two(r.value.attendance)}</td>
        <td className="num"><span className="us-stack"><span>{r.value.total.toFixed(digits)}</span><small className="t-caption text-muted">/ {r.value.max.toLocaleString('ko-KR')}</small></span></td>
        <td className="num"><span className="us-stack">{single ? <span>—</span> : <><strong>{signed(diffOf(r) ?? 0)}</strong><small className="t-caption text-muted">{r.avgRank ?? '—'}위 → {r.ratioRank}위</small></>}</span></td></>
      : r.kind === 'input' ? <><td colSpan={3} className="us-table__note">{isAttendance(r.reason) ? '출결을 입력하면 계산해요' : inputLine(r.reason)} <Link className="us-link" to="/grade-input">입력 ›</Link></td><td className="num">—</td></>
      : grouped ? <><td /><td /><td /><td /></>
      : <><td colSpan={3} className="us-table__note"><span className="text-muted">검수가 끝나면 계산해요</span><span className="data-status-badge">환산 규칙 준비 중</span></td><td className="num">—</td></>}
    </tr>;
  };

  const lead = <p className="t-body-lg us-lead">같은 성적도 대학마다 반영 방식이 달라서 점수가 달라져요</p>;
  const mobileDetail = !desktop && rows.find(r => r.id === detail && r.kind !== 'pending');

  return <section data-slug="univ-score" aria-label="대학별 환산" className="student-screen univ-score">
    <div className="screen-heading"><h2 className="t-heading-1">대학별 환산</h2><ScreenActions><span className="data-status-badge us-asof">시행계획 기준 · 데이터 기준일 {dataAsOf}</span><Link className="button-outline" to="/grade-input">성적 입력·수정</Link></ScreenActions></div>
    {headSlot && createPortal(lead, headSlot)}
    <div className="us-layout">
      <div className="us-main">
        {!state ? <p className="us-loading t-body-sm text-muted" role="status">기기에 저장된 성적을 읽고 있어요.</p>
          : !data ? <ErrorLine message={state.error} onRetry={() => window.location.reload()} />
          : <>
            {universities > 0 && <div className="us-summary"><p className="num">{summary.join(' · ').split(/(\d+)/).map((t, k) => k % 2 ? <strong key={k}>{t}</strong> : t)}</p>
              {!desktop && hasGrades && <button type="button" className="button-pill-soft" onClick={() => setSheet(true)} disabled={!ready.length}>{sortName} <span className="us-caret">▾</span></button>}</div>}
            {desktop && universities > 0 && hasGrades && <p className="t-caption text-muted">{RANK_NOTE}</p>}
            {released.failed && <ErrorLine message="새로 검수된 환산 규칙을 불러오지 못했어요. 지금 보이는 대학은 이미 받은 규칙으로 계산했어요." onRetry={released.retry} />}
            {empty ?? (desktop ? <>
              {grouped && !ready.length && !inputs.length && groupLine}
              <div className="table-scroll us-table-card"><table className="data-table us-table">
                <thead><tr><th scope="col">{sortHead('name', '대학', true)}</th><th scope="col">전형</th><th scope="col" className="num">교과</th><th scope="col" className="num">출결</th><th scope="col" className="num">{sortHead('ratio', '합계')}</th><th scope="col" className="num">{sortHead('diff', '순위 차이')}</th></tr></thead>
                <tbody>{rows.filter(r => r.kind !== 'pending').map(tableRow)}
                  {grouped && (ready.length > 0 || inputs.length > 0) && <tr className="us-table__group"><td colSpan={6}>{groupLine}</td></tr>}
                  {pendings.map(tableRow)}</tbody></table></div>
              {oneSlot}
            </> : <>
              <ul className="us-cards">{rows.filter(r => r.kind !== 'pending').map(card)}</ul>
              {grouped && groupLine}
              {pendings.length > 0 && <ul className="us-cards">{pendings.map(card)}</ul>}
              {grouped && !ready.length && !inputs.length && <p className="t-body-sm text-muted">{PENDING_NOTE}</p>}
              {oneSlot}
            </>)}
          </>}
        <Disclaimer icon sample={isSampleMode()} />
      </div>
      {desktop && <aside className="us-panel" aria-label="대학별 환산 근거">
        {!data ? <p className="t-body-sm text-muted">대학을 고르면 계산 근거가 여기 보여요</p>
          : empty ? <p className="t-body-sm text-muted">대학을 담으면 계산 근거가 여기 보여요</p>
          : active ? <Detail row={active} single={single} desktop onRemove={setConfirm} grades={data.grades} attendance={data.attendance} />
          : <div className="us-detail"><h3 className="t-heading-4">계산할 수 있는 대학이 아직 없어요</h3><p className="t-body-sm text-muted">{PENDING_NOTE}</p><TraceRows trace={[]} open={false} /></div>}
      </aside>}
    </div>

    {mobileDetail && !confirm && <Modal label={`${mobileDetail.university} 환산 상세`} onClose={() => setDetail('')}>
      <div className="us-sheet-detail"><header className="us-sheet-detail__bar"><button type="button" className="us-icon-button" aria-label="뒤로" onClick={() => setDetail('')}><Icon name="chevron-left" /></button><h2 className="t-heading-4">{mobileDetail.university}</h2><Heart row={mobileDetail} onRemove={setConfirm} /></header>
        <Detail row={mobileDetail} single={single} desktop={false} onRemove={setConfirm} grades={data?.grades ?? []} attendance={data?.attendance ?? []} /></div>
    </Modal>}
    {sheet && <Modal label="정렬" onClose={() => setSheet(false)}>
      <div className="us-sort-sheet"><span className="us-sort-sheet__handle" aria-hidden="true" /><h3 className="t-heading-4">정렬</h3>
        <ul>{SORTS.map(s => <li key={s.key}><button type="button" aria-pressed={sort === s.key} onClick={() => { setSort(s.key); setSheet(false); }}><span><strong>{s.label}</strong><small className="t-caption text-muted">{s.help}</small></span>{sort === s.key && <Icon name="check" size={20} />}</button></li>)}</ul></div>
    </Modal>}
    {confirm && <Modal label="관심 대학에서 뺄까요?" onClose={() => setConfirm(null)}>
      <div className="us-confirm"><h3 className="t-heading-4">관심 대학에서 뺄까요?</h3><p>{confirm.university} {confirm.program}가 이 목록에서 사라져요. 될각 · 전형계획의 관심 표시도 함께 꺼져요.</p>
        <div className="us-confirm__actions"><button type="button" className="button-outline" onClick={() => setConfirm(null)}>취소</button><button type="button" className="button-primary" onClick={() => void remove(confirm)}>빼기</button></div></div>
    </Modal>}
    {toast && <p className="toast" role="status">{toast}</p>}
  </section>;
}
