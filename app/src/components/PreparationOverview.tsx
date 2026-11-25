import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline } from './Buttons';
import { Icon } from './Icon';
import { UniversityLogo } from './UniversityLogo';
import { eligibilityStates, eligibilitySummary, safeSourceUrl, stepDeadline, stepStates, type ApplicationPlan, type ChecklistStep, type EligibilityItem } from '../domain/planner';

export function usePreparationDesktop() {
  const [desktop, setDesktop] = useState(() => typeof matchMedia === 'function' && matchMedia('(min-width: 1024px)').matches);
  useEffect(() => { if (typeof matchMedia !== 'function') return; const media = matchMedia('(min-width: 1024px)'); const update = () => setDesktop(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  return desktop;
}
const stamp = (iso: string | null) => iso ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '아직 확인하지 않음';
const disclaimer = '결제·접수·서류 제출은 각각 확인해 주세요. 날짜와 완료 상태는 내가 등록한 기록이며, 접수처·대학 입학처에서 최종 확인해요. 마감 시각은 한국 시간 기준이에요.';
const eligibilityDisclaimer = '아래는 직접 작성하는 확인표예요. 공통 항목 중 적용되지 않는 것은 ‘해당 없음’으로 표시해 주세요. 추천 배정이나 최종 지원 자격은 학교·대학에 확인해요.';
function Source({ url, label = '등록한 자료 열기 ↗', compact = false }: { url: string; label?: string; compact?: boolean }) {
  return url && safeSourceUrl(url) ? <a className="t-link prep-source" href={url} target="_blank" rel="noreferrer">{label}</a> : <span className="prep-source-missing">{compact ? '미등록' : '자료 링크 미등록'}</span>;
}
function Note({ children }: { children: ReactNode }) { return <div className="disclaimer-note"><Icon name="info" size={16} /><p>{children}</p></div>; }
function Status({ item, eligibility = false }: { item: ChecklistStep | EligibilityItem; eligibility?: boolean }) {
  const icons: Record<string, string> = { pending: 'circle-dashed', progress: 'clock', done: 'check', na: 'minus', unknown: 'circle-help', met: 'check', unmet: 'triangle-alert' };
  return <span className={`prep-item-status${eligibility ? ' prep-item-status--eligibility' : ''}`}><Icon name={icons[item.status]} size={eligibility ? 12 : 16} />{eligibility ? eligibilityStates[(item as EligibilityItem).status] : stepStates[(item as ChecklistStep).status]}</span>;
}
function Deadline({ item, now, desktop }: { item: ChecklistStep; now: Date; desktop: boolean }) {
  const status = stepDeadline(item, now), icon = status === '기한 지남' ? 'calendar-x' : status === '오늘 마감' ? 'calendar-clock' : status === '예정' ? 'calendar' : '';
  return <div className={`prep-deadline${icon ? ' prep-deadline--dated' : ''}`}><span style={desktop && status === "예정" ? { fontWeight: 400 } : undefined}>{icon && <Icon name={icon} size={16} />}{status}</span>{item.due_at && <span>{desktop ? '' : ' · '}{item.due_at.replace('T', ' ')} (한국 시간)</span>}</div>;
}
interface Props {
  view: 'checklist' | 'eligibility'; applications: ApplicationPlan[]; selected: ApplicationPlan; now: Date; desktop: boolean; busy: boolean; addPlan: ReactNode;
  select: (id: string) => void; editPlan: () => void; deletePlan: () => void;
  editStep: (item: ChecklistStep) => void; editEligibility: (item: EligibilityItem) => void; deleteItem: (item: {id: string; title: string}) => void;
}
export function PreparationOverview({ view, applications, selected: plan, now, desktop, busy, addPlan, select, editPlan, deletePlan, editStep, editEligibility, deleteItem }: Props) {
  const checklist = view === 'checklist';
  const planLabel = (a: ApplicationPlan) => `${a.year} · ${a.university} · ${a.program}${a.department ? ` · ${a.department}` : ''}`;
  const selectEl = <select aria-label="준비할 전형" value={plan.id} onChange={e => select(e.target.value)}>{applications.map(a => <option key={a.id} value={a.id}>{planLabel(a)}</option>)}</select>;
  // 시안: 고른 전형 글자 바로 뒤 ▾, 넘치면 …로 함께 잘림. 보이는 글자는 span, 조작은 그 위의 투명한 select가 맡아요.
  const picker = <label className="prep-select"><span>준비할 전형</span>{checklist ? <span className="prep-select-field"><span className="prep-select-value" aria-hidden="true">{planLabel(plan)} ▾</span>{selectEl}</span> : selectEl}{!checklist && <Icon name="chevron-down" size={20} />}</label>;
  const planActions = <div className="toolbar prep-plan-actions"><ButtonOutline disabled={busy} onClick={editPlan}>전형 정보 수정</ButtonOutline><button className="prep-danger" disabled={busy} onClick={deletePlan}>전형 삭제</button></div>;
  const counts = <div className="prep-counts">{[['완료', plan.steps.filter(s => s.status === 'done').length], ['확인·진행 중', plan.steps.filter(s => s.status === 'pending' || s.status === 'progress').length], ['기한 지남', plan.steps.filter(s => stepDeadline(s, now) === '기한 지남').length], ['해당 없음', plan.steps.filter(s => s.status === 'na').length]].map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>;
  const shortcuts = <div className="prep-shortcuts"><span>{checklist ? '바로가기' : '이 전형으로 이어서'}</span><div className="toolbar"><Link className={checklist ? 'button-pill-soft' : 'button-outline'} to={`/${checklist ? 'eligibility-check' : 'application-checklist'}?plan=${encodeURIComponent(plan.id)}`}>{checklist ? '지원 자격 확인하기' : '원서·서류 확인하기'}{checklist && <span aria-hidden="true">{' ›'}</span>}</Link><Link className={checklist ? 'button-pill-soft' : 'button-outline'} to={`/counsel-tasks?plan=${encodeURIComponent(plan.id)}`}>상담 질문·할 일{checklist && <span aria-hidden="true">{' ›'}</span>}</Link><Link className={checklist ? 'button-pill-soft' : 'button-outline'} to={`/susiro?plan=${encodeURIComponent(plan.id)}`}>수시로에서 카드 담기{checklist && <span aria-hidden="true">{' ›'}</span>}</Link><Link className={checklist ? 'button-pill-soft' : 'button-outline'} to={`/calendar?plan=${encodeURIComponent(plan.id)}`}>이 전형 일정 보기{checklist && <span aria-hidden="true">{' ›'}</span>}</Link><Link className={checklist ? 'button-pill-soft' : 'button-outline'} to="/admission-results?view=interests">관심 전형 모아보기{checklist && <span aria-hidden="true">{' ›'}</span>}</Link></div></div>;
  const itemActions = (item: ChecklistStep | EligibilityItem, edit: () => void) => <div className="toolbar prep-item-actions"><ButtonOutline aria-label={`${item.title} 수정`} disabled={busy} onClick={edit}>수정</ButtonOutline><button className="prep-danger" aria-label={`${item.title} 삭제`} disabled={busy} onClick={() => deleteItem(item)}>삭제</button></div>;
  const addItem = <ButtonOutline className="prep-add-item" disabled={busy || (checklist ? plan.steps : plan.eligibility).length >= 50} onClick={() => checklist ? editStep({ id: crypto.randomUUID(), title: '', status: 'pending', note: '', source_url: '', checked_at: null, due_at: null }) : editEligibility({ id: crypto.randomUUID(), title: '', status: 'unknown', note: '', source_url: '', checked_at: null })}><Icon name="plus" size={20} />{checklist ? '체크 항목 추가' : '자격 조건 추가'}</ButtonOutline>;
  const storage = <p className="prep-storage">준비 기록은 이 브라우저에 저장돼요. <Link to="/grade-input">암호화 백업·복원</Link>에 함께 포함돼요.</p>;
  return <>
    {!desktop && <div className="prep-select-card">{picker}{addPlan}</div>}
    <article className="prep-program-card">
      {desktop && <div className="prep-select-row">{picker}{checklist && planActions}</div>}
      <div className="prep-info-row"><div className="prep-identity"><p className="prep-meta">{plan.year}학년도 · 내가 등록한 전형</p><div className="prep-name-row"><UniversityLogo university={plan.university} /><h3 aria-label={`${plan.university} · ${plan.program}`}>{plan.university}{!checklist && ` · ${plan.program}`}</h3></div><div className="prep-program-row"><span>{checklist && `${plan.program} · `}{plan.department || '모집단위 미입력'}</span><Source url={plan.source_url} /></div></div>{desktop ? checklist ? counts : planActions : planActions}</div>
      {!desktop && checklist && counts}
      {(desktop || !checklist) && shortcuts}
    </article>
    {!checklist && <div className="prep-summary"><div className="prep-summary-tile stat-tile"><span>내 확인 상태</span><strong>{eligibilitySummary(plan.eligibility)}</strong><small>내가 적은 기록 기준</small></div><div className="prep-summary-tile stat-tile"><span>확인 필요</span><strong>{plan.eligibility.filter(e => e.status === 'unknown').length}</strong><small>전체 {plan.eligibility.length}개 중</small></div><Note>{eligibilityDisclaimer}</Note></div>}
    {checklist ? <section className="prep-check-section"><div className="prep-list-heading"><h3>체크 항목 {plan.steps.length}개</h3>{desktop && addItem}</div><div className="prep-check-body">
      {desktop ? <div className="table-scroll"><table className="data-table prep-check-table"><colgroup>{[28,11,23,15,11,12].map((width,i) => <col key={i} style={{width:`${width}%`}} />)}</colgroup><thead><tr>{['항목','진행 상태','마감','확인 기록','자료','동작'].map(t => <th key={t} scope="col">{t}</th>)}</tr></thead><tbody>{plan.steps.map(s => <tr key={s.id}><th scope="row"><strong>{s.title}</strong>{s.note && <p>{s.note}</p>}</th><td><Status item={s} /></td><td><Deadline item={s} now={now} desktop /></td><td className={s.checked_at ? '' : 'text-muted'}>{stamp(s.checked_at)}</td><td><Source url={s.source_url} compact label="자료 열기 ↗" /></td><td>{itemActions(s, () => editStep(s))}</td></tr>)}</tbody></table></div> : <div className="prep-check-list">{plan.steps.map(s => <article className="prep-check-item" key={s.id}><div className="prep-item-title"><h3>{s.title}</h3><Status item={s} /></div><Deadline item={s} now={now} desktop={false} />{s.note && <p className="prep-note">{s.note}</p>}<Source url={s.source_url} label="자료 열기 ↗" /><small>확인 기록: {stamp(s.checked_at)}</small>{itemActions(s, () => editStep(s))}</article>)}</div>}
      {addItem}{desktop && <div className="prep-footnote"><Note>{disclaimer}</Note>{storage}</div>}
    </div></section> : <><div className="prep-eligibility-grid">{plan.eligibility.map(e => <article className="prep-eligibility-item" key={e.id}><div className="prep-item-title"><h3>{e.title}</h3><Status item={e} eligibility /></div><p className={`prep-note${e.note ? "" : " prep-note--empty"}`}>{e.note || '확인한 조건·근거 또는 문의할 담당자를 기록해 주세요.'}</p><Source url={e.source_url} /><small>확인 기록 {stamp(e.checked_at)}</small>{itemActions(e, () => editEligibility(e))}</article>)}</div>{addItem}{storage}</>}
    {!desktop && checklist && <>{shortcuts}<div className="prep-footnote"><Note>{disclaimer}</Note>{storage}</div></>}
  </>;
}
