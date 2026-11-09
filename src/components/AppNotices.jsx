// The notices shown under the header of every tab screen (Screen.jsx puts them there, so the header
// always stays at the very top): a business's data removed from this phone, the session ended, this phone
// needing to be registered, and "update the app".

import { useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useT } from '../i18n/t.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useSync } from '../sync/SyncProvider.jsx';
import { appDb } from '../db/appDb.js';
import Banner from './Banner.jsx';
import Button from './Button.jsx';

// "Your sign-in has ended": shown above every tab until the person signs in again.
function SessionEndedBanner() {
  const { t } = useT();
  const navigate = useNavigate();
  return (
    <div>
      <Banner
        tone="info"
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate('/sign-in', { state: { reason: 'sessionEnded' } })}>
            {t('session.signInAgain')}
          </Button>
        }
      >
        {t('session.ended')}
      </Banner>
    </div>
  );
}

// The notice left after a business's data was removed from this phone (ACCESS_REMOVED / DEVICE_REVOKED),
// saying honestly how many unsent records went with it. Stays until the person taps "OK".
export function WipeNotice() {
  const { t } = useT();
  const notice = useLiveQuery(async () => (await appDb.kv.get('notice'))?.value ?? null, []);
  if (!notice) return null;
  const main = t(notice.kind === 'deviceRevoked' ? 'wipe.deviceRevoked' : 'wipe.accessRemoved', { business: notice.businessName });
  return (
    <div>
      <Banner
        tone="danger"
        action={
          <Button variant="secondary" size="sm" onClick={() => appDb.kv.delete('notice')}>
            {t('common.ok')}
          </Button>
        }
      >
        {main} {notice.unsent > 0 ? t('wipe.unsentLost', { count: notice.unsent }) : ''}
      </Banner>
    </div>
  );
}

// "Register this phone to send your records": shown when this phone has no key for the open business.
function RegisterBanner() {
  const { t } = useT();
  const navigate = useNavigate();
  return (
    <div>
      <Banner
        tone="info"
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate('/register-phone')}>
            {t('register.button')}
          </Button>
        }
      >
        {t('register.banner')}
      </Banner>
    </div>
  );
}

// All the notices that apply right now, in order of importance.
export default function AppNotices() {
  const { t } = useT();
  const { sessionEnded } = useAuth();
  const { needsRegistration, updateApp } = useSync();
  return (
    <>
      <WipeNotice />
      {sessionEnded && <SessionEndedBanner />}
      {!sessionEnded && needsRegistration && <RegisterBanner />}
      {updateApp && <Banner tone="danger">{t('syncStatus.updateApp')}</Banner>}
    </>
  );
}
