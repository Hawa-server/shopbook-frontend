// Reading the open business's products for the screens (docs/app-plan.md: screens never touch Dexie
// directly; they read through their feature's functions). Everything comes from the phone's own database,
// live, so it works offline and updates the moment a save or a pull changes it.

import { useLiveQuery } from 'dexie-react-hooks';
import { getBusinessDb } from '../../db/businessDb.js';
import { productsWithPending, sizesWithPending } from './catalog.js';

// The whole catalogue: products and sizes (with unsent changes laid on top), stock levels, the business's
// low-stock threshold, the shop (location) for stock records, and warnings from the server.
// Returns undefined while loading.
export function useCatalog(businessId) {
  return useLiveQuery(async () => {
    if (!businessId) return null;
    const db = getBusinessDb(businessId);
    const [products, sizes, outbox, levels, settings, locations, warnings, movements] = await Promise.all([
      db.products.toArray(),
      db.sizes.toArray(),
      db.outbox.orderBy('seq').toArray(),
      db.stockLevels.toArray(),
      db.settings.get('business'),
      db.locations.toArray(),
      db.syncWarnings.toArray(),
      db.stockMovements.count(),
    ]);
    const catalogOps = outbox.filter((op) => op.type === 'product.upsert' || op.type === 'size.upsert');
    return {
      products: productsWithPending(products, catalogOps),
      sizes: sizesWithPending(sizes, catalogOps),
      levels: new Map(levels.map((l) => [l.key, l.units])),
      threshold: settings?.lowStockThreshold ?? 3,
      locationId: locations.find((l) => l.type === 'shop')?.id ?? locations[0]?.id ?? null,
      warnings: new Map(warnings.map((w) => [w.id, w])),
      hasStockRows: movements > 0,
    };
  }, [businessId]);
}

// Whether a product has any stock record (a movement or a count), so switching between yards and other
// units can be stopped on the phone before the server refuses it (UNIT_LOCKED).
export async function productHasStockRecords(businessId, productId) {
  const db = getBusinessDb(businessId);
  const [movements, counts] = await Promise.all([
    db.stockMovements.where('productId').equals(productId).count(),
    db.stockCounts.where('productId').equals(productId).count(),
  ]);
  return movements + counts > 0;
}

// Forgets a warning from the server once the person has seen it.
export function dismissWarning(businessId, id) {
  return getBusinessDb(businessId).syncWarnings.delete(id);
}
