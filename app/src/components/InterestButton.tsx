import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useInRouterContext } from 'react-router-dom';
import { interestId } from '../domain/interests';
import { departmentsFor } from '../domain/interestComparison';
import { loadUniversityRows } from '../data/referenceCuts';
import { Modal } from './Modal';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { studentDb } from '../store/studentDb';
import { Icon } from './Icon';
import '../styles/interests.css';

/** askDepartment: 학과 없이 전형만 담는 자리(대학 상세 등)에서, 수집 입결에 그 전형 학과가 있으면 담을 때 학과를 먼저 골라요.
 *  그 전형을 어느 학과로 담았든 하트가 채워지고, 빼면 그 전형의 관심 항목을 모두 빼요. */
export function InterestButton({ university, program, department, compact = false, askDepartment = false }: { university: string; program: string; department?: string; compact?: boolean; askDepartment?: boolean }) {
  const byProgram = askDepartment && department === undefined;
  const id = interestId(university, program, department);
  const label = [university, program, department].filter(Boolean).join(' ');
  const state = useLiveQuery(async () => {
    try {
      const ids = byProgram ? (await studentDb.interests.where('university').equals(university).filter(i => i.program === program).toArray()).map(i => i.id)
        : await studentDb.interests.get(id) ? [id] : [];
      return { saved: ids.length > 0, ids, error: '' };
    }
    catch { return { saved: false, ids: [] as string[], error: '관심 전형 저장소를 열지 못했어요. 브라우저 저장 권한을 확인해 주세요.' }; }
  }, [id, byProgram]);
  const [busy, setBusy] = useState(false), lock = useRef(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [units, setUnits] = useState<string[] | null>(null), [unit, setUnit] = useState('');
  const save = async (saved: boolean, dept?: string) => {
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (!saved && byProgram) await studentDb.interests.bulkDelete(state!.ids);
      else await studentDb.setInterest(university, program, saved, dept ?? department);
      setMessage(saved ? '관심 전형에 담았어요. 이 기기에만 저장돼요.' : '관심 전형에서 뺐어요.');
    } catch (e) { setError(e instanceof Error ? e.message : '관심 전형을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const routed = useInRouterContext(), saved = message.startsWith('관심 전형에 담았어요');
  const action = state?.saved ? '관심에서 빼기' : '관심에 담기';
  return <div className={`interest-control${compact ? ' interest-control--compact' : ''}`}>
    <button type="button" className="interest-heart" title={`${label} ${action}`} aria-label={`${label} ${action}`} aria-pressed={state?.saved ?? false}
      disabled={!state || !!state.error || busy} onClick={async () => {
        if (!state || state.error || lock.current) return;
        if (state.saved || !byProgram) { await save(!state.saved); return; }
        lock.current = true; setBusy(true); setError(''); setMessage('');
        // 학과 후보를 못 읽어도 담기는 막지 않아요(될각에서 나중에 학과를 고를 수 있어요)
        const found = await loadUniversityRows(university).then(rows => departmentsFor({ id, university, program, created_at: '' }, rows)).catch(() => []);
        lock.current = false; setBusy(false);
        if (found.length) { setUnit(''); setUnits(found); } else await save(true);
      }}><Icon name="heart" size={20} /><span className={compact ? 'sr-only' : undefined}>{busy ? '저장 중' : !state ? '관심 확인 중' : action}</span></button>
    {(state?.error || error) && <p className="error-note t-caption" role="alert" title={state?.error || error} aria-label={compact ? state?.error || error : undefined}>{compact ? '저장 오류' : state?.error || error}</p>}
    {units && <Modal label="학과 고르기" onClose={() => setUnits(null)}><h3>{university} {program}</h3>
      <p>학과를 고르면 될각에서 그 학과 입결과 바로 비교해요.</p>
      <label className="interest-pick"><span className="t-caption text-muted">학과</span>
        <select className="text-input" value={unit} onChange={e => setUnit(e.target.value)}><option value="">학과를 골라 주세요</option>{units.map(u => <option key={u}>{u}</option>)}</select></label>
      <div className="toolbar"><ButtonOutline onClick={() => { setUnits(null); void save(true); }}>학과 없이 담기</ButtonOutline>
        <ButtonPrimary disabled={!unit} onClick={() => { setUnits(null); void save(true, unit); }}>이 학과로 담기</ButtonPrimary></div></Modal>}
    {message && <p className={compact ? 'sr-only' : 't-caption text-muted'} role="status">{message}{!compact && saved && routed && <> <Link className="t-link" to="/doelgak">될각에서 보기 ›</Link></>}</p>}
  </div>;
}
