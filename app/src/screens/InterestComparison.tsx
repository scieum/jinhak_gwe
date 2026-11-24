import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { studentDb } from '../store/studentDb';
import { loadCollectedIndex, loadCollectedRows } from '../data/collectedResults';
import { loadNationalCatalog, loadNationalYear } from '../data/nationalPlacement';
import { dataAsOf } from '../data/catalog';
import { useSampleMode } from '../data/sample/mode';
import { sampleComparisonCatalog, sampleComparisonItems, sampleComparisonRows } from '../data/sample/compare';
import type { CollectedIndex } from '../domain/collectedResults';
import type { ResultRow } from '../domain/resultReview';
import { collectedProgramPath, type Interest } from '../domain/interests';
import { collectedUniversitySelection } from '../domain/universityIdentity';
import { chosenComparisonRecord, comparisonRecords, comparisonSelection, comparisonStatistic, differsOrUnknown, MAX_COMPARISON } from '../domain/interestComparison';
import { STATISTIC_LABELS, statisticDetail, type CutField, type NationalPlacementRow } from '../domain/nationalPlacement';
import { SegmentedControl } from '../components/SegmentedControl';
import { Modal } from '../components/Modal';
import { CollectedResultFields } from '../components/CollectedResultFields';
import { Icon } from '../components/Icon';
import { PrepareProgram } from '../components/PrepareProgram';
import { ScreenActions } from '../components/ScreenActions';
import { UniversityLogo } from '../components/UniversityLogo';
import { useCompactResults } from '../components/ResultFilters';
import '../styles/interest-comparison.css';

type Package = { rows: ResultRow[]; error: string };
type Statistics = { rows: Map<string, NationalPlacementRow>; error: string };
type Cell = { text: string; known: boolean; content?: ReactNode };
type Fact = 'quota' | 'competition_rate' | 'admission_type' | 'basis' | 'grade_system';
const unknown = (text = '원문 확인 필요'): Cell => ({ text, known: false });
const cell = (text: string): Cell => !/^(?:\s*|—|–|-|미기재|비공개)$/.test(text.trim()) ? { text, known: true } : unknown(text.trim() || '미기재');
const message = (error: unknown) => error instanceof Error ? error.message : '자료를 불러오지 못했어요.';
const numeric = (v: string) => /^\d+(?:\.\d+)?$/.test(v.trim());
// 시안 표기: 모집인원 "15명" · 경쟁률 "12.4 : 1" · 등급제 "9등급제". 숫자가 아니면 원문 그대로.
const FORMAT: Partial<Record<Fact, (v: string) => string>> = {
  quota: v => numeric(v) ? `${v.trim()}명` : v, competition_rate: v => numeric(v) ? `${v.trim()} : 1` : v, grade_system: v => /^[59]$/.test(v.trim()) ? `${v.trim()}등급제` : v,
};
const LEAD = '관심 전형 2~4개를 나란히 살펴봐요';

