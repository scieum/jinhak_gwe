import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { SegmentedControl } from '../components/SegmentedControl';
import { QrScanner } from '../components/QrScanner';
import { studentLabel } from '../domain/classroom';
import { AREAS } from '../domain/mock';
import { examsByRecent } from '../domain/minimum';
import { RESULTS, byUniversity, outcomesFromCards, parseOutcomeRows, receiveMock, totals, type Outcome, type Result } from '../domain/outcomes';
import { downloadFile } from '../io/backup';
import { readSheetRows, xlsxOf } from '../io/grades';
import { teacherDb, type ClassState } from '../store/teacherDb';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
type Ready = ClassState & { info: NonNullable<ClassState['info']> };

export function ResultSummary() {
  const mock = useLocation().pathname.endsWith('/mock'), navigate = useNavigate();
  return <ClassGate slug="result-summary" title={mock ? '모의고사 수합' : '결과 집계'}>{c => <>
    <div className="section-row"><SegmentedControl label="결과 집계 탭" value={mock ? 'mock' : 'results'} onChange={v => navigate(v === 'mock' ? '/teacher/result-summary/mock' : '/teacher/result-summary')}
      options={[{ value: 'results', label: '수시 결과' }, { value: 'mock', label: '모의고사 수합' }]} /><span className="t-heading-4">{c.info.name}</span></div>
    {mock ? <MockTab {...c} /> : <ResultsTab {...c} />}</>}</ClassGate>;
}

