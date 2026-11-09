// The languages the app has words for: the ONE list to change when a language is added.
//
// Adding a language = a new dictionary file (copy en.js, translate the values) + one line here.
// `status` follows api.md's GET /api/reference: 'complete' languages must have every English key
// (checked by `npm run check:i18n`); a 'draft' language may miss keys, and English is shown for those.
// English is the reference and the fallback, so it must stay first and complete.
//
// Plurals: a counted text has one key per form, e.g. 'pin.wrong.one' and 'pin.wrong.other', and screens call
// t('pin.wrong', { count: 3 }). Each language lists its `pluralForms` and how a count picks one
// (`pluralForm`), because languages differ; a future language can have more forms than these two.

import en from './en.js';
import tw from './tw.js';

const oneOrOther = (count) => (count === 1 ? 'one' : 'other');

export const LANGUAGES = [
  { tag: 'en', status: 'complete', dictionary: en, pluralForms: ['one', 'other'], pluralForm: oneOrOther },
  { tag: 'tw', status: 'draft', dictionary: tw, pluralForms: ['one', 'other'], pluralForm: oneOrOther }, // for a Twi speaker to confirm
];

export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_TAGS = LANGUAGES.map((l) => l.tag);
