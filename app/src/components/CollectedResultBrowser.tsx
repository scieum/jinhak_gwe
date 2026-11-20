import { useEffect, useMemo, useState } from 'react';
import { ButtonOutline } from './Buttons';
import { Modal } from './Modal';
import { loadCollectedIndex, loadCollectedRows } from '../data/collectedResults';
import type { CollectedIndex } from '../domain/collectedResults';
import { httpsUrl, RESULT_COLUMNS, rowIssues, type ResultRow } from '../domain/resultReview';

const LABELS = ['대학', '학년도', '모집시기', '전형 유형', '전형', '모집단위', '모집인원', '지원자 수', '경쟁률', '충원 인원', '충원율', '50% 컷', '70% 컷', '그 밖의 지표', '지표 종류', '산출 기준', '등급제', '원문 주소', '쪽수·표 이름', '비고'];
const PAGE = 50;
const choices = (rows: ResultRow[], field: keyof ResultRow) => [...new Set(rows.map(r => r[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));

export function CollectedResultBrowser() {
  const [index, setIndex] = useState<CollectedIndex | null>(null), [university, setUniversity] = useState('');
  const [rows, setRows] = useState<ResultRow[] | null>(null), [nameQuery, setNameQuery] = useState('');
  const [year, setYear] = useState('전체'), [round, setRound] = useState('수시'), [type, setType] = useState('전체'), [query, setQuery] = useState('');
  const [page, setPage] = useState(0), [opened, setOpened] = useState<ResultRow | null>(null);
  const [indexError, setIndexError] = useState(''), [dataError, setDataError] = useState('');
  const [indexAttempt, setIndexAttempt] = useState(0), [dataAttempt, setDataAttempt] = useState(0);
  useEffect(() => {
    let live = true; setIndexError('');
    loadCollectedIndex().then(value => {
      if (!live) return;
      setIndex(value); setUniversity(value.universities[0].university);
    }).catch(e => { if (live) setIndexError(e instanceof Error ? e.message : '수집 자료 목록을 읽지 못했어요.'); });
    return () => { live = false; };
  }, [indexAttempt]);
  useEffect(() => {
    let live = true;
    setRows(null); setDataError(''); setPage(0); setOpened(null);
    const entry = index?.universities.find(e => e.university === university);
    if (entry) loadCollectedRows(entry).then(value => { if (live) setRows(value); })
      .catch(e => { if (live) setDataError(e instanceof Error ? e.message : '대학 자료를 읽지 못했어요.'); });
    return () => { live = false; };
  }, [index, university, dataAttempt]);
  const filtered = useMemo(() => (rows ?? []).filter(r => (year === '전체' || r.result_year === year)
    && (round === '전체' || r.round === round) && (type === '전체' || r.admission_type === type)
    && (!query.trim() || `${r.program} ${r.recruit_unit}`.includes(query.trim()))), [rows, year, round, type, query]);
  const names = index?.universities.filter(e => e.university.includes(nameQuery.trim())) ?? [];
  const selected = index?.universities.find(e => e.university === university);
  const visibleNames = selected && !names.includes(selected) ? [selected, ...names] : names;
  const resetFilters = () => { setYear('전체'); setRound('전체'); setType('전체'); setQuery(''); setPage(0); };
  return <section aria-label="수집 입결 참고자료">
    <h3 className="t-heading-2">모아둔 입결 자료</h3>
    <p className="notice">검수 전 참고자료 · 원문 대조와 이용 조건 확인이 끝나지 않았어요. 성적 판정에는 사용하지 않아요.</p>
    {indexError ? <div role="alert"><p>{indexError}</p><ButtonOutline onClick={() => setIndexAttempt(n => n + 1)}>목록 다시 불러오기</ButtonOutline></div>
      : !index ? <p role="status">수집 자료 목록을 읽고 있어요.</p> : <>
        <p className="text-muted">대학·캠퍼스명 {index.universities.length}개 · {index.rows.toLocaleString()}행 · 일부 연도·전형은 수집되지 않았어요.</p>
        <div className="form-grid">
          <label>수집 대학 검색<input value={nameQuery} onChange={e => setNameQuery(e.target.value)} placeholder="대학 이름으로 찾기" /></label>
          <label>수집 대학<select value={university} onChange={e => { setUniversity(e.target.value); resetFilters(); }}>
            {visibleNames.map(e => <option key={e.university}>{e.university}</option>)}
          </select></label>
        </div>
        {!names.length && <p role="status">검색한 대학이 없어요. 현재 선택한 대학은 유지돼요.</p>}
        {dataError ? <div role="alert"><p>{dataError}</p><ButtonOutline onClick={() => setDataAttempt(n => n + 1)}>대학 자료 다시 불러오기</ButtonOutline></div>
          : !rows ? <p role="status">{university} 자료를 읽고 있어요.</p> : <>
            <div className="form-grid">
              <label>학년도<select value={year} onChange={e => { setYear(e.target.value); setPage(0); }}><option>전체</option>{choices(rows, 'result_year').map(y => <option key={y}>{y}</option>)}</select></label>
              <label>모집시기<select value={round} onChange={e => { setRound(e.target.value); setPage(0); }}><option>전체</option>{[...new Set(['수시', ...choices(rows, 'round')])].map(r => <option key={r}>{r}</option>)}</select></label>
              <label>수집 전형 유형<select value={type} onChange={e => { setType(e.target.value); setPage(0); }}><option>전체</option>{choices(rows, 'admission_type').map(t => <option key={t}>{t}</option>)}</select></label>
              <label>전형·모집단위 검색<input value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="전형명 또는 학과명" /></label>
            </div>
            <div className="toolbar"><p role="status">{university} · {filtered.length.toLocaleString()}행 / {rows.length.toLocaleString()}행</p><ButtonOutline onClick={resetFilters}>검색 조건 초기화</ButtonOutline></div>
            {!filtered.length ? <p>조건에 맞는 수집 자료가 없어요. 다른 학년도·모집시기·전형을 선택해 주세요.</p> : <>
              <div className="table-scroll"><table className="data-table">
                <caption>검수 전 입결 · 원문별 행을 그대로 표시</caption>
                <thead><tr><th>학년도</th><th>시기</th><th>전형</th><th>모집단위</th><th>모집</th><th>경쟁률</th><th>50% 컷</th><th>70% 컷</th><th>지표</th><th>상세</th></tr></thead>
                <tbody>{filtered.slice(page * PAGE, (page + 1) * PAGE).map((r, i) => <tr key={`${page}-${i}`}>
                  <td>{r.result_year}</td><td>{r.round}</td><td>{r.program || '—'}</td><td>{r.recruit_unit || '—'}</td>
                  <td className="num">{r.quota || '—'}</td><td className="num">{r.competition_rate || '—'}</td>
                  <td className="num">{r.cut_50 || '—'}</td><td className="num">{r.cut_70 || '—'}</td><td>{r.metric || '미기재'}{rowIssues(r).errors.length > 0 && <span className="data-status-badge">확인 필요</span>}</td>
                  <td><button className="text-button" onClick={() => setOpened(r)} aria-label={`${r.result_year} ${r.program} ${r.recruit_unit} 원문·상세`}>원문·상세</button></td>
                </tr>)}</tbody>
              </table></div>
              <div className="toolbar"><ButtonOutline disabled={!page} onClick={() => setPage(p => p - 1)}>이전</ButtonOutline>
                <span>{page + 1} / {Math.ceil(filtered.length / PAGE)} 페이지</span>
                <ButtonOutline disabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage(p => p + 1)}>다음</ButtonOutline></div>
            </>}
            <p className="t-caption text-muted">빈 값은 ‘—’로 표시해요. 평균·최저·그 밖의 지표와 원문 쪽수는 상세에서 확인할 수 있어요. 출처나 산출 기준이 다른 행은 합치지 않으며 행 수가 전형 수를 뜻하지는 않아요.</p>
          </>}
      </>}
    {opened && <Modal wide label="수집 입결 원문 상세" onClose={() => setOpened(null)}>
      <div className="section-row"><h3 className="t-heading-3">{opened.university} · {opened.result_year}학년도</h3><ButtonOutline onClick={() => setOpened(null)}>닫기</ButtonOutline></div>
      <p className="notice">검수 전 참고자료 · 대학 공식 원문을 확인해 주세요.</p>
      {[...rowIssues(opened).errors, ...rowIssues(opened).warnings].map((issue, i) => <p className="error-note" key={i}>확인 필요: {issue}</p>)}
      <div className="table-scroll"><table className="data-table"><tbody>{RESULT_COLUMNS.map((column, i) => <tr key={column}>
        <th scope="row">{LABELS[i]}</th><td style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{column === 'source_url' && httpsUrl(opened[column])
          ? <a className="t-link" href={opened[column]} target="_blank" rel="noreferrer">{opened[column]} ↗</a> : opened[column] || '—'}</td>
      </tr>)}</tbody></table></div>
    </Modal>}
  </section>;
}
