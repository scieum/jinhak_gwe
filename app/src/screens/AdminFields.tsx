import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { adminDb } from '../store/adminDb';
import { downloadFile } from '../io/backup';
import { useReleasedResults } from '../data/releasedResults';
import { useUnivWiki } from '../data/univWiki';
import { approveFields, buildWikiFile, editRows, emptyFieldDraft, fieldProblems, fieldRecordFile, fieldStatus, mergeFieldDraft, missingRows, parseFieldCsv, type FieldDraft } from '../domain/fieldReview';
import type { FieldRow } from '../domain/univWiki';
import { StatusBadge } from './AdminReview';

const PAGE = 50;
function loadName() { try { return localStorage.getItem('jinhak-navi-reviewer') ?? ''; } catch { return ''; } }
function saveName(v: string) { try { localStorage.setItem('jinhak-navi-reviewer', v); } catch { /* per-viewer convenience only */ } }

/** 학과 계열표(소계열·중계열) 검수. 2명이 승인한 표만 univ-wiki.json의 fields로 내보낸다. */
export function AdminFields() {
  const units = useReleasedResults(), wiki = useUnivWiki();
  const stored = useLiveQuery(() => adminDb.fields.get('current'), []);
  // 이 기기에 기록이 없으면 지금 공개 중인 계열표에서 시작한다(승인은 새로 받는다)
  const draft: FieldDraft = stored ?? { ...emptyFieldDraft(), rows: wiki?.fields ?? [] };
  const [reviewer, setReviewer] = useState(loadName), [query, setQuery] = useState(''), [page, setPage] = useState(0);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const run = async (action: () => Promise<string | void> | string | void) => {
    setError(''); setMessage('');
    try { setMessage((await action()) || ''); } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요.'); }
  };
  const save = (d: FieldDraft) => adminDb.fields.put(d);
  const setRows = (rows: FieldRow[]) => save(editRows(draft, rows));
  const status = fieldStatus(draft), problems = fieldProblems(draft.rows), missing = units ? missingRows(units, draft.rows) : [];
  const mine = draft.approvals.some(a => a.reviewer === reviewer.trim());
  const shown = draft.rows.map((r, i) => ({ r, i })).filter(({ r }) => !query.trim() || `${r.university} ${r.unit}`.includes(query.trim()));
  const update = (i: number, patch: Partial<FieldRow>) => setRows(draft.rows.map((r, k) => k === i ? { ...r, ...patch } : r));

  const loadCsv = (file: File) => run(async () => {
    const rows = parseFieldCsv(await file.text());
    if (draft.rows.length && !window.confirm(`지금 계열표 ${draft.rows.length}행을 CSV ${rows.length}행으로 바꿀까요? 승인도 지워져요.`)) return;
    await setRows(rows); setPage(0);
    return `CSV에서 ${rows.length}행을 불러왔어요. 검수자 2명이 다시 승인해야 해요.`;
  });
  const importRecord = (file: File) => run(async () => {
    const incoming = JSON.parse(await file.text()), merged = mergeFieldDraft(draft, incoming);
    if (merged) { await save(merged); return `검수 기록을 합쳤어요 · 승인 ${merged.approvals.length}명`; }
    if (!window.confirm('가져온 계열표가 이 기기 계열표와 달라요. 가져온 파일로 바꿀까요? 이 기기에서 고친 내용은 사라져요.')) return;
    const replaced = mergeFieldDraft(emptyFieldDraft(), incoming)!;
    await save(replaced);
    return `가져온 계열표 ${replaced.rows.length}행으로 바꿨어요.`;
  });
  const exportWiki = () => run(async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/univ-wiki.json`);
    const file = buildWikiFile(res.ok ? await res.json() : null, draft);
    downloadFile(JSON.stringify(file), 'univ-wiki.json', 'application/json');
    return `계열표 ${file.fields.rows.length}행을 내보냈어요. app/public/data/univ-wiki.json에 넣고 배포해요.`;
  });

  return <section className="student-screen admin-review" data-slug="admin-rules">
    <div className="screen-heading"><div><p className="t-caption text-muted">규칙 관리 › 계열표</p><h2 className="t-heading-1">학과 계열표 검수</h2>
      <p className="text-muted">모집단위마다 소계열·중계열·대계열을 정해요. ‘입결이 비슷한 대학’이 이 표로 같은 계열·관련 계열을 골라요.</p></div>
      <button type="button" className={status === '검수 완료' ? 'button-primary' : 'button-outline'} disabled={status !== '검수 완료'} onClick={exportWiki}>공개 파일 내보내기</button></div>
    <p className="notice">ⓘ 표 전체를 검수자 2명이 승인해야 공개돼요 · 한 칸이라도 고치면 승인이 지워지고 다시 검수해요</p>
    <div className="form-grid filter-panel">
      <label>검수자 이름<input value={reviewer} onChange={e => { setReviewer(e.target.value); saveName(e.target.value); }} placeholder="예: 관리자 A" /></label>
      <label>계열표 CSV 불러오기<input type="file" accept=".csv,text/csv" onChange={e => { const f = e.target.files?.[0]; if (f) loadCsv(f); e.target.value = ''; }} /></label>
      <label>검수 기록 가져오기<input type="file" accept=".json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f) importRecord(f); e.target.value = ''; }} /></label>
    </div>
    <p className="t-caption text-muted">CSV 첫 줄: 대학,모집단위,소계열,중계열,대계열(대계열 열은 없어도 돼요) · 모집단위 이름은 공개 입결과 똑같이 적어요</p>
    <div className="toolbar">
      <ButtonOutline disabled={!missing.length} onClick={() => run(async () => { await setRows([...draft.rows, ...missing]); return `공개 입결에서 학과 ${missing.length}개를 추가했어요. 계열 칸을 채워 주세요.`; })}>
        공개 입결에서 빠진 학과 추가 {missing.length}</ButtonOutline>
      <ButtonOutline disabled={!draft.rows.length} onClick={() => downloadFile(JSON.stringify(fieldRecordFile(draft), null, 1), 'field-review.json', 'application/json')}>검수 기록 내보내기</ButtonOutline>
    </div>
    <div className="section-row"><div><h3 className="t-heading-2">계열표 <span className="t-caption text-muted">{draft.rows.length}행</span></h3>
      <p className="t-caption text-muted">{draft.approvals.map(a => `승인 ${a.reviewer}`).join(' · ') || '아직 승인 없음'}</p></div><StatusBadge status={status} /></div>
    {!!problems.length && draft.rows.length > 0 && <details className="error-note"><summary>승인 전에 고칠 곳 {problems.length}개</summary><ul>{problems.slice(0, 20).map(p => <li key={p}>{p}</li>)}</ul></details>}
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}
    {mine ? <p className="notice">ⓘ 내가 승인한 표예요. 다른 검수자가 확인해요(검수자 2명이 서로 달라야 해요).</p>
      : status !== '검수 완료' && <div className="toolbar"><ButtonPrimary disabled={!!problems.length || !draft.rows.length} onClick={() => run(async () => { await save(approveFields(draft, reviewer)); return '승인했어요.'; })}>표 전체 승인</ButtonPrimary></div>}
    {!draft.rows.length ? <div className="empty-state"><h3 className="t-heading-3">계열표가 비어 있어요</h3>
      <p>CSV를 불러오거나 ‘공개 입결에서 빠진 학과 추가’로 학과를 넣은 뒤 계열을 채워 주세요.</p></div> : <>
      <input aria-label="대학·학과로 찾기" placeholder="대학·학과로 찾기" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} />
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>대학</th><th>모집단위</th><th>소계열</th><th>중계열</th><th>대계열</th><th><span className="sr-only">삭제</span></th></tr></thead>
        <tbody>{shown.slice(page * PAGE, page * PAGE + PAGE).map(({ r, i }) => <tr key={`${i}|${r.university}|${r.unit}|${r.small}|${r.mid}|${r.major ?? ''}`}>
          <td>{r.university}</td><td>{r.unit}</td>
          <td><input aria-label={`${r.university} ${r.unit} 소계열`} defaultValue={r.small} onBlur={e => e.target.value !== r.small && update(i, { small: e.target.value })} placeholder="예: 행정학" /></td>
          <td><input aria-label={`${r.university} ${r.unit} 중계열`} defaultValue={r.mid} onBlur={e => e.target.value !== r.mid && update(i, { mid: e.target.value })} placeholder="예: 사회과학" /></td>
          <td><select aria-label={`${r.university} ${r.unit} 대계열`} value={r.major ?? ''} onChange={e => update(i, { major: e.target.value || undefined })}>
            <option value="">비움</option><option value="인문">인문</option><option value="자연">자연</option>
            {r.major && r.major !== '인문' && r.major !== '자연' && <option value={r.major}>{r.major}(고쳐 주세요)</option>}</select></td>
          <td><button className="text-button" aria-label={`${r.university} ${r.unit} 삭제`} onClick={() => setRows(draft.rows.filter((_, k) => k !== i))}>삭제</button></td></tr>)}</tbody>
      </table></div>
      {shown.length > PAGE && <div className="toolbar"><ButtonOutline disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</ButtonOutline>
        <span className="num">{page + 1} / {Math.ceil(shown.length / PAGE)}</span>
        <ButtonOutline disabled={(page + 1) * PAGE >= shown.length} onClick={() => setPage(p => p + 1)}>다음</ButtonOutline></div>}
    </>}
    <p className="disclaimer-note">ⓘ 계열은 대학 공식 모집단위 안내를 기준으로 정해요 · 이 표는 입결이 비슷한 대학을 고를 때만 써요</p>
  </section>;
}
