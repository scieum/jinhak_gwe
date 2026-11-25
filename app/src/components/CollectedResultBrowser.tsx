import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { SortableHeader } from './SortableHeader';
import { nextTableSort, sortTableRows, type TableSort } from '../domain/tableSort';
import { ResultFilterFields, emptyResultFilters, filterCollectedRows, useCompactResults, type ResultFilters } from './ResultFilters';
import { loadCollectedIndex, loadCollectedRows } from '../data/collectedResults';
import { loadSusiIndex, loadSusiRows } from '../data/susiResults';
import { susiIssues } from '../domain/susiResults';
import type { CollectedIndex } from '../domain/collectedResults';
import { rowIssues, type ResultRow } from '../domain/resultReview';
import { CollectedResultFields } from './CollectedResultFields';
import { InterestButton } from './InterestButton';
import { interestId } from '../domain/interests';
import { collectedUniversitySelection, matchesUniversityIdentity, currentUniversityName } from '../domain/universityIdentity';

const PAGE = 50;

export function CollectedResultBrowser({ tabs, initialUniversity = '', initialProgram = '', initialDepartment = '', susiOnly = false }: { tabs?: ReactNode; initialUniversity?: string; initialProgram?: string; initialDepartment?: string; susiOnly?: boolean }) {
  const [index, setIndex] = useState<CollectedIndex | null>(null), [university, setUniversity] = useState('');
  const [rows, setRows] = useState<ResultRow[] | null>(null), [nameQuery, setNameQuery] = useState('');
  const [filters, setFilters] = useState<ResultFilters>({ ...emptyResultFilters, round: initialProgram ? '전체' : '수시', query: initialProgram });
  const [selectedInterest, setSelectedInterest] = useState(initialDepartment ? { program: initialProgram, department: initialDepartment } : null);
  const [draft, setDraft] = useState<ResultFilters | null>(null), [choosing, setChoosing] = useState(false);
  const compact = useCompactResults();
  const [sort, setSort] = useState<TableSort<keyof ResultRow>>(null);
  const [page, setPage] = useState(0), [opened, setOpened] = useState<ResultRow | null>(null);
  const [indexError, setIndexError] = useState(''), [dataError, setDataError] = useState('');
  const [indexAttempt, setIndexAttempt] = useState(0), [dataAttempt, setDataAttempt] = useState(0);
  useEffect(() => {
    let live = true; setIndexError('');
    (susiOnly ? loadSusiIndex() : loadCollectedIndex()).then(value => {
      if (!live) return;
      setIndex(value); setUniversity(collectedUniversitySelection(initialUniversity, value.universities.map(e => e.university)) ?? value.universities[0].university);
    }).catch(e => { if (live) setIndexError(e instanceof Error ? e.message : '수집 자료 목록을 읽지 못했어요.'); });
    return () => { live = false; };
  }, [indexAttempt, initialUniversity, susiOnly]);
  useEffect(() => {
    let live = true;
    setRows(null); setDataError(''); setPage(0); setOpened(null); setDraft(null);
    const entry = index?.universities.find(e => e.university === university);
    if (entry) (susiOnly ? loadSusiRows(entry) : loadCollectedRows(entry)).then(value => { if (live) setRows(value); })
      .catch(e => { if (live) setDataError(e instanceof Error ? e.message : '대학 자료를 읽지 못했어요.'); });
    return () => { live = false; };
  }, [index, university, dataAttempt, susiOnly]);
  const scopedRows = useMemo(() => selectedInterest ? (rows ?? []).filter(r => r.program.trim() === selectedInterest.program.trim() && r.recruit_unit.trim() === selectedInterest.department.trim()) : rows ?? [], [rows, selectedInterest]);
  const filtered = useMemo(() => filterCollectedRows(scopedRows, filters), [scopedRows, filters]);
  const sorted = useMemo(() => sortTableRows(filtered, sort, (r, key) => r[key], key => ['result_year', 'quota', 'competition_rate', 'cut_50', 'cut_70'].includes(key)), [filtered, sort]);
  const sortBy = (key: keyof ResultRow) => { setSort(current => nextTableSort(current, key)); setPage(0); };
  const header = (key: keyof ResultRow, label: string) => <SortableHeader column={key} label={label} sort={sort} onSort={sortBy} />;
  const names = index?.universities.filter(e => matchesUniversityIdentity(e.university, nameQuery)) ?? [];
  const updateFilters = (next: ResultFilters) => { setFilters(next); setPage(0); };
  const selectUniversity = (name: string) => { setUniversity(name); setSelectedInterest(null); setSort(null); updateFilters({ ...emptyResultFilters, round: '수시' }); setChoosing(false); };
  const resetFilters = () => { setSelectedInterest(null); updateFilters(emptyResultFilters); };
  const heart = (row: ResultRow) => row.university.trim() && row.program.trim() && row.recruit_unit.trim()
    ? <InterestButton key={interestId(row.university, row.program, row.recruit_unit)} university={row.university} program={row.program} department={row.recruit_unit} compact /> : null;
  return <section aria-label="수집 입결 참고자료" className="collected-results">
    <section className="filter-panel" aria-label="입결 조회 조건">
      <div className="collection-scope">{tabs}{index && <p className="t-caption text-muted">{index.universities.length}개 대학·캠퍼스 · 수집 자료 {index.rows.toLocaleString()}건</p>}</div>
      {indexError ? <div role="alert"><p>{indexError}</p><ButtonOutline onClick={() => setIndexAttempt(n => n + 1)}>목록 다시 불러오기</ButtonOutline></div>
        : !index ? <p role="status">수집 자료 목록을 읽고 있어요.</p> : <>
          <div className="collection-fields-shell"><div className="collection-filters">
            <div className="university-field"><div className="section-row"><label htmlFor="collected-university">수집 대학</label><button className="text-button" onClick={() => { setNameQuery(''); setChoosing(true); }}>대학 검색</button></div>
              <select id="collected-university" value={university} onChange={e => selectUniversity(e.target.value)}>{index.universities.map(e => <option key={e.university} value={e.university}>{currentUniversityName(e.university)}</option>)}</select>
            </div>
            {compact ? <ButtonOutline disabled={!rows} onClick={() => setDraft({ ...filters })}>조건 <Icon name="chevron-down" size={16} /></ButtonOutline>
              : <><ResultFilterFields rows={rows ?? []} value={filters} onChange={updateFilters} /><ButtonOutline aria-label="검색 조건 초기화" onClick={resetFilters}>초기화</ButtonOutline></>}
          </div>
          {compact && <p className="t-caption text-muted">{filters.year === '전체' ? '전체 학년도' : filters.year} · {filters.round} · {filters.type === '전체' ? '전체 전형' : filters.type}</p>}</div>
        </>}
    </section>
    {index && initialUniversity && !collectedUniversitySelection(initialUniversity, index.universities.map(e => e.university)) && <p className="notice">저장한 대학 ‘{initialUniversity}’을 현재 수집 목록에서 찾지 못했어요. 대학 이름을 검색해 확인해 주세요.</p>}
    {index && <section className="result-panel collection-output" aria-label="수집 입결 조회 결과" aria-busy={!rows && !dataError}>
      <div className="collection-result-heading">
        <div><div className="toolbar"><h3 className="t-heading-2">{currentUniversityName(university)}</h3><span className="data-status-badge">검수 전 참고자료</span></div>
          {rows && <p role="status">{currentUniversityName(university)} · {filtered.length.toLocaleString()}행 / {rows.length.toLocaleString()}행</p>}
          <p className="t-caption text-muted">검수 전 참고자료 · 원문 대조와 이용 조건 확인이 끝나지 않았어요. 성적 판정에는 사용하지 않아요.</p>
          <p className="t-caption text-muted">현재 대학명 기준 · 통합 전 이름으로도 검색할 수 있어요. 과거 대학명과 캠퍼스 확인 근거는 원문·상세에 표시해요.</p>
          {selectedInterest && <div className="toolbar"><span className="data-status-badge">{selectedInterest.department} · {selectedInterest.program}만 보기</span><button className="text-button" onClick={resetFilters}>학과 선택 해제</button></div>}
        </div>
        {!compact && <label>전형·모집단위 검색<input type="search" value={filters.query} onChange={e => updateFilters({ ...filters, query: e.target.value })} placeholder="전형명 또는 학과명" /></label>}
      </div>
      {dataError ? <div role="alert" className="collection-message"><p>{dataError}</p><ButtonOutline onClick={() => setDataAttempt(n => n + 1)}>대학 자료 다시 불러오기</ButtonOutline></div>
        : !rows ? <p role="status" className="collection-message">{university} 자료를 읽고 있어요.</p> : <>
          {!filtered.length ? <p className="collection-message">조건에 맞는 수집 자료가 없어요. 다른 학년도·모집시기·전형을 선택해 주세요.</p> : <>
            <p className="t-caption text-muted collection-sort-help">열 제목으로 정렬 · 하트는 대학·전형·학과별로 저장해요. 같은 학과의 다른 연도 자료만 함께 표시돼요.</p>
            <div className="table-scroll"><table className="data-table collection-table">
              <caption className="sr-only">검수 전 입결 · 원문별 행을 그대로 표시</caption>
              <thead><tr>{!compact && <>{header('result_year', '학년도')}{header('round', '시기')}{header('program', '전형')}</>}{header('recruit_unit', compact ? '모집단위 · 전형' : '모집단위')}{!compact && <>{header('quota', '모집')}{header('competition_rate', '경쟁률')}</>}{header('cut_50', '50% 컷')}{header('cut_70', '70% 컷')}{!compact && <>{header('metric', '지표')}<th scope="col">상세</th></>}</tr></thead>
              <tbody>{sorted.slice(page * PAGE, (page + 1) * PAGE).map((r, i) => <tr key={`${page}-${i}`}>
                {!compact && <><td>{r.result_year}</td><td>{r.round}</td><td>{r.program || '—'}</td></>}
                <td>{compact ? <><div className="collection-unit-heading">{heart(r)}<button className="collection-unit" onClick={() => setOpened(r)} aria-label={`${r.result_year} ${r.program} ${r.recruit_unit} 원문·상세`}>{r.recruit_unit || '모집단위 미기재'}<Icon name="chevron-right" size={16} /></button></div><p className="t-caption text-muted">{r.result_year} · {r.round} · {r.program || '전형 미기재'}</p><p className="t-caption text-muted">{r.metric || '지표 미기재'}{(rowIssues(r).errors.length > 0 || susiIssues(r).length > 0) && ' · 확인 필요'}</p></> : <div className="collection-program">{heart(r)}<span>{r.recruit_unit || '—'}</span></div>}</td>
                {!compact && <><td className="num">{r.quota || '—'}</td><td className="num">{r.competition_rate || '—'}</td></>}
                <td className="num">{r.cut_50 || '—'}</td><td className="num">{r.cut_70 || '—'}</td>
                {!compact && <><td>{r.metric || '미기재'}{(rowIssues(r).errors.length > 0 || susiIssues(r).length > 0) && <span className="data-status-badge">확인 필요</span>}</td><td><button className="text-button" onClick={() => setOpened(r)} aria-label={`${r.result_year} ${r.program} ${r.recruit_unit} 원문·상세`}>원문·상세</button></td></>}
              </tr>)}</tbody>
            </table></div>
            <nav className="toolbar collection-pagination" aria-label="입결 결과 페이지"><ButtonOutline disabled={!page} onClick={() => setPage(p => p - 1)}>이전</ButtonOutline><span>{page + 1} / {Math.ceil(filtered.length / PAGE)} 페이지</span><ButtonOutline disabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage(p => p + 1)}>다음</ButtonOutline>{sort && <button className="text-button" onClick={() => { setSort(null); setPage(0); }}>원문 순서로 보기</button>}</nav>
          </>}
          <p className="t-caption text-muted collection-footnote">빈 값은 ‘—’로 표시해요. 평균·최저·그 밖의 지표와 원문 쪽수는 상세에서 확인할 수 있어요. 출처나 산출 기준이 다른 행은 합치지 않으며 행 수가 전형 수를 뜻하지는 않아요. 일부 연도·전형은 수집되지 않았어요.</p>
        </>}
    </section>}
    {choosing && <Modal label="대학 검색·선택" onClose={() => setChoosing(false)}>
      <div className="section-row"><h3 className="t-heading-3">대학 검색·선택</h3><ButtonOutline onClick={() => setChoosing(false)}>닫기</ButtonOutline></div>
      <label>수집 대학 검색<input type="search" value={nameQuery} onChange={e => setNameQuery(e.target.value)} placeholder="대학 이름으로 찾기" /></label>
      <p role="status" className="t-caption text-muted">{names.length ? `${names.length}개 대학·캠퍼스` : '검색한 대학이 없어요. 현재 선택한 대학은 유지돼요.'}</p>
      <div className="university-options">{names.map(e => <button className="button-outline" key={e.university} aria-pressed={e.university === university} onClick={() => selectUniversity(e.university)}>{currentUniversityName(e.university)}</button>)}</div>
    </Modal>}
    {draft && <Modal label="입결 조회 조건" onClose={() => setDraft(null)}>
      <div className="section-row"><h3 className="t-heading-3">조회 조건</h3><ButtonOutline onClick={() => setDraft(null)}>닫기</ButtonOutline></div>
      <p className="t-body-sm">{university}</p>
      <div className="collection-sheet-fields"><ResultFilterFields rows={rows ?? []} value={draft} onChange={setDraft} search /></div>
      <div className="collection-sheet-actions"><ButtonOutline onClick={() => setDraft({ ...emptyResultFilters })}>초기화</ButtonOutline><ButtonPrimary onClick={() => { updateFilters(draft); setDraft(null); }}>{filterCollectedRows(scopedRows, draft).length.toLocaleString()}건 결과 보기</ButtonPrimary></div>
    </Modal>}
    {opened && <Modal wide label="수집 입결 원문 상세" onClose={() => setOpened(null)}>
      <div className="section-row"><h3 className="t-heading-3">{opened.university} · {opened.result_year}학년도</h3><ButtonOutline onClick={() => setOpened(null)}>닫기</ButtonOutline></div>
      <CollectedResultFields row={opened} />
    </Modal>}
  </section>;
}
