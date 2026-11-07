// The app-update prompt (docs/app-plan.md "PWA update safety").
//
// When a new version has downloaded, it says "A new version is ready" with Update now and Later.
// It NEVER reloads by itself, and refuses to reload while a screen has unsaved input (a sale in
// progress): the person finishes first. From FE3 it will also wait for a running sync or save to end.
// It also says once "Ready to work without internet" when the app has been saved for offline use.

import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useT } from '../i18n/t.js';
import { hasUnsavedInput } from '../lib/unsavedInput.js';
import Button from './Button.jsx';

// `place`: 'aboveTabs' inside the app (just above the bottom tabs), or 'top' on screens without tabs,
// whose main button sits at the bottom and must never be covered.
export default function UpdatePrompt({ place = 'top' }) {
  const { t } = useT();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();
  const [blocked, setBlocked] = useState(false);

  // The "ready offline" note is short news, not something to act on: hide it after a few seconds.
  useEffect(() => {
    if (!offlineReady) return undefined;
    const timer = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  // Reload into the new version only when nothing is being entered.
  function updateNow() {
    if (hasUnsavedInput()) {
      setBlocked(true);
      return;
    }
    updateServiceWorker(true);
  }

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 z-30 mx-auto max-w-120 px-3 ${
        place === 'aboveTabs' ? 'bottom-[calc(var(--spacing-tabs)+env(safe-area-inset-bottom)+0.5rem)]' : 'top-[calc(env(safe-area-inset-top)+0.5rem)]'
      }`}
    >
      <div className="rounded-summary border border-line bg-paper p-4 shadow-lg">
        {needRefresh ? (
          <>
            <p className="font-semibold">{t('update.ready')}</p>
            {blocked && <p className="mt-1 text-secondary text-ink-2">{t('update.finishFirst')}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => setNeedRefresh(false)}>
                {t('update.later')}
              </Button>
              <Button size="sm" onClick={updateNow}>
                {t('update.now')}
              </Button>
            </div>
          </>
        ) : (
          <p className="font-semibold">{t('update.offlineReady')}</p>
        )}
      </div>
    </div>
  );
}
