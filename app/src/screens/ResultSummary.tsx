import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { QrScanner } from '../components/QrScanner';
import { UniversityLogo, universityLogoFile } from '../components/UniversityLogo';
import { admissionYear, dataAsOf } from '../data/catalog';
import { studentLabel, type Student } from '../domain/classroom';
import { AREAS } from '../domain/mock';
import { examsByRecent } from '../domain/minimum';
import { RESULTS, byUniversity, outcomesFromCards, receiveMock, totals, type AdmissionType, type Outcome, type Result, type UnivRow } from '../domain/outcomes';
import { downloadFile } from '../io/backup';
import { xlsxOf } from '../io/grades';
import { teacherDb, type ClassState } from '../store/teacherDb';
import '../styles/result-summary.css';

// v2 시안 result-summary/1440 · 390(459:61275 · 460:65555)과 상태 프레임(05-build.json states)
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SOURCE_NOTE = '학생이 보낸 카드와 직접 입력한 결과를 모았어요 · 대학 공식 발표가 최종 기준이에요 · 샘플의 대학·숫자는 예시예요';
const MOCK_NOTE = '학생이 낸 가채점 원점수를 모았어요 · 등급컷이 검수되면 추정 등급과 최저 충족을 보여 줘요 · 성적 통지표와 대학 모집요강이 최종 기준이에요';
// 02-spec 8절 · 기존 결정: hwpx·pdf는 아직 만들지 않아 목록에만 보이고 고를 수 없어요
const FORMATS = [
  { key: 'xlsx', note: '엑셀 표', ready: true },
  { key: 'hwpx', note: '한글 문서 · 준비 중', ready: false },
  { key: 'pdf', note: '인쇄용 · 준비 중', ready: false },
] as const;
const GROUPS = ['교과', '종합', '논술·기타'] as const;
type Group = typeof GROUPS[number];
const groupOf = (t: AdmissionType): Group => t === '교과' || t === '종합' ? t : '논술·기타';
const STATUS = ['충원 합격', '미등록', '미입력'] as const;
type Status = typeof STATUS[number];
const failed = (c: Record<Result, number>) => c['불합격'] + c['1단계 불합격'];
const passed = (o: Outcome) => o.result === '합격' || o.result === '충원 합격';
type Ready = ClassState & { info: NonNullable<ClassState['info']> };

