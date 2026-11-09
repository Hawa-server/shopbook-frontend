// A small test screen to make sync records while the real screens don't exist yet
// (app plan FE3 / FE3.5: "a small developer-only test screen that changes one settings field").
//
// It only exists in `npm run dev` and in a temporary test build (VITE_SYNC_TEST_SCREEN=1, for the real-phone
// test). In any other build App.jsx's `__SYNC_TEST_SCREEN__` is `false`, so this file is left out entirely.
// The owner also gets team and phone actions here (DevTeamTools.jsx) until FE4's real screens.
// Being a developer tool, its words are plain English rather than dictionary keys.
// To be removed in FE12, as the plan says.

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { useSync } from '../../sync/SyncProvider.jsx';
import { getBusinessDb } from '../../db/businessDb.js';
import { saveWithOperation } from '../../sync/outbox.js';
import { settingsWithPendingChanges } from '../../sync/records.js';
import Screen from '../../components/Screen.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';
import DevTeamTools from './DevTeamTools.jsx';

export default function DevSyncScreen() {
  const { openBusiness } = useAuth();
  const isOwner = openBusiness?.role === 'owner';
  const { businessId, syncNow, outcome, running } = useSync();
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(null);

  const data = useLiveQuery(async () => {
    if (!businessId) return null;
    const db = getBusinessDb(businessId);
    const [server, outbox, device] = await Promise.all([db.settings.get('business'), db.outbox.orderBy('seq').toArray(), db.meta.get('device')]);
    return { server, outbox, shown: settingsWithPendingChanges(server, outbox), deviceCode: device?.value?.deviceCode ?? null };
  }, [businessId]);

  // Saves a settings.update with its outbox operation (exactly like a real screen will).
  async function save(changes) {
    const db = getBusinessDb(businessId);
    const opId = await saveWithOperation(db, {
      type: 'settings.update',
      payload: { baseVersion: data?.server?.version ?? 1, changes },
    });
    setSaved(opId);
  }

  if (!businessId) return null;
  return (
    <Screen title="Dev: sync test" subtitle={openBusiness?.name} back>
      <Banner tone="info">Test screen. Only in npm run dev and the temporary test build.</Banner>
      <section className="flex flex-col gap-1 rounded-summary bg-paper p-4 text-secondary">
        <p>Server copy: version {data?.server?.version ?? '—'}, note “{data?.server?.receiptNote ?? ''}”, phone “{data?.server?.receiptPhone ?? ''}”</p>
        <p>Shown (with unsent changes): note “{data?.shown?.receiptNote ?? ''}”, phone “{data?.shown?.receiptPhone ?? ''}”</p>
        <p>Outbox: {data?.outbox?.length ?? 0} waiting</p>
        <p>Last outcome: {running ? 'running…' : (outcome?.kind ?? '—')}</p>
        {saved && <p>Saved operation {saved.slice(0, 8)}…</p>}
      </section>
      <Field label="Receipt note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
      <Button onClick={() => save({ receiptNote: note || null })}>Save receipt note</Button>
      <Field label="Receipt phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
      <Button onClick={() => save({ receiptPhone: phone || null })}>Save receipt phone</Button>
      <Button variant="secondary" onClick={() => save({ paymentMethods: ['bitcoin'] })}>
        Save a change the server will refuse
      </Button>
      <Button variant="quiet" onClick={syncNow}>Sync now</Button>
      {isOwner && <DevTeamTools businessId={businessId} myDeviceCode={data?.deviceCode} />}
    </Screen>
  );
}
