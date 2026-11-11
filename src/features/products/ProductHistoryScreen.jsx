// A product's change history (AC30; api.md GET /api/products/:productId/history): who changed the product or
// its sizes, when, and what changed. Owner and manager (the server leaves cost out of the manager's copy).
// The history lives only on the server, so this screen needs the internet and says so when offline.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useT } from '../../i18n/t.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { businessRequest } from '../../api/business.js';
import { describeFailure } from '../../auth/formErrors.js';
import { formatMoney } from '../../lib/money.js';
import { formatDay, formatTime } from '../../lib/dates.js';
import { hasText } from '../../i18n/translate.js';
import { useCatalog } from './productData.js';
import Screen from '../../components/Screen.jsx';
import Banner from '../../components/Banner.jsx';
import Button from '../../components/Button.jsx';
import StatusChip from '../../components/StatusChip.jsx';

// The fields worth showing, in this order (version and ids are bookkeeping).
const SHOWN = ['name', 'label', 'type', 'unit', 'unitLabel', 'retailMinor', 'wholesaleMinor', 'costMinor', 'isHidden', 'isActive', 'lowStockLevelUnits', 'lowStockWarnings'];

export default function ProductHistoryScreen() {
  const { t } = useT();
  const { productId } = useParams();
  const { openBusiness } = useAuth();
  const catalog = useCatalog(openBusiness?.id);
  const [state, setState] = useState({ loading: true });
  const currency = openBusiness?.currency;
  const product = catalog?.products.find((p) => p.id === productId);
  const sizeLabel = (id) => catalog?.sizes.find((s) => s.id === id)?.label;

  // Loads the history from the server.
  async function load() {
    setState({ loading: true });
    const result = await businessRequest(openBusiness.id, `/api/products/${encodeURIComponent(productId)}/history`);
    if (result.kind === 'ok') setState({ changes: result.data.changes ?? [] });
    else setState({ error: result.kind === 'network' ? t('product.historyOffline') : describeFailure(result, t).form });
  }
  useEffect(() => {
    if (openBusiness?.id) load();
  }, [openBusiness?.id, productId]);

  // Shows one value in words: money formatted, yes/no for switches, empty as a dash.
  const show = (field, value) => {
    if (value == null) return '—';
    if (field.endsWith('Minor')) return formatMoney(value, currency);
    if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
    if (field === 'type') return t(`productType.${value}.label`);
    if (field === 'unit') return t(`product.unit.${value}`);
    return String(value);
  };

  return (
    <Screen title={t('product.history')} subtitle={product?.name} back>
      {state.loading && <Banner tone="info">{t('common.wait')}</Banner>}
      {state.error && (
        <Banner tone="danger" action={<Button variant="secondary" size="sm" onClick={load}>{t('confirm.tryAgain')}</Button>}>
          {state.error}
        </Banner>
      )}
      {state.changes?.length === 0 && <p className="text-body text-ink-2">{t('product.historyNone')}</p>}
      <ul className="flex flex-col gap-2">
        {(state.changes ?? []).map((change, index) => {
          const fields = SHOWN.filter((f) => change.after && f in change.after && (change.before == null || change.before[f] !== change.after[f]));
          return (
            <li key={index} className="flex flex-col gap-1.5 rounded-card bg-paper px-4 py-3">
              <p className="text-item font-semibold">
                {change.entity === 'size' ? t('product.historySize', { size: sizeLabel(change.entityId) ?? change.after?.label ?? '' }) : change.before == null ? t('product.historyAdded') : t('product.historyChanged')}
              </p>
              <p className="text-secondary text-muted">
                {change.changedBy?.name} · {formatDay(change.changedAt, openBusiness.timezone)} {formatTime(change.changedAt, openBusiness.timezone)}
              </p>
              {change.conflict && <StatusChip kind="low" label={t('product.historyConflict')} />}
              {fields.map((f) => (
                <p key={f} className="text-body">
                  <span className="font-semibold">{hasText(`product.field.${f}`) ? t(`product.field.${f}`) : f}: </span>
                  {change.before == null ? show(f, change.after[f]) : `${show(f, change.before[f])} → ${show(f, change.after[f])}`}
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
