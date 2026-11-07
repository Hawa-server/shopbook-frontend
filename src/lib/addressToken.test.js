// Tests that a reset or confirm token is taken out of the address straight away.
import { describe, expect, it } from 'vitest';
import { takeTokenFromAddress } from './addressToken.js';

// A pretend window: an address, and a history that records replaceState calls.
function fakeWindow(pathname, search) {
  const win = {
    location: { pathname, search },
    history: {
      replaceState: (_state, _title, url) => {
        win.location.search = '';
        win.replaced = url;
      },
    },
  };
  return win;
}

describe('takeTokenFromAddress', () => {
  it('returns the token and removes it from the address', () => {
    const win = fakeWindow('/reset-password', '?token=abc123');
    expect(takeTokenFromAddress(win)).toBe('abc123');
    expect(win.replaced).toBe('/reset-password');
    expect(win.location.search).toBe('');
  });
  it('clears any query even without a token', () => {
    const win = fakeWindow('/confirm-email', '?x=1');
    expect(takeTokenFromAddress(win)).toBeNull();
    expect(win.replaced).toBe('/confirm-email');
  });
  it('leaves a clean address alone', () => {
    const win = fakeWindow('/confirm-email', '');
    expect(takeTokenFromAddress(win)).toBeNull();
    expect(win.replaced).toBeUndefined();
  });
});
