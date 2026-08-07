/**
 * Build a relative Strapi API path for the brand query.
 * Filters by site key; only requests needed fields.
 * Never uses populate=*.
 */
export function buildBrandQuery(siteKey: string): string {
  const params = new URLSearchParams();

  // Filter by site key
  params.set('filters[site][key][$eq]', siteKey);

  // Limit to one result and only published entries
  params.set('pagination[pageSize]', '1');
  params.set('status', 'published');

  // Populate nested components
  params.set('populate[defaultSeo]', '*');
  params.set('populate[logo]', '*');
  params.set('populate[favicon]', '*');
  params.set('populate[socialLinks]', '*');

  return `/api/brands?${params.toString()}`;
}
