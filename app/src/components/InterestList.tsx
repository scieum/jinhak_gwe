import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { studentDb } from '../store/studentDb';
import { collectedProgramPath, interestId, programPath } from '../domain/interests';
import type { ReleasedUnit } from '../domain/resultReview';
import { InterestButton } from './InterestButton';
import { PrepareProgram } from './PrepareProgram';

export function InterestList({ units }: { units: readonly ReleasedUnit[] | null }) {
  const [search, setSearch] = useState('');
  const state = useLiveQuery(async () => {
    try { return { items: await studentDb.interests.toArray(), error: '' }; }
    catch { return { items: [], error: '관심 전형 목록을 읽지 못했어요. 브라우저 저장 권한을 확인해 주세요.' }; }
  }, []);
  if (!state) return <p role="status">관심 전형을 읽고 있어요.</p>;
  if (state.error) return <p role="alert">{state.error}</p>;
  const available = new Set(units?.flatMap(u => u.rows.flatMap(r => [interestId(u.university, r.program), interestId(u.university, r.program, r.recruit_unit)])) ?? []);
  const shown = state.items.filter(i => `${i.university} ${i.program} ${i.department ?? ''}`.includes(search.trim()))
    .sort((a, b) => a.university.localeCompare(b.university, 'ko') || a.program.localeCompare(b.program, 'ko') || (a.department ?? '').localeCompare(b.department ?? '', 'ko'));
  return <section className="interest-list" aria-label="저장한 관심 전형">
    <h3 className="t-heading-3">관심 전형 {state.items.length}개</h3>
    <p className="t-caption text-muted">대학·전형·학과별로 이 기기에 저장해요. 지원 학년도와 모집요강은 별도로 확인해 주세요. 학생 기록 백업에 함께 담겨요.</p>
    {!state.items.length ? <div className="empty-state"><h4 className="t-heading-4">아직 관심 전형이 없어요</h4><p>수집 입결 목록이나 대학·전형 상세에서 하트를 눌러 담아 보세요.</p></div> : <>
      <label>관심 전형 검색<input value={search} onChange={e => setSearch(e.target.value)} placeholder="대학·전형·학과 이름으로 찾기" /></label>
      <p className="t-caption text-muted" role="status">검색 결과 {shown.length}개</p>
      {!shown.length ? <div className="empty-state"><h4 className="t-heading-4">검색한 관심 전형이 없어요</h4><button type="button" className="button-outline" onClick={() => setSearch('')}>검색어 지우기</button></div>
        : <ul className="program-list">{shown.map(i => <li className="interest-row" key={i.id}>
          <div className="interest-row__info"><Link className="t-link" to={`/univ-detail?u=${encodeURIComponent(i.university)}`}>{i.university}</Link>
            {i.department ? <><Link className="t-heading-4" to={collectedProgramPath(i.university, i.program, i.department)}>{i.department}</Link><Link className="t-link" to={programPath(i.university, i.program)}>{i.program}</Link></>
              : <><Link className="t-heading-4" to={programPath(i.university, i.program)}>{i.program}</Link><span className="data-status-badge">학과 미지정</span><p className="t-caption text-muted">학과를 선택하지 않고 저장한 항목이에요. 같은 전형의 학과 하트를 누르면 해당 학과로 바뀌어요.</p></>}
            <Link className="t-link" to={collectedProgramPath(i.university, i.program, i.department)}>{i.department ? '수집 입결에서 찾기' : '학과 선택하기'}</Link>
            {units === null ? <p className="t-caption text-muted">공개 자료를 확인하고 있어요.</p> : !available.has(i.id) && <p className="t-caption text-muted">현재 공개 자료에서 찾지 못했어요. 저장한 관심 기록은 유지돼요.</p>}
          </div><div className="interest-control"><InterestButton university={i.university} program={i.program} department={i.department} /><PrepareProgram university={i.university} program={i.program} department={i.department} /></div>
        </li>)}</ul>}
    </>}
  </section>;
}
