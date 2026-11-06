// The Sell screen. FE1 shows its frame and an empty state; the real screen is built in its own task
// (see docs/app-plan.md Tasks). It already reads every word from the dictionaries.

import { useT } from '../../i18n/t.js';
import Screen from '../../components/Screen.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function SellScreen() {
  const { t } = useT();
  return (
    <Screen title={t('sell.title')}>
      <EmptyState icon="bag" message={t('sell.empty')} />
    </Screen>
  );
}
