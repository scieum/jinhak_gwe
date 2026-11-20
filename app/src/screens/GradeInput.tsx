import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import '../styles/grade-input.css';
import { openReply, type TeacherReply } from '../domain/reply';
import type { Exchange } from '../io/exchange';
import { SegmentedControl } from '../components/SegmentedControl';
import { attendanceKinds, attendanceReasons, emptyAttendance, gradeSummary, hasRank, hasScores, newGrade, semesters,
  subjectTypes, validateAttendance, validateGrade, type AttendanceRecord, type GradeRecord, type Semester, type StudentBackup } from '../domain/student';
import { studentDb, useStudent } from '../store/studentDb';
import { subjectCatalog } from '../data/subject-catalog';
import { decryptBackup, downloadFile, encryptBackup } from '../io/backup';
import { gradesCsv, parseCsv, rowsToGrades, readGradePdf, readSpreadsheet, templateXlsx, type ImportPreview } from '../io/grades';

export function GradeInput() {
  const state = useStudent();
  const [semester, setSemester] = useState<Semester>('1-1');
  const [view, setView] = useState('학기별'), [filter, setFilter] = useState('전체');
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null), [restore, setRestore] = useState<StudentBackup | null>(null);
  const [password, setPassword] = useState(''), [backupOpen, setBackupOpen] = useState(false);
  const [deleting, setDeleting] = useState<GradeRecord | null>(null);
  const inputRef = useRef<HTMLInputElement>(null), backupRef = useRef<HTMLInputElement>(null), replyRef = useRef<HTMLInputElement>(null);
  const [reply, setReply] = useState<Exchange<TeacherReply> | null>(null);
  const [edit, setEdit] = useState<GradeRecord | null>(null);
  const [pasteText, setPasteText] = useState<string | null>(null);
  const [menu, setMenu] = useState<'import' | 'export' | 'files' | 'view' | null>(null);
  const narrow = useNarrow(), [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setSlot(document.getElementById('appbar-actions')), []);
  const run = async (fn: () => Promise<void>, success = '') => {
    setError(''); setBusy(true);
    try { await fn(); if (success) setMessage(success); }
    catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  if (!state) return <section data-slug="grade-input"><p role="status">기기에 저장된 성적을 읽고 있어요.</p></section>;
  if (!state.data) return <section data-slug="grade-input"><p role="alert">{state.error}</p></section>;
  const grades = state.data.grades;
  const selected = grades.filter(g => view === '전체' || (view === '학년별' ? g.semester[0] === semester[0] : g.semester === semester));
  const visible = selected.filter(g => filter === '전체' || (validateGrade(g).length > 0) === (filter === '확인 필요'));
  const summary = gradeSummary(selected);
  const year = Number(semester[0]) as 1 | 2 | 3;
  const attendance = state.data.attendance.find(a => a.year === year);
  const saveGrade = (g: GradeRecord) => run(async () => { await studentDb.grades.put(g); setEdit(null); }, '성적을 이 기기에 저장했어요.');
  const cell = (g: GradeRecord, field: 'credits' | 'raw_score' | 'subject_mean' | 'enrolled_count' | 'rank_grade', label: string) => <input
    key={`${g.id}-${field}-${g[field]}`} aria-label={`${g.name} ${label}`} type="number" defaultValue={g[field] ?? ''} step={field === 'raw_score' || field === 'subject_mean' ? 'any' : '1'}
    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
    onBlur={e => { const value = e.target.value === '' ? field === 'rank_grade' ? null : field === 'credits' ? 0 : undefined : Number(e.target.value);
      if (value !== g[field]) void run(async () => { await studentDb.grades.update(g.id, { [field]: value }); }, '변경한 성적을 저장했어요.'); }} />;
  const importFile = (file: File) => run(async () => {
    setPreview(null);
    setPreview(/\.pdf$/i.test(file.name) ? await readGradePdf(file, semester) : await readSpreadsheet(file));
  });
  // v3(work/grade-input/02-spec.md): 머리 줄(묶음 이름 + 동작 3개) → 고르는 줄(단위 + 보기) → 표 머리(거르기 칩) → 표.
  const units = view === '학년별' ? (['1', '2', '3'] as const).map(y => ({ value: `${y}-1`, label: `${y}학년` })) : semesters.slice(0, 5).map(s => ({ value: s, label: narrow ? s : `${s[0]}학년 ${s[2]}학기` }));
  const unitValue = view === '학년별' ? `${semester[0]}-1` : semester;
  const title = view === '전체' ? '전체 학기' : view === '학년별' ? `${semester[0]}학년` : `${semester[0]}학년 ${semester[2]}학기`;
  const needCheck = selected.filter(g => validateGrade(g).length).length, done = selected.length - needCheck;
  const chip = (value: '입력 완료' | '확인 필요', count: number) => <button type="button" className="filter-chip" aria-pressed={filter === value} disabled={!count}
    onClick={() => setFilter(filter === value ? '전체' : value)}>{value === '확인 필요' && <span className="judge-risk-mark" aria-hidden="true">■ </span>}{value} <span className="num">{count}</span></button>;
  const pickFile = (accept: string) => { setMenu(null); if (inputRef.current) { inputRef.current.accept = accept; inputRef.current.click(); } };
  const importRows = <div className="menu-rows">
    <MenuRow title="생기부 PDF 올리기" caption="나이스·정부24에서 내려받은 PDF를 읽어요" onClick={() => pickFile('.pdf')} />
    <MenuRow title="엑셀·CSV 올리기" caption="양식에 채운 파일을 올려 주세요" onClick={() => pickFile('.csv,.xlsx')} />
    <MenuRow title="선생님이 보낸 파일 열기" caption=".jnavi 답장 파일을 열어요" onClick={() => { setMenu(null); replyRef.current?.click(); }} />
    <MenuRow title="표 붙여넣기" caption="엑셀에서 복사한 칸을 그대로 붙여넣어요" onClick={() => { setMenu(null); setPasteText(''); }} />
    <MenuRow title="엑셀 양식 내려받기" caption="성적표와 같은 열 순서의 양식이에요" onClick={() => void run(async () => downloadFile(await templateXlsx(), '성적-입력-양식.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), '엑셀 양식을 내려받았어요.')} /></div>;
  const exportRows = <><p className="t-label text-muted">백업</p><div className="menu-rows">
    <MenuRow title="백업 파일 만들기" caption="암호를 걸어 .jnavi 파일로 저장해요" onClick={() => { setMenu(null); setBackupOpen(true); }} />
    <MenuRow title="백업에서 되살리기" caption="백업 파일과 암호로 성적을 다시 불러와요" onClick={() => { setMenu(null); setBackupOpen(true); }} /></div>
    <p className="t-label text-muted">내보내기</p><div className="menu-rows">
    <MenuRow title="CSV로 내보내기" caption="다른 프로그램에서 열 수 있어요" onClick={() => { downloadFile(gradesCsv(grades), '내-성적.csv', 'text/csv;charset=utf-8'); setMenu(null); setMessage('CSV 파일을 저장했어요.'); }} /></div></>;
  const publicNote = <p className="t-body-sm text-muted">공용 기기에서는 쓰고 나서 백업 파일을 만들고, 이 기기의 데이터를 지워 주세요.</p>;
  return <section className="student-screen grade-input" data-slug="grade-input">
    {slot && createPortal(<button type="button" aria-label="성적 파일" onClick={() => setMenu('files')}><Icon name="more" /></button>, slot)}
    <div className="grade-input__head"><h2 className="t-heading-2">{title}</h2>
      {narrow && <button type="button" className="button-pill-soft" onClick={() => setMenu('view')}>{view} 보기</button>}
      <div className="toolbar grade-desktop-only"><ButtonOutline onClick={() => setMenu('import')}><Icon name="upload" size={20} /> 불러오기</ButtonOutline>
        <ButtonOutline onClick={() => setMenu('export')}><Icon name="download" size={20} /> 내보내기·백업</ButtonOutline>
        {selected.length > 0 && !narrow && <ButtonPrimary onClick={() => setEdit(newGrade(semester))}>+ 과목 추가</ButtonPrimary>}</div></div>
    <p className="grade-input__save t-caption text-muted"><Icon name="lock" size={16} /> 입력한 성적은 이 기기에만 저장돼요. <button type="button" className="text-button t-link" onClick={() => setMenu('export')}>백업하기</button></p>
    <input hidden ref={replyRef} type="file" accept=".jnavi" aria-label="선생님 답장 파일" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void run(async () => { if (f.size > 1_000_000) throw new Error('1MB 이하 파일을 골라 주세요.'); setReply(await openReply(await f.text())); }); }} />
    <input hidden ref={inputRef} type="file" accept=".csv,.xlsx,.pdf" aria-label="성적 파일" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importFile(f); }} />
    <div className="grade-input__pick">{view !== '전체' ? <SegmentedControl label={view === '학년별' ? '학년' : '학기'} value={unitValue} onChange={v => setSemester(v as Semester)} options={units} /> : <span />}
      <div className="grade-input__view grade-desktop-only"><span className="t-caption text-muted">보기</span><SegmentedControl label="보기" value={view} onChange={setView} options={['학기별', '학년별', '전체'].map(value => ({ value, label: value }))} /></div></div>
    {busy && <p role="status">처리하고 있어요.</p>}{message && <p role="status">{message}</p>}{error && <p className="error-note" role="alert">{error}</p>}
    {!selected.length ? <div className="empty-state empty-state--plain"><Icon name="file-text" size={32} /><h3 className="t-heading-4">아직 입력한 성적이 없어요</h3>
      <p>성적표를 보면서 과목을 하나씩 더하거나, 위의 불러오기로 성적 파일을 가져올 수 있어요.</p><ButtonPrimary onClick={() => setEdit(newGrade(semester))}>과목 추가하기</ButtonPrimary></div> : <>
      <div className="grade-input__filter"><div className="toolbar" role="group" aria-label="입력 상태 거르기">{chip('입력 완료', done)}{chip('확인 필요', needCheck)}</div>
        <span className="t-caption text-muted grade-desktop-only">Tab·Enter·방향키로 칸을 옮기고, 엑셀에서 복사한 칸을 그대로 붙여넣을 수 있어요.</span></div>
      <p className="t-caption text-muted num grade-mobile-only">{selected.length}과목 · 학점 합 {summary.credits} · 석차등급 평균 {summary.average?.toFixed(2) ?? '—'}</p>
      <div className="table-scroll grade-desktop"><table className="data-table grade-input-table"><caption className="sr-only">입력한 과목 성적</caption><thead><tr>{['학기', '교과', '과목', '유형', '학점', '원점수/평균', '성취도', '분포비율 A/B/C/D/E', '수강자수', '석차등급', '상태', '편집'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{visible.sort((a, b) => a.semester.localeCompare(b.semester) || a.subject_group.localeCompare(b.subject_group)).map(g => <Fragment key={g.id}><tr>
        <td>{g.semester}</td><td>{g.subject_group}</td><th scope="row">{g.name || '새 과목'}</th><td>{g.type}{g.is_joint && ' · 공동'}</td><td>{cell(g, 'credits', '학점')}</td><td>{hasScores(g) ? <>{cell(g, 'raw_score', '원점수')}{cell(g, 'subject_mean', '과목평균')}</> : '—'}</td><td>{g.achievement ?? '—'}</td><td>{g.achievement_distribution?.join(' / ') ?? '—'}</td><td>{hasScores(g) ? cell(g, 'enrolled_count', '수강자수') : '—'}</td><td>{hasRank(g) ? cell(g, 'rank_grade', '석차등급') : '미산출'}</td><td>{validateGrade(g).length ? '■ 확인 필요' : '입력 완료'}</td><td><ButtonOutline aria-label={`${g.name || '새 과목'} 편집`} onClick={() => setEdit({ ...g })}>편집</ButtonOutline><button className="text-button" aria-label={`${g.name || '새 과목'} 삭제`} onClick={() => setDeleting(g)}>삭제</button></td>
      </tr>{!!validateGrade(g).length && <tr><td colSpan={12} className="error-note">{validateGrade(g).join(' ')}</td></tr>}</Fragment>)}</tbody>
        <tfoot><tr className="grade-input__summary"><td colSpan={12} className="num">{view === '학기별' ? '학기' : view === '학년별' ? '학년' : '전체'} 요약 · {selected.length}과목 · 학점 합 {summary.credits} · 석차등급 평균 {summary.average?.toFixed(2) ?? '—'}</td></tr></tfoot></table></div>
      {!visible.length && <p className="text-muted">조건에 맞는 과목이 없어요.</p>}
      <div className="grade-mobile">{visible.map(g => <article className="subject-card" key={g.id}><p className="t-caption text-muted">{g.semester} · {g.subject_group} · {g.type}</p><h3 className="t-heading-3">{g.name || '새 과목'}</h3><p>{g.credits}학점 · {g.rank_grade !== null ? `${g.rank_grade}등급` : '등급 미산출'} · 성취도 {g.achievement ?? '—'}</p>{!!validateGrade(g).length && <p className="error-note">■ {validateGrade(g).join(' ')}</p>}<div className="toolbar"><ButtonOutline onClick={() => setEdit({ ...g })}>편집</ButtonOutline><button className="text-button" onClick={() => setDeleting(g)}>삭제</button></div></article>)}</div>
      {narrow && <ButtonPrimary className="grade-input__add" onClick={() => setEdit(newGrade(semester))}>+ 과목 추가</ButtonPrimary>}
      <p className="t-caption text-muted">확인 필요 과목은 계산에 넣지 않아요. 석차등급 평균은 수강자수 5명 이하 과목을 제외한 학점 가중 평균이에요. <Link className="t-link" to="/five-to-nine">5 to 9 보기</Link></p>
      {view !== '학기별' && <p className="t-caption text-muted num">{semesters.filter(s => view === '전체' || s[0] === semester[0]).map(s => { const sum = gradeSummary(grades.filter(g => g.semester === s)); return `${s} · ${sum.credits}학점 · ${sum.average?.toFixed(2) ?? '—'}`; }).join('  /  ')}</p>}
    </>}
    <AttendanceFields key={year} initial={attendance ?? emptyAttendance(year)} onSave={a => run(async () => { await studentDb.attendance.put(a); }, '출결을 저장했어요.')} />
    {menu === 'import' && <Modal label="성적 불러오기" onClose={() => setMenu(null)}><h3 className="t-heading-3">성적 불러오기</h3>{importRows}<p className="t-caption text-muted">파일은 이 기기 안에서 읽고, 어디로도 보내지 않아요.</p></Modal>}
    {menu === 'export' && <Modal label="내보내기·백업" onClose={() => setMenu(null)}><h3 className="t-heading-3">내보내기·백업</h3>{exportRows}{publicNote}</Modal>}
    {menu === 'files' && <Modal label="성적 파일" onClose={() => setMenu(null)}><h3 className="t-heading-4">성적 파일</h3><p className="t-label text-muted">불러오기</p>{importRows}{exportRows}{publicNote}</Modal>}
    {menu === 'view' && <Modal label="보기" onClose={() => setMenu(null)}><h3 className="t-heading-4">보기</h3><div className="menu-rows">
      {([['학기별', '한 학기씩 봐요'], ['학년별', '학기 소계와 학년 소계를 같이 봐요'], ['전체', '모든 학기를 한 번에 봐요']] as const).map(([v, c]) =>
        <MenuRow key={v} title={v} caption={c} selected={view === v} onClick={() => { setView(v); setMenu(null); }} />)}</div></Modal>}
    {reply && <Modal label="선생님 답장" onClose={() => setReply(null)}><h3 className="t-heading-3">선생님 답장</h3>
      <p className="t-caption text-muted num">{Number(reply.number)}번 {reply.alias} · {reply.payload.scenario} 카드 · {reply.created_at.slice(0, 10)}</p>
      <p className="reply-text">{reply.payload.comment}</p>
      {reply.payload.slots.length > 0 && <ol className="t-body-sm">{reply.payload.slots.map(x => <li key={x.priority}>{x.university}</li>)}</ol>}
      <p className="t-caption text-muted">답장은 이 기기에 저장하지 않아요. 다시 보려면 파일을 다시 열어 주세요.</p>
      <ButtonOutline onClick={() => setReply(null)}>닫기</ButtonOutline></Modal>}
    {edit && <GradeEditor initial={edit} busy={busy} onSave={saveGrade} onClose={() => setEdit(null)} />}
    {pasteText !== null && <Modal label="표 붙여넣기" wide onClose={() => setPasteText(null)}><h3 className="t-heading-3">엑셀 표 붙여넣기</h3><p>양식의 제목 행을 포함해 복사해 주세요. 확인 화면을 거친 뒤 저장해요.</p><label>성적 표<textarea rows={8} value={pasteText} onChange={e => setPasteText(e.target.value)} /></label><ButtonPrimary onClick={() => void run(async () => { setPreview(rowsToGrades(parseCsv(pasteText))); setPasteText(null); })}>가져올 값 확인</ButtonPrimary>{error && <p role="alert">{error}</p>}<ButtonOutline onClick={() => setPasteText(null)}>취소</ButtonOutline></Modal>}
    {deleting && <Modal label="과목 삭제" onClose={() => { if (!busy) setDeleting(null); }}><h3>이 과목을 삭제할까요?</h3><p>{deleting.name || '새 과목'}</p><ButtonPrimary disabled={busy} onClick={() => void run(async () => { await studentDb.grades.delete(deleting.id); setDeleting(null); }, '과목을 삭제했어요.')}>삭제</ButtonPrimary><ButtonOutline onClick={() => setDeleting(null)}>취소</ButtonOutline></Modal>}
    {preview && <Modal label="가져올 성적 확인" wide onClose={() => { if (!busy) setPreview(null); }}><h3 className="t-heading-3">가져올 성적을 확인해 주세요</h3><p>기존 성적에 {preview.grades.length}개 과목을 추가해요. 같은 과목이 이미 있다면 중복 여부를 확인해 주세요.</p><p>PDF 원본은 저장하지 않아요. 읽은 성적만 확인 후 저장해요.</p>
      <ul>{preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul><div className="table-scroll"><table className="data-table"><thead><tr><th>학기</th><th>과목</th><th>학점</th><th>등급</th><th>원점수/평균</th><th>수강자수</th><th>제외</th></tr></thead><tbody>{preview.grades.map(g => <tr key={g.id}><td>{g.semester}</td><td>{g.name}</td><td>{g.credits}</td><td>{g.rank_grade ?? '미산출'}</td><td>{g.raw_score ?? '—'}/{g.subject_mean ?? '—'}</td><td>{g.enrolled_count ?? '—'}</td><td><button onClick={() => setPreview({ ...preview, grades: preview.grades.filter(x => x.id !== g.id) })}>빼기</button></td></tr>)}</tbody></table></div>
      <ButtonPrimary disabled={busy || !preview.grades.length} onClick={() => void run(async () => { await studentDb.grades.bulkAdd(preview.grades); setPreview(null); }, '확인한 과목을 저장했어요.')}>확인한 성적 추가</ButtonPrimary><ButtonOutline onClick={() => setPreview(null)}>취소</ButtonOutline></Modal>}
    {backupOpen && <Modal label="백업과 복원" onClose={() => { if (!busy) { setBackupOpen(false); setRestore(null); setPassword(''); } }}><h3 className="t-heading-3">암호화 백업·복원</h3><p>성적·출결·모의고사, 관심 전형, 지원 전형·수시로·체크리스트·자격 확인·상담 기록을 함께 백업해요. 암호를 잃어버리면 복원할 수 없어요.</p><label>백업 암호<input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <ButtonPrimary disabled={busy || password.length < 8} onClick={() => void run(async () => { downloadFile(await encryptBackup(await studentDb.snapshot(), password), '내-성적.jnavi', 'application/json'); setPassword(''); setBackupOpen(false); }, '암호화 백업을 만들었어요.')}>백업 내려받기</ButtonPrimary>
      <ButtonOutline disabled={busy || !password} onClick={() => backupRef.current?.click()}>백업 파일 열기</ButtonOutline><input hidden ref={backupRef} aria-label="백업 파일" type="file" accept=".jnavi" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void run(async () => { if (file.size > 5_000_000) throw new Error('5MB 이하 백업을 선택해 주세요.'); setRestore(await decryptBackup(await file.text(), password)); }); }} />
      {restore && <div className="notice"><p>{restore.grades.length}개 과목 · 출결 {restore.attendance.length}개 학년으로 현재 성적·출결을 바꿀까요?</p><p>{restore.planning ? `지원 전형 ${restore.planning.applications.length}개와 상담 항목 ${restore.planning.tasks.length}개로 현재 준비 기록도 모두 바꿔요. 수시로는 ${restore.boards?.length ?? 0}개로 바꿔요.` : '이전 형식의 성적 백업이에요. 현재 준비·상담·수시로 기록은 유지해요.'}</p><p>{restore.mocks !== undefined ? `모의고사 기록은 ${restore.mocks.length}개로 바꿔요.` : '백업에 모의고사가 없어 현재 기록은 유지해요.'}</p><p>{restore.interests !== undefined ? `관심 전형은 ${restore.interests.length}개로 바꿔요.` : '백업에 관심 전형이 없어 현재 목록은 유지해요.'}</p><ButtonOutline disabled={busy} onClick={() => void run(async () => { await studentDb.restore(restore); setRestore(null); setPassword(''); setBackupOpen(false); }, '백업을 복원했어요.')}>현재 데이터 대신 복원</ButtonOutline></div>}
      {error && <p role="alert" className="error-note">{error}</p>}
      {error && <p role="alert" className="error-note">{error}</p>}<ButtonOutline onClick={() => { setBackupOpen(false); setRestore(null); setPassword(''); }}>닫기</ButtonOutline></Modal>}
  </section>;
}

