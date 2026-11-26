import { useMemo, useState } from 'react';
import { useReferenceCuts } from '../data/referenceCuts';
import { departmentsFor, referenceDiffText } from '../domain/interestComparison';
import type { Interest } from '../domain/interests';
import { studentDb } from '../store/studentDb';
import { collectedProgramPath } from '../domain/interests';
import { fiveToNineFor } from '../domain/results';
import type { StudentBackup } from '../domain/student';
import { Link } from 'react-router-dom';
import { Disclaimer, TraceAccordion } from '../components/CalculationDetails';
import { ComparisonDetails } from '../components/ComparisonDetails';
import { SegmentedControl } from '../components/SegmentedControl';
import { UniversityLogo } from '../components/UniversityLogo';
import { InterestButton } from '../components/InterestButton';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { combinations, conversionFor, currentComparisonBasis } from '../domain/results';
import { validateGrade } from '../domain/student';
import { compareBasis } from '../domain/comparison';
import { pending } from '../engine/types';
import { judgeRange } from '../engine/judgment';
import { activeRules } from '../data/sample/rules';
import { isSampleMode, useSampleMode } from '../data/sample/mode';
import { admissionYear, dataAsOf, programs, type ProgramData } from '../data/catalog';
import { StudentDataScreen } from './Results';
import '../styles/doelgak.css';

type Lane = { key: string; label: string; tone: 'safe' | 'fit' | 'reach' | 'risk'; icon: string };
const SUBJECT_LANES: Lane[] = [
  { key: '안정', label: '안정', tone: 'safe', icon: '●' }, { key: '적정', label: '적정', tone: 'fit', icon: '◐' },
  { key: '소신', label: '소신', tone: 'reach', icon: '▲' }, { key: '위험', label: '위험', tone: 'risk', icon: '■' },
];
// R-JDG-005: 종합은 적합도 3단계만, 위험 색 쌍은 쓰지 않아요.
const COMPREHENSIVE_LANES: Lane[] = [
  { key: '높음', label: '적합도 높음', tone: 'safe', icon: '●' }, { key: '보통', label: '적합도 보통', tone: 'fit', icon: '◐' },
  { key: '낮음', label: '적합도 낮음', tone: 'reach', icon: '▲' },
];
const REGIONS: Record<string, string[]> = { 강원: ['강원'], 서울: ['서울'], '경기·인천': ['경기', '인천'], 충청: ['충북', '충남', '충청', '대전', '세종'] };
const FIELDS = ['인문', '사회', '자연', '공학', '의약', '예체능'] as const;
const THREE = ['전체', '있음', '없음'] as const;
type Three = typeof THREE[number];
type Filters = { judge: string; regions: string[]; fields: string[]; keyword: string; minimum: Three; interview: Three };
const EMPTY: Filters = { judge: '전체', regions: [], fields: [], keyword: '', minimum: '전체', interview: '전체' };
// 샘플 모드는 v2 시안의 예시 상태(강원·서울 적용)로 열어요. 칩으로 보이고 바로 뺄 수 있어요. 내 데이터에서는 빈 조건.
const startFilters = (): Filters => isSampleMode() ? { ...EMPTY, regions: ['강원', '서울'] } : EMPTY;

const inRegion = (p: ProgramData, name: string) => {
  const known = Object.values(REGIONS).flat();
  if (name === '그 밖') return !!p.region && !known.some(r => p.region!.startsWith(r));
  return REGIONS[name].some(r => p.region?.startsWith(r) ?? false);
};
const matches = (p: ProgramData, f: Filters) => (!f.regions.length || f.regions.some(r => inRegion(p, r)))
  && (!f.fields.length || (!!p.field && f.fields.includes(p.field)))
  && (f.minimum === '전체' || p.minimum_required === (f.minimum === '있음'))
  && (f.interview === '전체' || p.interview === (f.interview === '있음'))
  && `${p.university} ${p.program} ${p.department}`.includes(f.keyword.trim());
