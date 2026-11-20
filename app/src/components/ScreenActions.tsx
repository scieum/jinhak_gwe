import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Desktop actions share the shell header; mobile keeps them next to the content. */
export function ScreenActions({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(min-width: 1024px)');
    const update = () => setTarget(media.matches ? document.getElementById('topbar-screen-actions') : null);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return target ? createPortal(children, target) : <>{children}</>;
}
