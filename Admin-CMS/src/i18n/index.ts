/**
 * i18n setup — English + Arabic with RTL handling.
 *
 * Importing this module initializes i18next. The `languageChanged` handler
 * keeps <html dir/lang> in sync so the whole app flips to RTL for Arabic.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const RTL_LANGUAGES = new Set<string>(['ar']);

export function applyDirection(lang: string) {
  const dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
  const root = document.documentElement;
  root.setAttribute('dir', dir);
  root.setAttribute('lang', lang);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'qv_lang',
      caches: ['localStorage'],
    },
  });

// Keep document direction in sync with the active language.
i18n.on('languageChanged', applyDirection);
applyDirection(i18n.resolvedLanguage || i18n.language || 'en');

export default i18n;