const MEDIA = '(min-width: 1024px)';
/** PC(사이드바) · 모바일(보기 전용) 화면을 나눠 그려요. matchMedia가 없는 환경(테스트)은 PC로 봐요. */
function useDesktop() {
  const [desktop, setDesktop] = useState(() => typeof matchMedia !== 'function' || matchMedia(MEDIA).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia(MEDIA), update = () => setDesktop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}
const slot = (selector: string) => typeof document === 'undefined' ? null : document.querySelector(selector);
/** PC 머리(page-header)의 lead 문장 · 기준일 배지, 모바일 앱바 오른쪽 기준일 배지 */
function Head({ desktop, lead }: { desktop: boolean; lead: string }) {
  const head = desktop ? slot('.topbar__heading') : null, badge = slot(desktop ? '#topbar-screen-actions' : '#appbar-actions');
  return <>{head && createPortal(<p className="rs-lead">{lead}</p>, head)}{badge && createPortal(<span className="data-status-badge rs-asof">데이터 기준일 {dataAsOf}</span>, badge)}</>;
}
/** univ-logo, 로고 파일이 없으면 univ-monogram(첫 글자) */
const Logo = ({ university }: { university: string }) => universityLogoFile(university) ? <UniversityLogo university={university} /> : <span className="rs-mono" aria-hidden="true" data-ch={university.slice(0, 1)} />;
const label = (s: Pick<Student, 'number' | 'alias'>) => `${s.number} ${s.alias}`;
const md = (iso: string) => iso.slice(0, 10);

export function ResultSummary() {
  const mock = useLocation().pathname.endsWith('/mock'), navigate = useNavigate(), desktop = useDesktop();
  const tabs = <SegmentedControl label="결과 집계 탭" value={mock ? 'mock' : 'results'} onChange={v => navigate(v === 'mock' ? '/teacher/result-summary/mock' : '/teacher/result-summary')}
    options={[{ value: 'results', label: '수시 결과' }, { value: 'mock', label: '가채점 수합' }]} />;
  return <ClassGate slug="result-summary" title={mock ? '가채점 수합' : '결과 집계'}>{c => mock ? <MockTab {...c} desktop={desktop} tabs={tabs} /> : <ResultsTab {...c} desktop={desktop} tabs={tabs} />}</ClassGate>;
}

function StatBand({ tiles, className = '' }: { tiles: [string, string, string, boolean?][]; className?: string }) {
  return <div className={`rs-stats ${className}`}>{tiles.map(([name, value, sub, accent]) => <div key={name} className="stat-tile">
    <span className="rs-stat__label">{name}</span><strong className={`num${accent ? ' key-number' : ''}`}>{value}</strong><span className="rs-stat__sub num">{sub}</span></div>)}</div>;
}
function Note({ children }: { children: ReactNode }) {
  return <p className="disclaimer-note rs-note"><Icon name="info" size={16} />{children}</p>;
}
function Toast({ text }: { text: string | null }) {
  return text ? <div role="status" className="toast rs-toast">{text}</div> : null;
}

function ResultsTab({ info, students, outcomes, cards, desktop, tabs }: Ready & { desktop: boolean; tabs: ReactNode }) {
  const navigate = useNavigate();
  const [view, setView] = useState<'univ' | 'student'>('univ'), [query, setQuery] = useState('');
  const [types, setTypes] = useState<Group[]>([]), [statuses, setStatuses] = useState<Status[]>([]);
  const [open, setOpen] = useState<string[]>([]), [sort, setSort] = useState<{ key: 'applied' | 'pass' | 'missing'; desc: boolean } | null>(null);
  const [mobileFilter, setMobileFilter] = useState<'all' | 'missing'>('all');
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const [saveOpen, setSaveOpen] = useState(false), [sheet, setSheet] = useState(false), [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3000); return () => window.clearTimeout(t); }, [toast]);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!saveOpen) return;
    const close = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node)) setSaveOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, [saveOpen]);

  const t = totals(outcomes), mine = (n: string) => outcomes.filter(o => o.number === n);
  const applicants = new Set(outcomes.map(o => o.number)).size;
  const asOf = cards.length ? md(cards.map(c => c.received_at).sort().at(-1)!) : dataAsOf;
  const fromCards = async () => {
    const items = outcomesFromCards(cards);
    if (!items.length) { setError('받은 상담카드가 없어요. 카드 수합에서 먼저 받아 주세요.'); return; }
    await teacherDb.transaction('rw', teacherDb.outcomes, async () => { await teacherDb.outcomes.clear(); await teacherDb.outcomes.bulkAdd(items); });
    setError(''); setMessage(`상담카드 ${new Set(items.map(i => i.number)).size}명 · ${items.length}건으로 지원 목록을 만들었어요. 결과는 학생별 보기에서 넣어요.`);
  };
  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];
  const q = query.trim();
  const typed = outcomes.filter(o => !types.length || types.includes(groupOf(o.type)));
  const hasStatus = (c: Record<Result, number>) => !statuses.length || statuses.some(s => c[s] > 0);

  // 대학별: 교과 · 종합 · 논술·기타 묶음. 한 묶음에 행이 5개를 넘으면 위 4개 + "그 밖의 대학 n곳"(눌러 펼침). 논술·기타는 다른 묶음이 있으면 소계만(접힘)
  const sortRows = (rows: UnivRow[]) => !sort ? rows : [...rows].sort((a, b) => {
    const v = (r: UnivRow) => sort.key === 'applied' ? r.applied : sort.key === 'pass' ? r.counts['합격'] : r.counts['미입력'];
    return (v(a) - v(b)) * (sort.desc ? -1 : 1);
  });
  const univRows = byUniversity(typed.filter(o => !q || `${o.university} ${o.program}`.includes(q)));
  const groups = GROUPS.map(g => ({ g, rows: sortRows(univRows.filter(x => groupOf(x.type) === g).flatMap(x => x.rows).filter(r => hasStatus(r.counts))) })).filter(x => x.rows.length);
  const sum = (rows: UnivRow[]) => {
    const counts = Object.fromEntries(RESULTS.map(r => [r, rows.reduce((n, x) => n + x.counts[r], 0)])) as Record<Result, number>;
    const stage = rows.filter(r => r.stage1 !== null);
    return { applied: rows.reduce((n, r) => n + r.applied, 0), stage1: stage.length ? stage.reduce((n, r) => n + r.stage1!, 0) : null, counts };
  };
  const allShown = sum(groups.flatMap(x => x.rows));

  const studentRows = students.filter(s => {
    const list = mine(s.number).filter(o => !types.length || types.includes(groupOf(o.type)));
    return list.length && (!statuses.length || list.some(o => (statuses as string[]).includes(o.result)))
      && (!q || label(s).includes(q) || studentLabel(s).includes(q) || list.some(o => o.university.includes(q)));
  }).map(s => ({ s, list: mine(s.number), missing: mine(s.number).some(o => o.result === '미입력'), final: mine(s.number).filter(passed).length }))
    // 미입력 있는 학생 먼저(그 안은 최종 합격 많은 순), 그다음 번호 순 — v2 시안 순서
    .sort((a, b) => Number(b.missing) - Number(a.missing) || (a.missing ? b.final - a.final : 0) || a.s.number.localeCompare(b.s.number));
  const viewName = view === 'univ' ? '대학별' : '학생별';
  const filterCount = types.length + statuses.length + (q ? 1 : 0);
  const clearFilters = () => { setTypes([]); setStatuses([]); setQuery(''); };

  // 02-spec 8절: 머리 · 개인정보 줄 · 화면 표 · 고지. 내 기기 저장이라 확인 창 없이 바로 저장해요(design.md 예외)
  const saveXlsx = async (which: 'univ' | 'student') => {
    setSaveOpen(false); setSheet(false);
    const name = which === 'univ' ? '대학별' : '학생별';
    const file = `결과집계_${info.name.replace(/\s/g, '')}_${admissionYear}수시_${name}.xlsx`;
    try {
      const rows = which === 'univ'
        ? groups.flatMap(x => x.rows.map(r => [x.g, r.university, r.program, r.applied, r.stage1, r.counts['합격'], r.counts['충원 합격'], failed(r.counts), r.counts['미등록'], r.counts['미입력']]))
        : studentRows.map(({ s, list, final }) => [label(s), final, ...list.slice(0, 6).map(o => `${o.university} ${o.program} · ${o.result}`)]);
      const headers = which === 'univ' ? ['전형 유형', '대학', '전형', '지원', '1단계 통과', '합격', '충원 합격', '불합격', '미등록', '미입력'] : ['학생', '최종 합격', ...[1, 2, 3, 4, 5, 6].map(i => `지원 ${i}`)];
      downloadFile(await xlsxOf(name, [`결과 집계 · ${info.name} · ${admissionYear}학년도 수시 · ${name} 보기 · 저장일 ${new Date().toISOString().slice(0, 10)}`],
        [['학생 개인정보가 들어 있어요 · 학교 밖으로 보내지 마세요'], ...(filterCount ? [[`필터: ${[...types, ...statuses, q].filter(Boolean).join(', ')}`]] : []), [], headers, ...rows, [], [SOURCE_NOTE]]), file, XLSX);
      setToast('결과 집계를 xlsx로 저장했어요');
    } catch { setToast('파일을 저장하지 못했어요. 다시 저장해 주세요.'); }
  };

  const tiles: [string, string, string, boolean?][] = [
    ['지원', `${t.applied}건`, `${applicants}명 · ${desktop ? '학생당 ' : ''}최대 6건`],
    ['최종 합격', `${t.final}건`, `합격 ${t.counts['합격']} · 충원 합격 ${t.counts['충원 합격']}`, true],
    ['합격한 학생', `${t.passedStudents}명`, `${students.length}명 중`],
    ['결과 미입력', `${t.counts['미입력']}건`, desktop ? '학생별 보기에서 셀을 눌러 입력해요' : 'PC에서 입력해요'],
  ];
  const notices = <>{error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status" className="notice">{message}</p>}</>;
  const lead = outcomes.length ? `${info.name} ${students.length}명의 수시 지원 ${t.applied}건을 대학별·학생별로 모았어요.` : '받은 상담카드로 수시 지원 목록을 만들고 결과를 모아요.';
  const title = `${info.name} · ${admissionYear}학년도 수시`;

  if (!desktop) {
    const missingStudents = studentRows.filter(r => r.missing).length;
    const list = studentRows.filter(r => mobileFilter === 'all' || r.missing);
    return <div className="rs rs--mobile">
      <Head desktop={false} lead={lead} />
      <p className="rs-viewonly"><Icon name="info" size={16} />보기 전용이에요. 결과 입력은 PC에서 해요.</p>
      <div className="rs-tabs">{tabs}
        <div className="rs-caprow"><span className="t-caption text-muted">{title} · {asOf} 기준</span>
          {outcomes.length > 0 && <ButtonOutline onClick={() => setSheet(true)}><Icon name="download" size={20} />저장</ButtonOutline>}</div></div>
      {notices}
      {!outcomes.length ? <div className="empty-state rs-empty"><Icon name="file-text" size={48} /><h2>아직 모은 결과가 없어요</h2><p>카드 수합에서 학생 카드를 받으면 여기서 볼 수 있어요.</p></div> : <>
        <StatBand tiles={tiles} />
        <section className="rs-students" aria-label="학생별 결과">
          <div className="rs-students__head"><h2>학생별 결과</h2><span className="t-caption text-muted">미입력 있는 학생 먼저</span></div>
          <div className="rs-chips" role="group" aria-label="학생 거르기">
            <button type="button" className="filter-chip" aria-pressed={mobileFilter === 'all'} onClick={() => setMobileFilter('all')}>전체 {studentRows.length}</button>
            <button type="button" className="filter-chip" aria-pressed={mobileFilter === 'missing'} onClick={() => setMobileFilter('missing')}>미입력 있음 {missingStudents}</button></div>
          <ul className="rs-student-list">{list.map(({ s, list: apps, final }) => {
            const counts = RESULTS.map(r => [r, apps.filter(o => o.result === r).length] as const).filter(([, n]) => n);
            return <li key={s.number} className="student-row-card"><p className="rs-src__line1"><strong className="num">{s.number}</strong><span>{s.alias}</span><span className="rs-src__final">최종 합격 {final}</span></p>
              <p className="rs-src__line2 num">{counts.map(([r, n]) => `${r} ${n}`).join(' · ')}</p></li>;
          })}</ul>
        </section>
        <Note>{SOURCE_NOTE}</Note></>}
      {sheet && <Modal label="결과 저장" onClose={() => setSheet(false)}>
        <div className="rs-sheet__head"><h2>결과 저장</h2><button type="button" className="rs-sheet__close" aria-label="닫기" onClick={() => setSheet(false)}><Icon name="x" size={24} /></button></div>
        <ul className="rs-sheet__list">{FORMATS.map(f => <li key={f.key}><button type="button" className="rs-format" aria-pressed={f.key === 'xlsx'} disabled={!f.ready}><span className="rs-format__name">{f.key}</span><span className="rs-format__note">{f.note}</span></button></li>)}</ul>
        <p className="rs-sheet__note">지금 보기와 필터를 그대로 담아요. 학생은 번호·별칭으로 들어가요.</p>
        <div className="rs-sheet__actions"><ButtonOutline onClick={() => setSheet(false)}>취소</ButtonOutline><ButtonPrimary onClick={() => saveXlsx('student')}>xlsx로 저장</ButtonPrimary></div>
      </Modal>}
      <Toast text={toast} />
    </div>;
  }

  const saveMenu = <div className="rs-save" ref={menu} onKeyDown={e => { if (e.key === 'Escape') setSaveOpen(false); }}>
    <ButtonOutline aria-expanded={saveOpen} aria-controls="result-save-list" onClick={() => setSaveOpen(!saveOpen)}><Icon name="download" size={20} />저장</ButtonOutline>
    {saveOpen && <div id="result-save-list" className="rs-dropdown" role="group" aria-label="저장 형식">
      <p className="rs-dropdown__head">저장 형식</p>
      {FORMATS.map(f => <button key={f.key} type="button" className="rs-dropdown__option" disabled={!f.ready} onClick={f.ready ? () => saveXlsx(view) : undefined}>
        <span className="rs-dropdown__name">{f.key}</span><span className="rs-dropdown__note">{f.note}</span></button>)}
      <p className="rs-dropdown__foot">지금 보기({viewName})와 필터를 그대로 담아요. 학생은 번호·별칭으로 들어가요.</p></div>}
  </div>;
  const sortHead = (key: 'applied' | 'pass' | 'missing', text: string) => {
    const on = sort?.key === key;
    return <th className="num" aria-sort={on ? (sort!.desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="rs-sort" onClick={() => setSort(on && sort!.desc ? { key, desc: false } : on ? null : { key, desc: true })}>{text}<Icon name="arrow-up-down" size={16} /></button></th>;
  };
  const numCells = (r: { applied: number; stage1: number | null; counts: Record<Result, number> }, link?: () => void) => <>
    <td className="num">{r.applied}</td><td className={`num${r.stage1 === null ? ' rs-none' : ''}`}>{r.stage1 ?? '–'}</td>
    <td className="num">{r.counts['합격']}</td><td className="num">{r.counts['충원 합격']}</td><td className="num">{failed(r.counts)}</td><td className="num">{r.counts['미등록']}</td>
    <td className="num">{r.counts['미입력'] > 0 && link ? <button type="button" className="rs-link" onClick={link}>{r.counts['미입력']}</button> : r.counts['미입력']}</td></>;
  const goMissing = (university?: string) => () => { setView('student'); setStatuses(['미입력']); setQuery(university ?? ''); };
  const univCols = <colgroup><col style={{ width: 78 }} /><col /><col style={{ width: 88 }} /><col style={{ width: 96 }} /><col style={{ width: 88 }} /><col style={{ width: 96 }} /><col style={{ width: 88 }} /><col style={{ width: 88 }} /><col style={{ width: 89 }} /></colgroup>;
  const univTable = <table className="data-table rs-table rs-table--univ">
    {univCols}
    <thead><tr><th>전형 유형</th><th>대학 · 전형</th>{sortHead('applied', '지원')}<th className="num">1단계 통과</th>{sortHead('pass', '합격')}<th className="num">충원 합격</th><th className="num">불합격</th><th className="num">미등록</th>{sortHead('missing', '미입력')}</tr></thead>
    <tbody>{groups.flatMap(({ g, rows }) => {
      const folded = g === '논술·기타' && groups.length > 1 && !open.includes(g), restOpen = open.includes(`${g}-rest`);
      const head = rows.length > 5 && !restOpen ? rows.slice(0, 4) : rows, rest = rows.slice(4);
      const unfold = (key: string) => () => setOpen(open.includes(key) ? open.filter(x => x !== key) : [...open, key]);
      const sub = sum(rows);
      if (folded) return [<tr key={g} className="rs-row--sub rs-row--expand" onClick={unfold(g)}><td /><td><button type="button" className="rs-expand" aria-expanded={false} onClick={e => { e.stopPropagation(); unfold(g)(); }}>{g} 소계<Icon name="chevron-down" size={20} /></button></td>{numCells(sub, goMissing())}</tr>];
      return [...head.map((r, i) => <tr key={r.key}><td className="rs-type">{i === 0 ? g : ''}</td>
        <td><span className="rs-univ"><Logo university={r.university} />{r.university}{r.program && ` · ${r.program}`}</span></td>{numCells(r, goMissing(r.university))}</tr>),
        ...(head.length < rows.length ? [<tr key={`${g}-rest`} className="rs-row--expand" onClick={unfold(`${g}-rest`)}><td /><td><button type="button" className="rs-expand" aria-expanded={false} onClick={e => { e.stopPropagation(); unfold(`${g}-rest`)(); }}>그 밖의 대학 {new Set(rest.map(r => r.university)).size}곳<Icon name="chevron-down" size={20} /></button></td>{numCells(sum(rest), goMissing())}</tr>] : []),
        <tr key={`${g}-sum`} className="rs-row--sub"><td /><td>{g} 소계</td>{numCells(sub, goMissing())}</tr>];
    })}</tbody>
    <tfoot><tr className="rs-row--total"><td /><td>전체 합계</td>{numCells(allShown)}</tr></tfoot></table>;
  const studentTable = <table className="data-table rs-table rs-table--student">
    <colgroup><col style={{ width: 116 }} /><col style={{ width: 88 }} />{[1, 2, 3, 4, 5, 6].map(i => <col key={i} />)}</colgroup>
    <thead><tr><th>학생</th><th className="num">최종 합격</th>{[1, 2, 3, 4, 5, 6].map(i => <th key={i}>지원 {i}</th>)}</tr></thead>
    <tbody>{studentRows.map(({ s, list, final }) => <tr key={s.number}><td>{label(s)}</td><td className="num">{final}</td>
      {Array.from({ length: 6 }, (_, i) => { const o = list[i]; return <td key={i} className="rs-apply">{o ? <>
        <span className="rs-apply__univ"><Logo university={o.university} />{o.university}</span>
        <span className="rs-apply__program">{[o.program, o.type].filter(Boolean).join(' · ')}</span>
        <span className="rs-select"><select aria-label={`${studentLabel(s)} ${o.university} 결과`} value={o.result} className={o.result === '미입력' ? 'is-empty' : ''}
          onChange={e => teacherDb.outcomes.update(o.id!, { result: e.target.value as Result })}>{RESULTS.map(r => <option key={r}>{r}</option>)}</select><Icon name="chevron-down" size={20} /></span></> : <span className="text-muted">–</span>}</td>; })}</tr>)}</tbody></table>;
  const empty = view === 'univ' ? !groups.length : !studentRows.length;

  return <div className="rs">
    <Head desktop lead={lead} />
    <div className="rs-tabrow">{tabs}<strong className="rs-tabrow__title">{title}</strong>
      {outcomes.length > 0 && <span className="rs-tabrow__caption">학생이 보낸 카드와 직접 입력한 결과 · {asOf} 기준</span>}</div>
    {notices}
    {!outcomes.length ? <div className="rs-card rs-card--empty"><div className="empty-state rs-empty"><Icon name="file-text" size={48} /><h2>아직 모은 결과가 없어요</h2>
      <p>카드 수합에서 학생 카드를 받으면 지원 목록이 생기고, 결과는 학생별 보기에서 직접 입력해요. 학생은 번호·별칭으로만 보여요.</p>
      {cards.length ? <ButtonPrimary onClick={fromCards}>받은 상담카드로 목록 만들기</ButtonPrimary> : <ButtonPrimary onClick={() => navigate('/teacher/card-collect')}>카드 수합으로 가기</ButtonPrimary>}</div></div> : <>
      <StatBand tiles={tiles} />
      <section className="rs-card" aria-label="결과 표">
        <div className="rs-toolbar"><SegmentedControl label="보기" value={view} onChange={setView} options={[{ value: 'univ', label: '대학별' }, { value: 'student', label: '학생별' }]} />{saveMenu}</div>
        <div className="rs-filters">
          <label className="text-input rs-search"><Icon name="search" size={20} /><input type="search" aria-label="학생·대학 검색" placeholder="학생·대학 검색" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <div className="rs-chips" role="group" aria-label="결과 거르기">
            {GROUPS.map(g => <button key={g} type="button" className="filter-chip" aria-pressed={types.includes(g)} onClick={() => setTypes(toggle(types, g))}>{g}</button>)}
            <span className="rs-chips__divider" aria-hidden="true" />
            {STATUS.map(s => <button key={s} type="button" className="filter-chip" aria-pressed={statuses.includes(s)} onClick={() => setStatuses(toggle(statuses, s))}>{s} {t.counts[s]}</button>)}</div>
        </div>
        <div className="rs-table-wrap">{empty ? <><table className="data-table rs-table"><thead><tr>{view === 'univ'
          ? ['전형 유형', '대학 · 전형', '지원', '1단계 통과', '합격', '충원 합격', '불합격', '미등록', '미입력'].map((h, i) => <th key={h} className={i > 1 ? 'num' : ''}>{h}</th>)
          : ['학생', '최종 합격', ...[1, 2, 3, 4, 5, 6].map(i => `지원 ${i}`)].map(h => <th key={h}>{h}</th>)}</tr></thead></table>
          <div className="rs-zero"><p>조건에 맞는 결과가 없어요</p><button type="button" className="rs-link rs-link--plain" onClick={clearFilters}>필터 모두 끄기</button></div></>
          : view === 'univ' ? univTable : studentTable}</div>
      </section>
      <Note>{SOURCE_NOTE}</Note></>}
    <Toast text={toast} />
  </div>;
}

function MockTab({ info, students, rawMocks, desktop, tabs }: Ready & { desktop: boolean; tabs: ReactNode }) {
  const exams = examsByRecent(rawMocks.map(m => m.exam));
  const [exam, setExam] = useState(''), [results, setResults] = useState<{ file: string; ok: boolean; reason: string }[]>([]);
  const [scanning, setScanning] = useState(false), [query, setQuery] = useState(''), [onlyMissing, setOnlyMissing] = useState(false);
  const current = exams.includes(exam) ? exam : exams[0];
  const take = async (texts: { name: string; text: string }[]) => {
    const got = await Promise.all(texts.map(t => receiveMock(t.name, t.text, info.code, students)));
    const ok = got.filter(g => g.record);
    if (ok.length) await teacherDb.rawMocks.bulkPut(ok.map(g => g.record!));
    setResults(prev => [...got, ...prev].sort((a, b) => Number(a.ok) - Number(b.ok)));
  };
  const read = async (list: FileList | null) => {
    if (!list?.length) return;
    await take(await Promise.all([...list].map(async f => ({ name: f.name, text: f.size > 1_000_000 ? '' : await f.text() }))));
  };
  const rows = students.map(s => ({ s, m: rawMocks.find(r => r.number === s.number && r.exam === current) }))
    .sort((a, b) => Number(!a.m) - Number(!b.m) || a.s.number.localeCompare(b.s.number));
  const submitted = rows.filter(r => r.m).length, missing = students.length - submitted;
  const shown = rows.filter(r => (!onlyMissing || !r.m) && (!query.trim() || label(r.s).includes(query.trim())));
  // NEVER-1: 검수된 등급컷이 없어서 추정 등급 · 최저 충족은 세지 않아요(원점수만)
  const tiles: [string, string, string, boolean?][] = [
    ['제출', `${submitted}명`, `${students.length}명 중`, true],
    ['최저 충족', '–', '등급컷 검수 후 보여요'],
    ['미충족', '–', '등급컷 검수 후 보여요'],
    ['미제출', `${missing}명`, desktop ? '학생에게 다시 알려 주세요' : '다시 알려 주세요'],
  ];
  const title = `${info.name} · ${current ?? '가채점'}`;
  const picker = <label className="button-outline rs-upload"><Icon name="upload" size={20} />가채점 파일 불러오기
    <input type="file" multiple accept=".jnavi" className="sr-only" aria-label="모의고사 파일 고르기" onChange={e => { read(e.target.files); e.target.value = ''; }} /></label>;
  const received = results.length > 0 && <ul className="receive-list rs-received" aria-label="받은 결과">{results.map((r, i) => <li key={i} className="t-body-sm">{r.ok ? <span className="judge-badge judge-safe">● 받음</span> : <span className="judge-badge judge-risk">■ 확인 필요</span>} {r.file}{r.reason && <span className={r.ok ? '' : ' reason-risk'}> {r.reason}</span>}</li>)}</ul>;
  const empty = <div className="empty-state rs-empty"><Icon name="file-text" size={48} /><h2>아직 받은 가채점 파일이 없어요</h2><p>학생이 모의고사 화면에서 '선생님께 보내기'로 저장한 파일을 받아 보세요.</p></div>;

  if (!desktop) return <div className="rs rs--mobile">
    <Head desktop={false} lead="" />
    <p className="rs-viewonly"><Icon name="info" size={16} />보기 전용이에요. 결과 입력은 PC에서 해요.</p>
    <div className="rs-tabs">{tabs}<div className="rs-caprow"><span className="t-caption text-muted">{current ?? '가채점'} · 등급컷 검수 전</span></div></div>
    {!current ? empty : <>
      <StatBand tiles={tiles} />
      <section className="rs-students" aria-label="학생별 최저 충족">
        <div className="rs-students__head"><h2>학생별 최저 충족</h2><span className="t-caption text-muted">미제출 학생은 아래</span></div>
        <div className="rs-chips" role="group" aria-label="학생 거르기">
          <button type="button" className="filter-chip" aria-pressed={!onlyMissing} onClick={() => setOnlyMissing(false)}>전체 {students.length}</button>
          <button type="button" className="filter-chip" aria-pressed={onlyMissing} onClick={() => setOnlyMissing(true)}>미제출 {missing}</button></div>
        <ul className="rs-student-list">{shown.map(({ s, m }) => <li key={s.number} className="student-row-card"><p className="rs-src__line1"><strong className="num">{s.number}</strong><span>{s.alias}</span><span className="rs-src__final num">{m ? m.created_at.slice(5, 10) : '미제출'}</span></p>
          <p className="rs-src__line2 num">{m ? AREAS.filter(a => m.raw[a.key] !== undefined).map(a => `${a.key.slice(0, 2)} ${m.raw[a.key]}`).join(' · ') : '–'}</p></li>)}</ul>
      </section>
      <Note>{MOCK_NOTE}</Note></>}
  </div>;

  return <div className="rs">
    <Head desktop lead="학생이 보낸 가채점 파일로 수능 최저 충족 현황을 모아요." />
    <div className="rs-tabrow">{tabs}<strong className="rs-tabrow__title">{title}</strong><span className="rs-tabrow__caption">등급컷 검수 전 · 원점수로 보여요</span></div>
    <StatBand tiles={tiles} />
    <section className="rs-card" aria-label="학생별 최저 충족">
      <div className="rs-toolbar"><h2 className="rs-card__title">학생별 최저 충족</h2>
        <div className="rs-toolbar__actions"><ButtonOutline onClick={() => setScanning(!scanning)}><Icon name="qr-code" size={20} />{scanning ? '카메라 닫기' : 'QR로 받기'}</ButtonOutline>{picker}</div></div>
      {scanning && <div className="rs-qr"><QrScanner onText={text => void take([{ name: 'QR 모의고사.jnavi', text }])} onFallback={() => setScanning(false)} /></div>}
      {received}
      {!current ? empty : <>
        <div className="rs-filters">
          <label className="text-input rs-search"><Icon name="search" size={20} /><input type="search" aria-label="학생 검색" placeholder="학생·대학 검색" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <div className="rs-chips" role="group" aria-label="학생 거르기">
            {exams.length > 1 && <SegmentedControl label="시험" value={current} onChange={setExam} options={exams.slice(0, 4).map(e => ({ value: e, label: e }))} />}
            <button type="button" className="filter-chip" aria-pressed={onlyMissing} onClick={() => setOnlyMissing(!onlyMissing)}>미제출 {missing}</button></div>
          <span className="rs-filters__caption">과목 값은 학생이 적은 원점수예요</span>
        </div>
        <div className="rs-table-wrap"><table className="data-table rs-table rs-table--mock">
          <thead><tr><th>학생</th><th>제출일</th>{AREAS.map(a => <th key={a.key} className="num">{a.key}</th>)}<th>최저 있는 카드</th></tr></thead>
          <tbody>{shown.map(({ s, m }) => <tr key={s.number}><td>{label(s)}</td>
            <td className="num">{m ? m.created_at.slice(5, 10) : <span className="text-muted">미제출</span>}</td>{AREAS.map(a => <td key={a.key} className="num">{m?.raw[a.key] ?? <span className="text-muted">–</span>}</td>)}
            <td>{m ? <span className="judge-badge judge-none">등급컷 준비 중</span> : <span className="text-muted">–</span>}</td></tr>)}</tbody></table></div></>}
    </section>
    <Note>{MOCK_NOTE}</Note>
  </div>;
}
