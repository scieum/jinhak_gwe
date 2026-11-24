import { useState, type ReactNode } from 'react';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { Modal } from './Modal';
import { programs } from '../data/catalog';
import { applicationIdentityChanged, safeSourceUrl, sameApplication, type ApplicationPlan } from '../domain/planner';
import { PlanSourcePicker } from './PlanSourcePicker';
import '../styles/preparation.css';

export interface PlanEditorProps {
  initial: ApplicationPlan;
  existing: boolean;
  busy: boolean;
  error: string;
  onSave: (value: ApplicationPlan) => unknown;
  onClose: () => void;
  applications?: readonly ApplicationPlan[];
  notice?: ReactNode;
  selectCatalog?: boolean;
  saveDisabled?: boolean;
}

export function PlanEditor({ initial, existing, busy, error, onSave, onClose, applications = [], notice, selectCatalog = true, saveDisabled = false }: PlanEditorProps) {
  const [draft, set] = useState(initial);
  const identityChanged = existing && applicationIdentityChanged(initial, draft);
  const setIdentity = (next: ApplicationPlan) => { const { source_selection, ...manual } = next; set({ ...manual, source_url: source_selection && next.source_url === draft.source_url ? '' : next.source_url }); };
  const duplicate = !existing && applications.some(a => sameApplication(a, draft));
  return <Modal label="지원 전형 편집" onClose={() => { if (!busy) onClose(); }}><h3 className="t-heading-3">{existing ? '지원 전형 수정' : '지원 전형 추가'}</h3><form className="prep-form" onSubmit={e => { e.preventDefault(); if (!busy && !saveDisabled) void onSave({ ...draft, updated_at: new Date().toISOString() }); }}>
    {notice}
    {selectCatalog && <PlanSourcePicker year={draft.year} disabled={busy} onSelect={selection => set({ ...draft, ...selection })} />}
    {draft.source_selection && <p className="t-caption text-muted">{draft.source_selection.round} · 선택한 대학·전형·모집단위의 원문 연결을 함께 저장해요.</p>}
    {!existing && selectCatalog && programs.length > 0 && <label>등록된 전형에서 선택<select disabled={busy} defaultValue="" onChange={e => { const p = programs.find(p => p.id === e.target.value); if (p) setIdentity({ ...draft, year: p.admission_year, university: p.university, program: p.program, department: p.department, source_url: safeSourceUrl(p.source) ? p.source : '' }); }}><option value="">직접 입력</option>{programs.map(p => <option key={p.id} value={p.id}>{p.admission_year} · {p.university} · {p.program} · {p.department}</option>)}</select></label>}
    <div className="form-grid"><label>학년도<input disabled={busy} type="number" min="2020" max="2100" required value={Number.isFinite(draft.year) ? draft.year : ''} onChange={e => setIdentity({ ...draft, year: e.target.value === '' ? NaN : Number(e.target.value) })} /></label><label>대학명<input disabled={busy} required maxLength={200} value={draft.university} onChange={e => setIdentity({ ...draft, university: e.target.value })} /></label><label>전형명<input disabled={busy} required maxLength={200} value={draft.program} onChange={e => setIdentity({ ...draft, program: e.target.value })} /></label><label>모집단위(선택)<input disabled={busy} maxLength={200} value={draft.department} onChange={e => setIdentity({ ...draft, department: e.target.value })} /></label></div>
    <label>모집요강 링크(선택)<input disabled={busy} type="url" placeholder="https://" maxLength={2000} value={draft.source_url} onChange={e => set({ ...draft, source_url: e.target.value })} /></label>
    {identityChanged && <p className="error-note">대학·전형·모집단위·학년도를 바꾸면 기존 체크 항목과 자격 조건의 확인 상태·기한·근거·메모를 초기화해요. 다른 전형을 준비하려면 ‘지원 전형 추가’를 이용해 주세요.</p>}
    {duplicate && <p className="notice">같은 학년도·대학·전형·모집단위의 준비 기록이 있어요. 기존 체크리스트와 메모를 유지하고 그 기록을 열어요.</p>}
    {error && <p role="alert" className="error-note">{error}</p>}
    <div className="toolbar"><ButtonPrimary type="submit" disabled={busy || saveDisabled}>{busy ? '저장 중' : duplicate ? '기존 준비 기록 열기' : '저장'}</ButtonPrimary><ButtonOutline disabled={busy} onClick={onClose}>취소</ButtonOutline></div>
  </form></Modal>;
}
