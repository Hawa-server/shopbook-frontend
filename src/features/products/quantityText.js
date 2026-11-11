// Words for a quantity with its unit (api.md stock rule 6: units ÷ unitScale, with the unit): "12 pairs",
// "1 pair", "2.5 yards", "4 bundles" (a shop's own unit word stays as typed). Uses t() so it's in the
// person's language; the number itself comes from lib/quantity.js (half yards without floating point).

import { formatQuantityNumber } from '../../lib/quantity.js';

// `units` in the product's units; `product` gives unit, unitLabel and unitScale; `t` the translate function.
export function quantityText(units, product, t) {
  const scale = product.unitScale ?? 1;
  const qty = formatQuantityNumber(units, scale);
  if (product.unit === 'custom') return t('unit.custom', { qty, label: product.unitLabel ?? '' });
  return t(`unit.${product.unit ?? 'piece'}`, { count: units === scale ? 1 : 2, qty });
}
