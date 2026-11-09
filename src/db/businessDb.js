// One local database per business: `shopbook-<businessId>` (docs/app-plan.md "Dexie tables").
//
// Every business gets its own copy of these tables, including its own outbox, sync cursor, device key
// and code, and receipt counter, so the real shop and the practice shop can never mix.
// FE1 only declares the schema. Opening the open business's database, the outbox and the sync engine
// arrive in FE3; the record shapes follow docs/api.md as each server task lists them.
//
// Schema rules (CLAUDE.md "Dexie versions"):
// - every change is a NEW version with an .upgrade(); old versions are never edited;
// - an upgrade NEVER clears `outbox` or `needsAttention` (they hold work not yet on the server).
//
// Index notes: the first name in each string is the primary key; the others are indexes for lookups.
// Only fields we search or sort by are indexed; every other field is stored all the same.

import Dexie from 'dexie';

// The database name for a business. One place, so a wipe can never delete the wrong one.
export function businessDbName(businessId) {
  if (!/^[0-9a-f-]{36}$/.test(businessId ?? '')) {
    throw new Error('businessDbName needs a business UUID');
  }
  return `shopbook-${businessId}`;
}

// Version 1 (FE1): every table from the app plan.
export const BUSINESS_SCHEMA_V1 = {
  // Products and prices (cost fields arrive only on the owner's phone)
  products: 'id, name, type, serverSeq',
  sizes: 'id, productId',
  priceVersions: 'key', // key = `${productId}:${sizeId ?? ''}` → version the phone holds
  // Stock
  stockMovements: 'id, productId, sizeId, recordedAt',
  stockCounts: 'id, productId, sizeId, recordedAt',
  stockLevels: 'key, productId', // key = `${productId}:${sizeId ?? ''}`; kept ready so lists open fast
  // Customers and money owed
  customers: 'id, name, phone',
  repayments: 'id, customerId, businessDate',
  openingDebts: 'id, customerId',
  // Sales and corrections (permanent: never edited or deleted)
  sales: 'id, receiptNumber, businessDate, customerId, recordedAt',
  saleItems: 'id, saleId, productId',
  salePayments: 'id, saleId',
  corrections: 'id, saleId, receiptNumber, businessDate',
  correctionItems: 'id, correctionId, originalSaleItemId',
  // Expenses and closing the day
  expenses: 'id, businessDate, categoryId',
  expenseCategories: 'id, name',
  dayCloses: 'id, businessDate',
  // Team and phones (owner)
  memberships: 'id, userId',
  devices: 'id',
  // Business settings
  settings: 'key',
  // Sync: operations waiting to be sent, oldest first. `seq` is auto-increasing so the order is exact
  // even when two operations are saved in the same millisecond; `opId` is unique.
  outbox: '++seq, &opId, nextTryAt',
  // Operations the server rejected, kept until the person marks them as seen
  needsAttention: '&opId, rejectedAt',
  // This business on this phone: sync cursor, last sync, device ID, code and key, receipt counter, my role
  meta: 'key',
};

// Version 2 (FE3): adds `locations` for the `location` rows the server sends from BE5 (api.md
// "Pull rows"). Only a new table, so no .upgrade() is needed and every existing row stays as it is.
// (Dexie: a later version lists only the tables it adds or changes.)
export const BUSINESS_SCHEMA_V2 = {
  locations: 'id',
};

// Creates (does not open) the Dexie database for one business with every version declared.
export function createBusinessDb(businessId) {
  const db = new Dexie(businessDbName(businessId));
  db.version(1).stores(BUSINESS_SCHEMA_V1);
  db.version(2).stores(BUSINESS_SCHEMA_V2);
  return db;
}

// The open databases, one per business, so the whole app shares one connection to each.
const openDbs = new Map();

// Returns the database for a business, opening it the first time it's asked for.
export function getBusinessDb(businessId) {
  if (!openDbs.has(businessId)) openDbs.set(businessId, createBusinessDb(businessId));
  return openDbs.get(businessId);
}

// Closes a business's database (when switching business or before deleting it).
export function closeBusinessDb(businessId) {
  const db = openDbs.get(businessId);
  if (db) {
    db.close();
    openDbs.delete(businessId);
  }
}

// Reads one value from a business's `meta` table (device, cursor, last sync…), or undefined.
export async function getMeta(db, key) {
  return (await db.meta.get(key))?.value;
}

// Saves one value in a business's `meta` table.
export function setMeta(db, key, value) {
  return db.meta.put({ key, value });
}
