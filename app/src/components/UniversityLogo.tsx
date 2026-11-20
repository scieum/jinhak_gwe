import { useState } from 'react';
import logos from '../data/universityLogos.json';
import { Icon } from './Icon';

/** Decorative next to the visible university name; original proportions are preserved. */
export function UniversityLogo({ planId }: { planId: string }) {
  const file = (logos as Record<string, string>)[planId];
  const [failed, setFailed] = useState('');
  return <span className="university-logo" aria-hidden="true">
    {file && failed !== file ? <img src={`${import.meta.env.BASE_URL}assets/universities/${file}`} alt="" width={48} height={48} loading="lazy" decoding="async" onError={() => setFailed(file)} />
      : <Icon name="book-open" size={28} />}
  </span>;
}
