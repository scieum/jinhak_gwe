import 'fake-indexeddb/auto';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { studentDb } from '../src/store/studentDb';
import { MemoryRouter } from 'react-router-dom';
import { parsePlanCatalog, matchesPlan, matchesProgram, matchedUnits, programUnits, planPageUrl, planCampusCategory, withPlanFoundings } from '../src/domain/admissionPlans';
import { parseUnivMap } from '../src/domain/univMap';
import { AdmissionsList, quotaDelta } from '../src/screens/AdmissionsList';
import { loadAdmissionPlans } from '../src/data/admissionPlans';

// 3천여 전형 행 자료라 병렬 실행 중 jsdom 렌더가 기본 5초를 넘을 수 있어요
vi.setConfig({ testTimeout: 20_000 });
const raw = () => JSON.parse(readFileSync('public/data/admission-plans.json', 'utf8'));
const catalog = parsePlanCatalog(raw());
const mapFile = JSON.parse(readFileSync('public/data/univ-map.json', 'utf8'));
const mapCampuses = parseUnivMap(mapFile).campuses;
const classified = withPlanFoundings(catalog, mapCampuses);
afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await studentDb.interests.clear(); });
function serve() { vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('univ-map') ? mapFile : catalog)))); }
function at(path = '/admissions-list') { return render(<MemoryRouter initialEntries={[path]}><AdmissionsList /></MemoryRouter>); }

test('공식 포털 202개 캠퍼스의 다운로드 출처와 파일 해시를 보존하고 모든 요약에 근거 쪽수가 있다', () => {
  const portals = JSON.parse(readFileSync('../work/_data/admission-plans/portal-plans.json', 'utf8'));
  expect(catalog.entries).toHaveLength(218);
  expect(new Set(catalog.entries.map(p => p.university)).size).toBe(194);
  for (const portal of portals) {
    const entry = catalog.entries.find(p => p.id === `plan-${portal.code}`)!;
    expect(`${entry.university}[${entry.campus}]`).toBe(portal.name);
    const document = entry.documents.find(d => d.id === `document-${portal.code}`)!;
    expect(document.download_url).toBe(portal.file_url);
    const meta = JSON.parse(readFileSync(`../work/_data/admission-plans/sources/${document.id}.meta.json`, 'utf8'));
    expect(meta.sha256).toBe(document.sha256);
  }
  // 22 hand summaries + per-type rows from the structured packages (build_admission_plan_programs.py), PDF page evidence only.
  expect(catalog.entries.flatMap(e => e.programs)).toHaveLength(3107); // 2026-11-27 한국교원대 2 → 10개 전형
  expect(catalog.entries.filter(e => e.programs.length)).toHaveLength(179);
  const checked = new Set<string>();
  for (const entry of catalog.entries) for (const program of entry.programs) {
    const document = entry.documents.find(d => d.id === program.document_id)!;
    // New collection evidence stays local with its originals. A code checkout still validates
    // the public catalog; when local evidence exists, independently reconcile its file hash.
    const metaPath = `../work/_data/admission-plans/sources/${document.id}.meta.json`;
    if (!checked.has(document.id) && existsSync(metaPath)) expect(JSON.parse(readFileSync(metaPath, 'utf8')).sha256).toBe(document.sha256);
    checked.add(document.id);
    expect(program.pages.every(p => p <= document.page_count!)).toBe(true);
  }
  const sgu = catalog.entries.flatMap(e => e.notices.map(n => ({ university: e.university, url: n.url }))).filter(n => new URL(n.url).hostname === 'sgu.ac.kr');
  expect(sgu.length).toBeGreaterThan(0);
  expect(sgu.every(n => n.university === '신경주대학교')).toBe(true);
});

// Downloaded third-party originals stay local; CI verifies their recorded metadata above.
const originals = [...new Map(catalog.entries.flatMap(e => e.documents).filter(d => !d.id.startsWith('archive-')).map(d => [d.id, d])).values()];
test.skipIf(!originals.every(d => existsSync(`../work/_data/admission-plans/sources/${d.id}.${d.format}`)))('로컬 원문 파일을 보관한 환경에서는 실제 바이트의 SHA-256도 검증한다', () => {
  for (const document of originals) {
    const data = readFileSync(`../work/_data/admission-plans/sources/${document.id}.${document.format}`);
    expect(createHash('sha256').update(data).digest('hex')).toBe(document.sha256);
  }
});

