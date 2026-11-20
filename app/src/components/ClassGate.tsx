import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { Modal } from './Modal';
import { checkClass, newClassCode, parseRoster } from '../domain/classroom';
import { teacherDb, useClass, type ClassState } from '../store/teacherDb';
import '../styles/teacher.css';
import { ServerRestore } from './ServerSync';

type Ready = ClassState & { info: NonNullable<ClassState['info']> };
/** 교사 화면 공통: 학급 저장소를 읽고, 학급이 없으면 빈 상태(만들기는 우리 반 홈에서만). */
export function ClassGate({ slug, title, children, setup = false }: { slug: string; title: string; children: (c: Ready) => ReactNode; setup?: boolean }) {
  const state = useClass(), [making, setMaking] = useState(false);
  const wrap = (body: ReactNode) => <section className="student-screen teacher-screen" data-slug={slug} aria-label={title}><div className="screen-heading"><h2 className="t-heading-1">{title}</h2></div>{body}</section>;
  if (!state) return wrap(<p role="status">학급 데이터를 읽고 있어요.</p>);
  if (!state.data) return wrap(<p role="alert">{state.error}</p>);
  if (!state.data.info || !state.data.students.length) return wrap(<div className="empty-state"><h3 className="t-heading-3">아직 불러온 학생이 없어요</h3>
    <p>반 이름과 번호·별칭 명단을 넣으면 학급 코드가 생겨요. 학생은 이 코드를 넣어 카드를 보내요.</p>
    {setup && <ServerRestore />}
    {setup ? <ButtonPrimary onClick={() => setMaking(true)}>학급 만들기</ButtonPrimary> : <Link className="button-outline" to="/teacher/teacher-dashboard">우리 반 홈에서 학급 만들기 ›</Link>}
    {making && <ClassSetup onClose={() => setMaking(false)} />}</div>);
  return wrap(children(state.data as Ready));
}

export function ClassSetup({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState(''), [roster, setRoster] = useState(''), [error, setError] = useState('');
  const save = async () => {
    try {
      const students = parseRoster(roster), code = newClassCode(); checkClass(name, code);
      await teacherDb.createClass({ key: 'class', name: name.trim(), code, created_at: new Date().toISOString() }, students); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
  };
  return <Modal label="학급 만들기" onClose={onClose}><h3 className="t-heading-3">학급 만들기</h3>
    <label>반 이름<input value={name} maxLength={20} onChange={e => setName(e.target.value)} placeholder="예: 3학년 2반" /></label>
    <label>명단(한 줄에 한 명 · 번호 별칭)<textarea rows={8} value={roster} onChange={e => setRoster(e.target.value)} placeholder={'1 구름\n2 바람\n3 솔'} /></label>
    <p className="t-caption text-muted">실명 대신 별칭을 써요. 학급 데이터는 이 기기에만 저장돼요.</p>
    {error && <p role="alert" className="error-note">{error}</p>}
    <div className="toolbar"><ButtonOutline onClick={onClose}>닫기</ButtonOutline><ButtonPrimary onClick={save}>학급 만들기</ButtonPrimary></div></Modal>;
}
