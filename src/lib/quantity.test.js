// Tests for quantities: whole units and half yards, both directions.
import { describe, expect, it } from 'vitest';
import { formatQuantityNumber, parseQuantity } from './quantity.js';

describe('formatQuantityNumber', () => {
  it('shows whole units as they are', () => {
    expect(formatQuantityNumber(3)).toBe('3');
    expect(formatQuantityNumber(0)).toBe('0');
  });
  it('shows half yards', () => {
    expect(formatQuantityNumber(5, 2)).toBe('2.5');
    expect(formatQuantityNumber(4, 2)).toBe('2');
    expect(formatQuantityNumber(1, 2)).toBe('0.5');
  });
  it('shows below-zero stock with a minus', () => {
    expect(formatQuantityNumber(-3, 2)).toBe('−1.5');
    expect(formatQuantityNumber(-2)).toBe('−2');
  });
  it('refuses fractions and unknown scales', () => {
    expect(() => formatQuantityNumber(1.5)).toThrow();
    expect(() => formatQuantityNumber(2, 3)).toThrow();
  });
});

describe('parseQuantity', () => {
  it('reads whole units', () => {
    expect(parseQuantity('3')).toEqual({ ok: true, units: 3 });
    expect(parseQuantity('3', 2)).toEqual({ ok: true, units: 6 });
  });
  it('reads half yards', () => {
    expect(parseQuantity('2.5', 2)).toEqual({ ok: true, units: 5 });
    expect(parseQuantity('0.5', 2)).toEqual({ ok: true, units: 1 });
    expect(parseQuantity('2.50', 2)).toEqual({ ok: true, units: 5 });
    expect(parseQuantity('2.0', 2)).toEqual({ ok: true, units: 4 });
  });
  it('refuses halves for items counted whole', () => {
    expect(parseQuantity('2.5', 1)).toEqual({ ok: false, error: 'format' });
  });
  it('refuses fractions other than a half for yards', () => {
    expect(parseQuantity('2.25', 2)).toEqual({ ok: false, error: 'halfOnly' });
    expect(parseQuantity('2.3', 2)).toEqual({ ok: false, error: 'halfOnly' });
  });
  it('refuses empty, negative and odd input', () => {
    expect(parseQuantity('')).toEqual({ ok: false, error: 'empty' });
    expect(parseQuantity('-1')).toEqual({ ok: false, error: 'format' });
    expect(parseQuantity('two')).toEqual({ ok: false, error: 'format' });
    expect(parseQuantity('1e2')).toEqual({ ok: false, error: 'format' });
  });
  it('refuses absurdly large quantities', () => {
    expect(parseQuantity('1234567890')).toEqual({ ok: false, error: 'tooLarge' });
  });
});
