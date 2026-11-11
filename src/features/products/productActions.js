// Saving products, sizes and starting stock (api.md product.upsert, size.upsert, stock.create).
//
// Every save writes its operations to the outbox, and any stock record to the phone's database, in ONE
// transaction (sync/outbox.js): all or nothing, never waiting for the network. Products and sizes are
// editable records: an edit sends only the fields that changed, with the version the phone had
// (`baseVersion`). Stock movements are permanent records: written once with "Not sent yet" and never changed
// (if the server refuses one, it's marked "Not accepted" and stops counting).

import { getBusinessDb } from '../../db/businessDb.js';
import { saveWithOperations } from '../../sync/outbox.js';
import { SYNC_STATE } from '../../sync/records.js';
import { STOCK_TABLES, levelKey, recomputeLevels } from '../../sync/stockLevels.js';

export class NoShopError extends Error {}

// A stock movement saved on the phone (opening or restock) and its operation.
function stockMovement({ productId, sizeId, units, type, locationId, userId }) {
  if (!locationId) throw new NoShopError('No shop (location) on this phone yet');
  const movementId = crypto.randomUUID();
  const recordedAt = new Date().toISOString();
  const row = { id: movementId, locationId, productId, sizeId, quantityUnits: units, type, recordedAt, receivedAt: null, recordedBy: userId, syncState: SYNC_STATE.PENDING };
  const op = {
    type: 'stock.create',
    payload: { movementId, type, locationId, productId, sizeId, quantityUnits: units, recordedAt },
    ref: { table: 'stockMovements', id: movementId },
  };
  return { row, op };
}

// Saves the operations, plus any stock rows (and their stock levels) in the same transaction.
async function save(businessId, ops, stockRows = []) {
  const db = getBusinessDb(businessId);
  await saveWithOperations(db, ops, {
    tables: stockRows.length ? STOCK_TABLES : [],
    write: stockRows.length
      ? async () => {
          for (const row of stockRows) await db.stockMovements.add(row);
          await recomputeLevels(db, stockRows.map((r) => levelKey(r.productId, r.sizeId)));
        }
      : undefined,
  });
}

// Adds a product with its sizes and starting stock (AC1, AC5, AC7–AC9). `fields` as api.md product.upsert;
// `sizeLabels` in their order; `opening`: { [sizeLabel or '']: units } for each box with a number (an empty
// box sends nothing). Returns the new productId.
export async function addProduct(businessId, { fields, sizeLabels, opening, locationId, userId }) {
  const productId = crypto.randomUUID();
  const ops = [{ type: 'product.upsert', payload: { productId, baseVersion: null, fields } }];
  const stock = [];
  const sizeIds = sizeLabels.map((label, index) => {
    const sizeId = crypto.randomUUID();
    ops.push({ type: 'size.upsert', payload: { sizeId, productId, baseVersion: null, fields: { label, sortOrder: index } } });
    return sizeId;
  });
  if (sizeLabels.length === 0) {
    if (opening['']) stock.push(stockMovement({ productId, sizeId: null, units: opening[''], type: 'opening', locationId, userId }));
  } else {
    sizeLabels.forEach((label, index) => {
      if (opening[label]) stock.push(stockMovement({ productId, sizeId: sizeIds[index], units: opening[label], type: 'opening', locationId, userId }));
    });
  }
  await save(businessId, [...ops, ...stock.map((s) => s.op)], stock.map((s) => s.row));
  return productId;
}

// Edits a product (AC26): only the changed fields, with the version the phone had.
export function editProduct(businessId, product, fields) {
  if (Object.keys(fields).length === 0) return Promise.resolve();
  return save(businessId, [{ type: 'product.upsert', payload: { productId: product.id, baseVersion: product.version, fields } }]);
}

// Hides or shows a product again (AC27, AC28). Products are never deleted (AC29).
export function setProductHidden(businessId, product, isHidden) {
  return editProduct(businessId, product, { isHidden });
}

// Adds a size to an existing product (AC10), after its current sizes, with any quantity entered as a restock.
export async function addSize(businessId, { product, label, sortOrder, units, locationId, userId }) {
  const sizeId = crypto.randomUUID();
  const ops = [{ type: 'size.upsert', payload: { sizeId, productId: product.id, baseVersion: null, fields: { label, sortOrder } } }];
  const stock = units ? [stockMovement({ productId: product.id, sizeId, units, type: 'restock', locationId, userId })] : [];
  await save(businessId, [...ops, ...stock.map((s) => s.op)], stock.map((s) => s.row));
}

// Changes a size's own prices (AC19): `fields` { retailMinor, wholesaleMinor, costMinor (owner) }; null = use the product's.
export function editSize(businessId, size, fields) {
  if (Object.keys(fields).length === 0) return Promise.resolve();
  return save(businessId, [{ type: 'size.upsert', payload: { sizeId: size.id, productId: size.productId, baseVersion: size.version, fields } }]);
}

// Removes a size from sale (AC11). The screen only offers it when the size's stock is 0; it's kept for history.
export function removeSize(businessId, size) {
  return editSize(businessId, size, { isActive: false });
}
