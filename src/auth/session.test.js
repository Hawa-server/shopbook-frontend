// Tests for what the phone remembers about the signed-in person, on a fake IndexedDB (development only):
// a business that disappears from the same person's list is wiped, with the unsent records counted.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { getAppValue } from '../db/appDb.js';
import { businessDbName, getBusinessDb } from '../db/businessDb.js';
import { saveMe } from './session.js';

const business = (id, name) => ({ id, name, role: 'associate', isPractice: false });
const me = (userId, businesses) => ({ user: { id: userId, name: 'Kofi', language: 'en' }, terms: { accepted: true }, businesses, invitations: [] });

describe('saveMe', () => {
  it('wipes a business that has disappeared from the same person\'s list, and leaves a notice with the unsent count', async () => {
    const kept = crypto.randomUUID();
    const lost = crypto.randomUUID();
    await saveMe(me('u1', [business(kept, 'Kept Shop'), business(lost, 'Lost Shop')]));
    await getBusinessDb(lost).outbox.add({ opId: crypto.randomUUID(), type: 'x', payload: {} });
    await getBusinessDb(kept).outbox.add({ opId: crypto.randomUUID(), type: 'x', payload: {} });

    await saveMe(me('u1', [business(kept, 'Kept Shop')]));
    expect(await Dexie.exists(businessDbName(lost))).toBe(false);
    expect(await getAppValue('notice')).toEqual({ kind: 'accessRemoved', businessName: 'Lost Shop', unsent: 1 });
    expect(await getBusinessDb(kept).outbox.count()).toBe(1); // the other business is untouched
  });

  it('keeps the sync\'s notice (with its true unsent count) when the business was already wiped', async () => {
    const { wipeBusiness } = await import('../db/wipe.js');
    const shop = crypto.randomUUID();
    await saveMe(me('u9', [business(shop, 'Already Wiped')]));
    await getBusinessDb(shop).outbox.add({ opId: crypto.randomUUID(), type: 'x', payload: {} });
    // The sync got ACCESS_REMOVED first: its wipe deleted the shop and saved a notice counting 1 unsent record
    // (even if the screen then stopped the sync before it could report back).
    await wipeBusiness(shop, { notice: 'accessRemoved' });
    // Then "who am I" shows the shop gone: the notice must still be there and still say 1, not 0.
    await saveMe(me('u9', []));
    expect(await getAppValue('notice')).toEqual({ kind: 'accessRemoved', businessName: 'Already Wiped', unsent: 1 });
  });

  it('does not wipe anything when a DIFFERENT person signs in (that is the take-over rule\'s job)', async () => {
    const theirs = crypto.randomUUID();
    await saveMe(me('u2', [business(theirs, 'Theirs')]));
    await getBusinessDb(theirs).outbox.add({ opId: crypto.randomUUID(), type: 'x', payload: {} });
    await saveMe(me('u3', []));
    expect(await getBusinessDb(theirs).outbox.count()).toBe(1);
  });
});
