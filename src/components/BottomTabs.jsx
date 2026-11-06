// The bottom navigation (docs/app-plan.md Design guide, docs/design.md §6 BottomTabs):
// Sell, Customers, Stock, Today, More. Five equal tabs, icon over a 13px label; the active tab is green
// and bold. At 130% text the labels may wrap to two lines: the bar grows instead of cutting them off.
// Every role uses all five tabs (associates see stock levels and "My day"), so none is hidden for now.

import { NavLink } from 'react-router';
import { useT } from '../i18n/t.js';
import Icon from './Icon.jsx';

const TABS = [
  { to: '/sell', icon: 'bag', label: 'nav.sell' },
  { to: '/customers', icon: 'people', label: 'nav.customers' },
  { to: '/stock', icon: 'box', label: 'nav.stock' },
  { to: '/today', icon: 'calendar', label: 'nav.today' },
  { to: '/more', icon: 'dots', label: 'nav.more' },
];

export default function BottomTabs() {
  const { t } = useT();
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-120 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid min-h-tabs grid-cols-5">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                `flex min-h-tap flex-1 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-center text-tab leading-tight ${
                  isActive ? 'font-bold text-primary' : 'font-semibold text-muted'
                }`
              }
            >
              <Icon name={tab.icon} />
              {/* A long single word (e.g. Twi "Adetɔfoɔ" at 130% text) may break onto a second line
                  rather than run into the next tab. */}
              <span className="w-full wrap-anywhere [hyphens:auto]">{t(tab.label)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
