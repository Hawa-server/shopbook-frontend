// Forgot password (api.md POST /api/auth/forgot-password; AC33, AC34). The person types a phone number
// or email. The server ALWAYS answers the same, so nobody can find out who has an account; the screen
// then says so in the same words, and reminds staff without an email to ask their shop owner.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { forgotPassword } from '../../api/auth.js';
import { defaultCountry } from '../../api/reference.js';
import { describeFailure } from '../../auth/formErrors.js';
import FormScreen from '../../components/FormScreen.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

export default function ForgotPasswordScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const { reference } = useAuth();
  const [login, setLogin] = useState('');
  const [errors, setErrors] = useState({ fields: {}, form: null });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // Asks for the link; any answer from the server means "done" (it never says whether the account exists).
  async function submit() {
    if (!login.trim()) {
      setErrors({ fields: { login: t('errors.field.login') }, form: null });
      return;
    }
    setBusy(true);
    const result = await forgotPassword({ login: login.trim(), country: defaultCountry(reference) });
    setBusy(false);
    if (result.kind === 'ok') {
      setSent(true);
      setErrors({ fields: {}, form: null });
    } else {
      setErrors(describeFailure(result, t, ['login']));
    }
  }

  return (
    <FormScreen
      title={t('forgot.title')}
      back
      onSubmit={sent ? undefined : submit}
      actions={
        sent ? (
          <Button full onClick={() => navigate('/sign-in', { replace: true })}>
            {t('forgot.backToSignIn')}
          </Button>
        ) : (
          <>
            {errors.form && <Banner tone="danger">{errors.form}</Banner>}
            <Button type="submit" full disabled={busy}>
              {busy ? t('common.wait') : t('forgot.button')}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <>
          <Banner tone="success">{t('forgot.sent')}</Banner>
          <p className="text-body text-ink-2">{t('forgot.noEmail')}</p>
        </>
      ) : (
        <>
          <p className="text-body text-ink-2">{t('forgot.lead')}</p>
          <Field
            label={t('signIn.login')}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            error={errors.fields.login}
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
          />
          <p className="text-secondary text-muted">{t('forgot.noEmail')}</p>
        </>
      )}
    </FormScreen>
  );
}
