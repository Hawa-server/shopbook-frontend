// Create a business account (api.md POST /api/auth/signup; AC1, AC3, AC5, AC37).
// One form in short sections: you (name, phone, email), your business, a password, the language,
// and the required tick for the privacy notice and terms (both readable in a sheet).
// The country picker only appears when the server supports more than one country.
// Needs the internet: the account is created on the server, then the person is signed in.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { getLegal, signUp } from '../../api/auth.js';
import { defaultCountry, loadReference } from '../../api/reference.js';
import { describeFailure } from '../../auth/formErrors.js';
import { appDb } from '../../db/appDb.js';
import FormScreen from '../../components/FormScreen.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';
import Checkbox from '../../components/Checkbox.jsx';
import LanguageSwitch from '../../components/LanguageSwitch.jsx';
import LegalSheet from './LegalSheet.jsx';

const FIELDS = ['name', 'phone', 'email', 'businessName', 'password', 'language', 'country', 'acceptTerms'];

// A small heading for each part of the form.
function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4 rounded-summary bg-paper p-4">
      <h2 className="text-secondary font-bold uppercase tracking-[0.08em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default function SignUpScreen() {
  const { t, language: appLanguage } = useT();
  const navigate = useNavigate();
  const { reference, completeSignIn } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', businessName: '', password: '', language: appLanguage, country: null });
  const [accepted, setAccepted] = useState(false);
  const [legal, setLegal] = useState(null);
  const [openDoc, setOpenDoc] = useState(null);
  const [errors, setErrors] = useState({ fields: {}, form: null });
  const [busy, setBusy] = useState(false);
  const countries = reference?.countries ?? [];

  // Loads the terms (their version is sent back) and the country list.
  async function loadLegal() {
    const result = await getLegal();
    if (result.kind === 'ok') setLegal(result.data);
    return result;
  }
  useEffect(() => {
    loadLegal();
    loadReference();
  }, []);

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  // Checks what the phone can check, then creates the account.
  async function submit() {
    const fields = {};
    for (const name of ['name', 'phone', 'email', 'businessName']) {
      if (!form[name].trim()) fields[name] = t(`errors.field.${name}`);
    }
    if (form.password.length < 8 || form.password.length > 128) fields.password = t('errors.field.password');
    if (!accepted) fields.acceptTerms = t('errors.field.acceptTerms');
    setErrors({ fields, form: null });
    if (Object.keys(fields).length > 0) return;

    setBusy(true);
    const terms = legal ?? (await loadLegal()).data;
    if (!terms) {
      setErrors({ fields: {}, form: t('errors.offline') });
      setBusy(false);
      return;
    }
    const result = await signUp({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      password: form.password,
      businessName: form.businessName.trim(),
      language: form.language,
      country: form.country ?? defaultCountry(reference),
      termsVersion: terms.version,
    });
    if (result.kind !== 'ok') {
      if (result.code === 'TERMS_VERSION_MISMATCH') {
        setAccepted(false);
        await loadLegal(); // the terms changed meanwhile: show the new ones and ask again
      }
      setErrors(describeFailure(result, t, FIELDS));
      setBusy(false);
      return;
    }
    await appDb.kv.delete('pendingLanguage'); // the language was just sent with the sign-up
    const done = await completeSignIn(result.data);
    setBusy(false);
    if (!done.ok) {
      setErrors({ fields: {}, form: t('takeOver.blocked', { name: done.blockedName, n: done.count }) });
      return;
    }
    navigate('/sell', { replace: true });
  }

  return (
    <FormScreen
      title={t('signUp.title')}
      back
      onSubmit={submit}
      actions={
        <>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <Button type="submit" full disabled={busy}>
            {busy ? t('common.wait') : t('signUp.button')}
          </Button>
        </>
      }
    >
      <Section title={t('signUp.you')}>
        <Field label={t('signUp.name')} value={form.name} onChange={set('name')} error={errors.fields.name} autoComplete="name" maxLength={60} />
        <Field
          label={t('signUp.phone')}
          hint={t('signUp.phoneHint')}
          value={form.phone}
          onChange={set('phone')}
          error={errors.fields.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
        <Field
          label={t('signUp.email')}
          value={form.email}
          onChange={set('email')}
          error={errors.fields.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
        />
      </Section>

      <Section title={t('signUp.business')}>
        <Field
          label={t('signUp.businessName')}
          value={form.businessName}
          onChange={set('businessName')}
          error={errors.fields.businessName}
          autoComplete="organization"
          maxLength={60}
        />
        {countries.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="country" className="text-[0.9375rem] font-semibold">
              {t('signUp.country')}
            </label>
            <select
              id="country"
              value={form.country ?? defaultCountry(reference) ?? ''}
              onChange={set('country')}
              className="min-h-[3.25rem] rounded-input border-[1.5px] border-input-line bg-paper px-3 text-body"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </Section>

      <Section title={t('signUp.passwordSection')}>
        <Field
          label={t('signUp.password')}
          hint={t('signUp.passwordHint')}
          type="password"
          value={form.password}
          onChange={set('password')}
          error={errors.fields.password}
          autoComplete="new-password"
        />
      </Section>

      <Section title={t('language.title')}>
        <LanguageSwitch value={form.language} onChange={(language) => setForm((f) => ({ ...f, language }))} />
      </Section>

      <Section title={t('signUp.termsSection')}>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpenDoc('privacy')} disabled={!legal}>
            {t('signUp.readPrivacy')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setOpenDoc('terms')} disabled={!legal}>
            {t('signUp.readTerms')}
          </Button>
        </div>
        <Checkbox checked={accepted} onChange={setAccepted} error={errors.fields.acceptTerms}>
          {t('signUp.accept')}
        </Checkbox>
      </Section>

      <LegalSheet legal={legal} doc={openDoc} onClose={() => setOpenDoc(null)} />
    </FormScreen>
  );
}
