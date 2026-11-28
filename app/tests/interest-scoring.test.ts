import { describe, expect, test } from 'vitest';
import { scoringProgramFor } from '../src/domain/interestScoring';
import { withReleasedRules } from '../src/screens/Results';
import { scoringRule } from './fixtures';
import type { ProgramData } from '../src/data/catalog';

const interest = { university: '테스트 대학', program: '학생부교과(지역균형)', department: '화학과' };
const rule = scoringRule({ university: interest.university, program: interest.program });
const all = () => withReleasedRules([], [rule]);
const find = (patch = {}, programs = all()) => scoringProgramFor({ ...interest, ...patch }, programs, 2028);

describe('관심 전형의 대학별 환산 규칙 선택', () => {
  test('같은 핵심 전형 이름만 허용하고 다른 전형·전형 유형·학년도는 제외', () => {
    expect(find({ program: '지역균형전형' }).program?.rule).toBe(rule);
    for (const program of ['지역균형특별전형', '학생부종합(지역균형)', '학생부교과', '일반전형']) expect(find({ program }).program).toBeNull();
    expect(find({}, withReleasedRules([], [{ ...rule, admission_year: 2027 }])).program).toBeNull();
  });
  test('캠퍼스가 다른 규칙이나 캠퍼스가 모호한 규칙으로 대신 계산하지 않음', () => {
    const programs = withReleasedRules([], [{ ...rule, university: '가온대학교(서울)' }]);
    expect(find({ university: '가온대(서울)' }, programs).program).toBeTruthy();
    expect(find({ university: '가온대(다른캠퍼스)' }, programs).program).toBeNull();
    expect(find({ university: '가온대' }, programs).program).toBeNull();
  });
  test('초안·중복 규칙은 계산에 넣지 않음', () => {
    expect(find({}, withReleasedRules([], [{ ...rule, review_status: 'draft' }])).program).toBeNull();
    expect(find({}, [...all(), { ...all()[0], id: 'duplicate' }]).reason).toContain('여러 개');
  });
  test('학과별 규칙은 선택한 모집단위에만 적용', () => {
    const programs: ProgramData[] = [{ ...all()[0], department: '화학과' }];
    expect(find({}, programs).program).toBe(programs[0]);
    expect(find({ department: '물리학과' }, programs).program).toBeNull();
    expect(find({ department: undefined }, programs).reason).toContain('학과를 고르면');
  });
  test('카탈로그에 입결만 있어도 새 배포 규칙이 연결됨', () => {
    const programs = withReleasedRules([{ ...all()[0], rule: null }], [rule]);
    expect(find({}, programs).program?.rule).toBe(rule);
  });
  test('카탈로그 행과 규칙 내부의 대학·전형 정보가 다르면 계산하지 않음', () => {
    expect(find({}, [{ ...all()[0], rule: { ...rule, program: '다른전형' } }]).program).toBeNull();
  });
});