export function InterestComparison() {
  const [query, setQuery] = useSearchParams();
  const sample = useSampleMode(), compact = useCompactResults(); // 샘플 모드 = 시안 데모(가천·강원·경북 간호학과), 지우면 내 관심 전형 + 실제 수집 자료
  const saved = useLiveQuery(async () => {
    try { return { items: await studentDb.interests.toArray(), error: '' }; }
    catch { return { items: [], error: '관심 전형을 읽지 못했어요. 브라우저 저장 권한을 확인해 주세요.' }; }
  }, []);
  const [catalog, setCatalog] = useState<CollectedIndex | null>(null), [catalogError, setCatalogError] = useState('');
  const [packages, setPackages] = useState<Record<string, Package>>({}), [statistics, setStatistics] = useState<Record<string, Statistics>>({});
  const [attempt, setAttempt] = useState(0), [choosing, setChoosing] = useState(false), [opened, setOpened] = useState<ResultRow | null>(null);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [head, setHead] = useState<Element | null>(null);
  useEffect(() => { setHead(compact ? null : document.querySelector('.topbar__heading')); }, [compact]);
  const pool = useMemo(() => {
    const items = saved?.items ?? [];
    return sample ? [...sampleComparisonItems.filter(s => !items.some(i => i.id === s.id)), ...items] : items;
  }, [saved, sample]);
  const selected = comparisonSelection(pool, sample && !query.has('i') ? sampleComparisonItems.map(i => i.id) : query.getAll('i'));
  const names = JSON.stringify([...new Set(selected.map(item => item.university))].sort());
  const years = useMemo(() => [...new Set(catalog?.universities.flatMap(entry => entry.years) ?? [])].sort().reverse(), [catalog]);
  const year = years.includes(query.get('year') ?? '') ? query.get('year')! : years[0] ?? '';
  const history = year ? [2, 1, 0].map(offset => String(Number(year) - offset)) : [];
  const round = query.get('round') === '정시' ? '정시' : '수시';
  const metric = query.get('metric') === '수능등급' ? '수능등급' : '교과등급';
  const cut = Object.hasOwn(STATISTIC_LABELS, query.get('cut') ?? '') ? query.get('cut') as CutField : 'cut_70';
  const extra = cut !== 'cut_50' && cut !== 'cut_70';
  const differences = query.get('view') === 'differences';
  const patch = (changes: Record<string, string>) => { const next = new URLSearchParams(query); Object.entries(changes).forEach(([key, value]) => next.set(key, value)); setQuery(next); setOpened(null); };
  const setSelected = (ids: string[]) => { const next = new URLSearchParams(query); next.delete('i'); ids.forEach(id => next.append('i', id)); setQuery(next); setChoosing(false); setOpened(null); };

  useEffect(() => {
    let active = true; setCatalogError(''); setCatalog(null);
    (sample ? Promise.resolve(sampleComparisonCatalog) : loadCollectedIndex()).then(value => { if (active) setCatalog(value); }).catch(error => { if (active) setCatalogError(message(error)); });
    return () => { active = false; };
  }, [attempt, sample]);
  useEffect(() => {
    let active = true; setPackages({}); setChoices({});
    if (catalog) for (const university of JSON.parse(names) as string[]) {
      const current = collectedUniversitySelection(university, catalog.universities.map(e => e.university));
      const entry = catalog.universities.find(entry => entry.university === current);
      if (!entry) { setPackages(previous => ({ ...previous, [university]: { rows: [], error: '현재 수집 자료에서 이 대학·캠퍼스를 찾지 못했어요.' } })); continue; }
      (catalog === sampleComparisonCatalog ? Promise.resolve(sampleComparisonRows[entry.university]) : loadCollectedRows(entry)).then(rows => { if (active) setPackages(previous => ({ ...previous, [university]: { rows, error: '' } })); })
        .catch(error => { if (active) setPackages(previous => ({ ...previous, [university]: { rows: [], error: message(error) } })); });
    }
    return () => { active = false; };
  }, [catalog, names]);
  useEffect(() => {
    let active = true; setStatistics({});
    if (extra && year && catalog && selected.length) {
      const wanted = [0, 1, 2].map(offset => String(Number(year) - offset));
      // 샘플 데모에는 50·70% 컷만 있어요(그 밖 통계 = 해당 통계 없음)
      if (catalog === sampleComparisonCatalog) setStatistics(Object.fromEntries(wanted.map(value => [value, { rows: new Map(), error: '' }])));
      else loadNationalCatalog().then(async national => {
        if (national.collection.source_sha256 !== catalog.source_sha256) throw new Error('입결 자료 버전이 달라요. 자료를 다시 불러와 주세요.');
        await Promise.all(wanted.map(async value => {
          try {
            const entry = national.index.years.find(entry => entry.year === value);
            const records = entry ? await loadNationalYear(entry, national.collection) : [];
            if (active) setStatistics(previous => ({ ...previous, [value]: { rows: new Map(records.map(record => [record.id, record])), error: '' } }));
          } catch (error) { if (active) setStatistics(previous => ({ ...previous, [value]: { rows: new Map(), error: message(error) } })); }
        }));
      }).catch(error => { if (active) setStatistics(Object.fromEntries(wanted.map(value => [value, { rows: new Map(), error: message(error) }]))); });
    }
    return () => { active = false; };
  }, [extra, year, catalog, selected.length > 0]);

  const choiceKey = (item: Interest, value: string) => JSON.stringify([item.id, value, round, metric]);
  const records = (item: Interest, value: string) => comparisonRecords(item, packages[item.university]?.rows ?? [], value, round, metric);
  const picked = (item: Interest, value: string) => chosenComparisonRecord(records(item, value), choices[choiceKey(item, value)]);
  const readiness = (item: Interest, value: string): string => {
    const pkg = packages[item.university];
    if (!pkg) return '자료를 읽고 있어요';
    if (pkg.error) return pkg.error;
    return !records(item, value).length ? '해당 연도·시기·지표 자료 없음' : !picked(item, value) ? '원문 선택 필요' : '';
  };
  const sourceSelector = (item: Interest, value: string) => {
    const options = records(item, value), record = picked(item, value);
    return options.length > 1 ? <label className="comparison-source-select"><span className="sr-only">{value}학년도 원문 {options.length}건 · 직접 선택</span>
      <select className="text-input" aria-label={`${item.university} ${item.program} ${item.department} ${value}학년도 원문 선택`} value={record?.sourceRow ?? ''} onChange={event => setChoices(previous => ({ ...previous, [choiceKey(item, value)]: Number(event.target.value) }))}>
        <option value="" disabled>원문 {options.length}건 · 직접 선택</option>{options.map((option, i) => <option key={option.sourceRow} value={option.sourceRow}>{value} {i + 1}. {option.row.basis || '산출 기준 미기재'} · {option.row.source_page || '쪽수 미기재'}</option>)}
      </select><Icon name="chevron-down" size={20} /></label> : null;
  };
  // 원문 여러 건이 골라지지 않았어도 모든 원문이 같은 값이면 그 값을 보여요(컷 · 통계는 반드시 직접 선택)
  const fact = (item: Interest, field: Fact): Cell => {
    const status = readiness(item, year), all = records(item, year), same = all.length > 1 && all.every(r => r.row[field] === all[0].row[field]);
    if (status && !(status === '원문 선택 필요' && same)) return unknown(status);
    const value = (picked(item, year) ?? all[0]).row[field], c = cell(value);
    return c.known && FORMAT[field] ? { ...c, text: FORMAT[field]!(value) } : c;
  };
  // 한 학년도 컷: 숫자 · 상태 문구, 원문 선택이 필요하면 줄 대신 선택 칸
  const statistic = (item: Interest, value: string) => {
    const record = picked(item, value), indexed = record ? statistics[value]?.rows.get(`${record.row.university}:${record.sourceRow}`) : undefined;
    const number = comparisonStatistic(record, cut, indexed), state = readiness(item, value);
    const status = state || (record?.row.grade_system !== '9' ? '9등급제 확인 필요' : extra && !statistics[value] ? '통계를 읽고 있어요' : extra && statistics[value]?.error ? statistics[value].error : !extra ? '미기재' : '해당 통계 없음 · 원문 확인');
    return { record, indexed, number, line: state === '원문 선택 필요' ? null : `${value} ${number ? `${number} 등급` : status}` };
  };
  const cutCell = (item: Interest): Cell => {
    const stats = history.map(value => ({ value, ...statistic(item, value) })), lines = stats.flatMap(s => s.line ? [s.line] : []);
    const latest = [...stats].reverse().find(s => s.record);
    return { text: lines.join(' '), known: stats.every(s => s.number), content: <div className="comparison-statistic">
      {lines.length > 0 && <p className="comparison-statistic__lines">{lines.map(line => <span key={line}>{line}</span>)}
        {extra && stats.map(s => s.indexed && <span key={`d${s.value}`} className="t-caption text-muted">{s.value} {statisticDetail(s.indexed, cut)}</span>)}</p>}
      {history.map(value => sourceSelector(item, value) && <span key={value} className="comparison-statistic__select">{sourceSelector(item, value)}</span>)}
      {latest?.record && <button type="button" className="comparison-link" aria-label={`${item.university} ${item.program} ${item.department} ${latest.value}학년도 원문 상세`} onClick={() => setOpened(latest.record!.row)}>원문·상세 ›</button>}
    </div> };
  };
  const pending = (label: string) => selected.map(() => unknown(label));
  const tableRows: { key: string; label: string; fixed?: boolean; values: Cell[]; className?: string }[] = [
    { key: 'department', label: '모집단위', fixed: true, values: selected.map(item => cell(item.department!)) },
    { key: 'prepare', label: '지원 준비', fixed: true, className: 'comparison-row--prepare', values: selected.map(item => ({ ...unknown('지원 준비에 추가'), content: <PrepareProgram university={item.university} program={item.program} department={item.department} referenceYear={year} /> })) },
    { key: 'type', label: '전형 유형', values: selected.map(item => fact(item, 'admission_type')) },
    { key: 'quota', label: '모집인원', values: selected.map(item => fact(item, 'quota')) },
    ...['반영 교과', '수능최저', '면접'].map(label => ({ key: label, label, values: pending('해당 연도 모집요강 확인 필요') })),
    { key: 'cuts', label: '최근 3개 학년도 컷', className: 'comparison-row--cuts', values: selected.map(cutCell) },
    { key: 'competition', label: '경쟁률', values: selected.map(item => fact(item, 'competition_rate')) },
    { key: 'basis', label: '산출 기준·대상', fixed: true, values: selected.map(item => fact(item, 'basis')) },
    { key: 'system', label: '등급제', values: selected.map(item => fact(item, 'grade_system')) },
    { key: 'schedule', label: '고사 일정', values: pending('모집요강 확인 필요') },
    { key: 'source', label: '자료·관심 기록', fixed: true, values: selected.map(item => ({ ...unknown('검수 전 참고자료'), content: <Link className="comparison-link" to={collectedProgramPath(item.university, item.program, item.department)}>이 학과 수집 자료 ›</Link> })) },
  ];
  const visibleRows = differences ? tableRows.filter(row => row.fixed || differsOrUnknown(row.values)) : tableRows;
  const hasErrors = Object.values(packages).some(pkg => pkg.error) || Object.values(statistics).some(stat => stat.error);
  const canChoose = !!saved && !saved.error;

  const segments = <SegmentedControl label="비교 항목 표시" value={differences ? 'differences' : 'all'} onChange={value => patch({ view: value })} options={[{ value: 'all', label: '모든 항목' }, { value: 'differences', label: '다른 점만' }]} />;
  const addButton = <button type="button" className="button-outline comparison-add" onClick={() => setChoosing(true)} disabled={!canChoose}><Icon name="plus" size={20} />전형 추가</button>;
  const interestsLink = <Link className="comparison-interests-link" to="/admission-results?view=interests">관심 목록 ›</Link>;
  const conditions: { label: string; chip: string; value: string; on: boolean; key: string; options: [string, string][] }[] = [
    { label: '입결 학년도', chip: `${year}학년도`, value: year, on: year !== years[0], key: 'year', options: years.map(value => [value, `${value}학년도`]) },
    { label: '모집시기', chip: round, value: round, on: round !== '수시', key: 'round', options: [['수시', '수시'], ['정시', '정시']] },
    { label: '입결 지표', chip: metric, value: metric, on: metric !== '교과등급', key: 'metric', options: [['교과등급', '교과등급'], ['수능등급', '수능등급']] },
    { label: '컷·통계 기준', chip: STATISTIC_LABELS[cut], value: cut, on: cut !== 'cut_70', key: 'cut', options: Object.entries(STATISTIC_LABELS) },
  ];
  const select = (c: typeof conditions[number]) => <select aria-label={c.label} value={c.value} onChange={event => patch({ [c.key]: event.target.value })}>{c.options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>;
  const filters = compact
    ? <div className="comparison-chips" role="group" aria-label="공통 비교 조건">{conditions.map(c => <label key={c.key} className="filter-chip" data-on={c.on || undefined}><span aria-hidden="true">{c.chip}</span><Icon name="chevron-down" size={16} />{select(c)}</label>)}</div>
    : <div className="comparison-filters" role="group" aria-label="공통 비교 조건">{conditions.map(c => <label key={c.key} className={`comparison-field comparison-field--${c.key}`}><span>{c.label}</span><span className="comparison-select">{select(c)}<Icon name="chevron-down" size={20} /></span></label>)}</div>;
  const status = catalog && selected.length >= 2 && <p className="comparison-status" role="status">{selected.length}개 전형 · {year}학년도 {round} · {metric} · {STATISTIC_LABELS[cut]}{differences ? ' · 미확인 항목과 비교 기준은 유지해요.' : ''}</p>;
  const review = catalog && selected.length >= 2 && <div className="comparison-review"><span className="data-status-badge">검수 전 참고자료</span><span>모든 값은 대학 원문을 옮긴 것이에요 · 원문을 확인해 주세요</span></div>;

  return <section className="student-screen interest-comparison" data-slug="compare" aria-label="관심 전형 비교">
    {head && createPortal(<><h1 className="comparison-title">전형 비교</h1><p className="comparison-lead">{LEAD}</p></>, head)}
    {compact ? <><h2 className="sr-only">전형 비교</h2><p className="comparison-intro">{LEAD}</p><div className="comparison-actions">{segments}{addButton}</div></>
      : <ScreenActions><span className="data-status-badge comparison-asof">데이터 기준일 {dataAsOf}</span>{addButton}</ScreenActions>}
    {saved?.error && <p role="alert">{saved.error}</p>}
    {!saved && <p role="status">관심 전형을 읽고 있어요.</p>}
    {catalogError ? <div role="alert"><p>{catalogError}</p><button className="button-outline" onClick={() => setAttempt(value => value + 1)}>자료 다시 불러오기</button></div> : !catalog ? <p role="status">비교할 자료 목록을 읽고 있어요.</p> : <>
      {compact ? <>{filters}<div className="comparison-status-row">{status || <span />}{interestsLink}</div>{review}</>
        : <><div className="comparison-toolbar">{segments}{filters}{interestsLink}</div>{(status || review) && <div className="comparison-status-block">{status}{review}</div>}</>}
      {saved && selected.length < 2 ? <div className="empty-state"><h3 className="t-heading-3">{selected.length ? '비교할 학과를 하나 더 선택해 주세요' : '비교할 관심 학과를 선택해 주세요'}</h3><p>대학·전형·학과가 지정된 관심 항목을 2~4개 선택하면 비교표가 나와요.</p><button className="button-primary" onClick={() => setChoosing(true)} disabled={!canChoose}>관심 전형 선택</button></div> : selected.length >= 2 && <>
        {hasErrors && <div role="alert"><p>일부 자료를 읽지 못했어요. 오류가 난 항목은 수치 대신 안내를 표시해요.</p><button className="button-outline" onClick={() => setAttempt(value => value + 1)}>자료 다시 불러오기</button></div>}
        <div className="comparison-table-scroll" tabIndex={0} role="region" aria-label="전형 비교표, 가로 스크롤 가능"><table className="data-table comparison-table" style={{ '--comparison-count': selected.length } as CSSProperties}><caption className="sr-only">선택한 관심 학과의 동일 연도·지표·통계 비교</caption>
          <thead><tr><th scope="col">항목</th>{selected.map(item => <th scope="col" key={item.id}><div className="comparison-column-heading">
            <span className="comparison-column-heading__name"><UniversityLogo university={item.university} /><strong>{item.university}</strong></span><span className="comparison-column-heading__program">{item.program}</span>
            <button type="button" className="comparison-remove" aria-label={`${item.university} ${item.program} ${item.department} 비교에서 빼기`} onClick={() => setSelected(selected.filter(other => other.id !== item.id).map(other => other.id))}><Icon name="x" size={16} />빼기</button></div></th>)}</tr></thead>
          <tbody>{visibleRows.map(row => <tr key={row.key} className={row.className}><th scope="row">{row.label}</th>{row.values.map((value, i) => <td key={selected[i].id}>{value.content ?? <span className={value.known ? '' : 'text-muted'}>{value.text}</span>}</td>)}</tr>)}</tbody></table></div>
        <p className="comparison-scroll-note">표를 옆으로 밀어 다른 전형을 확인해요.</p>
      </>}
    </>}
    <p className="disclaimer-note"><Icon name="info" size={16} /><span>학년도·지표·통계가 같아도 대학별 반영 과목·대상이 달라요. 컷의 높낮이로 지원 여부를 판단하지 않아요. 검수 전 자료는 성적 판정에 쓰지 않아요. · 데이터 기준일 {dataAsOf}{sample ? ' · 샘플의 대학·숫자는 예시예요' : ''}</span></p>
    {choosing && saved && <ComparisonPicker key={selected.map(item => item.id).join('|')} items={pool} selected={selected.map(item => item.id)} onApply={setSelected} onClose={() => setChoosing(false)} />}
    {opened && <Modal wide label="비교 입결 원문 상세" onClose={() => setOpened(null)}><div className="section-row"><h3 className="t-heading-3">{opened.university} · {opened.recruit_unit} · {opened.result_year}학년도</h3><button className="button-outline" onClick={() => setOpened(null)}>닫기</button></div><CollectedResultFields row={opened} /></Modal>}
  </section>;
}

function ComparisonPicker({ items, selected, onApply, onClose }: { items: Interest[]; selected: string[]; onApply: (ids: string[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(selected), [search, setSearch] = useState('');
  const valid = draft.filter(id => items.some(item => item.id === id && item.department));
  const shown = items.filter(item => `${item.university} ${item.program} ${item.department ?? ''}`.includes(search.trim()));
  return <Modal label="비교할 관심 전형 선택" onClose={onClose}><div className="section-row"><h3 className="t-heading-3">비교할 관심 전형</h3><button className="button-outline" onClick={onClose}>닫기</button></div><p role="status">{valid.length} / 4개 선택 · 학과가 지정된 항목 2~4개를 선택해 주세요.</p><label>관심 전형 검색<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="대학·전형·학과로 찾기" /></label>
    {!items.length && <div className="empty-state"><p>저장한 관심 전형이 없어요. 입결에서 원하는 학과의 하트를 눌러 주세요.</p><Link className="button-outline" to="/admission-results?view=collected">입결에서 관심 학과 담기</Link></div>}
    {!!items.length && !shown.length && <p>검색한 관심 전형이 없어요. 검색어를 바꿔 주세요.</p>}
    <ul className="comparison-picker-list">{shown.map(item => <li key={item.id}><label><input type="checkbox" aria-label={`${item.university} ${item.program} · ${item.department || '학과 미지정'}`} checked={valid.includes(item.id)} disabled={!item.department || (!valid.includes(item.id) && valid.length >= MAX_COMPARISON)} onChange={event => setDraft(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} /><span><strong>{item.university}</strong><span>{item.program} · {item.department || '학과 미지정'}</span></span></label>{!item.department && <Link to={collectedProgramPath(item.university, item.program)}>학과 선택하기</Link>}</li>)}</ul>
    <div className="toolbar"><button className="button-outline" onClick={onClose}>취소</button><button className="button-primary" disabled={valid.length < 2 || valid.length > MAX_COMPARISON} onClick={() => onApply(valid)}>선택한 {valid.length}개 비교</button></div>
  </Modal>;
}

