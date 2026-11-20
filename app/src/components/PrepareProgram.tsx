import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { admissionYear } from '../data/catalog';
import { newApplication, type ApplicationPlan } from '../domain/planner';
import { studentDb, usePlanner } from '../store/studentDb';
import { PlanEditor } from './PlanEditor';

export function PrepareProgram({ university, program }: { university: string; program: string }) {
  const [draft, setDraft] = useState<ApplicationPlan | null>(null);
  return <><button type="button" className="button-outline" aria-label={`${university} ${program} 지원 준비에 추가`} onClick={() => setDraft({ ...newApplication(admissionYear), university, program })}>지원 준비에 추가</button>
    {draft && <PrepareEditor initial={draft} onClose={() => setDraft(null)} />}
  </>;
}

function PrepareEditor({ initial, onClose }: { initial: ApplicationPlan; onClose: () => void }) {
  const state = usePlanner(), navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const save = async (value: ApplicationPlan) => {
    if (!state?.data || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await studentDb.addApplication(value);
      navigate(`/application-checklist?plan=${encodeURIComponent(result.id)}`);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : '지원 준비 기록을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <PlanEditor initial={initial} existing={false} applications={state?.data?.applications} selectCatalog={false}
    busy={busy} saveDisabled={!state?.data} error={error || state?.error || ''} onSave={save} onClose={onClose}
    notice={<><p className="notice">지원할 학년도와 모집단위를 확인해 주세요. 대학·전형 이름만 가져왔어요. 올해 모집요강에서 전형명·지원 자격·일정을 확인한 뒤 준비 기록을 만들어요.</p>
      {!state && <p role="status">기존 준비 기록을 확인하고 있어요.</p>}
      <p className="t-caption text-muted">저장하면 원서·서류 체크리스트로 이동해요. 관심 목록은 유지되고, 수시로에서는 직접 카드를 선택해 담을 수 있어요.</p></>} />;
}
