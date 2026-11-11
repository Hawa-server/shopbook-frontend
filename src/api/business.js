// Signed requests to a business endpoint from a screen (for example a product's change history), using
// this phone's key for that business (api.md "Phones and signed requests"). Returns the shared helper's
// result object; without a registered key it returns { kind: 'error', code: 'NO_DEVICE' }.

import { apiRequest } from './client.js';
import { getBusinessDb, getMeta } from '../db/businessDb.js';

export async function businessRequest(businessId, path, options = {}) {
  const device = await getMeta(getBusinessDb(businessId), 'device');
  if (!device) return { kind: 'error', code: 'NO_DEVICE' };
  return apiRequest(path, { ...options, businessId, device });
}
