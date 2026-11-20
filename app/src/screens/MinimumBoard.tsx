import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { studentLabel, type Student } from '../domain/classroom';
import { CORE, VERDICT_CLASS, VERDICT_ORDER, checkCriterion, describe, examsByRecent, judgeMinimum, verdictText, type Core, type Criterion, type Target, type Verdict } from '../domain/minimum';
import { downloadFile } from '../io/backup';
import { xlsxOf } from '../io/grades';
import { teacherDb, type ClassState } from '../store/teacherDb';

export const VerdictBadge = ({ v }: { v: Verdict }) => <span className={`judge-badge ${VERDICT_CLASS[v]}`}>{verdictText(v)}</span>;
const TEACHER_NOTE = "'교사 입력 · 미검수' 기준은 관리자 검수 전이라 판정을 참고로만 봐 주세요";

export function MinimumBoard() {
  return <ClassGate slug="minimum-board" title="수능 최저 판정">{c => <Board {...c} />}</ClassGate>;
}

/** 학생 한 명의 1순위 목표 판정(학생 기록 상세에서도 써요). */
export function judgeStudent(number: string, exam: string, c: Pick<ClassState, 'mocks' | 'targets'>) {
  const target = c.targets.find(t => t.number === number);
  return { target, judged: judgeMinimum(exam, c.mocks.find(m => m.number === number && m.exam === exam), target?.criterion ?? null) };
}

