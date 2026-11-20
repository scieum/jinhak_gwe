import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ButtonPrimary } from '../components/Buttons';
import { studentDb, useStudent } from '../store/studentDb';
import { SendToTeacher } from '../components/SendToTeacher';
import { AREAS, gradeLabel, readGrade, validRaw, type Area } from '../domain/mock';
import { cutTables, mockExams } from '../data/mock-exams';

export function MockScore() {
  const [query] = useSearchParams();
  return <MockScoreForm key={query.get('exam') ?? ''} requestedExam={query.get('exam')} />;
}

function MockScoreForm({ requestedExam }: { requestedExam: string | null }) {
  const state = useStudent();
  const [chosenExam, setExam] = useState<string | null>(null), [drafts, setDrafts] = useState<Partial<Record<Area, string>>>({});
  const exams = [...new Set<string>([...mockExams, ...(state?.data?.mocks ?? []).map(m => m.exam)])];
  const exam = chosenExam ?? (requestedExam && exams.includes(requestedExam) ? requestedExam : mockExams[0]);
  const activeExam = useRef(exam); activeExam.current = exam;
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [sending, setSending] = useState(false);
  if (!state?.data) return <section className="student-screen" data-slug="mock-score">{state ? <p role="alert">{state.error}</p> : <p role="status">기기에 저장된 기록을 읽고 있어요.</p>}</section>;
  const saved = state.data.mocks?.find(m => m.exam === exam), table = cutTables.find(t => t.exam === exam);
  const value = (a: Area) => drafts[a] ?? (saved?.raw[a] !== undefined ? String(saved.raw[a]) : '');
  const commit = async (a: Area, text: string) => {
    setError(''); setMessage('');
    const next = text.trim() === '' ? undefined : Number(text);
    if (next !== undefined && !validRaw(a, next)) { setError(`${a} 원점수는 0~${AREAS.find(x => x.key === a)!.max} 사이 정수로 적어 주세요.`); return; }
    try {
      await studentDb.saveMockArea(exam, a, next);
      if (activeExam.current !== exam) return;
      setDrafts(d => { if (d[a] !== text) return d; const { [a]: _, ...rest } = d; return rest; });
      setMessage('이 기기에 저장했어요.');
    }
    catch (e) { if (activeExam.current === exam) setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
  };
  const entered = AREAS.filter(a => saved?.raw[a.key] !== undefined).length;
  const apps = state.data.planning?.applications ?? [], board = state.data.boards?.[0];
  const csatCards = (board?.slots ?? []).map((s, i) => ({ s, i, a: apps.find(x => x.id === s.application_id) })).filter(c => c.s.csat !== 'none' && c.a);
  return <section className="student-screen" data-slug="mock-score" aria-label="모의고사">
    <div className="screen-heading"><h2 className="t-heading-1">모의고사</h2><ButtonPrimary disabled={!entered} onClick={() => setSending(true)}>선생님께 보내기</ButtonPrimary></div>
    {sending && saved && <SendToTeacher title="모의고사" kind="mock_score" payload={{ exam, raw: saved.raw, cut_table: table?.version ?? null }} filename={`모의고사_${exam}`} onClose={() => setSending(false)} onDone={setMessage}>
      <p>{exam} 원점수 {entered}개를 파일(.jnavi)로 저장해요.</p></SendToTeacher>}
    <section className="filter-panel" aria-label="모의고사 선택"><div className="section-row"><label>시험<select value={exam} onChange={e => { setExam(e.target.value); setDrafts({}); setError(''); setMessage(''); }}>{exams.map(x => <option key={x}>{x}</option>)}</select></label><Link className="button-outline" to="/score-trend">성적 추이 보기</Link></div>
    <p className="t-caption text-muted">{table ? `등급컷 ${table.version} · 기준일 ${table.as_of}` : '이 시험의 검수된 예상 등급컷이 아직 없어요. 원점수는 저장되고, 등급컷이 등록되면 예상 등급을 보여 줘요.'}</p></section>
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}
    <section className="result-panel" aria-label="영역별 원점수"><div className="section-row"><h3 className="t-heading-3">영역별 원점수</h3><span className="t-caption text-muted num">6개 중 {entered}개 입력</span></div>
    <div className="table-scroll"><table className="data-table"><thead><tr><th>영역</th><th className="num">원점수</th><th>예상 등급(추정)</th></tr></thead>
      <tbody>{AREAS.map(({ key, max }) => <tr key={key}><td>{key}</td>
        <td className="num"><input aria-label={`${key} 원점수`} inputMode="numeric" size={4} value={value(key)} onChange={e => setDrafts(d => ({ ...d, [key]: e.target.value }))} onBlur={e => commit(key, e.target.value)} /> <span className="t-caption text-muted">/ {max}</span></td>
        <td>{gradeLabel(readGrade(saved?.raw[key], key, table))}</td></tr>)}</tbody></table></div>
    <p className="t-caption text-muted">표준점수·백분위는 준비 중이에요 <span className="data-status-badge">환산 규칙 준비 중</span></p>
    <p className="disclaimer-note">ⓘ 예상 등급은 가채점 원점수와 예상 등급컷으로 본 추정이에요 · 성적 통지표가 최종 기준이에요</p></section>
    <section className="result-panel" aria-label="수능 최저 충족 현황"><h3 className="t-heading-3">수능 최저 충족 현황</h3>
    {!board ? <p className="text-muted">수시로에 카드를 담으면 최저가 있는 카드를 여기서 함께 볼 수 있어요. <Link className="t-link" to="/susiro">수시로 가기 ›</Link></p>
      : !csatCards.length ? <p className="text-muted">{board.name}에 최저가 있거나 확인이 필요한 카드가 없어요.</p>
      : <ul className="program-list">{csatCards.map(({ a, i }) => <li key={a!.id} className="univ-card"><strong>{i + 1}번 · {a!.university}</strong>
        <span className="t-caption text-muted">{[a!.program, a!.department].filter(Boolean).join(' · ')}</span>
        <span className="judge-badge judge-none">자료 부족 · 최저 기준과 등급컷 등록 전</span></li>)}</ul>}</section>
  </section>;
}
