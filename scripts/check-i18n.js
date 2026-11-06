// `npm run check:i18n`: fails if the English and Twi dictionaries don't have exactly the same keys,
// if any text is empty, or if a key's {placeholders} differ between the languages
// (a missing {n} in Twi would silently drop a number from the screen).

import en from '../src/i18n/en.js';
import tw from '../src/i18n/tw.js';

const dictionaries = { en, tw };
const problems = [];

// Lists the {placeholders} in a piece of text, sorted, so two languages can be compared.
function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
}

const allKeys = new Set(Object.values(dictionaries).flatMap((d) => Object.keys(d)));
for (const key of [...allKeys].sort()) {
  for (const [language, dictionary] of Object.entries(dictionaries)) {
    const text = dictionary[key];
    if (text === undefined) problems.push(`${language}: missing "${key}"`);
    else if (typeof text !== 'string' || text.trim() === '') problems.push(`${language}: empty "${key}"`);
  }
  if (typeof en[key] === 'string' && typeof tw[key] === 'string' && placeholders(en[key]) !== placeholders(tw[key])) {
    problems.push(`"${key}": placeholders differ (en: {${placeholders(en[key])}}, tw: {${placeholders(tw[key])}})`);
  }
}

if (problems.length > 0) {
  console.error(`Dictionary problems (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Dictionaries match: ${allKeys.size} keys in English and Twi.`);
