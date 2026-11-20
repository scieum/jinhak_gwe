import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ label, children, onClose, wide = false }: { label: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLElement>(null), close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea, a[href]')].filter(e => !e.hidden);
    (focusable()[0] ?? dialog).focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key === 'Tab') {
        const list = focusable(), first = list[0], last = list[list.length - 1];
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, []);
  return <div className="dialog-backdrop"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={`dialog${wide ? ' dialog-wide' : ''}`}>{children}</section></div>;
}
