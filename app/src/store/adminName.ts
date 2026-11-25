import { useSyncExternalStore } from 'react';
import { isSampleMode, useSampleMode } from '../data/sample/mode';

// 계정이 생기기 전 "관리자 ○로 로그인" 대신 쓰는 이 기기의 관리자 이름(사이드바 · 규칙 · 계열표 · 위키 공통).
// 한 번도 적지 않았고 샘플 모드면 시안의 데모 계정 "관리자 A"로 보여요. 지워서 빈 값이면 빈 값 그대로예요.
const KEY = 'jinhak-navi-reviewer';
const listeners = new Set<() => void>();
export function adminName(): string {
  let v: string | null = null;
  try { v = localStorage.getItem(KEY); } catch { /* 저장소를 못 쓰면 이번 실행 동안 빈 이름 */ }
  return v ?? (isSampleMode() ? '관리자 A' : '');
}
export function setAdminName(v: string) {
  try { localStorage.setItem(KEY, v); } catch { /* per-viewer convenience only */ }
  listeners.forEach(l => l());
}
export function useAdminName() {
  useSampleMode(); // 샘플 모드가 켜지면 기본 이름도 다시 읽어요
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, adminName, () => '');
}
