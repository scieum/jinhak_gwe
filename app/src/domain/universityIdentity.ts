import registry from '../data/universityIdentities.json';
import displayNames from '../data/universityDisplayNames.json';

/** This resolves institution labels only, never departments, programs or scores. */
const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/대학교/g, '대').replace(/^국립/, '').replace(/\s/g, '');
const effective = registry.identities.filter(i => !i.effective_date || i.effective_date <= registry.as_of);
const displayAliases = Object.entries(displayNames);

export function currentUniversityName(name: string): string {
  const item = effective.find(i => i.aliases.some(a => normalize(a) === normalize(name)));
  return item?.current_name ?? displayAliases.find(([alias]) => normalize(alias) === normalize(name))?.[1] ?? name;
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

export function collectedUniversitySelection(name: string, available: readonly string[]): string | undefined {
  const exact = available.find(n => n === name);
  if (exact) return exact;
  const matches = available.filter(n => currentUniversityName(n) === currentUniversityName(name));
  return matches.length === 1 ? matches[0] : undefined;
}
