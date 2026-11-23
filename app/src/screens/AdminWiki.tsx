import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { adminDb } from '../store/adminDb';
import { downloadFile } from '../io/backup';
import { useReleasedResults } from '../data/releasedResults';
import { useUnivWiki } from '../data/univWiki';
import { WIKI_SECTIONS, type WikiItem, type WikiSectionKey } from '../domain/univWiki';
import { approveWiki, buildWikiEntries, editItems, itemProblems, mergeWikiRecords, newWikiDraft, sectionTitle, wikiKey, wikiRecordFile, wikiStatus, type WikiDraft } from '../domain/wikiReview';
import type { FieldStatus } from '../domain/fieldReview';
import { StatusBadge } from './AdminReview';

const FILTERS: ('전체' | FieldStatus)[] = ['전체', '검수 대기', '1인 승인', '검수 완료'];
const blank = (): WikiItem => ({ heading: '', text: '', source_label: '', source_url: '' });
function loadName() { try { return localStorage.getItem('jinhak-navi-reviewer') ?? ''; } catch { return ''; } }
function saveName(v: string) { try { localStorage.setItem('jinhak-navi-reviewer', v); } catch { /* per-viewer convenience only */ } }

/** 대학 위키 요약 검수. 대학 × 섹션마다 2명이 승인한 요약만 univ-wiki.json으로 내보낸다. */
export function AdminWiki() {
  const units = useReleasedResults(), wiki = useUnivWiki();
  const list = useLiveQuery(() => adminDb.wiki.toArray(), []);
  const drafts = useMemo(() => new Map((list ?? []).map(d => [d.key, d])), [list]);
  const [reviewer, setReviewer] = useState(loadName), [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체'), [query, setQuery] = useState('');
  const [university, setUniversity] = useState(''), [section, setSection] = useState<WikiSectionKey>('notes'), [open, setOpen] = useState<WikiDraft | null>(null);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const run = async (action: () => Promise<string | void>) => {
    setError(''); setMessage('');
    try { setMessage((await action()) || ''); } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요.'); }
  };
  const names = useMemo(() => [...new Set([...(units ?? []).map(u => u.university), ...(wiki?.sections.keys() ?? []), ...(list ?? []).map(d => d.university)])]
    .sort((a, b) => a.localeCompare(b, 'ko')), [units, wiki, list]);
  const sorted = [...(list ?? [])].sort((a, b) => a.university.localeCompare(b.university, 'ko') || WIKI_SECTIONS.findIndex(s => s.key === a.section) - WIKI_SECTIONS.findIndex(s => s.key === b.section));
  const shown = sorted.filter(d => (filter === '전체' || wikiStatus(d) === filter) && (!query.trim() || d.university.includes(query.trim())));
  const done = sorted.filter(d => wikiStatus(d) === '검수 완료').length;

  // 이 기기에 기록이 없으면 지금 공개 중인 요약에서 시작한다(승인은 새로 받는다)
  const openEditor = (u: string, s: WikiSectionKey) => setOpen(drafts.get(wikiKey(u, s)) ?? newWikiDraft(u, s, wiki?.sections.get(u.trim())?.[s]?.items ?? []));
  const importRecord = (file: File) => run(async () => {
    const { merged, conflicts } = mergeWikiRecords(drafts, JSON.parse(await file.text()));
    const replace = conflicts.length > 0 && window.confirm(`요약 내용이 이 기기와 다른 섹션이 ${conflicts.length}개 있어요(${conflicts.slice(0, 3).map(d => `${d.university} ${sectionTitle(d.section)}`).join(', ')}…). 가져온 파일로 바꿀까요? 이 기기에서 고친 내용은 사라져요.`);
    await adminDb.wiki.bulkPut([...merged, ...(replace ? conflicts : [])]);
    return `검수 기록 ${merged.length + (replace ? conflicts.length : 0)}개를 합쳤어요${conflicts.length && !replace ? ` · 내용이 다른 ${conflicts.length}개는 그대로 뒀어요` : ''}.`;
  });
  const exportWiki = () => run(async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/univ-wiki.json`);
    const { file, count } = buildWikiEntries(res.ok ? await res.json() : null, list ?? []);
    downloadFile(JSON.stringify(file), 'univ-wiki.json', 'application/json');
    return `검수 완료 요약 ${count}개를 넣어 내보냈어요. app/public/data/univ-wiki.json에 넣고 배포해요.`;
  });

  return <section className="student-screen admin-review" data-slug="admin-rules">
    <div className="screen-heading"><div><p className="t-caption text-muted">규칙 관리 › 위키 요약</p><h2 className="t-heading-1">대학 위키 요약 검수</h2>
      <p className="text-muted">대학 공식 문서를 섹션별로 요약하고 출처를 붙여요. 대학 상세의 위키 섹션에 보여요.</p></div>
      <ButtonPrimary disabled={!done} onClick={exportWiki}>공개 파일 내보내기</ButtonPrimary></div>
    <p className="notice">ⓘ 섹션마다 검수자 2명이 승인해야 공개돼요 · 요약을 고치면 승인이 지워지고 다시 검수해요 · 모든 요약에 공식 문서 출처(https)가 있어야 해요</p>
    <div className="form-grid filter-panel">
      <label>검수자 이름<input value={reviewer} onChange={e => { setReviewer(e.target.value); saveName(e.target.value); }} placeholder="예: 관리자 A" /></label>
      <label>검수 기록 가져오기<input type="file" accept=".json,application/json" onChange={e => { const f = e.target.files?.[0]; if (f) importRecord(f); e.target.value = ''; }} /></label>
    </div>
    <div className="form-grid filter-panel">
      <label>대학<input list="wiki-universities" value={university} onChange={e => setUniversity(e.target.value)} placeholder="예: 경희대학교" /></label>
      <datalist id="wiki-universities">{names.map(n => <option key={n} value={n} />)}</datalist>
      <label>섹션<select value={section} onChange={e => setSection(e.target.value as WikiSectionKey)}>{WIKI_SECTIONS.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}</select></label>
    </div>
    <div className="toolbar"><ButtonOutline disabled={!university.trim()} onClick={() => openEditor(university, section)}>요약 쓰기·고치기</ButtonOutline>
      <ButtonOutline disabled={!list?.length} onClick={() => downloadFile(JSON.stringify(wikiRecordFile(list ?? []), null, 1), 'wiki-review.json', 'application/json')}>검수 기록 내보내기</ButtonOutline></div>
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}
    {!sorted.length ? <div className="empty-state"><h3 className="t-heading-3">아직 쓴 요약이 없어요</h3><p>대학과 섹션을 고르고 ‘요약 쓰기·고치기’를 눌러 주세요.</p></div> : <>
      <div className="toolbar">
        <input aria-label="대학 이름으로 찾기" placeholder="대학 이름으로 찾기" value={query} onChange={e => setQuery(e.target.value)} />
        <SegmentedControl label="검수 상태" value={filter} onChange={setFilter} options={FILTERS.map(f => ({ value: f, label: `${f} ${f === '전체' ? sorted.length : sorted.filter(d => wikiStatus(d) === f).length}` }))} />
      </div>
      {!shown.length ? <p className="text-muted">조건에 맞는 요약이 없어요.</p> : <div className="table-scroll"><table className="data-table">
        <thead><tr><th>대학</th><th>섹션</th><th className="num">요약</th><th>승인</th><th>상태</th></tr></thead>
        <tbody>{shown.map(d => <tr key={d.key}>
          <td><button className="text-button" onClick={() => setOpen(d)}>{d.university}</button></td><td>{sectionTitle(d.section)}</td><td className="num">{d.items.length}</td>
          <td>{d.approvals.map(a => a.reviewer).join(' · ') || '—'}</td><td><StatusBadge status={wikiStatus(d)} /></td></tr>)}</tbody>
      </table></div>}
    </>}
    <p className="disclaimer-note">ⓘ 대학 공식 발표 자료만 요약해요 · 사설 사이트 내용은 받지 않아요</p>
    {open && <WikiEditor key={open.key} draft={drafts.get(open.key) ?? open} reviewer={reviewer} onClose={() => setOpen(null)} />}
  </section>;
}

function WikiEditor({ draft, reviewer, onClose }: { draft: WikiDraft; reviewer: string; onClose: () => void }) {
  const [items, setItems] = useState<WikiItem[]>(() => draft.items.length ? draft.items.map(i => ({ ...blank(), ...i })) : [blank()]);
  const [error, setError] = useState('');
  const saved = JSON.stringify(editItems(draft, items).items) === JSON.stringify(draft.items) && draft.updated_at !== '';
  const problems = itemProblems(items), status = wikiStatus(draft), mine = draft.approvals.some(a => a.reviewer === reviewer.trim());
  const set = (n: number, patch: Partial<WikiItem>) => setItems(items.map((i, k) => k === n ? { ...i, ...patch } : i));
  const put = async (next: () => WikiDraft) => { setError(''); try { await adminDb.wiki.put(next()); } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); } };
  return <Modal wide label={`${draft.university} ${sectionTitle(draft.section)} 요약`} onClose={onClose}>
    <div className="section-row"><div><h3 className="t-heading-3">{draft.university} · {sectionTitle(draft.section)}</h3>
      <p className="t-caption text-muted">{draft.approvals.map(a => `승인 ${a.reviewer}`).join(' · ') || '아직 승인 없음'}</p></div><StatusBadge status={status} /></div>
    <ol className="wiki-facts">{items.map((i, n) => <li key={n} className="form-grid">
      <label>제목(선택)<input value={i.heading ?? ''} onChange={e => set(n, { heading: e.target.value })} placeholder="예: 학생부교과 반영 과목" /></label>
      <label>요약<textarea rows={3} maxLength={400} value={i.text} onChange={e => set(n, { text: e.target.value })} placeholder="공식 문서에 적힌 사실만 짧게 적어요." /></label>
      <label>출처 이름<input value={i.source_label} onChange={e => set(n, { source_label: e.target.value })} placeholder="예: 2028학년도 수시 모집요강 12쪽" /></label>
      <label>출처 주소<input type="url" value={i.source_url} onChange={e => set(n, { source_url: e.target.value })} placeholder="https://" /></label>
      <button className="text-button" aria-label={`${n + 1}번 요약 삭제`} onClick={() => setItems(items.filter((_, k) => k !== n))}>이 요약 삭제</button>
    </li>)}</ol>
    <ButtonOutline onClick={() => setItems([...items, blank()])}>요약 추가</ButtonOutline>
    {!!problems.length && <div className="error-note"><strong>승인 전에 고칠 곳 {problems.length}개</strong><ul>{problems.slice(0, 10).map(p => <li key={p}>{p}</li>)}</ul></div>}
    {error && <p role="alert" className="error-note">{error}</p>}
    {!saved && <p className="t-caption text-muted">저장하지 않은 내용이 있어요 · 저장하면 지금까지의 승인이 지워져요</p>}
    {mine && saved && <p className="notice">ⓘ 내가 승인한 요약이에요. 다른 검수자가 확인해요(검수자 2명이 서로 달라야 해요).</p>}
    <div className="toolbar"><ButtonOutline onClick={onClose}>닫기</ButtonOutline>
      <ButtonOutline disabled={saved} onClick={() => put(() => editItems(draft, items))}>저장</ButtonOutline>
      {!mine && <ButtonPrimary disabled={!saved || !!problems.length || status === '검수 완료'} onClick={() => put(() => approveWiki(draft, reviewer))}>승인</ButtonPrimary>}</div>
  </Modal>;
}
