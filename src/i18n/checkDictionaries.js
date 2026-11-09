// The rules behind `npm run check:i18n`, as a plain function so they can be tested with broken dictionaries.
// Everything is compared with English, the reference and the fallback.
//
// Fails when:
// - English has an empty text;
// - a 'complete' language is missing an English key;
// - any language has a key English doesn't have, or an empty text;
// - a key's {placeholders} differ from English (a translation missing {count} would drop a number);
// - a plural text is missing one of its language's forms ('pin.wrong.one' without 'pin.wrong.other'),
//   even in a draft language: half a plural would show one count in Twi and another in English;
// - code asks for a plural (t('x', { count })) that has no plural forms, or uses a plural key without count.
// A 'draft' language may miss whole texts (the app shows English for them): they're listed, not failed.

const PLURAL_SUFFIX = /\.(zero|one|two|few|many|other)$/;

// Lists the {placeholders} in a text, sorted, so two languages can be compared.
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const isText = (value) => typeof value === 'string' && value.trim() !== '';

// The plural bases in a dictionary: 'pin.wrong.one' and 'pin.wrong.other' → 'pin.wrong'.
export function pluralBases(dictionary) {
  return new Set(Object.keys(dictionary).filter((k) => PLURAL_SUFFIX.test(k)).map((k) => k.replace(PLURAL_SUFFIX, '')));
}

// `languages`: as in languages.js. `usage`: optional { plural: [keys], plain: [keys] } found in the code.
// Returns { problems, notes }.
export function checkDictionaries(languages, usage = { plural: [], plain: [] }) {
  const problems = [];
  const notes = [];
  const reference = languages.find((l) => l.tag === 'en');
  if (!reference) return { problems: ['English (en) must be in the list of languages'], notes };
  const english = reference.dictionary;
  const englishBases = pluralBases(english);

  for (const { tag, status, dictionary, pluralForms } of languages) {
    const bases = pluralBases(dictionary);
    // A language with any form of a plural must have all of its own forms.
    for (const base of tag === 'en' ? englishBases : bases) {
      for (const form of pluralForms) {
        if (!isText(dictionary[`${base}.${form}`])) problems.push(`${tag}: plural "${base}" is missing its "${form}" form`);
      }
    }
    if (tag === 'en') {
      for (const [key, text] of Object.entries(english)) if (!isText(text)) problems.push(`en: empty "${key}"`);
      continue;
    }
    const missing = Object.keys(english).filter((key) => !(key in dictionary));
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

  for (const key of usage.plural) {
    if (!englishBases.has(key)) problems.push(`code: t('${key}', { count }) but English has no plural forms for it`);
  }
  for (const key of usage.plain) {
    if (englishBases.has(key)) problems.push(`code: t('${key}') without a count, but it is a plural`);
  }
  return { problems, notes };
}
