import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { studentDb } from '../src/store/studentDb';
import { teacherDb } from '../src/store/teacherDb';
import { adminDb } from '../src/store/adminDb';
import { clearSample, initSample } from '../src/data/sample';
import { setSampleFlag } from '../src/data/sample/mode';
import { samplePrograms } from '../src/data/sample/public';
import { sampleRules } from '../src/data/sample/rules';
import { SAMPLE_CARD_VERDICTS } from '../src/data/sample/teacher';
import { programs } from '../src/data/catalog';
import { baseConversionRule, judgmentRule } from '../src/data/conversion-rules';
import { loadReleasedResults, resetReleasedResults } from '../src/data/releasedResults';
import { conversionFor, judgeUniversity } from '../src/domain/results';
import { judgeRange } from '../src/engine/judgment';
import { scoreUniversity } from '../src/engine/scoring';
import { convertAverage } from '../src/engine/conversion';
import { compareBasis } from '../src/domain/comparison';
import { decryptBackup, encryptBackup } from '../src/io/backup';
import { isSample, releaseRules } from '../src/domain/ruleEditor';

beforeAll(() => vi.stubGlobal('crypto', webcrypto));
beforeEach(async () => {
  localStorage.clear();
  await Promise.all([studentDb, teacherDb, adminDb].flatMap(db => db.tables.map(t => t.clear())));
  programs.splice(0); resetReleasedResults();
});
const SIX = ['경희대학교', '건국대학교', '성균관대학교', '동국대학교', '한양대학교', '중앙대학교'];
const verdict = (grades: Parameters<typeof judgeUniversity>[0], u: string) => { const j = judgeUniversity(grades, u); return j && (j.v.boundary ? '경계' : j.v.label); };

test('샘플 모드: 관심 대학 6곳 판정이 demo-dataset과 같고 대학별 환산도 계산돼요', async () => {
  await initSample();
  const grades = await studentDb.grades.toArray(), attendance = await studentDb.attendance.toArray();
  expect(SIX.map(u => verdict(grades, u))).toEqual(['안정', '안정', '적정', '적정', '소신', '경계']);
  expect(judgeUniversity(grades, '중앙대학교')!.v).toMatchObject({ label: '위험', favorable_label: '소신', boundary: true });
  expect(programs.map(p => scoreUniversity(grades, attendance, p.rule!).status)).toEqual(Array(6).fill('ready'));
});

test('샘플 상담카드(7번 하늘) 판정 = 샘플 모드 judgeUniversity 판정(counsel 학생 요약)', async () => {
  await initSample();
  const grades = await studentDb.grades.toArray(), card = (await teacherDb.cards.where('number').equals('07').first())!;
  expect(card.card.slots.map(s => s.judgment)).toEqual([...SAMPLE_CARD_VERDICTS]);
  expect(SIX.map(u => verdict(grades, u))).toEqual([...SAMPLE_CARD_VERDICTS]);
  expect(await teacherDb.memos.where('number').equals('07').count()).toBe(4);
});

test('샘플을 끄면(지우기) 판정·환산이 사라져요', async () => {
  await initSample();
  const grades = await studentDb.grades.toArray();
  await clearSample();
  expect(programs).toHaveLength(0);
  expect(SIX.map(u => judgeUniversity(grades, u))).toEqual(Array(6).fill(null));
  expect(conversionFor(grades, '국수영사과').status).toBe('not_ready'); // 원래 규칙(draft)으로 돌아가요
  // 샘플 행이 남아 있어도 샘플 모드가 아니면 sample 표식만으로는 통과하지 못해요.
  programs.push(...samplePrograms);
  expect(SIX.map(u => judgeUniversity(grades, u))).toEqual(Array(6).fill(null));
  expect(scoreUniversity(grades, [], samplePrograms[0].rule!).status).toBe('not_ready');
  expect(judgeRange({ min: 2.3, max: 2.5 }, samplePrograms[0].cut, sampleRules.judgment).status).toBe('not_ready');
});

test('샘플 모드에서도 sample 표식 없는 미검수 규칙·입결은 막혀요', async () => {
  await initSample();
  const grades = await studentDb.grades.toArray();
  const p = samplePrograms[0], range = { min: 2.3, max: 2.5 };
  const unmark = <T extends object>(x: T) => ({ ...x, sample: undefined });
  expect(judgeRange(range, p.cut, judgmentRule).status).toBe('not_ready'); // 진짜 판정 기준은 draft 그대로
  expect(judgeRange(range, unmark(p.cut!), sampleRules.judgment).status).toBe('not_ready');
  expect(judgeRange(range, p.cut, unmark(sampleRules.judgment)).status).toBe('not_ready');
  expect(scoreUniversity(grades, [], unmark(p.rule!)).status).toBe('not_ready');
  expect(convertAverage(1.4, baseConversionRule).status).toBe('not_ready');
  expect(convertAverage(1.4, sampleRules.base).status).toBe('ready');
  const input = { ...p.cut_basis!, statistic: 'individual' as const, review_status: 'verified' as const, sample: undefined };
  expect(compareBasis(input, p.cut_basis).comparable).toBe(true);
  expect(compareBasis(input, unmark(p.cut_basis!)).reasons).toContain('비교 기준의 검수가 필요해요.');
  // 표식 없는 draft 전형을 목록에 넣어도 판정하지 않아요.
  programs.splice(0, programs.length, { ...p, cut: unmark(p.cut!), cut_basis: unmark(p.cut_basis!) });
  expect(judgeUniversity(grades, '경희대학교')).toBeNull();
});

test('백업·공개 내보내기에는 샘플 입결·규칙이 안 들어가요', async () => {
  await initSample();
  const restored = await decryptBackup(await encryptBackup(await studentDb.snapshot(), 'password1'), 'password1');
  expect(JSON.stringify(restored)).not.toMatch(/sample-(rule|cut)|샘플 데이터\(가상\)/);
  // 공개 파일은 관리자 저장소(규칙·입결 검수)에서만 만들어요. 샘플 입결·규칙은 거기에 들어가지 않아요.
  // 관리자 규칙 화면 시안용 샘플 규칙(sample-rule-*)은 저장소에 있어도 배포 파일에는 들어가지 않아요(검수 완료 샘플 포함).
  const rules = await adminDb.rules.toArray();
  expect(rules.every(isSample)).toBe(true);
  expect(releaseRules(rules).rules).toEqual([]);
  expect(releaseRules(rules.map(r => ({ ...r, sample: undefined }))).rules).toEqual([]); // 표식이 떨어져도 id로 걸러요
  expect(await adminDb.reviews.count()).toBe(0);
  await clearSample();
  const units = await loadReleasedResults(async () => new Response(JSON.stringify({ format: 'x' })));
  expect(units).toEqual([]); // 샘플을 끄면 샘플 입결 대신 공개 파일을 읽어요
  expect(await adminDb.rules.count()).toBe(0); // 샘플 지우기는 샘플 규칙도 지워요
  setSampleFlag('off');
});
