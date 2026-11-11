// Tests for the product logic: unsent changes laid over the server's copy, search (and its speed with
// 2,000 products), duplicate names, size ranges, custom sizes, form checks and price warnings.
import { describe, expect, it } from 'vitest';
import {
  activeSizesOf, changedFields, checkProductForm, findDuplicateName, parseCustomSizes, priceWarnings,
  productsWithPending, searchProducts, sellingPrice, sizesFromRange, sizesWithPending,
} from './catalog.js';

const product = (over = {}) => ({ id: 'p1', name: 'Black sandal', type: 'shoes', unit: 'pair', unitScale: 1, retailMinor: 12000, wholesaleMinor: 10000, isHidden: false, version: 2, ...over });
const op = (type, payload) => ({ type, payload });

describe('productsWithPending', () => {
  it('shows a product added offline as pending, version 1', () => {
    const out = productsWithPending([], [op('product.upsert', { productId: 'n1', baseVersion: null, fields: { name: 'Lace', type: 'fabric', unit: 'yard', retailMinor: 3500 } })]);
    expect(out).toEqual([expect.objectContaining({ id: 'n1', name: 'Lace', unitScale: 2, version: 1, pending: true, isHidden: false })]);
  });
  it('lays edits over the server copy in order, counting versions', () => {
    const out = productsWithPending([product()], [
      op('product.upsert', { productId: 'p1', baseVersion: 2, fields: { retailMinor: 13000 } }),
      op('product.upsert', { productId: 'p1', baseVersion: 3, fields: { isHidden: true } }),
    ]);
    expect(out[0]).toMatchObject({ retailMinor: 13000, isHidden: true, version: 4, pending: true, wholesaleMinor: 10000 });
  });
  it('ignores other operations, and leaves the server copy untouched', () => {
    const server = [product()];
    productsWithPending(server, [op('product.upsert', { productId: 'p1', baseVersion: 2, fields: { name: 'X' } })]);
    expect(server[0].name).toBe('Black sandal');
    expect(productsWithPending(server, [op('settings.update', {})])[0].pending).toBeUndefined();
  });
});

describe('sizes', () => {
  const sizes = [
    { id: 's2', productId: 'p1', label: 'M', sortOrder: 1, isActive: true, retailMinor: null },
    { id: 's1', productId: 'p1', label: 'S', sortOrder: 0, isActive: true, retailMinor: null },
    { id: 's3', productId: 'p1', label: 'XL', sortOrder: 3, isActive: false, retailMinor: null },
    { id: 's4', productId: 'p1', label: 'L', sortOrder: 2, isActive: true, retailMinor: 14000 },
  ];
  it('shows active sizes in their natural order, never alphabetical (AC12)', () => {
    expect(activeSizesOf(sizes, 'p1').map((s) => s.label)).toEqual(['S', 'M', 'L']);
  });
  it('lays unsent size changes on top', () => {
    const out = sizesWithPending(sizes, [op('size.upsert', { sizeId: 's1', productId: 'p1', baseVersion: 1, fields: { isActive: false } })]);
    expect(activeSizesOf(out, 'p1').map((s) => s.label)).toEqual(['M', 'L']);
  });
  it('uses a size\'s own price, else the product\'s; wholesale falls back to retail (AC19)', () => {
    const p = product({ wholesaleMinor: null });
    expect(sellingPrice(p, sizes[3])).toBe(14000);
    expect(sellingPrice(p, sizes[0])).toBe(12000);
    expect(sellingPrice(p, sizes[0], 'wholesale')).toBe(12000);
    expect(sellingPrice(product(), null, 'wholesale')).toBe(10000);
  });
  it('makes every size between the first and last of a range (AC7)', () => {
    const range = { sizes: ['30', '31', '32', '33', '34'] };
    expect(sizesFromRange(range, '31', '33')).toEqual(['31', '32', '33']);
    expect(sizesFromRange(range, '33', '31')).toEqual([]);
  });
  it('reads custom sizes typed with commas (AC8)', () => {
    expect(parseCustomSizes(' 1Y, 2Y ,, 3y , 3Y,  Big  one ')).toEqual(['1Y', '2Y', '3y', 'Big one']);
  });
});