test('검수 상태·학년도·출처·쪽수·중복 캠퍼스가 잘못된 자료를 거부한다', () => {
  const changes = [
    (v: ReturnType<typeof raw>) => { v.entries[0].review_status = 'released'; },
    (v: ReturnType<typeof raw>) => { v.entries[0].year = 2027; },
    (v: ReturnType<typeof raw>) => { v.entries[0].documents[0].download_url = 'javascript:alert(1)'; },
    (v: ReturnType<typeof raw>) => { v.entries[0].documents[0].source_url = 'https://user:secret@example.com'; },
    (v: ReturnType<typeof raw>) => { v.entries.push(v.entries[0]); },
    (v: ReturnType<typeof raw>) => { v.entries.find((e: { programs: unknown[] }) => e.programs.length).programs[0].pages = [9999]; },
    (v: ReturnType<typeof raw>) => { v.entries.find((e: { programs: unknown[] }) => e.programs.length).programs[0].document_id = 'missing'; },
  ];
  for (const change of changes) { const value = raw(); change(value); expect(() => parsePlanCatalog(value)).toThrow(); }
});

test('대학 약칭 검색과 PDF 쪽수 링크는 캠퍼스·문서 형식을 보존한다', () => {
  const plan = catalog.entries.find(e => e.university === '한림대학교')!;
  expect(matchesPlan(plan, '한림대 본교')).toBe(true);
  expect(matchesPlan(plan, '한림대 분교')).toBe(false);
  expect(planPageUrl(plan.documents[0], 13)).toContain('#page=13');
  const archive = catalog.entries.flatMap(e => e.documents).find(d => d.format === 'zip')!;
  expect(planPageUrl(archive, 1)).toBe(archive.download_url);
});

const rowsShown = () => screen.getAllByRole('link', { name: /전형계획 보기$/ });
const first = (name: string) => screen.getAllByRole('button', { name })[0];

test('설립을 공개 대학 목록으로 연결하고 분교와 번호 캠퍼스를 구분한다', () => {
  expect(classified.entries.every(p => p.founding)).toBe(true);
  expect(classified.entries.find(p => p.university === '서울대학교')?.founding).toBe('국립');
  expect(classified.entries.find(p => p.university === '서울시립대학교')?.founding).toBe('공립');
  expect(classified.entries.find(p => p.university === '고려대학교(세종)')?.founding).toBe('사립');
  const special = { ...mapCampuses[0], name: catalog.entries[0].university, aliases: [], founding: '특별법 법인' as const };
  expect(withPlanFoundings(catalog, [special]).entries[0].founding).toBe('그 밖');
  expect(withPlanFoundings(catalog, [special, { ...special, founding: '사립' }]).entries[0].founding).toBeUndefined();
  expect(planCampusCategory('본교')).toBe('본교');
  expect(planCampusCategory('분교')).toBe('분교');
  expect(planCampusCategory('제2캠퍼스')).toBe('제2캠퍼스 이상');
  expect(planCampusCategory('제4캠퍼스')).toBe('제2캠퍼스 이상');
  expect(planCampusCategory('확인 중')).toBeUndefined();
  expect(withPlanFoundings(catalog, []).entries.every(p => p.founding === undefined)).toBe(true);
});

