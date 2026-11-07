// Confirms an email from the link /confirm-email?token=… (api.md POST /api/auth/confirm-email; AC32).
// Works without being signed in (the link may be opened on another device). The token was taken out of
// the address at start-up and lives only in memory. If there's no internet, the person can try again
// without reopening the link.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { confirmEmail } from '../../api/auth.js';
import { describeFailure } from '../../auth/formErrors.js';
import { forgetCapturedToken, getCapturedToken } from '../../lib/addressToken.js';
import FormScreen from '../../components/FormScreen.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

export default function ConfirmEmailScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const { me, refreshMe } = useAuth();
  const [token] = useState(() => getCapturedToken('/confirm-email'));
  const [state, setState] = useState(token ? 'working' : 'badLink'); // 'working' | 'done' | 'badLink' | 'retry'
  const [message, setMessage] = useState(null);

  // Sends the token once; a network problem keeps it so "Try again" works.
  const send = useCallback(async () => {
    setState('working');
    const result = await confirmEmail(token);
    if (result.kind === 'ok') {
      forgetCapturedToken();
      setState('done');
      if (me) refreshMe();
    } else if (result.code === 'INVALID_TOKEN' || result.code === 'EMAIL_TAKEN' || result.code === 'VALIDATION_FAILED') {
      forgetCapturedToken();
      setMessage(result.code === 'EMAIL_TAKEN' ? t('errors.code.EMAIL_TAKEN') : t('errors.code.INVALID_TOKEN'));
      setState('badLink');
    } else {
      setMessage(describeFailure(result, t).form);
      setState('retry');
    }
  }, [token, me, refreshMe, t]);

  // Send once for this link. (React runs effects twice while developing; a one-time token must not be.)
  const started = useRef(false);
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      send();
    }
  }, [token, send]);

  return (
    <FormScreen
      title={t('confirm.title')}
      actions={
        state === 'retry' ? (
          <Button full onClick={send}>{t('confirm.tryAgain')}</Button>
        ) : (
          <Button full disabled={state === 'working'} onClick={() => navigate('/', { replace: true })}>
            {t('confirm.continue')}
          </Button>
        )
      }
    >
      {state === 'working' && <Banner tone="info">{t('common.wait')}</Banner>}
      {state === 'done' && <Banner tone="success">{t('confirm.done')}</Banner>}
      {state === 'badLink' && <Banner tone="danger">{message ?? t('errors.code.INVALID_TOKEN')}</Banner>}
      {state === 'retry' && <Banner tone="danger">{message}</Banner>}
    </FormScreen>
  );
}
