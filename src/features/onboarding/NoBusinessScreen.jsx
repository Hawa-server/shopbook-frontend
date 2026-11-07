// Shown when the person is signed in but no longer belongs to any business (me.businesses empty and no
// invitation waiting), e.g. the owner removed them everywhere. They can only sign out.

import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import FormScreen from '../../components/FormScreen.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

export default function NoBusinessScreen() {
  const { t } = useT();
  const { signOutHere } = useAuth();
  return (
    <FormScreen
      title={t('app.name')}
      actions={
        <Button variant="secondary" full onClick={signOutHere}>
          {t('account.signOut')}
        </Button>
      }
    >
      <Banner tone="info">{t('noBusiness.text')}</Banner>
    </FormScreen>
  );
}
