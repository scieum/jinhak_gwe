import { useEffect, useState } from 'react';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { clearSample, showSample, useSampleMode } from '../data/sample';

export function useToast() {
  const [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 3000); return () => window.clearTimeout(t); }, [toast]);
  return [toast ? <p role="status" className="toast">{toast}</p> : null, setToast] as const;
}

/** 샘플 모드 띠(NEVER-1·2 안전장치): 모든 앱 셸 화면 머리 아래. 지우기는 확인 창 → 샘플 행만 삭제 → toast. */
export function SampleBanner() {
  const on = useSampleMode();
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [toast, setToast] = useToast();
  const run = async () => {
    setBusy(true); setError('');
    try { await clearSample(); setConfirm(false); setToast('샘플 데이터를 지웠어요 · 더보기에서 다시 볼 수 있어요'); }
    catch { setError('샘플 데이터를 지우지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  return <>
    {on && <div className="sample-band" role="note" aria-label="샘플 데이터 안내">
      <p><strong>샘플 데이터로 보는 중이에요</strong> · 실제 입결·판정이 아니에요</p>
      <ButtonOutline onClick={() => setConfirm(true)}>샘플 데이터 지우기</ButtonOutline>
    </div>}
    {confirm && <Modal label="샘플 데이터 지우기 확인" onClose={() => { if (!busy) setConfirm(false); }}>
      <h3 className="t-heading-4">샘플 데이터를 지울까요?</h3>
      <p>샘플 성적·출결, 관심 전형, 지원 전형·체크리스트·상담 할 일, 수시로 A안, 샘플 학급(2학년 3반), 관리자 검수 예시가 함께 지워져요. 내가 직접 넣은 기록은 그대로예요.</p>
      {error && <p role="alert" className="error-note">{error}</p>}
      <div className="sample-confirm__actions"><ButtonOutline disabled={busy} onClick={() => setConfirm(false)}>취소</ButtonOutline><ButtonPrimary disabled={busy} onClick={() => void run()}>지우기</ButtonPrimary></div>
    </Modal>}
    {toast}
  </>;
}

/** "샘플 데이터 다시 보기": 더보기 · 사이드바 아래(백업 옆). 샘플 모드일 때는 숨겨요. */
export function SampleReshowButton({ className = 'button-outline' }: { className?: string }) {
  const on = useSampleMode();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useToast();
  if (on) return toast;
  return <>
    <button type="button" className={className} disabled={busy} onClick={async () => {
      setBusy(true);
      try { await showSample(); setToast('샘플 데이터를 다시 넣었어요 · 내 기록은 그대로예요'); }
      catch { setToast('샘플 데이터를 넣지 못했어요. 다시 시도해 주세요.'); }
      finally { setBusy(false); }
    }}>샘플 데이터 다시 보기</button>
    {toast}
  </>;
}
