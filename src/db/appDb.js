// The shared local database `shopbook-app`: only what isn't business data
// (docs/app-plan.md "One local database per business").
//
// It holds the signed-in user, which business is open, the language, and each person's PIN hash on
// this phone. Business records NEVER go here: each business has its own database (businessDb.js),
// so a wipe (ACCESS_REMOVED, DEVICE_REVOKED) can remove one business without touching anything else.
//
// Schema rules (CLAUDE.md "Dexie versions"): every change is a NEW db.version(n) with an upgrade;
// never edit an old version.

import Dexie from 'dexie';

export const appDb = new Dexie('shopbook-app');

// Version 1 (FE1).
// - kv: small named values, one row each: 'language', 'signedInUser', 'openBusinessId', 'clockOffsetMs'…
// - pins: one row per person who set a PIN on this phone: { userId, hash, salt, iterations, wrongTries }.
appDb.version(1).stores({
  kv: 'key',
  pins: 'userId',
});

// Reads one named value from kv (undefined if never set).
export async function getAppValue(key) {
  const row = await appDb.kv.get(key);
  return row?.value;
}

// Saves one named value in kv.
export function setAppValue(key, value) {
  return appDb.kv.put({ key, value });
}
