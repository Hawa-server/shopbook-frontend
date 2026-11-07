// Invitations (api.md me.invitations, BE3): businesses that invited this person because their phone
// number already had an account. One card each: "[business] invited you to join as [role]" with Accept and
// Decline. "Decide later" is offered only when the person already has a business to open.

import { useState } from 'react';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { answerInvitation } from '../../api/auth.js';
import { describeFailure } from '../../auth/formErrors.js';
import FormScreen from '../../components/FormScreen.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

export default function InvitationsScreen() {
  const { t } = useT();
  const { me, saveMe, refreshMe, setInvitationsLater, signOutHere } = useAuth();
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState({});
  const hasBusiness = (me?.businesses?.length ?? 0) > 0;

  // Accepts or declines one invitation; the server's new `me` replaces the phone's copy.
  async function answer(membershipId, accept) {
    setBusyId(membershipId);
    const result = await answerInvitation(membershipId, accept);
    setBusyId(null);
    if (result.kind === 'ok') {
      await saveMe(result.data);
    } else if (result.code === 'NOT_FOUND') {
      await refreshMe(); // already answered, or cancelled by the owner: just refresh the list
    } else {
      setErrors((e) => ({ ...e, [membershipId]: describeFailure(result, t).form }));
    }
  }

  return (
    <FormScreen
      title={t('invitations.title')}
      actions={
        hasBusiness ? (
          <Button variant="secondary" full onClick={() => setInvitationsLater(true)}>
            {t('invitations.later')}
          </Button>
        ) : (
          <Button variant="quiet" size="sm" full onClick={signOutHere}>
            {t('account.signOut')}
          </Button>
        )
      }
    >
      {(me?.invitations ?? []).map((inv) => (
        <section key={inv.membershipId} className="flex flex-col gap-3 rounded-summary bg-paper p-4">
          <p className="text-item font-semibold">
            {t('invitations.text', { business: inv.businessName, role: t(`role.${inv.role}`) })}
          </p>
          {errors[inv.membershipId] && <Banner tone="danger">{errors[inv.membershipId]}</Banner>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" disabled={busyId !== null} onClick={() => answer(inv.membershipId, false)}>
              {t('invitations.decline')}
            </Button>
            <Button size="sm" disabled={busyId !== null} onClick={() => answer(inv.membershipId, true)}>
              {t('invitations.accept')}
            </Button>
          </div>
        </section>
      ))}
    </FormScreen>
  );
}
