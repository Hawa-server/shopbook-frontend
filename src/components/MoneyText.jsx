// Shows an amount of money (docs/design.md §6 MoneyText). Always written by lib/money.js from whole
// minor units and the open business's currency rules (me.businesses[].currency), with tabular digits
// and no line breaks inside the amount ("Limit GH₵ / 1,000.00" can't happen).

import { formatMoney } from '../lib/money.js';

const SIZES = {
  xl: 'text-money-xl font-extrabold leading-none', // balance, day total
  lg: 'text-money-lg font-extrabold leading-tight', // cart or receipt total
  md: 'text-item font-semibold', //                    amounts in lists
  sm: 'text-secondary', //                             amounts inside secondary lines
};

const TONES = { ink: 'text-ink', owes: 'text-owes', paid: 'text-paid', muted: 'text-muted' };

// `minor` must be a whole number and `currency` the business's rules; formatMoney throws otherwise,
// so a bug can never show a wrong amount. (From FE2/FE3 the open business supplies `currency`.)
export default function MoneyText({ minor, currency, size = 'md', tone = 'ink', className = '' }) {
  return (
    <span className={`tabular whitespace-nowrap ${SIZES[size]} ${TONES[tone]} ${className}`}>
      {formatMoney(minor, currency)}
    </span>
  );
}
