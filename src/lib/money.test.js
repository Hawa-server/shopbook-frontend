// Tests for the money helpers: formatting pesewas and reading typed amounts without floating point.
import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyPlain, parseMoney, MAX_PESEWAS } from './money.js';

const NBSP = ' ';

describe('formatMoney', () => {
  it('formats whole cedis with two decimals', () => {
    expect(formatMoney(12000)).toBe(`GH₵${NBSP}120.00`);
  });
  it('formats pesewas below one cedi', () => {
    expect(formatMoney(5)).toBe(`GH₵${NBSP}0.05`);
    expect(formatMoney(50)).toBe(`GH₵${NBSP}0.50`);
    expect(formatMoney(0)).toBe(`GH₵${NBSP}0.00`);
  });
  it('groups thousands', () => {
    expect(formatMoney(124000)).toBe(`GH₵${NBSP}1,240.00`);
    expect(formatMoney(100000000)).toBe(`GH₵${NBSP}1,000,000.00`);
    expect(formatMoney(12345678901)).toBe(`GH₵${NBSP}123,456,789.01`);
  });
  it('writes negatives with a real minus and non-breaking spaces', () => {
    expect(formatMoney(-15000)).toBe(`−${NBSP}GH₵${NBSP}150.00`);
  });
  it('never contains an ordinary space, so an amount cannot wrap', () => {
    expect(formatMoney(100000)).not.toContain(' ');
  });
  it('refuses anything that is not whole pesewas', () => {
    expect(() => formatMoney(120.5)).toThrow();
    expect(() => formatMoney('12000')).toThrow();
    expect(() => formatMoney(NaN)).toThrow();
    expect(() => formatMoney(undefined)).toThrow();
  });
  it('has a plain version without the sign', () => {
    expect(formatMoneyPlain(124050)).toBe('1,240.50');
  });
});

describe('parseMoney', () => {
  const ok = (text, pesewas) => expect(parseMoney(text)).toEqual({ ok: true, pesewas });
  const bad = (text, error) => expect(parseMoney(text)).toEqual({ ok: false, error });

  it('reads whole cedis', () => ok('120', 12000));
  it('reads one decimal digit as tens of pesewas', () => ok('120.5', 12050));
  it('reads two decimal digits', () => ok('120.55', 12055));
  it('reads pesewas only', () => {
    ok('0.05', 5);
    ok('.5', 50);
    ok('0.1', 10);
  });
  it('reads the classic floating-point traps exactly', () => {
    ok('0.29', 29); // 0.29 * 100 = 28.999999999999996 in floating point
    ok('1.15', 115); // 1.15 * 100 = 114.99999999999999
    ok('4.35', 435);
  });
  it('accepts a trailing point', () => ok('120.', 12000));
  it('accepts thousands commas', () => {
    ok('1,200', 120000);
    ok('1,200.75', 120075);
    ok('12,345,678', 1234567800);
  });
  it('ignores spaces around the amount', () => ok('  45  ', 4500));
  it('accepts leading zeros', () => ok('007', 700));
  it('accepts zero', () => ok('0', 0));
  it('refuses empty input', () => {
    bad('', 'empty');
    bad('   ', 'empty');
    bad(null, 'empty');
  });
  it('refuses more than two decimals', () => bad('12.345', 'decimals'));
  it('refuses negatives, letters and symbols', () => {
    bad('-5', 'format');
    bad('12a', 'format');
    bad('GH₵ 5', 'format');
    bad('1e3', 'format');
    bad('.', 'format');
    bad('1.2.3', 'format');
  });
  it('refuses badly placed commas', () => {
    bad('1,20', 'format');
    bad('12,00', 'format');
    bad(',100', 'format');
  });
  it('refuses amounts that are too large', () => {
    bad('1000000001', 'tooLarge');
    bad('99999999999999999999999', 'tooLarge');
  });
  it('accepts the largest allowed amount exactly', () => ok('1000000000', MAX_PESEWAS));
  it('round-trips with formatMoneyPlain', () => {
    for (const p of [0, 1, 99, 100, 12050, 124000, 987654321]) {
      expect(parseMoney(formatMoneyPlain(p))).toEqual({ ok: true, pesewas: p });
    }
  });
});
