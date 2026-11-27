import type { TrackId } from './specialTracks';

// Specific majors precede umbrella departments. A broad intake is never split into assumed majors.
const EDUCATION: [string, RegExp][] = [
  ['유아특수교육', /유아특수교육/], ['초등특수교육', /초등특수교육/], ['중등특수교육', /중등특수교육/], ['특수체육교육', /특수체육교육/],
  ['국어교육', /(?<![한중외])국어교육/], ['영어교육', /영어교육/], ['수학교육', /수학교육/],
  ['역사교육', /역사교육/], ['지리교육', /지리교육/], ['윤리교육', /윤리교육/], ['사회교육', /(?:일반|공통|통합)?사회교육/],
  ['물리교육', /물리교육/], ['화학교육', /화학교육/], ['생물교육', /생물교육/], ['지구과학교육', /지구과학교육/],
  ['문헌정보교육', /문헌정보교육/], ['정보·컴퓨터교육', /(?:정보[·ㆍ・․]?컴퓨터|컴퓨터|정보)교육/],
  ['기술·가정교육', /기술[·ㆍ・․]가정교육/], ['기술교육', /기술교육/], ['가정교육', /가정교육/],
  ['체육교육', /체육교육/], ['음악교육', /음악교육/], ['미술교육', /미술교육/],
  ['한문교육', /한문교육/], ['독일어교육', /(?:독어|독일어)교육/], ['프랑스어교육', /(?:불어|프랑스어)교육/],
  ['일본어교육', /(?:일어|일본어)교육/], ['중국어교육', /중국어교육/],
  ['유아교육', /유아교육/], ['초등교육', /초등교육/], ['특수교육', /특수교육/],
  ['사회교육', /사회과교육/], ['과학교육', /과학교육/], ['외국어교육', /외국어교육/],
  ['교육학', /^교육학(?:과|부|전공)/], ['교육공학', /교육공학/],
  ['기계교육', /기계(?:공학)?교육/], ['건설공학교육', /건설공학교육/],
  ['전기·전자·통신교육', /전기[·ㆍ・․]?전자(?:[·ㆍ・․]?통신)?(?:공학)?교육/],
  ['화학공학교육', /화학공학교육/], ['농업교육', /농업교육/], ['환경교육', /환경교육/],
  ['경영·금융교육', /경영[·ㆍ・․]금융교육/],
];

export function educationDepartment(unit: string): string | null {
  const name = unit.normalize('NFKC').replace(/\s/g, '');
  // 한국어교육 and 국어교육 are distinct; do not match the suffix of 한국어교육.
  if (/한국어교육/.test(name)) return '한국어교육';
  return EDUCATION.find(([, pattern]) => pattern.test(name))?.[0] ?? null;
}
export function departmentOf(unit: string, track: TrackId): string {
  if (track === '교육') {
    const subject = educationDepartment(unit);
    if (subject) return subject;
  }
  // Preserve actual discipline names and specialisations for other tracks.
  return unit.normalize('NFKC').trim().replace(/\s+/g, ' ');
}
export function departmentOptions(units: readonly string[], track: TrackId): string[] {
  return [...new Set(units.map(unit => departmentOf(unit, track)))].sort((a, b) => a.localeCompare(b, 'ko'));
}
