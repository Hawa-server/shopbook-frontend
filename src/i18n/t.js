// The t() helper for screens: gives every component the chosen language and a t(key, params) function.
//
// The language is stored in the shared `shopbook-app` database, so it survives closing the app and
// works offline. Changing it re-renders every screen at once (a live query), which is how
// "switching language changes every word on screen" works.

import { createContext, createElement, useCallback, useContext, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { appDb, setAppValue } from '../db/appDb.js';
import { DEFAULT_LANGUAGE, LANGUAGES, translate } from './translate.js';

const LanguageContext = createContext(null);

// Wraps the app: reads the saved language and provides { language, setLanguage, t } to every screen.
export function LanguageProvider({ children }) {
  const saved = useLiveQuery(() => appDb.kv.get('language'), []);
  const language = LANGUAGES.includes(saved?.value) ? saved.value : DEFAULT_LANGUAGE;

  // Keeps <html lang> right, so screen readers pronounce the words in the right language.
  useEffect(() => {
    document.documentElement.lang = language === 'tw' ? 'tw' : 'en';
  }, [language]);

  const setLanguage = useCallback((next) => {
    if (!LANGUAGES.includes(next)) throw new Error(`Unknown language ${next}`);
    return setAppValue('language', next);
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t: (key, params) => translate(language, key, params) }),
    [language, setLanguage],
  );
  return createElement(LanguageContext.Provider, { value }, children);
}

// Returns { t, language, setLanguage } for the current screen.
export function useT() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useT must be used inside <LanguageProvider>');
  return value;
}
