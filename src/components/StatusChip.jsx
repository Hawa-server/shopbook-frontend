// A small rounded label for a status: icon + word + colour, never colour alone (docs/design.md §6).
// Each kind has fixed colours and icon, so "Owes" or "Not sent yet" always look the same everywhere.

import Icon from './Icon.jsx';

// kind → [text colour, soft background, icon] (design.md §6 StatusChip)
const KINDS = {
  owes: ['text-owes', 'bg-owes-soft', 'wallet'],
  paid: ['text-paid', 'bg-paid-soft', 'check'],
  low: ['text-low', 'bg-low-soft', 'bars'],
  pending: ['text-pending', 'bg-pending-soft', 'clock'], // "Not sent yet", "2 not sent"
  sending: ['text-pending', 'bg-pending-soft', 'sync'], //  only while a sync is really running
  connecting: ['text-pending', 'bg-pending-soft', 'sync'],
  attention: ['text-danger', 'bg-danger-soft', 'warning'],
  allSent: ['text-paid', 'bg-paid-soft', 'check'],
};

// Shows `label` (already translated) in the style of `kind`.
// `live` makes screen readers announce changes (for the header's sync status).
export default function StatusChip({ kind, label, live = false }) {
  const style = KINDS[kind];
  if (!style) throw new Error(`Unknown status kind "${kind}"`);
  const [text, background, icon] = style;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-2xl px-3 py-1 text-secondary font-bold leading-tight ${text} ${background}`}
      role={live ? 'status' : undefined}
    >
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </span>
  );
}
