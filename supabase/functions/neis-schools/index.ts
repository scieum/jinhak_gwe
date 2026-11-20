// NEIS 학교 검색 프록시(회원가입 "1 학교 선택"). NEIS 인증키는 서버 비밀값(NEIS_API_KEY)으로만 써요.
// 요청: GET ?sido=서울특별시&level=고등학교&q=한빛  → [{ code, name, region, address }]
const SIDO_CODE: Record<string, string> = {
  서울특별시: 'B10', 부산광역시: 'C10', 대구광역시: 'D10', 인천광역시: 'E10', 광주광역시: 'F10', 대전광역시: 'G10', 울산광역시: 'H10', 세종특별자치시: 'I10',
  경기도: 'J10', 강원특별자치도: 'K10', 충청북도: 'M10', 충청남도: 'N10', 전북특별자치도: 'P10', 전라남도: 'Q10', 경상북도: 'R10', 경상남도: 'S10', 제주특별자치도: 'T10',
};
const LEVELS = new Set(['초등학교', '중학교', '고등학교']);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const url = new URL(req.url), sido = url.searchParams.get('sido') ?? '', level = url.searchParams.get('level') ?? '', q = (url.searchParams.get('q') ?? '').trim();
  const code = SIDO_CODE[sido];
  if (!code || !LEVELS.has(level) || q.length < 2 || q.length > 30) return json({ error: '시/도·학교급과 학교 이름 두 글자 이상이 필요해요.' }, 400);
  // 비밀값 이름은 NEIS_API_KEY. 대시보드에서 이름을 조금 다르게 넣어도 찾고, 못 찾으면 "이름"만 알려 줘요(값은 내보내지 않음).
  const env = Deno.env.toObject();
  const names = Object.keys(env).filter(n => /neis/i.test(n));
  const key = (env.NEIS_API_KEY ?? env[names.find(n => /^neis_?(api_?)?key$/i.test(n.trim())) ?? ''] ?? '').trim();
  if (!key) return json({ error: '학교 목록 연결을 준비하고 있어요.', neis_secret_names: names }, 503);
  const neis = new URL('https://open.neis.go.kr/hub/schoolInfo');
  for (const [k, v] of Object.entries({ KEY: key, Type: 'json', pIndex: '1', pSize: '50', ATPT_OFCDC_SC_CODE: code, SCHUL_KND_SC_NM: level, SCHUL_NM: q })) neis.searchParams.set(k, v);
  try {
    const res = await fetch(neis);
    const data = await res.json();
    // 결과가 없으면 NEIS는 RESULT.CODE INFO-200을 줘요. 그 밖의 코드(예: ERROR-290 인증키 오류)는 그대로 알려요.
    const result = data?.RESULT;
    if (result && result.CODE !== 'INFO-200') return json({ error: 'NEIS가 요청을 거절했어요.', neis_code: result.CODE, neis_message: result.MESSAGE }, 502);
    const rows = data?.schoolInfo?.[1]?.row ?? [];
    return json(rows.map((r: Record<string, string>) => ({ code: r.SD_SCHUL_CODE, name: r.SCHUL_NM, region: r.LCTN_SC_NM, address: r.ORG_RDNMA ?? '' })));
  } catch {
    return json({ error: '학교 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' }, 502);
  }
});
