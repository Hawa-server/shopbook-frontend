// Money helpers: the ONLY place the app turns pesewas into text and typed text into pesewas.
//
// Rules (CLAUDE.md, api.md "Data formats"):
// - Money is always a whole number of pesewas (12000 = GH₵ 120.00). No floating-point money anywhere.
// - Shown as "GH₵ 120.00", with a non-breaking space after GH₵ so an amount never splits across lines.
// - Typed amounts are read digit by digit ("120.5" → 12050). We never do parseFloat(text) * 100,
//   because 0.1 + 0.2 style rounding errors could silently change a trader's money.

// U+00A0 non-breaking space: keeps "GH₵" and the number together on one line.
const NBSP = ' ';
// U+2212 minus sign: a proper minus, easier to read than a hyphen.
const MINUS = '−';
const CEDI = 'GH₵';

// The largest amount we accept from a person: GH₵ 1,000,000,000.00. Far above any real sale,
// and safely inside JavaScript's exact-integer range.
export const MAX_PESEWAS = 100_000_000_000;

// Puts commas between thousands in a string of digits: "1240" → "1,240".
// Works on the digit string itself, so there's no rounding involved.
function groupThousands(digits) {
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    const fromEnd = digits.length - i;
    out += digits[i];
    if (fromEnd > 1 && fromEnd % 3 === 1) out += ',';
  }
  return out;
}

// Formats a whole number of pesewas as "GH₵ 1,240.00" (or "− GH₵ 150.00" when negative).
// Throws if given anything that isn't a safe whole number: a bug must be loud, never a wrong amount on screen.
export function formatMoney(pesewas) {
  if (!Number.isSafeInteger(pesewas)) {
    throw new TypeError(`formatMoney needs whole pesewas, got ${pesewas}`);
  }
  const negative = pesewas < 0;
  const digits = String(Math.abs(pesewas)).padStart(3, '0');
  const cedis = digits.slice(0, -2);
  const pesewaPart = digits.slice(-2);
  const text = `${CEDI}${NBSP}${groupThousands(cedis)}.${pesewaPart}`;
  return negative ? `${MINUS}${NBSP}${text}` : text;
}

// Formats pesewas without the currency sign, for tight columns: "1,240.00".
export function formatMoneyPlain(pesewas) {
  return formatMoney(pesewas).replace(`${CEDI}${NBSP}`, '');
}

// Reads what a person typed into a money field and returns whole pesewas.
// Accepts: "120", "120.5", "120.50", ".5", "1,200", "1,200.75", with spaces around.
// Refuses: negatives, letters, more than 2 digits after the point, badly placed commas, empty, too large.
// Returns { ok: true, pesewas } or { ok: false, error } where error is a short code the screen
// turns into words with t('money.error.<code>').
export function parseMoney(input) {
  const text = String(input ?? '').trim();
  if (text === '') return { ok: false, error: 'empty' };

  // Commas are only allowed as thousands separators: 1,200 or 12,345,678 (never 1,20 or 12,00).
  let plain = text;
  if (text.includes(',')) {
    if (!/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(text)) return { ok: false, error: 'format' };
    plain = text.replaceAll(',', '');
  }

  const match = /^(\d*)(?:\.(\d*))?$/.exec(plain);
  if (!match) return { ok: false, error: 'format' };
  const [, whole, fraction = ''] = match;
  if (whole === '' && fraction === '') return { ok: false, error: 'format' };
  if (fraction.length > 2) return { ok: false, error: 'decimals' };

  // Build the pesewas as a string of digits, then turn it into a number once.
  const digits = (whole || '0') + fraction.padEnd(2, '0');
  // Too many digits can't be a real amount; checked before Number() so we never lose precision.
  if (digits.replace(/^0+/, '').length > String(MAX_PESEWAS).length) return { ok: false, error: 'tooLarge' };
  const pesewas = Number(digits);
  if (pesewas > MAX_PESEWAS) return { ok: false, error: 'tooLarge' };
  return { ok: true, pesewas };
}
