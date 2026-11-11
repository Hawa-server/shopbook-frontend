// One product's page: its prices (cost for the owner only: AC20), its sizes in their natural order with each
// one's stock and own price (AC12, AC19), and the actions for owner and manager (AC31): Edit, a size's prices,
// Add size (AC10), Remove size only at 0 stock (AC11), Hide / Show (AC27, AC28; never deleted: AC29) and
// History (AC30). Also the server's warnings that arrived after syncing (e.g. a product with the same name
// added on another phone). Sales associates see the product and its selling prices only.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { parseQuantity } from '../../lib/quantity.js';
import { formatMoneyPlain } from '../../lib/money.js';
import { stockStatus } from '../../lib/stockRule.js';
import { dismissWarning, useCatalog } from './productData.js';
import { NoShopError, addSize, editSize, removeSize, setProductHidden } from './productActions.js';
import { activeSizesOf, priceWarnings, sellingPrice, totalUnits } from './catalog.js';
import { quantityText } from './quantityText.js';
import { StockChip } from './ProductListScreen.jsx';
import Screen from '../../components/Screen.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';
import Field from '../../components/Field.jsx';
import MoneyText from '../../components/MoneyText.jsx';
import MoneyField, { readMoneyField } from '../../components/MoneyField.jsx';
import Sheet from '../../components/Sheet.jsx';
import StatusChip from '../../components/StatusChip.jsx';

