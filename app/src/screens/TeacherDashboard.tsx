import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Modal } from '../components/Modal';
import { studentLabel, submissionRows, type SubmissionRow } from '../domain/classroom';
import { decline, schoolAverage, type SchoolGrades } from '../domain/scoreImport';
import { g5ToPct, pctToG9, verified } from '../engine/fiveToNine';
import type { ConversionConfig } from '../engine/fiveToNineTypes';
import fiveToNineConfig from '../data/conversion-config.json';
import { teacherDb } from '../store/teacherDb';
import { announceLockChange } from '../components/TeacherLock';
import { ServerSync } from '../components/ServerSync';
import { LOCK_MINUTES, clearLock, loadLock, saveLock } from '../domain/teacherLock';

export const counselPath = (number: string) => `/teacher/counsel?n=${number}`;
export function WarningBadge({ count }: { count: number }) {
  return count ? <span className="judge-badge judge-reach">▲ 경고 {count}</span> : <span className="text-muted">–</span>;
}

/** 환산 9등급(A-1, 학생 5 to 9와 같은 설정). R-CONV-003이 검수 전이면 계산하지 않아요(NEVER-1). */
export function g9Label(g5: number | null) {
  if (g5 === null) return '성적 없음';
  const cfg = fiveToNineConfig as ConversionConfig;
  return verified(cfg, 'R-CONV-003') ? `약 ${pctToG9(g5ToPct(g5, cfg), cfg).toFixed(1)} (추정)` : '환산 준비 중';
}
/** 브리핑 신호(teacher-dashboard 02-spec P4): 카드 위험 경고 · 성적 하락. 최저 근접은 검수된 최저 기준이 생기면 더해요. */
export function signals(r: SubmissionRow, g?: SchoolGrades) {
  const out: string[] = [], d = decline(g);
  if (r.warnings) out.push(`카드 조합 경고 ${r.warnings}개 · ${r.latest!.card.warnings[0].title}`);
  if (d !== null) out.push(`지난 학기보다 5등급 평균이 ${d.toFixed(1)} 내려갔어요`);
  return out;
}

