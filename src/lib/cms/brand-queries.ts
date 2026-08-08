/**
 * Build a relative Strapi API path for the brand query.
 * Filters by site key; only requests needed fields.
 * Never uses populate=*.
 */
export function buildBrandQuery(brandKey: string): string {
  const params = new URLSearchParams();

  // Filter by brand key
  params.set('filters[key][$eq]', brandKey);

  // Limit to one result and only published entries
  params.set('pagination[pageSize]', '1');
  params.set('status', 'published');

  // Populate nested components (media fields use true, not *)
  params.set('populate[defaultSeo][populate]', '*');
  params.set('populate[logo]', 'true');
  params.set('populate[favicon]', 'true');
  params.set('populate[socialLinks]', 'true');

  return `/api/brands?${params.toString()}`;
}
