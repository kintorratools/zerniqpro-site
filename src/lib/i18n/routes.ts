import type { LocaleViewModel } from '@lib/cms/locale-models';

const DEFAULT_LOCALE = 'en';

/** Get the URL prefix for a locale. Default locale returns empty string (no prefix). */
export function getLocalePrefix(locale: string): string {
  if (locale === DEFAULT_LOCALE) return '';
  return `/${locale}`;
}

/** Whether the given locale should be prefixed in URLs. */
export function shouldPrefixLocale(locale: string): boolean {
  return locale !== DEFAULT_LOCALE;
}

/** Get the full path with locale prefix applied. */
export function getLocalizedPath(path: string, locale: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const prefix = getLocalePrefix(locale);
  if (!prefix) return cleanPath;
  // Avoid double slashes
  return `${prefix}${cleanPath}`.replace(/\/+/g, '/');
}

/**
 * Build hreflang alternates from enabled locales.
 * @deprecated Use {@link buildHreflangTags} from `@lib/i18n/alternates` instead.
 *             This function does NOT check content availability via `contentAvailability`.
 */
export function buildHreflangLinks(
  locales: LocaleViewModel[],
  currentPath: string,
  siteUrl: string
): Array<{ lang: string; href: string }> {
  const cleanPath = currentPath.replace(/^\/(fr|en|es|de|pt-BR)\//, '/');
  return locales
    .filter(l => l.enabled)
    .map(l => ({
      lang: l.code,
      href: `${siteUrl}${getLocalizedPath(cleanPath, l.code)}`,
    }));
}

// Re-export from alternates for convenience
export {
  classifyRoute,
  buildLocaleAlternates,
  buildHreflangTags,
} from './alternates';
export type { RouteAlternate, AlternatesConfig } from './alternates';
