// A money input (design.md §6 Field) that reads what's typed with the business's currency rules
// (lib/money.js parseMoney: by the digits, never through floating point). It holds the TEXT as typed; the
// form turns it into minor units with readMoneyField() only when saving, so "120." while typing is fine.

import { useT } from '../i18n/t.js';
import { parseMoney } from '../lib/money.js';
import Field from './Field.jsx';

// Reads a money field's text: { ok: true, minor } (minor is null when empty and `optional`) or
// { ok: false, error } with a dictionary key for the message.
export function readMoneyField(text, currency, { optional = false } = {}) {
  if (String(text ?? '').trim() === '') return optional ? { ok: true, minor: null } : { ok: false, error: 'money.error.empty' };
  const result = parseMoney(text, currency);
  return result.ok ? { ok: true, minor: result.minor } : { ok: false, error: `money.error.${result.error}` };
}

export default function MoneyField({ label, currency, value, onChange, error, hint, optional = false }) {
  const { t } = useT();
  const symbol = currency?.symbol ?? '';
  return (
    <Field
      label={`${label} (${symbol})`}
      hint={hint ?? (optional ? t('field.optional') : undefined)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      inputMode="decimal"
      autoComplete="off"
    />
  );
}
