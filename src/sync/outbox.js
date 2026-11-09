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

// Saves an operation and, optionally, local record changes, atomically.
//   db:      the business's database
//   op:      { type, payload, ref } (ref = { table, id } of the local record this operation is about,
//            or null for a change that only lives in the outbox, like settings.update)
//   write:   an optional async function (tx) => {...} that writes the record(s) in the same transaction
//   tables:  the tables `write` touches (Dexie needs them listed to include them in the transaction)
// Returns the new operation's opId.
export async function saveWithOperation(db, { type, payload, ref = null }, { write, tables = [] } = {}) {
  const opId = crypto.randomUUID();
  const now = new Date().toISOString();
  const operation = {
    opId,
    type,
    payload,
    ref,
    recordedOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : false,
    createdAt: now,
    attempts: 0,
    lastError: null,
    nextTryAt: 0, // send at the next sync
  };
  await db.transaction('rw', [db.outbox, ...tables.map((t) => db.table(t))], async (tx) => {
    if (write) await write(tx);
    await db.outbox.add(operation);
  });
  onSaved?.(db);
  return opId;
}
