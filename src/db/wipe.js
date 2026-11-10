// Removing ONE business's data from this phone (docs/app-plan.md "One local database per business").
//
// Used when the server says the person no longer has access (ACCESS_REMOVED) or this phone was removed
// (DEVICE_REVOKED), and by the different-person rule. Only that business's database is deleted; other
// businesses on the phone (e.g. the practice shop) and the shared `shopbook-app` are untouched.
// Before deleting, we count what was still unsent, so the person can be told honestly
// ("3 records that weren't sent were removed. Tell the shop owner.").
//
// The notice is saved HERE, by the wipe itself, right after deleting. Two paths can wipe the same business
// at nearly the same moment (the sync getting ACCESS_REMOVED, and "who am I" no longer listing the business),
// and the screen may stop the sync before it could report back. Saving the notice inside the wipe means
// whichever path deletes the data also leaves the explanation; the other finds nothing left and changes nothing.

import Dexie from 'dexie';
import { businessDbName, closeBusinessDb, createBusinessDb } from './businessDb.js';
import { getAppValue, setAppValue } from './appDb.js';

// Deletes a business's local database. Returns { unsent, existed }: how many operations were still waiting,
// and whether there was anything to delete (false if it was already wiped, e.g. by the other path).
// `notice` ('accessRemoved' | 'deviceRevoked'): if given and something was deleted, saves the notice the
// person will see, with the business's name and the unsent count. (The different-person rule passes none.)
export async function wipeBusiness(businessId, { notice = null } = {}) {
  const name = businessDbName(businessId);
  let unsent = 0;
  const existed = await Dexie.exists(name);
  if (existed) {
    const db = createBusinessDb(businessId);
    try {
      unsent = await db.outbox.count();
    } finally {
      db.close();
    }
  }
  closeBusinessDb(businessId);
  await Dexie.delete(name);
  if (existed && notice) {
    const me = await getAppValue('me'); // still lists the business: callers wipe before saving a new `me`
    const businessName = me?.businesses?.find((b) => b.id === businessId)?.name ?? '';
    await setAppValue('notice', { kind: notice, businessName, unsent });
  }
  return { unsent, existed };
}