function ResultsTab({ info, students, outcomes, cards }: Ready) {
  const [view, setView] = useState<'univ' | 'student'>('univ'), [query, setQuery] = useState(''), [onlyMissing, setOnlyMissing] = useState(false);
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const t = totals(outcomes), mine = (n: string) => outcomes.filter(o => o.number === n);
  const replace = async (items: Outcome[], note: string) => {
    await teacherDb.transaction('rw', teacherDb.outcomes, async () => { await teacherDb.outcomes.clear(); await teacherDb.outcomes.bulkAdd(items); });
    setMessage(note); setError('');
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const { items, skipped } = parseOutcomeRows(await readSheetRows(file), students);
      if (!items.length) throw new Error('우리 반 학생 행을 찾지 못했어요. 번호 열을 확인해 주세요.');
      await replace(items, `${file.name} · ${items.length}건을 불러왔어요${skipped.length ? ` · ${skipped.length}행 건너뜀(${skipped.slice(0, 2).map(s => `${s.line}행 ${s.reason}`).join(', ')}${skipped.length > 2 ? ' 등' : ''})` : ''}`);
    } catch (e) { setError(e instanceof Error ? e.message : '파일을 읽지 못했어요.'); }
  };
  const fromCards = () => { const items = outcomesFromCards(cards); if (!items.length) { setError('받은 상담카드가 없어요. 카드 수합에서 먼저 받아 주세요.'); return; } replace(items, `상담카드 ${new Set(items.map(i => i.number)).size}명 · ${items.length}건으로 지원 목록을 만들었어요. 결과는 학생별 보기에서 넣어요.`); };
  const groups = byUniversity(outcomes.filter(o => !query.trim() || `${o.university} ${o.program}`.includes(query.trim())));
  const shownStudents = students.filter(s => mine(s.number).length && (!onlyMissing || mine(s.number).some(o => o.result === '미입력')) && (!query.trim() || studentLabel(s).includes(query.trim()) || mine(s.number).some(o => o.university.includes(query.trim()))))
    .sort((a, b) => Number(mine(b.number).some(o => o.result === '미입력')) - Number(mine(a.number).some(o => o.result === '미입력')) || a.number.localeCompare(b.number));
  const exportXlsx = async () => downloadFile(view === 'univ'
    ? await xlsxOf('대학별', ['전형 유형', '대학', '전형', '지원', '1단계 통과', ...RESULTS], groups.flatMap(g => g.rows.map(r => [r.type, r.university, r.program, r.applied, r.stage1, ...RESULTS.map(x => r.counts[x])])))
    : await xlsxOf('학생별', ['학생', '최종 합격', ...[1, 2, 3, 4, 5, 6].map(i => `지원 ${i}`)], shownStudents.map(s => [studentLabel(s), mine(s.number).filter(o => o.result === '합격' || o.result === '충원 합격').length, ...mine(s.number).slice(0, 6).map(o => `${o.university} ${o.program} · ${o.result}`)])),
    `결과집계_${info.name}_${view === 'univ' ? '대학별' : '학생별'}.xlsx`, XLSX);
  const fileButton = <label className="button-outline file-button">나이스 엑셀 불러오기<input type="file" accept=".xlsx,.csv" className="sr-only" aria-label="결과 파일 고르기" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} /></label>;

  return <>
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
    {!outcomes.length ? <div className="empty-state"><h3 className="t-heading-3">아직 불러온 수시 결과가 없어요</h3>
      <p>나이스 '대입전형자료 제공현황' 엑셀을 불러오거나, 받은 상담카드로 지원 목록을 만든 뒤 결과를 넣어요. 실명 열은 읽지 않고 번호로만 맞춰요.</p>
      <div className="toolbar">{fileButton}<ButtonPrimary onClick={fromCards}>받은 상담카드로 목록 만들기</ButtonPrimary></div></div> : <>
      <div className="stats">
        <div><span className="t-caption">지원</span><strong className="num">{t.applied}건</strong><span className="t-caption text-muted">{new Set(outcomes.map(o => o.number)).size}명</span></div>
        <div><span className="t-caption">최종 합격</span><strong className="num key-number">{t.final}건</strong><span className="t-caption text-muted">합격 {t.counts['합격']} · 충원 합격 {t.counts['충원 합격']}</span></div>
        <div><span className="t-caption">합격한 학생</span><strong className="num">{t.passedStudents}명</strong></div>
        <div><span className="t-caption">결과 미입력</span><strong className="num">{t.counts['미입력']}건</strong></div>
      </div>
      <div className="section-row"><SegmentedControl label="보기" value={view} onChange={setView} options={[{ value: 'univ', label: '대학별' }, { value: 'student', label: '학생별' }]} />
        <div className="toolbar">{fileButton}<ButtonOutline onClick={fromCards}>상담카드로 다시 만들기</ButtonOutline><ButtonOutline onClick={exportXlsx}>xlsx 내보내기</ButtonOutline></div></div>
      <div className="section-row"><input type="search" aria-label="학생·대학 검색" placeholder="학생·대학 검색" value={query} onChange={e => setQuery(e.target.value)} />
        {view === 'student' && <button className="filter-chip" aria-pressed={onlyMissing} onClick={() => setOnlyMissing(!onlyMissing)}>미입력 있음 {students.filter(s => mine(s.number).some(o => o.result === '미입력')).length}</button>}</div>
      {view === 'univ' ? <div className="table-scroll"><table className="data-table"><thead><tr><th>전형 유형</th><th>대학 · 전형</th><th className="num">지원</th><th className="num">1단계 통과</th>{RESULTS.map(r => <th key={r} className="num">{r}</th>)}</tr></thead>
        <tbody>{groups.map(g => { const sub = totals(outcomes.filter(o => o.type === g.type && g.rows.some(r => r.university === o.university && r.program === o.program)));
          return [...g.rows.map((r, i) => <tr key={r.key}><td>{i === 0 ? g.type : ''}</td><td>{r.university}{r.program && ` · ${r.program}`}</td><td className="num">{r.applied}</td><td className="num">{r.stage1 ?? <span className="text-muted">–</span>}</td>
            {RESULTS.map(x => <td key={x} className="num">{x === '미입력' && r.counts[x] ? <button className="text-button" onClick={() => { setView('student'); setOnlyMissing(true); setQuery(r.university); }}>{r.counts[x]}</button> : r.counts[x]}</td>)}</tr>),
            <tr key={`${g.type}-sum`} className="row-subtotal"><td /><td>{g.type} 소계</td><td className="num">{sub.applied}</td><td className="num">{sub.stage1 || '–'}</td>{RESULTS.map(x => <td key={x} className="num">{sub.counts[x]}</td>)}</tr>]; })}
          <tr className="row-total"><td /><td>전체 합계</td><td className="num">{t.applied}</td><td className="num">{t.stage1 || '–'}</td>{RESULTS.map(x => <td key={x} className="num">{t.counts[x]}</td>)}</tr></tbody></table></div>
      : <div className="table-scroll"><table className="data-table"><thead><tr><th>학생</th><th className="num">최종 합격</th>{[1, 2, 3, 4, 5, 6].map(i => <th key={i}>지원 {i}</th>)}</tr></thead>
        <tbody>{shownStudents.map(s => { const list = mine(s.number); return <tr key={s.number}><td className="num">{studentLabel(s)}</td><td className="num">{list.filter(o => o.result === '합격' || o.result === '충원 합격').length}</td>
          {Array.from({ length: 6 }, (_, i) => { const o = list[i]; return <td key={i}>{o ? <><span className="t-body-sm">{o.university} {o.program}</span><br />
            <select aria-label={`${studentLabel(s)} ${o.university} 결과`} value={o.result} className={o.result === '미입력' ? 'text-muted' : ''} onChange={e => teacherDb.outcomes.update(o.id!, { result: e.target.value as Result })}>{RESULTS.map(r => <option key={r}>{r}</option>)}</select></> : <span className="text-muted">–</span>}</td>; })}</tr>; })}</tbody></table></div>}
    </>}
    <p className="disclaimer-note">ⓘ 불러온 자료와 직접 넣은 결과 그대로예요 · 학생은 번호·별칭으로만 저장해요 · 학급 데이터는 이 기기에만 저장돼요</p>
  </>;
}

