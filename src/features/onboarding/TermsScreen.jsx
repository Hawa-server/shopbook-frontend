// The privacy notice and terms, when the person hasn't accepted the current version
// (me.terms.accepted false; e.g. a staff member's first sign-in, or new terms). AC37.
// They can read both, must tick the box, then Continue (POST /api/auth/accept-terms with the version shown).

import { useEffect, useState } from 'react';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { acceptTerms, getLegal } from '../../api/auth.js';
import { describeFailure } from '../../auth/formErrors.js';
import FormScreen from '../../components/FormScreen.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';
import Checkbox from '../../components/Checkbox.jsx';
import LegalSheet from './LegalSheet.jsx';

export default function TermsScreen() {
  const { t } = useT();
  const { saveMe, signOutHere } = useAuth();
  const [legal, setLegal] = useState(null);
  const [openDoc, setOpenDoc] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({ fields: {}, form: null });
  const [busy, setBusy] = useState(false);

  // Loads the current texts and their version.
  async function load() {
    const result = await getLegal();
    if (result.kind === 'ok') setLegal(result.data);
    else setErrors(describeFailure(result, t));
  }
  // Load once when the screen opens.
  useEffect(() => {
    load();
  }, []);

  // Records the acceptance of exactly the version that was shown.
  async function submit() {
    if (!accepted) {
      setErrors({ fields: { acceptTerms: t('errors.field.acceptTerms') }, form: null });
      return;
    }
    if (!legal) return load();
    setBusy(true);
    const result = await acceptTerms(legal.version);
    setBusy(false);
    if (result.kind === 'ok') {
      await saveMe(result.data);
    } else {
      if (result.code === 'TERMS_VERSION_MISMATCH') {
        setAccepted(false);
        await load();
      }
      setErrors(describeFailure(result, t, ['acceptTerms']));
    }
  }

  return (
    <FormScreen
      title={t('terms.title')}
      onSubmit={submit}
      actions={
        <>
          {errors.form && <Banner tone="danger">{errors.form}</Banner>}
          <Button type="submit" full disabled={busy || !legal}>
            {busy ? t('common.wait') : t('terms.button')}
          </Button>
          <Button variant="quiet" size="sm" full onClick={signOutHere}>
            {t('account.signOut')}
          </Button>
        </>
      }
    >
      <p className="text-body text-ink-2">{t('terms.lead')}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => setOpenDoc('privacy')} disabled={!legal}>
          {t('signUp.readPrivacy')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpenDoc('terms')} disabled={!legal}>
          {t('signUp.readTerms')}
        </Button>
      </div>
      <Checkbox checked={accepted} onChange={setAccepted} error={errors.fields.acceptTerms}>
        {t('signUp.accept')}
      </Checkbox>
      <LegalSheet legal={legal} doc={openDoc} onClose={() => setOpenDoc(null)} />
    </FormScreen>
  );
}
