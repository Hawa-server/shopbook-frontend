// Add or edit a product (Epic 1: AC1–AC5, AC7–AC9, AC13–AC19, AC26). Owner and manager only (AC31).
//
// Adding: type, name ("design name" for fabric), unit, sizes (a ready-made range, my own, or none), prices
// (retail required; wholesale optional; cost for the OWNER only, required when she adds: AC17), and starting
// stock: one box per size, and an empty box sends nothing. Editing changes the product itself; sizes are
// managed on the product page. Warnings (wholesale above retail, below cost, a duplicate name) are shown
// as the person types and never block saving (AC4, AC18). Everything is checked here first, so mistakes are
// caught at the stall; the server checks again.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useT } from '../../i18n/t.js';
import { hasText } from '../../i18n/translate.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { loadReference } from '../../api/reference.js';
import { parseQuantity } from '../../lib/quantity.js';
import { formatMoneyPlain } from '../../lib/money.js';
import { useCatalog, productHasStockRecords } from './productData.js';
import { NoShopError, addProduct, editProduct } from './productActions.js';
import {
  FABRIC_UNITS, PRODUCT_TYPES, UNITS, changedFields, checkProductForm, findDuplicateName, parseCustomSizes,
  priceWarnings, sizesFromRange, tidyName, unitScaleOf,
} from './catalog.js';
import FormScreen from '../../components/FormScreen.jsx';
import Field from '../../components/Field.jsx';
import MoneyField, { readMoneyField } from '../../components/MoneyField.jsx';
import Button from '../../components/Button.jsx';
import Banner from '../../components/Banner.jsx';

// The usual unit for each type when the person picks it.
const DEFAULT_UNIT = { clothing: 'piece', shoes: 'pair', fabric: 'piece', other: 'piece' };
const MAX_QUANTITY = 100_000; // in the product's unit (AC15)

