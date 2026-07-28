import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '@brightpath/i18n';
import type { Locale } from '@brightpath/shared';
import { RTL_LOCALES } from '@brightpath/shared';

const saved = (localStorage.getItem('brightpath_locale') as Locale | null) ?? 'en-IN';

void i18n.use(initReactI18next).init({
  resources,
  lng: saved,
  fallbackLng: 'en-IN',
  interpolation: { escapeValue: false },
});

export function setLocale(locale: Locale) {
  localStorage.setItem('brightpath_locale', locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
  return i18n.changeLanguage(locale);
}

document.documentElement.lang = saved;
document.documentElement.dir = RTL_LOCALES.includes(saved) ? 'rtl' : 'ltr';

export default i18n;