/** 적용된 조건을 칩 하나씩(지역·계열은 값마다)으로 풀어요. 반영 교과는 넣지 않아요. */
const chipsOf = (f: Filters) => [
  ...(f.judge !== '전체' ? [{ label: f.judge, clear: (x: Filters) => ({ ...x, judge: '전체' }) }] : []),
  ...f.regions.map(r => ({ label: r, clear: (x: Filters) => ({ ...x, regions: x.regions.filter(v => v !== r) }) })),
  ...f.fields.map(r => ({ label: r, clear: (x: Filters) => ({ ...x, fields: x.fields.filter(v => v !== r) }) })),
  ...(f.keyword.trim() ? [{ label: `‘${f.keyword.trim()}’`, clear: (x: Filters) => ({ ...x, keyword: '' }) }] : []),
  ...(f.minimum !== '전체' ? [{ label: `수능최저 ${f.minimum}`, clear: (x: Filters) => ({ ...x, minimum: '전체' as Three }) }] : []),
  ...(f.interview !== '전체' ? [{ label: `면접 ${f.interview}`, clear: (x: Filters) => ({ ...x, interview: '전체' as Three }) }] : []),
];
// judgeRange가 입결 없음일 때 돌려주는 이유 문장으로 묶음을 나눠요.
const pendingName = (r: { status: string; reason?: string } | null) => r?.reason === '검수된 입결 자료가 필요해요.' ? '입결 없음' : '비교 자료 확인 필요';
const toggle = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];
const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const lower = (min: number) => Math.floor(min * 10 + 1e-9) / 10, upper = (max: number) => Math.ceil(max * 10 - 1e-9) / 10;
const rangeText = (min: number, max: number) => `약 ${lower(min).toFixed(1)}~${upper(max).toFixed(1)}`;
// 차이 = 불리한 쪽 값 − 70% 컷. 보이는 범위 끝값(올림)으로 적어서 화면 숫자끼리 맞아요(판정은 원래 값 그대로).
const diffText = referenceDiffText;
// cut-compare-bar 축소형: 모든 카드가 같은 눈금 1.0~4.0을 써요(왼쪽 = 1등급 쪽).
const AXIS = [1, 4] as const;
const pos = (v: number) => Math.min(100, Math.max(0, (v - AXIS[0]) / (AXIS[1] - AXIS[0]) * 100));

function MiniBar({ min, max, cut }: { min: number; max: number; cut?: number }) {
  min = lower(min); max = upper(max); // 글자 범위(약 2.3~2.6)와 같은 구간을 그려요
  const label = `내 환산 9등급 약 ${fmt(min)}에서 ${fmt(max)} 사이${cut === undefined ? '' : `, 70% 컷 ${fmt(cut)}, 차이 ${diffText(max, cut)}`}`;
  return <div className="dg-bar" role="img" aria-label={label}>
    <div className="dg-bar__track"><span className="dg-bar__range" style={{ left: `${pos(min)}%`, width: `${Math.max(pos(max) - pos(min), 2)}%` }} />{cut !== undefined && <span className="dg-bar__cut" style={{ left: `${pos(cut)}%` }} />}</div>
    <div className="dg-bar__axis"><span>{AXIS[0]}</span>{cut !== undefined && <span className="dg-bar__cut-label" style={{ left: `${pos(cut)}%` }}>70% 컷</span>}<span>{AXIS[1]}</span></div>
  </div>;
}

