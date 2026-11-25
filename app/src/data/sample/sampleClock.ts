/** 샘플의 할 일·상담·제출 날짜는 이 날을 "오늘"로 적어 두고, 넣는 순간 실제 오늘과의 날짜 차이만큼 밀어요(2026-11-25 사용자 결정: 오늘 기준 상대 날짜).
 *  G5(app/tools/impl_gate.py)는 브라우저 시계를 이 날로 고정해 시안과 비교해요. 공개 자료 날짜(데이터 기준일·전형 일정)는 밀지 않아요. */
export const SAMPLE_TODAY = '2026-11-24'; // 시안 대부분(상담·학생 기록 '이번 주 상담 11/24(화)')이 이 날을 오늘로 그렸어요
const DAY = 86_400_000;
const kstDay = (t: number) => Math.floor((t + 9 * 3_600_000) / DAY);
const offset = () => kstDay(Date.now()) - kstDay(Date.parse(`${SAMPLE_TODAY}T00:00:00+09:00`));

/** 'YYYY-MM-DD'로 시작하는 문자열의 날짜 부분만 오늘 기준으로 밀어요. 뒤의 시각·시간대는 그대로예요. */
export function rel(d: string): string {
  const day = new Date(Date.parse(`${d.slice(0, 10)}T00:00:00Z`) + offset() * DAY).toISOString().slice(0, 10);
  return day + d.slice(10);
}
/** "11-24까지 · …"처럼 앞에 붙은 MM-DD를 같은 만큼 밀어요. */
export const relNext = (s: string) => s.replace(/^(\d\d-\d\d)/, md => rel(`${SAMPLE_TODAY.slice(0, 4)}-${md}`).slice(5));