function Board(c: ClassState & { info: NonNullable<ClassState['info']> }) {
  const { info, students, mocks, cards } = c;
  const exams = examsByRecent(mocks.map(m => m.exam)).slice(0, 4);
  const [exam, setExam] = useState(exams[0] ?? ''), [query, setQuery] = useState(''), [onlyUnmet, setOnlyUnmet] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null), [list, setList] = useState<string[] | null>(null);
  const current = exams.includes(exam) ? exam : exams[0];
  if (!current) return <div className="empty-state"><h3 className="t-heading-3">아직 불러온 모의고사 성적이 없어요</h3><p>성적 불러오기에서 모의고사 등급을 올리면 1순위 목표 기준으로 충족 현황을 볼 수 있어요.</p>
    <Link className="button-outline" to="/teacher/score-import">성적 불러오기 ›</Link></div>;

  const rows = students.map(s => ({ s, ...judgeStudent(s.number, current, c) }))
    .sort((a, b) => VERDICT_ORDER.indexOf(a.judged.verdict) - VERDICT_ORDER.indexOf(b.judged.verdict) || a.s.number.localeCompare(b.s.number));
  const count = (...v: Verdict[]) => rows.filter(r => v.includes(r.judged.verdict)).length;
  const picked = list ?? rows.filter(r => r.judged.verdict === '근접' || r.judged.verdict === '미충족').map(r => r.s.number);
  const shown = rows.filter(r => (!onlyUnmet || ['근접', '미충족'].includes(r.judged.verdict)) && (!query.trim() || `${studentLabel(r.s)} ${r.target?.university ?? ''}`.includes(query.trim())));
  const exportXlsx = async () => downloadFile(await xlsxOf('수능 최저', ['학생', '목표 대학', '기준', '기준 출처', '국어', '수학', '영어', '탐구', '판정', '이유', '상담 명단'],
    rows.map(r => [studentLabel(r.s), r.target?.university ?? '', r.target?.criterion ? describe(r.target.criterion) : '', r.target?.criterion ? '교사 입력 · 미검수' : '', ...CORE.map(a => r.judged.values[a] ?? null), r.judged.verdict, r.judged.reason, picked.includes(r.s.number) ? '예' : ''])),
    `수능최저_${info.name}_${current}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  return <div className="board-layout"><div className="board-main">
    <div className="section-row"><div><h3 className="t-heading-2">{info.name}</h3><p className="t-body">1순위 목표 기준으로 판정했어요</p></div>
      <SegmentedControl label="시험" value={current} onChange={setExam} options={exams.map(e => ({ value: e, label: e }))} /></div>
    <h3 className="t-heading-4">충족 현황</h3>
    <div className="stats">
      <div><span className="t-caption">판정 대상</span><strong className="num key-number">{rows.filter(r => r.target?.criterion).length}명</strong><span className="t-caption text-muted">기준을 넣은 학생</span></div>
      <div><span className="t-caption">충족</span><strong className="num">{count('충족')}명</strong></div>
      <div><span className="t-caption">미충족</span><strong className="num">{count('미충족', '근접')}명</strong><span className="t-caption text-muted">근접 {count('근접')}명 포함</span></div>
      <div><span className="t-caption">자료 부족</span><strong className="num">{count('자료 부족', '판정 불가')}명</strong><span className="t-caption text-muted">판정 불가 {count('판정 불가')}명 포함</span></div>
    </div>
    <div className="section-row"><input type="search" aria-label="학생·대학 검색" placeholder="학생·대학 검색" value={query} onChange={e => setQuery(e.target.value)} />
      <button className="filter-chip" aria-pressed={onlyUnmet} onClick={() => setOnlyUnmet(!onlyUnmet)}>미충족만 보기</button>
      <ButtonOutline onClick={exportXlsx}>xlsx 내보내기</ButtonOutline></div>
    <div className="section-row"><h4 className="t-heading-4">학생별 판정</h4><span className="t-caption text-muted">판정 순 정렬 · 근접 먼저</span></div>
    <div className="table-scroll"><table className="data-table"><thead><tr><th>학생</th><th>목표 대학</th><th>기준</th>{CORE.map(a => <th key={a} className="num">{a[0]}</th>)}<th>판정</th><th>이유</th></tr></thead>
      <tbody>{shown.map(({ s, target, judged }) => <tr key={s.number}><td className="num">{studentLabel(s)}</td><td>{target?.university || <span className="text-muted">–</span>}</td>
        <td>{target?.criterion ? <>{describe(target.criterion)}<br /><span className="data-status-badge">교사 입력 · 미검수</span></> : <span className="text-muted">–</span>}
          <br /><button className="text-button" onClick={() => setEditing(s)}>{target?.criterion ? '기준 고치기' : '기준 넣기'}</button></td>
        {CORE.map(a => <td key={a} className="num">{judged.values[a] ?? <span className="text-muted">–</span>}</td>)}
        <td><VerdictBadge v={judged.verdict} /></td><td className="t-body-sm">{judged.reason}</td></tr>)}</tbody></table></div>
    <p className="disclaimer-note">ⓘ 대학 공식 모집요강이 최종 기준이에요 · 충족 현황은 {current} 성적 기준이에요 · 아직 검수된 대학 최저 기준이 없어서 교사가 넣은 기준으로만 판정해요 · {TEACHER_NOTE}</p>
  </div>
  <aside className="counsel-summary" aria-label="상담 명단"><h3 className="t-heading-4">상담 명단</h3><p className="t-caption text-muted">규칙으로 골랐어요 · 근접 먼저 · 눌러서 빼거나 더해요</p>
    {(['근접', '미충족', '자료 부족'] as Verdict[]).map((v, i) => { const group = rows.filter(r => r.judged.verdict === v); return group.length ? <div key={v}>
      <p className="t-caption">{i + 1}순위 <VerdictBadge v={v} /> {group.length}명</p>
      <ul className="pick-list">{group.map(r => { const on = picked.includes(r.s.number); return <li key={r.s.number}><button className={`student-row${on ? ' is-selected' : ''}`} aria-pressed={on}
        onClick={() => setList(on ? picked.filter(n => n !== r.s.number) : [...picked, r.s.number])}><span><strong className="num">{studentLabel(r.s)}</strong><br /><span className="t-body-sm text-muted">{r.judged.reason}</span></span>{on && <span aria-hidden="true">✓</span>}</button></li>; })}</ul></div> : null; })}
    <p className="t-caption text-muted">명단 {picked.length}명 · xlsx 내보내기에 함께 담겨요</p></aside>
  {editing && <CriterionEditor student={editing} target={c.targets.find(t => t.number === editing.number)} suggested={cards.filter(x => x.number === editing.number).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.card.slots[0]?.university ?? ''} onClose={() => setEditing(null)} />}
  </div>;
}

const EMPTY: Criterion = { areas: ['국어', '수학', '영어', '탐구'], count: 3, sum: 7, required: null, history_max: null, tamgu: 'avg' };
function CriterionEditor({ student, target, suggested, onClose }: { student: Student; target?: Target; suggested: string; onClose: () => void }) {
  const [university, setUniversity] = useState(target?.university ?? suggested), [c, setC] = useState<Criterion>(target?.criterion ?? EMPTY), [error, setError] = useState('');
  const save = async () => {
    try {
      if (!university.trim()) throw new Error('목표 대학·학과를 적어 주세요.');
      await teacherDb.targets.put({ number: student.number, university: university.trim().slice(0, 60), criterion: checkCriterion(c), source: 'teacher', updated_at: new Date().toISOString() }); onClose();
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
