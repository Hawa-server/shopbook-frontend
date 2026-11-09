// This phone's own key for a business, and registering it with the server
// (api.md "Phones and signed requests", POST /api/devices/challenge and POST /api/devices).
//
// 1. Make an ECDSA P-256 key pair in the browser. The private key is NOT extractable: not even the app's
//    own code can read it out; it can only be asked to sign. It's kept as a CryptoKey in that business's
//    local database (`meta.device`), never logged and never sent anywhere.
// 2. Ask the server for a one-time challenge, sign it, and send the public key, the signed challenge and
//    the person's password (proof that a stolen sign-in cookie alone can't add a key).
// 3. Keep the device code the server returns: it starts every receipt number (K7M-0042).
// A new key always means a new device ID: a phone never swaps the key behind an existing ID.

import { apiRequest } from '../api/client.js';
import { getBusinessDb, getMeta, setMeta } from '../db/businessDb.js';
import { signText } from './sign.js';

// Makes a new key pair (private key not extractable) and a new device ID.
export async function createDeviceKey() {
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
  return { deviceId: crypto.randomUUID(), privateKey: keys.privateKey, publicKey: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } };
}

// The phone's model for the owner's phone list (Chrome on Android can tell us, e.g. "TECNO KF6"),
// or `fallback` when the browser won't say.
export async function phoneName(fallback) {
  try {
    const info = await navigator.userAgentData?.getHighEntropyValues?.(['model']);
    const model = info?.model?.trim();
    if (model) return model.slice(0, 60);
  } catch {
    // not available: use the fallback
  }
  return fallback;
}

// True if this phone already has a key registered for the business.
export async function hasDevice(businessId) {
  return Boolean(await getMeta(getBusinessDb(businessId), 'device'));
}

// Registers this phone for a business with the person's password (used once, never stored).
// Returns { ok: true, deviceCode } or { ok: false, result } (the failed request, for the screen to explain).
export async function registerThisPhone({ businessId, password, name, request = apiRequest }) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const key = await createDeviceKey();
    const challenge = await request('/api/devices/challenge', { method: 'POST', businessId });
    if (challenge.kind !== 'ok') return { ok: false, result: challenge };

    const result = await request('/api/devices', {
      method: 'POST',
      businessId,
      body: {
        deviceId: key.deviceId,
        name,
        publicKey: key.publicKey,
        challenge: challenge.data.challenge,
        challengeSignature: await signText(key.privateKey, challenge.data.challenge),
        currentPassword: password,
      },
    });
    if (result.kind === 'ok') {
      const { deviceCode } = result.data.device;
      await setMeta(getBusinessDb(businessId), 'device', {
        deviceId: key.deviceId,
        deviceCode,
        name,
        privateKey: key.privateKey,
        registeredAt: new Date().toISOString(),
      });
      return { ok: true, deviceCode };
    }
    // DEVICE_ID_TAKEN: make a NEW ID and key, and try once more. Anything else: report it.
    if (result.code !== 'DEVICE_ID_TAKEN') return { ok: false, result };
  }
  return { ok: false, result: { kind: 'error', code: 'DEVICE_ID_TAKEN' } };
}
