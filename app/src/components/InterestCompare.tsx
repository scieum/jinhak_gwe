// 수시 입결 · 내 비교 (Figma admission-results 1440-compare 762:282739 · 390-compare 767:296407 · 빈 상태 767:302831 · 추가 767:309525).
// 하트로 담은 학과(최대 10개)의 같은 학년도 컷을 한 그래프에 놓고, 오른쪽에서 고른 학과의 3개년 값을 봐요. 판정 이름은 붙이지 않아요(NEVER-1).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadSusiIndex, loadSusiRows } from '../data/susiResults';
import type { CollectedIndex } from '../domain/collectedResults';
import type { ResultRow } from '../domain/resultReview';
import type { Interest } from '../domain/interests';
import { axisRange, axisTicks, axisMinorTicks, TYPE_TABS, typeTab, type TypeTab } from '../domain/resultBrowse';
import { gradeCut } from '../domain/universityResultPlot';
import { interestRows, yearCut } from '../domain/interestRows';
import { collectedUniversityCandidates, currentUniversityName, matchesUniversityIdentity } from '../domain/universityIdentity';
import { fiveToNineFor } from '../domain/results';
import { studentDb, useStudent } from '../store/studentDb';
import { UniversityLogo } from './UniversityLogo';
import { Icon } from './Icon';
import { SegmentedControl } from './SegmentedControl';
import { InterestButton } from './InterestButton';
import { Modal } from './Modal';
import { CollectedResultFields } from './CollectedResultFields';
import { SelectedDetail } from './UniversityResultOverview';
import { PrepareProgram } from './PrepareProgram';
import '../styles/university-result-overview.css';

export const COMPARE_MAX = 10;
const short = (u: string) => currentUniversityName(u).replace(/대학교$/, '대');
const SYNC_FLAG = 'jinhak-navi-app-interest-sync-v1';
type Loaded = Record<string, ResultRow[] | 'error'>;

function Mark({ type }: { type: string }) {
  return <svg className="ic-mark" viewBox="0 0 12 12" aria-hidden="true">{type === '교과' ? <circle cx="6" cy="6" r="5" />
    : type === '종합' ? <circle cx="6" cy="6" r="4.2" className="is-open" /> : type === '논술' ? <rect x="2.5" y="2.5" width="7" height="7" transform="rotate(45 6 6)" />
      : <rect x="3" y="3" width="6" height="6" transform="rotate(45 6 6)" className="is-open" />}</svg>;
}

