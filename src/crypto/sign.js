// Signing every business request with this phone's own key (api.md "Phones and signed requests").
//
// Why: a sign-in cookie copied off a phone would let someone act as that person from anywhere. With a
// signature, the server also needs proof from THIS phone's private key, which can't be copied out of the
// browser. The signature covers seven items, so changing any of them after signing breaks it:
//   1. the method in capitals        2. the path and query exactly as sent
//   3. SHA-256 of the exact body bytes sent (lowercase hex)
//   4. the device ID   5. the business ID   6. the signed-at time   7. the nonce
// joined with "\n" (no trailing newline). The body is turned into a string ONCE by the API helper, and
// that same string is both hashed here and sent.

import { toBase64url } from '../lib/base64url.js';

const encoder = new TextEncoder();

// SHA-256 of a string's UTF-8 bytes, as lowercase hex. An empty body ('' or none) hashes zero bytes.
export async function sha256Hex(text = '') {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 16 random bytes in base64url (22 characters): a new one for EVERY request, retries included,
// so the server can refuse any copy of a request (NONCE_REUSED).
export function makeNonce() {
  return toBase64url(crypto.getRandomValues(new Uint8Array(16)));
}

// Builds the exact text to sign (see the list above).
export async function buildSignedText({ method, pathWithQuery, bodyText, deviceId, businessId, signedAt, nonce }) {
  return [
    method.toUpperCase(),
    pathWithQuery,
    await sha256Hex(bodyText ?? ''),
    deviceId.toLowerCase(),
    businessId.toLowerCase(),
    String(signedAt),
    nonce,
  ].join('\n');
}

// Signs text with the phone's private key. Web Crypto gives the 64-byte form the server expects.
export async function signText(privateKey, text) {
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoder.encode(text));
  return toBase64url(signature);
}

// Makes the four headers for one request. `now` is the server-corrected time (api/clock.js).
export async function signatureHeaders({ device, businessId, method, pathWithQuery, bodyText, now }) {
  const signedAt = Math.round(now);
  const nonce = makeNonce();
  const text = await buildSignedText({ method, pathWithQuery, bodyText, deviceId: device.deviceId, businessId, signedAt, nonce });
  return {
    'X-Device-Id': device.deviceId.toLowerCase(),
    'X-Signed-At': String(signedAt),
    'X-Nonce': nonce,
    'X-Signature': await signText(device.privateKey, text),
  };
}