// A row of big choice buttons (design.md: 48px, the chosen one green, aria-pressed for screen readers).
function Choice({ label, options, value, onChange, labelOf }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.9375rem] font-semibold">{label}</span>
      <div role="group" aria-label={label} className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`min-h-tap rounded-input border-[1.5px] px-3 font-bold ${value === option ? 'border-primary bg-primary text-paper' : 'border-input-line bg-paper text-ink'}`}
          >
            {labelOf(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

// A small heading and card for each part of the form.
function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4 rounded-summary bg-paper p-4">
      <h2 className="text-secondary font-bold uppercase tracking-[0.08em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

// A native picker, styled like the other fields (52px, visible label).
function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.9375rem] font-semibold">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[3.25rem] rounded-input border-[1.5px] border-input-line bg-paper px-3 text-body">
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ProductFormScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const { productId } = useParams();
  const [params] = useSearchParams();
  const { openBusiness, reference, me } = useAuth();
  const catalog = useCatalog(openBusiness?.id);
  const isOwner = openBusiness?.role === 'owner';
  const currency = openBusiness?.currency;
  const minorUnits = currency?.minorUnits ?? 2;
  const editing = Boolean(productId);
  const existing = editing ? catalog?.products.find((p) => p.id === productId) : null;
  const money = (minor) => (minor == null ? '' : formatMoneyPlain(minor, currency).replaceAll(currency?.groupSeparator ?? ',', ''));

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  // The ready-made size ranges come from GET /api/reference (kept on the phone for offline use).
  useEffect(() => {
    loadReference();
  }, []);
  const ranges = reference?.sizeRanges ?? [];

  // Fill the form once: blank (or with the searched name) to add; from the product to edit.
  useEffect(() => {
    if (form || (editing && !existing)) return;
    setForm(
      existing
        ? { name: existing.name, type: existing.type, unit: existing.unit, unitLabel: existing.unitLabel ?? '', retail: money(existing.retailMinor), wholesale: money(existing.wholesaleMinor), cost: money(existing.costMinor), sizeMode: 'none', rangeCode: '', first: '', last: '', custom: '', opening: {} }
        : { name: params.get('name') ?? '', type: 'clothing', unit: 'piece', unitLabel: '', retail: '', wholesale: '', cost: '', sizeMode: 'range', rangeCode: '', first: '', last: '', custom: '', opening: {} },
    );
  }, [existing, editing, form, params]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const rangesForType = form ? ranges.filter((r) => r.forTypes.includes(form.type)) : [];
  const range = rangesForType.find((r) => r.code === form?.rangeCode) ?? rangesForType[0];

  // The sizes this product will get (adding only).
  const sizeLabels = useMemo(() => {
    if (!form || editing || form.type === 'fabric' || form.sizeMode === 'none') return [];
    if (form.sizeMode === 'custom') return parseCustomSizes(form.custom);
    if (!range) return [];
    return sizesFromRange(range, form.first || range.sizes[0], form.last || range.sizes[range.sizes.length - 1]);
  }, [form, editing, range]);

  if (!form || !catalog) return <FormScreen title={editing ? t('product.edit') : t('product.add')} back />;

  const scale = unitScaleOf(form.unit);
  const prices = {
    retail: readMoneyField(form.retail, currency),
    wholesale: readMoneyField(form.wholesale, currency, { optional: true }),
    cost: readMoneyField(form.cost, currency, { optional: !isOwner || editing }),
  };
  const duplicate = form.name.trim() ? findDuplicateName(catalog.products, form.name, existing?.id) : null;
  const warnings = priceWarnings(
    { retailMinor: prices.retail.ok ? prices.retail.minor : null, wholesaleMinor: prices.wholesale.ok ? prices.wholesale.minor : null, costMinor: isOwner && prices.cost.ok ? prices.cost.minor : null },
    { isOwner },
  );

  // Checks everything, then saves (offline) and opens the product's page.
  async function submit() {
    setFormError(null);
    const found = {};
    for (const [key, result] of Object.entries(prices)) if (!result.ok && (key !== 'cost' || isOwner)) found[`${key}Minor`] = result.error;
    const fields = {
      name: tidyName(form.name),
      type: form.type,
      unit: form.unit,
      unitLabel: form.unit === 'custom' ? form.unitLabel.trim() : undefined,
      retailMinor: prices.retail.ok ? prices.retail.minor : null,
      wholesaleMinor: prices.wholesale.ok ? prices.wholesale.minor : null,
    };
    if (isOwner) fields.costMinor = prices.cost.ok ? prices.cost.minor : null;
    const checks = checkProductForm({ ...fields, sizes: sizeLabels }, { isOwner, isNew: !editing, minorUnits });
    Object.assign(found, Object.fromEntries(Object.entries(checks).filter(([k]) => !found[k])));
    if (!editing && form.sizeMode === 'custom' && sizeLabels.length === 0 && form.type !== 'fabric') found.sizes = 'product.error.noSizes';

    // Starting stock: only boxes with a number; whole units, or whole and half yards (AC15).
    const opening = {};
    for (const label of sizeLabels.length ? sizeLabels : ['']) {
      const text = form.opening[label] ?? '';
      if (text.trim() === '') continue;
      const q = parseQuantity(text, scale);
      if (!q.ok) found[`opening:${label}`] = q.error === 'halfOnly' ? 'quantity.error.halfOnly' : 'quantity.error.format';
      else if (q.units > MAX_QUANTITY * scale) found[`opening:${label}`] = 'quantity.error.tooLarge';
      else if (q.units > 0) opening[label] = q.units;
    }
    if (editing && fields.unit !== existing.unit && (fields.unit === 'yard') !== (existing.unit === 'yard')) {
      if (await productHasStockRecords(openBusiness.id, existing.id)) found.unit = 'product.error.unitLocked';
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      if (editing) {
        const before = { ...existing, unitLabel: existing.unitLabel ?? undefined };
        await editProduct(openBusiness.id, existing, changedFields(before, fields));
        navigate(`/stock/${existing.id}`, { replace: true });
      } else {
        const id = await addProduct(openBusiness.id, { fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)), sizeLabels, opening, locationId: catalog.locationId, userId: me.user.id });
        navigate(`/stock/${id}`, { replace: true });
      }
    } catch (error) {
      setFormError(error instanceof NoShopError ? t('product.error.noShop') : t('errors.unexpected'));
      setBusy(false);
    }
  }

  const err = (key) => (errors[key] ? t(errors[key]) : undefined);
  const units = form.type === 'fabric' ? FABRIC_UNITS : UNITS;

  return (
    <FormScreen
      title={editing ? t('product.edit') : t('product.add')}
      back
      onSubmit={submit}
      actions={
        <>
          {formError && <Banner tone="danger">{formError}</Banner>}
          <Button type="submit" full disabled={busy}>
            {busy ? t('common.wait') : t('common.save')}
          </Button>
        </>
      }
    >
      <Section title={t('product.section.what')}>
        <Choice
          label={t('product.type')}
          options={PRODUCT_TYPES}
          value={form.type}
          labelOf={(v) => t(`productType.${v}.label`)}
          onChange={(type) => set({ type, unit: DEFAULT_UNIT[type], sizeMode: type === 'fabric' || type === 'other' ? 'none' : 'range', rangeCode: '', first: '', last: '' })}
        />
        <Field label={form.type === 'fabric' ? t('product.designName') : t('product.name')} value={form.name} onChange={(e) => set({ name: e.target.value })} error={err('name')} maxLength={80} />
        {duplicate && (
          <Banner tone="info" action={<Button variant="secondary" size="sm" onClick={() => navigate(`/stock/${duplicate.id}`)}>{t('product.openIt')}</Button>}>
            {t('product.warning.PRODUCT_NAME_DUPLICATE')}
          </Banner>
        )}
        <Choice label={t('product.unit')} options={units} value={form.unit} labelOf={(v) => t(`product.unit.${v}`)} onChange={(unit) => set({ unit })} />
        {err('unit') && <Banner tone="danger">{err('unit')}</Banner>}
        {form.unit === 'custom' && <Field label={t('product.unitLabel')} value={form.unitLabel} onChange={(e) => set({ unitLabel: e.target.value })} error={err('unitLabel')} maxLength={20} />}
      </Section>

      {!editing && form.type !== 'fabric' && (
        <Section title={t('product.section.sizes')}>
          <Choice label={t('product.sizes')} options={['range', 'custom', 'none']} value={form.sizeMode} labelOf={(v) => t(`product.sizeMode.${v}`)} onChange={(sizeMode) => set({ sizeMode })} />
          {form.sizeMode === 'range' && (rangesForType.length === 0 ? (
            <p className="text-secondary text-muted">{t('product.noRanges')}</p>
          ) : (
            <>
              <Select label={t('product.range')} value={range?.code ?? ''} onChange={(rangeCode) => set({ rangeCode, first: '', last: '' })} options={rangesForType.map((r) => [r.code, hasText(`sizeRange.${r.code}`) ? t(`sizeRange.${r.code}`) : r.name])} />
              <div className="grid grid-cols-2 gap-3">
                <Select label={t('product.rangeFirst')} value={form.first || range.sizes[0]} onChange={(first) => set({ first })} options={range.sizes.map((s) => [s, s])} />
                <Select label={t('product.rangeLast')} value={form.last || range.sizes[range.sizes.length - 1]} onChange={(last) => set({ last })} options={range.sizes.map((s) => [s, s])} />
              </div>
            </>
          ))}
          {form.sizeMode === 'custom' && <Field label={t('product.customSizes')} hint={t('product.customSizesHint')} value={form.custom} onChange={(e) => set({ custom: e.target.value })} error={err('sizes')} />}
          {err('sizes') && form.sizeMode !== 'custom' && <Banner tone="danger">{err('sizes')}</Banner>}
          {sizeLabels.length > 0 && <p className="text-secondary text-muted">{t('product.sizesPreview', { count: sizeLabels.length, sizes: sizeLabels.join(', ') })}</p>}
        </Section>
      )}

      <Section title={t('product.section.prices')}>
        <MoneyField label={t('product.retail')} currency={currency} value={form.retail} onChange={(retail) => set({ retail })} error={err('retailMinor')} />
        <MoneyField label={t('product.wholesale')} currency={currency} value={form.wholesale} onChange={(wholesale) => set({ wholesale })} error={err('wholesaleMinor')} optional hint={t('product.wholesaleHint')} />
        {isOwner && <MoneyField label={t('product.cost')} currency={currency} value={form.cost} onChange={(cost) => set({ cost })} error={err('costMinor')} optional={editing} hint={t('product.costHint')} />}
        {warnings.map((code) => (
          <Banner key={code} tone="info">
            {t(`product.warning.${code}`)}
          </Banner>
        ))}
      </Section>

      {!editing && (
        <Section title={t('product.section.opening')}>
          <p className="text-secondary text-muted">{t('product.openingHint', { unit: t(`product.unit.${form.unit}`) })}</p>
          {(sizeLabels.length ? sizeLabels : ['']).map((label) => (
            <Field
              key={label || 'only'}
              label={label ? t('product.openingFor', { size: label }) : t('product.openingOne')}
              value={form.opening[label] ?? ''}
              onChange={(e) => set({ opening: { ...form.opening, [label]: e.target.value } })}
              error={err(`opening:${label}`)}
              inputMode="decimal"
              autoComplete="off"
            />
          ))}
        </Section>
      )}
    </FormScreen>
  );
}
