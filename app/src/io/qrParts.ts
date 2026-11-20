import qrcode from 'qrcode-generator';

/**
 * .jnavi 교환 파일 내용을 QR 여러 장으로 나눠요(card-collect ST2 "카드 2/3장").
 * 한 장 = "JN1:<묶음 id>:<번호>/<전체>:<base64 조각>". 내용은 파일과 똑같아서 교사 쪽은 같은 검사(readExchange)를 거쳐요.
 */
const PREFIX = 'JN1', CHUNK = 600;
const toBase64 = (text: string) => { let s = ''; for (const b of new TextEncoder().encode(text)) s += String.fromCharCode(b); return btoa(s); };
const fromBase64 = (b64: string) => new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

export function toQrParts(text: string, chunk = CHUNK): string[] {
  const data = toBase64(text), id = Math.random().toString(36).slice(2, 8), total = Math.max(1, Math.ceil(data.length / chunk));
  if (total > 20) throw new Error('카드가 너무 길어 QR로 보낼 수 없어요. 파일로 저장해 주세요.');
  return Array.from({ length: total }, (_, i) => `${PREFIX}:${id}:${i + 1}/${total}:${data.slice(i * chunk, (i + 1) * chunk)}`);
}

export function qrSvg(part: string): string {
  const q = qrcode(0, 'M'); q.addData(part, 'Byte'); q.make();
  return q.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
}

export interface QrProgress { id: string; have: number; total: number; text?: string }
/** 찍은 QR을 모아요. 진학 내비 QR이 아니면 null, 다 모이면 text가 채워져요. */
export class QrCollector {
  private parts = new Map<string, { total: number; got: Map<number, string> }>();
  add(raw: string): QrProgress | null {
    const m = raw.match(/^JN1:([a-z0-9]{1,12}):(\d{1,2})\/(\d{1,2}):([A-Za-z0-9+/=]*)$/);
    if (!m) return null;
    const [, id, n, t, data] = m, index = Number(n), total = Number(t);
    if (!total || index < 1 || index > total) return null;
    const entry = this.parts.get(id) ?? { total, got: new Map() };
    if (entry.total !== total) return null;
    entry.got.set(index, data); this.parts.set(id, entry);
    const progress: QrProgress = { id, have: entry.got.size, total };
    if (entry.got.size === total) {
      this.parts.delete(id);
      try { progress.text = fromBase64(Array.from({ length: total }, (_, i) => entry.got.get(i + 1)).join('')); } catch { return null; }
    }
    return progress;
  }
}
