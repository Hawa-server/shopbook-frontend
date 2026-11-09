// Removing ONE business's data from this phone (docs/app-plan.md "One local database per business").
//
// Used when the server says the person no longer has access (ACCESS_REMOVED) or this phone was removed
// (DEVICE_REVOKED), and by the different-person rule. Only that business's database is deleted; other
// businesses on the phone (e.g. the practice shop) and the shared `shopbook-app` are untouched.
// Before deleting, we count what was still unsent, so the person can be told honestly
// ("3 records that weren't sent were removed. Tell the shop owner.").

import Dexie from 'dexie';
import { businessDbName, closeBusinessDb, createBusinessDb } from './businessDb.js';

// Deletes a business's local database. Returns { unsent }: how many operations were still waiting.
export async function wipeBusiness(businessId) {
  const name = businessDbName(businessId);
  let unsent = 0;
  if (await Dexie.exists(name)) {
    const db = createBusinessDb(businessId);
    try {
      unsent = await db.outbox.count();
    } finally {
      db.close();
    }
  }
  closeBusinessDb(businessId);
  await Dexie.delete(name);
  return { unsent };
}
