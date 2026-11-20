// 생기부 AI 프록시(PRD 6-8 · R-AI-001~005 · R-PRIV-004).
// - Anthropic API 키는 서버 비밀값(ANTHROPIC_API_KEY)에만 있어요. 브라우저에는 이 함수 주소만 있어요.
// - 요청·응답 본문을 저장하거나 로그에 남기지 않고, 기기별 하루 호출 횟수만 셉니다(ai_usage).
// - 학생 앱(app/src/domain/saenggibu.ts requestAnalysis)이 가린 문장만 보내고, 받은 결과를 validateAi로 다시 검사해요.
import Anthropic from 'npm:@anthropic-ai/sdk';

const DAILY_LIMIT = 3; // 2026-11-20 사용자 결정: 기기당 하루 3회
const MODEL = 'claude-sonnet-5-5'; // 2026-11-20 사용자 결정
const ITEMS = ['학업성취도', '학업태도', '탐구력', '교과 이수 노력', '교과 성취도', '진로 탐색', '협업과 소통', '나눔과 배려', '성실·규칙준수', '리더십'];
const AREAS = ['교과 세특', '창체 자율', '창체 동아리', '창체 진로', '행동특성 및 종합의견'];

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-device-id', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SYSTEM = `너는 고등학교 학생부(생기부) 문장을 대교협 공통 평가요소 기준으로 나누는 도우미야.
평가항목은 이 10개뿐이야: ${ITEMS.join(', ')}.
규칙:
1. sentences: 입력의 모든 문장(index)마다 가장 가까운 평가항목 하나를 골라. 어디에도 맞지 않으면 "없음".
2. interview_questions: 희망 학과 기준 면접 예상 질문 최대 8개. quote에는 입력 문장의 일부를 글자 하나 바꾸지 말고 그대로 옮겨(근거 인용). intent에는 질문 의도를 해요체 한 문장으로(예: "실험 결과를 분석하는 과정을 보려는 질문이에요."). quote는 다섯 글자 이상으로.
3. gaps: 남은 학기에 해볼 수 있는 활동 제안 최대 5개. 기록에 비어 있는 평가항목을 중심으로, 해요체 한 문장씩.
4. 합격·불합격, 확률, 가능성, 붙거나 떨어진다는 표현은 절대 쓰지 마. 결과를 점치지 마.
5. 생기부 문장을 고치라고 하지 마. 학생이 앞으로 해볼 활동만 제안해.
6. ■■■는 개인정보를 가린 자리야. 추측하지 마.`;

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['sentences', 'interview_questions', 'gaps'],
  properties: {
    sentences: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['index', 'item'],
      properties: { index: { type: 'integer' }, item: { type: 'string', enum: [...ITEMS, '없음'] } } } },
    interview_questions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['question', 'intent', 'quote'],
      properties: { question: { type: 'string' }, intent: { type: 'string' }, quote: { type: 'string' } } } },
    gaps: { type: 'array', items: { type: 'string' } },
  },
};

type Sentence = { index: number; area: string; text: string };
function readBody(v: unknown): { major: string; sentences: Sentence[] } | null {
  const b = v as { target_major?: unknown; sentences?: unknown };
  if (!b || typeof b.target_major !== 'string' || !b.target_major.trim() || b.target_major.length > 40 || !Array.isArray(b.sentences)) return null;
  if (!b.sentences.length || b.sentences.length > 200) return null;
  const ok = (b.sentences as Sentence[]).every((s, i) => s && s.index === i && AREAS.includes(s.area) && typeof s.text === 'string' && s.text.length > 0 && s.text.length <= 800);
  return ok ? { major: b.target_major.trim(), sentences: b.sentences as Sentence[] } : null;
}

async function takeQuota(device: string): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('quota-config');
  const res = await fetch(`${url}/rest/v1/rpc/take_ai_quota`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_device: device, p_limit: DAILY_LIMIT }) });
  if (!res.ok) throw new Error('quota');
  return (await res.json()) === true;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST만 받아요.' }, 405);
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'AI 연결을 준비하고 있어요.' }, 503);
  const device = req.headers.get('x-device-id') ?? '';
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(device)) return json({ error: '기기 정보가 없어요.' }, 400);
  const raw = await req.text();
  if (raw.length > 120_000) return json({ error: '글이 너무 길어요.' }, 413);
  let body;
  try { body = readBody(JSON.parse(raw)); } catch { body = null; }
  if (!body) return json({ error: '보낸 글의 모양이 맞지 않아요.' }, 400);

  try { if (!(await takeQuota(device))) return json({ error: '오늘 분석 횟수를 다 썼어요' }, 429); }
  catch { return json({ error: '사용량을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.' }, 503); }

  const client = new Anthropic({ apiKey });
  const input = `희망 계열·학과: ${body.major}\n\n문장 목록(index · 영역 · 문장):\n${body.sentences.map(s => `${s.index} · ${s.area} · ${s.text}`).join('\n')}`;
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // 정책 거절이면 서버가 다른 모델로 이어서 처리해요
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } }, // 분류 작업이라 low
      system: SYSTEM,
      messages: [{ role: 'user', content: input }],
    });
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') return json({ error: '결과를 받지 못했어요' }, 502);
    const text = response.content.find(b => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: '결과를 받지 못했어요' }, 502);
    const out = JSON.parse(text.text) as { sentences: { index: number; item: string }[]; interview_questions: unknown[]; gaps: unknown[] };
    // "없음"은 앱 형식(null)로 바꿔요. 나머지 검사(항목 이름·인용·예측 표현)는 앱의 validateAi가 다시 해요.
    out.sentences = out.sentences.filter(s => s.item !== '없음');
    return json(out);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: '지금 요청이 많아요. 잠시 후 다시 시도해 주세요.' }, 503);
    return json({ error: '결과를 받지 못했어요' }, 502);
  }
});
