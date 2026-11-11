// Products and sizes as the phone shows them, as plain functions (no React, no Dexie) so they're easy to test.
//
// - The phone's copy of products and sizes comes from the server (pulls). Unsent changes (product.upsert and
//   size.upsert still in the outbox) are laid on top, in order, exactly like settings (sync/records.js): a
//   product added offline shows straight away as "Not sent yet"; if the server refuses it, it leaves the
//   outbox for "Needs attention" and simply stops being shown, so it never counts as saved.
// - Checks mirror api.md's rules, so mistakes are caught at the stall, not later: names 1–80 characters,
//   prices from 1 minor unit to 1,000,000 major units, at most 60 sizes, labels 1–20 characters.

export const PRODUCT_TYPES = ['clothing', 'shoes', 'fabric', 'other'];
export const UNITS = ['piece', 'pair', 'set', 'dozen', 'yard', 'custom'];
export const FABRIC_UNITS = ['piece', 'yard'];
export const MAX_SIZES = 60;
const MAX_PRICE_MAJOR = 1_000_000;

// A name as the server compares it: spaces at the ends removed, doubled spaces made single.
export const tidyName = (name) => String(name ?? '').trim().replace(/\s+/g, ' ');
// A name for searching and duplicate checks: tidied and lower case.
export const nameKey = (name) => tidyName(name).toLowerCase();

// The server's unitScale for a unit: 2 for yards (half yards), 1 for everything else.
export const unitScaleOf = (unit) => (unit === 'yard' ? 2 : 1);

// Products to show: the server's copy with every unsent product.upsert laid on top, oldest first.
// Each pending product gets `pending: true` and the version the server will have once it's applied
// (used as the next baseVersion, so a second offline edit names the right version).
export function productsWithPending(serverProducts, outboxOps) {
  const byId = new Map(serverProducts.map((p) => [p.id, { ...p }]));
  for (const op of outboxOps) {
    if (op.type !== 'product.upsert') continue;
    const { productId, fields } = op.payload;
    const current = byId.get(productId) ?? { id: productId, version: 0, isHidden: false, lowStockWarnings: true, lowStockLevelUnits: null, unitLabel: null, wholesaleMinor: null };
    const next = { ...current, ...fields, version: (current.version ?? 0) + 1, pending: true };
    if (fields.unit) next.unitScale = unitScaleOf(fields.unit);
    if (fields.unit && fields.unit !== 'custom') next.unitLabel = null;
    byId.set(productId, next);
  }
  return [...byId.values()];
}

// Sizes to show: the same idea for size.upsert.
export function sizesWithPending(serverSizes, outboxOps) {
  const byId = new Map(serverSizes.map((s) => [s.id, { ...s }]));
  for (const op of outboxOps) {
    if (op.type !== 'size.upsert') continue;
    const { sizeId, productId, fields } = op.payload;
    const current = byId.get(sizeId) ?? { id: sizeId, productId, version: 0, isActive: true, retailMinor: null, wholesaleMinor: null };
    byId.set(sizeId, { ...current, ...fields, productId, version: (current.version ?? 0) + 1, pending: true });
  }
  return [...byId.values()];
}

// A product's sizes for selling: active ones, in their natural order (sortOrder), never alphabetical.
export function activeSizesOf(sizes, productId) {
  return sizes.filter((s) => s.productId === productId && s.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder);
}

// The price a size (or the product) really sells at: its own price, else the product's; wholesale without
// any wholesale price uses the retail price (api.md "size" row).
export function sellingPrice(product, size, kind = 'retail') {
  const retail = size?.retailMinor ?? product.retailMinor;
  if (kind === 'retail') return retail;
  return size?.wholesaleMinor ?? product.wholesaleMinor ?? retail;
}

// Search as you type (AC22): every word typed must appear in the name, ignoring capitals and extra spaces.
// Hidden products are left out unless asked for; `type` filters by product type (AC24).
export function searchProducts(products, { query = '', type = null, showHidden = false } = {}) {
  const words = nameKey(query).split(' ').filter(Boolean);
  return products
    .filter((p) => (showHidden ? p.isHidden : !p.isHidden))
    .filter((p) => !type || p.type === type)
    .filter((p) => {
      if (words.length === 0) return true;
      const key = nameKey(p.name);
      return words.every((w) => key.includes(w));
    })
    .sort((a, b) => nameKey(a.name).localeCompare(nameKey(b.name)));
}

// Another product (hidden ones too) with the same name, ignoring capitals and spaces (AC4), or null.
export function findDuplicateName(products, name, exceptId = null) {
  const key = nameKey(name);
  return products.find((p) => p.id !== exceptId && nameKey(p.name) === key) ?? null;
}

