// The PIN lock (AC25): asked when the app opens and after 5 minutes in the background. Shows whose
// phone it is. Each wrong PIN is counted on the phone ("Wrong PIN. 3 tries left."); after 5 the app is
// locked out until the person signs in with their password online. "Forgot PIN?" leads to the same
// password sign-in, after which they set a new PIN. Nothing on the phone is deleted by any of this.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { STEP } from '../../auth/nextStep.js';
import FormScreen from '../../components/FormScreen.jsx';
import PinPad from '../../components/PinPad.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

export default function PinLockScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const { me, step, unlock } = useAuth();
  const [triesLeft, setTriesLeft] = useState(null);
  const [busy, setBusy] = useState(false);
  const lockedOut = step === STEP.PIN_LOCKED_OUT;

  // Checks the typed PIN (this takes a moment: the hash is deliberately slow).
  async function onComplete(pin) {
    setBusy(true);
    const result = await unlock(pin);
    setBusy(false);
    if (!result.ok) setTriesLeft(result.triesLeft);
  }

  const signInWithPassword = (reason) => navigate('/sign-in', { state: { reason } });

  return (
    <FormScreen
      title={t('pin.lockTitle')}
      subtitle={me?.user?.name}
      actions={
        lockedOut ? (
          <Button full onClick={() => signInWithPassword('lockedOut')}>
            {t('pin.signInWithPassword')}
          </Button>
        ) : (
          <Button variant="quiet" size="sm" full onClick={() => signInWithPassword('forgotPin')}>
            {t('pin.forgot')}
          </Button>
        )
      }
    >
      {lockedOut ? (
        <Banner tone="danger">{t('pin.lockedOut')}</Banner>
      ) : (
        <>
          <p className="text-center text-item font-semibold">{t('pin.enter')}</p>
          {triesLeft !== null && <Banner tone="danger">{t('pin.wrong', { n: triesLeft })}</Banner>}
          <PinPad onComplete={onComplete} busy={busy} />
        </>
      )}
    </FormScreen>
  );
}
