import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { CollectedResultPicker } from '../components/CollectedResultPicker';
import { adminDb } from '../store/adminDb';
import { downloadFile } from '../io/backup';
import { approve, buildRelease, emptyRecord, groupUnits, mergeRecord, parseRecords, parseResultCsv, reject, reviewStatus, setLicense, httpsUrl,
  type ReviewRecord, type ReviewStatus, type ReviewUnit } from '../domain/resultReview';

const FILTERS: ('전체' | ReviewStatus)[] = ['전체', '검수 대기', '1인 승인', '반려', '검수 완료'];
const PAGE = 50;
const LICENSE = { unknown: '이용 조건 미확인', allowed: '이용 허용', denied: '이용 불가' } as const;
function loadName() { try { return localStorage.getItem('jinhak-navi-reviewer') ?? ''; } catch { return ''; } }
function saveName(v: string) { try { localStorage.setItem('jinhak-navi-reviewer', v); } catch { /* per-viewer convenience only */ } }

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return status === '검수 완료' ? <span className="judge-badge judge-safe">● 검수 완료</span> : <span className="data-status-badge">{status}</span>;
}

export function AdminReview() {
  const [units, setUnits] = useState<ReviewUnit[]>([]), [fileName, setFileName] = useState('');
  const [reviewer, setReviewer] = useState(loadName), [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체'), [query, setQuery] = useState('');
  const [page, setPage] = useState(0), [openKey, setOpenKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const list = useLiveQuery(() => adminDb.reviews.toArray(), []);
  const records = useMemo(() => new Map((list ?? []).map(r => [r.key, r])), [list]);
  const run = async (action: () => Promise<string | void>) => {
    setBusy(true); setError(''); setMessage('');
    try { setMessage((await action()) || ''); } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요.'); } finally { setBusy(false); }
  };
  const counts = useMemo(() => {
    const c: Record<string, number> = { 전체: units.length };
    for (const u of units) { const s = reviewStatus(records.get(u.key)); c[s] = (c[s] ?? 0) + 1; }
    return c;
  }, [units, records]);
  const shown = units.filter(u => (filter === '전체' || reviewStatus(records.get(u.key)) === filter) && (!query.trim() || u.university.includes(query.trim())));
  const opened = units.find(u => u.key === openKey);

  const loadCsv = (file: File) => run(async () => {
    const rows = parseResultCsv(await file.text()), grouped = groupUnits(rows);
    setUnits(grouped); setFileName(file.name); setPage(0);
    return `${rows.length.toLocaleString()}행, 원문 ${grouped.length.toLocaleString()}건을 불러왔어요.`;
  });
  const importRecords = (file: File) => run(async () => {
    const incoming = parseRecords(JSON.parse(await file.text()));
    await adminDb.transaction('rw', adminDb.reviews, async () => {
      for (const r of incoming) await adminDb.reviews.put(mergeRecord(await adminDb.reviews.get(r.key), r));
    });
    return `검수 기록 ${incoming.length}건을 합쳤어요.`;
  });
  const exportRecords = () => downloadFile(JSON.stringify({ format: 'jinhak-navi-review-records', records: list ?? [] }, null, 1), 'review-records.json', 'application/json');
  const exportRelease = () => run(async () => {
    const file = buildRelease(units, records);
    downloadFile(JSON.stringify(file), 'released-results.json', 'application/json');
    return `공개 가능한 원문 ${file.units.length}건을 내보냈어요. app/public/data/released-results.json에 넣고 배포해요.`;
  });

  return <section className="student-screen admin-review" data-slug="admin-rules">
    <div className="screen-heading"><div><p className="t-caption text-muted">규칙 관리 › 검수</p><h2 className="t-heading-1">입결 자료 검수</h2>
      <p className="text-muted">수집한 입결 CSV를 원문 단위로 대조하고 승인해요.</p></div>
      <ButtonPrimary disabled={busy || !units.length} onClick={exportRelease}>공개 자료 내보내기</ButtonPrimary></div>
    <p className="notice">ⓘ 2명이 승인하고 이용 허용을 확인한 자료만 ‘검수 완료 입결’에 표시해요 · 수집본은 ‘검수 전 참고자료’로 별도 조회하며 성적 판정에는 사용하지 않아요</p>
    <CollectedResultPicker busy={busy} onLoad={(rows, label) => {
      const grouped = groupUnits(rows);
      setUnits(grouped); setFileName(label); setPage(0); setFilter('전체'); setQuery(''); setOpenKey(null); setError('');
      setMessage(`${rows.length.toLocaleString()}행, 원문 ${grouped.length.toLocaleString()}건을 불러왔어요.`);
    }} />
    <div className="form-grid filter-panel">
      <label>검수자 이름<input value={reviewer} onChange={e => { setReviewer(e.target.value); saveName(e.target.value); }} placeholder="예: 관리자 A" /></label>
      <label>입결 CSV 불러오기<input type="file" accept=".csv,text/csv" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) loadCsv(f); e.target.value = ''; }} /></label>
      <label>검수 기록 가져오기<input type="file" accept=".json,application/json" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) importRecords(f); e.target.value = ''; }} /></label>
    </div>
    <div className="toolbar"><ButtonOutline disabled={!list?.length} onClick={exportRecords}>검수 기록 내보내기</ButtonOutline>
      {fileName && <span className="t-caption text-muted">불러온 파일: {fileName}</span>}</div>
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}
    {busy && <p role="status">처리하고 있어요.</p>}
    {!units.length ? <div className="empty-state"><h3 className="t-heading-3">검수할 입결 파일을 불러와 주세요</h3>
      <p>work/_data/admission-results의 _all.csv 또는 대학별 CSV를 고르면 원문(대학·학년도·출처 주소) 단위로 묶어 보여 줘요. 파일은 이 기기 밖으로 보내지 않아요.</p></div> : <>
      <div className="toolbar">
        <input aria-label="대학 이름으로 찾기" placeholder="대학 이름으로 찾기" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} />
        <SegmentedControl label="검수 상태" value={filter} onChange={v => { setFilter(v); setPage(0); }} options={FILTERS.map(f => ({ value: f, label: `${f} ${counts[f] ?? 0}` }))} />
      </div>
      {!shown.length ? <p className="text-muted">조건에 맞는 자료가 없어요.</p> : <div className="table-scroll"><table className="data-table">
        <thead><tr><th>대학</th><th>학년도</th><th className="num">행</th><th>확인 필요</th><th>상태</th><th>이용 조건</th><th>원문</th></tr></thead>
        <tbody>{shown.slice(page * PAGE, page * PAGE + PAGE).map(u => { const rec = records.get(u.key); return <tr key={u.key}>
          <td><button className="text-button" onClick={() => setOpenKey(u.key)}>{u.university}</button></td><td className="num">{u.year}</td><td className="num">{u.rows.length}</td>
          <td>{u.errors.length ? `오류 ${u.errors.length}` : u.warnings.length ? `주의 ${u.warnings.length}` : '없음'}</td>
          <td><StatusBadge status={reviewStatus(rec)} /></td><td>{LICENSE[rec?.license ?? 'unknown']}</td>
          <td>{httpsUrl(u.source_url) ? <a className="t-link" href={u.source_url} target="_blank" rel="noreferrer">원문 ↗</a> : '링크 오류'}</td></tr>; })}</tbody>
      </table></div>}
      {shown.length > PAGE && <div className="toolbar"><ButtonOutline disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</ButtonOutline>
        <span className="num">{page + 1} / {Math.ceil(shown.length / PAGE)}</span>
        <ButtonOutline disabled={(page + 1) * PAGE >= shown.length} onClick={() => setPage(p => p + 1)}>다음</ButtonOutline></div>}
    </>}
    <p className="disclaimer-note">ⓘ 대학 공식 발표 자료가 최종 기준이에요 · 사설 사이트 수치는 받지 않아요</p>
    {opened && <ReviewDetail unit={opened} record={records.get(opened.key) ?? emptyRecord(opened.key)} reviewer={reviewer} onClose={() => setOpenKey(null)} />}
  </section>;
}

