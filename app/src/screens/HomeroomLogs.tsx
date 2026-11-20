import { useState } from 'react';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { ClassGate } from '../components/ClassGate';
import { Icon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { LOG_AREAS, logStats, weekOf, type LogArea } from '../domain/classroom';
import { teacherDb, type ClassState } from '../store/teacherDb';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const today = () => new Date().toLocaleDateString('sv-SE');
const shift = (date: string, days: number) => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + days); return d.toLocaleDateString('sv-SE'); };

export function HomeroomLogs() {
  return <ClassGate slug="homeroom-logs" title="누가기록">{c => <LogBoard {...c} />}</ClassGate>;
}

function LogBoard({ students, logs }: ClassState) {
  const [area, setArea] = useState<LogArea>('자율·자치'), [date, setDate] = useState(today()), [text, setText] = useState('');
  const [picked, setPicked] = useState<string[]>([]), [order, setOrder] = useState<'few' | 'number'>('few'), [message, setMessage] = useState('');
  const now = today(), week = weekOf(date), weekStart = weekOf(now)[0];
  const stats = Object.fromEntries(students.map(s => [s.number, logStats(s.number, logs)]));
  const rows = [...students].sort((a, b) => order === 'number' ? a.number.localeCompare(b.number) : stats[a.number].counts[area] - stats[b.number].counts[area] || a.number.localeCompare(b.number));
  const name = (n: string) => { const s = students.find(x => x.number === n); return s ? `${Number(s.number)}번 ${s.alias}` : `${n}번`; };
  const toggle = (n: string) => setPicked(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]);
  const save = async () => {
    await teacherDb.logs.add({ date, area, text: text.trim().slice(0, 500), numbers: picked, created_at: new Date().toISOString() });
    setMessage(`${picked.length}명에게 기록을 남겼어요`); setText('');
  };
  const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)).slice(0, 10);
  const label = !picked.length ? '학생을 골라 주세요' : !text.trim() ? '기록을 적어 주세요' : `${picked.length}명에게 기록 남기기`;

  return <>
    <div className="stats">
      <div><span className="t-caption">오늘 남긴 기록</span><strong className="num">{logs.filter(l => l.date === now).length}건</strong></div>
      <div><span className="t-caption">이번 주 기록</span><strong className="num">{logs.filter(l => l.date >= weekStart && l.date <= now).length}건</strong><span className="t-caption text-muted">{weekStart.slice(5)}부터 세었어요</span></div>
      <div><span className="t-caption">이 영역 기록 0건</span><strong className="num">{students.filter(s => !stats[s.number].counts[area]).length}명</strong><span className="t-caption text-muted">{area} 기준이에요</span></div>
      <div><span className="t-caption">우리 반</span><strong className="num">{students.length}명</strong><span className="t-caption text-muted">번호·별칭으로 보여요</span></div>
    </div>
    <div className="logs-layout"><div className="logs-board">
      <div className="section-row"><SegmentedControl label="영역" value={area} onChange={setArea} options={LOG_AREAS.map(a => ({ value: a, label: a }))} />
        <div className="week-picker" role="group" aria-label="날짜">
          <ButtonOutline onClick={() => setDate(now)}>오늘</ButtonOutline>
          <button className="icon-button" aria-label="이전 주" onClick={() => setDate(shift(date, -7))}><Icon name="chevron-left" size={20} /></button>
          {week.map((d, i) => <button key={d} className="week-day" aria-pressed={d === date} disabled={d > now} onClick={() => setDate(d)} aria-label={`${d} ${DAYS[i]}요일`}>
            <span className="t-caption text-muted">{DAYS[i]}</span><span className="num">{Number(d.slice(8))}</span></button>)}
          <button className="icon-button" aria-label="다음 주" disabled={week[6] >= now} onClick={() => setDate(shift(date, 7) > now ? now : shift(date, 7))}><Icon name="chevron-right" size={20} /></button>
        </div></div>
      <div className="logs-write"><label>관찰 기록<textarea rows={3} maxLength={500} value={text} onChange={e => setText(e.target.value)} placeholder="관찰한 내용을 한두 문장으로 적어 주세요" /></label>
        <div><p className="t-body"><strong className="num">{picked.length}명 선택</strong></p>
          <p className="t-caption text-muted">{picked.length ? picked.slice(0, 3).map(name).join(', ') + (picked.length > 3 ? ` 외 ${picked.length - 3}명` : '') : `${date} · ${area}`}</p>
          <ButtonPrimary disabled={!picked.length || !text.trim()} onClick={save}>{label}</ButtonPrimary></div></div>
      <p className="t-caption text-muted">고른 학생 모두에게 같은 기록이 남아요.</p>
      {message && <p role="status" className="toast">{message}</p>}
      <div className="section-row"><span className="t-heading-4">학생 {students.length}명</span>
        <ButtonOutline onClick={() => setPicked(picked.length === students.length ? [] : students.map(s => s.number))}>{picked.length === students.length ? '선택 해제' : '전체 선택'}</ButtonOutline>
        <SegmentedControl label="정렬" value={order} onChange={setOrder} options={[{ value: 'few', label: '적은 순' }, { value: 'number', label: '번호 순' }]} /></div>
      <div className="table-scroll"><table className="data-table pick-table"><thead><tr><th><span className="sr-only">선택</span></th><th>번호</th><th>별칭</th>{LOG_AREAS.map(a => <th key={a} className="num">{a} 기록</th>)}<th>마지막 기록</th></tr></thead>
        <tbody>{rows.map(s => { const on = picked.includes(s.number), st = stats[s.number];
          return <tr key={s.number} className={on ? 'is-picked' : ''} onClick={() => toggle(s.number)}>
            <td><input type="checkbox" checked={on} onChange={() => toggle(s.number)} onClick={e => e.stopPropagation()} aria-label={`${Number(s.number)}번 ${s.alias} 고르기`} /></td>
            <td className="num">{Number(s.number)}</td><td>{s.alias}</td>{LOG_AREAS.map(a => <td key={a} className="num">{st.counts[a]}</td>)}<td className="num">{st.last?.slice(5) ?? '기록 없음'}</td></tr>; })}</tbody></table></div>
    </div>
    <aside className="logs-recent" aria-label="최근 기록"><h3 className="t-heading-2">최근 기록</h3>
      {!recent.length ? <p className="t-body-sm text-muted">아직 남긴 기록이 없어요</p> : <ol className="counsel-timeline">{recent.map(l => <li key={l.id}>
        <p className="t-caption"><span className="num">{l.date.slice(5)}</span> · {l.area}</p>
        <p className="t-heading-4">{name(l.numbers[0])}{l.numbers.length > 1 ? ` 외 ${l.numbers.length - 1}명` : ''}</p><p>{l.text}</p></li>)}</ol>}
    </aside></div>
  </>;
}
