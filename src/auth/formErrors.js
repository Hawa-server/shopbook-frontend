// Turns a failed account request into words for a form: one message per field (shown under it) and an
// optional message for the whole form (shown above the main button). Decides from the error CODE only,
// never the server's wording (api.md "Errors"), and shows the app's own translated text.

import { ACTION, whatToDo } from '../api/errors.js';
import { hasText } from '../i18n/translate.js';

// Codes whose message belongs under one field, whatever `fields` says.
const FIELD_FOR_CODE = {
  PHONE_TAKEN: ['phone', 'newPhone'],
  EMAIL_TAKEN: ['email', 'newEmail'],
  WRONG_PASSWORD: ['currentPassword'],
};

// `result`: from apiRequest. `t`: the translate function. `formFields`: the field names on this form
// (so a message for a field the form doesn't show goes to the whole form instead).
// Returns { fields: { name: text }, form: text | null }.
export function describeFailure(result, t, formFields = []) {
  const fields = {};
  let form = null;
  const action = whatToDo(result);

  if (result.kind === 'network') {
    form = t(result.reason === 'offline' ? 'errors.offline' : 'errors.temporary');
  } else if (action === ACTION.TEMPORARY) {
    form = t('errors.temporary');
  } else if (action === ACTION.WAIT) {
    form = t('errors.rateLimited');
  } else if (FIELD_FOR_CODE[result.code]) {
    const field = FIELD_FOR_CODE[result.code].find((f) => formFields.includes(f));
    const text = t(`errors.code.${result.code}`);
    if (field) fields[field] = text;
    else form = text;
  } else if (result.code === 'VALIDATION_FAILED') {
    for (const name of Object.keys(result.fields ?? {})) {
      const key = `errors.field.${name}`;
      const text = t(hasText(key) ? key : 'errors.field.generic');
      if (formFields.includes(name)) fields[name] = text;
      else form = text;
    }
    if (!form && Object.keys(fields).length === 0) form = t('errors.field.generic');
  } else if (result.code && hasText(`errors.code.${result.code}`)) {
    form = t(`errors.code.${result.code}`);
  } else {
    form = t('errors.unexpected');
  }
  return { fields, form };
}
