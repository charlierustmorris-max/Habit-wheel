import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface Props {
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grabber" />
        {children}
      </div>
    </>
  );
}
