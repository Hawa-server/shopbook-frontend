// The opening screen: the logo pulsing gently, with the app's name under it, shown while the app starts.
//
// It continues the identical splash written into index.html (shown before any JavaScript runs), so the
// person sees one steady screen from tapping the icon until the app is ready. Its look must match the
// `.boot-splash` styles in index.html. The pulse stops when the phone asks for reduced motion.
// It is only a picture: about 3 s on the first opening after installing or updating, about 1 s otherwise (see useSplash).

import { useEffect, useState } from 'react';
import { useT } from '../i18n/t.js';

// How long the splash stays at least, counted from when the page started loading:
// - the FIRST opening after installing or updating: 3 seconds, so people see the brand properly;
// - every other opening: 1 second, just enough not to flicker past. Traders often open the app with a
//   customer waiting, and backlog AC30 asks for the app to open in under 3 seconds in daily use.
// On a slow phone the splash lasts exactly as long as loading does, never longer than both.
export const SPLASH_FIRST_MS = 3000;
export const SPLASH_MIN_MS = 1000;

// The version from package.json (vite.config.js `define`), so an update counts as a "first opening".
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const SEEN_KEY = 'splash-seen-version';

// True if this version's long splash hasn't been shown on this phone yet. Uses the browser's small
// key-value storage because it must be read instantly, before the database opens. It holds only the
// version number; if storage isn't available, we simply show the short splash.
function isFirstOpening() {
  try {
    return localStorage.getItem(SEEN_KEY) !== APP_VERSION;
  } catch {
    return false;
  }
}

// Remembers that this version's long splash has been shown.
function rememberSeen() {
  try {
    localStorage.setItem(SEEN_KEY, APP_VERSION);
  } catch {
    // storage unavailable: nothing to remember, the short splash will be used next time anyway
  }
}

// True while the splash should still show: until `ready`, and until the minimum time has passed since
// the page began loading (time already spent loading isn't added again). Once it has finished it never
// comes back (it's only for opening the app).
export function useSplash(ready) {
  const [minimum] = useState(() => (isFirstOpening() ? SPLASH_FIRST_MS : SPLASH_MIN_MS));
  const [minimumPassed, setMinimumPassed] = useState(() => performance.now() >= minimum);
  useEffect(() => {
    if (minimumPassed) return undefined;
    const timer = setTimeout(() => setMinimumPassed(true), minimum - performance.now());
    return () => clearTimeout(timer);
  }, [minimumPassed, minimum]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (ready && minimumPassed) {
      rememberSeen();
      setDone(true);
    }
  }, [ready, minimumPassed]);
  return !done;
}

export default function Splash() {
  const { t } = useT();
  return (
    <div role="status" aria-busy="true" className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ground text-ink">
      <img src="/icons/logo-mark.svg" alt="" width="112" height="112" className="size-28 animate-[splash-pulse_1.6s_ease-in-out_infinite]" />
      <p className="m-0 text-money-lg font-extrabold">{t('app.name')}</p>
      <span className="sr-only">{t('splash.loading')}</span>
    </div>
  );
}
