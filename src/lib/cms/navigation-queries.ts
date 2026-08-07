/**
 * Build a relative Strapi API path for the navigation query.
 * Filters by site key and locale; only requests published entries.
 * Never uses populate=*.
 */
export function buildNavigationQuery(siteKey: string, locale: string): string {
  const params = new URLSearchParams();
  params.set('filters[site][key][$eq]', siteKey);
  params.set('filters[locale][code][$eq]', locale);
  params.set('pagination[pageSize]', '100');
  params.set('status', 'published');
  params.set('sort', 'order');
  return `/api/navigations?${params.toString()}`;
}