/** 검수된 판정 전형이 아직 없을 때(실제 모드): 관심 전형마다 내 참고 추정 범위와 최근 수집 입결 컷을 나란히 보여요. 판정 이름은 붙이지 않아요(NEVER-1). */
function InterestReference({ data }: { data: StudentBackup }) {
  const interests = useMemo(() => [...(data.interests ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)), [data.interests]);
  const mine = useMemo(() => { const r = data.grades.length ? fiveToNineFor(data.grades, '전 교과') : null; return r?.min != null && r.max != null ? { min: r.min, max: r.max } : null; }, [data.grades]);
  const { cuts, rowsOf, error: indexError } = useReferenceCuts(interests);
  const [pickError, setPickError] = useState('');
  // 학과 없이 담은 관심 전형: 학과를 고르면 그 학과로 바꿔 담아요(setInterest가 학과 없는 옛 항목을 같이 정리해요)
  const pickDepartment = (i: Interest, unit: string) => { setPickError(''); studentDb.setInterest(i.university, i.program, true, unit).catch(e => setPickError(e instanceof Error ? e.message : '학과를 저장하지 못했어요.')); };

  const head = <div className="dg-summary"><p className="t-body-sm num">관심 전형 {interests.length}개 · 참고 비교</p>
    <p className="t-caption text-muted">판정 기준과 입결 검수가 끝나면 안정 · 적정 · 소신 · 위험으로 나눠 보여 드려요. 지금은 내 참고 추정 범위와 최근 입결 컷만 비교해요.</p></div>;
  if (!interests.length) return <>{head}<div className="empty-state dg-empty"><Icon name="heart" size={40} /><h3 className="t-heading-4">관심 전형이 없어요</h3>
    <p className="t-body-sm">수시 입결이나 전형계획에서 하트를 누르면 여기서 입결과 비교해요.</p><Link className="button-primary" to="/admission-results">수시 입결 보기</Link></div></>;
  return <>{head}
    {!mine && <p className="t-caption text-muted">{data.grades.length ? '석차등급이 있는 과목을 입력하면 내 참고 추정 범위와 비교해요. ' : '성적을 입력하면 내 참고 추정 범위와 비교해요. '}<Link className="t-link" to="/grade-input">성적 입력하기 ›</Link></p>}
    {indexError && <p className="t-caption text-muted" role="alert">{indexError}</p>}
    {pickError && <p className="t-caption text-muted" role="alert">{pickError}</p>}
    <div className="dg-pending__cards">{interests.map(i => {
      const ref = cuts[i.id];
      const cut = ref && 'value' in ref ? ref : null;
      return <article className="univ-card dg-card" key={i.id}>
        <header><UniversityLogo university={i.university} /><InterestButton university={i.university} program={i.program} department={i.department || undefined} compact /></header>
        <h3 className="t-heading-4">{i.university}</h3>
        <p className="dg-card__program">{[i.department, i.program].filter(Boolean).join(' · ')}</p>
        <div className="dg-card__numbers"><span className="t-caption text-muted">내 환산 (참고 추정)</span>
          <div className="dg-card__range"><strong className="num">{mine ? rangeText(mine.min, mine.max) : '—'}</strong></div>
          <span className="t-caption text-muted num">{!ref ? '입결 자료를 불러오는 중이에요' : cut
            ? `${cut.year}학년도 ${cut.cut === 'cut_70' ? '70%' : '50%'} 컷 ${cut.row[cut.cut]}${mine ? ` · 차이 ${diffText(mine.max, cut.value)}` : ''}` : (ref as { reason: string }).reason}</span>
          {/* 수집 전형 이름이 담은 이름과 다르면 무엇과 비교했는지 따로 한 줄(컷 숫자가 말줄임에 가리지 않게) */}
          {cut && cut.row.program.trim() !== i.program.trim() && <span className="t-caption text-muted">비교한 전형: {cut.row.program}</span>}</div>
        {!i.department && (() => { const units = departmentsFor(i, rowsOf(i.university)); return units.length > 0 && <label className="dg-field"><span className="t-caption text-muted">학과 고르기</span>
          <span className="dg-select"><select className="text-input" value="" onChange={e => e.target.value && pickDepartment(i, e.target.value)}><option value="">학과를 골라 주세요</option>{units.map(u => <option key={u}>{u}</option>)}</select><Icon name="chevron-down" size={20} /></span></label>; })()}
        {mine && <MiniBar min={mine.min} max={mine.max} cut={cut?.value} />}
        <div className="dg-card__chips"><span className="data-status-badge">판정 준비 중</span>{cut && <span className="data-status-badge">검수 전 참고자료</span>}</div>
        {/* 짝지은 입결 행의 대학·전형 이름으로 걸어야 원문 화면에서 찾아져요(전형계획 이름과 수집 이름이 달라요) */}
        {i.department && <Link className="t-link t-caption" to={cut ? collectedProgramPath(cut.row.university, cut.row.program, cut.row.recruit_unit) : collectedProgramPath(i.university, i.program, i.department)}>입결 원문 보기 ›</Link>}
      </article>;
    })}</div></>;
}

