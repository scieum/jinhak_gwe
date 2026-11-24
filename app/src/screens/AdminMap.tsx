import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { adminDb } from '../store/adminDb';
import { downloadFile } from '../io/backup';
import { SIDO } from '../domain/auth';
import { FOUNDINGS, KINDS } from '../domain/univMap';
import { approveMap, buildMapFile, editMap, mapProblems, mapRecordFile, mapStatus, mergeMapRecords, parseMapDraft, type MapDraft, type MapFields } from '../domain/mapReview';
import type { FieldStatus } from '../domain/fieldReview';
import { StatusBadge } from './AdminReview';

const PAGE = 50;
const FILTERS: ('전체' | FieldStatus)[] = ['전체', '검수 대기', '1인 승인', '검수 완료'];
function loadName() { try { return localStorage.getItem('jinhak-navi-reviewer') ?? ''; } catch { return ''; } }
function saveName(v: string) { try { localStorage.setItem('jinhak-navi-reviewer', v); } catch { /* per-viewer convenience only */ } }

/** 대학 위치(지도) 검수. 캠퍼스마다 2명이 승인한 행만 univ-map.json으로 내보낸다. */
export function AdminMap() {
  const list = useLiveQuery(() => adminDb.map.toArray(), []);
  const all = useMemo(() => [...(list ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.campus.localeCompare(b.campus, 'ko')), [list]);
  const [reviewer, setReviewer] = useState(loadName), [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체'), [query, setQuery] = useState(''), [page, setPage] = useState(0);
  const [baseDate, setBaseDate] = useState(''), [listSource, setListSource] = useState(''), [listAsOf, setListAsOf] = useState('');
  const [open, setOpen] = useState<string | null>(null), [error, setError] = useState(''), [message, setMessage] = useState('');
  const run = async (action: () => Promise<string | void>) => {
    setError(''); setMessage('');
    try { setMessage((await action()) || ''); } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요.'); }
  };
  const shown = all.filter(d => (filter === '전체' || mapStatus(d) === filter) && (!query.trim() || d.name.includes(query.trim())));
  const done = all.filter(d => mapStatus(d) === '검수 완료').length;

  const loadDraft = (file: File) => run(async () => {
    const rows = parseMapDraft(JSON.parse(await file.text()));
    if (all.length && !window.confirm(`지금 캠퍼스 ${all.length}행을 파일 ${rows.length}행으로 바꿀까요? 승인도 지워져요.`)) return;
    await adminDb.transaction('rw', adminDb.map, async () => { await adminDb.map.clear(); await adminDb.map.bulkPut(rows); });
    setPage(0);
    return `캠퍼스 ${rows.length}행을 불러왔어요. 행마다 검수자 2명이 승인해야 공개돼요.`;
  });
  const importRecord = (file: File) => run(async () => {
    const { merged, conflicts } = mergeMapRecords(new Map(all.map(d => [d.key, d])), JSON.parse(await file.text()));
    const replace = conflicts.length > 0 && window.confirm(`칸 내용이 이 기기와 다른 캠퍼스가 ${conflicts.length}개 있어요(${conflicts.slice(0, 3).map(d => `${d.name} ${d.campus}`).join(', ')}…). 가져온 파일로 바꿀까요? 이 기기에서 고친 내용은 사라져요.`);
    await adminDb.map.bulkPut([...merged, ...(replace ? conflicts : [])]);
    return `검수 기록 ${merged.length + (replace ? conflicts.length : 0)}개를 합쳤어요${conflicts.length && !replace ? ` · 내용이 다른 ${conflicts.length}개는 그대로 뒀어요` : ''}.`;
  });
  const exportMap = () => run(async () => {
    const file = buildMapFile(all, { base_date: baseDate, list_source: listSource, list_as_of: listAsOf });
    downloadFile(JSON.stringify(file), 'univ-map.json', 'application/json');
    return `검수 완료 캠퍼스 ${file.campuses.length}곳을 내보냈어요(검수 전 ${all.length - file.campuses.length}곳은 넣지 않았어요). app/public/data/univ-map.json에 넣고 배포해요.`;
  });

  return <section className="student-screen admin-review" data-slug="admin-rules">
    <div className="screen-heading"><div><p className="t-caption text-muted">규칙 관리 › 대학 위치</p><h2 className="t-heading-1">대학 위치 검수</h2>
      <p className="text-muted">캠퍼스마다 주소·좌표·학교 종류를 확인해요. 학생 화면 ‘대학 지도’에 핀으로 보여요.</p></div>
      <ButtonPrimary disabled={!done} onClick={exportMap}>공개 파일 내보내기</ButtonPrimary></div>
    <p className="notice">ⓘ 캠퍼스마다 검수자 2명이 승인해야 공개돼요 · 칸을 고치면 승인이 지워지고 다시 검수해요 · 승인 전 캠퍼스는 공개 파일에 넣지 않아요</p>
    <div className="form-grid filter-panel">
      <label>검수자 이름<input value={reviewer} onChange={e => { setReviewer(e.target.value); saveName(e.target.value); }} placeholder="예: 관리자 A" /></label>
      <label>위치 초안 불러오기<input type="file" accept=".json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f) loadDraft(f); e.target.value = ''; }} /></label>
      <label>검수 기록 가져오기<input type="file" accept=".json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f) importRecord(f); e.target.value = ''; }} /></label>
    </div>
    <p className="t-caption text-muted">초안: work/_data/review-queue/univ-map-draft.json · 좌표는 지도에서 캠퍼스 정문 위치를 확인해 적어요</p>
    <div className="form-grid filter-panel">
      <label>데이터 기준일<input value={baseDate} onChange={e => setBaseDate(e.target.value)} placeholder="예: 2026-11-24" /></label>
      <label>대학 목록 출처<input value={listSource} onChange={e => setListSource(e.target.value)} placeholder="예: 한국교육개발원 대학 주소록" /></label>
      <label>목록 기준일(선택)<input value={listAsOf} onChange={e => setListAsOf(e.target.value)} placeholder="예: 2026-04-01" /></label>
    </div>
    <div className="toolbar"><ButtonOutline disabled={!all.length} onClick={() => downloadFile(JSON.stringify(mapRecordFile(all), null, 1), 'map-review.json', 'application/json')}>검수 기록 내보내기</ButtonOutline></div>
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}
    {!all.length ? <div className="empty-state"><h3 className="t-heading-3">불러온 캠퍼스가 없어요</h3><p>‘위치 초안 불러오기’로 대학 위치 초안 파일을 열어 주세요.</p></div> : <>
      <div className="toolbar">
        <input aria-label="대학 이름으로 찾기" placeholder="대학 이름으로 찾기" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} />
        <SegmentedControl label="검수 상태" value={filter} onChange={f => { setFilter(f); setPage(0); }} options={FILTERS.map(f => ({ value: f, label: `${f} ${f === '전체' ? all.length : all.filter(d => mapStatus(d) === f).length}` }))} />
      </div>
      {!shown.length ? <p className="text-muted">조건에 맞는 캠퍼스가 없어요.</p> : <div className="table-scroll"><table className="data-table">
        <thead><tr><th>대학</th><th>캠퍼스</th><th>시·도</th><th>시·군·구</th><th>좌표</th><th>승인</th><th>상태</th></tr></thead>
        <tbody>{shown.slice(page * PAGE, page * PAGE + PAGE).map(d => <tr key={d.key}>
          <td><button className="text-button" onClick={() => setOpen(d.key)}>{d.name}</button></td><td>{d.campus || '—'}</td><td>{d.sido || '—'}</td><td>{d.sigungu || '—'}</td>
          <td className="num">{d.lat !== null && d.lng !== null ? `${d.lat}, ${d.lng}` : '—'}</td>
          <td>{d.approvals.map(a => a.reviewer).join(' · ') || '—'}</td><td><StatusBadge status={mapStatus(d)} /></td></tr>)}</tbody>
      </table></div>}
      {shown.length > PAGE && <div className="toolbar"><ButtonOutline disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</ButtonOutline>
        <span className="num">{page + 1} / {Math.ceil(shown.length / PAGE)}</span>
        <ButtonOutline disabled={(page + 1) * PAGE >= shown.length} onClick={() => setPage(p => p + 1)}>다음</ButtonOutline></div>}
    </>}
    <p className="disclaimer-note">ⓘ 대학 위치만 보여 줘요 · 거리·통학 시간·입결은 지도에 올리지 않아요</p>
    {open && all.find(d => d.key === open) && <MapEditor key={open} draft={all.find(d => d.key === open)!} all={all} reviewer={reviewer} onClose={() => setOpen(null)} />}
  </section>;
}

