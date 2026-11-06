// Quantity helpers: whole units, and half yards for products sold by the yard.
//
// The server stores quantities as whole "units" with the product's unitScale (api.md "Data formats"):
// unitScale 1 → units are whole items; unitScale 2 → units are half yards (5 units = 2.5 yards).
// Like money, we never use floating point: half yards are read and written by their digits.

// Turns stored units into the number people read: (5, 2) → "2.5", (4, 2) → "2", (3, 1) → "3".
// The unit word ("yards", "pieces") is added by the screen through t(), so it can be in Twi.
export function formatQuantityNumber(units, unitScale = 1) {
  if (!Number.isSafeInteger(units)) throw new TypeError(`Quantity needs whole units, got ${units}`);
  if (unitScale !== 1 && unitScale !== 2) throw new TypeError(`Unsupported unitScale ${unitScale}`);
  const negative = units < 0;
  const abs = Math.abs(units);
  let text = String(abs);
  if (unitScale === 2) {
    const whole = Math.floor(abs / 2); // exact: abs is a whole number
    text = abs % 2 === 1 ? `${whole}.5` : String(whole);
  }
  return negative ? `−${text}` : text;
}

// Reads a typed quantity into units. Whole numbers for unitScale 1; for yards, whole or ".5" only.
// Returns { ok: true, units } or { ok: false, error } ('empty' | 'format' | 'halfOnly' | 'tooLarge').
export function parseQuantity(input, unitScale = 1) {
  const text = String(input ?? '').trim();
  if (text === '') return { ok: false, error: 'empty' };
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return { ok: false, error: 'format' };
  const [, whole, fraction] = match;
  if (whole.length > 9) return { ok: false, error: 'tooLarge' };
  const wholeNumber = Number(whole);

  if (fraction === undefined || /^0+$/.test(fraction)) {
    return { ok: true, units: wholeNumber * unitScale };
  }
  if (unitScale === 2 && /^50*$/.test(fraction)) {
    return { ok: true, units: wholeNumber * 2 + 1 };
  }
  return { ok: false, error: unitScale === 2 ? 'halfOnly' : 'format' };
}