test('설립은 같은 그룹에서 합집합, 캠퍼스와는 교집합으로 적용하고 해제하면 복원한다', async () => {
  serve(); at();
  await screen.findByText('전형 3107개');
  const countPrograms = (foundings: string[], campus?: string) => classified.entries
    .filter(p => foundings.includes(p.founding!) && (!campus || planCampusCategory(p.campus) === campus))
    .reduce((n, p) => n + p.programs.length, 0);
  fireEvent.click(first('국립'));
  expect(screen.getByText(`전형 ${countPrograms(['국립'])}개`)).toBeTruthy();
  fireEvent.click(first('공립'));
  expect(screen.getByText(`전형 ${countPrograms(['국립', '공립'])}개`)).toBeTruthy();
  fireEvent.click(first('제2캠퍼스 이상'));
  expect(screen.getByText(`전형 ${countPrograms(['국립', '공립'], '제2캠퍼스 이상')}개`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '초기화' }));
  expect(screen.getByText('전형 3107개')).toBeTruthy();
  fireEvent.click(first('사립'));
  fireEvent.click(first('분교'));
  const branchCount = countPrograms(['사립'], '분교');
  expect(branchCount).toBeGreaterThan(0);
  expect(screen.getByText(`전형 ${branchCount}개`)).toBeTruthy();
  expect(rowsShown().every(row => row.textContent?.includes('분교'))).toBe(true);
});

test('모바일 필터에서도 설립·캠퍼스를 함께 적용한다', async () => {
  serve(); at();
  await screen.findByText('전형 3107개');
  fireEvent.click(screen.getByRole('button', { name: '필터' }));
  const sheet = screen.getByRole('dialog', { name: '필터' });
  fireEvent.click(within(sheet).getByRole('button', { name: '사립' }));
  fireEvent.click(within(sheet).getByRole('button', { name: '분교' }));
  const count = classified.entries.filter(p => p.founding === '사립' && p.campus === '분교').reduce((n, p) => n + p.programs.length, 0);
  fireEvent.click(within(sheet).getByRole('button', { name: `전형 ${count}개 보기` }));
  expect(screen.getByText(`전형 ${count}개`)).toBeTruthy();
});

test('설립 보조 자료 실패 시 목록은 유지하고 설립 필터만 비활성화한다', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('univ-map') ? new Response('', { status: 503 }) : new Response(JSON.stringify(catalog))));
  at();
  await screen.findByText('전형 3107개');
  expect((first('사립') as HTMLButtonElement).disabled).toBe(true);
  expect((first('분교') as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByText(/설립 정보를 확인하지 못한 캠퍼스 218곳/)).toBeTruthy();
  serve();
  fireEvent.click(screen.getByRole('button', { name: '설립 정보 다시 불러오기' }));
  await waitFor(() => expect((first('사립') as HTMLButtonElement).disabled).toBe(false));
});

test('학생 성적이 샘플 모드여도 실제 전체 전형계획을 표시한다', async () => {
  const previous = localStorage.getItem('jinhak-navi-sample');
  localStorage.setItem('jinhak-navi-sample', 'on');
  try {
    serve(); at();
    expect(await screen.findByText('전형 3107개')).toBeTruthy();
    expect(screen.getByText('대학 194곳 · 캠퍼스 218곳')).toBeTruthy();
    expect(screen.queryByText('전형 12개')).toBeNull();
    expect(screen.queryByText(/샘플의 대학·숫자는 예시예요/)).toBeNull();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('data/admission-plans.json'));
    expect(rowsShown()).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('2 / 315')).toBeTruthy();
    expect(rowsShown()).toHaveLength(10);
    expect(localStorage.getItem('jinhak-navi-sample')).toBe('on');
  } finally {
    if (previous === null) localStorage.removeItem('jinhak-navi-sample');
    else localStorage.setItem('jinhak-navi-sample', previous);
  }
});
test('전형 1행 목록: 검색·상세 원문·유형 칩·지역 칩·페이지(10행)와 성적 판정 제외 안내', async () => {
  serve(); at('/admissions-list?q=한림대');
  fireEvent.click((await screen.findAllByRole('link', { name: '한림대학교 학생부교과(교과우수자전형) 전형계획 보기' }))[0]);
  const detail = screen.getByRole('region', { name: '한림대학교 본교 전형계획 상세' });
  expect(within(detail).getAllByText('학생부교과(교과우수자전형)').length).toBeGreaterThan(0);
  expect(within(detail).getByText(/성적 판정에 사용하지 않아요/)).toBeTruthy();
  expect(within(detail).getAllByRole('link', { name: /PDF 13쪽/ })[0].getAttribute('href')).toContain('#page=13');
  fireEvent.click(within(detail).getByRole('button', { name: '상세 닫기' }));
  expect(screen.queryByRole('region', { name: '한림대학교 본교 전형계획 상세' })).toBeNull();
  fireEvent.change(screen.getByLabelText('대학·학과 이름으로 찾기'), { target: { value: '없는대학명' } });
  expect(screen.getByText("'없는대학명'에 맞는 대학이 없어요")).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
  expect(rowsShown()).toHaveLength(10);
  expect(screen.getByText('1 / 315')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  expect(screen.getByText('2 / 315')).toBeTruthy();
  fireEvent.click(first('종합 565'));
  expect(screen.getByText('전형 565개')).toBeTruthy();
  expect(screen.getByText('1 / 57')).toBeTruthy();
  fireEvent.click(first('강원'));
  expect(screen.getByText('전형 24개')).toBeTruthy();
  fireEvent.click(first('면접 있음'));
  expect(screen.getByText('전형 3개')).toBeTruthy();
  fireEvent.click(first('사립'));
  expect(rowsShown().length).toBeGreaterThan(0);
  const privateNames = classified.entries.filter(p => p.founding === '사립' && p.region === '강원').map(p => p.university);
  expect(rowsShown().every(row => privateNames.some(name => row.getAttribute('aria-label')?.startsWith(`${name} `)))).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '초기화' }));
  expect(screen.getByText('전형 3107개')).toBeTruthy();
}, 30_000);

