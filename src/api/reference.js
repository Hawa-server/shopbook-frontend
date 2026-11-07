// Keeps a copy of GET /api/reference (countries, currencies, languages, payment methods) on the phone,
// so country facts (e.g. how to show phone numbers) work offline. Fetched at sign-in, sign-up and
// on opening when online; the phone's copy is used until a newer one arrives.

import { getReference } from './auth.js';
import { setAppValue } from '../db/appDb.js';

// Fetches the reference list and saves it. Returns it, or null if the server can't be reached.
export async function loadReference() {
  const result = await getReference();
  if (result.kind !== 'ok' || !result.data) return null;
  await setAppValue('reference', result.data);
  return result.data;
}

// The facts for one country code (e.g. 'GH') from a reference answer, or null.
export function findCountry(reference, code) {
  return reference?.countries?.find((c) => c.code === code) ?? null;
}

// The country to use on sign-in and sign-up screens: the only one, or the server's default.
export function defaultCountry(reference) {
  return reference?.defaults?.country ?? reference?.countries?.[0]?.code ?? null;
}
