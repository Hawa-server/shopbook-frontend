// Decides which screen a signed-in person must see before using the app (pure, so it's easy to test).
//
// Order, from api.md POST /api/auth/signin: first a temporary password must be replaced, then the
// current terms accepted, then invitations answered (a person removed everywhere may have one waiting),
// then "not part of any business" if there's still none, then a PIN must be set on this phone
// (required, AC25), then the PIN lock if the app is locked. Only then the app itself.

// `me`: the cached me object (or null when nobody is signed in on this phone).
// `pin`: this person's PIN record on this phone ({ hash, salt, iterations, wrongTries, lockedOut }) or null.
// `unlocked`: whether the PIN was entered since the app opened or came back from the background.
// `invitationsLater`: the person chose "Decide later" for invitations during this visit.
export const STEP = {
  SIGNED_OUT: 'signedOut',
  CHANGE_PASSWORD: 'changePassword',
  TERMS: 'terms',
  INVITATIONS: 'invitations',
  NO_BUSINESS: 'noBusiness',
  SET_PIN: 'setPin',
  PIN_LOCKED_OUT: 'pinLockedOut', // 5 wrong PINs: only an online sign-in with the password unlocks
  PIN: 'pin',
  APP: 'app',
};

export function nextStep({ me, pin, unlocked, invitationsLater = false }) {
  if (!me?.user) return STEP.SIGNED_OUT;
  if (me.user.mustChangePassword) return STEP.CHANGE_PASSWORD;
  if (me.terms && !me.terms.accepted) return STEP.TERMS;
  if ((me.invitations?.length ?? 0) > 0 && !invitationsLater) return STEP.INVITATIONS;
  if ((me.businesses?.length ?? 0) === 0) return (me.invitations?.length ?? 0) > 0 ? STEP.INVITATIONS : STEP.NO_BUSINESS;
  if (!pin) return STEP.SET_PIN;
  if (pin.lockedOut) return STEP.PIN_LOCKED_OUT;
  if (!unlocked) return STEP.PIN;
  return STEP.APP;
}

// Picks which business to open: the one already open if the person still belongs to it,
// otherwise their first real (non-practice) business, otherwise the first one. Null if none.
export function chooseOpenBusiness(me, currentId) {
  const businesses = me?.businesses ?? [];
  if (businesses.some((b) => b.id === currentId)) return currentId;
  return (businesses.find((b) => !b.isPractice) ?? businesses[0])?.id ?? null;
}
