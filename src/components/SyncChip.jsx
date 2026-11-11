// The status chip at the right of every header (docs/design.md §6 StatusChip; app-plan "Sync states"):
//   "Sending…"        circular arrows, only while a sync is really running
//   "Needs attention" warning, when the server rejected something not yet seen
//   "2 not sent"      clock, records saved on this phone and waiting
//   "Connecting…"     while the sleeping server wakes, or while syncs keep failing for a temporary reason
//                     (so a phone never looks up to date when it can't fetch other phones' changes)
//   nothing           everything sent (the normal case)
// The wrapper is always there and live, so screen readers hear each change.

import { useHealth } from '../api/health.js';
import { useT } from '../i18n/t.js';
import { useSyncStatus } from '../sync/status.js';
import { useSync } from '../sync/SyncProvider.jsx';
import StatusChip from './StatusChip.jsx';

export default function SyncChip() {
  const { t } = useT();
  const { state } = useHealth();
  const { running, attention, unsent } = useSyncStatus();
  const { outcome } = useSync();
  const failing = outcome?.kind === 'temporary' || outcome?.kind === 'wait' || outcome?.kind === 'error';

  let chip = null;
  if (running) chip = <StatusChip kind="sending" label={t('sync.sending')} />;
  else if (attention > 0) chip = <StatusChip kind="attention" label={t('sync.needsAttention')} />;
  else if (unsent > 0) chip = <StatusChip kind="pending" label={t('sync.notSentCount', { n: unsent })} />;
  else if (failing || state === 'connecting' || state === 'unreachable') chip = <StatusChip kind="connecting" label={t('sync.connecting')} />;

  return (
    // min-w-0 + max-w-full: inside the header's flex row this wrapper may shrink, so a long chip (Twi, 130% text)
    // wraps onto two lines in its own space instead of sliding left over the title.
    <span role="status" aria-live="polite" className="min-w-0 max-w-full">
      {chip}
    </span>
  );
}
