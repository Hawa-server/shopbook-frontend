// Tests for the sync engine against a fake server that follows api.md, on a fake IndexedDB
// (fake-indexeddb, development only). They check the promises that protect a trader's records:
// nothing is lost or doubled, rejections are kept and never count, cursors only move with their page.
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { businessDbName, getBusinessDb, getMeta, setMeta } from '../db/businessDb.js';
import { saveWithOperation } from './outbox.js';
import { syncBusiness } from './engine.js';
import { applyPage } from './pull.js';
import { backoffMs } from './backoff.js';
import { SYNC_STATE, countsAsSaved, settingsWithPendingChanges } from './records.js';

// A tiny server with api.md's push/pull behaviour for settings.update.
function fakeServer() {
  const server = {
    applied: new Map(), // opId → result (so a repeat is a "duplicate")
    settings: { businessId: 'b', businessName: 'Ama Fabrics', receiptNote: null, version: 1 },
    rows: [], // { type, serverSeq, data }
    seq: 0,
    next: [], // canned answers for the next requests: an answer object, or 'lostAnswer'
    calls: [],
  };
  const addRow = (type, data) => server.rows.push({ type, serverSeq: ++server.seq, data });
  addRow('settings', { ...server.settings });
  addRow('location', { id: 'l1', name: 'Ama Fabrics', type: 'shop' });

  function handlePush(body) {
    return body.operations.map((op) => {
      if (server.applied.has(op.opId)) return { opId: op.opId, status: 'duplicate', result: server.applied.get(op.opId) };
      if (op.payload.changes.paymentMethods?.includes('bitcoin')) {
        return { opId: op.opId, status: 'rejected', error: { code: 'VALIDATION_FAILED', message: 'Not offered', fields: { paymentMethods: 'x' } } };
      }
      if (op.payload.changes.receiptNote === 'CONFLICT') return { opId: op.opId, status: 'rejected', error: { code: 'OP_ID_CONFLICT', message: 'x' } };
      server.settings = { ...server.settings, ...op.payload.changes, version: server.settings.version + 1 };
      addRow('settings', { ...server.settings });
      const result = { version: server.settings.version };
      server.applied.set(op.opId, result);
      return { opId: op.opId, status: 'saved', result };
    });
  }

  server.request = async (path, options = {}) => {
    server.calls.push(path);
    const canned = server.next.shift();
    if (canned && canned !== 'lostAnswer') return canned;
    let data;
    if (path === '/api/sync/push') data = { results: handlePush(options.body), serverTime: new Date().toISOString() };
    else if (path.startsWith('/api/sync/pull')) {
      const since = Number(new URLSearchParams(path.split('?')[1]).get('since'));
      const rows = server.rows.filter((r) => r.serverSeq > since);
      data = { rows, nextCursor: server.seq, hasMore: false, watermark: server.seq };
    }
    if (canned === 'lostAnswer') return { kind: 'network', reason: 'timeout' }; // the server DID the work
    return { kind: 'ok', status: 200, data };
  };
  return server;
}

// A fresh business database with a registered device (no real key needed: the fake server doesn't check).
async function freshBusiness() {
  const businessId = crypto.randomUUID();
  const db = getBusinessDb(businessId);
  await setMeta(db, 'device', { deviceId: crypto.randomUUID(), deviceCode: 'K7M', privateKey: null });
  return { businessId, db };
}

// The owner changes the receipt note on the phone (as the dev screen and, later, Business settings do).
const changeSettings = (db, changes, baseVersion = 1) => saveWithOperation(db, { type: 'settings.update', payload: { baseVersion, changes } });

describe('saving with an operation', () => {
  it('writes the operation, and the screen shows the change before it is sent', async () => {
    const { db } = await freshBusiness();
    await changeSettings(db, { receiptNote: 'Returns within 7 days' });
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].opId).toMatch(/^[0-9a-f-]{36}$/);
    expect(settingsWithPendingChanges({ receiptNote: null, version: 1 }, ops).receiptNote).toBe('Returns within 7 days');
  });

  it('saves nothing at all if writing the record fails (one transaction)', async () => {
    const { db } = await freshBusiness();
    await expect(
      saveWithOperation(db, { type: 'x', payload: {} }, { tables: ['customers'], write: async () => { await db.customers.add({ id: 'c1' }); throw new Error('boom'); } }),
    ).rejects.toThrow('boom');
    expect(await db.outbox.count()).toBe(0);
    expect(await db.customers.count()).toBe(0);
  });
});

