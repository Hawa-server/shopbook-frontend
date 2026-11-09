// More → Sync status (docs/app-plan.md "Sync states", "Needs attention", "Storage safety").
//
// - "All records sent" or "3 not sent yet · last sync 10:42", with Sync now.
// - Warnings: the phone may clear the app's storage (not persistent), or records waiting more than 2 days.
// - "Needs attention": every record the server refused, with what it was, why, and what to do. Each stays
//   until the person marks it as seen; marking it seen only hides it here, nothing is deleted.

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { useSync } from '../../sync/SyncProvider.jsx';
import { useSyncStatus } from '../../sync/status.js';
import { getBusinessDb } from '../../db/businessDb.js';
import { hasText } from '../../i18n/translate.js';
import { daysSince, formatDay, formatTime } from '../../lib/dates.js';
import Screen from '../../components/Screen.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';
import StatusChip from '../../components/StatusChip.jsx';

// One refused record: what it was, why, and what to do.
function AttentionItem({ item, timeZone, onSeen }) {
  const { t } = useT();
  const what = t(hasText(`op.${item.type}`) ? `op.${item.type}` : 'op.unknown');
  const why = hasText(`errors.code.${item.code}`) ? t(`errors.code.${item.code}`) : t('attention.reasonCode', { code: item.code });
  const todo = item.appProblem ? t('attention.appProblem') : item.code === 'FORBIDDEN' ? t('attention.tellOwner') : t('attention.doAgain');
  return (
    <li className="flex flex-col gap-2 rounded-card bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-item font-semibold">{what}</p>
        <StatusChip kind="attention" label={t('attention.notAccepted')} />
      </div>
      <p className="text-secondary text-muted">
        {formatDay(item.createdAt, timeZone)} · {formatTime(item.createdAt, timeZone)}
      </p>
      <p className="text-body">{why}</p>
      <p className="text-body font-semibold">{todo}</p>
      <Button variant="secondary" size="sm" onClick={() => onSeen(item.opId)}>
        {t('attention.markSeen')}
      </Button>
    </li>
  );
}

export default function SyncStatusScreen() {
  const { t } = useT();
  const location = useLocation();
  const { openBusiness } = useAuth();
  const { businessId, running, syncNow, updateApp, closing } = useSync();
  const { unsent, oldestUnsentAt, lastSyncAt, deviceCode } = useSyncStatus();
  const timeZone = openBusiness?.timezone;
  const [persisted, setPersisted] = useState(true);

  // Is the app's storage kept for good, or may Android clear it when space runs low?
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(true));
  }, []);

  const items = useLiveQuery(
    async () => (businessId ? (await getBusinessDb(businessId).needsAttention.toArray()).filter((i) => !i.seenAt) : []),
    [businessId],
  );
  const markSeen = (opId) => getBusinessDb(businessId).needsAttention.update(opId, { seenAt: new Date().toISOString() });

  const lastSync = lastSyncAt ? t('syncStatus.lastSync', { time: `${formatDay(lastSyncAt, timeZone)} ${formatTime(lastSyncAt, timeZone)}` }) : t('syncStatus.neverSynced');
  return (
    <Screen title={t('syncStatus.title')} subtitle={openBusiness?.name} back>
      {location.state?.registered && <Banner tone="success">{t('register.done')}</Banner>}
      {updateApp && <Banner tone="danger">{t('syncStatus.updateApp')}</Banner>}
      {closing && <Banner tone="info">{t('syncStatus.closing')}</Banner>}

      <section className="flex flex-col gap-3 rounded-summary bg-paper p-4">
        <div role="status" aria-live="polite">
          {unsent === 0 ? (
            <StatusChip kind="allSent" label={t('syncStatus.allSent')} />
          ) : (
            <StatusChip kind="pending" label={t('syncStatus.notSent', { n: unsent })} />
          )}
        </div>
        <p className="text-body text-ink-2">{lastSync}</p>
        {deviceCode && <p className="text-secondary text-muted">{t('syncStatus.thisPhone', { code: deviceCode })}</p>}
        <Button variant="secondary" size="sm" disabled={running} onClick={syncNow}>
          {running ? t('sync.sending') : t('syncStatus.syncNow')}
        </Button>
      </section>

      {!persisted && <Banner tone="danger">{t('syncStatus.notPersistent')}</Banner>}
      {oldestUnsentAt && daysSince(oldestUnsentAt) >= 2 && <Banner tone="danger">{t('syncStatus.oldUnsent', { days: daysSince(oldestUnsentAt) })}</Banner>}

      <h2 className="mt-2 text-secondary font-bold uppercase tracking-[0.08em] text-muted">{t('attention.title')}</h2>
      {items?.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <AttentionItem key={item.opId} item={item} timeZone={timeZone} onSeen={markSeen} />
          ))}
        </ul>
      ) : (
        <p className="text-body text-ink-2">{t('attention.none')}</p>
      )}
    </Screen>
  );
}
