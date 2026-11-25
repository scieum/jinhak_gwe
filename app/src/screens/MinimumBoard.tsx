import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { BoardHead, BoardTable, Chips, Disclaimer, ViewOnly, someOf, useDesktop, who } from '../components/TeacherBoard';
import { UniversityLogo, universityLogoFile } from '../components/UniversityLogo';
import { dataAsOf } from '../data/catalog';
import { useSampleMode } from '../data/sample';
import { studentLabel, type Student } from '../domain/classroom';
import { CORE, VERDICT_CLASS, VERDICT_ORDER, checkCriterion, describe, examsByRecent, judgeMinimum, minimumSum, verdictText, type Core, type Criterion, type Target, type Verdict } from '../domain/minimum';
import { examMonth } from '../domain/studentRecord';
import { downloadFile } from '../io/backup';
import { xlsxOf } from '../io/grades';
import { teacherDb, type ClassState } from '../store/teacherDb';
import '../styles/minimum-board.css';

// v2 시안 minimum-board/390 · 1440(346:100406 · 346:100457). 판정 = 색 + 모양(▲ 근접 · ✕ 미충족 · ● 충족) + 이름.
export const VerdictBadge = ({ v }: { v: Verdict }) => <span className={`judge-badge ${VERDICT_CLASS[v]}`}>{verdictText(v)}</span>;

export function MinimumBoard() {
  return <ClassGate slug="minimum-board" title="수능 최저 판정">{c => <Board {...c} />}</ClassGate>;
}

/** 학생 한 명의 1순위 목표 판정(학생 기록 상세에서도 써요). */
export function judgeStudent(number: string, exam: string, c: Pick<ClassState, 'mocks' | 'targets'>) {
  const target = c.targets.find(t => t.number === number);
  return { target, judged: judgeMinimum(exam, c.mocks.find(m => m.number === number && m.exam === exam), target?.criterion ?? null) };
}

const MARK: Partial<Record<Verdict, string>> = { 근접: 'near', 미충족: 'unmet', 충족: 'met' };
/** 판정 표식: 모양 + 이름(soft = 옅은 바탕, 모바일 학생 줄). 이름이 없으면 모양만. */
function Mark({ v, label = true, soft }: { v: Verdict; label?: boolean; soft?: boolean }) {
  const k = MARK[v] ?? 'none';
  return <span className={`mb-mark mb-mark--${k}${soft ? ' mb-mark--soft' : ''}`}>{k !== 'none' && <i aria-hidden="true" />}{label ? v : <span className="sr-only">{v}</span>}</span>;
}
/** "2개 합 3 이내" 앞에 필수 영역 · 고른 영역, 뒤에 한국사. */
function criterionLines(c: Criterion): string[] {
  const head = c.required ? `${c.required} 포함` : c.areas.length < CORE.length ? `${c.areas.map(a => a[0]).join('·')} 중` : '';
  return [head, `${c.count}개 합 ${c.sum} 이내`, c.history_max ? `한국사 ${c.history_max} 이내` : ''].filter(Boolean);
}
/** 대학 글자를 "경희대" + 학과로 나눠요(학과가 따로 없으면 첫 칸 뒤 글자). */
function univOf(t?: Target) {
  if (!t?.university) return null;
  const [name, ...rest] = t.university.trim().split(/\s+/);
  return { full: name, short: name.replace(/대학교$/, '대'), unit: t.unit ?? rest.join(' ') };
}
const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

