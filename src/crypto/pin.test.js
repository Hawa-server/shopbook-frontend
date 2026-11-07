// Tests for PIN hashing: only a salted hash is kept, and only the right PIN matches it.
// (Fewer iterations here just to keep the tests fast; the app uses PIN_ITERATIONS.)
import { describe, expect, it } from 'vitest';
import { hashPin, isValidPin, verifyPin } from './pin.js';

describe('PIN', () => {
  it('accepts exactly four digits', () => {
    expect(isValidPin('0420')).toBe(true);
    for (const bad of ['123', '12345', '12a4', ' 1234', 1234, null]) expect(isValidPin(bad)).toBe(false);
  });
  it('stores a hash and salt, never the PIN', async () => {
    const record = await hashPin('2580', 1000);
    expect(JSON.stringify(record)).not.toContain('2580');
    expect(record.iterations).toBe(1000);
  });
  it('matches only the right PIN', async () => {
    const record = await hashPin('2580', 1000);
    expect(await verifyPin('2580', record)).toBe(true);
    expect(await verifyPin('2581', record)).toBe(false);
    expect(await verifyPin('0000', record)).toBe(false);
  });
  it('uses a new salt each time, so the same PIN gives different hashes', async () => {
    const a = await hashPin('1111', 1000);
    const b = await hashPin('1111', 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
  it('refuses to hash something that is not a PIN', async () => {
    await expect(hashPin('12')).rejects.toThrow();
  });
  it('says no for a missing record or a malformed PIN', async () => {
    expect(await verifyPin('1234', null)).toBe(false);
    expect(await verifyPin('12', await hashPin('1234', 1000))).toBe(false);
  });
});
