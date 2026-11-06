// The ONE shared API helper: the only code in the app that talks to the server (docs/app-plan.md "Same-site API").
//
// Every request:
// - goes to /api on the app's own address (Vite's proxy locally, vercel.json's rewrite in production);
//   the server's own address is never used, so cookies stay same-site and the CSP can stay strict;
// - sends the session cookie (credentials: "include") and X-Requested-With: XMLHttpRequest (CSRF check);
// - sends X-Business for business endpoints, so the server knows which of the person's businesses it's for;
// - turns the body into a string ONCE: from FE3 that same string is hashed for the signature and sent;
// - gives up after 60 seconds (the free server can take that long to wake), which counts as temporary.
//
// It never throws for server or network problems: it always returns a result object, and the caller
// decides what to do with errors.js. That way a failed request can't crash a screen mid-sale.

const DEFAULT_TIMEOUT_MS = 60_000;

// The last failed request's code and reference, for the Help message (FE13). Kept in memory only:
// no names, amounts or numbers are ever stored here.
let lastFailure = null;

// Returns { code, status, requestId, at } of the last failed request, or null.
export function getLastFailure() {
  return lastFailure;
}

// Sends one request and returns one of:
//   { kind: 'ok',      status, data, requestId }
//   { kind: 'error',   status, code, message, fields, data, requestId, retryAfterSeconds }
//        (code is null when the answer wasn't in the error format, e.g. a hosting 502 while waking up)
//   { kind: 'network', reason: 'timeout' | 'offline' }
export async function apiRequest(path, { method = 'GET', body, businessId, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (typeof path !== 'string' || !path.startsWith('/api/')) {
    // A full address here would bypass the same-site rule; refuse loudly so it's caught while building.
    throw new Error(`apiRequest only calls relative /api/ paths, got ${path}`);
  }

  const headers = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };
  let bodyText;
  if (body !== undefined) {
    bodyText = JSON.stringify(body); // once: this exact string is what gets sent (and signed, from FE3)
    headers['Content-Type'] = 'application/json';
  }
  if (businessId) headers['X-Business'] = businessId;
  // FE3 adds the device signature headers here (X-Device-Id, X-Signed-At, X-Nonce, X-Signature),
  // signed over bodyText, and reads X-Server-Time from every answer to keep the clock offset.

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(path, { method, headers, body: bodyText, credentials: 'include', signal: controller.signal });
  } catch {
    // fetch only throws when there was no answer at all: no network, or our timeout.
    return { kind: 'network', reason: controller.signal.aborted ? 'timeout' : 'offline' };
  } finally {
    clearTimeout(timer);
  }

  const requestId = response.headers.get('X-Request-Id');
  const data = await readJson(response);

  if (response.ok) return { kind: 'ok', status: response.status, data, requestId };

  const error = data && typeof data.error === 'object' ? data.error : null;
  const retryAfter = Number(response.headers.get('Retry-After'));
  const result = {
    kind: 'error',
    status: response.status,
    code: error?.code ?? null,
    message: error?.message ?? null,
    fields: error?.fields ?? null,
    data,
    requestId,
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
  };
  lastFailure = { code: result.code ?? `HTTP_${result.status}`, status: result.status, requestId, at: new Date().toISOString() };
  return result;
}

// Reads a JSON body if there is one; returns null for an empty or non-JSON body
// (for example a hosting error page while the server wakes up).
async function readJson(response) {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
