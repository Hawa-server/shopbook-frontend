// More → My account: the person's name, phone (in local form) and email; the "Email not confirmed ·
// Send the link again" notice (AC32, never blocking); links to change the password, phone number or
// email (each asks for the current password, AC36); and Sign out.
//
// Sign out never deletes local records. If any are unsent, it says how many and needs a second
// confirmation (docs/app-plan.md "Storage safety").

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { sendConfirmLink } from '../../api/auth.js';
import { findCountry } from '../../api/reference.js';
import { describeFailure } from '../../auth/formErrors.js';
import { countUnsent } from '../../auth/session.js';
import { formatPhoneLocal } from '../../lib/phone.js';
import Screen from '../../components/Screen.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';
import Icon from '../../components/Icon.jsx';
import Sheet from '../../components/Sheet.jsx';

// One tappable row: a real link-like button with a chevron.
function Row({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-tap w-full items-center gap-3 px-4 py-3 text-left font-semibold active:bg-ground">
      <span className="flex-1">{label}</span>
      <Icon name="chevron" className="text-muted" />
    </button>
  );
}

export default function MyAccountScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { me, openBusiness, reference, signOutHere } = useAuth();
  const [linkMessage, setLinkMessage] = useState(null);
  const [signOutStep, setSignOutStep] = useState(null); // null | { unsent } | { unsent, sure: true }
  const user = me?.user;
  const country = findCountry(reference, openBusiness?.country);

  // "Send the link again".
  async function sendLink() {
    setLinkMessage(null);
    const result = await sendConfirmLink();
    if (result.kind === 'ok') setLinkMessage({ tone: 'success', text: t('account.linkSent') });
    else setLinkMessage({ tone: 'danger', text: describeFailure(result, t).form });
  }

  // First tap: count unsent records and ask. With unsent records, a second, explicit confirmation.
  async function askSignOut() {
    const unsent = await countUnsent((me?.businesses ?? []).map((b) => b.id));
    setSignOutStep({ unsent, sure: false });
  }
  async function confirmSignOut() {
    if (signOutStep.unsent > 0 && !signOutStep.sure) {
      setSignOutStep({ ...signOutStep, sure: true });
      return;
    }
    setSignOutStep(null);
    await signOutHere();
    navigate('/welcome', { replace: true });
  }

  if (!user) return null;
  return (
    <Screen title={t('account.title')} back>
      {location.state?.done && <Banner tone="success">{t(`account.done.${location.state.done}`)}</Banner>}

      <section className="flex flex-col gap-1 rounded-summary bg-paper p-4">
        <p className="text-item font-bold">{user.name}</p>
        <p className="tabular text-body text-ink-2">{formatPhoneLocal(user.phone, country)}</p>
        <p className="text-body text-ink-2 break-all">{user.email ?? t('account.noEmail')}</p>
      </section>

      {user.email && !user.emailConfirmed && !user.pendingEmail && (
        <Banner
          tone="info"
          action={
            <Button variant="secondary" size="sm" onClick={sendLink}>
              {t('account.sendLink')}
            </Button>
          }
        >
          {t('account.notConfirmed')}
        </Banner>
      )}
      {user.pendingEmail && (
        <Banner
          tone="info"
          action={
            <Button variant="secondary" size="sm" onClick={sendLink}>
              {t('account.sendLink')}
            </Button>
          }
        >
          {t('account.pendingEmail', { email: user.pendingEmail })}
        </Banner>
      )}
      {linkMessage && <Banner tone={linkMessage.tone}>{linkMessage.text}</Banner>}

      <section className="divide-y divide-line overflow-hidden rounded-summary bg-paper">
        <Row label={t('account.changePassword')} onClick={() => navigate('/more/account/password')} />
        <Row label={t('account.changePhone')} onClick={() => navigate('/more/account/phone')} />
        <Row label={user.email ? t('account.changeEmail') : t('account.addEmail')} onClick={() => navigate('/more/account/email')} />
      </section>

      <Button variant="danger" full onClick={askSignOut}>
        {t('account.signOut')}
      </Button>

      <Sheet
        open={signOutStep !== null}
        title={t('account.signOutTitle')}
        onClose={() => setSignOutStep(null)}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSignOutStep(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={confirmSignOut}>
              {signOutStep?.unsent > 0 && !signOutStep?.sure ? t('account.signOutAnyway') : t('account.signOut')}
            </Button>
          </div>
        }
      >
        {signOutStep?.unsent > 0 ? (
          <Banner tone="danger">
            {signOutStep.sure ? t('account.signOutSure', { count: signOutStep.unsent }) : t('account.signOutUnsent', { count: signOutStep.unsent })}
          </Banner>
        ) : (
          <p className="text-body">{t('account.signOutText')}</p>
        )}
      </Sheet>
    </Screen>
  );
}
