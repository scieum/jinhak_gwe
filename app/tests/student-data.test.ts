import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { StudentDatabase } from '../src/store/studentDb';
import { validateGrade, parseStudentBackup, emptyAttendance, validateAttendance } from '../src/domain/student';
import { decryptBackup, encryptBackup } from '../src/io/backup';
import { gradesCsv, parseCsv, rowsToGrades, parsePdfGradeLines, pdfLines, readSpreadsheet, gradeHeaders, templateXlsx } from '../src/io/grades';
import { subject } from './fixtures';

beforeAll(() => vi.stubGlobal('crypto', webcrypto));
const dbs: StudentDatabase[] = [];
afterEach(async () => { for (const db of dbs.splice(0)) await db.delete(); });
test('R-IN 미산출 과목 및 공동교육과정 등급 금지', () => {
  expect(validateGrade(subject({ type: '융합선택', subject_group: '사회' })).length).toBeGreaterThan(0);
  expect(validateGrade(subject({ is_joint: true })).length).toBeGreaterThan(0);
  expect(validateGrade(subject({ is_joint: true, rank_grade: null }))).toEqual([]);
  expect(validateGrade(subject({ enrolled_count: 5, rank_grade: null }))).toEqual([]);
});
test('R-IN 분포비율 합·수강자수·원점수 검증', () => {
  expect(validateGrade(subject({ achievement_distribution: [20, 20, 20, 20, 19.9] }))).toEqual([]);
  expect(validateGrade(subject({ achievement_distribution: [20, 20, 20, 20, 10] })).length).toBeGreaterThan(0);
  expect(validateGrade(subject({ raw_score: 101, enrolled_count: 0 })).length).toBe(2);
});
test('출결 일수 및 정수 검증', () => {
  const a = emptyAttendance(1); a.absence.unexcused = 1;
  expect(validateAttendance(a).length).toBe(1); a.school_days = 190; expect(validateAttendance(a)).toEqual([]);
});
test('IndexedDB 저장·재연결·복원, 실패한 복원은 원본 보존', async () => {
  const name = `test-${crypto.randomUUID()}`;
  const db = new StudentDatabase(name); dbs.push(db);
  await db.grades.put(subject()); db.close(); await db.open();
  expect((await db.snapshot()).grades[0].name).toBe('대수');
  await expect(db.restore({ grades: [null], attendance: [] })).rejects.toThrow();
  expect(await db.grades.count()).toBe(1);
  await db.restore({ grades: [subject({ id: 'new' })], attendance: [emptyAttendance(1)] });
  expect(await db.grades.get('math')).toBeUndefined(); expect(await db.grades.count()).toBe(1);
});
test('암호화 백업은 평문을 포함하지 않으며 복원 가능', async () => {
  const data = { grades: [subject()], attendance: [] };
  const encrypted = await encryptBackup(data, 'test-password');
  expect(encrypted).not.toContain('대수'); expect(await decryptBackup(encrypted, 'test-password')).toEqual(data);
  await expect(decryptBackup(encrypted, 'wrong-password')).rejects.toThrow();
  const modified = JSON.parse(encrypted); modified.ciphertext = 'AAAA' + modified.ciphertext.slice(4);
  await expect(decryptBackup(JSON.stringify(modified), 'test-password')).rejects.toThrow();
});
test('백업 중복 ID와 비정상 스키마 거부', () => {
  expect(() => parseStudentBackup({ grades: [subject(), subject()], attendance: [] })).toThrow();
  expect(() => parseStudentBackup({ grades: [subject({ credits: NaN })], attendance: [] })).toThrow();
});
test('CSV 쉼표·따옴표·줄바꿈을 포함한 과목의 왕복 보존', () => {
  const g = subject({ name: '국어, "읽기"\n연습', achievement_distribution: [20, 20, 20, 20, 20] });
  const result = rowsToGrades(parseCsv(gradesCsv([g])));
  expect(result.warnings).toEqual([]); expect(result.grades[0]).toMatchObject({ ...g, id: expect.any(String), division: 'unknown' });
});
test('CSV 비숫자 입력은 NaN으로 저장하지 않음', () => {
  const result = rowsToGrades([['학기', '교과', '과목', '유형', '학점'], ['1-1', '수학', '대수', '일반선택', 'abc']]);
  expect(result.grades).toEqual([]); expect(result.warnings.length).toBe(1);
});
test('PDF 텍스트 좌표 정렬과 인식, 미확인 과목은 보류', () => {
  expect(pdfLines([{ text: '뒤', x: 20, y: 100 }, { text: '앞', x: 0, y: 100 }, { text: '아래', x: 0, y: 80 }])).toEqual(['앞 뒤', '아래']);
  const p = parsePdfGradeLines(['2학년 1학기', '수학 대수 4 82/64.8 B(132) 3', '과학 낯선과목 3 80/70 A(22) 2'], '1-1');
  expect(p.grades).toHaveLength(1); expect(p.grades[0]).toMatchObject({ semester: '2-1', rank_grade: 3, credits: 4 });
  expect(p.warnings.some(w => w.includes('낯선과목'))).toBe(true);
});
test('XLSX 템플릿과 실제 값 읽기, 수식 셀은 거부', async () => {
  const { Workbook } = await import('exceljs');
  const template = new Workbook(); await template.xlsx.load(await templateXlsx());
  expect(template.worksheets[0].getRow(1).getCell(1).text).toBe('학기');
  const workbook = new Workbook(), sheet = workbook.addWorksheet('성적');
  sheet.addRow(gradeHeaders); sheet.addRow(['1-1', '수학', '대수', '일반선택', 4, 90, 70, 'A', 20, 20, 20, 20, 20, 100, 2, '고정', '아니오']);
  const buffer = await workbook.xlsx.writeBuffer();
  const file = { name: '성적.xlsx', size: buffer.byteLength, arrayBuffer: async () => buffer } as File;
  expect((await readSpreadsheet(file)).grades[0]).toMatchObject({ name: '대수', rank_grade: 2, credits: 4 });
  sheet.getCell('E2').value = { formula: '2+2', result: 4 };
  const withFormula = await workbook.xlsx.writeBuffer();
  await expect(readSpreadsheet({ ...file, arrayBuffer: async () => withFormula } as File)).rejects.toThrow('수식');
});
test('CSV 내보내기의 수식 시작 문자는 텍스트로 처리', () => {
  expect(gradesCsv([subject({ name: '=1+1' })])).toContain("\"'=1+1\"");
});
