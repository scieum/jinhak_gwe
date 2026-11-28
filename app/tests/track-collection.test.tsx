import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { classifyTrack, collectTracks, filterTrackCollection, readTrackFilters } from '../src/domain/trackCollection';
import { parsePlanCatalog, type AdmissionPlan, type PlanCatalog } from '../src/domain/admissionPlans';
import { parseTierDraft } from '../src/domain/deptTier';
import { TRACKS } from '../src/domain/specialTracks';
import { ReferenceTrackCollection } from '../src/screens/ReferenceTrackCollection';
import { studentDb } from '../src/store/studentDb';
import { departmentOf, departmentOptions } from '../src/domain/trackDepartments';

const entry: AdmissionPlan = {
  id: 'campus-a', university: '가나다대학교', campus: '본교', region: '서울', year: 2028, review_status: 'draft', notices: [],
  documents: [{ id: 'doc', label: '시행계획', provider: 'university', source_url: 'https://example.ac.kr/plan', download_url: 'https://example.ac.kr/plan.pdf', format: 'pdf', sha256: 'a'.repeat(64), checked_at: '2026-11-27', page_count: 10, filename: 'plan.pdf', year_check: 'text', topics: [], note: '' }],
  programs: [{ name: '지역인재', round: '수시', type: '교과', quota: '10', method: '교과 100', minimum: '있음', eligibility: '지역 고교 졸업', pages: [2], document_id: 'doc', units: [['의예과', 10, [2]], ['간호학과', 12, [3]]], pooled: [{ quota: 30, units: ['자유전공학부', '자율전공학부'], pages: [4] }] }],
};
const catalog: PlanCatalog = { format: 'jinhak-navi-admission-plans', version: 1, year: 2028, checked_at: '2026-11-27', review_status: 'draft', entries: [entry] };
const raw = { format: 'jinhak-navi-dept-tier', version: 1, fields: [], rows: [
  ['가나다대학교', '의예과', '교과', '지역인재', '2026', '1.2'], ['가나다대학교', '의예과', '종합', '서류형', '2025', '1.8'],
  ['나무대학교', '약학과', '교과', '일반', '2026', '1.7'],
  ...['국어교육과', '국어교육전공', '영어교육과', '일반사회교육과', '사회과교육과 역사교육전공'].map(name => ['교육대학교아님', name, '교과', '일반', '2026', '2.5']),
] };
const draft = parseTierDraft(raw);
function serve(planOk = true, resultOk = true) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => String(url).includes('admission-plans') ? new Response(JSON.stringify(catalog), { status: planOk ? 200 : 503 })
    : String(url).includes('dept-tier') ? new Response(JSON.stringify(raw), { status: resultOk ? 200 : 503 }) : new Response('{}')));
}
function Location() { const l = useLocation(), navigate = useNavigate(); return <><output aria-label="주소">{l.search}</output><button onClick={() => navigate(-1)}>뒤로</button></>; }
function open(path = '/special-tracks') { return render(<MemoryRouter initialEntries={[path]}><ReferenceTrackCollection /><Location /></MemoryRouter>); }
afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await studentDb.interests.clear(); });

