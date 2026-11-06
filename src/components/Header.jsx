// The bar at the top of every screen (docs/design.md §6 Header): white with a bottom line.
// Left: a back arrow (48px target) or the small logo. Middle: the title (18px) and an optional
// second line (14px, e.g. business name and date). Right: the sync status chip.

import { useNavigate } from 'react-router';
import { useT } from '../i18n/t.js';
import Icon from './Icon.jsx';
import SyncChip from './SyncChip.jsx';

export default function Header({ title, subtitle, back = false }) {
  const { t } = useT();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center gap-2 border-b border-line bg-paper px-2 py-2">
      {back ? (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="flex size-tap items-center justify-center rounded-full text-ink active:bg-ground"
        >
          <Icon name="back" />
        </button>
      ) : (
        <img src="/icons/logo-mark-small.svg" alt="" width="34" height="34" className="ml-2 size-8.5 rounded-[9px]" />
      )}
      {/* The title always keeps at least ~40% of the bar; a long chip (Twi, 130% text) wraps onto two
          lines inside its own space instead of covering the title. */}
      <div className="min-w-[40%] flex-1 px-1">
        <h1 className="text-title font-bold leading-tight wrap-anywhere">{title}</h1>
        {subtitle && <p className="text-secondary text-muted">{subtitle}</p>}
      </div>
      <div className="flex min-w-0 max-w-[55%] justify-end pr-2">
        <SyncChip />
      </div>
    </header>
  );
}
