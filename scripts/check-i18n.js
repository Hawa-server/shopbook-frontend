// `npm run check:i18n`: checks every dictionary in src/i18n/languages.js against English.
//
// Fails when:
// - English has an empty text (English is the fallback for every other language);
// - a 'complete' language is missing an English key;
// - any language has a key English doesn't have (a typo, or a text that would never be shown);
// - any language has an empty text;
// - a key's {placeholders} differ from English (a translation missing {n} would drop a number).
// A 'draft' language may miss keys (the app shows English for them): they're listed, not failed.

import { LANGUAGES } from '../src/i18n/languages.js';

const english = LANGUAGES.find((l) => l.tag === 'en')?.dictionary;
if (!english) {
  console.error('English (en) must be in src/i18n/languages.js');
  process.exit(1);
}

// Lists the {placeholders} in a piece of text, sorted, so two languages can be compared.
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const isText = (value) => typeof value === 'string' && value.trim() !== '';

const problems = [];
const notes = [];

for (const [key, text] of Object.entries(english)) {
  if (!isText(text)) problems.push(`en: empty "${key}"`);
}

for (const { tag, status, dictionary } of LANGUAGES) {
  if (tag === 'en') continue;
  const missing = [];
  for (const key of Object.keys(english)) {
    if (!(key in dictionary)) missing.push(key);
  }
  for (const [key, text] of Object.entries(dictionary)) {
    if (!(key in english)) problems.push(`${tag}: "${key}" is not an English key`);
    else if (!isText(text)) problems.push(`${tag}: empty "${key}"`);
    else if (placeholders(text) !== placeholders(english[key])) {
      problems.push(`${tag}: "${key}" placeholders differ (en: {${placeholders(english[key])}}, ${tag}: {${placeholders(text)}})`);
    }
  }
  if (missing.length > 0) {
    if (status === 'complete') problems.push(`${tag} (complete): missing ${missing.map((k) => `"${k}"`).join(', ')}`);
    else notes.push(`${tag} (draft): ${missing.length} key(s) shown in English: ${missing.join(', ')}`);
  }
}

if (notes.length > 0) console.log(notes.join('\n'));
if (problems.length > 0) {
  console.error(`Dictionary problems (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const summary = LANGUAGES.map((l) => `${l.tag} (${l.status}) ${Object.keys(l.dictionary).length}`).join(', ');
console.log(`Dictionaries OK: ${Object.keys(english).length} English keys; ${summary}.`);
