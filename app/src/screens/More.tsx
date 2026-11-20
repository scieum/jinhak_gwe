import { Link } from 'react-router-dom';
import { NAV, type Mode } from '../shell/nav';
import { ModeSwitch } from '../shell/ModeSwitch';
import { useState } from 'react';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Modal } from '../components/Modal';
import { studentDb } from '../store/studentDb';

// 모바일 "더보기": 모드 전환·로그인 진입. 설정·잠금은 아직 없다.
export function More({ mode }: { mode: Mode }) {
  const [confirm, setConfirm] = useState(false), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="student-screen">
      {mode !== 'admin' && <ModeSwitch mode={mode} />}
      <Link className="t-link more-link" to="/login">
        교사·관리자 로그인
      </Link>
      {mode === 'student' && <><Link to="/grade-input" className="button-outline">학생 기록 백업·복원</Link><ButtonOutline onClick={() => setConfirm(true)}>이 기기의 학생 데이터 지우기</ButtonOutline><p role="status">{message}</p></>}
      {mode === 'teacher' && <nav className="more-features" aria-label="학생 기능"><h2 className="t-heading-3">학생 기능</h2>
        <p className="t-caption text-muted">교사 모드에서도 학생 화면을 모두 쓸 수 있어요. 여기 기록은 이 기기의 학생 저장소에 남아요.</p>
        {NAV.student.map(g => <div key={g.label}><h3 className="t-heading-4">{g.label}</h3><ul>{g.items.map(i => <li key={i.path}><Link to={i.path}>{i.label}</Link></li>)}</ul></div>)}</nav>}
      {confirm && <Modal label="학생 데이터 삭제 확인" onClose={() => { if (!busy) setConfirm(false); }}><h3 className="t-heading-3">이 기기의 학생 기록을 지울까요?</h3><p>성적·출결·모의고사, 관심 전형, 지원 전형·수시로·체크리스트·자격 확인, 상담 질문·할 일을 모두 지워요. 이 작업은 되돌릴 수 없으니 필요한 기록은 먼저 암호화 백업으로 내려받아 주세요.</p><ButtonPrimary disabled={busy} onClick={async () => {
        setBusy(true);
        try { await studentDb.clearStudentData(); setConfirm(false); setMessage('이 기기의 학생 데이터를 지웠어요.'); }
        catch { setMessage('데이터를 지우지 못했어요. 다시 시도해 주세요.'); }
        finally { setBusy(false); }
      }}>학생 기록 모두 지우기</ButtonPrimary><ButtonOutline disabled={busy} onClick={() => setConfirm(false)}>취소</ButtonOutline></Modal>}
    </section>
  );
}
