// Takes a one-time token (password reset, email confirm) out of the address bar.
//
// Email links open /reset-password?token=… and /confirm-email?token=…. The token is like a key: it must
// not stay in the address (history, screenshots, shared links) and is never stored or logged (api.md).
// So we read it and immediately replace the address with the same page without the query, BEFORE
// doing anything else. The token then lives only in the screen's memory until it's sent.

// `win` is the window (passed in so tests can use a fake one). Returns the token, or null if none.
export function takeTokenFromAddress(win = window) {
  const params = new URLSearchParams(win.location.search);
  const token = params.get('token');
  if (win.location.search) {
    win.history.replaceState(null, '', win.location.pathname);
  }
  return token && token.trim() !== '' ? token : null;
}

// The token captured when the app started, kept in memory only (never stored), for the one screen
// that needs it. Email links always open a fresh page, so capturing once at start-up is enough, and it
// happens before React runs (React may run a screen's code twice while developing).
let captured = null;

// Called once from main.jsx before the app renders: on /reset-password or /confirm-email, takes the
// token out of the address straight away.
export function captureTokenAtStartup(win = window) {
  if (win.location.pathname === '/reset-password' || win.location.pathname === '/confirm-email') {
    captured = { path: win.location.pathname, token: takeTokenFromAddress(win) };
  }
}

// The captured token if it belongs to the screen for `path`, or null.
export function getCapturedToken(path) {
  if (captured?.path !== path) return null;
  return captured.token;
}

// Forgets the token once it has been used.
export function forgetCapturedToken() {
  captured = null;
}
