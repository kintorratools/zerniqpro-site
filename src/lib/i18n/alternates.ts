// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_LOCALE = 'en';

/** Get the URL prefix for a locale. Default locale returns empty string (no prefix). */
function getLocalePrefix(locale: string): string {
  if (locale === DEFAULT_LOCALE) return '';
  return `/${locale}`;
}

// ---------------------------------------------------------------------------
// 1. RouteTemplate – string union type for every known route shape
// ---------------------------------------------------------------------------
export type RouteTemplate =
  | 'homepage'
  | 'product_listing'
  | 'product_detail'
  | 'support_listing'
  | 'support_detail'
  | 'services'
  | 'contact'
  | 'downloads'
  | 'warranty'
  | 'privacy';

// ---------------------------------------------------------------------------
// 2. RouteAlternate
// ---------------------------------------------------------------------------
export interface RouteAlternate {
  locale: string;
  href: string;
  available: boolean;
}

// ---------------------------------------------------------------------------
// 3. AlternatesConfig
// ---------------------------------------------------------------------------
export interface AlternatesConfig {
  siteUrl: string;
  currentPath: string;
  currentLocale: string;
  enabledLocales: string[];
  contentAvailability: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// 4. classifyRoute
// ---------------------------------------------------------------------------

const LOCALE_PREFIX = '(?:fr|es|de|pt-BR)';

const ROUTE_PATTERNS: [RegExp, RouteTemplate][] = [
  // homepage:  /  or  /fr/  etc.
  [/^\/(?:(?:fr|es|de|pt-BR)\/)?$/, 'homepage' as RouteTemplate],

  // product_listing:  /products, /products/, /fr/products, /fr/products/
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?products\\/?$`),
    'product_listing' as RouteTemplate,
  ],

  // product_detail:  /products/some-handle, /fr/products/some-handle
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?products\\/[^/]+$`),
    'product_detail' as RouteTemplate,
  ],

  // support_listing:  /blogs/support, /blogs/support/, /fr/blogs/support, /fr/blogs/support/
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?blogs\\/support\\/?$`),
    'support_listing' as RouteTemplate,
  ],

  // support_detail:  /blogs/support/some-article, /fr/blogs/support/some-article
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?blogs\\/support\\/[^/]+$`),
    'support_detail' as RouteTemplate,
  ],

  // services:  /pages/services, /pages/services/, /fr/pages/services, /fr/pages/services/
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/services\\/?$`),
    'services' as RouteTemplate,
  ],

  // contact:  /pages/contact, /pages/contact/, /fr/pages/contact, /fr/pages/contact/
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/contact\\/?$`),
    'contact' as RouteTemplate,
  ],

  // downloads:  /pages/downloads, /pages/downloads/, /fr/pages/downloads, /fr/pages/downloads/
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/downloads\\/?$`),
    'downloads' as RouteTemplate,
  ],

  // warranty:  /pages/warranty, /pages/warranty/, /fr/pages/warranty, /fr/pages/warranty/
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/warranty\\/?$`),
    'warranty' as RouteTemplate,
  ],

  // privacy:  /pages/privacy, /pages/privacy/, /fr/pages/privacy, /fr/pages/privacy/
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/privacy\\/?$`),
    'privacy' as RouteTemplate,
  ],
];

export function classifyRoute(pathname: string): RouteTemplate | null {
  for (const [regex, template] of ROUTE_PATTERNS) {
    if (regex.test(pathname)) {
      return template;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5. buildLocaleAlternates
// ---------------------------------------------------------------------------

export function buildLocaleAlternates(
  config: AlternatesConfig
): RouteAlternate[] {
  const { siteUrl, currentPath, enabledLocales, contentAvailability } = config;

  // Strip any existing locale prefix from the current path before building
  const cleanPath = currentPath.replace(/^\/(?:fr|es|de|pt-BR)\//, '/');

  const available = enabledLocales.filter(
    locale => contentAvailability[locale] === true
  );

  const alternates: RouteAlternate[] = available.map(locale => ({
    locale,
    href: `${siteUrl}${getLocalePrefix(locale)}${cleanPath}`,
    available: true,
  }));

  // Sort: en first, then alphabetical by locale code
  alternates.sort((a, b) => {
    if (a.locale === 'en') return -1;
    if (b.locale === 'en') return 1;
    return a.locale.localeCompare(b.locale);
  });

  return alternates;
}

// ---------------------------------------------------------------------------
// 6. buildHreflangTags
// ---------------------------------------------------------------------------

export function buildHreflangTags(
  config: AlternatesConfig
): Array<{ lang: string; href: string }> {
  const alternates = buildLocaleAlternates(config);

  const tags: Array<{ lang: string; href: string }> = alternates.map(alt => ({
    lang: alt.locale,
    href: alt.href,
  }));

  // x-default: use EN href if EN is in the alternates
  const enAlternate = alternates.find(alt => alt.locale === 'en');
  if (enAlternate) {
    tags.push({ lang: 'x-default', href: enAlternate.href });
  }

  return tags;
}
