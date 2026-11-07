// The language picker: one 48px button per language the app has words for (i18n/languages.js).
// They wrap onto more rows as languages are added. The chosen one is green; aria-pressed tells screen
// readers which. Used on Welcome, Create account and More.
//
// `value`/`onChange` are optional: without them it changes this phone's app language directly;
// with them (Create account) it just picks a value for a form.

import { useT } from '../i18n/t.js';
import { LANGUAGE_TAGS } from '../i18n/languages.js';

export default function LanguageSwitch({ value, onChange, label }) {
  const { t, language, setLanguage } = useT();
  const current = value ?? language;
  const choose = onChange ?? setLanguage;
  return (
    <div
      role="group"
      aria-label={label ?? t('language.title')}
      className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-1 rounded-input border-[1.5px] border-input-line bg-ground p-1"
    >
      {LANGUAGE_TAGS.map((code) => {
        const chosen = code === current;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={chosen}
            onClick={() => choose(code)}
            className={`min-h-tap rounded-[9px] px-3 font-bold ${chosen ? 'bg-primary text-paper' : 'text-ink'}`}
          >
            {t(`language.${code}`)}
          </button>
        );
      })}
    </div>
  );
}
