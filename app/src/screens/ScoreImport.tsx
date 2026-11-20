import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { SegmentedControl } from '../components/SegmentedControl';
import type { Student } from '../domain/classroom';
import { EXAM_KINDS, FIELDS, applicable, autoMap, checkRows, examName, type CheckedRow, type ColumnMap, type ImportKind } from '../domain/scoreImport';
import { downloadFile } from '../io/backup';
import { readSheetRows, xlsxOf } from '../io/grades';
import { teacherDb, type ClassState } from '../store/teacherDb';

type Step = 'file' | 'map' | 'check' | 'done';
const STEPS: [Step, string][] = [['file', '1 파일'], ['map', '2 열 맞추기'], ['check', '3 검증'], ['done', '4 반영']];
const MONTHS = [3, 4, 6, 7, 9, 10, 11];
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const STATUS_CLASS = { 정상: 'judge-safe', '확인 필요': 'judge-reach', 오류: 'judge-risk' } as const;
const STATUS_ICON = { 정상: '●', '확인 필요': '▲', 오류: '■' } as const;

export function ScoreImport() {
  return <ClassGate slug="score-import" title="성적 불러오기">{c => <ImportBody {...c} />}</ClassGate>;
}

function ImportBody({ info, students, mocks }: ClassState & { info: NonNullable<ClassState['info']> }) {
  const [step, setStep] = useState<Step>('file'), [kind, setKind] = useState<ImportKind>('mock');
  const [year, setYear] = useState(new Date().getFullYear()), [month, setMonth] = useState(10), [examKind, setExamKind] = useState<string>('학평');
  const [fileName, setFileName] = useState(''), [rows, setRows] = useState<unknown[][]>([]), [map, setMap] = useState<ColumnMap>({}), [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'warn' | 'error'>('all'), [applied, setApplied] = useState(0);
  const exam = examName(year, month, examKind), header = rows[0] ?? [];
  const checked = step === 'check' ? checkRows(rows.slice(1), map, kind, students) : [];
  const ready = applicable(checked), blocking = checked.filter(r => r.blocking).length;
  const warn = checked.filter(r => r.status === '확인 필요'), errors = checked.filter(r => r.status === '오류');
  const already = kind === 'mock' ? mocks.filter(m => m.exam === exam).length : 0;

  const read = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const r = await readSheetRows(file);
      if (r.length < 2) throw new Error('머리글 아래에 학생 행이 없어요.');
      setRows(r); setFileName(file.name); setMap(autoMap(r[0], kind)); setStep('map');
    } catch (e) { setError(e instanceof Error ? e.message : '파일을 읽지 못했어요.'); }
  };
  const template = async () => downloadFile(await xlsxOf('성적', ['번호', '별칭', ...FIELDS[kind]], students.map(s => [s.number, s.alias])), `성적양식_${info.name}_${kind === 'mock' ? '모의고사' : '내신'}.xlsx`, XLSX);
  const apply = async () => {
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
  const errorCsv = () => downloadFile('﻿' + ['줄,번호,별칭,사유', ...errors.map(r => [r.line, r.number ?? '', r.alias, r.reason].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n'), `오류행_${fileName}.csv`, 'text/csv');

  return <>
    <p className="t-caption"><span className="data-status-badge">{info.name} · {students.length}명</span></p>
    <p className="t-caption" aria-label="단계">{STEPS.map(([s, l], i) => <span key={s} className={s === step ? 'step-current' : 'text-muted'}>{i ? ' · ' : ''}{l}</span>)}</p>
    {error && <p role="alert" className="error-note">{error}</p>}

    {step === 'file' && <>
      <SegmentedControl label="불러올 성적" value={kind} onChange={setKind} options={[{ value: 'mock', label: '모의고사 등급' }, { value: 'school', label: '내신 학기 평균' }]} />
      {kind === 'mock' ? <div className="form-grid">
        <label>연도<input type="number" min={2024} max={2035} value={year} onChange={e => setYear(Number(e.target.value))} /></label>
        <label>월<select value={month} onChange={e => setMonth(Number(e.target.value))}>{MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}</select></label>
        <SegmentedControl label="종류" value={examKind} onChange={setExamKind} options={EXAM_KINDS.map(k => ({ value: k, label: k }))} />
      </div> : <p className="t-body-sm text-muted">학기별 5등급 평균(1-1~3-2)을 불러와요. 빈 학기는 그대로 둬요.</p>}
      <p className="t-caption text-muted">{kind === 'mock' ? '영역 등급(국어·수학·영어·한국사·탐구1·탐구2)을 불러와요. 원점수·백분위는 아직 받지 않아요.' : '반영하면 같은 학기 값은 새 값으로 바뀌어요.'}</p>
      <label className="drop-zone"><span>성적 파일(xlsx·csv)을 골라 주세요 · 첫 줄은 머리글</span><span className="button-outline">파일 고르기</span>
        <input type="file" accept=".xlsx,.csv" className="sr-only" aria-label="성적 파일 고르기" onChange={e => { read(e.target.files?.[0]); e.target.value = ''; }} /></label>
      <ButtonOutline onClick={template}>번호·별칭을 채운 양식 내려받기</ButtonOutline>
    </>}

    {step === 'map' && <>
      <p className="t-body-sm">{fileName} · {rows.length - 1}행 · 열 {header.length}개</p>
      <div className="form-grid">{['번호', '별칭', ...FIELDS[kind]].map(f => <label key={f}>{f}<select value={map[f] ?? -1} onChange={e => setMap({ ...map, [f]: Number(e.target.value) })}>
        <option value={-1}>{f === '별칭' ? '없음(번호로만 맞춰요)' : '없음'}</option>{header.map((h, i) => <option key={i} value={i}>{String(h) || `${i + 1}번째 열`}</option>)}</select></label>)}</div>
      <div className="toolbar"><ButtonOutline onClick={() => setStep('file')}>다른 파일 올리기</ButtonOutline><ButtonPrimary disabled={map.번호 < 0} onClick={() => setStep('check')}>검증하기</ButtonPrimary></div>
    </>}

    {step === 'check' && <>
      <p className="t-body-sm">{kind === 'mock' ? exam : '내신 학기 평균'} · {fileName}</p>
      {already > 0 && <p className="t-caption text-muted">{exam}은 이미 {already}명 반영돼 있어요. 다시 반영하면 새 값이 쓰여요.</p>}
      <div className="stats">
        <div><span className="t-caption">파일 행</span><strong className="num">{checked.length}행</strong></div>
        <div><span className="t-caption">반영 예정</span><strong className="num key-number">{ready.length}명</strong></div>
        <div><span className="t-caption"><span className="judge-reach-text">▲ 확인 필요</span></span><strong className="num">{warn.length}행</strong></div>
        <div><span className="t-caption"><span className="judge-risk-text">■ 오류</span></span><strong className="num">{errors.length}행</strong></div>
      </div>
      {(warn.length > 0 || errors.length > 0) && <div className="warning-callout"><strong>▲ {blocking ? `번호·별칭이 명단과 다른 행이 ${blocking}개 있어요. 고쳐서 다시 올려야 반영돼요` : `확인할 행이 ${warn.length + errors.length}개 있어요`}</strong>
        {!blocking && errors.length > 0 && <p className="t-body-sm">■ 범위 오류 {errors.length}행은 빼고 반영해요</p>}
        {warn.length > 0 && <p className="t-body-sm">▲ {kind === 'mock' ? `빈 칸 ${warn.length}행은 결시로 반영돼요` : `값이 없는 ${warn.length}행은 반영하지 않아요`}</p>}</div>}
      <div className="section-row"><SegmentedControl label="거르기" value={filter} onChange={setFilter} options={[{ value: 'all', label: `전체 ${checked.length}` }, { value: 'warn', label: `확인 필요 ${warn.length}` }, { value: 'error', label: `오류 ${errors.length}` }]} />
        <span className="t-caption text-muted">확인 필요·오류 행을 위로 모았어요</span></div>
      <CheckTable rows={checked.filter(r => filter === 'all' || (filter === 'warn' ? r.status === '확인 필요' : r.status === '오류'))} kind={kind} students={students} />
      <div className="toolbar"><ButtonOutline onClick={() => setStep('map')}>열 맞추기로 돌아가기</ButtonOutline>{errors.length > 0 && <ButtonOutline onClick={errorCsv}>오류 행만 내려받기</ButtonOutline>}
        <span className="t-caption text-muted">학급 데이터는 이 기기에만 저장돼요</span>
        <ButtonPrimary disabled={!ready.length} onClick={apply}>{ready.length}명 반영하기</ButtonPrimary></div>
    </>}

    {step === 'done' && <div className="empty-state"><h3 className="t-heading-3">{applied}명을 반영했어요</h3><p>{kind === 'mock' ? exam : '내신 학기 평균'} · 우리 반 홈과 학생 기록에서 볼 수 있어요.</p>
      <div className="toolbar"><Link className="button-outline" to="/teacher/teacher-dashboard">우리 반 홈 ›</Link><ButtonOutline onClick={() => { setStep('file'); setRows([]); }}>다른 성적 불러오기</ButtonOutline></div></div>}
  </>;
}

function CheckTable({ rows, kind, students }: { rows: CheckedRow[]; kind: ImportKind; students: readonly Student[] }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>번호</th><th>별칭</th>{FIELDS[kind].map(f => <th key={f} className="num">{f}</th>)}<th>상태</th><th>사유</th></tr></thead>
    <tbody>{rows.map(r => <tr key={r.line}><td className="num">{r.number ?? '–'}</td><td>{r.alias || students.find(s => s.number === r.number)?.alias || '–'}</td>
      {FIELDS[kind].map(f => { const isBad = r.bad.some(b => b.startsWith(`${f} `)), isBlank = r.blank.includes(f);
        return <td key={f} className={`num${isBad ? ' cell-risk' : isBlank && kind === 'mock' ? ' cell-reach' : ''}`}>{isBad ? r.bad.find(b => b.startsWith(`${f} `))!.slice(f.length + 1) : r.values[f] ?? '–'}</td>; })}
      <td><span className={`judge-badge ${STATUS_CLASS[r.status]}`}>{STATUS_ICON[r.status]} {r.status}</span></td><td className="t-body-sm">{r.reason}</td></tr>)}</tbody></table></div>;
}
