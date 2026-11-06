// The languages the app has words for: the ONE list to change when a language is added.
//
// Adding a language = a new dictionary file (copy en.js, translate the values) + one line here.
// `status` follows api.md's GET /api/reference: 'complete' languages must have every English key
// (checked by `npm run check:i18n`); a 'draft' language may miss keys, and English is shown for those.
// English is the reference and the fallback, so it must stay first and complete.

import en from './en.js';
import tw from './tw.js';

export const LANGUAGES = [
  { tag: 'en', status: 'complete', dictionary: en },
  { tag: 'tw', status: 'draft', dictionary: tw },
];

export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_TAGS = LANGUAGES.map((l) => l.tag);
