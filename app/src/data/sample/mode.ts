import { useSyncExternalStore } from 'react';

// 샘플 모드 표시는 이 기기에만 둬요. 'on' = 샘플을 보는 중, 'off' = 지웠거나 처음부터 내 데이터가 있었음, null = 아직 정하지 않음(첫 실행).
const KEY = 'jinhak-navi-sample';
export type SampleFlag = 'on' | 'off' | null;
let memory: SampleFlag = null; // 저장소를 못 쓰는 브라우저에서도 이번 실행 동안은 띠가 보이게
const listeners = new Set<() => void>();
export function sampleFlag(): SampleFlag {
  try { const v = localStorage.getItem(KEY); return v === 'on' || v === 'off' ? v : null; } catch { return memory; }
}
export const isSampleMode = () => sampleFlag() === 'on';
export function setSampleFlag(flag: 'on' | 'off') {
  try { localStorage.setItem(KEY, flag); } catch { memory = flag; }
  listeners.forEach(l => l());
}
export function useSampleMode() {
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, isSampleMode, () => false);
}
