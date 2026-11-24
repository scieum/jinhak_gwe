import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Modal } from '../components/Modal';
import { QrScanner } from '../components/QrScanner';
import { SegmentedControl } from '../components/SegmentedControl';
import { receiveCards, studentLabel, submissionRows, type ClassInfo, type Received, type Student, type CardRecord, type SubmissionRow } from '../domain/classroom';
import { ActionLink, BoardHead, BoardTable, Chips, Disclaimer, Mark, NotifyButton, RowCard, TodayCard, ViewOnly, someOf, useDesktop, who, type Tone, type TodayRow } from '../components/TeacherBoard';
import { ScreenActions } from '../components/ScreenActions';
import { dataAsOf } from '../data/catalog';
import { useSampleMode } from '../data/sample';
import { downloadFile } from '../io/backup';
import { xlsxOf } from '../io/grades';
import { teacherDb } from '../store/teacherDb';
import { counselPath } from './TeacherDashboard';

type Filter = 'all' | 'warning' | 'new' | 'missing';
const JUDGE: Record<string, string> = { 안정: 'judge-safe', 적정: 'judge-fit', 소신: 'judge-reach', 위험: 'judge-risk', 경계: 'judge-edge' };
const ICON: Record<string, string> = { 안정: '●', 적정: '◐', 소신: '▲', 위험: '■' };
// 경계는 아이콘 없이 점선 테두리 + 이름(design.md judge-badge 경계)
export const JudgeMark = ({ value }: { value?: string | null }) => value && JUDGE[value] ? <span className={`judge-badge ${JUDGE[value]}`}>{ICON[value] ? `${ICON[value]} ` : ''}{value}</span> : null;
const TONE: Record<string, Tone> = { 안정: 'safe', 적정: 'fit', 소신: 'reach', 위험: 'risk', 경계: 'edge' };
/** "면접 일정이 겹쳐요" → "면접 일정 겹침", "소신·위험 쪽으로 쏠렸어요" → "소신·위험 쏠림"(수시로 경고 요약과 같은 줄임) */
const shortTitle = (t: string) => t.replace('이 겹쳐요', ' 겹침').replace(' 쪽으로 쏠렸어요', ' 쏠림');
const short = (u: string) => u.replace(/학교$/, '');
const xlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function CardCollect() {
  const [receiving, setReceiving] = useState(false), [message, setMessage] = useState('');
  return <ClassGate slug="card-collect" title="카드 수합">{c => <>
    {message && <p role="status" className="notice">{message}</p>}
    <Collect {...c} onReceive={() => setReceiving(true)} />
    {receiving && <ReceiveCards info={c.info} students={c.students} cards={c.cards} onClose={() => setReceiving(false)} onDone={n => { setReceiving(false); setMessage(`상담카드 ${n}개를 불러왔어요`); }} />}
  </>}</ClassGate>;
}

