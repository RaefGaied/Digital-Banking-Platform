import { createContext, useContext, useMemo, useState } from 'react';
import { translations, type Locale, type TranslationKey } from './translations';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const STORAGE_KEY = 'locale';

const I18nContext = createContext<I18nContextValue | null>(null);

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

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