test('하트로 담고 관심만 보기에서 뺄 때는 한 번 묻는다', async () => {
  serve(); at('/admissions-list?q=한림대');
  const heart = (await screen.findAllByRole('button', { name: '한림대학교 학생부교과(지역인재전형) 관심에 담기' }))[0];
  fireEvent.click(heart);
  expect(await screen.findByText('관심 전형에 담았어요')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '관심만 보기 1' }));
  await waitFor(() => expect(screen.getByText('전형 1개')).toBeTruthy());
  fireEvent.click(screen.getAllByRole('button', { name: '한림대학교 학생부교과(지역인재전형) 관심에서 빼기' })[0]);
  fireEvent.click(within(screen.getByRole('dialog', { name: '관심에서 뺄까요?' })).getByRole('button', { name: '빼기' }));
  expect(await screen.findByText('아직 담은 전형이 없어요')).toBeTruthy();
});

test('학과까지 담은 다른 화면 관심도 같은 전형 줄에서 채워 보이고, 빼면 그 전형 관심이 모두 빠진다', async () => {
  await studentDb.setInterest('한림대학교', '학생부교과(지역인재전형)', true, '간호학과');
  await studentDb.setInterest('한림대학교', '학생부교과(지역인재전형)', true, '사회복지학부');
  serve(); at('/admissions-list?q=한림대');
  fireEvent.click((await screen.findAllByRole('button', { name: '한림대학교 학생부교과(지역인재전형) 관심에서 빼기' }))[0]);
  await waitFor(async () => expect(await studentDb.interests.count()).toBe(0), { timeout: 5000 });
  expect(await screen.findByText('관심 전형에서 뺐어요')).toBeTruthy();
});
test('직접 연결된 캠퍼스 상세는 목록 필터와 독립적으로 열리고 ZIP 파일명을 안내한다', async () => {
  serve();
  const plan = catalog.entries.find(e => e.documents[0].filename)!;
  at(`/admissions-list?q=없는대학&plan=${plan.id}`);
  const detail = await screen.findByRole('region', { name: `${plan.university} ${plan.campus} 전형계획 상세` });
  expect(within(detail).getByText(`ZIP 안의 파일: ${plan.documents[0].filename}`)).toBeTruthy();
  expect(within(detail).getAllByRole('link', { name: /원문 열기/ })[0].getAttribute('href')).not.toContain('#page=');
});

