// What the app does with each kind of failed request: one place, straight from docs/api.md "Errors".
//
// Screens and the sync engine call whatToDo(result) and act on the answer; they never look at the
// server's `message` (its wording can change, and the app shows its own translated words).
// The most important rule: anything temporary (no network, timeout, 5xx, TRY_AGAIN) is NEVER treated
// as a rejection, so a slow or sleeping server can never make the app drop a trader's record.

// The possible answers, as plain strings:
export const ACTION = {
  OK: 'ok', //                   it worked
  TEMPORARY: 'temporary', //     keep everything, retry later with back-off, show "Connecting…"
  WAIT: 'wait', //               rate limited: wait (Retry-After) and retry
  SIGN_IN: 'signIn', //          session ended: keep ALL local data and the outbox, ask to sign in when online
  WIPE_BUSINESS: 'wipeBusiness', // access removed / phone revoked: wipe that business's database only
  BUSINESS_CLOSING: 'businessClosing', // stop syncing this business; show the closing screen
  ACCEPT_TERMS: 'acceptTerms', // show the terms, accept, repeat the request
  CHANGE_PASSWORD: 'changePassword', // "Choose your own password", then repeat
  FIX_INPUT: 'fixInput', //      show the messages under the fields; don't retry unchanged
  NOT_ALLOWED: 'notAllowed', //  "Your role can't do this"; don't retry
  SHOW: 'show', //               show this code's own message (WRONG_LOGIN, PHONE_TAKEN…); the screen decides
  APP_BUG: 'appBug', //          the app sent something wrong; don't retry; report via Help
  REGISTER_DEVICE: 'registerDevice', // this phone has no valid key for the business: register again (password), keep the outbox
};

// Codes that mean the app itself made a mistake (docs/api.md says "App bug" or "shouldn't happen").
const APP_BUG_CODES = new Set([
  'CSRF_HEADER_MISSING',
  'ORIGIN_NOT_ALLOWED',
  'ORIGIN_REQUIRED',
  'INVALID_JSON',
  'INVALID_REQUEST',
  'BUSINESS_REQUIRED',
  'PAYLOAD_TOO_LARGE',
]);

// Codes that wipe one business's local data (api.md: ACCESS_REMOVED from BE3, DEVICE_REVOKED from BE5).
const WIPE_CODES = new Set(['ACCESS_REMOVED', 'DEVICE_REVOKED']);

// Decides what to do with a result from apiRequest().
export function whatToDo(result) {
  if (result.kind === 'ok') return ACTION.OK;
  if (result.kind === 'network') return ACTION.TEMPORARY;

  const { status, code } = result;
  if (code === 'TRY_AGAIN' || code === 'INTERNAL_ERROR') return ACTION.TEMPORARY;
  if (code === null) {
    // Not in the error format: a hosting error (e.g. 502/503/504 while the server wakes) → temporary.
    // A 429 without the format is still "wait"; anything else unexpected is treated as temporary too,
    // because guessing "rejected" could lose a record and retrying never can.
    return status === 429 ? ACTION.WAIT : ACTION.TEMPORARY;
  }
  if (status >= 500 && code !== 'EMAIL_NOT_SENT') return ACTION.TEMPORARY;
  if (code === 'RATE_LIMITED') return ACTION.WAIT;
  if (code === 'NOT_SIGNED_IN') return ACTION.SIGN_IN;
  if (WIPE_CODES.has(code)) return ACTION.WIPE_BUSINESS;
  if (code === 'BUSINESS_CLOSING') return ACTION.BUSINESS_CLOSING;
  // BE5: not registered (storage cleared, reinstalled) or the key no longer matches → register again.
  if (code === 'DEVICE_NOT_REGISTERED' || code === 'DEVICE_SIGNATURE_INVALID') return ACTION.REGISTER_DEVICE;
  // Still wrong after the helper's one re-signed retry: treat as temporary and try again later.
  if (code === 'CLOCK_OUT_OF_RANGE' || code === 'NONCE_REUSED') return ACTION.TEMPORARY;
  if (code === 'TERMS_REQUIRED') return ACTION.ACCEPT_TERMS;
  if (code === 'PASSWORD_CHANGE_REQUIRED') return ACTION.CHANGE_PASSWORD;
  if (code === 'VALIDATION_FAILED' || code === 'WRONG_PASSWORD') return ACTION.FIX_INPUT;
  if (code === 'FORBIDDEN') return ACTION.NOT_ALLOWED;
  if (APP_BUG_CODES.has(code)) return ACTION.APP_BUG;
  return ACTION.SHOW;
}