describe('a full sync', () => {
  it('sends, removes the operation, and pulls the server rows with the cursor', async () => {
    const server = fakeServer();
    const { businessId, db } = await freshBusiness();
    await changeSettings(db, { receiptNote: 'Hello' });
    const outcome = await syncBusiness(businessId, { request: server.request });
    expect(outcome).toMatchObject({ kind: 'ok', sent: 1, rejected: 0 });
    expect(await db.outbox.count()).toBe(0);
    expect(await db.settings.get('business')).toMatchObject({ receiptNote: 'Hello', version: 2 });
    expect(await db.locations.get('l1')).toMatchObject({ name: 'Ama Fabrics' });
    expect(await getMeta(db, 'cursor')).toBe(server.seq);
    expect(await getMeta(db, 'lastSyncAt')).toBeTruthy();
  });

  it('a lost answer is sent again and comes back "duplicate": applied once, nothing lost', async () => {
    const server = fakeServer();
    const { businessId, db } = await freshBusiness();
    await changeSettings(db, { receiptNote: 'Once only' });
    server.next.push('lostAnswer');
    expect((await syncBusiness(businessId, { request: server.request })).kind).toBe('temporary');
    const kept = await db.outbox.toArray();
    expect(kept).toHaveLength(1); // still waiting, same opId
    expect(kept[0].attempts).toBe(1);
    expect(server.settings.version).toBe(2); // the server had applied it

    expect((await syncBusiness(businessId, { request: server.request })).kind).toBe('ok');
    expect(await db.outbox.count()).toBe(0);
    expect(server.settings.version).toBe(2); // NOT applied a second time
    expect(server.applied.size).toBe(1);
  });

  it('a 5xx is never a rejection: everything stays in the outbox', async () => {
    const server = fakeServer();
    const { businessId, db } = await freshBusiness();
    await changeSettings(db, { receiptNote: 'x' });
    server.next.push({ kind: 'error', status: 503, code: null });
    expect((await syncBusiness(businessId, { request: server.request })).kind).toBe('temporary');
    expect(await db.outbox.count()).toBe(1);
    expect(await db.needsAttention.count()).toBe(0);
  });

  it('a rejected change goes to "Needs attention" as Not accepted, and the screen shows the server value again', async () => {
    const server = fakeServer();
    const { businessId, db } = await freshBusiness();
    await changeSettings(db, { paymentMethods: ['bitcoin'] });
    const outcome = await syncBusiness(businessId, { request: server.request });
    expect(outcome).toMatchObject({ kind: 'ok', rejected: 1 });
    expect(await db.outbox.count()).toBe(0);
    const [item] = await db.needsAttention.toArray();
    expect(item).toMatchObject({ code: 'VALIDATION_FAILED', state: SYNC_STATE.NOT_ACCEPTED, appProblem: false, seenAt: null });
    const shown = settingsWithPendingChanges(await db.settings.get('business'), await db.outbox.toArray());
    expect(shown.paymentMethods).toBeUndefined(); // the rejected change is NOT shown as if saved
  });

  it('a rejected record is marked Not accepted and never counts as saved', async () => {
    const server = fakeServer();
    const { businessId, db } = await freshBusiness();
    // A local record tied to its operation (how sales and the rest will work from FE5 on).
    await saveWithOperation(
      db,
      { type: 'settings.update', payload: { baseVersion: 1, changes: { paymentMethods: ['bitcoin'] } }, ref: { table: 'expenses', id: 'e1' } },
      { tables: ['expenses'], write: () => db.expenses.add({ id: 'e1', amountMinor: 500, syncState: SYNC_STATE.PENDING }) },
    );
    await syncBusiness(businessId, { request: server.request });
    const record = await db.expenses.get('e1');
    expect(record.syncState).toBe(SYNC_STATE.NOT_ACCEPTED);
    expect(countsAsSaved(record)).toBe(false);
    expect(countsAsSaved({ id: 'from-server' })).toBe(true);
  });

  it('OP_ID_CONFLICT is marked "App problem: tell the developer"', async () => {
    const server = fakeServer();
    const { businessId, db } = await freshBusiness();
    await changeSettings(db, { receiptNote: 'CONFLICT' });
    await syncBusiness(businessId, { request: server.request });
    expect((await db.needsAttention.toArray())[0]).toMatchObject({ code: 'OP_ID_CONFLICT', appProblem: true });
  });

  it('an ended session keeps every record (401)', async () => {
    const server = fakeServer();
    const { businessId, db } = await freshBusiness();
    await changeSettings(db, { receiptNote: 'kept' });
    server.next.push({ kind: 'error', status: 401, code: 'NOT_SIGNED_IN' });
    expect((await syncBusiness(businessId, { request: server.request })).kind).toBe('signIn');
    expect(await db.outbox.count()).toBe(1);
  });

  it('ACCESS_REMOVED wipes only this business, and says how many unsent records went with it', async () => {
    const server = fakeServer();
    const { businessId, db } = await freshBusiness();
    const other = await freshBusiness();
    await changeSettings(db, { receiptNote: 'a' });
    await changeSettings(db, { receiptNote: 'b' });
    await changeSettings(other.db, { receiptNote: 'other shop' });
    server.next.push({ kind: 'error', status: 403, code: 'ACCESS_REMOVED' });
    expect(await syncBusiness(businessId, { request: server.request })).toMatchObject({ kind: 'wiped', code: 'ACCESS_REMOVED', unsent: 2 });
    expect(await Dexie.exists(businessDbName(businessId))).toBe(false);
    expect(await other.db.outbox.count()).toBe(1); // the other business is untouched
  });

  it('a phone without a key asks to be registered, and keeps its outbox', async () => {
    const server = fakeServer();
    const businessId = crypto.randomUUID();
    const db = getBusinessDb(businessId);
    await changeSettings(db, { receiptNote: 'x' });
    expect((await syncBusiness(businessId, { request: server.request })).kind).toBe('register');
    server.next.push({ kind: 'error', status: 403, code: 'DEVICE_NOT_REGISTERED' });
    await setMeta(db, 'device', { deviceId: 'd', privateKey: null });
    expect((await syncBusiness(businessId, { request: server.request })).kind).toBe('register');
    expect(await db.outbox.count()).toBe(1);
  });
});

