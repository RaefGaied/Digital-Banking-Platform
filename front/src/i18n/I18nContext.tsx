import { useMemo, useState } from 'react';
import { translations, type Locale, type TranslationKey } from './translations';
import { I18nContext } from './context';
import type { I18nContextValue } from './context';

const STORAGE_KEY = 'locale';

function resolveTranslation(locale: Locale, key: TranslationKey): string {
  const [group, item] = key.split('.') as [keyof typeof translations.en, string];
  const table = translations[locale][group] as Record<string, string>;
  const value = table[item];

  if (value) {
    return value;
  }

  const fallback = translations.en[group] as Record<string, string>;
  return fallback[item] || key;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'fr' ? 'fr' : 'en';
  });

  const setLocale = (nextLocale: Locale) => {
    localStorage.setItem(STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
  };

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (key: TranslationKey) => resolveTranslation(locale, key),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
