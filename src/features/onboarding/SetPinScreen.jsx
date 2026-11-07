// Set the 4-digit PIN for this person on this phone (required at the first sign-in; AC25).
// Typed twice; only a salted PBKDF2 hash is stored (crypto/pin.js), never the PIN, and never sent anywhere.

import { useState } from 'react';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { hashPin } from '../../crypto/pin.js';
import { savePin } from '../../auth/session.js';
import FormScreen from '../../components/FormScreen.jsx';
import PinPad from '../../components/PinPad.jsx';
import Banner from '../../components/Banner.jsx';

export default function SetPinScreen() {
  const { t } = useT();
  const { me, setUnlocked } = useAuth();
  const [first, setFirst] = useState(null); // the first entry, kept only until the second is typed
  const [mismatch, setMismatch] = useState(false);
  const [busy, setBusy] = useState(false);

  // First entry: remember it. Second: compare, then save the hash and open the app.
  async function onComplete(pin) {
    if (first === null) {
      setFirst(pin);
      setMismatch(false);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setMismatch(true);
      return;
    }
    setBusy(true);
    const record = await hashPin(pin);
    await savePin(me.user.id, record);
    setFirst(null);
    setUnlocked(true);
  }

  return (
    <FormScreen title={t('pin.setTitle')}>
      <p className="text-center text-item font-semibold" aria-live="polite">
        {first === null ? t('pin.choose') : t('pin.again')}
      </p>
      {mismatch && <Banner tone="danger">{t('pin.mismatch')}</Banner>}
      <PinPad onComplete={onComplete} busy={busy} />
      <p className="text-center text-secondary text-muted">{t('pin.why')}</p>
    </FormScreen>
  );
}
