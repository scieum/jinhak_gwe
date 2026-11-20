import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { downloadFile } from '../io/backup';
import { validateScoringRule, type ScoringRule } from '../engine/scoring';
import {
  GROUPS, MIN_TESTS, SEMESTERS, STATUS_ORDER, approve, blockers, diffRules, newRuleDraft, newTest, nextVersion, reject, releaseRules, requestReview, ruleItems, runTest,
  type RuleDraft, type RuleStatus, type TestCase,
} from '../domain/ruleEditor';
import { adminDb } from '../store/adminDb';
import '../styles/teacher.css';

function loadName() { try { return localStorage.getItem('jinhak-navi-reviewer') ?? ''; } catch { return ''; } }
function saveName(v: string) { try { localStorage.setItem('jinhak-navi-reviewer', v); } catch { /* per-viewer convenience only */ } }
export const RuleStatusBadge = ({ s }: { s: RuleStatus }) => s === '검수 완료' ? <span className="judge-badge judge-safe">● 검수 완료</span> : <span className="data-status-badge">{s}</span>;
const NEVER1 = '검수 완료 전 수정안은 학생 화면에서 계산·공개하지 않아요';

export function AdminRules() {
  const drafts = useLiveQuery(() => adminDb.rules.toArray(), []);
  const [me, setMe] = useState(loadName), [openId, setOpenId] = useState<string | null>(null), [message, setMessage] = useState(''), [error, setError] = useState('');
  if (!drafts) return <section className="student-screen" data-slug="admin-rules"><p role="status">규칙을 읽고 있어요.</p></section>;
  const opened = drafts.find(d => d.id === openId);
  const sorted = [...drafts].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.updated_at.localeCompare(a.updated_at));
  const create = async () => { if (!me.trim()) { setError('먼저 관리자 이름을 적어 주세요.'); return; } const d = newRuleDraft(me.trim()); await adminDb.rules.put(d); setOpenId(d.id); setError(''); };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const v = JSON.parse(await file.text()) as { format?: string; drafts?: RuleDraft[] };
      if (v.format !== 'jinhak-navi-rule-drafts' || !Array.isArray(v.drafts)) throw new Error();
      const ok = v.drafts.filter(d => d && typeof d.id === 'string' && d.rule && !validateScoringRule(d.rule).length && Array.isArray(d.tests) && Array.isArray(d.history) && STATUS_ORDER.includes(d.status));
      // 검수 완료가 아닌데 verified로 온 규칙은 믿지 않아요(파일 경계).
      for (const d of ok) { if (d.status !== '검수 완료') d.rule.review_status = 'draft'; const cur = await adminDb.rules.get(d.id); if (!cur || cur.updated_at < d.updated_at) await adminDb.rules.put(d); }
      setMessage(`규칙 ${ok.length}개를 합쳤어요${ok.length < v.drafts.length ? ` · ${v.drafts.length - ok.length}개는 형식이 맞지 않아 뺐어요` : ''}`); setError('');
    } catch { setError('규칙 기록 파일(.json)인지 확인해 주세요.'); }
  };
  return <section className="student-screen teacher-screen" data-slug="admin-rules" aria-label="규칙 편집기">
    <div className="screen-heading"><h2 className="t-heading-1">{opened ? '환산 규칙 편집' : '규칙 편집기'}</h2>
      <label className="t-body-sm">관리자 이름<input value={me} onChange={e => { setMe(e.target.value); saveName(e.target.value); }} placeholder="예: 관리자 A" /></label></div>
    <div className="notice"><p className="t-body-sm">ⓘ {NEVER1}. 테스트 케이스 {MIN_TESTS}개 이상이 모두 통과해야 검수를 요청할 수 있고, 작성자가 아닌 관리자가 승인해요.</p></div>
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
    {opened ? <RuleEditor key={opened.id} draft={opened} me={me.trim()} published={drafts.filter(d => d.id !== opened.id && d.status === '검수 완료' && d.rule.university === opened.rule.university && d.rule.program === opened.rule.program).sort((a, b) => b.rule.version - a.rule.version)[0]?.rule ?? null}
      onClose={() => setOpenId(null)} onOpen={setOpenId} /> : <>
      <div className="toolbar"><ButtonPrimary onClick={create}>새 규칙 만들기</ButtonPrimary>
        <ButtonOutline onClick={() => downloadFile(JSON.stringify({ format: 'jinhak-navi-rule-drafts', version: 1, drafts }), 'rule-drafts.json', 'application/json')}>규칙 기록 내보내기</ButtonOutline>
        <label className="button-outline file-button">규칙 기록 합치기<input type="file" accept=".json" className="sr-only" aria-label="규칙 기록 파일 고르기" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
        <ButtonOutline disabled={!drafts.some(d => d.status === '검수 완료')} onClick={() => downloadFile(JSON.stringify(releaseRules(drafts), null, 2), 'scoring-rules.json', 'application/json')}>배포 파일 내보내기</ButtonOutline></div>
      {!drafts.length ? <div className="empty-state"><h3 className="t-heading-3">아직 만든 규칙이 없어요</h3><p>모집요강을 보고 대학·전형 환산 규칙을 만들어 보세요. 다른 기기의 기록은 "규칙 기록 합치기"로 가져와요.</p></div>
        : <div className="table-scroll"><table className="data-table"><thead><tr><th>대학</th><th>전형</th><th>버전</th><th>상태</th><th>테스트</th><th>작성자</th><th>검수자</th><th>수정일</th></tr></thead>
          <tbody>{sorted.map(d => { const pass = d.tests.filter(t => runTest(d.rule, t).ok).length; return <tr key={d.id}>
            <td><button className="text-button" onClick={() => setOpenId(d.id)}>{d.rule.university || '이름 없는 규칙'}</button></td><td>{d.rule.program || '–'}</td><td className="num">{d.rule.admission_year}-v{d.rule.version}</td>
            <td><RuleStatusBadge s={d.status} /></td><td className="num">{pass}/{d.tests.length} 통과{d.tests.length < MIN_TESTS ? ` · ${MIN_TESTS - d.tests.length}개 더 필요` : ''}</td>
            <td>{d.author}</td><td>{d.reviewer ?? '–'}</td><td className="num">{d.updated_at.slice(5, 10)}</td></tr>; })}</tbody></table></div>}
    </>}
    <p className="t-caption text-muted">배포 파일(scoring-rules.json)을 app/public/data/ 에 넣고 배포하면 학생 '대학별 환산'에 더해져요. 학생 앱은 파일을 다시 검사해서 검수 완료 규칙만 써요.</p>
    <p className="disclaimer-note">ⓘ 검수 완료 규칙만 배포 파일에 들어가요 · 검수 전 규칙은 학생 화면에서 계산하지 않아요 · 규칙 기록은 이 기기에만 저장되고, 다른 관리자와는 파일로 주고받아요</p>
  </section>;
}

