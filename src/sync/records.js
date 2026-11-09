// What counts as a real record, and what the phone shows while changes are still on their way.
//
// Each record made on the phone carries a `syncState`:
//   'pending'      in the outbox, not sent yet ("Not sent yet")
//   'sent'         the server has it (the normal case, no mark)
//   'notAccepted'  the server REJECTED it: it never counts in totals or lists as if it were saved,
//                  and it's listed in "Needs attention" with the reason.
// Editable settings are a bit different: an unsent settings change lives only in the outbox, and the
// screen shows the server's settings with those pending changes laid on top. A rejected change leaves
// the outbox (for "Needs attention"), so it simply stops being laid on top: the server's value shows.

export const SYNC_STATE = { PENDING: 'pending', SENT: 'sent', NOT_ACCEPTED: 'notAccepted' };

// True if a record should count in totals and lists. Records from the server have no syncState: they count.
export function countsAsSaved(record) {
  return record?.syncState !== SYNC_STATE.NOT_ACCEPTED;
}

// The settings to show: the server's copy (from pulls) with every still-unsent settings.update laid on
// top, oldest first. `outboxOps` are the outbox rows in order. Pure, so it's easy to test.
export function settingsWithPendingChanges(serverSettings, outboxOps) {
  let shown = { ...(serverSettings ?? {}) };
  for (const op of outboxOps) {
    if (op.type === 'settings.update') shown = { ...shown, ...op.payload.changes };
  }
  return shown;
}