function Collect({ info, students, cards, onReceive }: { info: ClassInfo; students: Student[]; cards: CardRecord[]; onReceive: () => void }) {
  const desktop = useDesktop(), sample = useSampleMode();
  const [filter, setFilter] = useState<Filter>('all'), [byWarn, setByWarn] = useState(true), [showAll, setShowAll] = useState(false);
  const risk = (r: SubmissionRow) => r.latest?.card.slots.filter(s => s.judgment === '위험').length ?? 0;
  // 경고 많은 순 → 위험 칸 많은 순 → 번호, 미제출은 맨 아래(시안 "경고 있는 학생 먼저 · 미제출은 맨 아래")
  const rows = submissionRows(students, cards).sort((a, b) => Number(!a.latest) - Number(!b.latest) || (byWarn ? b.warnings - a.warnings || risk(b) - risk(a) : 0) || a.student.number.localeCompare(b.student.number));
  const submitted = rows.filter(r => r.latest), warned = rows.filter(r => r.warnings), fresh = rows.filter(r => r.status === '새 버전');
  const missing = rows.filter(r => !r.latest).map(r => r.student);
  const shown = filter === 'warning' ? warned : filter === 'new' ? fresh : filter === 'missing' ? rows.filter(r => !r.latest) : rows;
  const titles = [...new Set(warned.flatMap(r => r.latest!.card.warnings.map(w => shortTitle(w.title))))];
  const warnSub = (r: SubmissionRow) => r.latest!.card.warnings.map(w => shortTitle(w.title));
  // "15번 바다 · 5번 햇살 경고 2 · 22번 은하 · 18번 여울 경고 1"
  const groups = [...new Set(warned.map(r => r.warnings))].map(k => `${warned.filter(r => r.warnings === k).map(r => who(r.student)).join(' · ')} 경고 ${k}`).join(' · ');
  const now = new Date().toLocaleDateString('sv-SE');
  const firstWarn = warned[0]?.student.number, firstNew = fresh[0]?.student.number;
  const top = warned.filter(r => r.warnings === warned[0]?.warnings);
  const showMissing = () => { setFilter('missing'); setShowAll(true); };
  const todo: TodayRow[] = desktop ? [
    { icon: 'triangle-alert', count: `${warned.length}명`, title: '조합 경고가 있는 카드예요', sub: warned.length ? `${groups} · ${titles.join(', ')}` : '경고가 있는 카드가 없어요', action: <ActionLink to={firstWarn ? counselPath(firstWarn) : '/teacher/counsel'}>상담 화면 열기 ›</ActionLink> },
    { icon: 'upload', count: `${missing.length}명`, title: '상담카드를 아직 안 냈어요', sub: `${students.length}명 중 ${submitted.length}명 제출${missing.length ? ` · ${someOf(missing)}` : ''}`, action: <NotifyButton code={info.code} missing={missing} /> },
    { icon: 'file-text', count: `${fresh.length}명`, title: '새 버전 카드가 들어왔어요', sub: fresh.length ? `${fresh.map(r => who(r.student)).join(' · ')} · 지난 버전과 바뀐 칸만 다시 보면 돼요` : '새로 들어온 버전이 없어요', action: <ActionLink to={firstNew ? counselPath(firstNew) : '/teacher/counsel'}>바뀐 칸 보기 ›</ActionLink> },
  ] : [
    // "15번 바다 · 5번 햇살 경고 2 외 2명": 가장 많은 경고 수의 학생들 + 나머지 수
    { icon: '', count: '', title: `조합 경고 ${warned.length}명`, sub: warned.length ? `${top.map(r => who(r.student)).join(' · ')} 경고 ${top[0].warnings}${warned.length > top.length ? ` 외 ${warned.length - top.length}명` : ''}` : '경고가 있는 카드가 없어요', action: <ActionLink to={firstWarn ? counselPath(firstWarn) : '/teacher/counsel'}>상담 보기 ›</ActionLink> },
    { icon: '', count: '', title: `상담카드 미제출 ${missing.length}명`, sub: `${students.length}명 중 ${submitted.length}명이 냈어요`, action: <button type="button" className="tb-action" onClick={showMissing}>명단 보기 ›</button> },
    { icon: '', count: '', title: `새 버전 카드 ${fresh.length}명`, sub: fresh.length ? fresh.map(r => who(r.student)).join(' · ') : '새로 들어온 버전이 없어요', action: <ActionLink to={firstNew ? counselPath(firstNew) : '/teacher/counsel'}>바뀐 칸 보기 ›</ActionLink> },
  ];
  const note = [sample && '샘플의 대학·숫자는 예시예요', '판정은 학생이 카드를 보낸 때 기준이에요', desktop && '대학 공식 자료가 최종 기준이에요', `데이터 기준일 ${dataAsOf}`].filter(Boolean).join(' · ');
  const all: [Filter, string] = ['all', `전체 ${rows.length}`], warnChip: [Filter, string] = ['warning', `경고 ${warned.length}`];
  const newChip: [Filter, string] = ['new', `새 버전 ${fresh.length}`], missChip: [Filter, string] = ['missing', `미제출 ${missing.length}`];
  const exportXlsx = async () => downloadFile(await xlsxOf('카드 수합', ['학생', '장수', '상태', '1순위', '2순위', '3순위', '4순위', '5순위', '6순위', '경고'],
    rows.map(r => [studentLabel(r.student), r.latest ? `${r.latest.card.slots.length}/6` : '', r.status, ...Array.from({ length: 6 }, (_, i) => r.latest?.card.slots[i]?.university ?? ''), r.warnings])),
    `카드수합_${info.name}.xlsx`, xlsxType);

  if (!desktop) return <div className="tb tb--collect">
    <BoardHead desktop={false} lead="" />
    <div className="tb-head"><ViewOnly>{`${submitted.length}명 제출 · 보기 전용이에요. 카드는 PC에서 받아요.`}</ViewOnly></div>
    <TodayCard desktop={false} rule="" rows={todo} />
    <section className="tb-section" aria-label="제출 현황">
      <div className="tb-section__head"><h3 className="tb-section__title">제출 현황</h3><span className="tb-caption">경고 순</span></div>
      <Chips value={filter} options={[all, warnChip, missChip, newChip]} onChange={setFilter} />
      <div className="tb-list">{(showAll ? shown : shown.slice(0, 4)).map(r => <RowCard key={r.student.number} number={r.student.number} alias={r.student.alias} to={counselPath(r.student.number)}
        line2={r.latest ? [`${r.latest.card.slots.length}장`, ...warnSub(r)].join(' · ') : '아직 안 냈어요'}
        badges={<><span className="tb-badge">{r.status}</span>{r.warnings > 0 && <Mark tone="reach" label={`경고 ${r.warnings}`} soft />}</>} />)}</div>
      {!showAll && shown.length > 4 && <button type="button" className="tb-more" onClick={() => setShowAll(true)}>{shown.length}명 전체 보기 ›</button>}
    </section>
    <Disclaimer>{note}</Disclaimer>
  </div>;

  return <div className="tb tb--collect">
    <BoardHead desktop lead={`${info.name} ${students.length}명 중 ${submitted.length}명이 카드를 냈어요.${warned.length ? ` 경고가 있는 ${warned.length}명부터 살펴봐요.` : ''}`} />
    <ScreenActions><ButtonPrimary className="tb-receive" onClick={onReceive}>카드 받기</ButtonPrimary></ScreenActions>
    <TodayCard desktop rule={`규칙으로 골랐어요 · ${now} 기준`} rows={todo} />
    <section className="tb-panel" aria-label="제출 현황">
      <div className="tb-toolbar">
        <div className="tb-toolbar__title"><h3>제출 현황</h3><span className="tb-caption">경고 있는 학생 먼저 · 미제출은 맨 아래</span></div>
        <Chips value={filter} options={[all, warnChip, newChip, missChip]} onChange={setFilter} />
        <div className="tb-toolbar__actions"><ButtonOutline onClick={exportXlsx}>엑셀 내보내기</ButtonOutline></div>
      </div>
      <BoardTable label="제출 현황" columns={[{ label: '', className: 'is-mark is-narrow', headWidth: 72 }, { label: '학생', className: 'is-flex' }, { label: '카드', width: 120 },
        ...[1, 2, 3, 4, 5, 6].map(i => ({ label: `${i}순위`, width: 128 })), { label: '경고', width: 96, sort: () => setByWarn(v => !v) }]}
        rows={shown.map(r => ({ key: r.student.number, cells: [
          r.warnings ? <Mark tone="reach" /> : null,
          <Link to={counselPath(r.student.number)}>{who(r.student)}</Link>,
          !r.latest ? <span className="tb-strong">미제출</span> : <span className={r.status === '새 버전' ? 'tb-strong' : 'tb-muted'}>{r.status} · {r.latest.card.slots.length}장</span>,
          ...Array.from({ length: 6 }, (_, i) => { const s = r.latest?.card.slots[i]; return s ? <><span className="tb-slot">{short(s.university)}</span>{s.judgment && TONE[s.judgment] && <Mark tone={TONE[s.judgment]} label={s.judgment} />}</> : <span className="tb-muted">–</span>; }),
          r.warnings ? <Mark tone="reach" label={`경고 ${r.warnings}`} /> : <span className="tb-muted">–</span>,
        ] }))} />
      {!shown.length && <p className="text-muted table-empty">{filter === 'missing' ? '모든 학생이 냈어요' : filter === 'new' ? '새로 들어온 버전이 없어요' : '경고가 있는 학생이 없어요'}</p>}
    </section>
    <Disclaimer>{note}</Disclaimer>
  </div>;
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