// The sizes in a ready-made range from `first` to `last` (inclusive, in the range's order).
export function sizesFromRange(range, first, last) {
  const from = range.sizes.indexOf(first);
  const to = range.sizes.indexOf(last);
  if (from < 0 || to < 0 || to < from) return [];
  return range.sizes.slice(from, to + 1);
}

// Sizes typed by the person, separated by commas ("1Y, 2Y, 3Y"): tidied, empty ones dropped, duplicates
// (ignoring capitals) kept once, in the order typed.
export function parseCustomSizes(text) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text ?? '').split(',')) {
    const label = raw.trim().replace(/\s+/g, ' ');
    const key = label.toLowerCase();
    if (label && !seen.has(key)) {
      seen.add(key);
      out.push(label);
    }
  }
  return out;
}

// True when a price in minor units is inside the server's range for a currency with `minorUnits` decimals.
export function priceInRange(minor, minorUnits) {
  return Number.isSafeInteger(minor) && minor >= 1 && minor <= MAX_PRICE_MAJOR * 10 ** minorUnits;
}

// Checks a product form before saving. `form`: { name, type, unit, unitLabel, retailMinor, wholesaleMinor,
// costMinor, sizes: [labels] }, prices already read by parseMoney (null = empty). Returns { field: errorKey }.
// `isOwner`: the cost is required when the owner ADDS a product (AC17); `isNew`: adding, not editing.
export function checkProductForm(form, { isOwner, isNew, minorUnits }) {
  const errors = {};
  const name = tidyName(form.name);
  if (!name) errors.name = 'product.error.nameEmpty';
  else if (name.length > 80) errors.name = 'product.error.nameLong';
  if (!PRODUCT_TYPES.includes(form.type)) errors.type = 'product.error.type';
  const units = form.type === 'fabric' ? FABRIC_UNITS : UNITS;
  if (!units.includes(form.unit)) errors.unit = form.type === 'fabric' ? 'product.error.fabricUnit' : 'product.error.unit';
  if (form.unit === 'custom') {
    const label = String(form.unitLabel ?? '').trim();
    if (!label || label.length > 20) errors.unitLabel = 'product.error.unitLabel';
  }
  if (form.retailMinor == null) errors.retailMinor = 'product.error.retailRequired';
  else if (!priceInRange(form.retailMinor, minorUnits)) errors.retailMinor = 'product.error.priceRange';
  if (form.wholesaleMinor != null && !priceInRange(form.wholesaleMinor, minorUnits)) errors.wholesaleMinor = 'product.error.priceRange';
  if (isOwner) {
    if (form.costMinor == null && isNew) errors.costMinor = 'product.error.costRequired';
    else if (form.costMinor != null && !priceInRange(form.costMinor, minorUnits)) errors.costMinor = 'product.error.priceRange';
  }
  const sizes = form.sizes ?? [];
  if (form.type === 'fabric' && sizes.length > 0) errors.sizes = 'product.error.fabricSizes';
  if (sizes.length > MAX_SIZES) errors.sizes = 'product.error.tooManySizes';
  if (sizes.some((label) => label.length > 20)) errors.sizes = 'product.error.sizeLabel';
  return errors;
}

// Warnings (AC18): shown, never blocking. Below cost is for the owner only (only she has cost prices).
export function priceWarnings({ retailMinor, wholesaleMinor, costMinor }, { isOwner }) {
  const warnings = [];
  if (retailMinor != null && wholesaleMinor != null && wholesaleMinor > retailMinor) warnings.push('WHOLESALE_ABOVE_RETAIL');
  if (isOwner && costMinor != null) {
    const prices = [retailMinor, wholesaleMinor].filter((p) => p != null);
    if (prices.some((p) => p < costMinor)) warnings.push('BELOW_COST');
  }
  return warnings;
}

// The fields that changed between a product as it was and the edited form (so an edit sends only those).
export function changedFields(before, after) {
  const fields = {};
  for (const [key, value] of Object.entries(after)) {
    if (value !== undefined && before[key] !== value) fields[key] = value;
  }
  return fields;
}

// A product's total stock in units (AC24): the sum of its active sizes' levels, or its own level when it
// has no sizes. `levels`: Map from levelKey to units. `activeSizes`: from activeSizesOf.
export function totalUnits(product, activeSizes, levels) {
  if (activeSizes.length === 0) return levels.get(`${product.id}:`) ?? 0;
  return activeSizes.reduce((sum, size) => sum + (levels.get(`${product.id}:${size.id}`) ?? 0), 0);
}