test('우리 서버 PDF 사본은 규칙 이름으로 내려받고, 쪽 링크는 사본을 새 탭으로 열며, 원래 게시 페이지는 출처로 남긴다', async () => {
  serve();
  const plan = catalog.entries.find(e => e.university === '성균관대학교' && e.campus === '본교')!;
  const doc = plan.documents.find(d => d.local_file)!;
  const name = '2028_성균관대학교_시행계획.pdf', href = `/plans/${encodeURIComponent(name)}`;
  at(`/admissions-list?plan=${plan.id}`);
  const detail = await screen.findByRole('region', { name: '성균관대학교 본교 전형계획 상세' });
  const download = within(detail).getByRole('link', { name: '원문 내려받기 (PDF)' });
  expect([download.getAttribute('href'), download.getAttribute('download'), download.getAttribute('target')]).toEqual([href, name, null]);
  expect(within(detail).getByRole('link', { name: '출처: 성균관대학교 입학처 게시 페이지 ↗' }).getAttribute('href')).toBe(doc.source_url);
  const page = within(detail).getAllByRole('link', { name: /^PDF \d+쪽/ })[0];
  expect(page.getAttribute('href')).toMatch(new RegExp(`^${href}#page=\\d+$`));
  expect(page.getAttribute('target')).toBe('_blank');
  // 사본이 없는 HWPX는 지금처럼 원래 링크
  const hwpx = plan.documents.find(d => d.format === 'hwpx')!;
  expect(within(detail).getByRole('link', { name: '원문 열기 (HWPX) ↗' }).getAttribute('href')).toBe(hwpx.download_url);
});

test('조회 실패는 빈 검색과 구분하고 재시도한다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify(catalog))).mockResolvedValueOnce(new Response(JSON.stringify(mapFile))));
  at('/admissions-list?plan=missing');
  expect((await screen.findByRole('alert')).textContent).toContain('전형계획 자료를 불러오지 못했어요');
  expect(screen.queryByText(/조건에 맞는 전형이 없어요/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
  await screen.findByText(/고른 전형을 목록에서 찾지 못했어요/);
  expect(rowsShown()).toHaveLength(10);
});

test('로더는 구조가 잘못된 응답을 빈 목록으로 바꾸지 않는다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ entries: [] }))));
  await expect(loadAdmissionPlans()).rejects.toThrow();
});

test('보강 요약의 항목별 쪽수·면접·캠퍼스 조건을 보존하고 빠진 근거를 거부한다', () => {
  const chuncheon = catalog.entries.find(e => e.id === 'plan-0000003')!;
  const samcheok = catalog.entries.find(e => e.id === 'plan-0000004')!;
  expect(chuncheon.programs.find(p => p.name === '학생부교과(일반전형)')!.minimum).toContain('필수 영역');
  expect(samcheok.programs.find(p => p.name === '학생부교과(일반전형)')!.minimum).toBe('미적용.');
  for (const entry of catalog.entries) for (const program of entry.programs.filter(p => p.field_pages)) {
    expect(program.interview).toBeTruthy();
    expect(program.scope).toBeTruthy();
    expect(Object.values(program.field_pages!).flat().every(page => program.pages.includes(page))).toBe(true);
  }
  const value = raw();
  value.entries.find((e: { id: string }) => e.id === 'plan-0000003').programs[0].field_pages.minimum = [39];
  expect(() => parsePlanCatalog(value)).toThrow();
});

test('전형 요약은 면접 여부와 각 항목의 PDF 근거를 바로 제공한다', async () => {
  serve(); at('/admissions-list?plan=plan-0000063');
  const detail = await screen.findByRole('region', { name: '가천대학교 본교 전형계획 상세' });
  expect(within(detail).getAllByText('있음. 2단계에서 50% 반영.')).toHaveLength(2);
  expect(within(detail).getByRole('link', { name: '지원자격 근거 PDF 9쪽 ↗' }).getAttribute('href')).toContain('#page=9');
});

test('모집인원 증감은 전년 값이 있을 때만 계산하고, 배너는 닫기 없이 전형 성향 탐색으로 간다', async () => {
  expect(quotaDelta('426명', '388명')).toBe(38);
  expect(quotaDelta('1,054명', '1,060')).toBe(-6);
  expect(quotaDelta('426명', undefined)).toBeNull();
  expect(quotaDelta('모집단위별 원문 확인', '10명')).toBeNull();
  serve(); at();
  expect(screen.getByRole('link', { name: /나의 준비 방식 찾기/ }).getAttribute('href')).toBe('/admission-style');
  expect(screen.queryByRole('button', { name: /배너 닫기|다시 보지 않기/ })).toBeNull();
});

