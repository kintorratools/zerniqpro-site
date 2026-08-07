/**
 * Build a relative Strapi API path for the locale query.
 * Filters by site key and enabled status; never uses populate=*.
 */
export function buildLocaleQuery(siteKey: string): string {
  const params = new URLSearchParams();
  params.set('filters[site][key][$eq]', siteKey);
  params.set('filters[enabled][$eq]', 'true');
  params.set('sort', 'order');
  return `/api/locales?${params.toString()}`;
}
