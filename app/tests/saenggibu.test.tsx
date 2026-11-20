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
    expect(screen.getByRole('heading', { name: '낱말로 나눠 본 내 기록이에요' })).toBeTruthy();
    expect(screen.queryByText(/홍길동/)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore();
  });
});