export function TeacherDashboard() {
  const [clearing, setClearing] = useState(false);
  return <ClassGate slug="teacher-dashboard" title="우리 반 홈" setup>{({ info, students, cards, school }) => {
    const rows = submissionRows(students, cards), submitted = rows.filter(r => r.latest).length, grade = (n: string) => school.find(g => g.number === n);
    const flagged = rows.map(r => ({ ...r, why: signals(r, grade(r.student.number)) })).filter(r => r.why.length);
    const brief = [...flagged].sort((a, b) => b.why.length - a.why.length || a.student.number.localeCompare(b.student.number)).slice(0, 3);
    const declined = flagged.filter(r => decline(grade(r.student.number)) !== null).length, graded = students.filter(s => schoolAverage(grade(s.number)) !== null).length;
    return <>
      <p className="t-caption text-muted">{info.name} · {students.length}명 · 학급 코드 <strong className="num">{info.code}</strong> — 학생에게 이 코드를 알려 주세요</p>
      <div className="stats">
        <div><span className="t-caption">학생 수</span><strong className="num">{students.length}명</strong><span className="t-caption text-muted">{info.name} · 성적 있음 {graded}명</span></div>
        <div><span className="t-caption">카드 제출</span><strong className="num">{submitted}명</strong><span className="t-caption text-muted">미제출 {students.length - submitted}명 · 상담카드 기준</span></div>
        <div><span className="judge-badge judge-none">최저 미충족</span><strong className="num">–</strong><span className="t-caption text-muted">검수된 수능 최저 기준이 없어 세지 않아요</span></div>
        <div><span className="t-caption">상담 필요</span><strong className="num key-number">{flagged.length}명</strong><span className="t-caption text-muted">카드 경고 · 성적 하락 신호가 있는 학생</span></div>
      </div>
      <article className="univ-card"><div className="section-row"><h3 className="t-heading-3">우리 반 브리핑</h3><span className="data-status-badge">규칙으로 고름</span></div>
        <p className="t-body">먼저 볼 학생 {brief.length}명 · 카드 위험 경고 {flagged.filter(r => r.warnings).length}명 · 성적 하락 {declined}명</p>
        <p className="t-caption text-muted">카드 위험 경고 · 성적 하락 신호가 많은 학생부터 골라요. 같으면 번호 순이에요.</p>
        {!brief.length ? <p className="text-muted">지금 먼저 챙길 학생이 없어요</p> : <ul className="brief-list">{brief.map(r => <li key={r.student.number}>
          <strong className="num">{studentLabel(r.student)}</strong> <WarningBadge count={r.warnings} />{decline(grade(r.student.number)) !== null && <span className="data-status-badge">성적 하락</span>}
          <p className="t-body-sm">{r.why.join(' · ')}</p><Link className="t-link" to={counselPath(r.student.number)}>상담 화면 열기 ›</Link></li>)}</ul>}
      </article>
      <div className="section-row"><h3 className="t-heading-2">학생 한눈에</h3><span className="t-caption text-muted">경고 많은 순</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>학생</th><th>5등급 평균</th><th>환산 9등급</th><th>카드</th><th>경고</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.student.number}><td><Link to={counselPath(r.student.number)} className="num">{studentLabel(r.student)}</Link></td>
          <td className="num">{schoolAverage(grade(r.student.number))?.toFixed(2) ?? <span className="text-muted">–</span>}</td><td className="num">{g9Label(schoolAverage(grade(r.student.number)))}</td>
          <td><span className="data-status-badge">{r.latest ? '제출' : '미제출'}</span></td><td><WarningBadge count={r.warnings} /></td></tr>)}</tbody></table></div>
      <p className="disclaimer-note">ⓘ 5등급 평균은 불러온 학기 평균의 단순 평균이에요 · 환산 9등급은 추정 범위예요 · 카드 경고는 학생이 카드를 보낸 때 기준이에요 · 대학 공식 자료가 최종 기준이에요 · 학급 데이터는 이 기기에만 저장돼요</p>
      <details className="trace-accordion"><summary>학급 관리</summary>
        <p className="t-body-sm">학급 코드 {info.code} · 만든 날 {info.created_at.slice(0, 10)}</p>
        <ServerSync />
        <LockSettings />
        <ButtonOutline onClick={() => setClearing(true)}>이 기기에서 학급 데이터 지우기</ButtonOutline></details>
      {clearing && <Modal label="학급 데이터 지우기" onClose={() => setClearing(false)}><h3 className="t-heading-3">학급 데이터를 지울까요?</h3>
        <p>{info.name} 명단·받은 카드·상담 메모를 이 기기에서 모두 지워요. 되돌릴 수 없어요.</p>
        <div className="toolbar"><ButtonOutline onClick={() => setClearing(false)}>취소</ButtonOutline>
          <ButtonPrimary onClick={async () => { await teacherDb.clearClass(); clearLock(); announceLockChange(); setClearing(false); }}>모두 지우기</ButtonPrimary></div></Modal>}
    </>;
  }}</ClassGate>;
}

/** 자동 잠금 번호 정하기(학급 관리). */
function LockSettings() {
  const [on, setOn] = useState(() => !!loadLock()), [pin, setPin] = useState(''), [confirm, setConfirm] = useState(''), [minutes, setMinutes] = useState(loadLock()?.minutes ?? 10), [message, setMessage] = useState(''), [error, setError] = useState('');
  const save = async () => {
    try { if (pin !== confirm) throw new Error('두 번 입력한 잠금 번호가 달라요.'); await saveLock(pin, minutes); announceLockChange(); setOn(true); setPin(''); setConfirm(''); setError(''); setMessage(`${minutes}분 동안 쓰지 않으면 교사 화면을 잠가요.`); }
    catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
  };
  return <fieldset className="form-grid"><legend className="t-heading-4">자동 잠금</legend>
    <p className="t-caption text-muted">{on ? `켜져 있어요 · ${loadLock()?.minutes}분 동안 쓰지 않으면 잠가요.` : '꺼져 있어요. 잠금 번호를 정하면 쓰지 않을 때 교사 화면을 잠가요.'} 화면 잠금이라 기기 자체의 잠금도 함께 써 주세요.</p>
    <label>잠금 번호(숫자 4~8자리)<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin} onChange={e => setPin(e.target.value)} /></label>
    <label>잠금 번호 확인<input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
    <label>잠그기까지<select value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{LOCK_MINUTES.map(m => <option key={m} value={m}>{m}분</option>)}</select></label>
    {error && <p role="alert" className="error-note">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="toolbar"><ButtonOutline onClick={save}>{on ? '잠금 번호 바꾸기' : '자동 잠금 켜기'}</ButtonOutline>
      {on && <ButtonOutline onClick={() => { clearLock(); announceLockChange(); setOn(false); setMessage('자동 잠금을 껐어요.'); }}>자동 잠금 끄기</ButtonOutline>}</div>
  </fieldset>;
}