function FilterFields({ value, onChange, combo, onCombo }: { value: Filters; onChange: (f: Filters) => void; combo: string; onCombo: (c: string) => void }) {
  const chip = (label: string, on: boolean, click: () => void) => <button key={label} type="button" className="filter-chip" aria-pressed={on} onClick={click}>{label}</button>;
  return <>
    <label className="dg-field"><span className="t-label">반영 교과</span><span className="dg-select"><select className="text-input" value={combo} onChange={e => onCombo(e.target.value)}>{Object.keys(combinations).map(v => <option key={v}>{v}</option>)}</select><Icon name="chevron-down" size={20} /></span></label>
    <div className="dg-field" role="group" aria-label="판정"><span className="t-label">판정</span><div className="dg-chips">{['전체', ...SUBJECT_LANES.map(l => l.key)].map(v => chip(v, value.judge === v, () => onChange({ ...value, judge: v })))}</div></div>
    <div className="dg-field" role="group" aria-label="지역"><span className="t-label">지역</span><div className="dg-chips">{[...Object.keys(REGIONS), '그 밖'].map(v => chip(v, value.regions.includes(v), () => onChange({ ...value, regions: toggle(value.regions, v) })))}</div></div>
    <div className="dg-field" role="group" aria-label="계열"><span className="t-label">계열</span><div className="dg-chips">{FIELDS.map(v => chip(v, value.fields.includes(v), () => onChange({ ...value, fields: toggle(value.fields, v) })))}</div></div>
    <label className="dg-field"><span className="t-label">학과 키워드</span><input type="search" className="text-input" placeholder="예: 간호, 경영" value={value.keyword} onChange={e => onChange({ ...value, keyword: e.target.value })} /></label>
    <div className="dg-field"><span className="t-label">수능최저</span><SegmentedControl label="수능최저" value={value.minimum} onChange={v => onChange({ ...value, minimum: v })} options={THREE.map(v => ({ value: v, label: v }))} /></div>
    <div className="dg-field"><span className="t-label">면접</span><SegmentedControl label="면접" value={value.interview} onChange={v => onChange({ ...value, interview: v })} options={THREE.map(v => ({ value: v, label: v }))} /></div>
  </>;
}

