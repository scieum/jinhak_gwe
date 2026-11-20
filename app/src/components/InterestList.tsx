import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { studentDb } from '../store/studentDb';
import { collectedProgramPath, interestId, programPath } from '../domain/interests';
import type { ReleasedUnit } from '../domain/resultReview';
import { InterestButton } from './InterestButton';
import { PrepareProgram } from './PrepareProgram';
import { UniversityLogo } from './UniversityLogo';
import { Icon } from './Icon';
import { comparisonPath } from '../domain/interestComparison';

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
    <header className="filter-panel interest-overview"><div><h3 className="t-heading-2">관심 전형 {state.items.length}개</h3>
    <p className="t-body-sm text-muted">대학·전형·학과별로 이 기기에 저장해요. 지원 학년도와 모집요강은 별도로 확인해 주세요. 학생 기록 백업에 함께 담겨요.</p></div>
    {!!state.items.length && <div><Link className="button-outline" to={comparisonPath()}>관심 전형 비교</Link><label>관심 전형 검색<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="대학·전형·학과 이름으로 찾기" /></label></div>}</header>
    {!state.items.length ? <div className="empty-state"><h4 className="t-heading-4">아직 관심 전형이 없어요</h4><p>수집 입결 목록이나 대학·전형 상세에서 하트를 눌러 담아 보세요.</p></div> : <>
      <section className="interest-results" aria-label="관심 전형 검색 결과"><header className="interest-results-heading"><h4 className="t-heading-3">저장한 학과·전형</h4><p className="t-body-sm text-muted" role="status">검색 결과 {shown.length}개</p></header>
      {!shown.length ? <div className="empty-state"><h4 className="t-heading-4">검색한 관심 전형이 없어요</h4><button type="button" className="button-outline" onClick={() => setSearch('')}>검색어 지우기</button></div>
        : <ul className="interest-cards">{shown.map(i => <li className="interest-card" key={i.id}>
          <header className="interest-card-heading"><UniversityLogo university={i.university} /><div><Link className="t-heading-3" to={`/univ-detail?u=${encodeURIComponent(i.university)}`}>{i.university}</Link><Link className="t-body-sm text-muted" to={programPath(i.university, i.program)}>{i.program}</Link></div><InterestButton university={i.university} program={i.program} department={i.department} compact /></header>
          <div className="interest-card-body">
            {i.department ? <><span className="t-caption text-muted">저장한 모집단위</span><Link className="t-heading-2" to={collectedProgramPath(i.university, i.program, i.department)}>{i.department}</Link></>
              : <div className="interest-department-needed"><strong className="t-body-sm"><Icon name="circle-help" size={20} />학과 미지정</strong><p className="t-body-sm">희망 학과를 선택해 주세요.</p><p className="t-caption text-muted">학과 하트를 누르면 이 항목이 선택한 학과로 바뀌어요.</p></div>}
            {units === null ? <p className="t-caption text-muted">공개 자료를 확인하고 있어요.</p> : !available.has(i.id) && <p className="t-caption text-muted">현재 공개 자료에서 찾지 못했어요. 저장한 관심 기록은 유지돼요.</p>}
          </div><footer className="interest-card-actions"><Link className={i.department ? 'button-outline' : 'button-primary'} to={collectedProgramPath(i.university, i.program, i.department)}>{i.department ? '수집 입결에서 찾기' : '학과 선택하기'}</Link>{i.department && <Link className="button-outline" to={comparisonPath([i.id])}>이 학과 비교하기</Link>}<PrepareProgram university={i.university} program={i.program} department={i.department} /></footer>
        </li>)}</ul>}
      </section>
    </>}
  </section>;
}
