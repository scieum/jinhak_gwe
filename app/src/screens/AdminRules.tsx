import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { ScreenActions } from '../components/ScreenActions';
import { SegmentedControl } from '../components/SegmentedControl';
import { UniversityLogo } from '../components/UniversityLogo';
import { useDesktop } from '../components/TeacherBoard';
import { downloadFile } from '../io/backup';
import { dataAsOf } from '../data/catalog';
import { validateScoringRule, type ScoringRule } from '../engine/scoring';
import {
  GROUPS, MIN_TESTS, isSample, SEMESTERS, STATUS_ORDER, approve, blockers, diffRules, newRuleDraft, newTest, nextVersion, reject, releaseRules, requestReview, runTest,
  type RuleDraft, type RuleStatus, type TestCase,
} from '../domain/ruleEditor';
import { adminDb } from '../store/adminDb';
import { isSampleId } from '../data/sample/rows';
import { setAdminName, useAdminName } from '../store/adminName';
import '../styles/teacher.css';
import '../styles/admin.css';

export const RuleStatusBadge = ({ s }: { s: RuleStatus }) => s === '검수 완료' ? <span className="judge-badge judge-safe adr-badge"><svg width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="currentColor" /></svg>검수 완료</span> : <span className="data-status-badge adr-badge">{s}</span>;
const NEVER1 = '검수 완료 전 수정안은 학생 화면에서 계산·공개하지 않아요';
const DAY = 86_400_000;
const ver = (r: ScoringRule) => `${r.admission_year}-v${r.version}`;
const fixed2 = (v: number | null) => v === null ? '–' : v.toFixed(2);
const NameField = ({ me }: { me: string }) => <label className="adr-name">관리자 이름<input value={me} onChange={e => setAdminName(e.target.value)} placeholder="예: 관리자 A" /></label>;

