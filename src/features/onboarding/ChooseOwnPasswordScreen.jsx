// "Choose your own password": shown before anything else when the person still has a temporary
// password from the owner (me.user.mustChangePassword; api.md POST /api/auth/change-password).

import { useState } from 'react';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { changePassword } from '../../api/auth.js';
import { describeFailure } from '../../auth/formErrors.js';
import FormScreen from '../../components/FormScreen.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

export default function ChooseOwnPasswordScreen() {
  const { t } = useT();
  const { saveMe, signOutHere, keepPasswordForRegistration } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState({ fields: {}, form: null });
  const [busy, setBusy] = useState(false);

  // Checks the new password twice, then replaces the temporary one.
  async function submit() {
    const fields = {};
    if (!current) fields.currentPassword = t('errors.field.passwordEmpty');
    if (password.length < 8 || password.length > 128) fields.newPassword = t('errors.field.password');
    else if (password !== again) fields.again = t('errors.field.passwordsDiffer');
    setErrors({ fields, form: null });
    if (Object.keys(fields).length > 0) return;

    setBusy(true);
    const result = await changePassword({ currentPassword: current, newPassword: password });
    setBusy(false);
    if (result.kind === 'ok') {
      keepPasswordForRegistration(password); // memory only, to register this phone after the terms
      await saveMe(result.data);
    } else {
      setErrors(describeFailure(result, t, ['currentPassword', 'newPassword']));
    }
  }

  return (
    <FormScreen
      title={t('ownPassword.title')}
      onSubmit={submit}
      actions={
        <>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <Button type="submit" full disabled={busy}>
            {busy ? t('common.wait') : t('ownPassword.button')}
          </Button>
          <Button variant="quiet" size="sm" full onClick={signOutHere}>
            {t('account.signOut')}
          </Button>
        </>
      }
    >
      <p className="text-body text-ink-2">{t('ownPassword.lead')}</p>
      <Field label={t('ownPassword.temporary')} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.fields.currentPassword} autoComplete="current-password" />
      <Field label={t('reset.newPassword')} hint={t('signUp.passwordHint')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.fields.newPassword} autoComplete="new-password" />
      <Field label={t('reset.again')} type="password" value={again} onChange={(e) => setAgain(e.target.value)} error={errors.fields.again} autoComplete="new-password" />
    </FormScreen>
  );
}
