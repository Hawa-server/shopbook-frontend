// Waking the sleeping server, and knowing whether it's up (docs/app-plan.md "The free server wakes slowly").
//
// The free server sleeps after a quiet spell and can take up to a minute to wake. So when the app opens
// we call GET /api/health in the background: that starts the wake-up, and the screens show
// "Connecting…" meanwhile. Nothing waits for it: records are saved on the phone, so selling never stops.

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from './client.js';

// Asks the server for its health. Returns one of:
//   { state: 'ok',          version }   server and database working (200)
//   { state: 'down',        version }   server running but its database isn't (503 with the health body)
//   { state: 'unreachable' }            no answer, timeout, or a hosting error: temporary
//   { state: 'offline' }                the phone has no network at all
export async function checkHealth() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { state: 'offline' };
  const result = await apiRequest('/api/health');
  const body = result.data; // present for 200, and for the 503 "database down" answer
  if (body && (body.status === 'ok' || body.status === 'down')) {
    return { state: result.kind === 'ok' && body.status === 'ok' ? 'ok' : 'down', version: body.version ?? null };
  }
  if (result.kind === 'network' && result.reason === 'offline') return { state: 'offline' };
  return { state: 'unreachable' };
}

const HealthContext = createContext(null);

// Wraps the app: checks health once when the app opens and again whenever the phone comes back online,
// and shares the answer with every screen (one check, not one per screen).
export function HealthProvider({ children }) {
  const [health, setHealth] = useState({ state: 'connecting', version: null });

  const recheck = useCallback(async () => {
    setHealth((h) => ({ ...h, state: 'connecting' }));
    setHealth(await checkHealth());
  }, []);

  useEffect(() => {
    recheck();
    window.addEventListener('online', recheck);
    return () => window.removeEventListener('online', recheck);
  }, [recheck]);

  // If the server didn't answer (still waking, or a hosting hiccup), try again in a minute.
  // This is temporary by definition, so it never shows as an error.
  useEffect(() => {
    if (health.state !== 'unreachable') return undefined;
    const timer = setTimeout(recheck, 60_000);
    return () => clearTimeout(timer);
  }, [health.state, recheck]);

  const value = useMemo(() => ({ ...health, recheck }), [health, recheck]);
  return createElement(HealthContext.Provider, { value }, children);
}

// Returns { state, version, recheck }; state is 'connecting' while a check is running.
export function useHealth() {
  const value = useContext(HealthContext);
  if (!value) throw new Error('useHealth must be used inside <HealthProvider>');
  return value;
}
