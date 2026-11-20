import { useState, type ReactNode } from 'react';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { Modal } from './Modal';
import { SegmentedControl } from './SegmentedControl';
import { SenderFields } from './SenderFields';
import { downloadFile } from '../io/backup';
import { checkSender, loadSender, packExchange, saveSender, type ExchangeKind, type Sender } from '../io/exchange';
import { qrSvg, toQrParts } from '../io/qrParts';

/** 학생 → 담임 보내기(수시로 상담카드·모의고사): QR로 보여주기(share-sheet) 또는 .jnavi 파일로 저장. */
export function SendToTeacher({ title, kind, payload, filename, children, onClose, onDone }: {
  title: string; kind: ExchangeKind; payload: unknown; filename: string; children: ReactNode; onClose: () => void; onDone: (message: string) => void;
}) {
  const [sender, setSender] = useState<Partial<Sender>>(loadSender), [error, setError] = useState('');
  const [mode, setMode] = useState<'qr' | 'file'>('file'), [parts, setParts] = useState<string[] | null>(null), [page, setPage] = useState(0);
  const pack = async () => { const s = checkSender(sender); saveSender(s); return { s, text: await packExchange(kind, s, payload) }; };
  const save = async () => {
    try { const { s, text } = await pack(); downloadFile(text, `${s.number}_${s.alias}_${filename}.jnavi`, 'application/json'); onDone(`${title} 파일을 저장했어요. 담임 선생님께 전달해 주세요.`); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
  };
  const showQr = async () => {
    try { setParts(toQrParts((await pack()).text)); setPage(0); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'QR을 만들지 못했어요.'); }
  };
  return <Modal label={title} onClose={onClose}><h3 className="t-heading-3">{title} 보내기</h3>
    <SegmentedControl label="보내는 방법" value={mode} onChange={m => { setMode(m); setParts(null); }} options={[{ value: 'qr', label: 'QR로 보여주기' }, { value: 'file', label: '파일로 저장' }]} />
    {parts ? <div className="qr-share">
      <div className="qr-share__code" role="img" aria-label={`${title} QR ${page + 1}/${parts.length}`} dangerouslySetInnerHTML={{ __html: qrSvg(parts[page]) }} />
      <p className="num t-heading-4">{page + 1}/{parts.length}</p>
      <p className="t-caption text-muted">선생님 PC 카메라에 맞춰 주세요. {parts.length > 1 ? '다 읽히면 다음 장으로 넘겨요.' : ''}</p>
      {parts.length > 1 && <div className="toolbar"><ButtonOutline disabled={page === 0} onClick={() => setPage(page - 1)}>이전 장</ButtonOutline><ButtonOutline disabled={page === parts.length - 1} onClick={() => setPage(page + 1)}>다음 장</ButtonOutline></div>}
      <ButtonOutline onClick={() => setParts(null)}>이름표 고치기</ButtonOutline>
    </div> : <>
      {children}
      <SenderFields value={sender} onChange={v => { setSender(v); setError(''); }} />
      {error && <p role="alert" className="error-note">{error}</p>}
      <div className="toolbar"><ButtonOutline onClick={onClose}>닫기</ButtonOutline>
        {mode === 'qr' ? <ButtonPrimary onClick={showQr}>QR 보여주기</ButtonPrimary> : <ButtonPrimary onClick={save}>파일로 저장</ButtonPrimary>}</div></>}
  </Modal>;
}