// 2026-11-25 "필터만 넣으면 이상하게 나온다": 계열·조건 칩이 실제 자료에서 0개가 되거나 말없이 빠지지 않는지 실제 admission-plans.json으로 확인
const statusLines = () => screen.queryAllByRole('status').flatMap(s => [...s.querySelectorAll('p.t-caption')].map(p => p.textContent));
const programs = classified.entries.flatMap(e => e.programs);
test('실제 자료 필터 조합: 지역+유형, 계열, 수능최저+면접, 설립이 0이 아닌 개수를 내고 빠진 원문 확인·계열 미연결 개수를 알린다', async () => {
  serve(); at();
  await screen.findByText('전형 3107개');
  fireEvent.click(first('강원')); fireEvent.click(screen.getAllByRole('button', { name: /^교과 \d+$/ })[0]);
  expect(screen.getByText('전형 22개')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '초기화' }));
  const engineering = programs.filter(p => p.fields?.includes('공학')).length;
  expect(engineering).toBe(507); // 2026-11-26 계열표 대학 이름 표기를 맞춰 계열 연결이 늘었어요(634 → 933개 전형)
  fireEvent.click(first('공학'));
  expect(screen.getByText(`전형 ${engineering}개`)).toBeTruthy();
  expect(statusLines()).toEqual([`계열은 검수 전 학과 계열표 기준이에요 · 계열 정보가 없는 전형 ${programs.filter(p => !p.fields).length}개는 빠졌어요`]);
  fireEvent.click(screen.getByRole('button', { name: '초기화' }));
  fireEvent.click(first('수능최저 있음')); fireEvent.click(first('면접 있음'));
  expect(screen.getByText('전형 30개')).toBeTruthy();
  expect(statusLines()).toEqual(['수능최저가 원문 확인인 전형 75개는 빠졌어요', '면접이 원문 확인인 전형 161개는 빠졌어요']);
  fireEvent.click(screen.getByRole('button', { name: '초기화' }));
  fireEvent.click(first('국립'));
  expect(screen.getByText('전형 398개')).toBeTruthy();
  expect(statusLines()).toEqual([]);
  for (const field of ['인문', '사회', '자연', '공학', '의약', '예체능'] as const) expect(programs.filter(p => p.fields?.includes(field)).length).toBeGreaterThan(100);
});

