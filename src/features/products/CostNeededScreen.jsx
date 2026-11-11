// The owner's "Cost price needed" list (AC17): products with no cost price yet (for example added by a
// manager, who can't see or set costs). Tapping one opens its edit form to add the cost. Only the owner's
// phone ever receives cost prices (AC20), so only she sees this list.

import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { useCatalog } from './productData.js';
import { searchProducts } from './catalog.js';
import Screen from '../../components/Screen.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import MoneyText from '../../components/MoneyText.jsx';
import Icon from '../../components/Icon.jsx';

export default function CostNeededScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const { openBusiness } = useAuth();
  const catalog = useCatalog(openBusiness?.id);
  if (openBusiness?.role !== 'owner') return <Screen title={t('product.costNeededTitle')} back />;
  const products = catalog ? searchProducts(catalog.products, {}).filter((p) => p.costMinor == null) : [];
  return (
    <Screen title={t('product.costNeededTitle')} subtitle={openBusiness.name} back>
      <p className="text-body text-ink-2">{t('product.costNeededLead')}</p>
      {catalog && products.length === 0 ? (
        <EmptyState icon="check" message={t('product.costNeededNone')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((product) => (
            <li key={product.id}>
              <button type="button" onClick={() => navigate(`/stock/${product.id}/edit`)} className="flex min-h-tap w-full items-center gap-3 rounded-card bg-paper px-4 py-3 text-left active:bg-primary-soft">
                <span className="flex-1 text-item font-semibold">{product.name}</span>
                <MoneyText minor={product.retailMinor} currency={openBusiness.currency} />
                <Icon name="chevron" className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
