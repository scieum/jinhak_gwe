import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { interestId } from '../domain/interests';
import { studentDb } from '../store/studentDb';
import { Icon } from './Icon';
import '../styles/interests.css';

export function InterestButton({ university, program }: { university: string; program: string }) {
  const id = interestId(university, program);
  const state = useLiveQuery(async () => {
    try { return { saved: !!await studentDb.interests.get(id), error: '' }; }
    catch { return { saved: false, error: '관심 전형 저장소를 열지 못했어요. 브라우저 저장 권한을 확인해 주세요.' }; }
  }, [id]);
  const [busy, setBusy] = useState(false), lock = useRef(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const action = state?.saved ? '관심에서 빼기' : '관심에 담기';
  return <div className="interest-control">
    <button type="button" className="interest-heart" aria-label={`${university} ${program} ${action}`} aria-pressed={state?.saved ?? false}
      disabled={!state || !!state.error || busy} onClick={async () => {
        if (!state || state.error || lock.current) return;
        lock.current = true; setBusy(true); setError(''); setMessage('');
        try {
          await studentDb.setInterest(university, program, !state.saved);
          setMessage(state.saved ? '관심 전형에서 뺐어요.' : '관심 전형에 담았어요. 이 기기에만 저장돼요.');
        } catch (e) { setError(e instanceof Error ? e.message : '관심 전형을 저장하지 못했어요. 다시 시도해 주세요.'); }
        finally { lock.current = false; setBusy(false); }
      }}><Icon name="heart" size={20} /><span>{busy ? '저장 중' : !state ? '관심 확인 중' : action}</span></button>
    {(state?.error || error) && <p className="error-note t-caption" role="alert">{state?.error || error}</p>}
    {message && <p className="t-caption text-muted" role="status">{message}</p>}
  </div>;
}