function MenuRow({ title, caption, onClick, selected }: { title: string; caption: string; onClick: () => void; selected?: boolean }) {
  return <button type="button" className="menu-row" aria-pressed={selected} onClick={onClick}><span><strong>{title}</strong><span className="t-caption text-muted">{caption}</span></span><Icon name="chevron-right" size={20} /></button>;
}

function GradeEditor({ initial, busy, onSave, onClose }: { initial: GradeRecord; busy: boolean; onSave: (g: GradeRecord) => unknown; onClose: () => void }) {
  const [g, set] = useState(initial);
  const errors = validateGrade(g);
  const patch = (value: Partial<GradeRecord>) => set(old => {
    const next = { ...old, ...value };
    if (!hasRank(next)) next.rank_grade = null;
    if (!hasScores(next)) { next.raw_score = undefined; next.subject_mean = undefined; next.enrolled_count = undefined; next.achievement_distribution = undefined; next.division = 'unknown'; }
    if (value.type !== undefined && value.type !== old.type) next.achievement = undefined;
    return next;
  });
  const numeric = (label: string, key: 'credits' | 'raw_score' | 'subject_mean' | 'enrolled_count' | 'rank_grade', min: number, max: number, required = false) => <label>{label}<input aria-label={label} type="number" step={key === 'raw_score' || key === 'subject_mean' ? 'any' : '1'} min={min} max={max} value={g[key] ?? ''} onChange={e => patch({ [key]: e.target.value === '' ? key === 'rank_grade' ? null : required ? 0 : undefined : Number(e.target.value) })} /></label>;
  return <Modal label="과목 편집" wide onClose={() => { if (!busy) onClose(); }}><h3 className="t-heading-3">과목 편집</h3><div className="form-grid">
    <label>과목명<input autoFocus list="subject-suggestions" value={g.name} onChange={e => { const known = subjectCatalog.find(s => s.name === e.target.value); patch({ name: e.target.value, ...(known ? { subject_group: known.group, type: known.type } : {}) }); }} /></label><datalist id="subject-suggestions">{subjectCatalog.map(s => <option key={s.name} value={s.name} />)}</datalist>
    <label>교과<input value={g.subject_group} onChange={e => patch({ subject_group: e.target.value })} /></label>
    <label>학기<select value={g.semester} onChange={e => patch({ semester: e.target.value as Semester })}>{semesters.map(s => <option key={s}>{s}</option>)}</select></label>
    <label>과목 유형<select value={g.type} onChange={e => patch({ type: e.target.value as GradeRecord['type'] })}>{subjectTypes.map(s => <option key={s}>{s}</option>)}</select></label>
    {numeric('학점', 'credits', 1, 30, true)}{hasRank(g) ? numeric('석차등급', 'rank_grade', 1, 5) : <label>석차등급<input disabled value="미산출" /></label>}
    {hasScores(g) && <>{numeric('원점수', 'raw_score', 0, 100)}{numeric('과목평균', 'subject_mean', 0, 100)}{numeric('수강자수', 'enrolled_count', 1, 100000)}</>}
    <label>성취도<select value={g.achievement ?? ''} onChange={e => patch({ achievement: (e.target.value || undefined) as GradeRecord['achievement'] })}><option value="">선택</option>{(g.type === '교양' ? ['P', 'F'] : hasScores(g) ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C']).map(a => <option key={a}>{a}</option>)}</select></label>
  </div>{hasScores(g) && <><fieldset><legend>성취도별 분포비율(선택, %)</legend><div className="distribution-fields">{['A', 'B', 'C', 'D', 'E'].map((a, i) => <label key={a}>{a}<input type="number" min="0" max="100" step="any" value={g.achievement_distribution?.[i] ?? ''} onChange={e => { const d = [...g.achievement_distribution ?? [0, 0, 0, 0, 0]] as [number, number, number, number, number]; d[i] = Number(e.target.value); patch({ achievement_distribution: d }); }} /></label>)}</div><p>합계 {g.achievement_distribution?.reduce((a, b) => a + b, 0).toFixed(1) ?? '—'}%</p><button className="text-button" onClick={() => patch({ achievement_distribution: undefined })}>분포비율 비우기</button></fieldset>
    <label>분할점수<select value={g.division ?? 'unknown'} onChange={e => patch({ division: e.target.value as GradeRecord['division'] })}><option value="unknown">모름</option><option value="fixed">고정분할</option><option value="estimated">추정분할</option></select></label></>}
    <label className="checkbox-label"><input type="checkbox" checked={g.is_joint} onChange={e => patch({ is_joint: e.target.checked })} />공동교육과정·온라인학교 과목이에요</label>
    {!!errors.length && <ul className="error-note" role="alert">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
    <div className="toolbar"><ButtonPrimary disabled={busy || !!errors.length} onClick={() => void onSave(g)}>저장</ButtonPrimary><ButtonOutline disabled={busy} onClick={() => void onSave(g)}>작성 중으로 보관</ButtonOutline><ButtonOutline onClick={onClose}>취소</ButtonOutline></div>
    <p className="t-caption text-muted">추천 목록에 없는 과목은 직접 입력할 수 있어요. 과목 유형은 성적표와 대조해 주세요.</p>
  </Modal>;
}

const KIND_LABEL = ['결석', '지각', '조퇴', '결과'], KIND_UNIT = ['일', '회', '회', '회'], REASON_LABEL = ['질병', '미인정', '기타'];
/** 출결은 학년 단위. 칸을 떠날 때 검사해서 맞으면 바로 저장해요(R-IN). */
function AttendanceFields({ initial, onSave }: { initial: AttendanceRecord; onSave: (a: AttendanceRecord) => unknown }) {
  const [a, set] = useState(initial), errors = validateAttendance(a);
  const commit = (next: AttendanceRecord) => { set(next); if (!validateAttendance(next).length && JSON.stringify(next) !== JSON.stringify(initial)) void onSave(next); };
  const num = (v: string) => (v === '' ? 0 : Number(v));
  return <div className="grade-input__attendance">
    <div className="section-row"><h3 className="t-heading-3">{a.year}학년 출결</h3>
      <span className="attendance-days"><label className="attendance-days">수업일수<input type="number" inputMode="numeric" min="0" max="366" value={a.school_days || ''} placeholder="0" onChange={e => set({ ...a, school_days: num(e.target.value) })} onBlur={() => commit(a)} /></label><span className="t-caption text-muted">일</span></span></div>
    <div className="attendance-grid" role="group" aria-label={`${a.year}학년 출결 입력`}>
      <span />{REASON_LABEL.map(r => <span key={r} className="t-caption text-muted">{r}</span>)}
      {attendanceKinds.map((k, i) => <Fragment key={k}><span className="t-body">{KIND_LABEL[i]}</span>
        {attendanceReasons.map((r, j) => <span key={r} className="attendance-cell"><input aria-label={`${KIND_LABEL[i]} ${REASON_LABEL[j]}`} type="number" inputMode="numeric" min="0" max="366" placeholder="0"
          value={a[k][r] || ''} aria-invalid={!!errors.length} onChange={e => set({ ...a, [k]: { ...a[k], [r]: num(e.target.value) } })} onBlur={() => commit(a)} /><span className="t-caption text-muted">{KIND_UNIT[i]}</span></span>)}</Fragment>)}
    </div>
    {errors.length > 0 ? <p role="alert" className="error-note t-caption">{errors.join(' ')}</p> : <p className="t-caption text-muted">질병·미인정·기타를 구분해 입력해요. 칸을 옮기면 저장돼요.</p>}
  </div>;
}

function useNarrow() {
  const query = '(max-width: 767px)';
  const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => { if (typeof matchMedia !== 'function') return; const m = matchMedia(query), on = () => setNarrow(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, []);
  return narrow;
}
