import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useInRouterContext } from 'react-router-dom';
import { interestId } from '../domain/interests';
import { studentDb } from '../store/studentDb';
import { Icon } from './Icon';
import '../styles/interests.css';

export function InterestButton({ university, program, department, compact = false }: { university: string; program: string; department?: string; compact?: boolean }) {
  const id = interestId(university, program, department);
  const label = [university, program, department].filter(Boolean).join(' ');
  const state = useLiveQuery(async () => {
    try { return { saved: !!await studentDb.interests.get(id), error: '' }; }
    catch { return { saved: false, error: '관심 전형 저장소를 열지 못했어요. 브라우저 저장 권한을 확인해 주세요.' }; }
  }, [id]);
  const [busy, setBusy] = useState(false), lock = useRef(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const routed = useInRouterContext(), saved = message.startsWith('관심 전형에 담았어요');
  const action = state?.saved ? '관심에서 빼기' : '관심에 담기';
  return <div className={`interest-control${compact ? ' interest-control--compact' : ''}`}>
    <button type="button" className="interest-heart" title={`${label} ${action}`} aria-label={`${label} ${action}`} aria-pressed={state?.saved ?? false}
      disabled={!state || !!state.error || busy} onClick={async () => {
        if (!state || state.error || lock.current) return;
        lock.current = true; setBusy(true); setError(''); setMessage('');
        try {
          await studentDb.setInterest(university, program, !state.saved, department);
          setMessage(state.saved ? '관심 전형에서 뺐어요.' : '관심 전형에 담았어요. 이 기기에만 저장돼요.');
        } catch (e) { setError(e instanceof Error ? e.message : '관심 전형을 저장하지 못했어요. 다시 시도해 주세요.'); }
        finally { lock.current = false; setBusy(false); }
      }}><Icon name="heart" size={20} /><span className={compact ? 'sr-only' : undefined}>{busy ? '저장 중' : !state ? '관심 확인 중' : action}</span></button>
    {(state?.error || error) && <p className="error-note t-caption" role="alert" title={state?.error || error} aria-label={compact ? state?.error || error : undefined}>{compact ? '저장 오류' : state?.error || error}</p>}
    {message && <p className={compact ? 'sr-only' : 't-caption text-muted'} role="status">{message}{!compact && saved && routed && <> <Link className="t-link" to="/doelgak">될각에서 보기 ›</Link></>}</p>}
  </div>;
}
