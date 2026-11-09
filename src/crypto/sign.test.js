// Tests for request signing: the exact text matches api.md's example, nonces are new each time,
// and a signature made with a non-extractable key checks out with the public key (as on the server).
import { describe, expect, it } from 'vitest';
import { buildSignedText, makeNonce, sha256Hex, signatureHeaders, signText } from './sign.js';
import { fromBase64url, toBase64url } from '../lib/base64url.js';

describe('base64url', () => {
  it('round-trips bytes and never contains + / or =', () => {
    const bytes = Uint8Array.from({ length: 64 }, (_, i) => (i * 37 + 250) % 256);
    const text = toBase64url(bytes);
    expect(text).not.toMatch(/[+/=]/);
    expect([...fromBase64url(text)]).toEqual([...bytes]);
  });
});

describe('buildSignedText', () => {
  it('matches the example in api.md exactly', async () => {
    const text = await buildSignedText({
      method: 'get',
      pathWithQuery: '/api/devices',
      bodyText: undefined,
      deviceId: '3F1C2A9E-6B7D-4C1E-9A2B-0D4E5F6A7B8C',
      businessId: '8a0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d',
      signedAt: 1794045600000,
      nonce: 'q9X2bY7mL0pQ4sTvW1zR3A',
    });
    expect(text).toBe(
      'GET\n/api/devices\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n' +
        '3f1c2a9e-6b7d-4c1e-9a2b-0d4e5f6a7b8c\n8a0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d\n1794045600000\nq9X2bY7mL0pQ4sTvW1zR3A',
    );
  });
  it('hashes the exact body string, so any change in the body changes the text', async () => {
    expect(await sha256Hex('{"a":1}')).not.toBe(await sha256Hex('{"a": 1}'));
  });
  it('keeps the query string exactly as sent', async () => {
    const text = await buildSignedText({ method: 'GET', pathWithQuery: '/api/sync/pull?since=120&limit=500', deviceId: 'd', businessId: 'b', signedAt: 1, nonce: 'n' });
    expect(text.split('\n')[1]).toBe('/api/sync/pull?since=120&limit=500');
  });
});

describe('nonces and signatures', () => {
  it('makes a new 22-character nonce every time', () => {
    const a = makeNonce();
    expect(a).toHaveLength(22);
    expect(makeNonce()).not.toBe(a);
  });
  it('signs with a non-extractable key, and the public key verifies it', async () => {
    const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    await expect(crypto.subtle.exportKey('jwk', keys.privateKey)).rejects.toThrow(); // can't be read out
    const signature = await signText(keys.privateKey, 'hello');
    expect(fromBase64url(signature)).toHaveLength(64);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keys.publicKey, fromBase64url(signature), new TextEncoder().encode('hello'));
    expect(ok).toBe(true);
  });
  it('makes the four headers, with the time rounded to whole milliseconds', async () => {
    const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    const headers = await signatureHeaders({
      device: { deviceId: 'ABC', privateKey: keys.privateKey },
      businessId: 'b1', method: 'POST', pathWithQuery: '/api/sync/push', bodyText: '{}', now: 1000.6,
    });
    expect(Object.keys(headers).sort()).toEqual(['X-Device-Id', 'X-Nonce', 'X-Signature', 'X-Signed-At']);
    expect(headers['X-Device-Id']).toBe('abc');
    expect(headers['X-Signed-At']).toBe('1001');
  });
});
