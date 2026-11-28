import { useEffect, useRef, type DependencyList, type RefObject } from 'react';
import { zoomRange } from '../domain/resultBrowse';

type Range = { min: number; max: number };

/** 2026-11-28 사용자 요청: 모바일에서 입결 그래프를 두 손가락으로 벌리면 확대, 오므리면 축소(손가락 가운데 고정).
 *  그래프 안에서는 브라우저 화면 확대 대신 이 확대가 받아요(CSS touch-action: pan-y). */
export function usePinchZoom(ref: RefObject<HTMLElement | null>, range: Range, onZoom: (r: Range) => void, deps: DependencyList) {
  const rangeRef = useRef(range), cb = useRef(onZoom);
  rangeRef.current = range; cb.current = onZoom;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { d: number; center: number; from: Range } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      const layer = el.querySelector('.ar-plot__layer')?.getBoundingClientRect();
      if (e.touches.length !== 2 || !layer?.width) { start = null; return; }
      const r = rangeRef.current, mid = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const t = Math.min(1, Math.max(0, (mid - layer.left) / layer.width));
      start = { d: dist(e.touches), center: r.min + t * (r.max - r.min), from: r };
    };
    const onMove = (e: TouchEvent) => {
      if (!start || e.touches.length !== 2) return;
      e.preventDefault();
      const d = dist(e.touches);
      if (d > 10) cb.current(zoomRange(start.from, start.center, start.d / d));
    };
    const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) start = null; };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd); el.removeEventListener('touchcancel', onEnd); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
