// Sign in with a phone number or an email, plus the password (api.md POST /api/auth/signin; AC2).
//
// Also used to sign in AGAIN while someone is already on this phone:
// - 'sessionEnded': the server session ended; everything on the phone is kept.
// - 'forgotPin' / 'lockedOut': proving the password lets the person set a new PIN.
// Any wrong login shows the same words ("Wrong phone number, email or password."), so nobody can learn
// who has an account. If a DIFFERENT person signs in while the previous one still has unsent records,
// the sign-in is refused (the different-person rule, auth/session.js).

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { signIn } from '../../api/auth.js';
import { defaultCountry, loadReference } from '../../api/reference.js';
import { describeFailure } from '../../auth/formErrors.js';
import FormScreen from '../../components/FormScreen.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

const FIELDS = ['login', 'password'];

export default function SignInScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { me, reference, completeSignIn } = useAuth();
  const reason = location.state?.reason ?? (me ? 'sessionEnded' : null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ fields: {}, form: null });
  const [busy, setBusy] = useState(false);

  // Fetch the country list early (how to read a local phone number); the phone's copy is used if offline.
  useEffect(() => {
    loadReference();
  }, []);

  // Checks the fields are filled, then signs in and finishes with completeSignIn.
  async function submit() {
    const fields = {};
    if (!login.trim()) fields.login = t('errors.field.login');
    if (!password) fields.password = t('errors.field.passwordEmpty');
    setErrors({ fields, form: null });
    if (Object.keys(fields).length > 0) return;

    setBusy(true);
    const result = await signIn({ login: login.trim(), password, country: defaultCountry(reference) });
    if (result.kind !== 'ok') {
      setErrors(describeFailure(result, t, FIELDS));
      setBusy(false);
      return;
    }
    // The password just typed also registers this phone (then it's forgotten; see AuthProvider).
    const done = await completeSignIn(result.data, { resetPin: reason === 'forgotPin' || reason === 'lockedOut', password });
    setPassword('');
    setBusy(false);
    if (!done.ok) {
      setErrors({ fields: {}, form: t('takeOver.blocked', { name: done.blockedName, count: done.count }) });
      return;
    }
    navigate('/sell', { replace: true });
  }

  return (
    <FormScreen
      title={me ? t('signIn.againTitle') : t('signIn.title')}
      back
      onSubmit={submit}
      actions={
        <>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <Button type="submit" full disabled={busy}>
            {busy ? t('common.wait') : t('signIn.button')}
          </Button>
          <Button variant="quiet" size="sm" full onClick={() => navigate('/forgot-password')}>
            {t('signIn.forgot')}
          </Button>
        </>
      }
    >
      {reason && <Banner tone="info">{t(`signIn.reason.${reason}`)}</Banner>}
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
      <Field
        label={t('signIn.password')}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.fields.password}
        autoComplete="current-password"
      />
    </FormScreen>
  );
}
