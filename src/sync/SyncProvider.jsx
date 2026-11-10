// Runs the sync scheduler for the open business while the app is in use, and tells the screens what
// happened (docs/app-plan.md "Sync engine", "Special answers").
//
// - It only runs once the person is through sign-in and the PIN (step APP), and this phone has its key
//   for the business. Without a key it says so (`needsRegistration`), so a screen can ask for the password.
// - 401 → "Sign in again" (AuthProvider), every local record kept.
// - ACCESS_REMOVED / DEVICE_REVOKED → that business's data was wiped (engine.js), and the wipe itself saved
//   the notice with how many unsent records went with it (db/wipe.js); we refresh who the person is.
// - BUSINESS_CLOSING → syncing stops for that business. An unknown row type → "Update the app".

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../auth/AuthProvider.jsx';
import { STEP } from '../auth/nextStep.js';
import { getBusinessDb } from '../db/businessDb.js';
import { startScheduler } from './scheduler.js';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { step, openBusiness, sessionEnded, markSessionEnded, refreshMe } = useAuth();
  const businessId = openBusiness?.id ?? null;
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const scheduler = useRef(null);

  // Whether this phone has its key for the open business (live: becomes true right after registering).
  const hasDevice = useLiveQuery(
    async () => (businessId ? Boolean(await getBusinessDb(businessId).meta.get('device')) : false),
    [businessId],
  );

  // Reacts to how a sync ended.
  const handleOutcome = useCallback(
    async (result) => {
      setOutcome(result);
      if (result.kind === 'signIn') markSessionEnded(true);
      // The wipe already saved its notice (db/wipe.js); refresh who the person is and which businesses remain.
      if (result.kind === 'wiped') refreshMe();
    },
    [markSessionEnded, refreshMe],
  );

  // Start syncing when everything is ready; stop when the business changes, the app locks, or the session
  // ends. Signing in again makes `active` true again, which starts a fresh scheduler that syncs at once:
  // without this, records saved while signed out would wait for the next save or "Sync now".
  const active = step === STEP.APP && Boolean(businessId) && hasDevice === true && !sessionEnded;
  useEffect(() => {
    if (!active) return undefined;
    setOutcome(null);
    const s = startScheduler({ businessId, onOutcome: handleOutcome, onRunning: setRunning });
    scheduler.current = s;
    return () => {
      s.stop();
      scheduler.current = null;
      setRunning(false);
    };
  }, [active, businessId, handleOutcome]);

  const value = useMemo(
    () => ({
      businessId,
      running,
      outcome,
      needsRegistration: step === STEP.APP && Boolean(businessId) && hasDevice === false,
      updateApp: outcome?.kind === 'updateApp',
      closing: outcome?.kind === 'closing',
      syncNow: () => scheduler.current?.syncNow(),
    }),
    [businessId, running, outcome, step, hasDevice],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// The sync state for the current screen.
export function useSync() {
  const value = useContext(SyncContext);
  if (!value) throw new Error('useSync must be used inside <SyncProvider>');
  return value;
}
