// Tests for showing E.164 phone numbers in local form, with Ghana's facts from api.md.
import { describe, expect, it } from 'vitest';
import { formatPhoneLocal, whatsAppNumber } from './phone.js';

const GH = { code: 'GH', dialCode: '233', trunkPrefix: '0', nationalNumberLengths: [9] };

describe('formatPhoneLocal', () => {
  it('shows a Ghana number as 024 123 4567', () => {
    expect(formatPhoneLocal('+233241234567', GH)).toBe('024 123 4567');
  });
  it('shows a number from another country exactly as received', () => {
    expect(formatPhoneLocal('+447700900123', GH)).toBe('+447700900123');
  });
  it('shows a number of an unexpected length exactly as received', () => {
    expect(formatPhoneLocal('+23324123456', GH)).toBe('+23324123456');
  });
  it('copes with a missing number or country', () => {
    expect(formatPhoneLocal(null, GH)).toBe('');
    expect(formatPhoneLocal('+233241234567', undefined)).toBe('+233241234567');
  });
});

describe('whatsAppNumber', () => {
  it('drops the plus sign', () => expect(whatsAppNumber('+233241234567')).toBe('233241234567'));
});