// One label and value line.
function Line({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-secondary text-muted">{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function ProductScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { openBusiness, me } = useAuth();
  const catalog = useCatalog(openBusiness?.id);
  const role = openBusiness?.role;
  const canEdit = role === 'owner' || role === 'manager';
  const isOwner = role === 'owner';
  const currency = openBusiness?.currency;
  const [sheet, setSheet] = useState(null); // null | { kind: 'prices', size } | { kind: 'addSize' } | { kind: 'remove', size, units }
  const [message, setMessage] = useState(null);

  const product = catalog?.products.find((p) => p.id === productId);
  if (!catalog) return <Screen title="" back />;
  if (!product) {
    return (
      <Screen title={t('product.title')} back>
        <Banner tone="info">{t('product.notFound')}</Banner>
      </Screen>
    );
  }
  const sizes = activeSizesOf(catalog.sizes, product.id);
  const levels = catalog.levels;
  const total = totalUnits(product, sizes, levels);
  const warning = catalog.warnings.get(product.id);

  return (
    <Screen title={product.name} subtitle={t(`productType.${product.type}.label`)} back>
      {message && <Banner tone={message.tone}>{message.text}</Banner>}
      {product.isHidden && <Banner tone="info">{t('product.hiddenNote')}</Banner>}
      {warning && (
        <Banner
          tone="info"
          action={
            <div className="flex flex-wrap gap-2">
              {warning.warnings.find((w) => w.productId) && (
                <Button variant="secondary" size="sm" onClick={() => navigate(`/stock/${warning.warnings.find((w) => w.productId).productId}`)}>
                  {t('product.openIt')}
                </Button>
              )}
              <Button variant="quiet" size="sm" onClick={() => dismissWarning(openBusiness.id, product.id)}>
                {t('common.ok')}
              </Button>
            </div>
          }
        >
          {warning.warnings.map((w) => t(`product.warning.${w.code}`)).join(' ')}
        </Banner>
      )}

      <section className="flex flex-col rounded-summary bg-paper p-4">
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <StockChip status={stockStatus(total, product, catalog.threshold)} />
          {product.pending && <StatusChip kind="pending" label={t('sync.notSentYet')} />}
        </div>
        <Line label={t('product.inStock')}>
          <strong className="tabular">{quantityText(total, product, t)}</strong>
        </Line>
        <Line label={t('product.retail')}>
          <MoneyText minor={product.retailMinor} currency={currency} />
        </Line>
        <Line label={t('product.wholesale')}>
          {product.wholesaleMinor == null ? <span className="text-secondary text-muted">{t('product.sameAsRetail')}</span> : <MoneyText minor={product.wholesaleMinor} currency={currency} />}
        </Line>
        {isOwner && (
          <Line label={t('product.cost')}>
            {product.costMinor == null ? <StatusChip kind="low" label={t('product.costMissing')} /> : <MoneyText minor={product.costMinor} currency={currency} />}
          </Line>
        )}
      </section>

      {sizes.length > 0 && (
        <>
          <h2 className="mt-1 text-secondary font-bold uppercase tracking-[0.08em] text-muted">{t('product.section.sizes')}</h2>
          <ul className="flex flex-col gap-2">
            {sizes.map((size) => {
              const units = levels.get(`${product.id}:${size.id}`) ?? 0;
              const ownPrice = size.retailMinor != null || size.wholesaleMinor != null;
              return (
                <li key={size.id} className="flex flex-col gap-2 rounded-card bg-paper px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-item font-bold">{size.label}</span>
                    <MoneyText minor={sellingPrice(product, size)} currency={currency} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-secondary text-muted">
                    <span>{t('stock.left', { qty: quantityText(units, product, t) })}</span>
                    <StockChip status={stockStatus(units, product, catalog.threshold)} />
                    {ownPrice && <span>· {t('product.ownPrice')}</span>}
                    {size.pending && <StatusChip kind="pending" label={t('sync.notSentYet')} />}
                  </div>
                  {canEdit && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setSheet({ kind: 'prices', size })}>
                        {t('product.sizePrices')}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setSheet({ kind: 'remove', size, units })}>
                        {t('product.removeSize')}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="secondary" full onClick={() => navigate(`/stock/${product.id}/edit`)}>
            {t('product.edit')}
          </Button>
          {product.type !== 'fabric' && (
            <Button variant="secondary" full onClick={() => setSheet({ kind: 'addSize' })}>
              {t('product.addSize')}
            </Button>
          )}
          <Button variant="secondary" full onClick={() => navigate(`/stock/${product.id}/history`)}>
            {t('product.history')}
          </Button>
          <Button
            variant="quiet"
            full
            onClick={async () => {
              await setProductHidden(openBusiness.id, product, !product.isHidden);
              setMessage({ tone: 'success', text: product.isHidden ? t('product.shownAgain') : t('product.hidden') });
            }}
          >
            {product.isHidden ? t('product.show') : t('product.hide')}
          </Button>
        </div>
      )}

      {sheet?.kind === 'prices' && (
        <SizePricesSheet size={sheet.size} product={product} isOwner={isOwner} currency={currency} businessId={openBusiness.id} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'addSize' && (
        <AddSizeSheet
          product={product}
          sizes={sizes}
          businessId={openBusiness.id}
          locationId={catalog.locationId}
          userId={me.user.id}
          onClose={() => setSheet(null)}
          onDone={(text) => setMessage({ tone: 'success', text })}
        />
      )}
      {sheet?.kind === 'remove' && (
        <Sheet
          open
          title={t('product.removeSizeTitle', { size: sheet.size.label })}
          onClose={() => setSheet(null)}
          footer={
            sheet.units === 0 ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSheet(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    await removeSize(openBusiness.id, sheet.size);
                    setSheet(null);
                    setMessage({ tone: 'success', text: t('product.sizeRemoved', { size: sheet.size.label }) });
                  }}
                >
                  {t('product.removeSize')}
                </Button>
              </div>
            ) : (
              <Button variant="secondary" full onClick={() => setSheet(null)}>
                {t('common.ok')}
              </Button>
            )
          }
        >
          {sheet.units === 0 ? <p className="text-body">{t('product.removeSizeText')}</p> : <Banner tone="danger">{t('product.sizeHasStock', { qty: quantityText(sheet.units, product, t) })}</Banner>}
        </Sheet>
      )}
    </Screen>
  );
}

// A size's own prices (AC19). Empty means "use the product's price". Cost for the owner only.
function SizePricesSheet({ size, product, isOwner, currency, businessId, onClose }) {
  const { t } = useT();
  const text = (minor) => (minor == null ? '' : formatMoneyPlain(minor, currency).replaceAll(currency.groupSeparator, ''));
  const [retail, setRetail] = useState(text(size.retailMinor));
  const [wholesale, setWholesale] = useState(text(size.wholesaleMinor));
  const [cost, setCost] = useState(text(size.costMinor));
  const [errors, setErrors] = useState({});
  const read = { retail: readMoneyField(retail, currency, { optional: true }), wholesale: readMoneyField(wholesale, currency, { optional: true }), cost: readMoneyField(cost, currency, { optional: true }) };
  const warnings = priceWarnings(
    { retailMinor: read.retail.minor ?? product.retailMinor, wholesaleMinor: read.wholesale.minor ?? product.wholesaleMinor, costMinor: isOwner ? (read.cost.minor ?? product.costMinor) : null },
    { isOwner },
  );

  // Sends only the prices that changed.
  async function save() {
    const found = {};
    for (const [key, r] of Object.entries(read)) if (!r.ok && (key !== 'cost' || isOwner)) found[key] = t(r.error);
    setErrors(found);
    if (Object.keys(found).length) return;
    const fields = {};
    if (read.retail.minor !== (size.retailMinor ?? null)) fields.retailMinor = read.retail.minor;
    if (read.wholesale.minor !== (size.wholesaleMinor ?? null)) fields.wholesaleMinor = read.wholesale.minor;
    if (isOwner && read.cost.minor !== (size.costMinor ?? null)) fields.costMinor = read.cost.minor;
    await editSize(businessId, size, fields);
    onClose();
  }

  return (
    <Sheet open title={t('product.sizePricesTitle', { size: size.label })} onClose={onClose} footer={<Button full onClick={save}>{t('common.save')}</Button>}>
      <div className="flex flex-col gap-4">
        <p className="text-secondary text-muted">{t('product.sizePricesHint')}</p>
        <MoneyField label={t('product.retail')} currency={currency} value={retail} onChange={setRetail} error={errors.retail} optional />
        <MoneyField label={t('product.wholesale')} currency={currency} value={wholesale} onChange={setWholesale} error={errors.wholesale} optional />
        {isOwner && <MoneyField label={t('product.cost')} currency={currency} value={cost} onChange={setCost} error={errors.cost} optional />}
        {warnings.map((code) => (
          <Banner key={code} tone="info">
            {t(`product.warning.${code}`)}
          </Banner>
        ))}
      </div>
    </Sheet>
  );
}

// Adds a size to the product (AC10), after its current sizes, with an optional quantity as new stock.
function AddSizeSheet({ product, sizes, businessId, locationId, userId, onClose, onDone }) {
  const { t } = useT();
  const [label, setLabel] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState({});

  async function save() {
    const found = {};
    const tidy = label.trim().replace(/\s+/g, ' ');
    if (!tidy || tidy.length > 20) found.label = t('product.error.sizeLabel');
    else if (sizes.some((s) => s.label.toLowerCase() === tidy.toLowerCase())) found.label = t('product.warning.SIZE_LABEL_DUPLICATE');
    else if (sizes.length >= 60) found.label = t('product.error.tooManySizes');
    let units = 0;
    if (quantity.trim()) {
      const q = parseQuantity(quantity, product.unitScale ?? 1);
      if (!q.ok) found.quantity = t(q.error === 'halfOnly' ? 'quantity.error.halfOnly' : 'quantity.error.format');
      else units = q.units;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    const sortOrder = sizes.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1;
    try {
      await addSize(businessId, { product, label: tidy, sortOrder, units, locationId, userId });
      onDone(t('product.sizeAdded', { size: tidy }));
      onClose();
    } catch (error) {
      setErrors({ quantity: error instanceof NoShopError ? t('product.error.noShop') : t('errors.unexpected') });
    }
  }

  return (
    <Sheet open title={t('product.addSize')} onClose={onClose} footer={<Button full onClick={save}>{t('common.save')}</Button>}>
      <div className="flex flex-col gap-4">
        <Field label={t('product.sizeLabel')} value={label} onChange={(e) => setLabel(e.target.value)} error={errors.label} maxLength={20} />
        <Field label={t('product.sizeQuantity')} hint={t('field.optional')} value={quantity} onChange={(e) => setQuantity(e.target.value)} error={errors.quantity} inputMode="decimal" />
      </div>
    </Sheet>
  );
}
