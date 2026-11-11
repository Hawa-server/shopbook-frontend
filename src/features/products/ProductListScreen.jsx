// Stock tab → the product list (FE5; FE6 adds the stock screens on top of it).
// Search as you type (AC22, fast with 2,000 products: AC23), filter by type (AC24), each product's stock and
// retail price; "Not sent yet" on unsent ones; for the owner, "Cost price needed" (AC17); owner and manager
// can show hidden products (AC28) and add products. Sales associates only view (AC31).

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { useCatalog } from './productData.js';
import { PRODUCT_TYPES, activeSizesOf, searchProducts, totalUnits } from './catalog.js';
import { stockStatus } from '../../lib/stockRule.js';
import { quantityText } from './quantityText.js';
import Screen from '../../components/Screen.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';
import MoneyText from '../../components/MoneyText.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';

// The chip for a stock level: never colour alone (design.md §6). Nothing when stock is fine.
export function StockChip({ status }) {
  const { t } = useT();
  if (status === 'belowZero') return <StatusChip kind="attention" label={t('stock.status.belowZero')} />;
  if (status === 'out') return <StatusChip kind="owes" label={t('stock.status.out')} />;
  if (status === 'low') return <StatusChip kind="low" label={t('stock.status.low')} />;
  return null;
}

// One product in the list: a real button that opens the product page.
function ProductRow({ product, units, status, currency, onOpen }) {
  const { t } = useT();
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex min-h-tap w-full items-center gap-3 rounded-card bg-paper px-4 py-3 text-left active:bg-primary-soft">
        <span className="min-w-0 flex-1">
          <span className="block text-item font-semibold">{product.name}</span>
          <span className="block text-secondary text-muted">{t('stock.left', { qty: quantityText(units, product, t) })}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            <StockChip status={status} />
            {product.pending && <StatusChip kind="pending" label={t('sync.notSentYet')} />}
          </span>
        </span>
        <MoneyText minor={product.retailMinor} currency={currency} />
      </button>
    </li>
  );
}

export default function ProductListScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const { openBusiness } = useAuth();
  const catalog = useCatalog(openBusiness?.id);
  const [query, setQuery] = useState('');
  const [type, setType] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const role = openBusiness?.role;
  const canEdit = role === 'owner' || role === 'manager';
  const isOwner = role === 'owner';

  const found = useMemo(() => (catalog ? searchProducts(catalog.products, { query, type, showHidden }) : []), [catalog, query, type, showHidden]);
  const costNeeded = useMemo(() => (isOwner && catalog ? catalog.products.filter((p) => !p.isHidden && p.costMinor == null).length : 0), [catalog, isOwner]);

  const addAction = canEdit ? (
    <Button full onClick={() => navigate('/stock/new')}>
      {t('product.add')}
    </Button>
  ) : null;

  if (!catalog) return <Screen title={t('stock.title')} subtitle={openBusiness?.name} />;
  const noProducts = catalog.products.filter((p) => !p.isHidden).length === 0 && !showHidden;

  return (
    <Screen title={t('stock.title')} subtitle={openBusiness?.name} action={addAction}>
      {costNeeded > 0 && (
        <button type="button" onClick={() => navigate('/stock/cost-needed')} className="flex min-h-tap items-center gap-3 rounded-card bg-low-soft px-4 py-3 text-left font-semibold text-low">
          <Icon name="warning" />
          <span className="flex-1">{t('product.costNeeded', { count: costNeeded })}</span>
          <Icon name="chevron" />
        </button>
      )}

      {noProducts ? (
        <EmptyState icon="box" message={t('product.none')} />
      ) : (
        <>
          <Field label={t('product.find')} value={query} onChange={(e) => setQuery(e.target.value)} type="search" autoComplete="off" />
          <div role="group" aria-label={t('product.type')} className="flex flex-wrap gap-2">
            {[null, ...PRODUCT_TYPES].map((value) => (
              <button
                key={value ?? 'all'}
                type="button"
                aria-pressed={type === value}
                onClick={() => setType(value)}
                className={`min-h-tap rounded-full border-[1.5px] px-4 font-semibold ${type === value ? 'border-primary bg-primary text-paper' : 'border-input-line bg-paper text-ink'}`}
              >
                {value ? t(`productType.${value}.label`) : t('productType.all.label')}
              </button>
            ))}
          </div>
          {canEdit && (
            <Button variant="quiet" size="sm" onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? t('product.showVisible') : t('product.showHidden')}
            </Button>
          )}

          {found.length === 0 ? (
            <EmptyState
              icon="box"
              message={query ? t('product.noMatch', { query: query.trim() }) : t('product.noneHere')}
              actionLabel={canEdit && query.trim() ? t('product.addNamed', { name: query.trim() }) : undefined}
              onAction={() => navigate(`/stock/new?name=${encodeURIComponent(query.trim())}`)}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {found.map((product) => {
                const sizes = activeSizesOf(catalog.sizes, product.id);
                const units = totalUnits(product, sizes, catalog.levels);
                return (
                  <ProductRow
                    key={product.id}
                    product={product}
                    units={units}
                    status={stockStatus(units, product, catalog.threshold)}
                    currency={openBusiness.currency}
                    onOpen={() => navigate(`/stock/${product.id}`)}
                  />
                );
              })}
            </ul>
          )}
        </>
      )}
    </Screen>
  );
}
