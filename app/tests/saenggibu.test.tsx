import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaenggibuAi } from '../src/screens/SaenggibuAi';
import { applyMask, autoMaskWords, keywordClassify, requestAnalysis, splitSentences, summary, validateAi } from '../src/domain/saenggibu';

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
const text = '홍길동은 산화·환원 실험에서 원인을 보고서로 정리함. 화학공학과 진학을 희망함.\n모둠 실험에서 친구들과 토의에 참여함.';
const sentences = splitSentences({ '교과 세특': text });

describe('가림·문장 나누기', () => {
  it('학교·교사 이름·전화를 자동으로 가리고 학생이 더한 낱말도 가린다', () => {
    expect(autoMaskWords('한빛고등학교 김민수 선생님 010-1234-5678')).toEqual(['한빛고등학교', '김민수', '010-1234-5678']);
    expect(applyMask('홍길동은 한빛고등학교', ['한빛고등학교', '홍길동'])).toBe('■■■은 ■■■');
  });
  it('문장을 나누고 낱말로 평가항목을 고르며 빠진 항목을 알린다', () => {
    expect(sentences.map(s => s.text)).toHaveLength(3);
    const a = keywordClassify(sentences);
    expect(a.sentences.map(s => s.item)).toEqual(['탐구력', '진로 탐색', '협업과 소통']);
    expect(summary(a).missingLabel).toBe('학업성취도·학업태도 외 5개 문장이 없어요');
  });
});
describe('AI 응답 검증 (R-AI-002~004)', () => {
  const ok = { sentences: [{ index: 0, item: '탐구력' }, { index: 1, item: '없는 항목' }], gaps: ['발표 기회를 찾아봐요', '합격에 유리해요'],
    interview_questions: [{ question: '실험을 다시 한 이유는?', intent: '탐구 과정', quote: '원인을 보고서로 정리함.' }, { question: '지어낸 인용', intent: 'x', quote: '원문에 없는 문장이에요' }] };
  it('없는 항목·없는 인용·예측 표현을 걸러 낸다', () => {
    const r = validateAi(ok, sentences)!;
    expect(r.sentences.map(s => s.item)).toEqual(['탐구력', null, null]);
    expect(r.questions.map(q => q.question)).toEqual(['실험을 다시 한 이유는?']);
    expect(r.gaps).toEqual(['발표 기회를 찾아봐요']);
    expect(validateAi({ sentences: 'x' }, sentences)).toBeNull();
  });
  it('형식 오류면 1회 다시 요청하고, 그래도 실패하면 오류를 낸다', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai');
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response(JSON.stringify(ok)));
    expect((await requestAnalysis('화학공학과', sentences, fetcher)).mode).toBe('ai');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).sentences[0].text).toContain('실험');
    const bad = vi.fn().mockResolvedValue(new Response('{}'));
    await expect(requestAnalysis('화학공학과', sentences, bad)).rejects.toThrow('결과를 받지 못했어요');
    expect(bad).toHaveBeenCalledTimes(2);
  });
  it('기기 id를 보내고, 서버 오류는 다시 보내지 않는다(하루 횟수 보호)', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai');
    const fail = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'AI 연결을 준비하고 있어요.' }), { status: 503 }));
    await expect(requestAnalysis('화학공학과', sentences, fail)).rejects.toThrow('AI 연결을 준비하고 있어요.');
    expect(fail).toHaveBeenCalledTimes(1);
    expect(fail.mock.calls[0][1].headers['x-device-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('프록시가 없으면 보내지 않는다', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '');
    const fetcher = vi.fn();
    await expect(requestAnalysis('x', sentences, fetcher)).rejects.toThrow('AI 연결');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
describe('생기부 AI 화면', () => {
  it('가림 확인 체크 전에는 보낼 수 없고, 가린 글로 낱말 분류 결과를 보여 준다', () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<MemoryRouter><SaenggibuAi /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('희망 계열·학과'), { target: { value: '화학공학과' } });
    fireEvent.change(screen.getByLabelText('교과 세특'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: '가림 확인으로' }));
    fireEvent.change(screen.getByLabelText(/더 가릴 낱말/), { target: { value: '홍길동' } });
    expect(screen.getByText(/■■■은 산화/)).toBeTruthy();
    const local = screen.getByRole('button', { name: '낱말로 나눠 보기' }) as HTMLButtonElement;
    expect(local.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('가린 내용을 확인했어요'));
    fireEvent.click(local);
    expect(screen.getByRole('heading', { name: '내 기록을 역량별로 나눴어요' })).toBeTruthy();
    expect(screen.getByText('자동 · 낱말로 나눴어요 · 참고용')).toBeTruthy();
    // 평가 항목을 고르면 그 항목 문장만 칠해요
    fireEvent.click(screen.getByRole('button', { name: /^탐구력/ }));
    expect(screen.getByText(/탐구력 · 학업역량 문장만 칠했어요 · 1문장/)).toBeTruthy();
    expect(document.querySelectorAll('.sg-sentence.is-dim').length).toBe(2);
    expect((screen.getByRole('button', { name: /^리더십/ }) as HTMLButtonElement).disabled).toBe(true);
    // 자동 결과에는 면접 질문이 없어요
    fireEvent.click(screen.getByRole('button', { name: '면접 질문' }));
    expect(screen.getByRole('heading', { name: '면접 질문은 AI 분석에서 만들어요' })).toBeTruthy();
    // 가린 낱말은 블록으로 보여요
    fireEvent.click(screen.getByRole('button', { name: '원문 색칠' }));
    expect(screen.getAllByLabelText('가린 낱말').length).toBeGreaterThan(0);
    expect(screen.queryByText(/홍길동/)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore();
  });
});

describe('생기부 AI 결과(AI 모드)', () => {
  it('면접 질문 탭에서 근거를 원문에서 볼 수 있고, 보완점이 보인다', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai');
    const reply = { sentences: [{ index: 0, item: '탐구력' }, { index: 2, item: '협업과 소통' }], gaps: ['발표 기회를 찾아봐요'],
      interview_questions: [{ question: '실험을 다시 한 이유는?', intent: '탐구 과정을 보려는 질문이에요.', quote: '원인을 보고서로 정리함.' }] };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(reply)));
    render(<MemoryRouter><SaenggibuAi /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('희망 계열·학과'), { target: { value: '화학공학과' } });
    fireEvent.change(screen.getByLabelText('교과 세특'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: '가림 확인으로' }));
    fireEvent.click(screen.getByLabelText('가린 내용을 확인했어요'));
    fireEvent.click(screen.getByRole('button', { name: 'AI 분석 보내기' }));
    expect(await screen.findByRole('heading', { name: '내 기록을 역량별로 나눴어요' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '면접 질문 1' }));
    fireEvent.click(screen.getByText('실험을 다시 한 이유는?'));
    fireEvent.click(screen.getByRole('button', { name: '원문에서 보기' }));
    expect(screen.getByRole('region', { name: '보낸 원문' })).toBeTruthy();
    expect(document.querySelector('.sg-sentence.is-flash')?.textContent).toContain('원인을 보고서로 정리함');
    fireEvent.click(screen.getByRole('button', { name: '보완점' }));
    expect(screen.getByText('발표 기회를 찾아봐요')).toBeTruthy();
    fetchSpy.mockRestore();
  });
});
