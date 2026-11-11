// The stock rule (api.md "The stock rule (server and phone)"): stock is NEVER stored as a number; the server
// and the phone both work it out from the stock movements and counts of one size (or one product without
// sizes) at one shop, with exactly this rule. The server tests its copy against the shared fixtures in
// api.md, and so does this one (stockRule.test.js reads them from docs/api.md), so the two can't drift.
// No React, no Dexie: plain functions over plain rows.

const TEN_MINUTES = 10 * 60 * 1000;

// Orders two rows by their "stock key" (recordedAt, id): earlier recordedAt first; at the same instant, the
// smaller id, comparing the lower-case UUIDs as plain strings. Never by server sequence or arrival order.
export function compareStockKey(a, b) {
  const ta = Date.parse(a.recordedAt);
  const tb = Date.parse(b.recordedAt);
  if (ta !== tb) return ta < tb ? -1 : 1;
  const ia = a.id.toLowerCase();
  const ib = b.id.toLowerCase();
  if (ia === ib) return 0;
  return ia < ib ? -1 : 1;
}

// The latest count by stock key, or null.
function latestCount(counts) {
  let latest = null;
  for (const count of counts) if (!latest || compareStockKey(count, latest) > 0) latest = count;
  return latest;
}

// Stock on hand in units: with no count, the sum of all movements; with counts, the latest count's
// countedUnits plus the movements after it (movements before it are already in what was on the shelf).
export function stockOnHand(movements, counts) {
  const latest = latestCount(counts);
  let total = latest ? latest.countedUnits : 0;
  for (const movement of movements) {
    if (!latest || compareStockKey(movement, latest) > 0) total += movement.quantityUnits;
  }
  return total;
}

// A count's result: expectedUnits (stock on hand from only the rows before the count), differenceUnits
// (counted − expected: + found more, − fewer) and needsCheck ("Check this count": a movement recorded within
// 10 minutes of the count arrived after it, so a wrong phone clock could have put it on the wrong side).
// A movement not yet on the server (no receivedAt) counts as arriving later.
export function countResult(count, movements, counts) {
  const before = (row) => compareStockKey(row, count) < 0;
  const expectedUnits = stockOnHand(movements.filter(before), counts.filter(before));
  const countAt = Date.parse(count.recordedAt);
  const countArrived = count.receivedAt ? Date.parse(count.receivedAt) : Infinity;
  const needsCheck = movements.some((m) => {
    const near = Math.abs(Date.parse(m.recordedAt) - countAt) <= TEN_MINUTES;
    const arrived = m.receivedAt ? Date.parse(m.receivedAt) : Infinity;
    return near && arrived > countArrived;
  });
  return { expectedUnits, differenceUnits: count.countedUnits - expectedUnits, needsCheck };
}

// The level shown to people (rule 5): 'belowZero' under 0, 'out' at 0, 'low' above 0 and at or below the
// product's level (or the business's threshold, given in whole units of the product's unit), else 'ok'.
// Hidden products and products with low-stock warnings off never show as low.
export function stockStatus(units, product, businessThreshold) {
  if (units < 0) return 'belowZero';
  if (units === 0) return 'out';
  if (product.isHidden || product.lowStockWarnings === false) return 'ok';
  const scale = product.unitScale ?? 1;
  const level = product.lowStockLevelUnits ?? (businessThreshold ?? 3) * scale;
  return units <= level ? 'low' : 'ok';
}
