import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { ScreenActions } from '../components/ScreenActions';
import { useDesktop } from '../components/TeacherBoard';
import { adminDb } from '../store/adminDb';
import { setAdminName, useAdminName } from '../store/adminName';
import { downloadFile } from '../io/backup';
import { dataAsOf } from '../data/catalog';
import { useReleasedResults } from '../data/releasedResults';
import { useUnivWiki } from '../data/univWiki';
import { approveFields, buildWikiFile, editRows, emptyFieldDraft, fieldProblems, fieldRecordFile, fieldStatus, mergeFieldDraft, missingRows, parseFieldCsv, type FieldDraft } from '../domain/fieldReview';
import type { FieldRow } from '../domain/univWiki';
import { StatusBadge } from './AdminReview';
import '../styles/admin.css';

const PAGE = 50;
const at = (iso: string) => iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16) : '';
const FileButton = ({ icon, accept, label, children, onFile }: { icon?: string; accept: string; label: string; children: ReactNode; onFile: (f: File) => void }) =>
  <label className="button-outline file-button">{icon && <Icon name={icon} size={20} />}{children}
    <input type="file" accept={accept} className="sr-only" aria-label={label} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} /></label>;

/** 학과 계열표(소계열·중계열) 검수. 2명이 승인한 표만 univ-wiki.json의 fields로 내보낸다. */
export function AdminFields() {
  const units = useReleasedResults(), wiki = useUnivWiki(), desktop = useDesktop();
  const stored = useLiveQuery(() => adminDb.fields.get('current'), []);
  // 이 기기에 기록이 없으면 지금 공개 중인 계열표에서 시작한다(승인은 새로 받는다)
  const draft: FieldDraft = stored ?? { ...emptyFieldDraft(), rows: wiki?.fields ?? [] };
  const reviewer = useAdminName(), [query, setQuery] = useState(''), [page, setPage] = useState(0);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [head, setHead] = useState<Element | null>(null);
  useEffect(() => { setHead(desktop ? document.querySelector('.topbar__heading') : null); }, [desktop]);
  const run = async (action: () => Promise<string | void> | string | void) => {
    setError(''); setMessage('');
    try { setMessage((await action()) || ''); } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요.'); }
  };
  const save = (d: FieldDraft) => adminDb.fields.put(d);
  const setRows = (rows: FieldRow[]) => save(editRows(draft, rows));
  const status = fieldStatus(draft), problems = fieldProblems(draft.rows), missing = units && !draft.sample ? missingRows(units, draft.rows) : [];
  // 샘플 계열표는 186행 중 10행만 보여 주는 예시라 공개 입결과 견주지 않아요(빠진 학과 0, 시안 S-one)
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

  const lead = <>모집단위마다 소계열·중계열·대계열을 정해요. ‘입결이 비슷한 대학’이 이 표로 같은 계열·관련 계열을 골라요.</>;
  const exportButton = <button type="button" className={status === '검수 완료' ? 'button-primary' : 'button-outline'} disabled={status !== '검수 완료'} onClick={exportWiki}>공개 파일 내보내기</button>;
  const addMissing = <ButtonOutline disabled={!missing.length} onClick={() => run(async () => { await setRows([...draft.rows, ...missing]); return `공개 입결에서 학과 ${missing.length}개를 추가했어요. 계열 칸을 채워 주세요.`; })}>
    {`${desktop ? '공개 입결에서 빠진 학과 추가' : '빠진 학과 추가'} ${missing.length}`}</ButtonOutline>;
  const exportRecord = <ButtonOutline disabled={!draft.rows.length} onClick={() => downloadFile(JSON.stringify(fieldRecordFile(draft), null, 1), 'field-review.json', 'application/json')}><Icon name="download" size={20} />{desktop ? '검수 기록 내보내기' : '기록 내보내기'}</ButtonOutline>;
  const csv = <FileButton icon="upload" accept=".csv,text/csv" label="계열표 CSV 파일 고르기" onFile={loadCsv}>CSV 파일 고르기</FileButton>;
  const record = <FileButton icon="upload" accept=".json,application/json" label="검수 기록 파일 고르기" onFile={importRecord}>{desktop ? '검수 기록 파일 고르기' : '기록 파일 고르기'}</FileButton>;
  const nameInput = <input aria-label="검수자 이름" value={reviewer} onChange={e => setAdminName(e.target.value)} placeholder="예: 관리자 A" />;
  const approvers = <p className="af-cap">{draft.approvals.map(a => `승인 ${a.reviewer}${a.at ? ` · ${at(a.at)}` : ''}`).join(' · ') || '아직 승인 없음'}</p>;
  // 내가 이미 승인한 표는 다른 검수자가 확인해요(2인 검수) → 버튼은 꺼 두고 이유를 한 줄로
  const approve = status !== '검수 완료' && <ButtonPrimary disabled={mine || !!problems.length || !draft.rows.length} title={mine ? '내가 승인한 표예요. 다른 검수자가 확인해요.' : undefined}
    onClick={() => run(async () => { await save(approveFields(draft, reviewer)); return '승인했어요.'; })}>표 전체 승인</ButtonPrimary>;
  const notes = <>
    {mine && <p className="af-cap">내가 승인한 표예요. 다른 검수자가 확인해요(검수자 2명이 서로 달라야 해요).</p>}
    {!!problems.length && draft.rows.length > 0 && <details className="error-note"><summary>승인 전에 고칠 곳 {problems.length}개</summary><ul>{problems.slice(0, 20).map(p => <li key={p}>{p}</li>)}</ul></details>}
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status" className="toast">{message}</p>}</>;
  const table = !draft.rows.length ? <div className="empty-state"><h3 className="t-heading-3">계열표가 비어 있어요</h3>
    <p>CSV를 불러오거나 ‘공개 입결에서 빠진 학과 추가’로 학과를 넣은 뒤 계열을 채워 주세요.</p></div> : <>
    <label className="af-search"><Icon name="search" size={20} /><input aria-label="대학·학과로 찾기" placeholder="대학·학과로 찾기" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
    <div className="table-scroll af-table"><table className="data-table">
      <thead><tr><th>대학</th><th>모집단위</th><th>소계열</th><th>중계열</th><th>대계열</th><th>삭제</th></tr></thead>
      <tbody>{shown.slice(page * PAGE, page * PAGE + PAGE).map(({ r, i }) => <tr key={`${i}|${r.university}|${r.unit}|${r.small}|${r.mid}|${r.major ?? ''}`}>
        <td>{r.university}</td><td>{r.unit}</td>
        <td><input aria-label={`${r.university} ${r.unit} 소계열`} defaultValue={r.small} onBlur={e => e.target.value !== r.small && update(i, { small: e.target.value })} placeholder="예: 행정학" /></td>
        <td><input aria-label={`${r.university} ${r.unit} 중계열`} defaultValue={r.mid} onBlur={e => e.target.value !== r.mid && update(i, { mid: e.target.value })} placeholder="예: 사회과학" /></td>
        <td className="af-selcell"><span className="af-select"><select aria-label={`${r.university} ${r.unit} 대계열`} value={r.major ?? ''} onChange={e => update(i, { major: e.target.value || undefined })}>
          <option value="">비움</option><option value="인문">인문</option><option value="자연">자연</option>
          {r.major && r.major !== '인문' && r.major !== '자연' && <option value={r.major}>{r.major}(고쳐 주세요)</option>}</select><Icon name="chevron-down" size={20} /></span></td>
        <td><button type="button" className="button-danger-text" aria-label={`${r.university} ${r.unit} 삭제`} onClick={() => setRows(draft.rows.filter((_, k) => k !== i))}>삭제</button></td></tr>)}</tbody>
    </table></div>
    {shown.length > 0 && <div className="af-pages"><ButtonOutline disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</ButtonOutline>
      <span className="num">{page + 1} / {Math.ceil(shown.length / PAGE)}</span>
      <ButtonOutline disabled={(page + 1) * PAGE >= shown.length} onClick={() => setPage(p => p + 1)}>다음</ButtonOutline></div>}
  </>;
  const disclaimer = <p className="disclaimer-note"><Icon name="info" size={16} /><span>계열은 대학 공식 모집단위 안내를 기준으로 정해요 · 이 표는 입결이 비슷한 대학을 고를 때만 써요</span></p>;
  const csvHint = '대학,모집단위,소계열,중계열,대계열';

  if (!desktop) return <section className="af af--mobile" data-slug="admin-rules" aria-label="학과 계열표 검수">
    <div className="screen-heading"><h2>학과 계열표 검수</h2><p className="af-lead">모집단위마다 소계열·중계열·대계열을 정해요.<br />‘입결이 비슷한 대학’이 이 표로<br />같은 계열·관련 계열을 골라요.</p></div>
    <div className="af-card"><div className="af-titlerow"><h3>계열표 <span>{draft.rows.length}행</span></h3><StatusBadge status={status} /></div>{approvers}
      <p className="af-band"><Icon name="info" size={24} /><span>표 전체를 검수자 2명이 승인해야<br />공개돼요 · 한 칸이라도 고치면<br />승인이 지워지고 다시 검수해요</span></p>{approve}{notes}</div>
    <div className="af-card af-card--tight"><label className="af-field"><span>검수자 이름</span>{nameInput}</label><p className="af-cap">이 기기에 기억해요</p></div>
    <div className="af-card af-card--tight"><p className="af-label">파일</p><div className="af-files">{csv}{record}{addMissing}{exportRecord}{exportButton}</div>
      <p className="af-cap">CSV 첫 줄: {csvHint} · 모집단위 이름은 공개 입결과 똑같이 적어요</p></div>
    <div className="af-card af-card--table">{table}</div>
    {disclaimer}
  </section>;

  return <section className="af" data-slug="admin-rules" aria-label="학과 계열표 검수">
    {head && createPortal(<><h1 className="af-title">학과 계열표 검수</h1><p className="af-toplead">{lead}</p></>, head)}
    <ScreenActions><span className="data-status-badge topbar__asof">데이터 기준일 {dataAsOf}</span>{exportButton}</ScreenActions>
    <div className="af-card">
      <p className="af-band"><Icon name="info" size={24} /><span>표 전체를 검수자 2명이 승인해야 공개돼요 · 한 칸이라도 고치면 승인이 지워지고 다시 검수해요</span></p>
      <div className="af-grid">
        <div className="af-field"><label htmlFor="af-name">검수자 이름</label><input id="af-name" value={reviewer} onChange={e => setAdminName(e.target.value)} placeholder="예: 관리자 A" /><p className="af-cap">이 기기에 기억해요</p></div>
        <div className="af-field"><span>계열표 CSV 불러오기</span>{csv}<p className="af-cap" title="대계열 열은 없어도 돼요 · 모집단위 이름은 공개 입결과 똑같이 적어요">CSV 첫 줄: {csvHint}</p></div>
        <div className="af-field"><span>검수 기록 가져오기</span>{record}<p className="af-cap">다른 검수자가 내보낸 field-review.json</p></div>
      </div>
      <div className="af-tools">{addMissing}{exportRecord}</div>
    </div>
    <div className="af-card">
      <div className="af-tablehead"><div><h3>계열표 <span>{draft.rows.length}행</span></h3>{approvers}</div><div className="af-approve">{approve}<StatusBadge status={status} /></div></div>
      {notes}{table}
    </div>
    {disclaimer}
  </section>;
}
