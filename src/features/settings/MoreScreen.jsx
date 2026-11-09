// The More screen: My account (FE2), the phone's language, and App and server (FE1).
// Later tasks add Help, Business settings and the rest here. Details of the FE1 parts:
// - Language: the phone's language (every language in i18n/languages.js); every word changes at once.
// - App and server: this app's version and whether the server answers /api/health (the FE1 check that
//   the live address reaches the server through /api). Later tasks add Help, settings and the rest here.

import { useT } from '../../i18n/t.js';
import { useHealth } from '../../api/health.js';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/AuthProvider.jsx';
import LanguageSwitch from '../../components/LanguageSwitch.jsx';
import Screen from '../../components/Screen.jsx';
import Button from '../../components/Button.jsx';
import Icon from '../../components/Icon.jsx';
import StatusChip from '../../components/StatusChip.jsx';

// The version from package.json, put in at build time (vite.config.js `define`).
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

export default function MoreScreen() {
  const { t } = useT();
  return (
    <Screen title={t('more.title')}>
      <AccountRow />
      <MoreRow icon="sync" label={t('syncStatus.title')} to="/more/sync" />
      {import.meta.env.DEV && <MoreRow icon="info" label="Dev: sync test" to="/dev/sync" />}
      <LanguageCard />
      <AboutCard />
    </Screen>
  );
}

// The phone's language: every word changes at once (and is sent to the server when signed in).
function LanguageCard() {
  const { t } = useT();
  return (
    <section aria-labelledby="language-heading" className="rounded-summary bg-paper p-4">
      <h2 id="language-heading" className="mb-3 flex items-center gap-2 text-item font-semibold">
        <Icon name="globe" className="text-primary" />
        {t('language.title')}
      </h2>
      <LanguageSwitch />
    </section>
  );
}

// A plain row that opens another screen.
function MoreRow({ icon, label, to }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex min-h-tap w-full items-center gap-3 rounded-summary bg-paper p-4 text-left active:bg-primary-soft"
    >
      <Icon name={icon} className="text-primary" />
      <span className="flex-1 text-item font-semibold">{label}</span>
      <Icon name="chevron" className="text-muted" />
    </button>
  );
}

// The row that opens My account, showing whose account it is.
function AccountRow() {
  const { t } = useT();
  const navigate = useNavigate();
  const { me } = useAuth();
  return (
    <button
      type="button"
      onClick={() => navigate('/more/account')}
      className="flex min-h-tap w-full items-center gap-3 rounded-summary bg-paper p-4 text-left active:bg-primary-soft"
    >
      <Icon name="user" className="text-primary" />
      <span className="flex-1">
        <span className="block text-item font-semibold">{t('account.title')}</span>
        {me?.user?.name && <span className="block text-secondary text-muted">{me.user.name}</span>}
      </span>
      <Icon name="chevron" className="text-muted" />
    </button>
  );
}

// App version, server version and whether the server is working, with "Check again".
function AboutCard() {
  const { t } = useT();
  const { state, version, recheck } = useHealth();
  return (
    <section aria-labelledby="about-heading" className="rounded-summary bg-paper p-4">
      <h2 id="about-heading" className="mb-2 flex items-center gap-2 text-item font-semibold">
        <Icon name="info" className="text-primary" />
        {t('about.title')}
      </h2>
      <dl className="divide-y divide-line">
        <Row label={t('about.appVersion')} value={APP_VERSION} />
        <Row label={t('about.serverVersion')} value={version ?? '—'} />
        <div className="py-3">
          <dt className="text-secondary text-muted">{t('about.serverStatus')}</dt>
          <dd className="mt-1" role="status" aria-live="polite">
            <ServerState state={state} />
          </dd>
        </div>
      </dl>
      <Button variant="secondary" size="sm" full onClick={recheck} disabled={state === 'connecting'}>
        {t('about.checkAgain')}
      </Button>
    </section>
  );
}

// One label and value line.
function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className="text-secondary text-muted">{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}

// The server's state in words (with a chip for working / connecting, a sentence otherwise).
function ServerState({ state }) {
  const { t } = useT();
  if (state === 'ok') return <StatusChip kind="allSent" label={t('server.ok')} />;
  if (state === 'connecting') return <StatusChip kind="connecting" label={t('server.connecting')} />;
  return <p className="text-body text-ink-2">{t(`server.${state}`)}</p>;
}