function RuleEditor({ draft, me, published, onClose, onOpen }: { draft: RuleDraft; me: string; published: ScoringRule | null; onClose: () => void; onOpen: (id: string) => void }) {
  const [d, setD] = useState(draft), [error, setError] = useState(''), [message, setMessage] = useState(''), [rejecting, setRejecting] = useState(false), [confirm, setConfirm] = useState<'request' | 'approve' | null>(null);
  const editable = (d.status === '작성 중' || d.status === '반려') && me === d.author;
  const r = d.rule, set = (patch: Partial<ScoringRule>) => setD({ ...d, rule: { ...r, ...patch } });
  const persist = async (next: RuleDraft, ok: string) => { await adminDb.rules.put(next); setD(next); setMessage(ok); setError(''); };
  const act = async (fn: () => RuleDraft, ok: string) => { try { await persist(fn(), ok); } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요.'); } };
  const save = () => persist({ ...d, rule: { ...r, max_score: r.grade_max_score + (r.attendance_rule?.max_score ?? 0) }, updated_at: new Date().toISOString() }, '임시 저장했어요');
  const block = blockers(d), diff = diffRules(published, r), changed = diff.filter(x => x.changed);
  const setTest = (t: TestCase) => setD({ ...d, tests: d.tests.map(x => x.id === t.id ? t : x) });

  return <div className="board-layout"><div className="board-main">
    <div className="section-row"><div><h3 className="t-heading-2">{r.university || '이름 없는 규칙'} · {r.program || '전형'}</h3>
      <p className="t-caption"><RuleStatusBadge s={d.status} /> <span className="num">{r.admission_year}-v{r.version} 수정안 · 현재 공개 {published ? `v${published.version}` : '없음'} · 작성 {d.author}{d.reviewer ? ` · 검수 ${d.reviewer}` : ''}</span></p></div>
      <div className="toolbar">{/^https:\/\//.test(r.source) && <a className="button-outline" href={r.source} target="_blank" rel="noreferrer">원문 보기 ↗ {d.source_page}</a>}<ButtonOutline onClick={onClose}>목록으로</ButtonOutline></div></div>
    {d.status === '반려' && <div className="warning-callout"><strong>▲ 반려 사유</strong><p className="t-body-sm">{d.reject_reason}</p></div>}
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status" className="toast">{message}</p>}

    {editable ? <RuleForm d={d} setD={setD} set={set} /> : <>
      <h4 className="t-heading-4">{published ? `바뀐 항목 ${changed.length}` : '규칙 내용'}</h4>
      <table className="data-table"><thead><tr><th>항목</th><th>현재 공개{published ? ` v${published.version}` : ''}</th><th>이번 수정안 v{r.version}</th></tr></thead>
        <tbody>{diff.map(x => <tr key={x.label}><td>{x.label}</td><td>{x.before}</td><td>{x.changed && published ? <strong>{x.after}</strong> : x.after}</td></tr>)}</tbody></table>
      {d.status !== '검수 완료' && me === d.author && <p className="t-body-sm text-muted">{d.status === '검수 대기' ? '검수 대기 중이라 편집을 잠갔어요. ' : ''}{d.status === '검수 대기' && '내가 작성한 규칙이에요. 다른 관리자가 검수해요.'}</p>}
      {(d.status === '작성 중' || d.status === '반려') && me !== d.author && <p className="t-body-sm text-muted">작성자({d.author})만 고칠 수 있어요.</p>}</>}

    <div className="toolbar">
      {editable && <><ButtonOutline onClick={save}>임시 저장</ButtonOutline>
        <ButtonPrimary disabled={block.length > 0} onClick={() => setConfirm('request')}>검수 요청</ButtonPrimary>
        {block.length > 0 && <span className="t-caption text-muted">{block[0]}</span>}</>}
      {d.status === '검수 대기' && me && me !== d.author && <><ButtonOutline onClick={() => setRejecting(true)}>반려</ButtonOutline><ButtonPrimary onClick={() => setConfirm('approve')}>승인</ButtonPrimary></>}
      {d.status === '검수 완료' && me && <ButtonOutline onClick={async () => { const n = nextVersion(d, me); await adminDb.rules.put(n); onOpen(n.id); }}>새 수정안 만들기</ButtonOutline>}
    </div>
    <details className="trace-accordion"><summary>버전 기록 {d.history.length}</summary><ol className="counsel-timeline">{d.history.map((h, i) => <li key={i}><p className="t-caption num">{h.at.slice(0, 16).replace('T', ' ')} · {h.who}</p><p className="t-body-sm">{h.action}</p></li>)}</ol></details>
  </div>

  <aside className="counsel-summary" aria-label="테스트 케이스"><h3 className="t-heading-4">테스트 {d.tests.filter(t => runTest(r, t).ok).length}/{d.tests.length} 통과</h3>
    <p className="t-caption text-muted">기대값은 대학 공식 계산기나 모집요강 예시로 확인한 값이에요. {MIN_TESTS}개 이상 필요해요.</p>
    {d.tests.map((t, i) => <TestCard key={t.id} t={t} i={i} rule={r} editable={editable} onChange={setTest} onDelete={() => setD({ ...d, tests: d.tests.filter(x => x.id !== t.id) })} />)}
    {editable && <ButtonOutline onClick={() => setD({ ...d, tests: [...d.tests, newTest(d.tests.length)] })}>테스트 케이스 더하기</ButtonOutline>}
  </aside>

  {confirm && <Modal label={confirm === 'request' ? '검수 요청' : '승인'} onClose={() => setConfirm(null)}><h3 className="t-heading-3">{confirm === 'request' ? '검수를 요청할까요?' : '승인할까요?'}</h3>
    <p>{confirm === 'request' ? `테스트 ${d.tests.length}개가 모두 통과했어요. 요청하면 검수가 끝날 때까지 편집을 잠가요.` : `승인하면 v${r.version}이 검수 완료가 되고 배포 파일에 들어갈 수 있어요.`}</p>
    <div className="toolbar"><ButtonOutline onClick={() => setConfirm(null)}>취소</ButtonOutline>
      <ButtonPrimary onClick={() => { setConfirm(null); act(() => confirm === 'request' ? requestReview({ ...d, rule: { ...r, max_score: r.grade_max_score + (r.attendance_rule?.max_score ?? 0) } }, me) : approve(d, me), confirm === 'request' ? '검수를 요청했어요' : '승인했어요'); }}>{confirm === 'request' ? '검수 요청하기' : '승인하기'}</ButtonPrimary></div></Modal>}
  {rejecting && <RejectModal author={d.author} onClose={() => setRejecting(false)} onReject={reason => { setRejecting(false); act(() => reject(d, me, reason), '반려했어요'); }} />}
  </div>;
}

function RejectModal({ author, onClose, onReject }: { author: string; onClose: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState(''), [error, setError] = useState('');
  return <Modal label="반려" onClose={onClose}><h3 className="t-heading-3">반려할까요?</h3><p className="t-body-sm">사유는 작성자({author})에게 그대로 전달돼요. 무엇을 어떻게 고치면 되는지 적어 주세요.</p>
    <label>반려 사유(필수)<textarea rows={4} maxLength={200} value={reason} aria-invalid={!!error} onChange={e => { setReason(e.target.value); setError(''); }} /></label>
    <p className="t-caption text-muted num">{reason.length}/200</p>{error && <p role="alert" className="error-note">{error}</p>}
    <div className="toolbar"><ButtonOutline onClick={onClose}>취소</ButtonOutline><ButtonPrimary onClick={() => reason.trim() ? onReject(reason) : setError('반려 사유를 적어야 반려할 수 있어요.')}>반려하기</ButtonPrimary></div></Modal>;
}

function TestCard({ t, i, rule, editable, onChange, onDelete }: { t: TestCase; i: number; rule: ScoringRule; editable: boolean; onChange: (t: TestCase) => void; onDelete: () => void }) {
  const run = runTest(rule, t);
  const year = (y: '1' | '2' | '3', patch: Partial<TestCase['years']['1']>) => onChange({ ...t, years: { ...t.years, [y]: { ...t.years[y], ...patch } } });
  return <article className="univ-card test-card"><div className="section-row"><strong>테스트 {i + 1} · {t.name}</strong>
    {run.ok ? <span className="data-status-badge">통과</span> : <span className="judge-badge judge-risk">■ 불통과</span>}</div>
    <p className="num t-body-sm">{run.actual ?? '계산 안 됨'} {run.ok ? '=' : '≠'} {t.expected}{run.reason && ` · ${run.reason}`}</p>
    {editable && <><div className="test-grid">{(['1', '2', '3'] as const).map(y => <Field key={y} label={`${y}학년`}>
      <select aria-label={`테스트 ${i + 1} ${y}학년 등급`} value={t.years[y].grade} onChange={e => year(y, { grade: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g}등급</option>)}</select>
      <select aria-label={`테스트 ${i + 1} ${y}학년 성취도`} value={t.years[y].achievement} onChange={e => year(y, { achievement: e.target.value as 'A' })}>{['A', 'B', 'C', 'D', 'E'].map(a => <option key={a}>{a}</option>)}</select></Field>)}</div>
      <div className="test-grid"><label>미인정 결석<input type="number" min={0} value={t.absence} onChange={e => onChange({ ...t, absence: Math.max(0, Number(e.target.value)) })} /></label>
        <label>지각·조퇴·결과<input type="number" min={0} value={t.tardy} onChange={e => onChange({ ...t, tardy: Math.max(0, Number(e.target.value)) })} /></label>
        <label>기대값<input type="number" step="0.01" aria-label={`테스트 ${i + 1} 기대값`} value={t.expected} onChange={e => onChange({ ...t, expected: Number(e.target.value) })} /></label></div>
      <button className="text-button" onClick={onDelete}>이 테스트 빼기</button></>}
    <details className="trace-accordion"><summary>계산 과정</summary><ol>{run.trace.slice(-6).map((s, k) => <li key={k} className="t-body-sm">{s.detail}{s.value !== undefined && <span className="num"> → {Math.round(s.value * 10000) / 10000}</span>}</li>)}</ol></details>
  </article>;
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => <fieldset className="field-group"><legend className="t-caption">{label}</legend>{children}</fieldset>;
const num = (v: string) => (v === '' ? NaN : Number(v));

function RuleForm({ d, setD, set }: { d: RuleDraft; setD: (d: RuleDraft) => void; set: (p: Partial<ScoringRule>) => void }) {
  const r = d.rule, a = r.attendance_rule;
  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];
  const items = ruleItems(r), errors = validateScoringRule({ ...r, max_score: r.grade_max_score + (a?.max_score ?? 0) });
  return <div className="rule-form">
    <div className="form-grid">
      <label>대학<input value={r.university} maxLength={40} onChange={e => set({ university: e.target.value })} placeholder="예: 가나대학교" /></label>
      <label>전형<input value={r.program} maxLength={60} onChange={e => set({ program: e.target.value })} placeholder="예: 학생부교과(지역균형)" /></label>
      <label>학년도<input type="number" value={r.admission_year} onChange={e => set({ admission_year: Number(e.target.value) })} /></label>
      <label>원문 주소(https)<input value={r.source} onChange={e => set({ source: e.target.value.trim() })} placeholder="https://… 모집요강 PDF" /></label>
      <label>원문 쪽<input value={d.source_page} maxLength={20} onChange={e => setD({ ...d, source_page: e.target.value })} placeholder="예: p.42" /></label>
    </div>
    <Field label="반영 학기">{SEMESTERS.map(s => <label key={s} className="checkbox-label"><input type="checkbox" checked={r.semesters.includes(s)} onChange={() => set({ semesters: SEMESTERS.filter(x => toggle(r.semesters, s).includes(x)) })} /> {s}</label>)}</Field>
    <Field label="반영 교과">{GROUPS.map(g => <label key={g} className="checkbox-label"><input type="checkbox" checked={r.subject_groups.includes(g)} onChange={() => set({ subject_groups: GROUPS.filter(x => toggle(r.subject_groups, g).includes(x)) })} /> {g}</label>)}</Field>
    <Field label="학년 가중(비우면 없음 · 합계 1)">{(['1', '2', '3'] as const).map(y => <label key={y}>{y}학년<input type="number" step="0.1" min={0} max={1} value={r.year_weights?.[y] ?? ''}
      onChange={e => { const w = { ...(r.year_weights ?? {}) }; if (e.target.value === '') delete w[y]; else w[y] = Number(e.target.value); set({ year_weights: Object.keys(w).length ? w : undefined }); }} /></label>)}</Field>
    <Field label="과목 선택"><select aria-label="과목 선택" value={r.selection.mode} onChange={e => set({ selection: { mode: e.target.value as ScoringRule['selection']['mode'], n: r.selection.n ?? 3 } })}>
      <option value="all">전 과목</option><option value="top_n_per_group">교과별 상위 n개</option><option value="top_n_total">전체 상위 n개</option></select>
      {r.selection.mode !== 'all' && <label>n<input type="number" min={1} value={r.selection.n ?? 3} onChange={e => set({ selection: { ...r.selection, n: Number(e.target.value) } })} /></label>}
      <label className="checkbox-label"><input type="checkbox" checked={r.credit_weighted} onChange={e => set({ credit_weighted: e.target.checked })} /> 학점 가중</label></Field>
    <Field label="석차등급 점수">{['1', '2', '3', '4', '5'].map(k => <label key={k}>{k}등급<input type="number" value={r.rank_grade_points[k] ?? ''} onChange={e => set({ rank_grade_points: { ...r.rank_grade_points, [k]: num(e.target.value) } })} /></label>)}</Field>
    <Field label="성취도 점수">{['A', 'B', 'C', 'D', 'E'].map(k => <label key={k}>{k}<input type="number" value={r.achievement_points?.[k] ?? ''} onChange={e => set({ achievement_points: { ...r.achievement_points, [k]: num(e.target.value) } })} /></label>)}</Field>
    <Field label="성취도 병행 반영"><select aria-label="성취도 병행 반영" value={r.achievement_blend.mode} onChange={e => set({ achievement_blend: { mode: e.target.value as 'none', rank_ratio: r.achievement_blend.rank_ratio ?? 0.8 } })}>
      <option value="none">없음</option><option value="weighted">비율 반영</option><option value="max">높은 값</option></select>
      {r.achievement_blend.mode === 'weighted' && <label>등급 비율 %<input type="number" min={0} max={100} value={Math.round((r.achievement_blend.rank_ratio ?? 0) * 100)} onChange={e => set({ achievement_blend: { mode: 'weighted', rank_ratio: Number(e.target.value) / 100 } })} /></label>}</Field>
    <Field label="미산출 과목 · 공동교육과정"><select aria-label="미산출 과목" value={r.no_rank_subject_policy} onChange={e => set({ no_rank_subject_policy: e.target.value as 'exclude' })}><option value="exclude">빼요</option><option value="achievement_convert">성취도 환산</option></select>
      <select aria-label="공동교육과정" value={r.joint_curriculum_policy} onChange={e => set({ joint_curriculum_policy: e.target.value as 'include' })}><option value="include">일반 과목과 같이</option><option value="exclude">빼요</option></select></Field>
    <Field label="만점"><label>교과 만점<input type="number" value={r.grade_max_score} onChange={e => set({ grade_max_score: num(e.target.value) })} /></label>
      <label>기본 점수<input type="number" value={r.base_score} onChange={e => set({ base_score: num(e.target.value) })} /></label>
      <label className="checkbox-label"><input type="checkbox" checked={!!a} onChange={e => set({ attendance_rule: e.target.checked ? newRuleDraft('').rule.attendance_rule : undefined })} /> 출결 반영</label></Field>
    {a && <Field label="출결"><label>지각 등 n회 = 결석 1일<input type="number" min={1} value={a.tardy_to_absence} onChange={e => set({ attendance_rule: { ...a, tardy_to_absence: Number(e.target.value) } })} /></label>
      <label>출결 만점<input type="number" value={a.max_score} onChange={e => set({ attendance_rule: { ...a, max_score: num(e.target.value) } })} /></label>
      {a.deduction_table.map((row, k) => <span key={k} className="deduction-row"><label>결석 ~일<input type="number" min={0} value={row.absence_max} onChange={e => set({ attendance_rule: { ...a, deduction_table: a.deduction_table.map((x, j) => j === k ? { ...x, absence_max: Number(e.target.value) } : x) } })} /></label>
        <label>감점<input type="number" min={0} value={row.points} onChange={e => set({ attendance_rule: { ...a, deduction_table: a.deduction_table.map((x, j) => j === k ? { ...x, points: Number(e.target.value) } : x) } })} /></label></span>)}</Field>}
    <Field label="소수점"><label>자리<input type="number" min={0} max={6} value={r.rounding.digits} onChange={e => set({ rounding: { ...r.rounding, digits: Number(e.target.value) } })} /></label>
      <select aria-label="반올림 방식" value={r.rounding.mode} onChange={e => set({ rounding: { ...r.rounding, mode: e.target.value as 'round' } })}><option value="round">반올림</option><option value="floor">버림</option><option value="ceil">올림</option></select></Field>
    {errors.length > 0 && <div className="warning-callout" role="alert"><strong>▲ 확인할 곳이 {errors.length}개 있어요</strong>{errors.map(e => <p key={e} className="t-body-sm">{e}</p>)}</div>}
    <details className="trace-accordion"><summary>규칙 요약 14개 항목</summary><table className="data-table"><tbody>{items.map(([l, v]) => <tr key={l}><td>{l}</td><td>{v}</td></tr>)}</tbody></table></details>
  </div>;
}
