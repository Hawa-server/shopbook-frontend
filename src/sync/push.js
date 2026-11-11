// Push: sending the outbox to the server (api.md "POST /api/sync/push").
//
// Up to 200 operations, oldest first. The server answers ONE result per operation:
//   saved / duplicate → the server has it: store the result on the local record and remove the operation
//                       from the outbox, in one local transaction ("duplicate" = a retry whose first answer
//                       was lost; nothing was applied twice);
//   rejected          → refused for good: move it to "Needs attention" (marked "Not accepted") and mark its
//                       local record so it never counts as saved; never dropped silently.
// If the whole request fails (no network, timeout, 5xx…), NOTHING is changed: every operation stays in the
// outbox with its opId and is sent again later.

import { SYNC_STATE } from './records.js';
import { STOCK_TABLES, levelKey, recomputeLevels } from './stockLevels.js';

export const PUSH_BATCH = 200;

// Keeps the server's warnings for a saved product or size (shown on its page until seen), or clears old ones.
async function keepWarnings(db, id, entity, warnings) {
  if (warnings?.length) await db.syncWarnings.put({ id, entity, warnings, at: new Date().toISOString() });
  else await db.syncWarnings.delete(id);
}

// For each operation type: how a "saved"/"duplicate" result updates the phone's own copy, so the screen
// shows what the server now holds without waiting for the next pull (and nothing vanishes if that pull fails).
const APPLY_SAVED = {
  // settings.update → the server's settings now include these changes, at the returned version.
  'settings.update': async (db, op, result) => {
    const current = (await db.settings.get('business')) ?? { key: 'business' };
    await db.settings.put({ ...current, ...op.payload.changes, version: result?.version ?? current.version, key: 'business' });
  },
  // product.upsert → the product now has these fields, at the returned version (the pull brings the full row).
  'product.upsert': async (db, op, result) => {
    const { productId, fields } = op.payload;
    const current = (await db.products.get(productId)) ?? { id: productId, isHidden: false, lowStockWarnings: true, lowStockLevelUnits: null, unitLabel: null, wholesaleMinor: null };
    const next = { ...current, ...fields, id: productId, version: result?.version ?? current.version };
    if (fields.unit) next.unitScale = fields.unit === 'yard' ? 2 : 1;
    await db.products.put(next);
    await keepWarnings(db, productId, 'product', result?.warnings);
  },
  // size.upsert → the same for a size.
  'size.upsert': async (db, op, result) => {
    const { sizeId, productId, fields } = op.payload;
    const current = (await db.sizes.get(sizeId)) ?? { id: sizeId, productId, isActive: true, retailMinor: null, wholesaleMinor: null };
    await db.sizes.put({ ...current, ...fields, id: sizeId, productId, version: result?.version ?? current.version });
    await keepWarnings(db, sizeId, 'size', result?.warnings);
  },
};

// Tables a push result may touch (all included in each result's transaction).
const RESULT_TABLES = ['outbox', 'needsAttention', 'settings', 'products', 'sizes', 'syncWarnings', ...STOCK_TABLES];

// Applies one per-operation result in ONE local transaction.
export async function applyPushResult(db, op, result) {
  const tables = new Set(RESULT_TABLES);
  if (op.ref?.table) tables.add(op.ref.table);
  await db.transaction('rw', [...tables].map((t) => db.table(t)), async () => {
    if (result.status === 'saved' || result.status === 'duplicate') {
      await APPLY_SAVED[op.type]?.(db, op, result.result);
      if (op.ref) await db.table(op.ref.table).update(op.ref.id, { syncState: SYNC_STATE.SENT });
    } else {
      await db.needsAttention.put({
        opId: op.opId,
        type: op.type,
        payload: op.payload,
        ref: op.ref ?? null,
        createdAt: op.createdAt,
        code: result.error?.code ?? 'UNKNOWN',
        message: result.error?.message ?? null,
        fields: result.error?.fields ?? null,
        appProblem: result.error?.code === 'OP_ID_CONFLICT', // "App problem: tell the developer"
        state: SYNC_STATE.NOT_ACCEPTED,
        rejectedAt: new Date().toISOString(),
        seenAt: null,
      });
      if (op.ref) await db.table(op.ref.table).update(op.ref.id, { syncState: SYNC_STATE.NOT_ACCEPTED });
      // A refused stock record no longer counts: its size's stock is worked out again without it.
      if (op.type === 'stock.create') await recomputeLevels(db, [levelKey(op.payload.productId, op.payload.sizeId)]);
    }
    await db.outbox.delete(op.seq);
  });
}

// Sends one batch. Returns { kind: 'ok', sent, rejected, more } or { kind: 'failed', result }.
// `request` is the shared API helper (or a fake in tests); `device` = { deviceId, privateKey }.
export async function pushOnce(db, { businessId, device, request }) {
  const ops = await db.outbox.orderBy('seq').limit(PUSH_BATCH).toArray();
  if (ops.length === 0) return { kind: 'ok', sent: 0, rejected: 0, more: false };

  const result = await request('/api/sync/push', {
    method: 'POST',
    businessId,
    device,
    body: {
      deviceId: device.deviceId,
      operations: ops.map((op) => ({ opId: op.opId, type: op.type, recordedOnline: op.recordedOnline, payload: op.payload })),
    },
  });

  if (result.kind !== 'ok') {
    // Keep every operation; note the attempt so the status screen can show it.
    const note = result.code ?? (result.kind === 'network' ? result.reason : `HTTP_${result.status}`);
    await db.outbox.where('seq').anyOf(ops.map((o) => o.seq)).modify((op) => {
      op.attempts = (op.attempts ?? 0) + 1;
      op.lastError = note;
    });
    return { kind: 'failed', result };
  }

  // Match results to operations by opId (they come in the same order). An operation without a result
  // stays in the outbox and is simply sent again next time.
  const byOpId = new Map((result.data?.results ?? []).map((r) => [r.opId, r]));
  let sent = 0;
  let rejected = 0;
  for (const op of ops) {
    const r = byOpId.get(op.opId);
    if (!r || !['saved', 'duplicate', 'rejected'].includes(r.status)) continue;
    await applyPushResult(db, op, r);
    if (r.status === 'rejected') rejected += 1;
    else sent += 1;
  }
  return { kind: 'ok', sent, rejected, more: ops.length === PUSH_BATCH };
}
