/**
 * Build a relative Strapi API path for the product query.
 * Filters by site key and product handle; only requests needed fields.
 * Never uses populate=*.
 */
export function buildProductQuery(siteKey: string, handle: string): string {
  const params = new URLSearchParams();

  // Filter by site key and product handle
  params.set('filters[site][key][$eq]', siteKey);
  params.set('filters[handle][$eq]', handle);

  // Limit to one result and only published entries
  params.set('pagination[pageSize]', '1');
  params.set('status', 'published');

  // Request only the fields used by our contract
  params.set('fields[0]', 'handle');
  params.set('fields[1]', 'name');
  params.set('fields[2]', 'summary');

  // Populate nested components
  params.set('populate[seo]', '*');
  params.set('populate[hero]', '*');
  params.set('populate[sections]', '*');

  return `/api/products?${params.toString()}`;
}
