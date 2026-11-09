// The translate function: looks a key up in the chosen language's dictionary and fills in {words}.
// Kept free of React so it can be tested and used by build scripts (the manifest reads 'app.name').
// A 'draft' language may not have every key yet: then the English text is shown (api.md, BE4.5).

import { DEFAULT_LANGUAGE, LANGUAGES } from './languages.js';

const byTag = Object.fromEntries(LANGUAGES.map((l) => [l.tag, l]));

// Finds the text for a key. With `count`, the key is a plural: its form comes from that language's rule
// ('pin.wrong' + 3 → 'pin.wrong.other'). A form this language doesn't have yet falls back to English's form.
function findText(language, key, count) {
  const chosen = byTag[language] ?? byTag[DEFAULT_LANGUAGE];
  const english = byTag[DEFAULT_LANGUAGE];
  if (count === undefined) return chosen.dictionary[key] ?? english.dictionary[key];
  return chosen.dictionary[`${key}.${chosen.pluralForm(count)}`] ?? english.dictionary[`${key}.${english.pluralForm(count)}`];
}

// Returns the text for `key` in `language`, with {name} placeholders replaced from `params`.
// `params.count` selects the plural form and also fills {count}.
// Missing in that language → English; missing everywhere → the key itself (and a warning while
// developing) rather than crashing a sale. `npm run check:i18n` stops missing English keys shipping.
export function translate(language, key, params) {
  let text = findText(language, key, params?.count);
  if (text === undefined) {
    if (import.meta.env?.DEV) console.warn(`Missing text for "${key}"`);
    text = key;
  }
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) => (name in params ? String(params[name]) : whole));
}

// True if English has text for `key` (so a screen can choose a specific message or a general one).
export function hasText(key) {
  return key in byTag[DEFAULT_LANGUAGE].dictionary;
}
