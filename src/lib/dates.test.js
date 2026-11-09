// Tests for showing times and days in the business's time zone.
import { describe, expect, it } from 'vitest';
import { daysSince, formatDay, formatTime } from './dates.js';

describe('dates', () => {
  it('shows the time in the business time zone, as "2:15 pm"', () => {
    expect(formatTime('2026-11-03T14:15:00.000Z', 'Africa/Accra')).toBe('2:15 pm');
    expect(formatTime('2026-11-03T09:05:00.000Z', 'Africa/Accra')).toBe('9:05 am');
    expect(formatTime('2026-11-03T14:15:00.000Z', 'Africa/Nairobi')).toBe('5:15 pm');
  });
  it('shows the day as "Tue 3 Nov"', () => {
    expect(formatDay('2026-11-03T14:15:00.000Z', 'Africa/Accra')).toBe('Tue 3 Nov');
  });
  it('copes with nothing or nonsense', () => {
    expect(formatTime(null, 'Africa/Accra')).toBe('');
    expect(formatTime('not a date', 'Africa/Accra')).toBe('');
  });
  it('counts whole days', () => {
    expect(daysSince('2026-11-01T00:00:00Z', Date.parse('2026-11-03T12:00:00Z'))).toBe(2);
  });
});
