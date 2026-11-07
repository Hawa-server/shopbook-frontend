// Set a new password from the emailed link /reset-password?token=… (api.md POST /api/auth/reset-password).
// The token was already taken out of the address when the app started (lib/addressToken.js); it lives
// only in memory and is forgotten once used. The new password is typed twice and must match.
// Success ends EVERY sign-in of this person, on every phone, so the next step is to sign in again.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { resetPassword } from '../../api/auth.js';
import { describeFailure } from '../../auth/formErrors.js';
import { forgetCapturedToken, getCapturedToken } from '../../lib/addressToken.js';
import FormScreen from '../../components/FormScreen.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

export default function ResetPasswordScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const [token] = useState(() => getCapturedToken('/reset-password'));
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState({ fields: {}, form: null });
  const [state, setState] = useState(token ? 'form' : 'badLink'); // 'form' | 'done' | 'badLink'
  const [busy, setBusy] = useState(false);

  // Checks the two passwords, then sends the new one with the token.
  async function submit() {
    const fields = {};
    if (password.length < 8 || password.length > 128) fields.newPassword = t('errors.field.password');
    else if (password !== again) fields.again = t('errors.field.passwordsDiffer');
    setErrors({ fields, form: null });
    if (Object.keys(fields).length > 0) return;

    setBusy(true);
    const result = await resetPassword({ token, newPassword: password });
    setBusy(false);
    if (result.kind === 'ok') {
      forgetCapturedToken();
      setPassword('');
      setAgain('');
      setState('done');
    } else if (result.code === 'INVALID_TOKEN') {
      forgetCapturedToken();
      setState('badLink');
    } else {
      setErrors(describeFailure(result, t, ['newPassword']));
    }
  }

  if (state !== 'form') {
    return (
      <FormScreen
        title={t('reset.title')}
        actions={
          state === 'done' ? (
            <Button full onClick={() => navigate('/sign-in', { replace: true })}>{t('reset.signIn')}</Button>
          ) : (
            <Button full onClick={() => navigate('/forgot-password', { replace: true })}>{t('reset.newLink')}</Button>
          )
        }
      >
        {state === 'done' ? <Banner tone="success">{t('reset.done')}</Banner> : <Banner tone="danger">{t('errors.code.INVALID_TOKEN')}</Banner>}
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title={t('reset.title')}
      onSubmit={submit}
      actions={
        <>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <Button type="submit" full disabled={busy}>
            {busy ? t('common.wait') : t('reset.button')}
          </Button>
        </>
      }
    >
      <Field
        label={t('reset.newPassword')}
        hint={t('signUp.passwordHint')}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.fields.newPassword}
        autoComplete="new-password"
      />
      <Field
        label={t('reset.again')}
        type="password"
        value={again}
        onChange={(e) => setAgain(e.target.value)}
        error={errors.fields.again}
        autoComplete="new-password"
      />
    </FormScreen>
  );
}
