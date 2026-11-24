import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { ButtonPrimary } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { ScreenActions } from '../components/ScreenActions';
import { SendToTeacher } from '../components/SendToTeacher';
import { UniversityLogo } from '../components/UniversityLogo';
import { dataAsOf } from '../data/catalog';
import { cutTableFor, mockExams } from '../data/mock-exams';
import { sampleMinimums, type MinimumCriterion } from '../data/sample/mockScore';
import { isSampleMode, useSampleMode } from '../data/sample/mode';
import { SCREEN_AREAS, cutRange, readGrade, validRaw, type Area, type CutTable, type MockScore as Mock } from '../domain/mock';
import { CORE, examsByRecent, gradesForMinimum, judgeMinimum, minimumSum, type Core, type Verdict } from '../domain/minimum';
import type { MockGrades } from '../domain/scoreImport';
import { passesReview } from '../engine/types';
import { studentDb, useStudent } from '../store/studentDb';
import '../styles/mock-score.css';

/* 모의고사(가채점) — work/mock-score/02-spec.md · Figma 346:140444(mock-score/390 346:140445 · mock-score/1440 346:140564 + 상태 33장).
   예상 등급은 검수된(또는 샘플 모드의 sample 표식) 등급컷 표 읽기만 해요(NEVER-1). 수능 최저는 검수된 기준만 판정하고,
   교사 입력 · 미검수 기준은 "준비 중"으로 개수만 보여요. 판정 = 색 + 아이콘 + 이름. */

const LEAD = '원점수를 넣으면 등급컷으로 등급을 추정하고, 수능 최저 충족 현황을 보여 줘요.';
const SHORT: Record<Core, string> = { 국어: '국', 수학: '수', 영어: '영', 탐구: '탐' };
const MARK: Partial<Record<Verdict, string>> = { 충족: '●', 근접: '▲', 미충족: '✕' };
const BADGE: Record<Verdict, string> = { 충족: 'safe', 근접: 'fit', 미충족: 'risk', '자료 부족': 'none', '판정 불가': 'none' };

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

// ── 한국어 조사 · 목록
const final = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
const josa = (w: string, yes: string, no: string) => w + (final(w) ? yes : no);
const list = (xs: string[]) => xs.length === 2 ? `${josa(xs[0], '과', '와')} ${xs[1]}` : xs.join('·');
const subj = (xs: string[]) => josa(list(xs), '이', '가');

// ── 수능 최저 카드
type Card = { no: number; university: string; department: string; source: MinimumCriterion | null; judged: ReturnType<typeof judgeMinimum> | null; sum: number | null; line: string };
const coreOrder = (c: MinimumCriterion['criterion']) => [...(c.required ? [c.required] : []), ...CORE.filter(a => c.areas.includes(a) && a !== c.required)];
function lower(g: MockGrades, a: Core): MockGrades {
  const grades = { ...g.grades };
  for (const k of a === '탐구' ? ['탐구1', '탐구2'] : [a]) if (typeof grades[k] === 'number') grades[k] = Math.max(1, grades[k]! - 1);
  return { ...g, grades };
}
function cardLine(v: Verdict, g: MockGrades | null, m: MinimumCriterion, sum: number | null, values: Partial<Record<Core, number>>) {
  const c = m.criterion;
  if (v === '충족') return '기준 안이에요';
  if (v === '미충족') return `기준보다 등급 합이 ${sum! - c.sum} 커요`;
  if (v === '근접' && g) {
    const ok = coreOrder(c).filter(a => values[a] !== undefined && values[a]! > 1 && (minimumSum(lower(g, a), c) ?? 99) <= c.sum);
    const to = [...new Set(ok.map(a => values[a]! - 1))];
    if (to.length > 1) return `${ok.map(a => `${a} ${values[a]! - 1}등급`).join(' 또는 ')}이면 기준 안이에요`;
    return `${ok.length > 1 ? `${ok.join('·')} 중 하나가` : josa(ok[0], '이', '가')} ${to[0]}등급이면 기준 안이에요`;
  }
  const missing = c.areas.filter(a => values[a] === undefined);
  return `${list(missing)} 점수를 넣으면 볼 수 있어요`;
}
function buildCards(mock: Mock | undefined, table: CutTable | undefined, slots: { university: string; department: string; csat: string }[]) {
  const minimums = isSampleMode() ? sampleMinimums : [];
  const g = mock && table ? gradesForMinimum(mock, table) : null;
  const cards: Card[] = [], excluded: number[] = [];
  slots.forEach((s, i) => {
    const m = minimums.find(x => x.university === s.university) ?? null;
    if (isSampleMode() ? !m : s.csat === 'none') { excluded.push(i + 1); return; }
    if (!m || !passesReview(m)) { cards.push({ no: i + 1, university: s.university, department: s.department, source: m, judged: null, sum: null, line: '검수 전 기준이라 판정하지 않았어요' }); return; }
    const judged = judgeMinimum(mock?.exam ?? '', g ?? undefined, m.criterion), sum = g ? minimumSum(g, m.criterion) : null;
    cards.push({ no: i + 1, university: s.university, department: s.department, source: m, judged, sum, line: cardLine(judged.verdict, g, m, sum, judged.values) });
  });
  return { cards, excluded, grades: g };
}