describe('search', () => {
  const list = [product(), product({ id: 'p2', name: 'Brown Sandal  Wide' }), product({ id: 'p3', name: 'Lace', type: 'fabric' }), product({ id: 'p4', name: 'Old sandal', isHidden: true })];
  it('matches part of the name, ignoring capitals and spaces (AC22)', () => {
    expect(searchProducts(list, { query: ' SAND ' }).map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(searchProducts(list, { query: 'sandal wide' }).map((p) => p.id)).toEqual(['p2']);
  });
  it('filters by type (AC24) and keeps hidden products apart (AC27, AC28)', () => {
    expect(searchProducts(list, { type: 'fabric' }).map((p) => p.id)).toEqual(['p3']);
    expect(searchProducts(list, { showHidden: true }).map((p) => p.id)).toEqual(['p4']);
  });
  it('searches 2,000 products in well under half a second (AC23; checked on a real phone too)', () => {
    const many = Array.from({ length: 2000 }, (_, i) => product({ id: `x${i}`, name: `Product ${i} ${i % 7 === 0 ? 'sandal' : 'shirt'}` }));
    const start = performance.now();
    for (const q of ['s', 'sa', 'san', 'sand', 'sanda', 'sandal']) searchProducts(many, { query: q });
    expect((performance.now() - start) / 6).toBeLessThan(50);
  });
  it('finds a duplicate name, hidden products included (AC4)', () => {
    expect(findDuplicateName(list, '  black   SANDAL')?.id).toBe('p1');
    expect(findDuplicateName(list, 'old sandal')?.id).toBe('p4');
    expect(findDuplicateName(list, 'black sandal', 'p1')).toBeNull();
  });
});

describe('checkProductForm', () => {
  const good = { name: 'Black sandal', type: 'shoes', unit: 'pair', retailMinor: 12000, wholesaleMinor: null, costMinor: 8000, sizes: [] };
  const check = (over, ctx = {}) => checkProductForm({ ...good, ...over }, { isOwner: true, isNew: true, minorUnits: 2, ...ctx });
  it('accepts a good product', () => expect(check({})).toEqual({}));
  it('needs a name of 1–80 characters (AC2, AC3)', () => {
    expect(check({ name: '   ' }).name).toBe('product.error.nameEmpty');
    expect(check({ name: 'x'.repeat(81) }).name).toBe('product.error.nameLong');
  });
  it('sells fabric by the piece or the yard only, with no sizes (AC13)', () => {
    expect(check({ type: 'fabric', unit: 'pair' }).unit).toBe('product.error.fabricUnit');
    expect(check({ type: 'fabric', unit: 'yard', sizes: ['S'] }).sizes).toBe('product.error.fabricSizes');
  });
  it('needs a name for the shop\'s own unit (AC14)', () => {
    expect(check({ type: 'other', unit: 'custom', unitLabel: ' ' }).unitLabel).toBe('product.error.unitLabel');
    expect(check({ type: 'other', unit: 'custom', unitLabel: 'bundle' })).toEqual({});
  });
  it('needs a retail price, in range (AC16, AC17)', () => {
    expect(check({ retailMinor: null }).retailMinor).toBe('product.error.retailRequired');
    expect(check({ retailMinor: 100000001 }).retailMinor).toBe('product.error.priceRange');
    expect(check({ retailMinor: 100000000 })).toEqual({});
  });
  it('needs the cost when the owner adds, not when a manager adds or anyone edits (AC17)', () => {
    expect(check({ costMinor: null }).costMinor).toBe('product.error.costRequired');
    expect(check({ costMinor: null }, { isOwner: false })).toEqual({});
    expect(check({ costMinor: null }, { isNew: false })).toEqual({});
  });
  it('allows at most 60 sizes', () => {
    expect(check({ sizes: Array.from({ length: 61 }, (_, i) => `${i}`) }).sizes).toBe('product.error.tooManySizes');
  });
});

describe('priceWarnings and changedFields', () => {
  it('warns when wholesale is above retail, and (owner only) when a price is below cost (AC18)', () => {
    expect(priceWarnings({ retailMinor: 100, wholesaleMinor: 120, costMinor: 110 }, { isOwner: true })).toEqual(['WHOLESALE_ABOVE_RETAIL', 'BELOW_COST']);
    expect(priceWarnings({ retailMinor: 100, wholesaleMinor: 120, costMinor: 110 }, { isOwner: false })).toEqual(['WHOLESALE_ABOVE_RETAIL']);
    expect(priceWarnings({ retailMinor: 100, wholesaleMinor: 90, costMinor: 80 }, { isOwner: true })).toEqual([]);
  });
  it('sends only the fields that changed', () => {
    expect(changedFields(product(), { name: 'Black sandal', retailMinor: 13000, wholesaleMinor: undefined })).toEqual({ retailMinor: 13000 });
  });
});
