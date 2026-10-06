import { createContext, useCallback, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TRANSLATIONS, type Locale } from './translations';

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

function detectInitialLocale(): Locale {
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('de')) {
    return 'de';
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useLocalStorage<Locale>('soulgraph:locale', detectInitialLocale());

  const t = useCallback(
    (key: string): string => {
      return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    },
    [locale],
  );

  const value = useMemo<I18nContextType>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