function MockTab({ info, students, rawMocks }: Ready) {
  const exams = examsByRecent(rawMocks.map(m => m.exam));
  const [exam, setExam] = useState(''), [results, setResults] = useState<{ file: string; ok: boolean; reason: string }[]>([]);
  const current = exams.includes(exam) ? exam : exams[0];
  const [scanning, setScanning] = useState(false);
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
  const rows = students.map(s => ({ s, m: rawMocks.find(r => r.number === s.number && r.exam === current) }));
  return <>
    <div className="toolbar"><ButtonOutline onClick={() => setScanning(!scanning)}>{scanning ? '카메라 닫기' : 'QR로 받기'}</ButtonOutline></div>
    {scanning && <QrScanner onText={text => void take([{ name: 'QR 모의고사.jnavi', text }])} onFallback={() => setScanning(false)} />}
    <label className="drop-zone drop-zone--compact" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); read(e.dataTransfer.files); }}>
      <span>학생이 보낸 모의고사 파일(.jnavi)을 끌어 놓거나 골라요 · 학급 코드 {info.code}</span><span className="button-outline">파일 고르기</span>
      <input type="file" multiple accept=".jnavi" className="sr-only" aria-label="모의고사 파일 고르기" onChange={e => { read(e.target.files); e.target.value = ''; }} /></label>
    {results.length > 0 && <ul className="receive-list" aria-label="받은 결과">{results.map((r, i) => <li key={i} className="t-body-sm">{r.ok ? <span className="judge-badge judge-safe">● 받음</span> : <span className="judge-badge judge-risk">■ 확인 필요</span>} {r.file}{r.reason && <span className={r.ok ? '' : ' reason-risk'}> {r.reason}</span>}</li>)}</ul>}
    {!current ? <div className="empty-state"><h3 className="t-heading-3">아직 받은 모의고사 파일이 없어요</h3><p>학생이 모의고사 화면에서 '선생님께 보내기'로 저장한 파일을 받아 보세요.</p></div> : <>
      <div className="section-row"><SegmentedControl label="시험" value={current} onChange={setExam} options={exams.slice(0, 4).map(e => ({ value: e, label: e }))} />
        <span className="t-caption text-muted">제출 <strong className="num key-number">{rows.filter(r => r.m).length}명</strong> / {students.length}명</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>학생</th><th>제출일</th>{AREAS.map(a => <th key={a.key} className="num">{a.key}</th>)}<th>예상 등급 · 최저</th></tr></thead>
        <tbody>{rows.sort((a, b) => Number(!a.m) - Number(!b.m) || a.s.number.localeCompare(b.s.number)).map(({ s, m }) => <tr key={s.number}><td className="num">{studentLabel(s)}</td>
          <td className="num">{m ? m.created_at.slice(5, 10) : <span className="text-muted">미제출</span>}</td>{AREAS.map(a => <td key={a.key} className="num">{m?.raw[a.key] ?? <span className="text-muted">–</span>}</td>)}
          <td>{m ? <span className="judge-badge judge-none">등급컷 준비 중</span> : <span className="text-muted">–</span>}</td></tr>)}</tbody></table></div>
      <p className="t-caption text-muted">원점수 그대로예요. 검수된 등급컷이 등록되면 예상 등급과 최저 충족 현황을 함께 보여 줘요.</p></>}
    <p className="disclaimer-note">ⓘ 가채점 원점수는 학생이 적은 값이에요 · 성적 통지표가 최종 기준이에요</p>
  </>;
}
