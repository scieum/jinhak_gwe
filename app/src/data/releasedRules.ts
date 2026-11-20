import { useEffect, useState } from 'react';
import { parseRuleRelease } from '../domain/ruleEditor';
import type { ScoringRule } from '../engine/scoring';

/** public/data/scoring-rules.json 은 관리자 규칙 편집기의 "배포 파일 내보내기"로 만들어요. */
let cache: Promise<ScoringRule[]> | null = null;
export function loadReleasedRules(fetcher: typeof fetch = fetch): Promise<ScoringRule[]> {
  return cache ??= fetcher(`${import.meta.env.BASE_URL}data/scoring-rules.json`)
    .then(r => r.ok ? r.json() : null).then(parseRuleRelease).catch(() => []);
}
export function resetReleasedRules() { cache = null; }
export function useReleasedRules() {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  useEffect(() => { let live = true; loadReleasedRules().then(r => { if (live) setRules(r); }); return () => { live = false; }; }, []);
  return rules;
}
