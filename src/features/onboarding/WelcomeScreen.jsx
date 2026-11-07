// The first screen when nobody is signed in on this phone: the logo and the app's name (from
// t('app.name'), never typed here), a language switch, and the two ways in: Sign in, or Create a
// business account.

import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import Button from '../../components/Button.jsx';
import LanguageSwitch from '../../components/LanguageSwitch.jsx';

export default function WelcomeScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-dvh max-w-120 flex-col bg-ground px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <LanguageSwitch />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
        <img src="/icons/logo-mark.svg" alt="" width="112" height="112" className="size-28" />
        <h1 className="text-money-lg font-extrabold">{t('app.name')}</h1>
        <p className="max-w-72 text-body text-ink-2">{t('welcome.lead')}</p>
      </main>
      <div className="flex flex-col gap-2">
        <Button full onClick={() => navigate('/sign-in')}>
          {t('welcome.signIn')}
        </Button>
        <Button full variant="secondary" onClick={() => navigate('/sign-up')}>
          {t('welcome.createAccount')}
        </Button>
      </div>
    </div>
  );
}
