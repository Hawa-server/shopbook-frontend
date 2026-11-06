// The More screen. FE1 has two parts:
// - Language: English or Twi for this phone; every word on every screen changes at once.
// - App and server: this app's version and whether the server answers /api/health (the FE1 check that
//   the live address reaches the server through /api). Later tasks add Help, settings and the rest here.

import { useT } from '../../i18n/t.js';
import { useHealth } from '../../api/health.js';
import { LANGUAGES } from '../../i18n/translate.js';
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
      <LanguageCard />
      <AboutCard />
    </Screen>
  );
}

// Two 48px buttons, English and Twi; the chosen one is green. aria-pressed tells screen readers which.
function LanguageCard() {
  const { t, language, setLanguage } = useT();
  return (
    <section aria-labelledby="language-heading" className="rounded-summary bg-paper p-4">
      <h2 id="language-heading" className="mb-3 flex items-center gap-2 text-item font-semibold">
        <Icon name="globe" className="text-primary" />
        {t('language.title')}
      </h2>
      <div className="grid grid-cols-2 gap-1 rounded-input border-[1.5px] border-input-line bg-ground p-1">
        {LANGUAGES.map((code) => {
          const chosen = code === language;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={chosen}
              onClick={() => setLanguage(code)}
              className={`min-h-tap rounded-[9px] px-3 font-bold ${chosen ? 'bg-primary text-paper' : 'text-ink'}`}
            >
              {t(`language.${code}`)}
            </button>
          );
        })}
      </div>
    </section>
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
