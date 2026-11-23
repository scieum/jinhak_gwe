import { readExchange, type Exchange } from '../io/exchange';

/** 선생님 응답 파일(PRD 6-10 "교사 코멘트 → 학생에게 돌려줄 응답 파일"). 받는 학생의 학급 코드·번호·별칭이 이름표예요. */
export interface TeacherReply { comment: string; scenario: string; card_created_at: string; slots: { priority: number; university: string }[] }
export const REPLY_MAX = 1000;

export function makeReply(comment: string, card: { scenario: string; created_at: string; slots: { university: string }[] }): TeacherReply {
  const text = comment.trim();
  if (!text) throw new Error('학생에게 남길 말을 적어 주세요.');
  if (text.length > REPLY_MAX) throw new Error(`${REPLY_MAX}자 안으로 적어 주세요.`);
  return { comment: text, scenario: card.scenario, card_created_at: card.created_at, slots: card.slots.map((s, i) => ({ priority: i + 1, university: s.university })) };
}

/** 학생 쪽: 파일 경계라 모양을 다시 확인해요. */
export async function openReply(text: string): Promise<Exchange<TeacherReply>> {
  let e;
  try { e = await readExchange(text); } catch { throw new Error('파일이 깨졌거나 U:NAVI 파일이 아니에요. 선생님께 다시 받아 주세요.'); }
  if (e.kind !== 'teacher_reply') throw new Error('선생님 답장 파일이 아니에요. 다른 파일은 해당 화면에서 열어 주세요.');
  const p = e.payload as TeacherReply;
  if (!p || typeof p.comment !== 'string' || !p.comment.trim() || p.comment.length > REPLY_MAX || typeof p.scenario !== 'string' || !Array.isArray(p.slots)
    || p.slots.length > 6 || p.slots.some(s => !s || typeof s.university !== 'string' || !Number.isInteger(s.priority))) throw new Error('답장 파일 모양이 맞지 않아요. 선생님께 다시 받아 주세요.');
  return e as Exchange<TeacherReply>;
}
