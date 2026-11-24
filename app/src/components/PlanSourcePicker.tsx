import { useEffect, useState } from 'react';
import { loadMinimumReferenceIndex, loadMinimumReferencePackage } from '../data/minimumReferences';
import { applicationFromMinimumScope, type MinimumReferenceEntry, type MinimumReferencePackage } from '../domain/minimumReferences';
import { ButtonOutline } from './Buttons';

export function PlanSourcePicker({ year, disabled, onSelect }: { year: number; disabled: boolean; onSelect: (value: ReturnType<typeof applicationFromMinimumScope>) => void }) {
  const [open, setOpen] = useState(false), [entries, setEntries] = useState<MinimumReferenceEntry[] | null>(null);
  const [query, setQuery] = useState(''), [packageId, setPackageId] = useState(''), [programId, setProgramId] = useState(''), [unitId, setUnitId] = useState('');
  const [data, setData] = useState<MinimumReferencePackage | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    let live = true; setError('');
    loadMinimumReferenceIndex().then(index => { if (live) setEntries(index.entries); }, () => { if (live) setError('전형 자료 목록을 읽지 못했어요. 다시 시도해 주세요.'); });
    return () => { live = false; };
  }, [open, attempt]);
  const entry = entries?.find(e => e.package_id === packageId && e.admission_year === year);
  useEffect(() => {
    setData(null); setProgramId(''); setUnitId('');
    if (!entry || !open) return;
    let live = true; setError('');
    loadMinimumReferencePackage(entry).then(value => { if (live) setData(value); }, () => { if (live) setError('선택한 대학의 전형 자료를 읽지 못했어요. 다시 시도해 주세요.'); });
    return () => { live = false; };
  }, [entry, open, attempt]);
  const catalog = entries?.filter(e => e.admission_year === year) ?? [];
  const filtered = catalog.filter(e => `${e.university} ${e.campus}`.replace(/\s/g, '').includes(query.replace(/\s/g, '')) || e.package_id === packageId);
  // An old asynchronous response must never become selectable under a new university/year.
  const ready = data?.package_id === entry?.package_id && data?.admission_year === year ? data : null;
  const programs = [...new Map(ready?.rows.map(r => [r.program_id, r]) ?? []).values()];
  const units = ready?.rows.filter(r => r.program_id === programId) ?? [];
  const selected = units.find(r => r.unit_id === unitId);
  return <details className="prep-source-picker" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>전형 자료에서 찾아 입력</summary>
    {open && <div className="prep-form">
      <p className="t-caption text-muted">{Number.isFinite(year) ? `${year}학년도` : '학년도 입력 후'} 대학·캠퍼스와 모집단위를 골라요. 검수 전 참고자료이며 지원 자격·일정·충족 여부는 자동 확인하지 않아요.</p>
      {!entries && !error && <p role="status">전형 자료 목록을 읽고 있어요.</p>}
      {error && <div role="alert"><p>{error}</p><ButtonOutline disabled={disabled} onClick={() => setAttempt(n => n + 1)}>전형 자료 다시 읽기</ButtonOutline></div>}
      {entries && !catalog.length && <p>이 학년도의 연결 자료가 아직 없어요. 아래에서 직접 입력할 수 있어요.</p>}
      {!!catalog.length && <>
        <label>대학·캠퍼스 검색<input disabled={disabled} value={query} onChange={e => setQuery(e.target.value)} /></label>
        <label>자료 대학·캠퍼스<select disabled={disabled} value={entry?.package_id ?? ''} onChange={e => { setPackageId(e.target.value); setData(null); setProgramId(''); setUnitId(''); }}>
          <option value="">대학·캠퍼스 선택</option>{filtered.map(e => <option key={e.package_id} value={e.package_id}>{e.university} · {e.campus}</option>)}
        </select></label>
        {entry && !ready && !error && <p role="status">선택한 대학의 전형을 읽고 있어요.</p>}
        {ready && <>
          {!programs.length ? <p>연결된 전형이 아직 없어요. 아래에서 직접 입력할 수 있어요.</p> : <>
            <label>자료 전형·모집시기<select disabled={disabled} value={programId} onChange={e => { setProgramId(e.target.value); setUnitId(''); }}>
              <option value="">전형 선택</option>{programs.map(p => <option key={p.program_id} value={p.program_id}>{p.round} · {p.program}</option>)}
            </select></label>
            <label>자료 모집단위<select disabled={disabled || !programId} value={unitId} onChange={e => setUnitId(e.target.value)}>
              <option value="">모집단위 선택</option>{units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.unit}</option>)}
            </select></label>
          </>}
        </>}
        <ButtonOutline disabled={disabled || !entry || !ready || !selected} onClick={() => {
          if (entry && ready && selected) { onSelect(applicationFromMinimumScope(entry, ready, selected)); setOpen(false); }
        }}>선택한 전형 적용</ButtonOutline>
      </>}
    </div>}
  </details>;
}
