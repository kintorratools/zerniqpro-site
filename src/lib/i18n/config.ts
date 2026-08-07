import type { LocaleViewModel } from '@lib/cms/locale-models';

/** Return enabled locale codes, sorted by their natural order in the array */
export function getEnabledLocales(locales: LocaleViewModel[]): string[] {
  return locales.filter(loc => loc.enabled).map(loc => loc.code);
}

/** Check if a given locale code is enabled */
export function isLocaleEnabled(
  code: string,
  locales: LocaleViewModel[]
): boolean {
  const locale = locales.find(loc => loc.code === code);
  return locale?.enabled ?? false;
}

/** Get the default locale (exactly one should have isDefault=true) */
export function getDefaultLocale(locales: LocaleViewModel[]): LocaleViewModel {
  const defaultLocale = locales.find(loc => loc.isDefault);
  if (!defaultLocale) {
    // Fallback: English is always enabled and default
    const en = locales.find(loc => loc.code === 'en');
    if (en) return en;
    throw new Error('No default locale configured');
  }
  return defaultLocale;
}
