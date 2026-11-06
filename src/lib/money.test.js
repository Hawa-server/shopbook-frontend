// Tests for the money helpers: formatting minor units with a business's currency rules, and reading
// typed amounts without floating point. GHS uses the exact rules api.md gives; the other currencies are
// made-up rule sets that exercise 0 and 3 decimals, a symbol after the number, and "," as the decimal point.
import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyPlain, parseMoney } from './money.js';

const NBSP = ' ';
const GHS = { code: 'GHS', symbol: 'GH₵', minorUnits: 2, symbolPosition: 'before', symbolSpace: NBSP, decimalSeparator: '.', groupSeparator: ',' };
const ZERO = { code: 'XZZ', symbol: 'Z', minorUnits: 0, symbolPosition: 'before', symbolSpace: NBSP, decimalSeparator: '.', groupSeparator: ',' };
const THREE = { code: 'XTT', symbol: 'T', minorUnits: 3, symbolPosition: 'before', symbolSpace: NBSP, decimalSeparator: '.', groupSeparator: ',' };
const AFTER = { code: 'XAA', symbol: '€', minorUnits: 2, symbolPosition: 'after', symbolSpace: NBSP, decimalSeparator: ',', groupSeparator: '.' };

describe('formatMoney (GHS, the api.md examples)', () => {
  it('writes 12000 as GH₵ 120.00 and 120050 as GH₵ 1,200.50', () => {
    expect(formatMoney(12000, GHS)).toBe(`GH₵${NBSP}120.00`);
    expect(formatMoney(120050, GHS)).toBe(`GH₵${NBSP}1,200.50`);
  });
  it('writes amounts below one cedi', () => {
    expect(formatMoney(5, GHS)).toBe(`GH₵${NBSP}0.05`);
    expect(formatMoney(50, GHS)).toBe(`GH₵${NBSP}0.50`);
    expect(formatMoney(0, GHS)).toBe(`GH₵${NBSP}0.00`);
  });
  it('groups thousands', () => {
    expect(formatMoney(100000000, GHS)).toBe(`GH₵${NBSP}1,000,000.00`);
    expect(formatMoney(12345678901, GHS)).toBe(`GH₵${NBSP}123,456,789.01`);
  });
  it('puts "-" in front of a negative amount, as api.md says', () => {
    expect(formatMoney(-500, GHS)).toBe(`-GH₵${NBSP}5.00`);
  });
  it('never contains an ordinary space, so an amount cannot wrap', () => {
    expect(formatMoney(100000, GHS)).not.toContain(' ');
  });
  it('refuses anything that is not whole minor units', () => {
    expect(() => formatMoney(120.5, GHS)).toThrow();
    expect(() => formatMoney('12000', GHS)).toThrow();
    expect(() => formatMoney(NaN, GHS)).toThrow();
  });
  it('refuses to guess when the currency rules are missing or broken', () => {
    expect(() => formatMoney(100)).toThrow();
    expect(() => formatMoney(100, { ...GHS, minorUnits: 1 })).toThrow();
    expect(() => formatMoney(100, { ...GHS, decimalSeparator: ',' })).toThrow(); // same as group separator
  });
  it('has a plain version without the symbol', () => {
    expect(formatMoneyPlain(124050, GHS)).toBe('1,240.50');
    expect(formatMoneyPlain(-124050, GHS)).toBe('-1,240.50');
  });
});

describe('formatMoney (other currency rules)', () => {
  it('writes a currency with no decimals', () => {
    expect(formatMoney(1500, ZERO)).toBe(`Z${NBSP}1,500`);
    expect(formatMoney(7, ZERO)).toBe(`Z${NBSP}7`);
  });
  it('writes a currency with three decimals', () => {
    expect(formatMoney(1500, THREE)).toBe(`T${NBSP}1.500`);
    expect(formatMoney(1234567, THREE)).toBe(`T${NBSP}1,234.567`);
    expect(formatMoney(5, THREE)).toBe(`T${NBSP}0.005`);
  });
  it('writes the symbol after the number, with "," as the decimal point', () => {
    expect(formatMoney(123456, AFTER)).toBe(`1.234,56${NBSP}€`);
    expect(formatMoney(-500, AFTER)).toBe(`-5,00${NBSP}€`);
  });
});