/** 근거 단계(시안 trace-accordion): 출처 → 버전 · 기준일 → 판정에 쓴 등급 → 카드 기준 → 고른 영역 → 판정 규칙 → 결과. */
function steps(card: Card, table: CutTable, g: MockGrades | null): [string, string][] {
  const m = card.source!, c = m.criterion, v = card.judged!.values;
  const grade = (a: Core) => v[a] === undefined ? '—' : String(v[a]);
  const used = v.탐구 === undefined ? (['국어', '수학', '영어', '탐구'] as Core[]).map(a => `${SHORT[a]} ${grade(a)}`).join(' · ')
    : `국 ${grade('국어')} · 수 ${grade('수학')} · 영 ${grade('영어')}\n탐 ${grade('탐구')}(탐구1·탐구2 중 좋은 쪽)`;
  const out: [string, string][] = [
    ['등급컷 출처', table.source.replace(/^샘플 데이터\(가상\) · /, '').replace(/ (등록 .*)$/, '\n$1')], // 시안: 기관 이름 다음 줄에 "등록 예상 등급컷"
    ['버전 · 기준일', `${table.version}\n${table.as_of}`],
    ['판정에 쓴 등급', used],
    [`${card.no}번 카드 기준`, `${m.scope}\n${m.rule}${m.extra ? ` · ${m.extra}` : ''}`],
  ];
  if (g && card.sum !== null) {
    const rest = CORE.filter(a => c.areas.includes(a) && a !== c.required && v[a] !== undefined).sort((a, b) => v[a]! - v[b]!);
    const picked = [...(c.required ? [c.required] : []), ...rest].slice(0, c.count);
    const last = v[picked[picked.length - 1]]!, tied = rest.filter(a => v[a] === last), tiedPicked = tied.filter(a => picked.includes(a));
    const why = tied.length > tiedPicked.length ? `\n${subj(tied)} 같은 ${last}라\n${josa(list(tiedPicked), '을', '를')} 골랐어요` : '';
    out.push(['고른 영역', `${picked.map(a => `${a} ${v[a]}`).join(' + ')} = ${card.sum}${why}`]);
  }
  const rule: Record<Verdict, string> = { 근접: '한 영역만 1등급 좋아지면\n기준 안이므로 근접', 충족: '등급 합이 기준 안이라\n충족', 미충족: '한 영역이 1등급 좋아져도\n기준 밖이라 미충족', '자료 부족': '필요한 영역 점수가 없어\n자료 부족', '판정 불가': '대학 기준이 없어\n판정 불가' };
  out.push(['판정 규칙', rule[card.judged!.verdict]]);
  return out;
}

function Badge({ children, tone = 'none' }: { children: ReactNode; tone?: string }) {
  return <span className={`ms-badge ms-badge--${tone}`}>{children}</span>;
}
function Judge({ verdict }: { verdict: Verdict }) {
  const mark = MARK[verdict];
  return <span className={`judge-badge ms-judge ms-badge--${BADGE[verdict]}`}>{mark && <span className={`ms-mark ms-mark--${BADGE[verdict]}`} aria-hidden="true" />}<span>{verdict}</span></span>;
}
function Note({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`disclaimer-note ${className}`}><Icon name="info" size={16} /><span>{children}</span></p>;
}

