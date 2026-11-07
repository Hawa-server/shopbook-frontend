// Tests for describeFailure: each kind of failed request ends up as words in the right place.
import { describe, expect, it } from 'vitest';
import { describeFailure } from './formErrors.js';
import { translate } from '../i18n/translate.js';

const t = (key, params) => translate('en', key, params);
const err = (status, code, fields) => ({ kind: 'error', status, code, fields });

describe('describeFailure', () => {
  it('says "no internet" when offline, and "try again" on a timeout or server error', () => {
    expect(describeFailure({ kind: 'network', reason: 'offline' }, t).form).toBe(t('errors.offline'));
    expect(describeFailure({ kind: 'network', reason: 'timeout' }, t).form).toBe(t('errors.temporary'));
    expect(describeFailure(err(503, null), t).form).toBe(t('errors.temporary'));
  });
  it('puts each validation message under its own field', () => {
    const out = describeFailure(err(400, 'VALIDATION_FAILED', { phone: 'x', password: 'y' }), t, ['phone', 'password']);
    expect(out.fields).toEqual({ phone: t('errors.field.phone'), password: t('errors.field.password') });
    expect(out.form).toBeNull();
  });
  it('uses a general message for a field it has no words for', () => {
    const out = describeFailure(err(400, 'VALIDATION_FAILED', { weird: 'x' }), t, ['weird']);
    expect(out.fields.weird).toBe(t('errors.field.generic'));
  });
  it('shows "phone taken" under the phone field', () => {
    expect(describeFailure(err(409, 'PHONE_TAKEN'), t, ['phone']).fields.phone).toBe(t('errors.code.PHONE_TAKEN'));
    expect(describeFailure(err(409, 'PHONE_TAKEN'), t, ['newPhone']).fields.newPhone).toBe(t('errors.code.PHONE_TAKEN'));
  });
  it('shows the same message for any wrong login', () => {
    expect(describeFailure(err(401, 'WRONG_LOGIN'), t, ['login', 'password']).form).toBe('Wrong phone number, email or password.');
  });
  it('asks to wait when rate limited', () => {
    expect(describeFailure(err(429, 'RATE_LIMITED'), t).form).toBe(t('errors.rateLimited'));
  });
  it('falls back to a general message for an unknown code', () => {
    expect(describeFailure(err(409, 'SOMETHING_NEW'), t).form).toBe(t('errors.unexpected'));
  });
});
