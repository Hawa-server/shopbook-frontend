// What the phone remembers about who is signed in, kept in the shared `shopbook-app` database
// (docs/app-plan.md "Sign-in, PIN and offline access"). No React here: the AuthProvider calls these.
//
// kv rows used:
//   'me'              the last `me` answer from the server, so the app opens offline with just the PIN
//   'openBusinessId'  which of the person's businesses is open
//   'lastUser'        { id, name, businessIds } of the last person signed in, KEPT after signing out,
//                     so the next sign-in can tell whether a different person is taking over the phone
//   'reference'       the last GET /api/reference answer (countries, languages…) for offline use
//   'language'        this phone's app language; 'pendingLanguage' a choice not yet sent to the server
// pins table: one row per person who set a PIN on this phone:
//   { userId, hash, salt, iterations, wrongTries, lockedOut }
// Nothing here is a password, a token or a business record.

import Dexie from 'dexie';
import { appDb, getAppValue, setAppValue } from '../db/appDb.js';
import { businessDbName, createBusinessDb } from '../db/businessDb.js';
import { chooseOpenBusiness } from './nextStep.js';
import { wipeBusiness } from '../db/wipe.js';
import { LANGUAGE_TAGS } from '../i18n/languages.js';

export const MAX_WRONG_PINS = 5;

// When the SAME person's new `me` no longer lists a business they had, the owner removed them (or the
// business is gone): that business's data must not stay on the phone. This happens even when the app
// learns it from `GET /api/auth/me` before any sync could get ACCESS_REMOVED. Each lost business is wiped
// (after counting what was unsent) and a notice says so, exactly like the ACCESS_REMOVED case.
async function removeLostBusinesses(previous, next) {
  if (!previous?.user || previous.user.id !== next?.user?.id) return;
  const still = new Set((next.businesses ?? []).map((b) => b.id));
  for (const lost of (previous.businesses ?? []).filter((b) => !still.has(b.id))) {
    // The wipe saves the notice itself (only if it found data to delete), so if the sync already wiped
    // this business, the sync's notice with its true unsent count is kept.
    await wipeBusiness(lost.id, { notice: 'accessRemoved' });
  }
}

// Saves a fresh `me` answer: the person, which business is open, and who used the phone last.
// Also adopts the person's server-side language, unless this phone has a newer choice waiting to be sent.
// A business that has disappeared from the same person's list is wiped first (removeLostBusinesses).
export async function saveMe(me) {
  await removeLostBusinesses(await getAppValue('me'), me);
  await appDb.transaction('rw', appDb.kv, async () => {
    const openId = chooseOpenBusiness(me, await getAppValue('openBusinessId'));
    await setAppValue('me', me);
    await setAppValue('openBusinessId', openId);
    await setAppValue('lastUser', { id: me.user.id, name: me.user.name, businessIds: (me.businesses ?? []).map((b) => b.id) });
    const pending = await getAppValue('pendingLanguage');
    if (!pending && LANGUAGE_TAGS.includes(me.user.language)) await setAppValue('language', me.user.language);
  });
}

// Forgets who is signed in on this phone (sign out). The PIN rows and 'lastUser' stay: the PIN belongs to
// that person on this phone, and 'lastUser' is needed for the different-person rule below.
export async function forgetSignedIn() {
  await appDb.kv.bulkDelete(['me', 'openBusinessId']);
}

// Counts records waiting in the outbox of the given businesses' databases on this phone.
// Databases that don't exist yet count as 0. (FE3 fills the outboxes; this already reads them.)
export async function countUnsent(businessIds = []) {
  let total = 0;
  for (const id of businessIds) {
    let name;
    try {
      name = businessDbName(id);
    } catch {
      continue;
    }
    if (!(await Dexie.exists(name))) continue;
    const db = createBusinessDb(id);
    try {
      total += await db.outbox.count();
    } finally {
      db.close();
    }
  }
  return total;
}

// The different-person rule (decided 6 Nov 2026): someone else may take over this phone only when the
// previous person has NOTHING unsent; there is no way around it. Returns
//   { allowed: true, previous }  previous = the last person if it's a different one (else null)
//   { allowed: false, name, count } when the previous person still has unsent records.
// When allowed with a `previous`, the previous person's business data must then be removed:
// that removal arrives in FE3 (with the sync engine and wipe.js).
export async function checkTakeOver(newUserId) {
  const last = await getAppValue('lastUser');
  if (!last || last.id === newUserId) return { allowed: true, previous: null };
  const count = await countUnsent(last.businessIds);
  if (count > 0) return { allowed: false, name: last.name, count };
  return { allowed: true, previous: last };
}

// Stores a new PIN record for a person (replacing any old one) with no wrong tries.
export function savePin(userId, record) {
  return appDb.pins.put({ userId, ...record, wrongTries: 0, lockedOut: false });
}

// Removes a person's PIN (after "Forgot PIN" + password sign-in), so they must set a new one.
export function deletePin(userId) {
  return appDb.pins.delete(userId);
}

// Records one wrong PIN. At MAX_WRONG_PINS the app locks until an online sign-in with the password.
// Saved before the screen reacts, so closing the app can't reset the count.
export async function recordWrongPin(userId) {
  return appDb.transaction('rw', appDb.pins, async () => {
    const pin = await appDb.pins.get(userId);
    if (!pin) return null;
    const wrongTries = (pin.wrongTries ?? 0) + 1;
    const updated = { ...pin, wrongTries, lockedOut: wrongTries >= MAX_WRONG_PINS };
    await appDb.pins.put(updated);
    return updated;
  });
}

// Clears the wrong-try count after a right PIN.
export async function clearWrongPins(userId) {
  await appDb.pins.update(userId, { wrongTries: 0, lockedOut: false });
}