function ReviewDetail({ unit, record, reviewer, onClose }: { unit: ReviewUnit; record: ReviewRecord; reviewer: string; onClose: () => void }) {
  const [mode, setMode] = useState<'view' | 'reject'>('view'), [reason, setReason] = useState(''), [error, setError] = useState('');
  const status = reviewStatus(record), mine = record.approvals.some(a => a.reviewer === reviewer.trim());
  const save = async (next: () => ReviewRecord, close = false) => {
    setError('');
    try { await adminDb.reviews.put(next()); if (close) onClose(); } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
  };
  return <Modal wide label={`${unit.university} ${unit.year} 검수`} onClose={onClose}>
    <div className="section-row"><div><h3 className="t-heading-3">{unit.university} · {unit.year}학년도</h3>
      <p className="t-caption text-muted">{unit.rows.length}행 · {record.approvals.map(a => `승인 ${a.reviewer}`).join(' · ') || '아직 승인 없음'}</p></div><StatusBadge status={status} /></div>
    {httpsUrl(unit.source_url) ? <a className="t-link" href={unit.source_url} target="_blank" rel="noreferrer">원문 보기 ↗</a>
      : <p className="error-note">원문 주소 확인 필요: {unit.source_url}</p>}
    {record.rejection && <p className="notice">반려 사유 · {record.rejection.reviewer}: {record.rejection.reason}</p>}
    {!!unit.errors.length && <div role="alert" className="error-note"><strong>오류 {unit.errors.length}개 · 승인할 수 없어요</strong><ul>{unit.errors.slice(0, 10).map(e => <li key={e}>{e}</li>)}</ul></div>}
    {!!unit.warnings.length && <details><summary>주의 {unit.warnings.length}개</summary><ul>{unit.warnings.slice(0, 30).map(w => <li key={w}>{w}</li>)}</ul></details>}
    <div className="table-scroll" style={{ maxHeight: 320 }}><table className="data-table">
      <thead><tr><th>구분</th><th>전형</th><th>모집단위</th><th className="num">인원</th><th className="num">경쟁률</th><th className="num">50%</th><th className="num">70%</th><th>지표</th><th>쪽</th></tr></thead>
      <tbody>{unit.rows.slice(0, 300).map((r, i) => <tr key={i}><td>{r.round}</td><td>{r.program}</td><td>{r.recruit_unit}</td><td className="num">{r.quota}</td><td className="num">{r.competition_rate}</td>
        <td className="num">{r.cut_50}</td><td className="num">{r.cut_70}</td><td>{r.metric}</td><td>{r.source_page}</td></tr>)}</tbody></table></div>
    {unit.rows.length > 300 && <p className="t-caption text-muted">앞 300행만 보여요. 나머지는 CSV에서 확인해 주세요.</p>}
    <SegmentedControl label="이용 조건" value={record.license} onChange={v => save(() => setLicense(record, v, reviewer))} options={(['unknown', 'allowed', 'denied'] as const).map(v => ({ value: v, label: LICENSE[v] }))} />
    {mode === 'reject' ? <>
      <label>반려 사유(필수)<textarea maxLength={200} rows={4} value={reason} onChange={e => setReason(e.target.value)} placeholder="무엇을 어떻게 고치면 되는지 적어 주세요." /></label>
      <p className="t-caption text-muted num">{reason.length}/200</p>
      {error && <p role="alert" className="error-note">{error}</p>}
      <div className="toolbar"><ButtonOutline onClick={() => setMode('view')}>취소</ButtonOutline><ButtonPrimary onClick={() => save(() => reject(record, reviewer, reason), true)}>반려하기</ButtonPrimary></div>
    </> : <>
      {error && <p role="alert" className="error-note">{error}</p>}
      {mine ? <p className="notice">ⓘ 내가 승인한 자료예요. 다른 검수자가 확인해요(검수자 2명이 서로 달라야 해요).</p>
        : <div className="toolbar"><ButtonOutline onClick={onClose}>닫기</ButtonOutline><ButtonOutline onClick={() => setMode('reject')}>반려</ButtonOutline>
          <ButtonPrimary disabled={!!unit.errors.length || status === '검수 완료'} onClick={() => save(() => approve(unit, record, reviewer), true)}>승인</ButtonPrimary></div>}
    </>}
  </Modal>;
}