export function InterestCompare({ tabs }: { tabs: ReactNode }) {
  const interests = useLiveQuery(() => studentDb.interests.toArray().then(l => l.sort((a, b) => a.created_at.localeCompare(b.created_at))), []);
  const [index, setIndex] = useState<CollectedIndex | null>(null), [indexError, setIndexError] = useState('');
  const [loaded, setLoaded] = useState<Loaded>({});
  const [tab, setTab] = useState<TypeTab>('전체'), [view, setView] = useState<'plot' | 'table'>('plot'), [year, setYear] = useState('');
  const [picked, setPicked] = useState(''), [adding, setAdding] = useState(false), [opened, setOpened] = useState<ResultRow | null>(null);
  const student = useStudent();
  // 예전에 지원 준비에만 담긴 전형도 한 번은 내 비교로 모아요(2026-11-27 사용자 요청)
  useEffect(() => { if (localStorage.getItem(SYNC_FLAG)) return; localStorage.setItem(SYNC_FLAG, '1'); void studentDb.syncApplicationInterests(); }, []);
  useEffect(() => { let live = true; loadSusiIndex().then(v => { if (live) setIndex(v); }).catch(e => { if (live) setIndexError(e instanceof Error ? e.message : '입결 목록을 읽지 못했어요.'); }); return () => { live = false; }; }, []);
  const shown = (interests ?? []).slice(0, COMPARE_MAX);
  const names = index?.universities.map(e => e.university) ?? [];
  const wanted = [...new Set(shown.map(i => i.university))].join('|');
  useEffect(() => {
    if (!index) { if (indexError) setLoaded(p => Object.fromEntries(wanted.split('|').filter(Boolean).map(u => [u, p[u] ?? 'error']))); return; }
    let live = true;
    for (const university of wanted ? wanted.split('|') : []) {
      if (loaded[university]) continue;
      const entries = index.universities.filter(e => collectedUniversityCandidates(university, names).includes(e.university));
      Promise.all(entries.map(e => loadSusiRows(e))).then(all => { if (live) setLoaded(p => ({ ...p, [university]: all.flat() })); })
        .catch(() => { if (live) setLoaded(p => ({ ...p, [university]: 'error' })); });
    }
    return () => { live = false; };
  }, [index, wanted, indexError]);

  const items = useMemo(() => shown.map(i => {
    const all = loaded[i.university];
    const match = Array.isArray(all) ? interestRows(i, all) : { rows: [], unit: '', programMatched: false };
    const latest = [...match.rows].sort((a, b) => Number(b.result_year) - Number(a.result_year))[0];
    return { interest: i, ...match, loading: all === undefined, failed: all === 'error', type: latest ? typeTab(latest) : '' };
  }), [shown.map(i => i.id).join('|'), loaded]);
  const years = [...new Set(items.flatMap(x => x.rows.filter(r => gradeCut(r) !== null || gradeCut(r, 'cut_50') !== null).map(r => r.result_year)))].sort().reverse();
  const chosenYear = years.includes(year) ? year : years[0] ?? '';
  const visible = items.filter(x => tab === '전체' || x.type === tab);
  const points = visible.map(x => ({ x, cut: yearCut(x.rows, chosenYear) }));
  const conversion = useMemo(() => student?.data?.grades.length ? fiveToNineFor(student.data.grades, '전 교과') : null, [student]);
  const mine = conversion?.min != null && conversion.max != null ? { lo: Math.floor(conversion.min * 10) / 10, hi: Math.ceil(conversion.max * 10) / 10 } : null;
  const range = axisRange([...points.flatMap(p => p.cut ? [p.cut.value] : []), ...(mine ? [mine.lo, mine.hi] : [])]);
  const pos = (v: number) => `${(Math.min(range.max, Math.max(range.min, v)) - range.min) / (range.max - range.min) * 100}%`;
  const selected = items.find(x => x.interest.id === picked) ?? items[0];
  const cutKinds = new Set(points.flatMap(p => p.cut ? [p.cut.cut] : []));
  const cutLabel = cutKinds.size === 1 && cutKinds.has('cut_50') ? '50% 컷' : cutKinds.size > 1 ? '70% 컷(없으면 50% 컷)' : '70% 컷';
  const label = (i: Interest) => `${short(i.university)} ${i.department || i.program}`;

  const list = <section className="ar-panel ic-list" aria-label="내 비교 목록">
    {shown.length ? <><h4>내 비교 {interests!.length}개 · 최대 {COMPARE_MAX}개</h4>
      {interests!.length > COMPARE_MAX && <p className="ar-muted">먼저 담은 {COMPARE_MAX}개만 그래프에 놓아요. 하트를 빼면 다음 학과가 들어와요.</p>}
      <ul>{shown.map(i => <li key={i.id} aria-current={selected?.interest.id === i.id || undefined}>
        <button type="button" onClick={() => setPicked(i.id)}><UniversityLogo university={i.university} /><span>{label(i)}</span></button>
        <InterestButton university={i.university} program={i.program} department={i.department || undefined} compact /></li>)}</ul></>
      : <p className="ar-muted">하트로 담은 학과가 여기 모여요</p>}
  </section>;
  const detail = selected && (selected.rows.length
    ? <section className="ar-panel" aria-label="고른 학과"><SelectedDetail university={selected.interest.university} program={selected.interest.program}
        department={{ name: selected.unit, rows: selected.rows, points: selected.rows.filter(r => gradeCut(r) !== null) }}
        years={[...new Set(selected.rows.map(r => Number(r.result_year)))].sort((a, b) => a - b).slice(-3)} cut={selected.rows.some(r => gradeCut(r) !== null) ? 'cut_70' : 'cut_50'} onSource={setOpened} /></section>
    : <section className="ar-panel" aria-label="고른 학과"><p className="ar-muted ar-caption">고른 학과</p><h4 className="ic-detail-title"><UniversityLogo university={selected.interest.university} />{label(selected.interest)}</h4>
      <p className="ar-muted">{!selected.interest.department ? '학과 없이 담은 전형이라 비교할 학과가 없어요. 될각에서 학과를 골라 주세요.' : selected.loading ? '입결 자료를 읽고 있어요.' : selected.failed ? '입결 자료를 읽지 못했어요.' : '수집한 수시 입결에서 이 학과를 찾지 못했어요. 관심 기록은 그대로예요.'}</p>
      <Link className="t-link" to={`/admission-results?view=university&gu=${encodeURIComponent(selected.interest.university)}`}>대학별 입결에서 찾아보기 ›</Link>
      <PrepareProgram university={selected.interest.university} program={selected.interest.program} department={selected.interest.department ?? ''} /></section>);

  return <section className="ar ic" aria-label="내 비교">
    <div className="ar-columns">
      <div className="ar-center">
        <div className="ar-top">{tabs}<button type="button" className="button-outline ic-add" onClick={() => setAdding(true)}><Icon name="plus" size={20} />학교·학과 추가</button></div>
        {indexError && <p role="alert" className="notice">{indexError} 담은 목록은 그대로 볼 수 있어요.</p>}
        {!interests ? <p role="status">내 비교를 읽고 있어요.</p> : !shown.length
          ? <section className="ar-card ic-empty"><div className="empty-state"><Icon name="heart" size={40} /><h4 className="t-heading-4">비교할 학교·학과를 담아 주세요</h4>
            <p>하트로 담은 학과가 여기 모여요. 최대 {COMPARE_MAX}개까지 같은 그래프에서 볼 수 있어요.</p><button type="button" className="button-primary" onClick={() => setAdding(true)}>학교·학과 추가</button></div></section>
          : <>
            <div className="ar-controls">
              <div className="ar-type"><SegmentedControl label="전형 유형" value={tab} onChange={setTab} options={TYPE_TABS.map(value => ({ value, label: value }))} /></div>
              <div className="ar-view"><SegmentedControl label="좌표와 표" value={view} onChange={setView} options={[{ value: 'plot', label: '좌표' }, { value: 'table', label: '표' }]} /></div>
              <div className="ar-chips">
                {years.length > 0 && <label className="filter-chip"><span aria-hidden="true">{chosenYear}학년도</span><select aria-label="학년도" value={chosenYear} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y}학년도</option>)}</select><Icon name="chevron-down" size={16} /></label>}
              </div>
            </div>
            <section className="ar-card" aria-label="내 비교 그래프">
              <div className="ar-head"><p className="ar-lead">내 비교에 담은 {visible.length}개 학과의 {chosenYear ? `${chosenYear}학년도 ` : ''}{cutLabel}이에요. 점 모양은 전형 유형이에요.</p>
                <Link className="t-link t-caption" to="/five-to-nine?view=mine">5 to 9에서 근거 보기 ›</Link></div>
              <div className="ic-legend" aria-hidden="true">{['교과', '종합', '논술', '기타'].map(t => <span key={t}><Mark type={t} />{t}</span>)}{mine && <span><i className="ic-band-key" />내 환산 범위</span>}</div>
              {!visible.length ? <p className="ar-muted">이 유형으로 담은 학과가 없어요.</p> : view === 'table'
                ? <div className="table-scroll"><table className="data-table ar-table"><thead><tr><th scope="col">학과</th><th scope="col">전형</th><th scope="col">{chosenYear}학년도 컷</th><th scope="col">기준</th></tr></thead>
                  <tbody>{points.map(({ x, cut }) => <tr key={x.interest.id} aria-selected={selected?.interest.id === x.interest.id} onClick={() => setPicked(x.interest.id)}>
                    <th scope="row"><button type="button" onClick={() => setPicked(x.interest.id)}>{label(x.interest)}</button></th><td>{x.interest.program}</td>
                    <td className="num">{cut ? `${cut.cut === 'cut_70' ? '70%' : '50%'} ${cut.row[cut.cut]}` : '—'}</td><td>{cut?.row.basis || (x.loading ? '읽는 중' : '좌표 없음')}</td></tr>)}</tbody></table></div>
                : <div className="result-plot ar-plot">
                  {mine && <div className="ar-plot__bubble-row" aria-hidden="true"><div><span className="ar-plot__bubble" style={{ left: pos((mine.lo + mine.hi) / 2) }}>내 환산 범위 약 {mine.lo.toFixed(1)}~{mine.hi.toFixed(1)}</span></div></div>}
                  <div className="ar-plot__body">
                    <div className="ar-plot__layer" aria-hidden="true">
                      {axisMinorTicks(range).map(t => <i className="ar-plot__grid ar-plot__grid--minor" key={`m${t}`} style={{ left: pos(t) }} />)}{axisTicks(range).map(t => <i className="ar-plot__grid" key={t} style={{ left: pos(t) }} />)}
                      {mine && <><i className="ar-plot__band" style={{ left: pos(mine.lo), width: `calc(${pos(mine.hi)} - ${pos(mine.lo)})` }} /><i className="ar-plot__mine" style={{ left: pos((mine.lo + mine.hi) / 2) }} /></>}
                    </div>
                    {points.map(({ x, cut }) => <div className="ar-plot__row ic-row" role="listitem" key={x.interest.id}>
                      <button type="button" className="ar-plot__name ic-name" aria-label={label(x.interest)} onClick={() => setPicked(x.interest.id)}><UniversityLogo university={x.interest.university} /><span><span>{short(x.interest.university)}</span> <span>{x.interest.department || x.interest.program}</span></span></button>
                      <div className="ar-plot__track">{cut ? <button type="button" className={`ic-point${selected?.interest.id === x.interest.id ? ' is-picked' : ''}`} style={{ left: pos(cut.value) }}
                        aria-label={`${label(x.interest)} ${chosenYear}학년도 ${cut.cut === 'cut_70' ? '70%' : '50%'} 컷 ${cut.row[cut.cut]}`} onClick={() => { setPicked(x.interest.id); setOpened(cut.row); }}>{selected?.interest.id === x.interest.id && <svg className="ic-ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg>}<Mark type={x.type || '교과'} /></button>
                        : <span className="ar-muted ic-none">{x.loading ? '읽는 중' : x.rows.length ? `${chosenYear}학년도 컷 없음` : '입결 없음'}</span>}</div>
                    </div>)}
                    <div className="ar-plot__axis" aria-hidden="true"><div>{axisTicks(range).map(t => <span key={t} style={{ left: pos(t) }}>{Math.round(t * 10) / 10}</span>)}</div></div>
                  </div>
                </div>}
              <p className="ar-source">출처: 각 대학 공식 수시 입시결과 · 어디가 대학 제공 결과 · 대학마다 컷 산출 기준이 달라요 · 검수 전 참고자료</p>
            </section>
          </>}
      </div>
      <aside className="ar-side ic-side" aria-label="내 비교 목록과 고른 학과">{list}{shown.length > 0 && detail}</aside>
    </div>
    <p className="disclaimer-note ar-note"><Icon name="info" size={16} /><span>각 대학이 공식 발표한 수시 입결을 모은 참고 자료예요 · 대학마다 컷 산출 기준이 달라 대학끼리 같은 축에서 바로 비교하기 어려워요 · 내 환산 범위는 5 to 9 추정값이에요 · 대학 공식 자료가 최종 기준이에요</span></p>
    {adding && index && <AddModal index={index} interests={interests ?? []} onClose={() => setAdding(false)} />}
    {opened && <Modal wide label="입결 원문 상세" onClose={() => setOpened(null)}><div className="section-row"><h3 className="t-heading-3">{opened.recruit_unit} · {opened.result_year}학년도</h3><button className="button-outline" onClick={() => setOpened(null)}>닫기</button></div><CollectedResultFields row={opened} /></Modal>}
  </section>;
}

