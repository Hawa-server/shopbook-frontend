// The PIN lock's hashing (docs/app-plan.md "Sign-in, PIN and offline access"; backlog AC25).
//
// The 4-digit PIN never leaves the phone and is never stored as typed. We store only a PBKDF2-SHA-256
// hash with a random 16-byte salt and many iterations, using the browser's built-in Web Crypto.
// A 4-digit PIN has only 10,000 possibilities, so the hash alone can't stop someone who copies the
// phone's storage; what really protects it is the 5-wrong-tries lock (pinLock.js), which then requires a
// full online sign-in with the password. The iterations make each guess slow on top of that.

export const PIN_ITERATIONS = 150_000;
export const PIN_LENGTH = 4;

// True for exactly four digits.
export function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

// Bytes ↔ base64 text, so the hash and salt can be stored as plain strings.
const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

// Runs PBKDF2 on the PIN with the given salt and iterations; returns the 32-byte result.
async function derive(pin, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

// Makes the stored record for a new PIN: { hash, salt, iterations } (base64 strings and a number).
export async function hashPin(pin, iterations = PIN_ITERATIONS) {
  if (!isValidPin(pin)) throw new Error('A PIN is exactly 4 digits');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, iterations);
  return { hash: toBase64(hash), salt: toBase64(salt), iterations };
}

// Checks a typed PIN against a stored record. Compares every byte (no early exit), so the time taken
// doesn't hint at how much of the PIN was right.
export async function verifyPin(pin, record) {
  if (!isValidPin(pin) || !record) return false;
  const expected = fromBase64(record.hash);
  const actual = new Uint8Array(await derive(pin, fromBase64(record.salt), record.iterations));
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}
