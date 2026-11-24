import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { ClassGate } from '../components/ClassGate';
import { Modal } from '../components/Modal';
import { QrScanner } from '../components/QrScanner';
import { SegmentedControl } from '../components/SegmentedControl';
import { receiveCards, studentLabel, submissionRows, type ClassInfo, type Received, type Student, type CardRecord } from '../domain/classroom';
import { downloadFile } from '../io/backup';
import { xlsxOf } from '../io/grades';
import { teacherDb } from '../store/teacherDb';
import { WarningBadge, counselPath } from './TeacherDashboard';

type Filter = 'all' | 'submitted' | 'missing' | 'warning';
const JUDGE: Record<string, string> = { 안정: 'judge-safe', 적정: 'judge-fit', 소신: 'judge-reach', 위험: 'judge-risk', 경계: 'judge-edge' };
const ICON: Record<string, string> = { 안정: '●', 적정: '◐', 소신: '▲', 위험: '■' };
// 경계는 아이콘 없이 점선 테두리 + 이름(design.md judge-badge 경계)
export const JudgeMark = ({ value }: { value?: string | null }) => value && JUDGE[value] ? <span className={`judge-badge ${JUDGE[value]}`}>{ICON[value] ? `${ICON[value]} ` : ''}{value}</span> : null;