test('학과 이름으로 명확한 계열만 분류하며 복수 소속을 보존한다', () => {
  expect(classifyTrack('대학', '의예과')).toEqual([{ track: '메디컬', sub: '의예' }]);
  expect(classifyTrack('대학', '의료공학과').some(m => m.track === '메디컬')).toBe(false);
  expect(classifyTrack('대학', '반도체공학과').some(m => m.track === '계약학과')).toBe(false);
  expect(classifyTrack('대학', '체육교육과').map(m => m.track)).toEqual(['교육', '체육']);
  expect(classifyTrack('대학', '간호학과')).toEqual([{ track: '보건', sub: '간호' }]);
  expect(classifyTrack('대학', '약학과(6년제)')).toEqual([{ track: '메디컬', sub: '약학' }]);
  expect(classifyTrack('대학', '의예과※(대전)')).toEqual([{ track: '메디컬', sub: '의예' }]);
  expect(classifyTrack('대학', '바이오의약학과')).toEqual([]);
});
test.each([
  ['국어교육과(교직)', '국어교육'], ['국어교육과교직', '국어교육'], ['한국어교육학과', '한국어교육'],
  ['외국어교육학부(중국어교육전공)', '중국어교육'], ['외국어교육학부(독일어교육전공)', '독일어교육'], ['독어교육과', '독일어교육'],
  ['일반사회교육과', '사회교육'], ['사회교육전공', '사회교육'], ['사회과교육과 역사교육전공', '역사교육'], ['사회과교육과 지리교육전공', '지리교육'],
  ['과학교육학부', '과학교육'], ['지구과학교육과', '지구과학교육'], ['물리교육전공', '물리교육'],
  ['특수교육과(초등특수교육전공)', '초등특수교육'], ['정보・컴퓨터교육과', '정보·컴퓨터교육'], ['기술·가정교육과', '기술·가정교육'],
  ['외국어교육학부', '외국어교육'], ['문헌정보교육과', '문헌정보교육'],
])('%s의 세부 학과를 %s로 묶고 상위 통합모집을 임의로 나누지 않는다', (name, expected) => {
  expect(departmentOf(name, '교육')).toBe(expected);
});
test('학과·전공 별칭은 하나의 선택지로 합치되 원래 모집단위명은 바꾸지 않는다', () => {
  expect(departmentOptions(['국어교육과', '국어교육전공', '영어교육과'], '교육')).toEqual(['국어교육', '영어교육']);
  expect(classifyTrack('대학', '국어교육과교직')).toEqual([{ track: '교육', sub: '사범대' }]);
});
test('공동선발 원문 총원을 보존하고 다른 학년도·전형 컷을 평균내지 않는다', () => {
  const rows = collectTracks(catalog, draft.units, draft.fields);
  expect(rows.find(r => r.unit === '의예과')?.results.map(r => r.cut_70)).toEqual(['1.2', '1.8']);
  expect(rows.find(r => r.unit === '자유전공학부')?.programs[0].quota).toEqual({ kind: 'pooled', quota: 30, units: 2, pages: [4] });
  expect(rows.find(r => r.university === '나무대학교')?.plan).toBeUndefined();
});
test('동일 학과가 두 캠퍼스에 있으면 입결을 임의 연결하지 않는다', () => {
  const second = { ...entry, id: 'campus-b', campus: '분교', region: '강원' };
  const rows = collectTracks({ ...catalog, entries: [entry, second] }, draft.units, []);
  const medical = rows.filter(r => r.unit === '의예과');
  expect(medical).toHaveLength(3);
  expect(medical.filter(r => r.plan).every(r => !r.results.length && r.ambiguousCampus)).toBe(true);
  expect(medical.find(r => !r.plan)?.results).toHaveLength(2);
  // 다른 캠퍼스의 학과 목록이 미수집이어도 본교 자료라고 추정하지 않는다.
  const incomplete = collectTracks({ ...catalog, entries: [entry, { ...second, programs: [] }] }, draft.units, []);
  expect(incomplete.find(r => r.plan && r.unit === '의예과')?.results).toHaveLength(0);
  expect(incomplete.find(r => !r.plan && r.unit === '의예과')?.ambiguousCampus).toBe(true);
});
test('입결 대학 이름 괄호가 전형계획 지역 한 곳과 맞으면 같은 줄로 합치고, 안 맞으면 따로 둔다', () => {
  const units = (name: string) => parseTierDraft({ ...raw, rows: [[name, '의예과', '교과', '지역인재', '2026', '1.3']] }).units;
  const merged = collectTracks(catalog, units('가나다대학교(서울)'), []).filter(r => r.unit === '의예과');
  expect(merged).toHaveLength(1);
  expect(merged[0].plan && merged[0].results.map(r => r.cut_70)).toEqual(['1.3']);
  expect(collectTracks(catalog, units('가나다대학교(강원)'), []).filter(r => r.unit === '의예과')).toHaveLength(2);
});
test('중복 입결과 빈값·0·다른 등급제 자료를 제외한다', () => {
  const r = draft.units[0].rows[0];
  const units = [{ ...draft.units[0], rows: [r, r, { ...r, cut_70: '0' }, { ...r, cut_70: '' }, { ...r, grade_system: '5' }] }];
  expect(collectTracks(null, units, [])[0].results).toHaveLength(1);
});
test('주소의 계열·세부값을 검증하고 검색·지역·유형을 함께 적용한다', () => {
  const rows = collectTracks(catalog, draft.units, []);
  const f = readTrackFilters(new URLSearchParams('track=보건&sub=간호&type=교과&region=서울&q=간호'));
  expect(filterTrackCollection(rows, f).map(r => r.unit)).toEqual(['간호학과']);
  expect(readTrackFilters(new URLSearchParams('track=없는계열&sub=간호&type=실기')).sub).toBe('');
  expect(filterTrackCollection(rows, { ...f, type: '종합' })).toHaveLength(0);
});
test('실제 배포 자료를 연결해 메디컬·보건·교육·자유전공을 탐색할 수 있다', () => {
  const plans = parsePlanCatalog(JSON.parse(readFileSync('public/data/admission-plans.json', 'utf8')));
  const results = parseTierDraft(JSON.parse(readFileSync('public/data/dept-tier.json', 'utf8')));
  const rows = collectTracks(plans, results.units, results.fields);
  for (const track of ['메디컬', '보건', '교육', '자유전공']) expect(rows.some(r => r.memberships.some(m => m.track === track))).toBe(true);
  expect(new Set(rows.map(r => r.key)).size).toBe(rows.length);
  console.info('계열 수집 범위:', Object.fromEntries(TRACKS.map(t => [t.id, rows.filter(r => r.memberships.some(m => m.track === t.id)).length])));
});
test('URL로 필터를 복원하고 상세에서 근거 쪽·연도별 입결·관심 저장을 제공한다', async () => {
  serve(); open('/special-tracks?track=메디컬&q=가나다');
  const button = await screen.findByRole('button', { name: '가나다대학교 의예과 본교 · 서울 상세 보기' });
  expect(screen.queryByText('나무대학교')).toBeNull();
  fireEvent.click(button);
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('모집인원: 10명')).toBeTruthy();
  expect(within(dialog).getByRole('link', { name: /시행계획 · 원문 2쪽/ }).getAttribute('href')).toContain('#page=2');
  expect(within(dialog).getByText('2025')).toBeTruthy(); expect(within(dialog).getByText('2026')).toBeTruthy();
  const interest = within(dialog).getByRole('button', { name: /관심에 담기/ });
  await waitFor(() => expect(interest.hasAttribute('disabled')).toBe(false));
  fireEvent.click(interest);
  await waitFor(async () => expect((await studentDb.interests.toArray())[0]?.department).toBe('의예과'));
  fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('dialog')).toBeNull();
});
test('계열·지역·검색을 바꾸고 초기화·뒤로가기로 결과를 복구한다', async () => {
  serve(); open(); await screen.findByRole('table');
  fireEvent.click(screen.getByRole('radio', { name: /보건/ }));
  expect(within(screen.getByRole('table')).getByText('간호학과')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '없는학교' } });
  expect(screen.getByText('조건에 맞는 자료가 없어요')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));
  expect(within(screen.getByRole('table')).getByText('간호학과')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '뒤로' }));
  expect(screen.getByRole('searchbox').getAttribute('value')).toBe('없는학교');
});
test('사범대 세부 학과 URL을 복원하고 뒤로가기·상위 분류 변경·초기화에 연동한다', async () => {
  serve(); open('/special-tracks?track=교육&sub=사범대&department=국어교육');
  await screen.findByRole('table');
  const select = screen.getByRole('combobox', { name: '세부 학과' }) as HTMLSelectElement;
  expect(select.value).toBe('국어교육');
  expect(within(screen.getByRole('table')).getByText('국어교육과')).toBeTruthy();
  expect(within(screen.getByRole('table')).getByText('국어교육전공')).toBeTruthy();
  expect(within(screen.getByRole('table')).queryByText('영어교육과')).toBeNull();
  fireEvent.change(select, { target: { value: '영어교육' } });
  expect(within(screen.getByRole('table')).getByText('영어교육과')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '뒤로' }));
  expect(select.value).toBe('국어교육');
  fireEvent.click(screen.getByRole('button', { name: '교대(초등교육)' }));
  expect(screen.getByLabelText('주소').textContent).not.toContain('department=');
  fireEvent.click(screen.getByRole('button', { name: '사범대' }));
  fireEvent.change(screen.getByRole('combobox', { name: '세부 학과' }), { target: { value: '역사교육' } });
  expect(within(screen.getByRole('table')).getByText('사회과교육과 역사교육전공')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));
  expect(within(screen.getByRole('table')).getByText('영어교육과')).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: /메디컬/ }));
  expect((screen.getByRole('combobox', { name: '세부 학과' }) as HTMLSelectElement).value).toBe('');
});
test('부분 실패 때 성공한 입결을 보여주고 재시도하면 전형계획을 복구한다', async () => {
  serve(false); open();
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText('가나다대학교')).toBeTruthy();
  serve(); fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
  await screen.findByRole('button', { name: '가나다대학교 의예과 본교 · 서울 상세 보기' });
  expect(screen.queryByRole('alert')).toBeNull();
});
test('두 자료 모두 실패하면 샘플 숫자 없이 오류와 재시도를 표시한다', async () => {
  serve(false, false); open(); await screen.findByRole('alert');
  expect(screen.queryByRole('table')).toBeNull(); expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeTruthy();
});
