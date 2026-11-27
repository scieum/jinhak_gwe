import registry from '../data/universityIdentities.json';
import displayNames from '../data/universityDisplayNames.json';

/** This resolves institution labels only, never departments, programs or scores. */
const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/대학교/g, '대').replace(/^국립/, '').replace(/\s/g, '');
const effective = registry.identities.filter(i => !i.effective_date || i.effective_date <= registry.as_of);
const displayAliases = Object.entries(displayNames);

// 별칭 목록을 매번 훑으면 입결 10만 행에서 수 초가 걸려요(특수 계열 모아보기 렉). 이름마다 한 번만 찾아요.
const currentNames = new Map<string, string>();
export function currentUniversityName(name: string): string {
  const cached = currentNames.get(name);
  if (cached !== undefined) return cached;
  const item = effective.find(i => i.aliases.some(a => normalize(a) === normalize(name)));
  const current = item?.current_name ?? displayAliases.find(([alias]) => normalize(alias) === normalize(name))?.[1] ?? name;
  currentNames.set(name, current);
  return current;
}

export function universitySearchLabels(name: string): string[] {
  const current = currentUniversityName(name);
  const item = effective.find(i => i.current_name === current);
  const labels = [name, current, ...(item?.aliases ?? [])];
  for (const [alias, display] of displayAliases) {
    if (display === current) labels.push(alias);
    const base = display.split('(')[0];
    if (current === base || current.startsWith(`${base}(`)) labels.push(alias.split('(')[0]);
  }
  for (const group of registry.search_groups) {
    if (!current.startsWith(group.current_prefix)) continue;
    if ('campuses' in group && group.campuses && !group.campuses.some(c => current.includes(`(${c})`))) continue;
    labels.push(...group.aliases);
  }
  return [...new Set(labels)];
}

export function matchesUniversityIdentity(name: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  // A qualified former campus alias must resolve to that campus, not its siblings.
  const resolved = currentUniversityName(query);
  if (resolved !== query && resolved.includes('(')) return currentUniversityName(name) === resolved;
  return universitySearchLabels(name).some(label => normalize(label).includes(q));
}

/** 같은 대학의 캠퍼스 후보들(정확히 같은 이름이 있으면 그것 하나). '연세대학교'처럼 캠퍼스가 여럿이면 '연세대(서울)', '연세대학교(미래)'를 모두 돌려줘요. */
export function collectedUniversityCandidates(name: string, available: readonly string[]): string[] {
  if (!name) return [];
  if (available.includes(name)) return [name];
  // 캠퍼스 괄호와 '대학교/대' 차이는 빼고 같은 대학인지 봐요('연세대(서울)' = '연세대학교')
  const base = (n: string) => currentUniversityName(n).replace(/\s+/g, '').replace(/\(.*?\)/g, '').replace(/대학교$/, '대');
  const key = base(name);
  return available.filter(n => base(n) === key && !n.includes('캠퍼스미확인'));
}
export function collectedUniversitySelection(name: string, available: readonly string[]): string | undefined {
  const exact = available.find(n => n === name);
  if (exact) return exact;
  const matches = available.filter(n => currentUniversityName(n) === currentUniversityName(name));
  return matches.length === 1 ? matches[0] : undefined;
}
