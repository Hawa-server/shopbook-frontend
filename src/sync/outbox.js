// Saving a record together with its outbox operation, in ONE local transaction
// (docs/app-plan.md "Saving something (atomic local save)").
//
// Every change a person makes is (1) written to the phone's database and (2) queued as an operation for
// the server, and both happen in the same Dexie transaction: if anything fails, neither is saved, so a
// record can never exist on the phone without being queued for sending, or the other way round.
// The operation's opId is made HERE, once, and never changes, even across retries: it's what lets the
// server recognise a repeat and answer "duplicate" instead of applying it twice.
// Saving never waits for the network.

// Who to tell that there's something new to send (the scheduler sets this; tests leave it empty).
let onSaved = null;
export function setOutboxListener(listener) {
  onSaved = listener;
}

// Saves several operations (and, optionally, local record changes) in ONE transaction, in this order in the
// outbox: for example a product, then its sizes, then their starting stock (api.md: the product's
// product.upsert first, its size.upsert after it, the opening stock.create right after them). Either all of
// them are saved, or none.
//   ops:    [{ type, payload, ref }] (ref = { table, id } of the local record an operation is about, or null)
//   write:  an optional async function (tx) => {...} writing the local records in the same transaction
//   tables: the tables `write` touches
// Returns the new operations' opIds, in order.
export async function saveWithOperations(db, ops, { write, tables = [] } = {}) {
  const now = new Date().toISOString();
  const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : false;
  const rows = ops.map(({ type, payload, ref = null }) => ({
    opId: crypto.randomUUID(), type, payload, ref, recordedOnline: online, createdAt: now, attempts: 0, lastError: null, nextTryAt: 0,
  }));
  await db.transaction('rw', [db.outbox, ...tables.map((t) => db.table(t))], async (tx) => {
    if (write) await write(tx);
    for (const row of rows) await db.outbox.add(row); // one by one, so `seq` keeps their order
  });
  onSaved?.(db);
  return rows.map((r) => r.opId);
}

// Saves one operation (and optional local records) atomically. Returns its opId.
export async function saveWithOperation(db, op, options = {}) {
  const [opId] = await saveWithOperations(db, [op], options);
  return opId;
}
