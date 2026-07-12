import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  capitalizeAll,
  capitalizeFirstChar,
  capitalizeFirstWord,
} from './processors';

// Load all locale JSON files
const modules = import.meta.glob('./locales/**/*.json', {
  eager: true,
}) as Record<string, any>;

// Dynamically detect unique language codes
export const supportedLanguages: string[] = Array.from(
  new Set(
    Object.keys(modules)
      .map((path) => {
        const match = path.match(/\.\/locales\/([^/]+)\//);
        return match ? match[1] : null;
      })
      .filter((lang): lang is string => typeof lang === 'string')
  )
);

// Construct i18n resources object
const resources: Record<string, Record<string, any>> = {};

for (const path in modules) {
  // Path format: './locales/en/core.json'
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;

  const [, lang, ns] = match;
  resources[lang] = resources[lang] || {};
  resources[lang][ns] = modules[path].default;
}

// Qortium Home passes the resolved language as a `lang` URL param; the
// browser locale is only a fallback for standalone/dev use.
const initialLanguage =
  new URLSearchParams(window.location.search).get('lang') ?? navigator.language;

i18n
  .use(initReactI18next)
  .use(capitalizeAll as any)
  .use(capitalizeFirstChar as any)
  .use(capitalizeFirstWord as any)
  .init({
    resources,
    fallbackLng: 'en',
    lng: initialLanguage,
    supportedLngs: supportedLanguages,
    ns: ['core'],
    defaultNS: 'core',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    debug: import.meta.env.MODE === 'development',
  });

export default i18n;