test('재학생만은 자격 자료가 없어 막아 두고, 모바일 필터 시트도 계열·빠진 개수 안내를 같게 보여 준다', async () => {
  serve(); at();
  await screen.findByText('전형 3107개');
  const only = screen.getAllByRole('button', { name: '재학생만, 자격 자료 준비 중' })[0] as HTMLButtonElement;
  expect([only.disabled, only.title]).toEqual([true, '자격 자료 준비 중']);
  fireEvent.click(screen.getByRole('button', { name: '필터' }));
  const sheet = screen.getByRole('dialog', { name: '필터' });
  expect((within(sheet).getByRole('button', { name: '재학생만, 자격 자료 준비 중' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(sheet).getByRole('button', { name: '공학' }));
  expect(within(sheet).getByText(/계열 정보가 없는 전형 2174개는 빠졌어요/)).toBeTruthy();
  fireEvent.click(within(sheet).getByRole('button', { name: '전형 507개 보기' }));
  expect(screen.getByText('전형 507개')).toBeTruthy();
});

test('검색창: 한글 조합 중에는 입력값을 덮어쓰지 않고, 조합이 끝나면 검색해요(맥 자모 분리 방지)', async () => {
  serve(); at();
  const input = await screen.findByLabelText('대학·학과 이름으로 찾기') as HTMLInputElement;
  fireEvent.compositionStart(input);
  fireEvent.input(input, { target: { value: '한ㄹ' }, isComposing: true });
  expect(input.value).toBe('한ㄹ'); // 조합 중 값이 그대로 남아요
  fireEvent.input(input, { target: { value: '한림' }, isComposing: true });
  fireEvent.compositionEnd(input, { data: '림' });
  expect(input.value).toBe('한림');
  await waitFor(() => expect(rowsShown().length).toBeGreaterThan(0));
  expect(rowsShown().every(r => r.textContent!.includes('한림'))).toBe(true);
});

test('원문 합성 지역(전남광주)은 캠퍼스 주소의 시·도로 보여요 — 실제 자료 전수', () => {
  const plans = parsePlanCatalog(JSON.parse(readFileSync('public/data/admission-plans.json', 'utf8')));
  const map = parseUnivMap(JSON.parse(readFileSync('public/data/univ-map.json', 'utf8')));
  const fixed = withPlanFoundings(plans, map.campuses).entries;
  const at = (u: string, c = '본교') => fixed.find(p => p.university === u && p.campus === c)!.region;
  expect(at('조선대학교')).toBe('광주');
  expect(at('국립순천대학교')).toBe('전남');
  expect(at('전남대학교')).toBe('광주');
  expect(at('전남대학교', '제2캠퍼스')).toBe('전남');
  expect(fixed.filter(p => p.region === '전남광주')).toHaveLength(0);
  expect(at('가야대학교')).toBe('경남'); // 원래 시·도 이름은 그대로
});

test('지역 묶음을 고르면 세부 시·도 칩이 나오고, 시·도를 고르면 그 시·도만 보여요', async () => {
  serve(); at('/admissions-list');
  await screen.findAllByRole('link', { name: /전형계획 보기$/ });
  expect(screen.queryByRole('group', { name: '세부 지역' })).toBeNull();
  fireEvent.click(first('광주·전라'));
  const subs = screen.getByRole('group', { name: '세부 지역' });
  expect(within(subs).getAllByRole('button').map(b => b.textContent)).toEqual(['광주', '전북', '전남']);
  fireEvent.click(within(subs).getByRole('button', { name: '전남' }));
  const regions = screen.getAllByRole('row').slice(1).map(r => r.querySelectorAll('td')[1]?.textContent).filter(Boolean);
  expect(regions.length).toBeGreaterThan(0);
  expect(new Set(regions)).toEqual(new Set(['전남']));
  fireEvent.click(first('광주·전라')); // 묶음을 끄면 세부 칩도 사라져요
  expect(screen.queryByRole('group', { name: '세부 지역' })).toBeNull();
});

test('서울처럼 시·도가 하나인 묶음은 세부 칩이 없어요', async () => {
  serve(); at('/admissions-list');
  await screen.findAllByRole('link', { name: /전형계획 보기$/ });
  fireEvent.click(first('서울'));
  expect(screen.queryByRole('group', { name: '세부 지역' })).toBeNull();
});

test('학과 검색: 학과 이름으로 찾으면 그 학과가 있는 전형만 남고, 모집단위 칸의 학과를 누르면 수시 입결의 그 학과로 가요', async () => {
  serve(); at('/admissions-list?q=의예');
  await screen.findByText(/^전형 \d+개$/);
  const shown = rowsShown();
  expect(shown.length).toBeGreaterThan(0);
  const links = screen.getAllByRole('link', { name: /의예과 최근 3년 입결 보기$/ });
  expect(links.length).toBeGreaterThan(0);
  const href = new URL(links[0].getAttribute('href')!, 'http://x');
  expect(href.pathname).toBe('/admission-results');
  expect(href.searchParams.get('gd')).toMatch(/의예/);
  expect(href.searchParams.get('gu')).toBeTruthy();
});

test('대학과 학과를 섞어 찾을 수 있어요(연세 의예)', () => {
  const yonsei = classified.entries.find(p => p.university === '연세대학교' && p.campus === '본교')!;
  const program = yonsei.programs.find(p => programUnits(p).includes('의예과'))!;
  expect(matchesProgram(yonsei, program, '연세 의예')).toBe(true);
  expect(matchedUnits(yonsei, program, '연세 의예')).toEqual(['의예과', '치의예과']); // 검색어로 시작하는 학과가 먼저
  expect(matchedUnits(yonsei, program, '연세')).toEqual([]); // 대학 이름으로만 찾으면 학과 링크 대신 원래 모집단위 표시
  expect(matchesProgram(yonsei, program, '연세 수의예')).toBe(false);
});