type Form = Omit<MapFields, 'lat' | 'lng'> & { lat: string; lng: string };
const toForm = (d: MapDraft): Form => ({ ...d, lat: d.lat === null ? '' : String(d.lat), lng: d.lng === null ? '' : String(d.lng) });
const toNum = (v: string) => v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v);

function MapEditor({ draft, all, reviewer, onClose }: { draft: MapDraft; all: readonly MapDraft[]; reviewer: string; onClose: () => void }) {
  const [form, setForm] = useState<Form>(() => toForm(draft)), [error, setError] = useState('');
  const edited = editMap(draft, { ...form, lat: toNum(form.lat), lng: toNum(form.lng) });
  const saved = edited === draft, problems = mapProblems(edited, all), status = mapStatus(draft), mine = draft.approvals.some(a => a.reviewer === reviewer.trim());
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });
  const put = async (next: () => MapDraft) => { setError(''); try { await adminDb.map.put(next()); } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); } };
  const pick = (label: string, k: 'campus_type' | 'school_kind' | 'founding' | 'sido', options: readonly string[]) =>
    <label>{label}<select value={form[k]} onChange={e => set({ [k]: e.target.value })}><option value="">고르기</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      {form[k] && !options.includes(form[k]) && <option value={form[k]}>{form[k]}(고쳐 주세요)</option>}</select></label>;
  return <Modal wide label={`${draft.name} ${draft.campus} 위치`} onClose={onClose}>
    <div className="section-row"><div><h3 className="t-heading-3">{draft.name} · {draft.campus || '캠퍼스 미정'}</h3>
      <p className="t-caption text-muted">{draft.approvals.map(a => `승인 ${a.reviewer}`).join(' · ') || '아직 승인 없음'}{draft.draft_basis && ` · 초안 근거: ${draft.draft_basis}`}</p></div><StatusBadge status={status} /></div>
    <div className="form-grid">
      <label>대학<input value={form.name} onChange={e => set({ name: e.target.value })} /></label>
      <label>캠퍼스<input value={form.campus} onChange={e => set({ campus: e.target.value })} placeholder="예: 본교, 원주캠퍼스" /></label>
      {pick('본교·분교', 'campus_type', ['본교', '분교'])}
      {pick('학교 종류', 'school_kind', KINDS)}
      {pick('설립 구분', 'founding', FOUNDINGS)}
      {pick('시·도', 'sido', SIDO)}
      <label>시·군·구<input value={form.sigungu} onChange={e => set({ sigungu: e.target.value })} placeholder="예: 원주시" /></label>
      <label>주소(선택)<input value={form.address} onChange={e => set({ address: e.target.value })} placeholder="도로명 주소" /></label>
      <label>위도<input inputMode="decimal" value={form.lat} onChange={e => set({ lat: e.target.value })} placeholder="예: 37.5665" /></label>
      <label>경도<input inputMode="decimal" value={form.lng} onChange={e => set({ lng: e.target.value })} placeholder="예: 126.978" /></label>
    </div>
    {!!problems.length && <div className="error-note"><strong>승인 전에 고칠 곳 {problems.length}개</strong><ul>{problems.map(p => <li key={p}>{p}</li>)}</ul></div>}
    {error && <p role="alert" className="error-note">{error}</p>}
    {!saved && <p className="t-caption text-muted">저장하지 않은 내용이 있어요 · 저장하면 지금까지의 승인이 지워져요</p>}
    {mine && saved && <p className="notice">ⓘ 내가 승인한 캠퍼스예요. 다른 검수자가 확인해요(검수자 2명이 서로 달라야 해요).</p>}
    <div className="toolbar"><ButtonOutline onClick={onClose}>닫기</ButtonOutline>
      <ButtonOutline disabled={saved} onClick={() => put(() => edited)}>저장</ButtonOutline>
      {!mine && <ButtonPrimary disabled={!saved || !!problems.length || status === '검수 완료'} onClick={() => put(() => approveMap(draft, reviewer, all))}>승인</ButtonPrimary>}</div>
  </Modal>;
}