export function MockScore() {
  const [query] = useSearchParams();
  return <MockScoreForm key={query.get('exam') ?? ''} requestedExam={query.get('exam')} />;
}

function MockScoreForm({ requestedExam }: { requestedExam: string | null }) {
  useSampleMode();
  const state = useStudent();
  const desktop = useDesktop();
  const [chosenExam, setExam] = useState<string | null>(null), [drafts, setDrafts] = useState<Partial<Record<Area, string>>>({});
  const [error, setError] = useState(''), [saveFailed, setSaveFailed] = useState<{ area: Area; text: string } | null>(null);
  const [toast, setToast] = useState(''), [sending, setSending] = useState(false), [picking, setPicking] = useState(false);
  const [confirm, setConfirm] = useState<Area | null>(null), [selected, setSelected] = useState<number | null>(null), [started, setStarted] = useState(false);
  const [head, setHead] = useState<Element | null>(null);
  useEffect(() => { setHead(desktop ? document.querySelector('.topbar__heading') : null); }, [desktop]);
  // 시안 390: sub-nav를 첫 탭(성적 입력)이 다 가려질 만큼 민 상태. 셸은 고른 탭이 보일 만큼만 밀어서 이 화면만 더 밀어요.
  useEffect(() => {
    if (desktop) return;
    const t = setTimeout(() => { const tabs = document.querySelectorAll<HTMLElement>('.sub-nav .sub-nav__tab'); if (tabs.length > 1) tabs[0].parentElement!.scrollLeft = tabs[1].offsetLeft - tabs[0].offsetLeft - 2; }); // 시안 탭 x(성적 추이 20 · 모의고사 261)
    return () => clearTimeout(t);
  }, [desktop]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }, [toast]);
  const firstInput = useRef<HTMLInputElement>(null);

  const mocks = state?.data?.mocks ?? [];
  const exams = examsByRecent([...mockExams, ...mocks.map(m => m.exam)]);
  const latestSaved = [...mockExams].reverse().find(e => mocks.some(m => m.exam === e && Object.keys(m.raw).length));
  const exam = chosenExam ?? (requestedExam && exams.includes(requestedExam) ? requestedExam : latestSaved ?? mocks[0]?.exam ?? mockExams[0]);
  const activeExam = useRef(exam); activeExam.current = exam;
  const lead = head && createPortal(<p className="t-body-lg ms-lead">{LEAD}</p>, head);

  if (!state?.data) return <section className="student-screen mock-score" data-slug="mock-score" aria-label="모의고사">{lead}
    {state ? <div className="ms-error" role="alert"><Icon name="triangle-alert" size={20} /><p>이 기기에 저장된 기록을 읽지 못했어요. 브라우저 저장 공간을 확인한 뒤 다시 읽어 주세요.</p><button type="button" className="button-outline" onClick={() => window.location.reload()}>다시 읽기</button></div>
      : <p className="ms-loading t-body-sm text-muted" role="status">기기에 저장된 기록을 읽고 있어요.</p>}</section>;

  const saved = mocks.find(m => m.exam === exam), table = cutTableFor(exam);
  const value = (a: Area) => drafts[a] ?? (saved?.raw[a] !== undefined ? String(saved.raw[a]) : '');
  const max = (a: Area) => SCREEN_AREAS.find(x => x.key === a)!.max;
  const save = async (a: Area, text: string) => {
    const next = text.trim() === '' ? undefined : Number(text);
    try {
      await studentDb.saveMockArea(exam, a, next);
      if (activeExam.current !== exam) return;
      setDrafts(d => { if (d[a] !== text) return d; const { [a]: _, ...rest } = d; return rest; });
      setSaveFailed(null); setToast(next === undefined ? `${a} 원점수를 지웠어요` : '이 기기에 저장했어요');
    } catch { if (activeExam.current === exam) setSaveFailed({ area: a, text }); }
  };
  const commit = (a: Area, text: string) => {
    setError('');
    if (drafts[a] === undefined) return; // 바꾸지 않은 칸
    const next = text.trim() === '' ? undefined : Number(text);
    if (next !== undefined && !validRaw(a, next)) { setError(`${a} 원점수는 0~${max(a)} 사이 정수로 적어 주세요`); return; }
    if (next === undefined && saved?.raw[a] !== undefined) { setConfirm(a); return; }
    if (next === saved?.raw[a]) { setDrafts(d => { const { [a]: _, ...rest } = d; return rest; }); return; }
    void save(a, text);
  };
  const changeExam = (e: string) => { setExam(e); setDrafts({}); setError(''); setSaveFailed(null); setPicking(false); setSelected(null); };

  const entered = SCREEN_AREAS.filter(a => saved?.raw[a.key] !== undefined).length;
  const apps = state.data.planning?.applications ?? [], board = state.data.boards?.[0];
  const slots = (board?.slots ?? []).map(s => ({ s, a: apps.find(x => x.id === s.application_id) })).filter(x => x.a)
    .map(({ s, a }) => ({ university: a!.university, department: a!.department, csat: s.csat }));
  const { cards, excluded, grades } = buildCards(saved, table, slots);
  const judgedCards = cards.filter(c => c.judged && c.judged.verdict !== '자료 부족' && c.judged.verdict !== '판정 불가');
  const count = (v: Verdict) => cards.filter(c => c.judged?.verdict === v).length;
  const pendingCount = cards.filter(c => !c.judged).length;
  const verdictCounts = (['충족', '근접', '미충족', '자료 부족'] as Verdict[]).filter(v => count(v)).map(v => `${v} ${count(v)}`);
  const active = cards.find(c => c.no === selected && c.judged) ?? cards.find(c => c.judged?.verdict === '근접') ?? cards.find(c => c.judged);
  const empty = !entered && !started;
  const noCut = !table;

  // ── 숫자 타일
  const tile = !board ? { value: '0장', sub: '수시로에 담은 카드가 없어요' }
    : !cards.length ? { value: '0장', sub: `담은 ${slots.length}장 모두 최저 없음` }
    : noCut ? { value: '준비 중', sub: '검수된 등급컷이 등록되면 충족 현황을 보여 드려요', muted: true }
    : { value: `${count('충족')} / ${judgedCards.length}장`, sub: [...(['근접', '미충족', '자료 부족'] as Verdict[]).filter(v => count(v)).map(v => `${v} ${count(v)}장`),
      ...(pendingCount ? [`검수 전이라 판정하지 않은 전형 ${pendingCount}개`] : []), ...(desktop && excluded.length ? [`최저 없는 카드 ${excluded.length}장 제외`] : [])].join(' · ') };

  // ── 영역별 원점수
  const gradeCell = (a: Area) => {
    const r = readGrade(saved?.raw[a], a, table);
    if (saved?.raw[a] === undefined) return { text: '—', muted: true };
    if (r.status !== 'ready') return { text: '준비 중', muted: true };
    return { text: `${r.absolute ? '' : '약 '}${r.min === r.max ? r.min : `${r.min}~${r.max}`}등급`, approx: !r.absolute, grade: r.min === r.max ? String(r.min) : `${r.min}~${r.max}`, absolute: r.absolute };
  };
  const input = (a: Area, ref?: typeof firstInput) => <input ref={ref} className="ms-input num" aria-label={`${a} 원점수`} inputMode="numeric" autoComplete="off"
    placeholder={desktop ? '' : '점수'} aria-invalid={error.startsWith(a) || undefined} value={value(a)}
    onChange={e => setDrafts(d => ({ ...d, [a]: e.target.value }))} onBlur={e => commit(a, e.target.value)}
    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />;
  const fieldError = error && <p className="ms-field-error" role="alert"><Icon name="triangle-alert" size={14} />{error}</p>;
  const saveError = saveFailed && <div className="ms-error" role="alert"><Icon name="triangle-alert" size={20} /><p>원점수를 저장하지 못했어요. 저장 공간을 확인한 뒤 다시 넣어 주세요.</p>
    <button type="button" className="button-outline" onClick={() => void save(saveFailed.area, saveFailed.text)}>다시 저장</button></div>;
  const gradeNote = noCut ? '이 시험의 검수된 예상 등급컷이 아직 없어요. 원점수는 이 기기에 저장되고, 등급컷이 등록되면 예상 등급을 보여 드려요.' : null;
  const disclaimer = gradeNote ? <p className="t-body-sm ms-nocut">{gradeNote}</p>
    : <Note>예상 등급은 가채점 원점수와 예상 등급컷으로 본 추정이에요 · 성적 통지표가 최종 기준이에요 · 등급컷 기준일 {table!.as_of}</Note>;

  const scores = empty ? <div className="empty-state ms-empty"><Icon name="clipboard-check" size={40} /><h3 className="t-heading-4">이 시험에 넣은 원점수가 아직 없어요</h3>
    <p className="t-body-sm">영역별 원점수를 넣으면 예상 등급과 수능 최저 충족 현황을 보여 드려요</p>
    <button type="button" className="button-primary" onClick={() => { setStarted(true); setTimeout(() => firstInput.current?.focus()); }}>원점수 넣기</button></div>
    : desktop ? <section className="ms-scores" aria-label="영역별 원점수">
      <div className="ms-scores__head"><h3 className="ms-scores__title">영역별 원점수</h3><span className="t-caption text-muted">칸을 누르고 숫자를 넣어요 · Tab·Enter로 다음 칸</span></div>
      <table className="ms-table"><thead><tr><th scope="col">영역</th><th scope="col">원점수</th><th scope="col">만점</th><th scope="col">예상 등급(추정)</th><th scope="col">걸친 컷 구간</th></tr></thead>
        <tbody>{SCREEN_AREAS.map(({ key, max: m }, i) => { const g = gradeCell(key), range = cutRange(saved?.raw[key], key, table);
          return <tr key={key}><th scope="row">{key}</th><td>{input(key, i === 0 ? firstInput : undefined)}</td><td className="num">{m}</td>
            <td className={`num${g.muted ? ' text-muted' : ''}`}>{g.text}</td><td className={range ? '' : 'text-muted'}>{range ?? (saved?.raw[key] === undefined ? '—' : '준비 중')}</td></tr>; })}</tbody></table>
      {fieldError}
      <div className="ms-pending"><Badge>준비 중</Badge><span className="t-caption text-muted">표준점수 · 백분위 · 정시 위치는 환산 규칙이 검수된 뒤에 보여 드려요</span></div>
      {disclaimer}
    </section>
    : <section className="ms-scores" aria-label="영역별 원점수">
      <div className="ms-scores__head"><h3 className="ms-scores__title">영역별 원점수</h3><span className="t-caption text-muted num">{SCREEN_AREAS.length}개 중 {entered}개 입력</span></div>
      <div className="ms-cols t-caption text-muted" aria-hidden="true"><span>영역</span><span>원점수</span><span>예상 등급(추정)</span></div>
      <ul className="ms-rows">{SCREEN_AREAS.map(({ key, max: m }, i) => { const g = gradeCell(key);
        return <li key={key}><span className="ms-rows__name">{key}</span><span className="ms-field">{input(key, i === 0 ? firstInput : undefined)}<span className="ms-field__suffix" aria-hidden="true">/ {m}</span></span>
          {g.grade ? <span className="ms-grade"><span className="ms-grade__line">{g.approx && <span className="ms-grade__approx">약</span>}<strong className="num">{g.grade}</strong><span className="ms-grade__unit">등급</span></span>{g.absolute && <span className="ms-grade__note">절대평가</span>}</span>
            : <span className={`ms-grade${g.muted ? ' text-muted' : ''}`}>{g.text}</span>}</li>; })}</ul>
      {fieldError}
      <div className="ms-foot"><span className="t-caption text-muted">표준점수·백분위는 준비 중이에요</span><Badge>환산 규칙 준비 중</Badge></div>
      {disclaimer}
    </section>;

  // ── 수능 최저 패널
  const cardItem = (c: Card) => {
    const on = desktop && c.judged && c === active, m = c.source;
    const criteria = m ? `${m.scope} ${m.rule}${m.extra ? `\n${m.extra}` : ''}` : '최저 기준 등록 전';
    return <li key={c.no} className={`ms-card${on ? ' is-selected' : ''}`} onClick={c.judged && desktop ? () => setSelected(c.no) : undefined}>
      <div className="ms-card__l1"><UniversityLogo university={c.university} /><strong className="ms-card__title">{c.no}번 · {c.university} {c.department}</strong></div>
      <div className="ms-card__l2"><span className="ms-card__criteria">{criteria}</span><Badge>{m && passesReview(m) ? '모집요강 반영' : '교사 입력 · 미검수'}</Badge></div>
      <div className="ms-card__l3">{c.judged && c.sum !== null ? <span className="ms-card__sum"><span className="num">등급 합 {c.sum}</span><span className="ms-card__std num">/ 기준 {m!.criterion.sum}</span></span>
        : <span className="ms-card__sum text-muted num">등급 합 —</span>}
        {c.judged ? <Judge verdict={c.judged.verdict} /> : <Badge>준비 중</Badge>}</div>
      <p className="ms-card__l4">{c.line}</p>
    </li>;
  };
  const trace = (open: boolean) => {
    const title = active && !noCut ? `어떻게 계산했나요? · ${active.university}` : '어떻게 계산했나요?';
    const list = active && table ? steps(active, table, grades) : null, v = active?.judged?.verdict;
    return <details className="trace-accordion ms-trace" open={open || undefined}><summary><span>{title}</span><Icon name="chevron-down" size={20} /></summary>
      {list ? <ol>{list.map(([label, value], i) => <li key={label}><span className="ms-trace__label">{i + 1}. {label}</span><span className="ms-trace__value num">{value}</span></li>)}
        <li className="ms-trace__final"><span>{v} {MARK[v!] ?? ''}</span><span>{active!.line}</span></li></ol>
        : <p className="t-body-sm text-muted ms-trace__empty">검수된 등급컷이 등록되기 전에는 원점수만 표시해요</p>}
      {desktop && <Note className="ms-trace__note">수능 최저 기준은 대학 모집요강이 최종 기준이에요 · 데이터 기준일 {dataAsOf}{isSampleMode() && ' · 샘플의 대학·숫자는 예시예요'}</Note>}
    </details>;
  };
  const panelBody = !board ? <p className="text-muted ms-panel__msg">수시로에 카드를 담으면 최저가 있는 카드를 여기서 함께 볼 수 있어요. <Link className="t-link" to="/susiro">수시로 가기 ›</Link></p>
    : !cards.length ? <><p className="text-muted ms-panel__msg">{board.name ?? '1번 보드'}에 최저가 있거나 확인이 필요한 카드가 없어요.</p><Link className="button-outline" to="/susiro">수시로 카드 확인</Link></>
    : noCut ? <p className="t-caption text-muted">등급컷이 등록되면 볼 수 있어요</p>
    : <>
      {!desktop && <><p className="ms-panel__summary num">{verdictCounts.join(' · ') || '판정한 카드 없음'}</p>
        {pendingCount > 0 && <div className="ms-foot"><span className="t-caption text-muted">검수 전이라 판정하지 않은 전형 {pendingCount}개</span><Badge>준비 중</Badge></div>}</>}
      <ul className="ms-cards">{cards.map(cardItem)}</ul></>;
  const panelCaption = !board || !cards.length || noCut ? null : desktop
    ? `수시로 카드 중 최저 있는 ${cards.length}장 · ${[...verdictCounts, ...(pendingCount ? [`검수 전 ${pendingCount}`] : [])].join(' · ')}`
    : `수시로 카드 ${slots.length}장 중 최저 있는 ${cards.length}장${excluded.length ? ` · 최저 없는 ${excluded.join('·')}번은 뺐어요` : ''}`;
  const panel = <aside className="ms-panel" aria-label="수능 최저 충족 현황">
    <div className="ms-panel__head"><h3 className="ms-panel__title">수능 최저 충족 현황</h3>{panelCaption && <p className="t-caption text-muted">{panelCaption}</p>}</div>
    {panelBody}
    {(board && cards.length > 0) && trace(desktop && !noCut)}
    {!desktop && <Note>수능 최저 기준은 대학 모집요강이 최종 기준이에요 · 데이터 기준일 {dataAsOf}{isSampleMode() && ' · 샘플의 대학·숫자는 예시예요'}</Note>}
  </aside>;

  const examDesc = (e: string) => { const t = cutTableFor(e), n = SCREEN_AREAS.filter(a => mocks.find(m => m.exam === e)?.raw[a.key] !== undefined).length;
    return `${t ? `등급컷 ${t.as_of}` : '등급컷 준비 중'} · ${n ? `원점수 ${n}개` : '원점수 없음'}`; };
  const examList = <ul className="ms-exams" role="listbox" aria-label="시험 고르기">{exams.map(e => <li key={e}><button type="button" role="option" aria-selected={e === exam} onClick={() => changeExam(e)}>
    <span><strong>{e}</strong><small className="t-body-sm text-muted">{examDesc(e)}</small></span>{e === exam && <Icon name="check" size={20} />}</button></li>)}</ul>;
  const send = <ButtonPrimary disabled={!entered} onClick={() => setSending(true)}>선생님께 보내기</ButtonPrimary>;

  return <section className="student-screen mock-score" data-slug="mock-score" aria-label="모의고사">{lead}
    {desktop && <ScreenActions><span className="ms-asof">{table ? `등급컷 ${table.version}` : '등급컷 준비 중'}</span></ScreenActions>}
    <div className="ms-layout">
      <div className="ms-main">
        <div className="ms-exam">
          <div className="ms-exam__name"><h3 className="ms-exam__title">{exam}</h3>{table ? <p className="t-caption text-muted">등급컷 {table.version} · 기준일 <span className="ms-nowrap">{table.as_of}</span></p> : <Badge>등급컷 준비 중</Badge>}</div>
          <div className="ms-exam__pick"><button type="button" className="button-pill-soft" aria-haspopup="listbox" aria-expanded={picking} onClick={() => setPicking(!picking)}><Icon name="chevron-down" size={20} />시험 바꾸기</button>
            {picking && desktop && <>{<div className="ms-exams__backdrop" onClick={() => setPicking(false)} />}<div className="ms-exams__pop">{examList}</div></>}</div>
          {desktop && <div className="ms-exam__send">{!entered && <span className="t-caption text-muted">원점수를 하나 이상 넣으면 보낼 수 있어요</span>}{send}</div>}
        </div>
        {saveError}
        {!empty && <div className="stat-tile ms-tile"><span className="ms-tile__label">수능 최저 충족 현황</span><strong className={`ms-tile__value num${tile.muted ? ' text-muted' : ''}`}>{tile.value}</strong><span className="ms-tile__sub">{tile.sub}</span></div>}
        {scores}
      </div>
      {!empty && panel}
    </div>
    {!desktop && <div className="ms-cta">{!entered && <span className="t-caption text-muted">원점수를 하나 이상 넣으면 보낼 수 있어요</span>}{send}</div>}

    {picking && !desktop && <Modal label="시험 고르기" onClose={() => setPicking(false)}><div className="ms-sheet"><span className="ms-sheet__handle" aria-hidden="true" /><h3 className="t-heading-4">시험 고르기</h3>{examList}</div></Modal>}
    {confirm && <Modal label={`${confirm} 원점수를 지울까요?`} onClose={() => { setDrafts(d => { const { [confirm]: _, ...rest } = d; return rest; }); setConfirm(null); }}>
      <div className="ms-confirm"><h3 className="t-heading-4">{confirm} 원점수를 지울까요?</h3><p>이 기기에 저장한 {saved?.raw[confirm]}점과 {confirm} 예상 등급, {josa(confirm, '이', '가')} 들어간 수능 최저 충족 현황이 함께 지워져요.</p>
        <div className="ms-confirm__actions"><button type="button" className="button-outline" onClick={() => { setDrafts(d => { const { [confirm]: _, ...rest } = d; return rest; }); setConfirm(null); }}>취소</button>
          <button type="button" className="button-primary" onClick={() => { const a = confirm; setConfirm(null); void save(a, ''); }}>지우기</button></div></div>
    </Modal>}
    {sending && saved && <SendToTeacher title="모의고사" kind="mock_score" payload={{ exam, raw: saved.raw, cut_table: table?.version ?? null }} filename={`모의고사_${exam}`} onClose={() => setSending(false)} onDone={setToast}>
      <dl className="ms-send-summary"><div><dt>시험</dt><dd>{exam}</dd></div><div><dt>담는 것</dt><dd>{table ? `원점수 ${entered}개와 등급컷 버전 ${table.version}` : '원점수만 보내요(등급컷 준비 중)'}</dd></div><div><dt>보내는 사람</dt><dd>학급 코드 · 번호 · 별칭(실명은 담지 않아요)</dd></div></dl>
      <p className="t-caption text-muted">서버에 저장되지 않고 이 기기에서 파일·QR로만 전달돼요</p></SendToTeacher>}
    {toast && <div className="toast" role="status"><strong><Icon name="check" size={16} /> {toast}</strong></div>}
  </section>;
}