export function CardCollect() {
  const [filter, setFilter] = useState<Filter>('all'), [receiving, setReceiving] = useState(false), [message, setMessage] = useState('');
  return <ClassGate slug="card-collect" title="카드 수합">{({ info, students, cards }) => {
    const rows = submissionRows(students, cards), submitted = rows.filter(r => r.latest), warned = rows.filter(r => r.warnings);
    const shown = filter === 'submitted' ? submitted : filter === 'missing' ? rows.filter(r => !r.latest) : filter === 'warning' ? warned : rows;
    const exportXlsx = async () => downloadFile(await xlsxOf('카드 수합', ['학생', '장수', '상태', '1순위', '2순위', '3순위', '4순위', '5순위', '6순위', '경고'],
      rows.map(r => [studentLabel(r.student), r.latest ? `${r.latest.card.slots.length}/6` : '', r.status, ...Array.from({ length: 6 }, (_, i) => r.latest?.card.slots[i]?.university ?? ''), r.warnings])),
      `카드수합_${info.name}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return <>
      <p className="t-caption text-muted">{info.name} · {students.length}명 · 학급 코드 {info.code}</p>
      {message && <p role="status" className="notice">{message}</p>}
      <div className="stats">
        <div><span className="t-caption">학생 수</span><strong className="num">{students.length}명</strong></div>
        <div><span className="t-caption">제출</span><strong className="num">{submitted.length}명</strong><span className="t-caption text-muted">새 버전 {rows.filter(r => r.status === '새 버전').length}명 · 확정 {rows.filter(r => r.status === '확정').length}명 포함</span></div>
        <button className="stat-button" onClick={() => setFilter('missing')}><span className="t-caption">미제출</span><strong className="num key-number">{students.length - submitted.length}명</strong><span className="t-caption text-muted">학생에게 수시로에서 보내 달라고 해 주세요</span></button>
        <button className="stat-button" onClick={() => setFilter('warning')}><span className="judge-badge judge-reach">▲ 경고 있는 학생</span><strong className="num">{warned.length}명</strong><span className="t-caption text-muted">면접 일정 겹침 · 소신·위험 쏠림</span></button>
      </div>
      {!cards.length ? <div className="empty-state"><h3 className="t-heading-3">아직 받은 상담카드가 없어요</h3><p>학생이 수시로에서 보낸 파일(.jnavi)을 받아 보세요. 학생에게 학급 코드 {info.code}를 알려 주세요.</p>
        <ButtonPrimary onClick={() => setReceiving(true)}>카드 받기</ButtonPrimary></div> : <>
        <div className="section-row"><h3 className="t-heading-2">제출 현황</h3>
          <SegmentedControl label="거르기" value={filter} onChange={setFilter} options={[{ value: 'all', label: `전체 ${rows.length}` }, { value: 'submitted', label: `제출 ${submitted.length}` }, { value: 'missing', label: `미제출 ${rows.length - submitted.length}` }, { value: 'warning', label: `경고 있음 ${warned.length}` }]} />
          <div className="toolbar"><ButtonOutline onClick={exportXlsx}>엑셀 내보내기</ButtonOutline><ButtonPrimary onClick={() => setReceiving(true)}>카드 받기</ButtonPrimary></div></div>
        <div className="table-scroll"><table className="data-table collect-table"><thead><tr><th>학생</th><th>상태</th>{[1, 2, 3, 4, 5, 6].map(i => <th key={i}>{i}순위</th>)}<th>경고</th></tr></thead>
          <tbody>{shown.map(r => <tr key={r.student.number}>
            <td><Link to={counselPath(r.student.number)} className="num">{studentLabel(r.student)}</Link> <span className="t-caption text-muted num">{r.latest ? `${r.latest.card.slots.length}/6` : ''}</span></td>
            <td><span className="data-status-badge">{r.status === '확정' && <Icon name="lock" size={14} />}{r.status}</span></td>
            {Array.from({ length: 6 }, (_, i) => { const s = r.latest?.card.slots[i]; return <td key={i}>{s ? <>{s.university} <JudgeMark value={s.judgment} /></> : <span className="text-muted">–</span>}</td>; })}
            <td><WarningBadge count={r.warnings} /></td></tr>)}</tbody></table>
          {!shown.length && <p className="text-muted table-empty">{filter === 'missing' ? '모든 학생이 냈어요' : '경고가 있는 학생이 없어요'}</p>}</div>
        <div className="section-row t-caption text-muted"><span>{rows.length}명 중 {shown.length}명 보는 중</span><span>학급 데이터는 이 기기에만 저장돼요</span></div>
      </>}
      <p className="disclaimer-note">ⓘ 판정·경고는 학생이 카드를 보낸 때 기준이에요 · 검수된 판정 규칙이 생기기 전에는 판정 없이 대학 이름만 보여요 · 대학 공식 자료가 최종 기준이에요</p>
      {receiving && <ReceiveCards info={info} students={students} cards={cards} onClose={() => setReceiving(false)} onDone={n => { setReceiving(false); setMessage(`상담카드 ${n}개를 불러왔어요`); }} />}
    </>;
  }}</ClassGate>;
}

function ReceiveCards({ info, students, cards, onClose, onDone }: { info: ClassInfo; students: Student[]; cards: CardRecord[]; onClose: () => void; onDone: (n: number) => void }) {
  const [results, setResults] = useState<Received[] | null>(null), [reading, setReading] = useState(''), [dragging, setDragging] = useState(false), [error, setError] = useState('');
  const [mode, setMode] = useState<'qr' | 'file'>('file');
  const take = async (texts: { name: string; text: string }[]) => {
    // 이번 창에서 이미 받은 카드도 "받은 카드"로 쳐서 같은 학생 QR을 두 번 찍어도 한 번만 들어가요.
    const pending = (results ?? []).flatMap(r => r.record ? [r.record] : []);
    const latest = (n: string) => [...cards, ...pending].filter(c => c.number === n).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const fresh = await receiveCards(texts, { code: info.code, students, latest });
    setResults(prev => [...(prev ?? []), ...fresh]);
  };
  const read = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = [...list];
    setReading(`${files.length}개 파일을 읽고 있어요`);
    await take(await Promise.all(files.map(async f => ({ name: f.name, text: f.size > 1_000_000 ? '' : await f.text() }))));
    setReading('');
  };
  const ok = results?.filter(r => r.record) ?? [], bad = results?.filter(r => r.status === 'error') ?? [];
  const apply = async () => {
    try { await teacherDb.cards.bulkAdd(ok.map(r => r.record!)); onDone(ok.length); } catch { setError('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); }
  };
  const who = (n: string | null) => { const s = students.find(x => x.number === n); return s ? studentLabel(s) : n ?? '–'; };
  return <Modal label="카드 받기" onClose={onClose} wide><h3 className="t-heading-3">카드 받기</h3><p className="t-caption text-muted">우리 반 학급 코드 {info.code}</p>
    <SegmentedControl label="받는 방법" value={mode} onChange={setMode} options={[{ value: 'qr', label: 'QR로 받기' }, { value: 'file', label: '파일로 받기' }]} />
    {mode === 'qr' ? <QrScanner onText={text => void take([{ name: 'QR 상담카드.jnavi', text }])} onFallback={() => setMode('file')} /> : <>
    <label className={`drop-zone${dragging ? ' is-dragging' : ''}${results ? ' drop-zone--compact' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); read(e.dataTransfer.files); }}>
      <span>{dragging ? '놓으면 읽기 시작해요' : results ? '파일 더 넣기 · 끌어 놓거나 고르기' : '학생 카드 파일을 여기로 끌어 놓아요'}</span>
      <span className="button-outline">파일 고르기</span>
      <input type="file" multiple accept=".jnavi" className="sr-only" aria-label="상담카드 파일 고르기" onChange={e => { read(e.target.files); e.target.value = ''; }} /></label>
    <p className="notice t-body-sm">상담카드 파일(.jnavi)만 받아요 · 학급 코드가 {info.code}인 파일만 표에 들어가요 · 여러 개를 한 번에 넣을 수 있어요</p></>}
    <p role="status" aria-live="polite" className="t-caption">{reading}</p>
    {results && <><h4 className="t-heading-4">{ok.length}개를 받았어요{bad.length ? ` · ${bad.length}개 확인 필요` : ''}</h4>
      {bad.length > 0 && <p className="t-caption text-muted">확인 필요 파일은 표에 넣지 않아요. 이유를 보고 학생에게 다시 받아 주세요.</p>}
      <div className="table-scroll receive-list"><table className="data-table"><thead><tr><th>학생</th><th>파일 이름</th><th>상태</th></tr></thead>
        <tbody>{results.map((r, i) => <tr key={i}><td className="num">{who(r.number)}</td><td>{r.file}</td>
          <td>{r.status === 'error' ? <span className="judge-badge judge-risk">■ 확인 필요</span> : r.status === 'skip' ? <span className="data-status-badge">건너뜀</span>
            : <><span className="judge-badge judge-safe">● 받음</span>{r.status === 'new' && <span className="data-status-badge">새 버전</span>}</>}
            {r.reason && <p className={`t-body-sm${r.status === 'error' ? ' reason-risk' : ' text-muted'}`}>{r.reason}</p>}</td></tr>)}</tbody></table></div></>}
    {error && <p role="alert" className="error-note">{error}</p>}
    <div className="toolbar"><span className="t-caption text-muted">파일과 카메라 화면은 이 기기 안에서만 읽어요</span><ButtonOutline onClick={onClose}>닫기</ButtonOutline>
      <ButtonPrimary disabled={!ok.length || !!reading} onClick={apply}>{ok.length ? `${ok.length}개 표에 반영하기` : '표에 반영하기'}</ButtonPrimary></div></Modal>;
}