describe('pull pages and the cursor', () => {
  it('a page with no rows still moves the cursor', async () => {
    const { db } = await freshBusiness();
    await applyPage(db, { rows: [], nextCursor: 57 });
    expect(await getMeta(db, 'cursor')).toBe(57);
  });

  it('an unknown row type stops the pull WITHOUT moving the cursor, but pushing still happens', async () => {
    const server = fakeServer();
    const { businessId, db } = await freshBusiness();
    server.rows.push({ type: 'product', serverSeq: ++server.seq, data: { id: 'p1' } });
    await changeSettings(db, { receiptNote: 'still sent' });
    const outcome = await syncBusiness(businessId, { request: server.request });
    expect(outcome).toMatchObject({ kind: 'updateApp', type: 'product', sent: 1 });
    expect(await db.outbox.count()).toBe(0);
    expect((await getMeta(db, 'cursor')) ?? 0).toBe(0);
    expect(await db.settings.get('business')).toMatchObject({ receiptNote: 'still sent' }); // from the push result
  });

  it('a failure on page 2 keeps page 1 and its cursor, and fetches page 2 again next time', async () => {
    const { businessId, db } = await freshBusiness();
    const page1 = { kind: 'ok', data: { rows: [{ type: 'location', serverSeq: 3, data: { id: 'l1', name: 'A', type: 'shop' } }], nextCursor: 3, hasMore: true } };
    const answers = [page1, { kind: 'network', reason: 'offline' }];
    const request = async (path) => (path === '/api/sync/push' ? { kind: 'ok', data: { results: [] } } : answers.shift());
    expect((await syncBusiness(businessId, { request })).kind).toBe('temporary');
    expect(await getMeta(db, 'cursor')).toBe(3);
    expect(await db.locations.count()).toBe(1);
  });
});

describe('back-off', () => {
  it('waits 30 s, 1 min, 2 min, 5 min, then 5 min, with up to 20% jitter', () => {
    expect([1, 2, 3, 4, 9].map((n) => backoffMs(n, 0))).toEqual([30_000, 60_000, 120_000, 300_000, 300_000]);
    expect(backoffMs(1, 0.999)).toBeLessThanOrEqual(36_000);
    expect(backoffMs(1, 0.5)).toBe(33_000);
  });
});
