import { useEffect, useRef, useState } from 'react';
import { ButtonOutline } from './Buttons';
import { QrCollector, type QrProgress } from '../io/qrParts';

// 크롬·엣지 내장 바코드 인식. 사파리·파이어폭스에는 없어서 파일로 받기로 안내해요.
interface Detector { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> }
declare global { interface Window { BarcodeDetector?: new (o: { formats: string[] }) => Detector } }
export const canScanQr = () => typeof window !== 'undefined' && !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia;

/** card-collect ST2: 카메라를 열어 둔 채 여러 학생 QR을 이어서 읽어요. 카메라 화면은 이 기기 안에서만 써요. */
export function QrScanner({ onText, onFallback }: { onText: (text: string) => void; onFallback: () => void }) {
  const video = useRef<HTMLVideoElement>(null), collector = useRef(new QrCollector()), seen = useRef(new Set<string>());
  const [progress, setProgress] = useState<QrProgress | null>(null), [failed, setFailed] = useState(!canScanQr());
  const handler = useRef(onText); handler.current = onText;
  useEffect(() => {
    if (!canScanQr()) return;
    let stream: MediaStream | null = null, timer = 0, stopped = false;
    const detector = new window.BarcodeDetector!({ formats: ['qr_code'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        video.current!.srcObject = stream; await video.current!.play();
        timer = window.setInterval(async () => {
          if (!video.current || video.current.readyState < 2) return;
          for (const { rawValue } of await detector.detect(video.current).catch(() => [])) {
            if (seen.current.has(rawValue)) continue;
            seen.current.add(rawValue);
            const p = collector.current.add(rawValue);
            if (!p) continue;
            setProgress(p);
            if (p.text) handler.current(p.text);
          }
        }, 300);
      } catch { setFailed(true); }
    })();
    return () => { stopped = true; window.clearInterval(timer); stream?.getTracks().forEach(t => t.stop()); };
  }, []);
  if (failed) return <div className="qr-scanner__fail" role="alert"><p><span className="judge-risk-mark">■</span> 카메라를 쓸 수 없어요. 브라우저에서 카메라를 허용하거나 파일로 받기를 골라 주세요. (크롬·엣지에서 QR을 읽을 수 있어요)</p>
    <ButtonOutline onClick={onFallback}>파일로 받기</ButtonOutline></div>;
  return <div className="qr-scanner">
    <p className="t-body">학생 화면의 QR을 네모 안에 맞춰 주세요</p>
    <div className="qr-scanner__view"><video ref={video} muted playsInline aria-label="카메라 화면" /><i className="qr-scanner__guide" aria-hidden="true" /></div>
    <p role="status" aria-live="polite" className="t-body num">{progress ? (progress.text ? `카드 ${progress.total}/${progress.total}장을 다 읽었어요` : `카드 ${progress.have}/${progress.total}장 읽었어요`) : '아직 읽은 QR이 없어요'}</p>
    {progress && <div className="progress-bar" aria-hidden="true"><i style={{ width: `${(progress.have / progress.total) * 100}%` }} /></div>}
    <p className="t-caption text-muted">다 읽으면 다음 학생 QR을 바로 이어서 찍어요. 카메라는 닫지 않아요.</p>
  </div>;
}
