// One sync of one business: push the outbox, then pull what changed (docs/app-plan.md "Sync engine").
//
// It returns an OUTCOME and never throws for network or server problems, so the scheduler can decide
// when to try again and the screens can explain what happened:
//   ok              everything sent and fetched
//   temporary       no network, timeout, 5xx…: nothing lost, try again later (with back-off)
//   wait            rate limited: try again after `retryAfterSeconds`
//   signIn          the session ended: keep everything, ask to sign in again (401)
//   wiped           ACCESS_REMOVED / DEVICE_REVOKED: this business's local data was deleted (`unsent` says
//                   how many unsent operations went with it, for the notice)
//   closing         BUSINESS_CLOSING: stop syncing this business
//   register        this phone has no valid key for the business: register it (password) and try again
//   updateApp       a pulled row type this app doesn't know: pushing still works, pulling waits for an update
//   error           something the app did wrong (reported in Help); try again later

import { ACTION, whatToDo } from '../api/errors.js';
import { getBusinessDb, getMeta, setMeta } from '../db/businessDb.js';
import { wipeBusiness } from '../db/wipe.js';
import { pushOnce } from './push.js';
import { pullAll } from './pull.js';

const MAX_PUSH_ROUNDS = 25; // 25 × 200 operations in one sync is far more than a day's work

// Turns a failed request into an outcome (and wipes the business when the server says so).
async function outcomeOf(result, businessId) {
  const action = whatToDo(result);
  if (action === ACTION.TEMPORARY) return { kind: 'temporary', result };
  if (action === ACTION.WAIT) return { kind: 'wait', retryAfterSeconds: result.retryAfterSeconds ?? 60 };
  if (action === ACTION.SIGN_IN) return { kind: 'signIn' };
  if (action === ACTION.WIPE_BUSINESS) {
    // The wipe saves the notice the person sees (with the unsent count) at the moment it deletes.
    const { unsent } = await wipeBusiness(businessId, { notice: result.code === 'DEVICE_REVOKED' ? 'deviceRevoked' : 'accessRemoved' });
    return { kind: 'wiped', code: result.code, unsent };
  }
  if (action === ACTION.BUSINESS_CLOSING) return { kind: 'closing' };
  if (action === ACTION.REGISTER_DEVICE) return { kind: 'register', code: result.code };
  return { kind: 'error', result };
}

// Runs one full sync for `businessId`. `request` is the shared API helper (a fake in tests).
export async function syncBusiness(businessId, { request }) {
  const db = getBusinessDb(businessId);
  const device = await getMeta(db, 'device');
  if (!device) return { kind: 'register', code: 'NO_DEVICE' };
  const ctx = { businessId, device, request };

  // 1. Push, in batches, until the outbox is empty or something stops it.
  let sent = 0;
  let rejected = 0;
  for (let round = 0; round < MAX_PUSH_ROUNDS; round++) {
    const push = await pushOnce(db, ctx);
    if (push.kind === 'failed') return outcomeOf(push.result, businessId);
    sent += push.sent;
    rejected += push.rejected;
    if (!push.more) break;
  }

  // 2. Pull every page.
  const pull = await pullAll(db, ctx);
  if (pull.kind === 'failed') return outcomeOf(pull.result, businessId);
  if (pull.kind === 'unknownRow') return { kind: 'updateApp', type: pull.type, sent, rejected };

  // 3. Remember when it last worked.
  await setMeta(db, 'lastSyncAt', new Date().toISOString());
  return { kind: 'ok', sent, rejected, pulled: pull.rows };
}
