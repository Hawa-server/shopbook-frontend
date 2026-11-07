// Tests for the order of screens after sign-in, and which business opens.
import { describe, expect, it } from 'vitest';
import { STEP, chooseOpenBusiness, nextStep } from './nextStep.js';

const business = (id, isPractice = false) => ({ id, isPractice, name: id, role: 'owner' });
const me = (over = {}) => ({
  user: { id: 'u1', name: 'Ama', mustChangePassword: false },
  terms: { accepted: true },
  businesses: [business('b1')],
  invitations: [],
  ...over,
});
const pin = { hash: 'h', salt: 's', iterations: 1, wrongTries: 0, lockedOut: false };

describe('nextStep', () => {
  it('is signed out without a me', () => expect(nextStep({ me: null })).toBe(STEP.SIGNED_OUT));
  it('asks for a new password before anything else', () => {
    const m = me({ user: { id: 'u1', mustChangePassword: true }, terms: { accepted: false } });
    expect(nextStep({ me: m, pin, unlocked: true })).toBe(STEP.CHANGE_PASSWORD);
  });
  it('then the terms', () => expect(nextStep({ me: me({ terms: { accepted: false } }), pin, unlocked: true })).toBe(STEP.TERMS));
  it('then invitations, unless put off for this visit', () => {
    const m = me({ invitations: [{ membershipId: 'm1' }] });
    expect(nextStep({ me: m, pin, unlocked: true })).toBe(STEP.INVITATIONS);
    expect(nextStep({ me: m, pin, unlocked: true, invitationsLater: true })).toBe(STEP.APP);
  });
  it('keeps showing invitations when they are the only way into a business', () => {
    const m = me({ businesses: [], invitations: [{ membershipId: 'm1' }] });
    expect(nextStep({ me: m, pin, unlocked: true, invitationsLater: true })).toBe(STEP.INVITATIONS);
  });
  it('says "not part of any business" when there is none and no invitation', () => {
    expect(nextStep({ me: me({ businesses: [] }), pin, unlocked: true })).toBe(STEP.NO_BUSINESS);
  });
  it('requires a PIN on this phone', () => expect(nextStep({ me: me(), pin: null, unlocked: false })).toBe(STEP.SET_PIN));
  it('locks out after too many wrong PINs, even if unlocked before', () => {
    expect(nextStep({ me: me(), pin: { ...pin, lockedOut: true }, unlocked: true })).toBe(STEP.PIN_LOCKED_OUT);
  });
  it('asks for the PIN when locked', () => expect(nextStep({ me: me(), pin, unlocked: false })).toBe(STEP.PIN));
  it('opens the app when everything is done', () => expect(nextStep({ me: me(), pin, unlocked: true })).toBe(STEP.APP));
});

describe('chooseOpenBusiness', () => {
  it('keeps the open business if still a member', () => {
    expect(chooseOpenBusiness(me({ businesses: [business('b1'), business('b2')] }), 'b2')).toBe('b2');
  });
  it('prefers a real business over a practice shop', () => {
    expect(chooseOpenBusiness(me({ businesses: [business('p', true), business('b1')] }), 'gone')).toBe('b1');
  });
  it('is null with no business', () => expect(chooseOpenBusiness(me({ businesses: [] }), null)).toBeNull());
});