export function Doelgak() {
  useSampleMode(); // 샘플을 켜고 끄면 programs(샘플 전형)·판정 규칙이 바뀌어서 다시 그려요
  const [combo, setCombo] = useState('국수영사과');
  const [track, setTrack] = useState<'교과' | '종합'>('교과'), [view, setView] = useState<'lane' | 'table'>('lane');
  const [draft, setDraft] = useState(startFilters), [applied, setApplied] = useState(startFilters);
  const [sheet, setSheet] = useState(false), [selected, setSelected] = useState('');
  const apply = (f: Filters) => { setDraft(f); setApplied(f); };
  const actions = <span className="data-status-badge dg-asof">모집요강 반영 · {dataAsOf}</span>;
  return <StudentDataScreen slug="doelgak" title="될각" className="doelgak" actions={actions}>{data => {
    // 검수된 판정 전형이 아직 없으면(실제 모드) 관심 전형 참고 비교로 대신해요. 샘플 모드는 판정 시안 그대로.
    if (!programs.some(p => p.admission_year === admissionYear)) return <div className="dg-main dg-reference"><InterestReference data={data} />
      <Disclaimer icon lead="대학 공식 자료가 최종 기준이에요" sample={isSampleMode()} /></div>;
    const conversion = conversionFor(data.grades, combo);
    const scope = combinations[combo] ?? [...new Set(data.grades.filter(g => !validateGrade(g).length).map(g => g.subject_group))];
    const inputBasis = currentComparisonBasis(data.grades, scope, conversion.status === 'ready');
    const lanes = track === '교과' ? SUBJECT_LANES : COMPREHENSIVE_LANES;
    const rows = programs.filter(p => p.admission_year === admissionYear && (track === '종합' ? p.admission_type === '종합' : !p.admission_type || p.admission_type === '교과')).map(p => ({ p,
      r: conversion.status !== 'ready' ? null : track === '종합' ? pending('종합전형 적합도 기준을 준비하고 있어요.')
        : !compareBasis(inputBasis, p.cut_basis).comparable ? pending(compareBasis(inputBasis, p.cut_basis).reasons.join(' '))
        : p.cut_grade_system !== inputBasis.grade_system ? pending('등급제 확인이 필요해요.') : p.cut_subject_scope.length !== scope.length || !scope.every(g => p.cut_subject_scope.includes(g))
        ? pending('같은 반영 교과 기준의 입결 자료가 필요해요.')
        : judgeRange(conversion.value, p.license_status === 'allowed' ? p.cut : null, activeRules().judgment) }));
    type Row = typeof rows[number];
    const laneOf = (r: Row['r']) => r?.status === 'ready' ? r.value.label : null;
    const shown = (f: Filters) => rows.filter(({ p, r }) => matches(p, f) && (f.judge === '전체' || laneOf(r) === f.judge));
    const visible = shown(applied);
    const judged = visible.filter(({ r }) => r?.status === 'ready'), waiting = visible.filter(({ r }) => r?.status !== 'ready');
    const visibleLanes = applied.judge === '전체' || track === '종합' ? lanes : lanes.filter(l => l.key === applied.judge);
    const noGrades = !data.grades.length, chips = chipsOf(applied);
    const board = [...(data.boards ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'ko'))[0];
    const empty = noGrades ? { icon: 'file-text', title: '아직 입력한 성적이 없어요', body: '성적을 입력하면 검수된 기준으로 입결과 비교해요.', action: <Link className="button-primary" to="/grade-input">성적 입력하기</Link> }
      : conversion.status !== 'ready' ? { icon: 'file-text', title: conversion.reason, body: '석차등급이 있는 과목을 입력하면 검수된 기준으로 입결과 비교해요.', action: <Link className="button-primary" to="/grade-input">성적 입력하기</Link> }
      : !rows.length ? { icon: 'folder', title: '검수된 입결 자료를 준비하고 있어요', body: '입결과 판정 기준이 모두 준비된 전형만 판정해요.', action: <Link className="button-primary" to="/admission-results">수시 입결 보기</Link> }
      : !visible.length ? { icon: 'search', title: '조건에 맞는 전형이 없어요', body: `${chips.map(c => c.label).join(' · ')}으로 찾았어요. 조건을 하나씩 풀어 보세요.`, action: <button type="button" className="button-primary" onClick={() => apply(EMPTY)}>필터 초기화</button> }
      : null;
    const active = rows.find(({ p }) => p.id === selected);
    const pendingGroups = [...new Set(waiting.map(({ r }) => pendingName(r)))].map(name => ({ name, items: waiting.filter(({ r }) => pendingName(r) === name) }));

    const card = ({ p, r }: Row) => {
      const ok = r?.status === 'ready' ? r.value : null, range = conversion.status === 'ready' ? conversion.value : null;
      const conditions = [...(!ok && r ? [pendingName(r)] : []), p.minimum_required ? '수능최저 있음' : '수능최저 없음'];
      return <article className="univ-card dg-card" key={p.id} aria-current={p.id === selected || undefined}>
        <header><UniversityLogo university={p.university} /><InterestButton university={p.university} program={p.program} department={p.department || undefined} compact /></header>
        <h3 className="t-heading-4"><button type="button" className="dg-card__open" onClick={() => setSelected(p.id === selected ? '' : p.id)} aria-pressed={p.id === selected}>{p.university}</button></h3>
        <p className="dg-card__program">{[p.department, p.program].filter(Boolean).join(' · ')}</p>
        <div className="dg-card__numbers"><span className="t-caption text-muted">내 환산</span>
          <div className="dg-card__range"><strong className="num">{range ? rangeText(range.min, range.max) : '—'}</strong>{ok?.boundary && <span className="dg-boundary">경계</span>}</div>
          {p.fill_rate !== undefined && <span className="t-caption text-muted">충원율 약 {p.fill_rate}%</span>}
          <span className="t-caption text-muted num">{ok && p.cut ? `70% 컷 ${fmt(p.cut.cut70)} · 차이 ${diffText(range!.max, p.cut.cut70)}` : `70% 컷 — · ${r?.status === 'ready' ? '' : r?.reason ?? '환산 결과 준비 중'}`}</span></div>
        {range && <MiniBar min={range.min} max={range.max} cut={ok && p.cut ? p.cut.cut70 : undefined} />}
        <div className="dg-card__chips">{conditions.map(c => <span key={c} className="data-status-badge">{c}</span>)}</div>
      </article>;
    };
    const laneHead = (l: Lane, count: number) => <header><span className={`judge-badge judge-${l.tone}`}><span aria-hidden="true">{l.icon}</span> {l.label}</span><span className="dg-count">{count}개</span></header>;
    const sheetCount = shown(draft).length;

    return <>
      <div className="dg-layout">
        <aside className="dg-filters" aria-label="판정 조회 조건"><h3 className="t-heading-4">필터</h3>
          <fieldset disabled={noGrades}><FilterFields value={draft} onChange={setDraft} combo={combo} onCombo={setCombo} /></fieldset>
          <div className="dg-filter-actions"><button type="button" className="button-outline" onClick={() => apply(EMPTY)}>초기화</button><button type="button" className={empty ? 'button-outline' : 'button-primary'} onClick={() => setApplied(draft)} disabled={noGrades}>적용하기</button></div>
        </aside>
        <div className="dg-main">
          <div className="dg-toolbar"><SegmentedControl label="전형" value={track} onChange={setTrack} options={[{ value: '교과', label: '교과' }, { value: '종합', label: '종합' }]} />
            <SegmentedControl label="보기" value={view} onChange={setView} options={[{ value: 'lane', label: '레인 보기' }, { value: 'table', label: '표 보기' }]} /></div>
          <div className="dg-summary"><p className="t-body-sm num">{applied.judge !== '전체' && track === '교과' ? `판정된 전형 ${judged.length}개 · ${applied.judge}만 보는 중` : `판정된 전형 ${judged.length}개${waiting.length ? ` · 판정 안 함 ${waiting.length}개` : ''}`}</p>
            <p className="t-caption text-muted num">관심 {data.interests?.length ?? 0} · 수시로 6칸 중 {board?.slots.length ?? 0}칸</p></div>
          <div className="dg-filter-row"><button type="button" className="button-pill-soft" onClick={() => { setDraft(applied); setSheet(true); }} disabled={noGrades}><Icon name="sliders-horizontal" size={20} />필터{chips.length ? ` ${chips.length}` : ''}</button>
            {chips.map(c => <button key={c.label} type="button" className="filter-chip" aria-pressed="true" aria-label={`${c.label} 조건 빼기`} onClick={() => apply(c.clear(applied))}>{c.label}<Icon name="x" size={16} /></button>)}</div>
          {view === 'table' && !empty ? <div className="table-scroll"><table className="data-table dg-table"><thead><tr><th>대학</th><th>학과 · 전형</th><th className="num">내 환산 9등급</th><th className="num">70% 컷</th><th className="num">차이</th><th>판정</th><th>관심</th></tr></thead>
            <tbody>{[...lanes.flatMap(l => judged.filter(({ r }) => laneOf(r) === l.key)), ...waiting].map(({ p, r }) => { const ok = r?.status === 'ready' ? r.value : null, l = lanes.find(x => x.key === ok?.label); return <tr key={p.id}>
              <td><span className="dg-table__univ"><UniversityLogo university={p.university} />{p.university}</span></td><td>{[p.department, p.program].filter(Boolean).join(' · ')}</td>
              <td className="num">{conversion.status === 'ready' ? rangeText(conversion.value.min, conversion.value.max) : '—'}</td><td className="num">{ok && p.cut ? fmt(p.cut.cut70) : '—'}</td><td className="num">{ok && p.cut && conversion.status === 'ready' ? diffText(conversion.value.max, p.cut.cut70) : '—'}</td>
              <td>{l ? <span className={`judge-badge judge-${l.tone}`}><span aria-hidden="true">{l.icon}</span> {l.label}</span> : <span className="data-status-badge">{pendingName(r)}</span>}</td>
              <td><InterestButton university={p.university} program={p.program} department={p.department || undefined} compact /></td></tr>; })}</tbody></table></div>
          : <>
            <div className={`dg-lanes dg-lanes--${visibleLanes.length}`}>{visibleLanes.map(l => { const group = judged.filter(({ r }) => laneOf(r) === l.key); return <section className={`dg-lane${group.length ? '' : ' dg-lane--empty'}`} key={l.key} aria-label={`${l.label} 전형`}>{laneHead(l, group.length)}
              {group.length ? group.map(card) : !empty && <p className="t-caption text-muted">표시할 전형이 없어요</p>}</section>; })}</div>
            {!empty && applied.judge === '전체' && pendingGroups.map(g => <section className="dg-lane dg-pending" key={g.name} aria-label={`${g.name} 전형`}><header><span className="data-status-badge">{g.name}</span><span className="dg-count">{g.items.length}개</span></header><div className="dg-pending__cards">{g.items.map(card)}</div></section>)}
          </>}
          {empty && <div className="empty-state dg-empty"><Icon name={empty.icon} size={40} /><h3 className="t-heading-4">{empty.title}</h3><p className="t-body-sm">{empty.body}</p>{empty.action}</div>}
          <TraceAccordion trace={[...conversion.trace, ...(active?.r?.trace ?? [])]} />
          {active && <ComparisonDetails input={inputBasis} cut={active.p.cut_basis} />}
          <Disclaimer icon lead="대학 공식 자료가 최종 기준이에요" sample={isSampleMode()} />
        </div>
      </div>
      {sheet && <Modal label="필터" onClose={() => setSheet(false)}>
        <div className="dg-sheet"><div className="dg-sheet__head"><h3 className="t-heading-4">필터</h3><button type="button" className="dg-sheet__close" aria-label="닫기" onClick={() => setSheet(false)}><Icon name="x" size={24} /></button></div>
          <FilterFields value={draft} onChange={setDraft} combo={combo} onCombo={setCombo} />
          <div className="dg-sheet__actions"><button type="button" className="button-outline" onClick={() => setDraft(EMPTY)}>초기화</button><button type="button" className="button-primary" onClick={() => { setApplied(draft); setSheet(false); }}>결과 {sheetCount}개 보기</button></div></div>
      </Modal>}
    </>;
  }}</StudentDataScreen>;
}
