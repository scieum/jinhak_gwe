import { Link } from 'react-router-dom';
import type { Mode } from '../shell/nav';
import { ModeSwitch } from '../shell/ModeSwitch';

// 모바일 "더보기": 모드 전환·로그인 진입. 설정·잠금은 아직 없다.
export function More({ mode }: { mode: Mode }) {
  return (
    <section className="placeholder">
      {mode !== 'admin' && <ModeSwitch mode={mode} />}
      <Link className="t-link more-link" to="/login">
        교사·관리자 로그인
      </Link>
    </section>
  );
}
