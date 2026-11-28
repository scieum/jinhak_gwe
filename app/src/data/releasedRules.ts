import { useEffect, useState } from 'react';
import { parseRuleRelease } from '../domain/ruleEditor';
import type { ScoringRule } from '../engine/scoring';

/** public/data/scoring-rules.json 은 관리자 규칙 편집기의 "배포 파일 내보내기"로 만들어요. */
let cache: Promise<ScoringRule[]> | null = null;
let failed = false; // 파일을 받지 못했을 때(네트워크·형식 오류). 화면은 이미 받은 규칙으로 계속 계산해요.
export function loadReleasedRules(fetcher: typeof fetch = fetch): Promise<ScoringRule[]> {
  return cache ??= fetcher(`${import.meta.env.BASE_URL}data/scoring-rules.json`)
    .then(r => { if (!r.ok) throw new Error('환산 규칙 응답 오류'); return r.json(); }).then(release => {
      if (release?.format !== 'jinhak-navi-scoring-rules' || release.version !== 1 || !Array.isArray(release.rules)) throw new Error('환산 규칙 파일 형식 오류');
      const rules = parseRuleRelease(release);
      failed = rules.length !== release.rules.length;
      return rules;
    }).catch(() => { failed = true; return []; });
}
export function resetReleasedRules() { cache = null; failed = false; }
/** 규칙 + 불러오기 실패 여부 + 다시 불러오기 */
export function useReleasedRulesState() {
  const [state, setState] = useState<{ rules: ScoringRule[]; failed: boolean; loading: boolean }>({ rules: [], failed: false, loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let live = true; setState(s => ({ ...s, loading: true })); loadReleasedRules().then(rules => { if (live) setState({ rules, failed, loading: false }); }); return () => { live = false; }; }, [attempt]);
  return { ...state, retry: () => { resetReleasedRules(); setAttempt(a => a + 1); } };
}
export function useReleasedRules() { return useReleasedRulesState().rules; }
