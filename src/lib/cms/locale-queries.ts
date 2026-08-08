/**
 * Build a relative Strapi API path for the locale query.
 * Filters by site key and publication status; never uses populate=*.
 */
export function buildLocaleQuery(siteKey: string): string {
  const params = new URLSearchParams();
  params.set('filters[site][key][$eq]', siteKey);
  params.set('pagination[pageSize]', '20');
  params.set('status', 'published');
  params.set('fields', 'code,name,enabled,isDefault');
  return `/api/locale-configs?${params.toString()}`;
}
