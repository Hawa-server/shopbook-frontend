// Part of the sync TEST screen only (DevSyncScreen.jsx): the owner's team and phone actions needed by the
// real-phone test (docs/guide.md, FE3.5 checks 5a, 5b and 8) until the real Team and Phones screens arrive
// in FE4. Like the rest of the test screen, it's only in `npm run dev` and the temporary test build, and its
// words are plain English. Every action is a signed request through the shared API helper (api.md "Team",
// "Phones (devices)"); the server checks the owner's role on each one.

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../api/client.js';
import { getBusinessDb, getMeta } from '../../db/businessDb.js';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

// Sends one signed request for the business, with this phone's key.
async function signedRequest(businessId, path, options = {}) {
  const device = await getMeta(getBusinessDb(businessId), 'device');
  if (!device) return { kind: 'error', code: 'NO_DEVICE' };
  return apiRequest(path, { ...options, businessId, device });
}

// A short description of a failed request for this test screen.
const failure = (result) => `Failed: ${result.code ?? result.kind ?? 'unknown'}${result.status ? ` (${result.status})` : ''}`;

export default function DevTeamTools({ businessId, myDeviceCode }) {
  const [members, setMembers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [busy, setBusy] = useState(false);

  // Loads the team and the phones from the server.
  const refresh = useCallback(async () => {
    const [team, phones] = await Promise.all([signedRequest(businessId, '/api/team'), signedRequest(businessId, '/api/devices')]);
    if (team.kind === 'ok') setMembers(team.data.members ?? []);
    if (phones.kind === 'ok') setDevices(phones.data.devices ?? []);
    if (team.kind !== 'ok') setMessage({ tone: 'danger', text: `Team list: ${failure(team)}` });
  }, [businessId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Runs one action, shows what happened, and reloads the lists.
  async function run(label, action) {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    setMessage(result.kind === 'ok' ? { tone: 'success', text: `${label}: done` } : { tone: 'danger', text: `${label}: ${failure(result)}` });
    await refresh();
    return result;
  }

  // Adds a sales associate. The temporary password is shown once, here, and never stored.
  async function addStaff() {
    setTemporaryPassword(null);
    const result = await run('Add staff', () =>
      signedRequest(businessId, '/api/team', { method: 'POST', body: { name: name.trim(), phone: phone.trim(), role: 'associate' } }),
    );
    if (result.kind === 'ok') {
      setTemporaryPassword(result.data.temporaryPassword ?? '(none: this number already has an account, so it was invited)');
      setName('');
      setPhone('');
    }
  }

  const activeMembers = members.filter((m) => m.role !== 'owner' && (m.status === 'active' || m.status === 'invited'));
  const activeDevices = devices.filter((d) => d.isActive);

  return (
    <section className="flex flex-col gap-3 rounded-summary bg-paper p-4">
      <h2 className="text-item font-bold">Team and phones (owner, test only)</h2>
      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      <Field label="Staff name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      <Field label="Staff phone number" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Button size="sm" disabled={busy || !name.trim() || !phone.trim()} onClick={addStaff}>
        Add sales associate
      </Button>
      {temporaryPassword && (
        <Banner tone="info">
          Temporary password (shown once, give it in person): <strong className="tabular">{temporaryPassword}</strong>
        </Banner>
      )}

      <h3 className="mt-2 text-secondary font-bold uppercase tracking-[0.08em] text-muted">Staff</h3>
      {activeMembers.length === 0 && <p className="text-secondary text-muted">No staff yet.</p>}
      {activeMembers.map((m) => (
        <div key={m.membershipId} className="flex items-center justify-between gap-2">
          <span className="text-body">
            {m.name} · {m.status}
          </span>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => run(`Remove ${m.name}`, () => signedRequest(businessId, `/api/team/${m.membershipId}`, { method: 'DELETE' }))}>
            Remove
          </Button>
        </div>
      ))}

      <h3 className="mt-2 text-secondary font-bold uppercase tracking-[0.08em] text-muted">Phones</h3>
      {activeDevices.map((d) => (
        <div key={d.deviceId} className="flex items-center justify-between gap-2">
          <span className="text-body">
            {d.deviceCode} · {d.name} · {d.person?.name}
            {d.deviceCode === myDeviceCode ? ' (this phone)' : ''}
          </span>
          {d.deviceCode !== myDeviceCode && (
            <Button variant="danger" size="sm" disabled={busy} onClick={() => run(`Remove phone ${d.deviceCode}`, () => signedRequest(businessId, `/api/devices/${d.deviceId}`, { method: 'DELETE' }))}>
              Remove phone
            </Button>
          )}
        </div>
      ))}
      <Button variant="quiet" size="sm" disabled={busy} onClick={refresh}>
        Refresh lists
      </Button>
    </section>
  );
}
