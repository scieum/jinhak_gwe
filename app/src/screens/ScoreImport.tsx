import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { BoardHead, Mark, useDesktop } from '../components/TeacherBoard';
import { isSampleMode } from '../data/sample/mode';
import { sampleImport } from '../data/sample/teacher';
import type { Student } from '../domain/classroom';
import { EXAM_KINDS, FIELDS, applicable, autoMap, checkRows, examName, type CheckedRow, type ColumnMap, type ImportKind } from '../domain/scoreImport';
import { downloadFile } from '../io/backup';
import { readSheetRows, xlsxOf } from '../io/grades';
import { teacherDb, type ClassState } from '../store/teacherDb';
import '../styles/score-import.css';

// v2 시안(Figma 346:152228 PC · 346:155908 모바일) = 3 검증 단계. 샘플 모드는 시안의 샘플 파일(10월 학평 28행)을 연 상태로 시작해요.
type Step = 'file' | 'map' | 'check' | 'done';
const STEPS: [Step, string][] = [['file', '파일'], ['map', '열 맞추기'], ['check', '검증'], ['done', '반영']];
const MONTHS = [3, 4, 6, 7, 9, 10, 11];
const PC_TABLE_ROWS = 10; // 시안: "28행 중 10행을 보고 있어요"
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const TONE = { 정상: 'safe', '확인 필요': 'reach', 오류: 'risk' } as const;
const SHORT: Record<string, string> = { 국어: '국', 수학: '수', 영어: '영', 한국사: '한' };

export function ScoreImport() {
  return <ClassGate slug="score-import" title="성적 불러오기">{c => <ImportBody {...c} />}</ClassGate>;
}

