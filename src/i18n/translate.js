// The translate function: looks a key up in the chosen language's dictionary and fills in {words}.
// Kept free of React so it can be tested and used by build scripts (the manifest reads 'app.name').

import en from './en.js';
import tw from './tw.js';

export const dictionaries = { en, tw };
export const LANGUAGES = ['en', 'tw'];
export const DEFAULT_LANGUAGE = 'en';

// Returns the text for `key` in `language`, with {name} placeholders replaced from `params`.
// A missing key shows the key itself (and warns while developing) rather than crashing a sale;
// `npm run check:i18n` is what stops missing keys from shipping.
export function translate(language, key, params) {
  const dictionary = dictionaries[language] ?? dictionaries[DEFAULT_LANGUAGE];
  let text = dictionary[key];
  if (text === undefined) {
    if (import.meta.env?.DEV) console.warn(`Missing text for "${key}" in ${language}`);
    text = dictionaries[DEFAULT_LANGUAGE][key] ?? key;
  }
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) => (name in params ? String(params[name]) : whole));
}
