// `npm run check:i18n`: checks every dictionary in src/i18n/languages.js against English, and how the code
// uses plurals. The rules are in src/i18n/checkDictionaries.js (with tests).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LANGUAGES } from '../src/i18n/languages.js';
import { checkDictionaries } from '../src/i18n/checkDictionaries.js';

// Finds every t('key', …) in the app's code, sorted into those passing a count and those not.
// (Only literal keys can be checked; keys built at run time are left to the dictionaries' own rules.)
function findUsage(folder) {
  const plural = new Set();
  const plain = new Set();
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) {
      if (name === 'i18n') continue; // the dictionaries and these rules, not screens
      const inner = findUsage(path);
      inner.plural.forEach((k) => plural.add(k));
      inner.plain.forEach((k) => plain.add(k));
    } else if (/\.jsx?$/.test(name) && !name.includes('.test.')) {
      for (const m of readFileSync(path, 'utf8').matchAll(/\bt\(\s*'([\w.]+)'\s*(,\s*\{[^}]*\})?\s*\)/g)) {
        if (/\bcount\b/.test(m[2] ?? '')) plural.add(m[1]);
        else plain.add(m[1]);
      }
    }
  }
  return { plural: [...plural], plain: [...plain] };
}

const { problems, notes } = checkDictionaries(LANGUAGES, findUsage('src'));
if (notes.length > 0) console.log(notes.join('\n'));
if (problems.length > 0) {
  console.error(`Dictionary problems (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const summary = LANGUAGES.map((l) => `${l.tag} (${l.status}) ${Object.keys(l.dictionary).length}`).join(', ');
console.log(`Dictionaries OK: ${Object.keys(LANGUAGES[0].dictionary).length} English keys; ${summary}.`);