function ImportBody({ info, students, mocks }: ClassState & { info: NonNullable<ClassState['info']> }) {
  const desktop = useDesktop(), sample = useState(isSampleMode)[0];
  const [step, setStep] = useState<Step>(sample ? 'check' : 'file'), [kind, setKind] = useState<ImportKind>('mock');
  const [year, setYear] = useState(sample ? sampleImport.year : new Date().getFullYear()), [month, setMonth] = useState(sample ? sampleImport.month : 10), [examKind, setExamKind] = useState<string>('학평');
  const [fileName, setFileName] = useState(sample ? sampleImport.fileName : ''), [rows, setRows] = useState<unknown[][]>(sample ? sampleImport.rows : []);
  const [map, setMap] = useState<ColumnMap>(sample ? autoMap(sampleImport.rows[0], 'mock') : {}), [error, setError] = useState('');
  const [pcFilter, setPcFilter] = useState<'all' | 'warn' | 'error'>('all'), [mFilter, setMFilter] = useState<'issues' | 'all'>('issues');
  const [allRows, setAllRows] = useState(false), [applied, setApplied] = useState(0), [confirming, setConfirming] = useState(false);
  const exam = examName(year, month, examKind), header = rows[0] ?? [];
  const checked = step === 'check' ? checkRows(rows.slice(1), map, kind, students) : [];
  const ready = applicable(checked), blocking = checked.filter(r => r.blocking).length;
  const warn = checked.filter(r => r.status === '확인 필요'), errors = checked.filter(r => r.status === '오류');
  const already = kind === 'mock' ? mocks.filter(m => m.exam === exam).length : 0;
  const mapped = Object.values(map).filter(i => i >= 0).length;
  const title = kind === 'mock' ? `${exam} · 등급만` : '내신 학기 평균';

  const read = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const r = await readSheetRows(file);
      if (r.length < 2) throw new Error('머리글 아래에 학생 행이 없어요.');
      setRows(r); setFileName(file.name); setMap(autoMap(r[0], kind)); setStep('map'); setAllRows(false);
    } catch (e) { setError(e instanceof Error ? e.message : '파일을 읽지 못했어요.'); }
  };
  const template = async () => downloadFile(await xlsxOf('성적', ['번호', '별칭', ...FIELDS[kind]], students.map(s => [s.number, s.alias])), `성적양식_${info.name}_${kind === 'mock' ? '모의고사' : '내신'}.xlsx`, XLSX);
  const apply = async () => {
    setConfirming(false);
    const now = new Date().toISOString();
    try {
      if (kind === 'mock') await teacherDb.mocks.bulkPut(ready.map(r => ({ number: r.number!, exam, grades: r.values, updated_at: now })));
      else await teacherDb.transaction('rw', teacherDb.school, async () => { for (const r of ready) {
        const old = await teacherDb.school.get(r.number!), semesters = { ...old?.semesters };
        for (const [k, v] of Object.entries(r.values)) if (v !== null) semesters[k] = v;
        await teacherDb.school.put({ number: r.number!, semesters, updated_at: now });
      } });
      setApplied(ready.length); setStep('done');
    } catch { setError('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); }
  };
  // 같은 회차가 이미 있으면 덮어쓰기 전에 한 번 물어요(시안 화면에는 자리가 없어 반영 버튼에서 확인).
  const tryApply = () => already > 0 ? setConfirming(true) : void apply();
  const errorCsv = () => downloadFile('﻿' + ['줄,번호,별칭,사유', ...errors.map(r => [r.line, r.number ?? '', r.alias, r.reason].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n'), `오류행_${fileName}.csv`, 'text/csv');
  const lead = `${info.name} ${students.length}명 · ${{ file: '불러올 성적 파일을 골라 주세요.', map: '파일의 열을 항목에 맞춰 주세요.', check: `${kind === 'mock' ? `${month}월 ${examKind}` : '내신'} 파일을 검증하고 있어요. 확인할 행만 보고 반영하면 돼요.`, done: '성적을 반영했어요.' }[step]}`;

  const steps = <ol className="si-steps" aria-label="단계">{STEPS.map(([s, l], i) => {
    const at = STEPS.findIndex(x => x[0] === step), done = i < at;
    return <Fragment key={s}>{i > 0 && <li aria-hidden="true" className="si-steps__sep"><Icon name="chevron-right" size={24} /></li>}
      <li className={`si-step${s === step ? ' is-current' : ''}${done ? ' is-done' : ''}`} aria-current={s === step ? 'step' : undefined}>{done && <Icon name="check" size={24} />}{desktop ? `${i + 1} ${l}` : l.split(' ')[0]}</li></Fragment>;
  })}</ol>;
  const callout = (warn.length > 0 || errors.length > 0) && <div className="warning-callout si-callout"><Icon name="triangle-alert" size={20} /><div>
    <p className="si-callout__title">{blocking ? `번호·별칭이 명단과 다른 행이 ${blocking}개 있어요` : `확인할 행이 ${warn.length + errors.length}개 있어요`}</p>
    <p className="si-callout__body">{blocking ? '고쳐서 다시 올려야 반영돼요' : <>
      {errors.length > 0 && <>■ 범위 오류 {errors.length}행{desktop && errors.length === 1 ? `(${Number(errors[0].number)}번 ${errors[0].bad.join(', ')})` : ''}은 빼고 반영해요</>}
      {errors.length > 0 && warn.length > 0 && <br />}
      {warn.length > 0 && <>▲ {kind === 'mock' ? `빈 칸 ${warn.length}행은 결시로 반영돼요` : `값이 없는 ${warn.length}행은 반영하지 않아요`}</>}</>}</p></div></div>;
  const subStat = (label: string, value: string) => <span className="si-substat"><span>{label}</span><strong className="num">{value}</strong></span>;
  const summary = <div className="si-summary"><div className="si-hero">
    <div className="stat-tile si-stat"><span className="si-caption">반영 예정</span><strong className="num key-number">{ready.length}명</strong>
      <p>{blocking ? '명단과 다른 행을 고치면 반영할 수 있어요.' : errors.length ? `${checked.length}행 중 범위 오류 ${errors.length}행만 빼고 반영해요.` : `${checked.length}행을 모두 반영해요.`}</p></div>
    <p className="si-substats">{desktop && subStat('파일', `${checked.length}행`)}{subStat('확인 필요', `${warn.length}행`)}{subStat('오류', `${errors.length}행`)}</p></div>{callout}</div>;
  const applyButton = <ButtonPrimary disabled={!ready.length} onClick={tryApply}>{ready.length}명 반영하기</ButtonPrimary>;
  const note = <span className="si-caption">학급 데이터는 이 기기에만 암호화해서 저장돼요</span>;

  return <div className={`si${desktop ? ' si--pc' : ' si--m'}`}>
    <BoardHead desktop={desktop} lead={lead} />
    {steps}
    {error && <p role="alert" className="error-note">{error}</p>}

    {step === 'file' && <>
      <section className="si-card filter-panel" aria-label="불러올 성적 조건">
        <SegmentedControl label="불러올 성적" value={kind} onChange={setKind} options={[{ value: 'mock', label: '모의고사 등급' }, { value: 'school', label: '내신 학기 평균' }]} />
        {kind === 'mock' ? <ExamRow {...{ year, setYear, month, setMonth, examKind, setExamKind }} /> : <p className="t-body-sm text-muted">학기별 5등급 평균(1-1~3-2)을 불러와요. 빈 학기는 그대로 둬요.</p>}
        <p className="si-caption">{kind === 'mock' ? '영역 등급(국어·수학·영어·한국사·탐구1·탐구2)을 불러와요. 원점수·백분위는 아직 받지 않아요.' : '반영하면 같은 학기 값은 새 값으로 바뀌어요.'}</p>
        <label className="drop-zone"><span>성적 파일(xlsx·csv)을 골라 주세요 · 첫 줄은 머리글</span><span className="button-outline">파일 고르기</span>
          <input type="file" accept=".xlsx,.csv" className="sr-only" aria-label="성적 파일 고르기" onChange={e => { read(e.target.files?.[0]); e.target.value = ''; }} /></label>
        <ButtonOutline onClick={template}>번호·별칭을 채운 양식 내려받기</ButtonOutline>
      </section>
    </>}

    {step === 'map' && <section className="si-card">
      <p className="t-body-sm">{fileName} · {rows.length - 1}행 · 열 {header.length}개</p>
      <div className="form-grid">{['번호', '별칭', ...FIELDS[kind]].map(f => <label key={f}>{f}<select value={map[f] ?? -1} onChange={e => setMap({ ...map, [f]: Number(e.target.value) })}>
        <option value={-1}>{f === '별칭' ? '없음(번호로만 맞춰요)' : '없음'}</option>{header.map((h, i) => <option key={i} value={i}>{String(h) || `${i + 1}번째 열`}</option>)}</select></label>)}</div>
      <div className="toolbar"><ButtonOutline onClick={() => setStep('file')}>다른 파일 올리기</ButtonOutline><ButtonPrimary disabled={map.번호 < 0} onClick={() => setStep('check')}>검증하기</ButtonPrimary></div>
    </section>}

    {step === 'check' && desktop && <>
      <section className="si-card si-exam" aria-label="시험과 파일">
        {kind === 'mock' && <div className="si-exam__row"><ExamRow {...{ year, setYear, month, setMonth, examKind, setExamKind }} />
          <div className="si-field"><span className="si-label">반영 항목</span><div className="segmented-control si-include" role="group" aria-label="반영 항목">
            <button type="button" className="segmented-control__option" aria-pressed="true">등급만</button>
            <button type="button" className="segmented-control__option" disabled title="원점수·백분위는 아직 받지 않아요">원점수·백분위 함께</button></div></div></div>}
        <p className="si-caption">{kind === 'mock' ? '영역 등급(국어·수학·영어·한국사·탐구1·탐구2)은 꼭 있어야 하고, 원점수·백분위는 파일에 있을 때만 함께' : '학기별 5등급 평균(1-1~3-2)을 불러와요. 빈 학기는 그대로 둬요.'}</p>
        <div className="si-file"><Icon name="file-text" size={24} /><span>{fileName} · {rows.length - 1}행 · 열 {mapped}개 맞춤</span>
          <label className="button-pill-soft si-pill"><Icon name="upload" size={20} />다른 파일 올리기
            <input type="file" accept=".xlsx,.csv" className="sr-only" aria-label="성적 파일 고르기" onChange={e => { read(e.target.files?.[0]); e.target.value = ''; }} /></label></div>
      </section>
      {summary}
      <section className="si-card si-tablecard" aria-label="검증 결과">
        <div className="si-filter"><SegmentedControl label="거르기" value={pcFilter} onChange={v => { setPcFilter(v); setAllRows(false); }} options={[{ value: 'all', label: `전체 ${checked.length}` }, { value: 'warn', label: `확인 필요 ${warn.length}` }, { value: 'error', label: `오류 ${errors.length}` }]} />
          <span className="si-caption">확인 필요·오류 행을 위로 모았어요</span></div>
        <CheckTable rows={checked.filter(r => pcFilter === 'all' || (pcFilter === 'warn' ? r.status === '확인 필요' : r.status === '오류'))} all={allRows} onAll={() => setAllRows(true)} kind={kind} students={students} />
      </section>
      <div className="si-actionbar">
        <div className="si-actionbar__secondary"><button type="button" className="button-pill-soft si-pill" onClick={() => setStep('map')}><Icon name="chevron-left" size={20} />열 맞추기로 돌아가기</button>
          {errors.length > 0 && <ButtonOutline className="si-outline" onClick={errorCsv}><Icon name="download" size={20} />오류 행만 내려받기</ButtonOutline>}</div>
        {note}{applyButton}</div>
    </>}

    {step === 'check' && !desktop && <>
      <div className="si-examsum"><p className="si-examsum__title"><span>{title}</span><span className="data-status-badge">{info.name} · {students.length}명</span></p>
        <p className="si-caption">{fileName} · {rows.length - 1}행</p></div>
      {summary}
      <section className="si-rows" aria-label="검증 결과">
        <SegmentedControl label="거르기" value={mFilter} onChange={setMFilter} options={[{ value: 'issues', label: `확인 필요·오류 ${warn.length + errors.length}` }, { value: 'all', label: `전체 ${checked.length}` }]} />
        <ul className="si-list">{checked.filter(r => mFilter === 'all' || r.status !== '정상').map(r => <RowCard key={r.line} row={r} kind={kind} students={students} />)}</ul>
      </section>
      <p className="si-pcnote"><Icon name="info" size={24} />PC에서 열면 전체 표 확인, 오류 행 내려받기, 열 다시 맞추기를 쓸 수 있어요</p>
      <div className="si-bottom">{note}{applyButton}</div>
    </>}

    {step === 'done' && <div className="empty-state"><h3 className="t-heading-3">{applied}명을 반영했어요</h3><p>{kind === 'mock' ? exam : '내신 학기 평균'} · 우리 반 홈과 학생 기록에서 볼 수 있어요.</p>
      <div className="toolbar"><Link className="button-outline" to="/teacher/teacher-dashboard">우리 반 홈 ›</Link><ButtonOutline onClick={() => { setStep('file'); setRows([]); }}>다른 성적 불러오기</ButtonOutline></div></div>}

    {confirming && <Modal label="다시 반영" onClose={() => setConfirming(false)}><h3 className="t-heading-3">{exam}은 이미 {already}명 반영돼 있어요</h3>
      <p>다시 반영하면 {ready.length}명의 값이 새 값으로 바뀌어요.</p>
      <div className="toolbar"><ButtonOutline onClick={() => setConfirming(false)}>취소</ButtonOutline><ButtonPrimary onClick={() => void apply()}>새 값으로 반영</ButtonPrimary></div></Modal>}
  </div>;
}

type ExamProps = { year: number; setYear: (v: number) => void; month: number; setMonth: (v: number) => void; examKind: string; setExamKind: (v: string) => void };
function ExamRow({ year, setYear, month, setMonth, examKind, setExamKind }: ExamProps) {
  return <div className="si-field"><span className="si-label">시험</span>
    <input className="si-year" type="number" min={2024} max={2035} aria-label="연도" value={year} onChange={e => setYear(Number(e.target.value))} />
    <span className="si-select"><select aria-label="월" value={month} onChange={e => setMonth(Number(e.target.value))}>{MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}</select><Icon name="chevron-down" size={20} /></span>
    <SegmentedControl label="종류" value={examKind} onChange={setExamKind} options={EXAM_KINDS.map(k => ({ value: k, label: k }))} /></div>;
}

const aliasOf = (r: CheckedRow, students: readonly Student[]) => r.alias || students.find(s => s.number === r.number)?.alias || '–';
const badOf = (r: CheckedRow, f: string) => r.bad.find(b => b.startsWith(`${f} `))?.slice(f.length + 1);

function CheckTable({ rows, all, onAll, kind, students }: { rows: CheckedRow[]; all: boolean; onAll: () => void; kind: ImportKind; students: readonly Student[] }) {
  const shown = all ? rows : rows.slice(0, PC_TABLE_ROWS);
  return <><div className="table-scroll"><table className="data-table si-table"><thead><tr><th>번호</th><th>별칭</th>{FIELDS[kind].map(f => <th key={f} className="num">{f}</th>)}<th>상태</th><th>사유</th></tr></thead>
    <tbody>{shown.map(r => <tr key={r.line}><td className="num">{r.number ? Number(r.number) : '–'}</td><td>{aliasOf(r, students)}</td>
      {FIELDS[kind].map(f => { const bad = badOf(r, f), v = r.values[f];
        return <td key={f} className="num">{bad ? <span className="si-bad">{bad}</span> : v ?? <span className="text-muted">–</span>}</td>; })}
      <td><Mark tone={TONE[r.status]} label={r.status} soft /></td><td>{r.reason}</td></tr>)}</tbody></table></div>
    <p className="si-caption si-count">{rows.length}행 중 {shown.length}행을 보고 있어요{shown.length < rows.length && <> · <button type="button" className="text-button" onClick={onAll}>모두 보기</button></>}</p></>;
}

/** 모바일 학생 줄(student-row-card): 번호 · 별칭 · 걸린 칸 · 상태 / 영역 등급 한 줄. */
function RowCard({ row: r, kind, students }: { row: CheckedRow; kind: ImportKind; students: readonly Student[] }) {
  const mid = r.status === '오류' ? (r.bad.length ? `${r.bad.join(', ')} · ${kind === 'mock' ? '1~9' : '1.0~5.0'} 밖` : r.reason) : r.status === '확인 필요' ? `${r.blank.join('·')} 빈 칸` : '';
  const cell = (f: string) => badOf(r, f) ?? r.values[f] ?? '–';
  const line2 = kind === 'mock' ? `${['국어', '수학', '영어', '한국사'].map(f => `${SHORT[f]} ${cell(f)}`).join(' · ')} · 탐 ${cell('탐구1')} · ${cell('탐구2')}` : FIELDS.school.map(f => `${f} ${cell(f)}`).join(' · ');
  return <li className="tb-rowcard tb-rowcard--two si-rowcard"><span className="tb-rowcard__line"><span className="tb-rowcard__num">{r.number ? `${Number(r.number)}번` : '–'}</span><span className="tb-rowcard__alias">{aliasOf(r, students)}</span>
    {mid && <span className="tb-rowcard__mid">{mid}</span>}<span className="tb-rowcard__badges"><Mark tone={TONE[r.status]} label={r.status} soft /></span></span>
    <span className="tb-rowcard__sub">{line2}</span></li>;
}
