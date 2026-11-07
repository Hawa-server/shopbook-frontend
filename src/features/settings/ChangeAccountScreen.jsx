// More → My account → change password, phone number or email (AC36; api.md change-password,
// PATCH /me/phone, PATCH /me/email). One screen for all three: each asks for the current password and
// the new value. Every change signs the person out on their OTHER phones; this phone stays signed in.
// A new email waits for its link to be tapped; the old one keeps working until then.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { changeEmail, changePassword, changePhone } from '../../api/auth.js';
import { defaultCountry } from '../../api/reference.js';
import { describeFailure } from '../../auth/formErrors.js';
import FormScreen from '../../components/FormScreen.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

// `what`: 'password' | 'phone' | 'email'.
export default function ChangeAccountScreen({ what }) {
  const { t } = useT();
  const navigate = useNavigate();
  const { me, openBusiness, reference, saveMe } = useAuth();
  const [current, setCurrent] = useState('');
  const [value, setValue] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState({ fields: {}, form: null });
  const [busy, setBusy] = useState(false);
  const fieldName = { password: 'newPassword', phone: 'newPhone', email: 'newEmail' }[what];
  const isAdd = what === 'email' && !me?.user?.email;

  // Checks what the phone can, sends the change, and goes back to My account with a "done" note.
  async function submit() {
    const fields = {};
    if (!current) fields.currentPassword = t('errors.field.passwordEmpty');
    if (what === 'password') {
      if (value.length < 8 || value.length > 128) fields.newPassword = t('errors.field.password');
      else if (value !== again) fields.again = t('errors.field.passwordsDiffer');
    } else if (!value.trim()) {
      fields[fieldName] = t(`errors.field.${fieldName}`);
    }
    setErrors({ fields, form: null });
    if (Object.keys(fields).length > 0) return;

    setBusy(true);
    const result =
      what === 'password'
        ? await changePassword({ currentPassword: current, newPassword: value })
        : what === 'phone'
          ? await changePhone({ currentPassword: current, newPhone: value.trim(), country: openBusiness?.country ?? defaultCountry(reference) })
          : await changeEmail({ currentPassword: current, newEmail: value.trim() });
    setBusy(false);
    if (result.kind !== 'ok') {
      setErrors(describeFailure(result, t, ['currentPassword', fieldName]));
      return;
    }
    await saveMe(result.data);
    navigate('/more/account', { replace: true, state: { done: what } });
  }

  const titleKey = isAdd ? 'account.addEmail' : `account.change${what[0].toUpperCase()}${what.slice(1)}`;
  return (
    <FormScreen
      title={t(titleKey)}
      back
      onSubmit={submit}
      actions={
        <>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <Button type="submit" full disabled={busy}>
            {busy ? t('common.wait') : t('common.save')}
          </Button>
        </>
      }
    >
      <p className="text-body text-ink-2">{t('account.otherPhones')}</p>
      <Field label={t('account.currentPassword')} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.fields.currentPassword} autoComplete="current-password" />
      {what === 'password' && (
        <>
          <Field label={t('reset.newPassword')} hint={t('signUp.passwordHint')} type="password" value={value} onChange={(e) => setValue(e.target.value)} error={errors.fields.newPassword} autoComplete="new-password" />
          <Field label={t('reset.again')} type="password" value={again} onChange={(e) => setAgain(e.target.value)} error={errors.fields.again} autoComplete="new-password" />
        </>
      )}
      {what === 'phone' && (
        <Field label={t('account.newPhone')} hint={t('signUp.phoneHint')} type="tel" inputMode="tel" autoComplete="tel" value={value} onChange={(e) => setValue(e.target.value)} error={errors.fields.newPhone} />
      )}
      {what === 'email' && (
        <>
          <Field label={t('account.newEmail')} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={value} onChange={(e) => setValue(e.target.value)} error={errors.fields.newEmail} />
          <p className="text-secondary text-muted">{t('account.emailNote')}</p>
        </>
      )}
    </FormScreen>
  );
}
