// A bottom sheet (docs/design.md §6 Sheet): slides over the screen for pickers, long texts and
// confirmations. White, rounded on top, a title and a Close button, scrolling content, and an optional
// main button fixed at its bottom. It's a modal dialog: focus moves into it, and Escape closes it.

import { useEffect, useId, useRef } from 'react';
import { useT } from '../i18n/t.js';
import Icon from './Icon.jsx';

export default function Sheet({ open, title, onClose, children, footer }) {
  const { t } = useT();
  const titleId = useId();
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    panel.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-120 flex-col rounded-t-summary bg-paper pb-[env(safe-area-inset-bottom)] outline-none"
      >
        <div className="flex items-center gap-2 border-b border-line py-2 pl-4 pr-2">
          <h2 id={titleId} className="flex-1 text-title font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex size-tap items-center justify-center rounded-full text-ink active:bg-ground"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
