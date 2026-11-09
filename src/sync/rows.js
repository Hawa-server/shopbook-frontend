// Where each kind of pulled row is stored on the phone (api.md "Pull rows").
//
// A row with an ID the phone already has REPLACES its local copy: the server is in charge. Only the
// fields the server sent are stored (it already removed what this person's role may not see).
// A row type this app doesn't know (a server newer than the app) is NOT skipped: the pull stops without
// moving its cursor, so those rows are fetched again once the app is updated (pull.js).

export class UnknownRowTypeError extends Error {
  constructor(type) {
    super(`Unknown pull row type "${type}"`);
    this.rowType = type;
  }
}

// row type → how to store it. Each gets the database and the row's `data`.
const STORE = {
  settings: (db, data) => db.settings.put({ ...data, key: 'business' }),
  location: (db, data) => db.locations.put(data),
  membership: (db, data) => db.memberships.put(data),
  device: (db, data) => db.devices.put(data),
};

// The tables any pulled row may write to (the pull transaction must include them all).
export const PULL_TABLES = ['settings', 'locations', 'memberships', 'devices', 'meta'];

// Throws UnknownRowTypeError if any row in the page has a type this app can't store.
export function checkRowTypes(rows) {
  for (const row of rows) if (!STORE[row.type]) throw new UnknownRowTypeError(row.type);
}

// Stores one row (inside the pull's transaction).
export function storeRow(db, row) {
  return STORE[row.type](db, { ...row.data, serverSeq: row.serverSeq });
}