describe('parseMoney (GHS)', () => {
  const ok = (text, minor) => expect(parseMoney(text, GHS)).toEqual({ ok: true, minor });
  const bad = (text, error) => expect(parseMoney(text, GHS)).toEqual({ ok: false, error });

  it('reads whole cedis', () => ok('120', 12000));
  it('reads one decimal digit as tens of pesewas', () => ok('120.5', 12050));
  it('reads two decimal digits', () => ok('120.55', 12055));
  it('reads pesewas only', () => {
    ok('0.05', 5);
    ok('.5', 50);
  });
  it('reads the classic floating-point traps exactly', () => {
    ok('0.29', 29); // 0.29 * 100 = 28.999999999999996 in floating point
    ok('1.15', 115); // 1.15 * 100 = 114.99999999999999
    ok('4.35', 435);
  });
  it('accepts a trailing point, thousands commas, spaces around, leading zeros and zero', () => {
    ok('120.', 12000);
    ok('1,200.75', 120075);
    ok('12,345,678', 1234567800);
    ok('  45  ', 4500);
    ok('007', 700);
    ok('0', 0);
  });
  it('refuses empty input', () => {
    bad('', 'empty');
    bad('   ', 'empty');
    bad(null, 'empty');
  });
  it('refuses more than two decimals', () => bad('12.345', 'decimals'));
  it('refuses negatives, letters and symbols', () => {
    for (const text of ['-5', '12a', 'GH₵ 5', '1e3', '.', '1.2.3']) bad(text, 'format');
  });
  it('refuses badly placed commas', () => {
    for (const text of ['1,20', '12,00', ',100']) bad(text, 'format');
  });
  it('refuses amounts that are too large, and accepts the largest allowed', () => {
    bad('1000000001', 'tooLarge');
    bad('99999999999999999999999', 'tooLarge');
    ok('1000000000', 100000000000);
  });
  it('round-trips with formatMoneyPlain', () => {
    for (const m of [0, 1, 99, 100, 12050, 124000, 987654321]) {
      expect(parseMoney(formatMoneyPlain(m, GHS), GHS)).toEqual({ ok: true, minor: m });
    }
  });
});

describe('parseMoney (other currency rules)', () => {
  it('refuses any decimals for a currency without them', () => {
    expect(parseMoney('1,500', ZERO)).toEqual({ ok: true, minor: 1500 });
    expect(parseMoney('15.5', ZERO)).toEqual({ ok: false, error: 'decimals' });
  });
  it('reads three decimals', () => {
    expect(parseMoney('1.5', THREE)).toEqual({ ok: true, minor: 1500 });
    expect(parseMoney('0.005', THREE)).toEqual({ ok: true, minor: 5 });
    expect(parseMoney('0.0005', THREE)).toEqual({ ok: false, error: 'decimals' });
  });
  it('reads "," as the decimal point and "." as the group separator', () => {
    expect(parseMoney('1.234,56', AFTER)).toEqual({ ok: true, minor: 123456 });
    expect(parseMoney('12,5', AFTER)).toEqual({ ok: true, minor: 1250 });
    expect(parseMoney('1.23', AFTER)).toEqual({ ok: false, error: 'format' }); // "." is grouping here
  });
  it('round-trips every rule set', () => {
    for (const currency of [ZERO, THREE, AFTER]) {
      for (const m of [0, 7, 1500, 123456, 987654321]) {
        expect(parseMoney(formatMoneyPlain(m, currency), currency)).toEqual({ ok: true, minor: m });
      }
    }
  });
});
