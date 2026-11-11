// Tests the app's stock rule against the SHARED fixtures in docs/api.md (the same cases the server tests),
// read from the file itself so they can never drift apart, in the given order and in reverse order.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { countResult, stockOnHand, stockStatus } from './stockRule.js';

const apiMd = readFileSync(new URL('../../docs/api.md', import.meta.url), 'utf8');
const block = apiMd.split('<!-- stock-rule-fixtures:start -->')[1]?.split('<!-- stock-rule-fixtures:end -->')[0] ?? '';
const fixtures = JSON.parse(block.replace(/^[\s\S]*?```json/, '').replace(/```[\s\S]*$/, ''));

describe('stock rule: api.md shared fixtures', () => {
  it('finds the fixtures in api.md', () => expect(fixtures.cases.length).toBeGreaterThanOrEqual(7));

  for (const testCase of fixtures.cases) {
    for (const [order, flip] of [['as given', (x) => x], ['reversed', (x) => [...x].reverse()]]) {
      it(`${testCase.name} (${order})`, () => {
        const movements = flip(testCase.movements);
        const counts = flip(testCase.counts);
        expect(stockOnHand(movements, counts)).toBe(testCase.expect.stockOnHand);
        for (const want of testCase.expect.counts) {
          const count = testCase.counts.find((c) => c.id === want.id);
          expect(countResult(count, movements, counts)).toEqual({ expectedUnits: want.expectedUnits, differenceUnits: want.differenceUnits, needsCheck: want.needsCheck });
        }
      });
    }
  }
});

describe('stockStatus', () => {
  const product = { unitScale: 1, lowStockLevelUnits: null, lowStockWarnings: true, isHidden: false };
  it('below zero, out, low and ok', () => {
    expect(stockStatus(-1, product, 3)).toBe('belowZero');
    expect(stockStatus(0, product, 3)).toBe('out');
    expect(stockStatus(3, product, 3)).toBe('low');
    expect(stockStatus(4, product, 3)).toBe('ok');
  });
  it('compares yard products in whole yards (the business threshold 3 = 6 half yards)', () => {
    expect(stockStatus(6, { ...product, unitScale: 2 }, 3)).toBe('low');
    expect(stockStatus(7, { ...product, unitScale: 2 }, 3)).toBe('ok');
  });
  it('uses the product\'s own level, and never shows hidden or warnings-off products as low', () => {
    expect(stockStatus(5, { ...product, lowStockLevelUnits: 5 }, 3)).toBe('low');
    expect(stockStatus(2, { ...product, isHidden: true }, 3)).toBe('ok');
    expect(stockStatus(2, { ...product, lowStockWarnings: false }, 3)).toBe('ok');
  });
});
