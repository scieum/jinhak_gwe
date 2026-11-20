import { useState } from 'react';
import logos from '../data/universityLogos.json';
import names from '../data/universityLogoNames.json';
import { Icon } from './Icon';
import './university-logo.css';

const normalize = (name: string) => name.normalize('NFKC').replace(/대학교/g, '대').replace(/^국립/, '').replace(/\s/g, '');
const byName = new Map(Object.entries(names).map(([name, file]) => [normalize(name), file]));
/** Decorative next to the visible university name; original proportions are preserved. */
export function UniversityLogo({ planId, university = '' }: { planId?: string; university?: string }) {
  const name = normalize(university);
  const file = (planId ? (logos as Record<string, string>)[planId] : undefined) ?? byName.get(name) ?? byName.get(name.replace(/\([^)]*\)/g, ''));
  const [failed, setFailed] = useState('');
  return <span className="university-logo" aria-hidden="true">
    {file && failed !== file ? <img src={`${import.meta.env.BASE_URL}assets/universities/${file}`} alt="" width={48} height={48} loading="lazy" decoding="async" onError={() => setFailed(file)} />
      : <Icon name="book-open" size={28} />}
  </span>;
}
