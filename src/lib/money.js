// Money helpers: the ONLY place the app turns minor units into text and typed text into minor units.
//
// Rules (CLAUDE.md; api.md "Conventions → Money", BE4.5):
// - Money is always a whole number of the currency's MINOR units (pesewas for GHS: 12000 = GH₵ 120.00).
//   No floating-point money anywhere.
// - How to write it comes from the business's `currency` object in GET /api/auth/me
//   (symbol, minorUnits, symbolPosition, symbolSpace, decimalSeparator, groupSeparator).
//   We write it with our own integer code, NOT Intl.NumberFormat, which differs between phones:
//   a receipt must read exactly the same on every phone and on the server.
// - A negative amount gets "-" in front of everything ("-GH₵ 5.00"), exactly as api.md says.
// - Typed amounts are read digit by digit ("120.5" → 12050 for 2 decimals). We never do
//   parseFloat(text) * 100, because floating-point rounding could silently change a trader's money.

// The largest amount a person may type: one billion in major units (GH₵ 1,000,000,000.00).
// Far above any real sale, and safely inside JavaScript's exact-integer range for 0–3 decimals.
const MAX_MAJOR_DIGITS = 10; // "1000000000" has 10 digits

// Checks that a currency object has everything we need, so a missing rule fails loudly instead of
// printing a wrong amount.
function checkCurrency(currency) {
  const ok =
    currency &&
    typeof currency.symbol === 'string' &&
    [0, 2, 3].includes(currency.minorUnits) &&
    (currency.symbolPosition === 'before' || currency.symbolPosition === 'after') &&
    typeof currency.symbolSpace === 'string' &&
    typeof currency.decimalSeparator === 'string' && currency.decimalSeparator.length === 1 &&
    typeof currency.groupSeparator === 'string' &&
    currency.decimalSeparator !== currency.groupSeparator;
  if (!ok) throw new TypeError('Money needs the business currency rules from api.md (me.businesses[].currency)');
}

// Puts the group separator between thousands in a string of digits: "1240" → "1,240".
// Works on the digit string itself, so there's no rounding involved.
function groupThousands(digits, separator) {
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    const fromEnd = digits.length - i;
    out += digits[i];
    if (fromEnd > 1 && fromEnd % 3 === 1) out += separator;
  }
  return out;
}

// Writes the number part only, without the symbol: 120050 → "1,200.50" (for 2 decimals).
function numberText(absMinor, currency) {
  const { minorUnits, decimalSeparator, groupSeparator } = currency;
  const digits = String(absMinor).padStart(minorUnits + 1, '0');
  const major = digits.slice(0, digits.length - minorUnits);
  const minor = digits.slice(digits.length - minorUnits);
  const grouped = groupThousands(major, groupSeparator);
  return minorUnits === 0 ? grouped : `${grouped}${decimalSeparator}${minor}`;
}

// Formats a whole number of minor units with the business's currency rules:
// 120050 → "GH₵ 1,200.50"; -500 → "-GH₵ 5.00".
// Throws for anything that isn't a safe whole number: a bug must be loud, never a wrong amount on screen.
export function formatMoney(minor, currency) {
  if (!Number.isSafeInteger(minor)) throw new TypeError(`formatMoney needs whole minor units, got ${minor}`);
  checkCurrency(currency);
  const number = numberText(Math.abs(minor), currency);
  const { symbol, symbolSpace, symbolPosition } = currency;
  const text = symbolPosition === 'before' ? `${symbol}${symbolSpace}${number}` : `${number}${symbolSpace}${symbol}`;
  return minor < 0 ? `-${text}` : text;
}

// Formats without the currency symbol, for tight columns and for pre-filling a money field: "1,200.50".
export function formatMoneyPlain(minor, currency) {
  if (!Number.isSafeInteger(minor)) throw new TypeError(`formatMoneyPlain needs whole minor units, got ${minor}`);
  checkCurrency(currency);
  return (minor < 0 ? '-' : '') + numberText(Math.abs(minor), currency);
}

// Escapes a character for use inside a regular expression.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Reads what a person typed into a money field and returns whole minor units, using the business's
// decimal and group separators. For GHS: "120", "120.5", "120.50", ".5", "1,200", "1,200.75".
// Refuses: negatives, letters, more decimals than the currency has, badly placed group separators,
// empty, too large. Returns { ok: true, minor } or { ok: false, error } with error one of
// 'empty' | 'format' | 'decimals' | 'tooLarge'; the screen turns it into words with t().
export function parseMoney(input, currency) {
  checkCurrency(currency);
  const { minorUnits, decimalSeparator, groupSeparator } = currency;
  let text = String(input ?? '').trim();
  if (text === '') return { ok: false, error: 'empty' };

  // Space-like group separators (e.g. a non-breaking space): accept an ordinary typed space too.
  const spaceGroup = /^\s$/.test(groupSeparator);
  if (spaceGroup) text = text.replace(/\s/g, groupSeparator);

  const grp = escapeRegex(groupSeparator);

  // Split off the decimal part (at most one decimal separator).
  const parts = text.split(decimalSeparator);
  if (parts.length > 2) return { ok: false, error: 'format' };
  let [whole, fraction] = parts;

  // Group separators are only allowed as thousands separators: 1,200 or 12,345,678 (never 1,20).
  if (groupSeparator && whole.includes(groupSeparator)) {
    if (!new RegExp(`^\\d{1,3}(${grp}\\d{3})+$`).test(whole)) return { ok: false, error: 'format' };
    whole = whole.split(groupSeparator).join('');
  }
  if (!/^\d*$/.test(whole) || (fraction !== undefined && !/^\d*$/.test(fraction))) return { ok: false, error: 'format' };
  if (whole === '' && (fraction === undefined || fraction === '')) return { ok: false, error: 'format' };

  fraction = fraction ?? '';
  if (fraction.length > minorUnits) return { ok: false, error: 'decimals' };

  const majorDigits = whole.replace(/^0+/, '');
  if (majorDigits.length > MAX_MAJOR_DIGITS) return { ok: false, error: 'tooLarge' };
  // Build the minor units as a string of digits, then turn it into a number once.
  const minor = Number((whole || '0') + fraction.padEnd(minorUnits, '0'));
  if (minor > 10 ** (MAX_MAJOR_DIGITS - 1) * 10 ** minorUnits) return { ok: false, error: 'tooLarge' };
  return { ok: true, minor };
}
