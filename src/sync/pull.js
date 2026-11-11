// Pull: fetching everything that changed since this phone's cursor (api.md "GET /api/sync/pull").
//
// Page by page until `hasMore` is false. Each page's rows AND its `nextCursor` are written in ONE local
// transaction: if writing fails, the cursor doesn't move and the page is fetched again next time, so no
// row is ever skipped. A page can have no rows and still move the cursor (rows this person may not see).
// A row type this app doesn't know stops the pull WITHOUT moving the cursor (see rows.js).
// Stock levels touched by the page are recalculated in the same transaction (sync/stockLevels.js).

import { getMeta } from '../db/businessDb.js';
import { PULL_TABLES, UnknownRowTypeError, checkRowTypes, stockKeysOf, storeRow } from './rows.js';
import { levelKey, recomputeLevels } from './stockLevels.js';

export const PULL_LIMIT = 500;
const MAX_PAGES = 2000; // a safety stop: 1,000,000 rows in one go means something is wrong

// Writes one page and its cursor together. Exported for tests.
export async function applyPage(db, { rows, nextCursor }) {
  checkRowTypes(rows); // before writing anything
  await db.transaction('rw', PULL_TABLES.map((t) => db.table(t)), async () => {
    for (const row of rows) await storeRow(db, row);
    await recomputeLevels(db, stockKeysOf(rows, levelKey)); // stock on hand, from the rows just stored
    const current = (await getMeta(db, 'cursor')) ?? 0;
    if (Number.isInteger(nextCursor) && nextCursor >= current) {
      await db.meta.put({ key: 'cursor', value: nextCursor });
    }
  });
}

// Pulls all pages. Returns { kind: 'ok', rows } | { kind: 'failed', result } | { kind: 'unknownRow', type }.
export async function pullAll(db, { businessId, device, request }) {
  let total = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const since = (await getMeta(db, 'cursor')) ?? 0;
    const result = await request(`/api/sync/pull?since=${since}&limit=${PULL_LIMIT}`, { businessId, device });
    if (result.kind !== 'ok') return { kind: 'failed', result };
    const { rows = [], nextCursor, hasMore } = result.data ?? {};
    try {
      await applyPage(db, { rows, nextCursor });
    } catch (error) {
      if (error instanceof UnknownRowTypeError) return { kind: 'unknownRow', type: error.rowType };
      throw error;
    }
    total += rows.length;
    if (!hasMore) return { kind: 'ok', rows: total };
  }
  return { kind: 'ok', rows: total };
}