/** 학교·학과 추가: 왼쪽에서 대학을 고르면 오른쪽에 수시 입결이 있는 학과가 나오고, 하트로 담아요(전형은 그 학과의 최근 컷 있는 전형). */
function AddModal({ index, interests, onClose }: { index: CollectedIndex; interests: Interest[]; onClose: () => void }) {
  const [q, setQ] = useState(''), [university, setUniversity] = useState(''), [rows, setRows] = useState<ResultRow[] | null>(null), [error, setError] = useState('');
  const names = index.universities.map(e => e.university).filter(n => matchesUniversityIdentity(n, q));
  useEffect(() => {
    if (!university) return;
    let live = true; setRows(null);
    const entry = index.universities.find(e => e.university === university)!;
    loadSusiRows(entry).then(v => { if (live) setRows(v); }).catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [university]);
  const units = useMemo(() => {
    const map = new Map<string, ResultRow[]>();
    for (const r of rows ?? []) if (r.round === '수시' && r.recruit_unit.trim()) map.set(r.recruit_unit.trim(), [...(map.get(r.recruit_unit.trim()) ?? []), r]);
    return [...map].map(([name, list]) => {
      const best = [...list].sort((a, b) => Number(b.result_year) - Number(a.result_year) || Number(gradeCut(b) !== null) - Number(gradeCut(a) !== null))[0];
      return { name, program: best.program, types: [...new Set(list.map(typeTab))].join(' · ') };
    }).filter(u => !q.trim() || u.name.includes(q.trim()) || matchesUniversityIdentity(university, q)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [rows, q]);
  const saved = (unit: string) => interests.filter(i => i.university === university && i.department === unit);
  const toggle = async (unit: { name: string; program: string }) => {
    setError('');
    try {
      const have = saved(unit.name);
      if (have.length) await studentDb.interests.bulkDelete(have.map(i => i.id));
      else if (interests.length >= COMPARE_MAX) setError(`내 비교는 ${COMPARE_MAX}개까지예요. 다른 학과의 하트를 먼저 빼 주세요.`);
      else await studentDb.setInterest(university, unit.program, true, unit.name);
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
  };
  return <Modal wide label="학교·학과 추가" onClose={onClose}>
    <div className="section-row"><h3 className="t-heading-3">학교·학과 추가</h3><button type="button" className="icon-button" aria-label="닫기" onClick={onClose}><Icon name="x" size={24} /></button></div>
    <p className="t-label">{Math.min(interests.length, COMPARE_MAX)} / {COMPARE_MAX}개 담음</p>
    <label className="ar-search ic-search"><Icon name="search" size={20} /><input className="text-input" type="search" aria-label="대학·학과 검색" placeholder="대학·학과 검색" value={q} onChange={e => setQ(e.target.value)} /></label>
    {error && <p className="error-note" role="alert">{error}</p>}
    <div className="ic-add">
      <ul className="ic-add__univs" aria-label="대학">{names.map(n => <li key={n}><button type="button" aria-current={n === university || undefined} onClick={() => setUniversity(n)}><UniversityLogo university={n} />{currentUniversityName(n)}</button></li>)}</ul>
      <ul className="ic-add__units" aria-label="학과">{!university ? <li className="ar-muted">왼쪽에서 대학을 골라 주세요</li> : !rows ? <li className="ar-muted">학과를 읽고 있어요</li> : !units.length ? <li className="ar-muted">수시 입결이 있는 학과가 없어요</li>
        : units.map(u => <li key={u.name}><span><strong>{u.name}</strong><span className="t-caption text-muted">{u.types}</span></span>
          <button type="button" className="interest-heart ic-heart" aria-pressed={saved(u.name).length > 0} aria-label={`${currentUniversityName(university)} ${u.name} ${saved(u.name).length ? '관심에서 빼기' : '관심에 담기'}`} onClick={() => void toggle(u)}><Icon name="heart" size={20} /></button></li>)}</ul>
    </div>
    <div className="toolbar"><button type="button" className="button-primary" onClick={onClose}>다 담았어요</button></div>
  </Modal>;
}
