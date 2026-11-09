// What the person sees about sync (docs/app-plan.md "Sync states"): how many records are not sent yet,
// the oldest one, what needs attention, and when the last sync worked. Read live from the open business's
// database, so the header chip and the status screen update the moment anything changes.

import { useLiveQuery } from 'dexie-react-hooks';
import { getBusinessDb } from '../db/businessDb.js';
import { useSync } from './SyncProvider.jsx';

// Returns { unsent, oldestUnsentAt, attention, lastSyncAt, deviceCode, running, loaded }.
export function useSyncStatus() {
  const { businessId, running } = useSync();
  const counts = useLiveQuery(async () => {
    if (!businessId) return null;
    const db = getBusinessDb(businessId);
    const [unsent, oldest, attention, lastSync, device] = await Promise.all([
      db.outbox.count(),
      db.outbox.orderBy('seq').first(),
      db.needsAttention.filter((item) => !item.seenAt).count(),
      db.meta.get('lastSyncAt'),
      db.meta.get('device'),
    ]);
    return {
      unsent,
      oldestUnsentAt: oldest?.createdAt ?? null,
      attention,
      lastSyncAt: lastSync?.value ?? null,
      deviceCode: device?.value?.deviceCode ?? null,
    };
  }, [businessId]);
  return { unsent: 0, oldestUnsentAt: null, attention: 0, lastSyncAt: null, deviceCode: null, ...(counts ?? {}), running, loaded: counts !== undefined };
}
