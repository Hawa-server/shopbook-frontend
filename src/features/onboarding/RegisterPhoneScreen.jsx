// "Register this phone": shown when this phone has no key for the open business, e.g. registration
// failed at sign-in (no internet), the browser's storage was cleared, or the server said the key no longer
// matches. It asks for the password (used once to register, never stored; api.md POST /api/devices) and
// keeps every unsent record: they're sent as soon as the phone is registered.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { describeFailure } from '../../auth/formErrors.js';
import FormScreen from '../../components/FormScreen.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

export default function RegisterPhoneScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const { me, openBusiness, registerPhone } = useAuth();
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ fields: {}, form: null });
  const [busy, setBusy] = useState(false);

  // Registers with the typed password, then forgets it.
  async function submit() {
    if (!password) {
      setErrors({ fields: { currentPassword: t('errors.field.passwordEmpty') }, form: null });
      return;
    }
    setBusy(true);
    const result = await registerPhone(password, me);
    setPassword('');
    setBusy(false);
    if (result.ok) navigate('/more/sync', { replace: true, state: { registered: true } });
    else setErrors(describeFailure(result.result, t, ['currentPassword']));
  }

  return (
    <FormScreen
      title={t('register.title')}
      subtitle={openBusiness?.name}
      back
      onSubmit={submit}
      actions={
        <>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <Button type="submit" full disabled={busy}>
            {busy ? t('common.wait') : t('register.button')}
          </Button>
        </>
      }
    >
      <p className="text-body text-ink-2">{t('register.lead')}</p>
      <Field
        label={t('signIn.password')}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.fields.currentPassword}
        autoComplete="current-password"
      />
    </FormScreen>
  );
}
