// The signed-in state for the whole app: who is signed in (from the phone's own copy, so it works
// offline), whether the PIN has been entered, and what must happen next (auth/nextStep.js).
//
// - The PIN is asked when the app opens and after 5 minutes in the background (AC25).
// - When online, `me` is refreshed on opening and on reconnecting. A 401 means the session ended
//   (30 days unused, 90 days old, password changed elsewhere…): we KEEP every local record and only
//   show "Sign in again" (api.md NOT_SIGNED_IN). Selling carries on meanwhile.
// - A language chosen on this phone while offline is sent to the server when it's back online.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { appDb, getAppValue } from '../db/appDb.js';
import { getMe, setMyLanguage, signOut as apiSignOut } from '../api/auth.js';
import { verifyPin } from '../crypto/pin.js';
import { nextStep } from './nextStep.js';
import {
  MAX_WRONG_PINS, checkTakeOver, clearWrongPins, deletePin, forgetSignedIn, recordWrongPin, saveMe,
} from './session.js';

const LOCK_AFTER_MS = 5 * 60 * 1000;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Live copies from the phone's database: screens update the moment these change.
  const kv = useLiveQuery(async () => {
    const rows = await appDb.kv.bulkGet(['me', 'openBusinessId', 'pendingLanguage', 'reference']);
    return { me: rows[0]?.value ?? null, openBusinessId: rows[1]?.value ?? null, pendingLanguage: rows[2]?.value ?? null, reference: rows[3]?.value ?? null };
  }, []);
  const me = kv?.me ?? null;
  const userId = me?.user?.id;
  // `null` = no PIN set (useLiveQuery's `undefined` means "still loading", so the two must differ).
  const pin = useLiveQuery(async () => (userId ? ((await appDb.pins.get(userId)) ?? null) : null), [userId]);

  const [unlocked, setUnlocked] = useState(false); // the PIN must be entered after every opening
  const [sessionEnded, setSessionEnded] = useState(false);
  const [invitationsLater, setInvitationsLater] = useState(false);
  const hiddenAt = useRef(null);

  // Lock again after 5 minutes in the background.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current && Date.now() - hiddenAt.current >= LOCK_AFTER_MS) {
        setUnlocked(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Asks the server who is signed in. Temporary failures are ignored (we keep the phone's copy).
  const refreshMe = useCallback(async () => {
    if (!(await getAppValue('me'))) return;
    const result = await getMe();
    if (result.kind === 'ok') {
      setSessionEnded(false);
      await saveMe(result.data);
    } else if (result.kind === 'error' && result.code === 'NOT_SIGNED_IN') {
      setSessionEnded(true);
    }
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    refreshMe();
    window.addEventListener('online', refreshMe);
    return () => window.removeEventListener('online', refreshMe);
  }, [userId, refreshMe]);

  // Sends a language chosen on this phone once signed in and online; tries again on reconnecting.
  useEffect(() => {
    const pending = kv?.pendingLanguage;
    if (!userId || !pending || sessionEnded) return undefined;
    let cancelled = false;
    const send = async () => {
      const result = await setMyLanguage(pending);
      if (cancelled) return;
      if (result.kind === 'ok') {
        await appDb.kv.delete('pendingLanguage');
        await saveMe(result.data);
      } else if (result.kind === 'error' && result.code === 'VALIDATION_FAILED') {
        await appDb.kv.delete('pendingLanguage'); // the server doesn't support it: keep it on this phone only
      }
    };
    send();
    window.addEventListener('online', send);
    return () => {
      cancelled = true;
      window.removeEventListener('online', send);
    };
  }, [userId, kv?.pendingLanguage, sessionEnded]);

  // Finishes any successful sign-in or sign-up with the server's `me` answer.
  // Applies the different-person rule first; `resetPin` (Forgot PIN / locked out) makes them set a new PIN.
  // Returns { ok: true } or { ok: false, blockedName, count } (the previous person has unsent records).
  const completeSignIn = useCallback(async (newMe, { resetPin = false } = {}) => {
    const takeOver = await checkTakeOver(newMe.user.id);
    if (!takeOver.allowed) {
      await apiSignOut(); // don't leave the newcomer's session on this phone
      return { ok: false, blockedName: takeOver.name, count: takeOver.count };
    }
    // takeOver.previous: a different person used this phone before, with nothing unsent.
    // FE3 removes their business databases here (wipe.js), before the newcomer's data arrives.
    await saveMe(newMe);
    if (resetPin) await deletePin(newMe.user.id);
    else await clearWrongPins(newMe.user.id);
    navigator.storage?.persist?.().catch(() => {}); // ask Android to keep our storage (AC23)
    setSessionEnded(false);
    setInvitationsLater(false);
    setUnlocked(true);
    return { ok: true };
  }, []);

  // Checks a typed PIN. Wrong PINs are counted on the phone; the fifth locks the app until an online
  // sign-in. Returns { ok } or { ok: false, triesLeft, lockedOut }.
  const unlock = useCallback(async (typed) => {
    if (!userId || !pin) return { ok: false, triesLeft: 0, lockedOut: true };
    if (await verifyPin(typed, pin)) {
      await clearWrongPins(userId);
      setUnlocked(true);
      return { ok: true };
    }
    const updated = await recordWrongPin(userId);
    return { ok: false, triesLeft: Math.max(0, MAX_WRONG_PINS - (updated?.wrongTries ?? MAX_WRONG_PINS)), lockedOut: Boolean(updated?.lockedOut) };
  }, [userId, pin]);

  // Signs out on this phone: tells the server (if it can), then forgets the person locally.
  // Local business records are NOT deleted here (unsent ones must still be sent).
  const signOutHere = useCallback(async () => {
    await apiSignOut();
    await forgetSignedIn();
    setUnlocked(false);
    setSessionEnded(false);
  }, []);

  const openBusiness = me?.businesses?.find((b) => b.id === kv?.openBusinessId) ?? null;
  const loading = kv === undefined || (userId && pin === undefined);
  const step = loading ? null : nextStep({ me, pin: pin ?? null, unlocked, invitationsLater });

  const value = useMemo(
    () => ({
      loading, step, me, pin: pin ?? null, openBusiness, reference: kv?.reference ?? null, sessionEnded,
      completeSignIn, unlock, signOutHere, refreshMe, saveMe, setUnlocked, setInvitationsLater,
    }),
    [loading, step, me, pin, openBusiness, kv?.reference, sessionEnded, completeSignIn, unlock, signOutHere, refreshMe],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Returns the signed-in state and actions for the current screen.
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
