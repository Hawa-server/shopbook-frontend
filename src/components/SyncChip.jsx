// The status chip at the right of every header (docs/design.md §6 Header).
//
// FE1: shows "Connecting…" while the sleeping server wakes up (or when it hasn't answered yet), and
// nothing otherwise. FE3 adds the real sync states from the outbox: "2 not sent" (clock), "Sending…"
// (only while a sync runs), "Needs attention", "All sent".

import { useHealth } from '../api/health.js';
import { useT } from '../i18n/t.js';
import StatusChip from './StatusChip.jsx';

export default function SyncChip() {
  const { t } = useT();
  const { state } = useHealth();
  const connecting = state === 'connecting' || state === 'unreachable';
  // The wrapper is always there (and live), so screen readers hear the change when it appears.
  return (
    <span role="status" aria-live="polite">
      {connecting && <StatusChip kind="connecting" label={t('sync.connecting')} />}
    </span>
  );
}