type Filter = 'all' | 'unmet' | 'near' | 'none';
const NONE: Verdict[] = ['자료 부족', '판정 불가'];
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function Board(c: ClassState & { info: NonNullable<ClassState['info']> }) {
  const { info, students, mocks, cards, counselLists } = c;
  const desktop = useDesktop(), sample = useSampleMode();
  const [filter, setFilter] = useState<Filter>('all'), [desc, setDesc] = useState(false), [showAll, setShowAll] = useState(false), [openUnmet, setOpenUnmet] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null), [list, setList] = useState<string[] | null>(null), [message, setMessage] = useState('');
  const exam = examsByRecent(mocks.map(m => m.exam))[0];
  if (!exam) return <div className="empty-state"><h3 className="t-heading-3">아직 불러온 모의고사 성적이 없어요</h3><p>성적 불러오기에서 모의고사 등급을 올리면 1순위 목표 기준으로 충족 현황을 볼 수 있어요.</p>
    <Link className="button-outline" to="/teacher/score-import">성적 불러오기 ›</Link></div>;

  const month = examMonth(exam);
  const rows = students.map(s => {
    const j = judgeStudent(s.number, exam, c), mock = mocks.find(m => m.number === s.number && m.exam === exam);
    const sum = mock && j.target?.criterion ? minimumSum(mock, j.target.criterion) : null;
    return { s, ...j, sum, gap: sum !== null && j.target?.criterion ? sum - j.target.criterion.sum : 0, unreviewed: !!j.target?.criterion && !(sample && j.target.sample) };
  }).sort((a, b) => VERDICT_ORDER.indexOf(a.judged.verdict) - VERDICT_ORDER.indexOf(b.judged.verdict) || a.s.number.localeCompare(b.s.number));
  const of = (...v: Verdict[]) => rows.filter(r => v.includes(r.judged.verdict));
  const near = of('근접'), unmet = of('미충족').sort((a, b) => b.gap - a.gap || a.s.number.localeCompare(b.s.number)), none = of(...NONE);
  const saved = counselLists.find(l => l.key === 'minimum');
  const picked = list ?? saved?.numbers ?? near.map(r => r.s.number);
  const toggle = (n: string) => setList(picked.includes(n) ? picked.filter(x => x !== n) : [...picked, n]);
  const reason = (r: typeof rows[number]) => r.judged.verdict === '근접' && r.sum !== null ? `합 ${fmt(r.sum)} · 한 과목만 1등급 오르면 충족` : r.judged.reason;
  const shown = (desc ? [...rows].reverse() : rows).filter(r => filter === 'all' || (filter === 'unmet' ? r.judged.verdict === '미충족' : filter === 'near' ? r.judged.verdict === '근접' : NONE.includes(r.judged.verdict)));
  const chips: [Filter, string][] = [['all', `전체 ${rows.length}`], ['unmet', `미충족 ${unmet.length}`], ['near', `근접 ${near.length}`], ['none', `자료 부족 ${none.length}`]];
  const anyTeacher = rows.some(r => r.unreviewed);
  const values = (r: typeof rows[number]) => CORE.map(a => r.judged.values[a] !== undefined ? fmt(r.judged.values[a]!) : '–').join(' · ');
  const exportXlsx = async () => downloadFile(await xlsxOf('수능 최저', ['학생', '목표 대학', '학과', '기준', '기준 출처', '국어', '수학', '영어', '탐구', '판정', '이유', '상담 명단'],
    rows.map(r => [who(r.s), univOf(r.target)?.short ?? '', univOf(r.target)?.unit ?? '', r.target?.criterion ? describe(r.target.criterion) : '', r.target?.criterion ? (r.unreviewed ? '교사 입력 · 미검수' : '샘플 모집요강(예시)') : '',
      ...CORE.map(a => r.judged.values[a] ?? null), r.judged.verdict, reason(r), picked.includes(r.s.number) ? '예' : ''])),
    `수능최저_${info.name}_${exam}.xlsx`, XLSX);
  const saveList = async () => { await teacherDb.counselLists.put({ key: 'minimum', numbers: picked, saved_at: new Date().toISOString() }); setList(null); setMessage(`상담 명단 ${picked.length}명을 저장했어요`); };
  const showTable = (f: Filter) => { setFilter(f); setShowAll(true); document.getElementById('mb-students')?.scrollIntoView({ block: 'start' }); };
  const unreviewedBadge = <span className="tb-badge">{desktop ? '교사 입력 · 미검수' : '미검수'}</span>;
  const note = ["대학 공식 모집요강이 최종 기준이에요", desktop ? "'교사 입력 · 미검수' 기준은 관리자 검수 전이라 참고로만 봐 주세요" : "'미검수'는 교사 입력 기준이라 참고로만 봐 주세요",
    sample && '샘플의 대학·숫자는 예시예요', desktop && `데이터 기준일 ${dataAsOf}`].filter(Boolean).join(' · ');
  const editor = editing && <CriterionEditor student={editing} target={c.targets.find(t => t.number === editing.number)} onClose={() => setEditing(null)}
    suggested={cards.filter(x => x.number === editing.number).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.card.slots[0]?.university ?? ''} />;

  if (!desktop) return <div className="tb mb">
    <BoardHead desktop={false} lead="" />
    <ViewOnly>{`${month} 모의고사 · 1순위 목표 기준 · 보기 전용이에요.`}</ViewOnly>
    <Today desktop={false} rows={[
      { v: '미충족', count: '', title: `미충족 ${unmet.length}명`, sub: someOf(unmet.map(r => r.s), 2), action: <button type="button" className="tb-action" onClick={() => showTable('unmet')}>표 보기 ›</button> },
      { v: '근접', count: '', title: `근접 ${near.length}명`, sub: someOf(near.map(r => r.s)), action: <button type="button" className="tb-action" onClick={() => showTable('near')}>명단 보기 ›</button> }]} />
    <section className="tb-section" id="mb-students" aria-label="학생별 판정">
      <div className="tb-section__head"><h3 className="tb-section__title">학생별 판정</h3><span className="tb-caption">근접 먼저</span></div>
      <Chips value={filter} options={chips} onChange={setFilter} />
      <div className="tb-list">{(showAll ? shown : shown.slice(0, 4)).map(r => { const u = univOf(r.target);
        const line2 = [u && `${u.short}${u.unit ? ` ${u.unit}` : ''}`, r.target?.criterion && criterionLines(r.target.criterion).join(' '), r.sum !== null && r.judged.verdict !== '자료 부족' ? `지금 ${fmt(r.sum)}` : r.judged.reason].filter(Boolean).join(' · ');
        return <Link key={r.s.number} className="tb-rowcard tb-rowcard--two" to={`/teacher/student-record?n=${r.s.number}`}>
          <span className="tb-rowcard__line"><span className="tb-rowcard__num">{Number(r.s.number)}번</span><span className="tb-rowcard__alias">{r.s.alias}</span>
            <span className="tb-rowcard__badges">{r.unreviewed && unreviewedBadge}<Mark v={r.judged.verdict} soft /></span></span>
          <span className="tb-rowcard__sub">{line2}</span></Link>; })}</div>
      {!showAll && shown.length > 4 && <button type="button" className="tb-more" onClick={() => setShowAll(true)}>{shown.length}명 전체 보기 ›</button>}
    </section>
    <Disclaimer>{note}</Disclaimer>
    {editor}
  </div>;

  const lead = `${month} 모의고사, 1순위 목표 기준이에요. 미충족 ${unmet.length}명과 근접 ${near.length}명을 먼저 챙겨요.`;
  const inList = near.length > 0 && near.every(r => picked.includes(r.s.number));
  const groups: { title: string; v: Verdict; items: typeof rows; open: boolean }[] = [
    { title: '우선 1', v: '근접', items: near, open: true }, { title: '우선 2', v: '자료 부족', items: none, open: true }, { title: '우선 3 · 여러 과목', v: '미충족', items: unmet, open: openUnmet }];
  return <div className="tb mb">
    <BoardHead desktop lead={lead} />
    <div className="mb-body">
      <div className="mb-main">
        <Today desktop rule={`${month} 모의고사 · 1순위 목표${anyTeacher ? ' · 교사 입력 기준 포함' : ''}`} rows={[
          { v: '미충족', count: `${unmet.length}명`, title: '수능 최저(1순위)를 아직 못 채웠어요', sub: [...unmet.map(r => who(r.s)), unmet.length ? '두 과목 넘게 올라야 해요' : ''].filter(Boolean).join(' · ') || '없어요',
            action: <button type="button" className="tb-action" onClick={() => showTable('unmet')}>표에서 보기 ›</button> },
          { v: '근접', count: `${near.length}명`, title: '한 과목만 1등급 오르면 채워요', sub: [...near.map(r => who(r.s)), inList ? '상담 명단에 넣어 두었어요' : ''].filter(Boolean).join(' · ') || '없어요',
            action: <button type="button" className="tb-action" onClick={() => document.getElementById('mb-list')?.focus()}>명단 보기 ›</button> }]} />
        <section className="tb-panel" id="mb-students" aria-label="학생별 판정">
          <div className="tb-toolbar">
            <div className="tb-toolbar__title"><h3>학생별 판정</h3><span className="tb-caption">근접 먼저 · 같으면 번호 순</span></div>
            <Chips value={filter} options={chips} onChange={setFilter} />
            <div className="tb-toolbar__actions"><ButtonOutline onClick={exportXlsx}>xlsx 내보내기</ButtonOutline></div>
          </div>
          <div className="mb-table">
            <BoardTable label="학생별 판정" columns={[{ label: '', className: 'mb-c1' }, { label: '학생', className: 'mb-c2' }, { label: '목표 대학 (1순위)', className: 'mb-c3' },
              { label: '기준 (국·수·영·탐)', className: 'mb-c4' }, { label: '국·수·영·탐', className: 'mb-c5' }, { label: '판정', className: 'mb-c6', sort: () => setDesc(d => !d) }, { label: '이유', className: 'mb-c7' }]}
              rows={shown.map(r => { const u = univOf(r.target), crit = r.target?.criterion;
                return { key: r.s.number, cells: [
                  MARK[r.judged.verdict] && r.judged.verdict !== '충족' ? <Mark v={r.judged.verdict} label={false} /> : null,
                  <span className="tb-strong">{who(r.s)}</span>,
                  u ? <span className="mb-univ">{universityLogoFile(u.full) ? <UniversityLogo university={u.full} /> : <span className="mb-mono" aria-hidden="true" data-ch={u.short.slice(0, 1)} />}
                    <span className="mb-stack"><span>{u.short}</span>{u.unit && <span className="mb-caption">{u.unit}</span>}</span></span> : <span className="tb-muted">–</span>,
                  <span className="mb-stack">{crit ? <button type="button" className="mb-crit" aria-label={`${who(r.s)} 기준 고치기`} onClick={() => setEditing(r.s)}>{criterionLines(crit).map(l => <span key={l}>{l}</span>)}</button>
                    : <button type="button" className="tb-action mb-add" onClick={() => setEditing(r.s)}>기준 넣기</button>}{r.unreviewed && unreviewedBadge}</span>,
                  <span className="num">{values(r)}</span>,
                  <Mark v={r.judged.verdict} />,
                  <span className="mb-reason">{reason(r)}</span>,
                ] }; })} />
          </div>
        </section>
      </div>
      <aside className="mb-list" id="mb-list" tabIndex={-1} aria-label="상담 명단">
        <div className="mb-list__head"><div><h3>상담 명단</h3><span className="tb-caption">규칙으로 골랐어요 · 근접 먼저</span></div>
          <button type="button" className="tb-action" onClick={() => setList(rows.filter(r => r.judged.verdict !== '충족').map(r => r.s.number))}>전체 선택</button></div>
        {groups.filter(g => g.items.length).map(g => <div key={g.title} className="mb-group">
          <p className="mb-group__head"><strong>{g.title}</strong><Mark v={g.v} /><span className="tb-caption">{g.items.length}명</span></p>
          {g.open ? g.items.map(r => { const on = picked.includes(r.s.number);
            return <button key={r.s.number} type="button" className={`tb-rowcard tb-rowcard--two mb-pick${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggle(r.s.number)}>
              <span className="tb-rowcard__line"><span className="tb-rowcard__num">{Number(r.s.number)}번</span><span className="tb-rowcard__alias">{r.s.alias}</span></span>
              <span className="tb-rowcard__sub">{r.judged.verdict === '근접' && r.sum !== null ? `합 ${fmt(r.sum)} · 한 과목만 오르면 충족` : r.judged.reason}</span>
              {on && <Icon name="check" size={20} />}</button>; })
            : <button type="button" className="button-pill-soft mb-open" onClick={() => setOpenUnmet(true)}>{g.items.length}명 보기 ›</button>}
        </div>)}
        <span className="mb-list__spacer" />
        {message ? <p role="status" className="tb-caption">{message}</p> : saved && <p className="tb-caption">지난 저장 {saved.saved_at.slice(0, 10)} · {saved.numbers.length}명</p>}
        <ButtonPrimary onClick={saveList}>명단 저장 ({picked.length}명)</ButtonPrimary>
      </aside>
    </div>
    <Disclaimer>{note}</Disclaimer>
    {editor}
  </div>;
}

interface TodayLine { v: Verdict; count: string; title: string; sub: string; action: ReactNode }
/** 먼저 볼 학생: PC = 판정 · 숫자 · 제목/설명 · 링크, 모바일 = 판정/제목/설명 · 링크(teacher-board 오늘 할 일과 같은 틀). */
function Today({ desktop, rule, rows }: { desktop: boolean; rule?: string; rows: TodayLine[] }) {
  return <section className="tb-today" aria-label="먼저 볼 학생">
    <div className="tb-today__head"><h3 className="tb-today__title">먼저 볼 학생</h3>{rule && <span className="tb-caption">{rule}</span>}</div>
    {rows.map(r => <div className="tb-today__row" key={r.v}>
      {desktop && <><Mark v={r.v} /><strong className="tb-today__count">{r.count}</strong></>}
      <div className="tb-today__text">{!desktop && <Mark v={r.v} />}<p className="tb-today__name">{r.title}</p><p className="tb-today__sub">{r.sub}</p></div>
      {r.action}</div>)}
  </section>;
}

const EMPTY: Criterion = { areas: ['국어', '수학', '영어', '탐구'], count: 3, sum: 7, required: null, history_max: null, tamgu: 'avg' };
function CriterionEditor({ student, target, suggested, onClose }: { student: Student; target?: Target; suggested: string; onClose: () => void }) {
  const [university, setUniversity] = useState(target?.university ?? suggested), [c, setC] = useState<Criterion>(target?.criterion ?? EMPTY), [error, setError] = useState('');
  const save = async () => {
    try {
      if (!university.trim()) throw new Error('목표 대학·학과를 적어 주세요.');
      // 교사가 고친 기준은 늘 교사 입력 · 미검수(sample 표식을 지워요)
      await teacherDb.targets.put({ number: student.number, university: university.trim().slice(0, 60), ...(target?.unit && university === target.university ? { unit: target.unit } : {}),
        criterion: checkCriterion(c), source: 'teacher', updated_at: new Date().toISOString() }); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
  };
  const toggle = (a: Core) => setC({ ...c, areas: c.areas.includes(a) ? c.areas.filter(x => x !== a) : [...c.areas, a] });
  return <Modal label="수능 최저 기준" onClose={onClose}><h3 className="t-heading-3">{studentLabel(student)} · 1순위 목표 기준</h3>
    <p className="t-caption text-muted">대학 모집요강을 보고 직접 넣는 기준이에요. 화면에 "교사 입력 · 미검수"로 표시돼요.</p>
    <label>목표 대학·학과<input value={university} maxLength={60} onChange={e => setUniversity(e.target.value)} placeholder="예: 강원대 간호" /></label>
    <fieldset className="form-grid"><legend>반영 영역</legend>{CORE.map(a => <label key={a} className="checkbox-label"><input type="checkbox" checked={c.areas.includes(a)} onChange={() => toggle(a)} /> {a}</label>)}</fieldset>
    <div className="form-grid">
      <label>반영 개수<input type="number" min={1} max={4} value={c.count} onChange={e => setC({ ...c, count: Number(e.target.value) })} /></label>
      <label>등급 합 이내<input type="number" min={1} max={36} value={c.sum} onChange={e => setC({ ...c, sum: Number(e.target.value) })} /></label>
      <label>꼭 넣을 영역<select value={c.required ?? ''} onChange={e => setC({ ...c, required: (e.target.value || null) as Core | null })}><option value="">없음</option>{c.areas.map(a => <option key={a}>{a}</option>)}</select></label>
      <label>한국사 등급 이내<input type="number" min={1} max={9} value={c.history_max ?? ''} onChange={e => setC({ ...c, history_max: e.target.value ? Number(e.target.value) : null })} placeholder="없음" /></label>
      <label>탐구 반영<select value={c.tamgu} onChange={e => setC({ ...c, tamgu: e.target.value as Criterion['tamgu'] })}><option value="avg">2과목 평균</option><option value="best">좋은 1과목</option></select></label>
    </div>
    {error && <p role="alert" className="error-note">{error}</p>}
    <div className="toolbar">{target && <ButtonOutline onClick={async () => { await teacherDb.targets.delete(student.number); onClose(); }}>기준 지우기</ButtonOutline>}
      <ButtonOutline onClick={onClose}>닫기</ButtonOutline><ButtonPrimary onClick={save}>저장</ButtonPrimary></div></Modal>;
}
