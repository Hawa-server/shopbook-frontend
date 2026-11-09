// WHEN the open business syncs (docs/app-plan.md "Sync engine"): on opening, every 3 minutes, right after
// a save, and when the phone reconnects. No React here.
//
// - Only ONE sync at a time, across every tab of the app on the phone: a Web Lock (navigator.locks) named
//   after the business. A tab that can't get it skips this round; the tab holding it is already syncing.
//   (Inside one tab, a save during a sync just asks for one more round when it finishes.)
// - After a temporary failure it waits 30 s, 1 min, 2 min, 5 min… with up to 20% jitter (backoff.js).
//   When the network comes back it tries again after a small random delay (0–5 s), so a whole market's
//   phones don't all wake the free server in the same instant.
// - After signIn, wiped, closing or register it stops: those need the person (or a sign-in) first.

import { apiRequest } from '../api/client.js';
import { backoffMs } from './backoff.js';
import { syncBusiness } from './engine.js';
import { setOutboxListener } from './outbox.js';

const EVERY_MS = 3 * 60 * 1000;
const STOPPING_OUTCOMES = new Set(['signIn', 'wiped', 'closing', 'register']);

// Runs `fn` while holding the business's sync lock. Returns null if another tab holds it.
async function withSyncLock(businessId, fn, fallbackBusy) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(`kanbuk-sync-${businessId}`, { ifAvailable: true }, (lock) => (lock ? fn() : null));
  }
  return fallbackBusy() ? null : fn(); // very old browsers: one-tab protection only
}

// Starts syncing one business. `onOutcome(outcome)` and `onRunning(true|false)` report to the screens.
// Returns { syncNow, stop }.
export function startScheduler({ businessId, onOutcome, onRunning, request = apiRequest }) {
  let timer = null;
  let failures = 0;
  let notBefore = 0;
  let stopped = false;
  let running = false;
  let again = false;

  const schedule = (ms) => {
    clearTimeout(timer);
    if (!stopped) timer = setTimeout(() => run('timer'), Math.max(0, ms));
  };

  // One round. `reason` 'manual' (Sync now) and 'saved' don't wait for the back-off's end... except a
  // rate limit, which the server asked us to respect.
  async function run(reason) {
    if (stopped) return;
    if (running) {
      again = true; // a save during a sync: one more round right after
      return;
    }
    if (Date.now() < notBefore && reason === 'timer') return schedule(notBefore - Date.now());
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return schedule(EVERY_MS); // 'online' will wake us

    const outcome = await withSyncLock(
      businessId,
      async () => {
        running = true;
        onRunning?.(true);
        try {
          return await syncBusiness(businessId, { request });
        } finally {
          running = false;
          onRunning?.(false);
        }
      },
      () => running,
    );
    if (stopped) return;
    if (outcome === null) return schedule(EVERY_MS); // another tab is syncing this business

    if (outcome.kind === 'temporary' || outcome.kind === 'error') {
      failures += 1;
      const wait = backoffMs(failures);
      notBefore = Date.now() + wait;
      schedule(wait);
    } else if (outcome.kind === 'wait') {
      const wait = Math.round(outcome.retryAfterSeconds * 1000 * (1 + 0.2 * Math.random()));
      notBefore = Date.now() + wait;
      schedule(wait);
    } else {
      failures = 0;
      notBefore = 0;
      if (STOPPING_OUTCOMES.has(outcome.kind)) clearTimeout(timer);
      else schedule(EVERY_MS);
    }
    onOutcome?.(outcome);

    if (again && !STOPPING_OUTCOMES.has(outcome.kind)) {
      again = false;
      run('saved');
    }
  }

  const onOnline = () => {
    failures = 0;
    notBefore = 0;
    schedule(Math.random() * 5000);
  };
  window.addEventListener('online', onOnline);
  setOutboxListener(() => run('saved'));
  run('start');

  return {
    syncNow: () => run('manual'),
    stop() {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('online', onOnline);
      setOutboxListener(null);
    },
  };
}
