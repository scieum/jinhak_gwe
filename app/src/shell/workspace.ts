import { modeOf, type Mode } from './nav';

// PRD 7-3: 교사 모드 = 학생 모드 기능 전체 + 교사 기능. 교사로 들어온 뒤 학생 화면(/home 등)을 열어도 교사 셸을 유지해요.
const KEY = 'jinhak-navi-workspace';
export function workspaceOf(pathname: string): Mode {
  const mode = modeOf(pathname);
  try {
    if (mode === 'teacher') sessionStorage.setItem(KEY, 'teacher');
    else if (mode === 'student' && sessionStorage.getItem(KEY) === 'teacher') return 'teacher';
  } catch { /* 저장소를 못 쓰면 경로대로 */ }
  return mode;
}
export function leaveTeacher() { try { sessionStorage.removeItem(KEY); } catch { /* 없음 */ } }