export function AdminRules() {
  const drafts = useLiveQuery(() => adminDb.rules.toArray(), []);
  const me = useAdminName().trim(), desktop = useDesktop(), reviewTab = useLocation().pathname.endsWith('/review');
  // undefined = 아직 고르지 않음: PC는 내가 쓰던 규칙(작성 중·반려)을 바로 열어요(시안 1440 기본 = 편집기), 모바일은 검수 목록(시안 390).
  const [openId, setOpenId] = useState<string | null | undefined>(undefined), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [bar, setBar] = useState<Element | null>(null);
  useEffect(() => { setBar(desktop ? null : document.getElementById('appbar-actions')); }, [desktop]);
  if (!drafts) return <section className="adr" data-slug="admin-rules"><p role="status">규칙을 읽고 있어요.</p></section>;
  const mineOpen = [...drafts].filter(d => d.author === me && (d.status === '작성 중' || d.status === '반려')).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const opened = drafts.find(d => d.id === (openId === undefined ? (desktop ? mineOpen?.id : null) : openId));
  const sorted = [...drafts].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.updated_at.localeCompare(a.updated_at));
  const real = drafts.filter(d => !isSample(d));
  const create = async () => { if (!me) { setError('먼저 관리자 이름을 적어 주세요.'); return; } const d = newRuleDraft(me); await adminDb.rules.put(d); setOpenId(d.id); setError(''); };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const v = JSON.parse(await file.text()) as { format?: string; drafts?: RuleDraft[] };
      if (v.format !== 'jinhak-navi-rule-drafts' || !Array.isArray(v.drafts)) throw new Error();
      const ok = v.drafts.filter(d => d && typeof d.id === 'string' && d.rule && !validateScoringRule(d.rule).length && Array.isArray(d.tests) && Array.isArray(d.history) && STATUS_ORDER.includes(d.status) && !isSampleId(d.id));
      // 검수 완료가 아닌데 verified로 온 규칙은 믿지 않아요(파일 경계). 파일로 온 규칙은 샘플 표시를 떼요.
      for (const d of ok) { delete d.sample; if (d.status !== '검수 완료') d.rule.review_status = 'draft'; const cur = await adminDb.rules.get(d.id); if (!cur || cur.updated_at < d.updated_at) await adminDb.rules.put(d); }
      setMessage(`규칙 ${ok.length}개를 합쳤어요${ok.length < v.drafts.length ? ` · ${v.drafts.length - ok.length}개는 형식이 맞지 않아 뺐어요` : ''}`); setError('');
    } catch { setError('규칙 기록 파일(.json)인지 확인해 주세요.'); }
  };
  const published = (d: RuleDraft) => drafts.filter(x => x.id !== d.id && x.status === '검수 완료' && x.rule.university === d.rule.university && x.rule.program === d.rule.program)
    .sort((a, b) => b.rule.version - a.rule.version)[0]?.rule ?? null;

  if (opened) return <section className="adr adr--editor" data-slug="admin-rules" aria-label="환산 규칙 편집">
    <RuleEditor key={opened.id} draft={opened} me={me} desktop={desktop} published={published(opened)} onClose={() => setOpenId(null)} onOpen={setOpenId} />
  </section>;

  if (!desktop) {
    // 모바일 = 조회와 승인·반려만(시안 admin-rules/390): '검수' 탭 = 검수 대기 + 최근 30일 처리(반려 · 검수 완료), '규칙 편집기' 탭 = 전체 규칙(보기 전용)
    const waiting = sorted.filter(d => d.status === '검수 대기');
    const recent = drafts.filter(d => (d.status === '반려' || d.status === '검수 완료') && Date.now() - Date.parse(d.updated_at) < 30 * DAY).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return <section className="adr adr--mobile" data-slug="admin-rules" aria-label="규칙 검수">
      <div className="screen-heading"><h2>규칙 관리</h2></div>
      {bar && createPortal(<span className="data-status-badge topbar__asof">기준일 {dataAsOf.slice(5)}</span>, bar)}
      <p className="adr-mnotice"><Icon name="info" size={20} /><span>모바일에서는 조회와 승인·반려만 해요. 편집은 PC에서 해요.</span></p>
      {!me && <NameField me={me} />}
      <section className="adr-msection">
        <div className="stat-tile"><span>검수 대기</span><strong>{waiting.length}건</strong>
          <p>{waiting.length ? `${waiting.map(d => d.rule.university || '이름 없는 규칙').join('·')} 규칙이 승인을 기다려요.` : '승인을 기다리는 규칙이 없어요.'}</p></div>
        {waiting.length > 0 && <RuleRows list={waiting} onOpen={setOpenId} />}
      </section>
      {!reviewTab && <section className="adr-msection"><h3>전체 규칙</h3><RuleRows list={sorted} onOpen={setOpenId} /></section>}
      {reviewTab && recent.length > 0 && <section className="adr-msection"><h3>최근 처리</h3><RuleRows list={recent} onOpen={setOpenId} /></section>}
      <p className="disclaimer-note"><Icon name="info" size={16} /><span>검수 완료 규칙만 배포 버전에 들어가요<br />검수 전 규칙은 학생 화면에서 계산하지 않아요</span></p>
    </section>;
  }

  return <section className="adr adr--list" data-slug="admin-rules" aria-label="규칙 편집기">
    <div className="adr-card">
      <p className="adr-band"><Icon name="info" size={20} /><span>{NEVER1}. 테스트 케이스 {MIN_TESTS}개 이상이 모두 통과해야 검수를 요청할 수 있고, 작성자가 아닌 관리자가 승인해요.</span></p>
      <div className="adr-tools"><NameField me={me} />
        <ButtonPrimary onClick={create}>새 규칙 만들기</ButtonPrimary>
        <ButtonOutline disabled={!real.length} onClick={() => downloadFile(JSON.stringify({ format: 'jinhak-navi-rule-drafts', version: 1, drafts: real }), 'rule-drafts.json', 'application/json')}>규칙 기록 내보내기</ButtonOutline>
        <label className="button-outline file-button">규칙 기록 합치기<input type="file" accept=".json" className="sr-only" aria-label="규칙 기록 파일 고르기" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
        <ButtonOutline disabled={!real.some(d => d.status === '검수 완료')} onClick={() => downloadFile(JSON.stringify(releaseRules(drafts), null, 2), 'scoring-rules.json', 'application/json')}>배포 파일 내보내기</ButtonOutline></div>
      {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status" className="toast">{message}</p>}
      {!drafts.length ? <div className="empty-state"><h3 className="t-heading-3">아직 만든 규칙이 없어요</h3><p>모집요강을 보고 대학·전형 환산 규칙을 만들어 보세요. 다른 기기의 기록은 "규칙 기록 합치기"로 가져와요.</p></div>
        : <div className="table-scroll"><table className="data-table"><thead><tr><th>대학</th><th>전형</th><th>버전</th><th>상태</th><th>테스트</th><th>작성자</th><th>검수자</th><th>수정일</th></tr></thead>
          <tbody>{sorted.map(d => { const pass = d.tests.filter(t => runTest(d.rule, t).ok).length; return <tr key={d.id}>
            <td><button className="text-button" onClick={() => setOpenId(d.id)}>{d.rule.university || '이름 없는 규칙'}</button></td><td>{d.rule.program || '–'}</td><td className="num">{ver(d.rule)}</td>
            <td><RuleStatusBadge s={d.status} /></td><td className="num">{pass}/{d.tests.length} 통과{d.tests.length < MIN_TESTS ? ` · ${MIN_TESTS - d.tests.length}개 더 필요` : ''}</td>
            <td>{d.author}</td><td>{d.reviewer ?? '–'}</td><td className="num">{d.updated_at.slice(5, 10)}</td></tr>; })}</tbody></table></div>}
      <p className="t-caption text-muted">배포 파일(scoring-rules.json)을 app/public/data/ 에 넣고 배포하면 학생 '대학별 환산'에 더해져요. 학생 앱은 파일을 다시 검사해서 검수 완료 규칙만 써요. 샘플 규칙은 배포 파일에 들어가지 않아요.</p>
    </div>
    <p className="disclaimer-note"><Icon name="info" size={16} /><span>검수 완료 규칙만 배포 파일에 들어가요 · 검수 전 규칙은 학생 화면에서 계산하지 않아요 · 규칙 기록은 이 기기에만 저장되고, 다른 관리자와는 파일로 주고받아요</span></p>
  </section>;
}

