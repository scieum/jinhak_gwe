import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { parsePlanCatalog, matchesPlan, planPageUrl } from '../src/domain/admissionPlans';
import { AdmissionsList } from '../src/screens/AdmissionsList';
import { loadAdmissionPlans } from '../src/data/admissionPlans';

const raw = () => JSON.parse(readFileSync('public/data/admission-plans.json', 'utf8'));
const catalog = parsePlanCatalog(raw());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function serve() { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(catalog)))); }
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
  expect(catalog.entries.flatMap(e => e.programs)).toHaveLength(8);
  for (const entry of catalog.entries) for (const program of entry.programs) {
    const document = entry.documents.find(d => d.id === program.document_id)!;
    const meta = JSON.parse(readFileSync(`../work/_data/admission-plans/sources/${document.id}.meta.json`, 'utf8'));
    expect(meta.sha256).toBe(document.sha256);
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

test('대학 검색·상세 원문·일부 전형 요약과 성적 판정 제외 안내를 보여준다', async () => {
  serve(); at('/admissions-list?q=한림대');
  fireEvent.click(await screen.findByRole('button', { name: '한림대학교 본교 전형계획 보기' }));
  const detail = screen.getByRole('region', { name: '한림대학교 본교 전형계획 상세' });
  expect(within(detail).getByText('학생부교과(교과우수자전형)')).toBeTruthy();
  expect(within(detail).getByText(/성적 판정에 사용하지 않아요/)).toBeTruthy();
  expect(within(detail).getAllByRole('link', { name: /PDF 13쪽/ })[0].getAttribute('href')).toContain('#page=13');
  fireEvent.click(within(detail).getByRole('button', { name: '상세 닫기' }));
  expect(screen.queryByRole('region', { name: '한림대학교 본교 전형계획 상세' })).toBeNull();
  fireEvent.change(screen.getByLabelText('대학·캠퍼스·전형 검색'), { target: { value: '없는대학명' } });
  expect(screen.getByText(/조건에 맞는 전형계획이 없어요/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '검색 조건 초기화' }));
  expect(screen.getAllByRole('button', { name: /전형계획 보기/ })).toHaveLength(20);
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  expect(screen.getByText('2 / 11 페이지')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('일부 전형 요약이 있는 대학만'));
  expect(screen.getAllByRole('button', { name: /전형계획 보기/ })).toHaveLength(4);
  fireEvent.change(screen.getByLabelText('지역'), { target: { value: '강원' } });
  expect(screen.getAllByRole('button', { name: /전형계획 보기/ })).toHaveLength(2);
});

test('직접 연결된 캠퍼스 상세는 목록 필터와 독립적으로 열리고 ZIP 파일명을 안내한다', async () => {
  serve();
  const plan = catalog.entries.find(e => e.documents[0].filename)!;
  at(`/admissions-list?q=없는대학&plan=${plan.id}`);
  const detail = await screen.findByRole('region', { name: `${plan.university} ${plan.campus} 전형계획 상세` });
  expect(within(detail).getByText(`ZIP 안의 파일: ${plan.documents[0].filename}`)).toBeTruthy();
  expect(within(detail).getByText(/전형별 요약은 아직 없어요/)).toBeTruthy();
  expect(within(detail).getByRole('link', { name: /원문 열기/ }).getAttribute('href')).not.toContain('#page=');
});

test('조회 실패는 빈 검색과 구분하고 재시도한다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify(catalog))));
  at('/admissions-list?plan=missing');
  await screen.findByRole('alert');
  expect(screen.queryByText(/조건에 맞는 전형계획이 없어요/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '자료 다시 불러오기' }));
  await screen.findByText(/선택한 전형계획을 찾지 못했어요/);
  expect(screen.getAllByRole('button', { name: /전형계획 보기/ })).toHaveLength(20);
});

test('로더는 구조가 잘못된 응답을 빈 목록으로 바꾸지 않는다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ entries: [] }))));
  await expect(loadAdmissionPlans()).rejects.toThrow();
});
