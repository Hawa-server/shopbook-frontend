// Tests for whatToDo(): each kind of answer from docs/api.md "Errors" leads to the right action.
// The key promise: temporary failures are never treated as rejections.
import { describe, expect, it } from 'vitest';
import { ACTION, whatToDo } from './errors.js';

const err = (status, code) => ({ kind: 'error', status, code });

describe('whatToDo', () => {
  it('passes success through', () => {
    expect(whatToDo({ kind: 'ok', status: 200 })).toBe(ACTION.OK);
  });

  it('treats no network and timeouts as temporary', () => {
    expect(whatToDo({ kind: 'network', reason: 'offline' })).toBe(ACTION.TEMPORARY);
    expect(whatToDo({ kind: 'network', reason: 'timeout' })).toBe(ACTION.TEMPORARY);
  });

  it('treats hosting errors without the error format as temporary (server waking up)', () => {
    expect(whatToDo(err(502, null))).toBe(ACTION.TEMPORARY);
    expect(whatToDo(err(503, null))).toBe(ACTION.TEMPORARY);
    expect(whatToDo(err(504, null))).toBe(ACTION.TEMPORARY);
  });

  it('treats server errors in the error format as temporary', () => {
    expect(whatToDo(err(500, 'INTERNAL_ERROR'))).toBe(ACTION.TEMPORARY);
    expect(whatToDo(err(503, 'TRY_AGAIN'))).toBe(ACTION.TEMPORARY);
    expect(whatToDo(err(500, 'SOMETHING_NEW'))).toBe(ACTION.TEMPORARY);
  });

  it('never treats an unexpected answer as a rejection', () => {
    expect(whatToDo(err(418, null))).toBe(ACTION.TEMPORARY);
  });

  it('waits when rate limited', () => {
    expect(whatToDo(err(429, 'RATE_LIMITED'))).toBe(ACTION.WAIT);
    expect(whatToDo(err(429, null))).toBe(ACTION.WAIT);
  });

  it('asks to sign in (keeping all data) when the session ended', () => {
    expect(whatToDo(err(401, 'NOT_SIGNED_IN'))).toBe(ACTION.SIGN_IN);
  });

  it('wipes only on access removed or phone revoked', () => {
    expect(whatToDo(err(403, 'ACCESS_REMOVED'))).toBe(ACTION.WIPE_BUSINESS);
    expect(whatToDo(err(403, 'DEVICE_REVOKED'))).toBe(ACTION.WIPE_BUSINESS);
    expect(whatToDo(err(403, 'FORBIDDEN'))).not.toBe(ACTION.WIPE_BUSINESS);
  });

  it('handles the other account answers', () => {
    expect(whatToDo(err(403, 'BUSINESS_CLOSING'))).toBe(ACTION.BUSINESS_CLOSING);
    expect(whatToDo(err(403, 'TERMS_REQUIRED'))).toBe(ACTION.ACCEPT_TERMS);
    expect(whatToDo(err(403, 'PASSWORD_CHANGE_REQUIRED'))).toBe(ACTION.CHANGE_PASSWORD);
    expect(whatToDo(err(400, 'VALIDATION_FAILED'))).toBe(ACTION.FIX_INPUT);
    expect(whatToDo(err(400, 'WRONG_PASSWORD'))).toBe(ACTION.FIX_INPUT);
    expect(whatToDo(err(403, 'FORBIDDEN'))).toBe(ACTION.NOT_ALLOWED);
    expect(whatToDo(err(401, 'WRONG_LOGIN'))).toBe(ACTION.SHOW);
    expect(whatToDo(err(409, 'PHONE_TAKEN'))).toBe(ACTION.SHOW);
    expect(whatToDo(err(502, 'EMAIL_NOT_SENT'))).toBe(ACTION.SHOW);
  });

  it('flags app bugs', () => {
    for (const code of ['CSRF_HEADER_MISSING', 'ORIGIN_NOT_ALLOWED', 'ORIGIN_REQUIRED', 'INVALID_JSON', 'BUSINESS_REQUIRED']) {
      expect(whatToDo(err(400, code))).toBe(ACTION.APP_BUG);
    }
  });
});
