import { COMPETENCIES, ITEM_NAMES, competencyOf } from '../data/competency-items';

export const RECORD_AREAS = ['교과 세특', '창체 자율', '창체 동아리', '창체 진로', '행동특성 및 종합의견'] as const;
export type RecordArea = typeof RECORD_AREAS[number];
export const AREA_MAX = 1500;
export const MASK = '■■■';
export interface Sentence { index: number; area: RecordArea; text: string }
export interface Classified extends Sentence { item: string | null }
export interface InterviewQuestion { question: string; intent: string; quote: string }
export interface Analysis { mode: 'ai' | 'auto'; sentences: Classified[]; questions: InterviewQuestion[]; gaps: string[] }

/** Patterns hidden before anything leaves the device (PRD 6-8). Names cannot be detected reliably, so the student also lists words. */
const AUTO_PATTERNS = [
  /[가-힣]{1,10}(?:여자|남자)?(?:고등학교|중학교|초등학교|고교)/g,
  /[가-힣]{2,4}(?=\s?(?:교사|선생님|담임))/g,
  /\d{2,3}-\d{3,4}-\d{4}/g,
  /[\w.+-]+@[\w-]+\.[\w.]+/g,
];
export function autoMaskWords(text: string): string[] {
  return [...new Set(AUTO_PATTERNS.flatMap(p => text.match(p) ?? []))];
}
export function applyMask(text: string, words: readonly string[]): string {
  const list = [...new Set(words.map(w => w.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  return list.reduce((t, w) => t.split(w).join(MASK), text);
}

export function splitSentences(areas: Partial<Record<RecordArea, string>>): Sentence[] {
  const out: Sentence[] = [];
  for (const area of RECORD_AREAS) {
    // Records end sentences with "함." "음." etc.; split after a period followed by space/newline, or on blank lines.
    for (const text of (areas[area] ?? '').split(/(?<=\.)\s+|\n+/).map(s => s.trim()).filter(s => s.length > 1)) out.push({ index: out.length, area, text });
  }
  return out;
}

/** Local fallback: keyword hits per item; ties go 학업 > 진로 > 공동체 (spec order). */
export function keywordClassify(sentences: readonly Sentence[]): Analysis {
  const items = COMPETENCIES.flatMap(c => c.items);
  return { mode: 'auto', questions: [], gaps: [], sentences: sentences.map(s => {
    let best: string | null = null, score = 0;
    for (const i of items) { const n = i.keywords.filter(k => s.text.includes(k)).length; if (n > score) { best = i.name; score = n; } }
    return { ...s, item: best };
  }) };
}

export function summary(a: Analysis) {
  const counts = COMPETENCIES.map(c => ({ key: c.key, name: c.name, total: a.sentences.filter(s => s.item && competencyOf(s.item).key === c.key).length,
    items: c.items.map(i => ({ name: i.name, count: a.sentences.filter(s => s.item === i.name).length })) }));
  const missing = counts.flatMap(c => c.items.filter(i => !i.count).map(i => i.name));
  return { counts, missing, missingLabel: !missing.length ? '' : missing.length <= 2 ? `${missing.join('·')} 문장이 없어요` : `${missing.slice(0, 2).join('·')} 외 ${missing.length - 2}개 문장이 없어요` };
}

/** R-AI-004: anything reading as an admission prediction is dropped from AI output. */
const PREDICTION = /합격|불합격|확률|가능성|붙을|떨어질/;
/**
 * R-AI-002/003/004. Returns null when the shape is wrong (caller retries once).
 * Items must be one of the 10 evaluation items; quotes must appear verbatim in the masked text that was sent.
 */
export function validateAi(value: unknown, sentences: readonly Sentence[]): Analysis | null {
  const v = value as { sentences?: unknown; interview_questions?: unknown; gaps?: unknown };
  if (!v || !Array.isArray(v.sentences) || !Array.isArray(v.interview_questions) || !Array.isArray(v.gaps)) return null;
  const items = new Map<number, string>();
  for (const s of v.sentences as { index?: unknown; item?: unknown }[]) {
    if (!s || !Number.isInteger(s.index) || typeof s.item !== 'string') return null;
    if (ITEM_NAMES.includes(s.item) && (s.index as number) >= 0 && (s.index as number) < sentences.length) items.set(s.index as number, s.item);
  }
  const sent = sentences.map(s => s.text).join('\n');
  const questions = (v.interview_questions as InterviewQuestion[]).filter(q => q && typeof q.question === 'string' && typeof q.intent === 'string' && typeof q.quote === 'string'
    && q.quote.trim().length > 4 && sent.includes(q.quote.trim()) && !PREDICTION.test(q.question + q.intent)).slice(0, 10).map(q => ({ question: q.question.trim(), intent: q.intent.trim(), quote: q.quote.trim() }));
  const gaps = (v.gaps as unknown[]).filter((g): g is string => typeof g === 'string' && !!g.trim() && !PREDICTION.test(g)).slice(0, 5);
  return { mode: 'ai', questions, gaps, sentences: sentences.map(s => ({ ...s, item: items.get(s.index) ?? null })) };
}

/** 프록시가 기기별 하루 횟수를 세는 데 쓰는 브라우저 id(개인정보 아님, 이 브라우저에만). */
function deviceId(): string {
  try {
    let id = localStorage.getItem('jinhak-navi-device');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('jinhak-navi-device', id); }
    return id;
  } catch { return crypto.randomUUID(); }
}
/** Stateless proxy (R-AI-005, R-PRIV-004). Configured per deployment; absent until the server exists. */
export const aiProxyUrl = (): string => import.meta.env.VITE_AI_PROXY_URL ?? '';
export async function requestAnalysis(major: string, sentences: readonly Sentence[], fetcher: typeof fetch = fetch): Promise<Analysis> {
  const url = aiProxyUrl();
  if (!url) throw new Error('AI 연결을 준비하고 있어요.');
  const body = JSON.stringify({ target_major: major, sentences: sentences.map(s => ({ index: s.index, area: s.area, text: s.text })) });
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId() }, body });
    if (res.status === 429) throw new Error('오늘 분석 횟수를 다 썼어요');
    // 서버 쪽 실패는 다시 보내지 않아요(하루 횟수를 한 번 더 쓰게 돼요). 다시 보내는 건 모양이 틀린 응답일 때만(R-AI-002).
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? '결과를 받지 못했어요');
    const parsed = validateAi(await res.json().catch(() => null), sentences);
    if (parsed) return parsed;
  }
  throw new Error('결과를 받지 못했어요');
}
