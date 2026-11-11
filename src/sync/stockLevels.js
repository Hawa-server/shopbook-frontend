// Keeps the `stockLevels` table up to date (api.md "The stock rule": the phone keeps it, rebuilt after each
// pull), so lists open fast without adding up thousands of rows every time.
//
// A level is NEVER typed in or sent: it's always worked out again from the stock movements and counts with
// the shared stock rule (lib/stockRule.js). It's recalculated inside the SAME transaction as whatever changed
// the rows (a save, a pulled page, a rejection), so it can never disagree with them. Records the server
// refused ("Not accepted") don't count. Stage 1 has one shop, so all of a size's rows are added together.

import { stockOnHand } from '../lib/stockRule.js';
import { countsAsSaved } from './records.js';

export const STOCK_TABLES = ['stockMovements', 'stockCounts', 'stockLevels'];

// The key of one size's level (or a product without sizes: an empty size part).
export const levelKey = (productId, sizeId) => `${productId}:${sizeId ?? ''}`;

// Works out the levels for the given keys again and saves them. Call it inside a transaction that includes
// STOCK_TABLES.
export async function recomputeLevels(db, keys) {
  for (const key of new Set(keys)) {
    const [productId, sizePart] = key.split(':');
    const sizeId = sizePart || null;
    const sameSize = (row) => (row.sizeId ?? null) === sizeId && countsAsSaved(row);
    const movements = await db.stockMovements.where('productId').equals(productId).filter(sameSize).toArray();
    const counts = await db.stockCounts.where('productId').equals(productId).filter(sameSize).toArray();
    await db.stockLevels.put({ key, productId, sizeId, units: stockOnHand(movements, counts) });
  }
}
