// The translate function: looks a key up in the chosen language's dictionary and fills in {words}.
// Kept free of React so it can be tested and used by build scripts (the manifest reads 'app.name').
// A 'draft' language may not have every key yet: then the English text is shown (api.md, BE4.5).

import { DEFAULT_LANGUAGE, LANGUAGES } from './languages.js';

const dictionaries = Object.fromEntries(LANGUAGES.map((l) => [l.tag, l.dictionary]));

// Returns the text for `key` in `language`, with {name} placeholders replaced from `params`.
// Missing in that language → English; missing everywhere → the key itself (and a warning while
// developing) rather than crashing a sale. `npm run check:i18n` stops missing English keys shipping.
export function translate(language, key, params) {
  const dictionary = dictionaries[language] ?? dictionaries[DEFAULT_LANGUAGE];
  let text = dictionary[key] ?? dictionaries[DEFAULT_LANGUAGE][key];
  if (text === undefined) {
    if (import.meta.env?.DEV) console.warn(`Missing text for "${key}"`);
    text = key;
  }
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) => (name in params ? String(params[name]) : whole));
}