function RuleRows({ list, onOpen }: { list: RuleDraft[]; onOpen: (id: string) => void }) {
  return <ul className="adr-rows">{list.map(d => {
    const tail = d.status === '반려' ? `반려 ${d.reviewer ?? ''}` : d.status === '검수 완료' ? `검수 ${d.reviewer ?? ''}` : `테스트 ${d.tests.filter(t => runTest(d.rule, t).ok).length}/${d.tests.length}`;
    return <li key={d.id}><button type="button" onClick={() => onOpen(d.id)}>
      <UniversityLogo university={d.rule.university} />
      <span className="adr-rows__text"><span className="adr-rows__line"><strong>{d.rule.university || '이름 없는 규칙'}</strong><RuleStatusBadge s={d.status} /></span>
        <span className="adr-rows__meta">{d.rule.program || '전형'} · {ver(d.rule)} · {tail}</span></span>
      <Icon name="chevron-right" size={20} /></button></li>;
  })}</ul>;
}

function RuleEditor({ draft, me, desktop, published, onClose, onOpen }: { draft: RuleDraft; me: string; desktop: boolean; published: ScoringRule | null; onClose: () => void; onOpen: (id: string) => void }) {
  const [d, setD] = useState(draft), [error, setError] = useState(''), [message, setMessage] = useState(''), [rejecting, setRejecting] = useState(false), [confirm, setConfirm] = useState<'request' | 'approve' | null>(null);
  const [tab, setTab] = useState<'tests' | 'history'>('tests'), [sel, setSel] = useState(0), [editing, setEditing] = useState<string | null>(null);
  const [head, setHead] = useState<Element | null>(null);
  useEffect(() => { setHead(desktop ? document.querySelector('.topbar__heading') : null); }, [desktop]);
  // 모바일은 조회와 승인·반려만(편집은 PC)
  const editable = desktop && (d.status === '작성 중' || d.status === '반려') && me === d.author;
  const r = d.rule, set = (patch: Partial<ScoringRule>) => setD({ ...d, rule: { ...r, ...patch } });
  const persist = async (next: RuleDraft, ok: string) => { await adminDb.rules.put(next); setD(next); setMessage(ok); setError(''); };
  const act = async (fn: () => RuleDraft, ok: string) => { try { await persist(fn(), ok); } catch (e) { setError(e instanceof Error ? e.message : '처리하지 못했어요.'); } };
  const save = () => persist({ ...d, rule: { ...r, max_score: r.grade_max_score + (r.attendance_rule?.max_score ?? 0) }, updated_at: new Date().toISOString() }, '임시 저장했어요');
  const block = blockers(d), diff = diffRules(published, r), changed = diff.filter(x => x.changed);
  const setTest = (t: TestCase) => setD({ ...d, tests: d.tests.map(x => x.id === t.id ? t : x) });
  const runs = d.tests.map(t => runTest(r, t)), pass = runs.filter(x => x.ok).length;

  return <>
    {head && createPortal(<h1 className="adr-title">환산 규칙 편집</h1>, head)}
    {published && <ScreenActions><span className="data-status-badge topbar__asof">공개 배포 {ver(published)}</span></ScreenActions>}
    <div className="adr-layout"><div className="adr-main">
      <div className="adr-head">
        <div className="adr-head__row1"><UniversityLogo university={r.university} /><h2>{r.university || '이름 없는 규칙'} · {r.program || '전형'}</h2></div>
        <div className="adr-head__row2"><RuleStatusBadge s={d.status} />
          <span className="adr-head__meta num">{ver(r)} 수정안 · 현재 공개 {published ? ver(published) : '없음'} · 작성 {d.author}{d.reviewer ? ` · 검수 ${d.reviewer}` : ''}</span>
          {/^https:\/\//.test(r.source) && <a className="button-pill-soft" href={r.source} target="_blank" rel="noreferrer">원문 보기 ↗ {d.source_page}</a>}
          <button type="button" className="button-outline" onClick={onClose}>목록으로</button></div>
      </div>
      <p className="adr-band"><Icon name="info" size={20} /><span>{NEVER1}{published ? ` · 지금 학생 화면에는 ${ver(published)}가 보여요` : ''}</span></p>
      {d.status === '반려' && <div className="warning-callout"><strong>반려 사유{d.reviewer ? ` · ${d.reviewer}` : ''}</strong><p className="t-body-sm">{d.reject_reason}</p></div>}
      {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status" className="toast">{message}</p>}
      {!me && <NameField me={me} />}

      {editable ? <RuleForm d={d} setD={setD} set={set} /> : <>
        <h3 className="adr-formhead">{published ? `바뀐 항목 ${changed.length}` : '규칙 내용'}</h3>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>항목</th><th>현재 공개{published ? ` ${ver(published)}` : ''}</th><th>이번 수정안 {ver(r)}</th></tr></thead>
          <tbody>{diff.map(x => <tr key={x.label}><td>{x.label}</td><td>{x.before}</td><td>{x.changed && published ? <strong>{x.after}</strong> : x.after}</td></tr>)}</tbody></table></div>
        {d.status === '검수 대기' && me === d.author && <p className="t-body-sm text-muted">검수 대기 중이라 편집을 잠갔어요. 내가 작성한 규칙이에요. 다른 관리자가 검수해요.</p>}
        {(d.status === '작성 중' || d.status === '반려') && me !== d.author && <p className="t-body-sm text-muted">작성자({d.author})만 고칠 수 있어요.</p>}
        {!desktop && (d.status === '작성 중' || d.status === '반려') && me === d.author && <p className="t-body-sm text-muted">고치려면 PC에서 열어 주세요.</p>}</>}

      <div className="adr-actions">
        {editable && <><ButtonOutline onClick={save}>임시 저장</ButtonOutline>
          <ButtonPrimary disabled={block.length > 0} onClick={() => setConfirm('request')}>검수 요청</ButtonPrimary>
          {block.length > 0 && <span className="t-caption text-muted">{block[0]}</span>}</>}
        {d.status === '검수 대기' && me && me !== d.author && <><ButtonOutline onClick={() => setRejecting(true)}>반려</ButtonOutline><ButtonPrimary onClick={() => setConfirm('approve')}>승인</ButtonPrimary></>}
        {d.status === '검수 완료' && me && desktop && <ButtonOutline onClick={async () => { const n = nextVersion(d, me); delete n.sample; await adminDb.rules.put(n); onOpen(n.id); }}>새 수정안 만들기</ButtonOutline>}
      </div>
    </div>

    <aside className="adr-panel" aria-label="테스트 케이스">
      <div className="adr-panel__tabs"><SegmentedControl label="보조 패널" value={tab} onChange={setTab} options={[{ value: 'tests', label: `테스트 케이스 ${d.tests.length}` }, { value: 'history', label: '버전 기록' }]} /></div>
      {tab === 'tests' ? <>
        <div className="adr-summary"><div><strong>{pass}/{d.tests.length} 통과</strong><span>최소 {MIN_TESTS}개 · 모두 통과해야 검수 요청할 수 있어요</span></div>
          <button type="button" className="button-outline" onClick={() => setMessage(`테스트 ${d.tests.length}개를 다시 계산했어요 · ${pass}개 통과`)}>테스트 실행</button></div>
        {!d.tests.length && <p className="t-body-sm">테스트 케이스가 없어요. 가상 학생 {MIN_TESTS}명 이상을 넣고 기대값을 적어 주세요.</p>}
        <div className="adr-tests">{d.tests.map((t, i) => <TestRow key={t.id} t={t} i={i} run={runs[i]} rule={r} open={sel === i} editing={editable && editing === t.id}
          onSelect={() => { setSel(i); if (editable) setEditing(editing === t.id ? null : t.id); }} onChange={setTest}
          onDelete={() => { setD({ ...d, tests: d.tests.filter(x => x.id !== t.id) }); setEditing(null); setSel(0); }} />)}</div>
        {editable && <button type="button" className="button-pill-soft adr-add" onClick={() => { const t = newTest(d.tests.length); setD({ ...d, tests: [...d.tests, t] }); setSel(d.tests.length); setEditing(t.id); }}><Icon name="plus" size={20} />테스트 케이스 추가</button>}
      </> : <ol className="adr-history">{d.history.map((h, i) => <li key={i}><span className="num">{h.at.slice(0, 16).replace('T', ' ')} · {h.who}</span><p>{h.action}</p></li>)}</ol>}
      <p className="disclaimer-note"><Icon name="info" size={16} /><span>기대값은 대학 공식 계산기·모집요강 예시로 확인한 값이에요 · 대학 공식 자료가 최종 기준이에요</span></p>
    </aside>

    {confirm && <Modal label={confirm === 'request' ? '검수 요청' : '승인'} onClose={() => setConfirm(null)}><h3 className="t-heading-3">{confirm === 'request' ? '검수를 요청할까요?' : '승인할까요?'}</h3>
      <p>{confirm === 'request' ? `테스트 ${d.tests.length}개가 모두 통과했어요. 요청하면 검수가 끝날 때까지 편집을 잠가요.` : `승인하면 v${r.version}이 검수 완료가 되고 배포 파일에 들어갈 수 있어요.`}</p>
      <div className="toolbar"><ButtonOutline onClick={() => setConfirm(null)}>취소</ButtonOutline>
        <ButtonPrimary onClick={() => { setConfirm(null); act(() => confirm === 'request' ? requestReview({ ...d, rule: { ...r, max_score: r.grade_max_score + (r.attendance_rule?.max_score ?? 0) } }, me) : approve(d, me), confirm === 'request' ? '검수를 요청했어요' : '승인했어요'); }}>{confirm === 'request' ? '검수 요청하기' : '승인하기'}</ButtonPrimary></div></Modal>}
    {rejecting && <RejectModal author={d.author} onClose={() => setRejecting(false)} onReject={reason => { setRejecting(false); act(() => reject(d, me, reason), '반려했어요'); }} />}
    </div>
  </>;
}

function RejectModal({ author, onClose, onReject }: { author: string; onClose: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState(''), [error, setError] = useState('');
  return <Modal label="반려" onClose={onClose}><h3 className="t-heading-3">반려할까요?</h3><p className="t-body-sm">사유는 작성자({author})에게 그대로 전달돼요. 무엇을 어떻게 고치면 되는지 적어 주세요.</p>
    <label>반려 사유(필수)<textarea rows={4} maxLength={200} value={reason} aria-invalid={!!error} onChange={e => { setReason(e.target.value); setError(''); }} /></label>
    <p className="t-caption text-muted num">{reason.length}/200</p>{error && <p role="alert" className="error-note">{error}</p>}
    <div className="toolbar"><ButtonOutline onClick={onClose}>취소</ButtonOutline><ButtonPrimary onClick={() => reason.trim() ? onReject(reason) : setError('반려 사유를 적어야 반려할 수 있어요.')}>반려하기</ButtonPrimary></div></Modal>;
}

/** "전 과목 2등급 · 성취도 A · 결석 0일" / "1학년 1등급 A, 2·3학년 2등급 B · 결석 0일" */
function describe(t: TestCase) {
  const y = (['1', '2', '3'] as const).map(k => t.years[k]), same = (a: typeof y[0], b: typeof y[0]) => a.grade === b.grade && a.achievement === b.achievement;
  const grades = same(y[0], y[1]) && same(y[1], y[2]) ? `전 과목 ${y[0].grade}등급 · 성취도 ${y[0].achievement}`
    : same(y[1], y[2]) ? `1학년 ${y[0].grade}등급 ${y[0].achievement}, 2·3학년 ${y[1].grade}등급 ${y[1].achievement}`
    : y.map((v, k) => `${k + 1}학년 ${v.grade}등급 ${v.achievement}`).join(', ');
  return `${grades} · ${t.absence ? `미인정 결석 ${t.absence}일` : '결석 0일'}${t.tardy ? ` · 지각·조퇴·결과 ${t.tardy}회` : ''}`;
}

function TestRow({ t, i, run, rule, open, editing, onSelect, onChange, onDelete }: { t: TestCase; i: number; run: ReturnType<typeof runTest>; rule: ScoringRule; open: boolean; editing: boolean; onSelect: () => void; onChange: (t: TestCase) => void; onDelete: () => void }) {
  const year = (y: '1' | '2' | '3', patch: Partial<TestCase['years']['1']>) => onChange({ ...t, years: { ...t.years, [y]: { ...t.years[y], ...patch } } });
  // 과목별 · 학년별 줄은 길어서 빼고 마지막 묶음 단계 3개 + 합계만 보여요(시안 trace 4줄)
  const steps = run.trace.filter(s => !('subject_id' in s) && s.value !== undefined).slice(-4), total = steps.at(-1);
  return <article className="adr-test">
    <button type="button" className="adr-test__line" aria-expanded={open} onClick={onSelect}><strong>테스트 {i + 1} · {t.name}</strong>
      {run.ok ? <span className="data-status-badge adr-badge">통과</span> : <span className="judge-badge judge-risk adr-badge">■ 불통과</span>}</button>
    <p className="adr-test__desc">{describe(t)}</p>
    <p className="adr-test__nums num">기대 {fixed2(t.expected)} · 계산 {fixed2(run.actual)}{run.reason && ` · ${run.reason}`}</p>
    {editing && <div className="adr-test__edit">{(['1', '2', '3'] as const).map(y => <div key={y} className="adr-test__year"><span>{y}학년</span>
      <select aria-label={`테스트 ${i + 1} ${y}학년 등급`} value={t.years[y].grade} onChange={e => year(y, { grade: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g}등급</option>)}</select>
      <select aria-label={`테스트 ${i + 1} ${y}학년 성취도`} value={t.years[y].achievement} onChange={e => year(y, { achievement: e.target.value as 'A' })}>{['A', 'B', 'C', 'D', 'E'].map(a => <option key={a}>{a}</option>)}</select></div>)}
      <div className="adr-test__nums-edit"><label>미인정 결석<input type="number" min={0} value={t.absence} onChange={e => onChange({ ...t, absence: Math.max(0, Number(e.target.value)) })} /></label>
        <label>지각·조퇴·결과<input type="number" min={0} value={t.tardy} onChange={e => onChange({ ...t, tardy: Math.max(0, Number(e.target.value)) })} /></label>
        <label>기대값<input type="number" step="0.01" aria-label={`테스트 ${i + 1} 기대값`} value={t.expected} onChange={e => onChange({ ...t, expected: Number(e.target.value) })} /></label></div>
      <button type="button" className="button-danger-text" onClick={onDelete}>이 테스트 빼기</button></div>}
    {open && <details className="trace-accordion" open><summary><span>어떻게 계산했나요?</span><Icon name="chevron-down" size={20} /></summary>
      <dl>{steps.slice(0, -1).map((s, k) => <div key={k}><dt title={s.detail}>{s.detail}</dt><dd className="num">{fixed2(s.value!)}</dd></div>)}
        {total && <div className="adr-total"><dt>합계</dt><dd className="num">{fixed2(total.value!)}</dd></div>}</dl>
      <p className="disclaimer-note"><Icon name="info" size={16} /><span>{ver(rule)} 수정안으로 계산했어요</span></p></details>}
  </article>;
}

const Row = ({ label, children, tall }: { label: string; children: ReactNode; tall?: boolean }) =>
  <div className={`adr-row${tall ? ' adr-row--tall' : ''}`}><span className="adr-row__label">{label}</span><div className="adr-row__control">{children}</div></div>;
const Group = ({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) =>
  <section className="adr-group" aria-label={title}><h4><span>{title}</span>{extra}</h4>{children}</section>;
const num = (v: string) => (v === '' ? NaN : Number(v));
const Cell = ({ label, value, onChange, aria }: { label: string; value: string | number; onChange: (v: string) => void; aria: string }) =>
  <label className="adr-cell"><span>{label}</span><input inputMode="decimal" aria-label={aria} value={Number.isNaN(value) ? '' : value} onChange={e => onChange(e.target.value)} /></label>;
const Seg = <T extends string>({ width, ...p }: { width: number; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) =>
  <div className="adr-seg" style={{ width }}><SegmentedControl {...p} /></div>;
const minus = (p: number) => p ? `−${p}` : '0';
const absLabel = (rows: { absence_max: number }[], k: number) => {
  const from = k ? rows[k - 1].absence_max + 1 : 0, to = rows[k].absence_max;
  return to >= 365 ? `${from}일 이상` : from === to ? `결석 ${to}일` : `${from}~${to}일`;
};

function RuleForm({ d, setD, set }: { d: RuleDraft; setD: (d: RuleDraft) => void; set: (p: Partial<ScoringRule>) => void }) {
  const r = d.rule, a = r.attendance_rule;
  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];
  const errors = validateScoringRule({ ...r, max_score: r.grade_max_score + (a?.max_score ?? 0) });
  const weights = r.year_weights, wsum = weights ? Object.values(weights).reduce((x, y) => x + y, 0) : 0;
  const rank = Math.round((r.achievement_blend.rank_ratio ?? 0) * 100);
  const chip = (on: boolean, label: string, onClick: () => void) => <button key={label} type="button" className="filter-chip" aria-pressed={on} onClick={onClick}>{label}</button>;
  // 새 규칙은 기본 정보부터, 이미 이름이 있으면 맨 아래(시안 1440은 규칙 요소부터 보여요)
  const fresh = !r.university.trim() || !r.program.trim();
  const basics = <Group title="기본 정보">
    <Row label="대학"><input className="adr-wide" value={r.university} maxLength={40} onChange={e => set({ university: e.target.value })} placeholder="예: 가나대학교" aria-label="대학" /></Row>
    <Row label="전형"><input className="adr-wide" value={r.program} maxLength={60} onChange={e => set({ program: e.target.value })} placeholder="예: 학생부교과(지역균형)" aria-label="전형" /></Row>
    <Row label="학년도"><input type="number" value={r.admission_year} onChange={e => set({ admission_year: Number(e.target.value) })} aria-label="학년도" /></Row>
    <Row label="원문 주소(https)"><input className="adr-wide" value={r.source} onChange={e => set({ source: e.target.value.trim() })} placeholder="https://… 모집요강 PDF" aria-label="원문 주소(https)" /></Row>
    <Row label="원문 쪽"><input value={d.source_page} maxLength={20} onChange={e => setD({ ...d, source_page: e.target.value })} placeholder="예: p.42" aria-label="원문 쪽" /></Row>
  </Group>;
  return <div className="adr-form">
    <div className="adr-formrow"><h3 className="adr-formhead">규칙 요소</h3>{d.ai_draft && <><span className="ai-label">AI 초안 · 참고용</span><span className="adr-cap">모집요강에서 뽑은 초안이에요. 원문과 대조해 고쳐 주세요.</span></>}</div>
    {fresh && basics}
    <Group title="반영 학년·학기">
      <Row label="반영 학기">{SEMESTERS.filter(s => s !== '3-2' || r.semesters.includes(s)).map(s => chip(r.semesters.includes(s), s, () => set({ semesters: SEMESTERS.filter(x => toggle(r.semesters, s).includes(x)) })))}</Row>
      <Row label="학년 가중">{(['1', '2', '3'] as const).map(y => <input key={y} inputMode="decimal" aria-label={`${y}학년 가중`} value={weights?.[y] ?? ''} placeholder="–"
        onChange={e => { const w = { ...(weights ?? {}) }; if (e.target.value === '') delete w[y]; else w[y] = Number(e.target.value); set({ year_weights: Object.keys(w).length ? w : undefined }); }} />)}
        <span className="adr-cap">{weights ? `합 ${wsum.toFixed(1)}` : '비우면 학년 가중 없음'}</span></Row>
    </Group>
    <Group title="반영 교과·과목 선택">
      <Row label="반영 교과">{GROUPS.map(g => chip(r.subject_groups.includes(g), g, () => set({ subject_groups: GROUPS.filter(x => toggle(r.subject_groups, g).includes(x)) })))}</Row>
      <Row label="과목 선택"><Seg width={420} label="과목 선택" value={r.selection.mode} onChange={mode => set({ selection: { mode, n: r.selection.n ?? 3 } })}
        options={[{ value: 'all', label: '전 과목' }, { value: 'top_n_per_group', label: '교과군별 상위 N' }, { value: 'top_n_total', label: '전체 상위 N' }]} />
        <input className="adr-n" inputMode="numeric" aria-label="상위 N" disabled={r.selection.mode === 'all'} placeholder="–" value={r.selection.mode === 'all' ? '' : r.selection.n ?? ''} onChange={e => set({ selection: { ...r.selection, n: Number(e.target.value) } })} /></Row>
      <Row label="학점 가중"><Seg width={200} label="학점 가중" value={r.credit_weighted ? 'y' : 'n'} onChange={v => set({ credit_weighted: v === 'y' })} options={[{ value: 'y', label: '예' }, { value: 'n', label: '아니오' }]} /></Row>
      <Row label="공동교육과정"><Seg width={280} label="공동교육과정" value={r.joint_curriculum_policy} onChange={v => set({ joint_curriculum_policy: v })} options={[{ value: 'include', label: '일반 과목과 같이' }, { value: 'exclude', label: '제외' }]} /></Row>
    </Group>
    <Group title="등급·성취도 점수표">
      <Row label="석차등급 점수" tall>{['1', '2', '3', '4', '5'].map(k => <Cell key={k} label={`${k}등급`} aria={`${k}등급 점수`} value={r.rank_grade_points[k] ?? ''} onChange={v => set({ rank_grade_points: { ...r.rank_grade_points, [k]: num(v) } })} />)}</Row>
      <Row label="성취도 점수" tall>{['A', 'B', 'C', 'D', 'E'].map(k => <Cell key={k} label={k} aria={`성취도 ${k} 점수`} value={r.achievement_points?.[k] ?? ''} onChange={v => set({ achievement_points: { ...r.achievement_points, [k]: num(v) } })} />)}</Row>
      <Row label="성취도 병행 반영"><Seg width={264} label="성취도 병행 반영" value={r.achievement_blend.mode} onChange={mode => set({ achievement_blend: { mode, rank_ratio: r.achievement_blend.rank_ratio ?? 0.8 } })}
        options={[{ value: 'none', label: '안 함' }, { value: 'weighted', label: '비율 반영' }, { value: 'max', label: '높은 쪽' }]} />
        {r.achievement_blend.mode === 'weighted' && <><span className="adr-cap">등급</span><input className="adr-n" inputMode="numeric" aria-label="등급 비율" value={rank} onChange={e => set({ achievement_blend: { mode: 'weighted', rank_ratio: Number(e.target.value) / 100 } })} />
          <span className="adr-cap">성취도</span><input className="adr-n" inputMode="numeric" aria-label="성취도 비율" value={100 - rank} onChange={e => set({ achievement_blend: { mode: 'weighted', rank_ratio: (100 - Number(e.target.value)) / 100 } })} /><span className="adr-cap">합 100</span></>}</Row>
      <Row label="미산출 과목"><Seg width={300} label="미산출 과목" value={r.no_rank_subject_policy} onChange={v => set({ no_rank_subject_policy: v })} options={[{ value: 'exclude', label: '제외' }, { value: 'achievement_convert', label: '성취도 환산' }, { value: 'bonus', label: '가산' }]} /></Row>
    </Group>
    <Group title="출결 감점표" extra={<label className="adr-check"><input type="checkbox" checked={!!a} onChange={e => set({ attendance_rule: e.target.checked ? newRuleDraft('').rule.attendance_rule : undefined })} /> 출결 반영</label>}>
      {a && <><Row label="출결 환산"><span className="adr-text">미인정 지각·조퇴·결과</span><input className="adr-n" inputMode="numeric" aria-label="결석 1일로 보는 지각 횟수" value={a.tardy_to_absence} onChange={e => set({ attendance_rule: { ...a, tardy_to_absence: Number(e.target.value) } })} /><span className="adr-text">회 = 결석 1일</span></Row>
        <Row label="감점 구간" tall>{a.deduction_table.map((row, k) => <Cell key={k} label={absLabel(a.deduction_table, k)} aria={`${absLabel(a.deduction_table, k)} 감점`} value={minus(row.points)}
          onChange={v => set({ attendance_rule: { ...a, deduction_table: a.deduction_table.map((x, j) => j === k ? { ...x, points: Math.abs(num(v.replace(/[−-]/g, ''))) } : x) } })} />)}</Row></>}
    </Group>
    <Group title="만점·반올림">
      <Row label="만점"><span className="adr-cap">교과</span><input className="adr-n" inputMode="decimal" aria-label="교과 만점" value={Number.isNaN(r.grade_max_score) ? '' : r.grade_max_score} onChange={e => set({ grade_max_score: num(e.target.value) })} />
        {a && <><span className="adr-cap">출결</span><input className="adr-n" inputMode="decimal" aria-label="출결 만점" value={Number.isNaN(a.max_score) ? '' : a.max_score} onChange={e => set({ attendance_rule: { ...a, max_score: num(e.target.value) } })} /></>}
        <span className="adr-cap">= {r.grade_max_score + (a?.max_score ?? 0)}</span></Row>
      <Row label="소수점"><input className="adr-n" inputMode="numeric" aria-label="소수점 자리" value={r.rounding.digits} onChange={e => set({ rounding: { ...r.rounding, digits: Number(e.target.value) } })} /><span className="adr-cap">자리</span>
        <Seg width={240} label="반올림 방식" value={r.rounding.mode} onChange={mode => set({ rounding: { ...r.rounding, mode } })} options={[{ value: 'round', label: '반올림' }, { value: 'floor', label: '버림' }, { value: 'ceil', label: '올림' }]} /></Row>
      <Row label="기본 점수"><input className="adr-n" inputMode="decimal" aria-label="기본 점수" value={Number.isNaN(r.base_score) ? '' : r.base_score} onChange={e => set({ base_score: num(e.target.value) })} /></Row>
    </Group>
    {!fresh && basics}
    {errors.length > 0 && <div className="warning-callout" role="alert"><strong>확인할 곳이 {errors.length}개 있어요</strong>{errors.map(e => <p key={e} className="t-body-sm">{e}</p>)}</div>}
  </div>;
}
