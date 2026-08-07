/**
 * Build a relative Strapi API path for the site query.
 * Only requests needed fields; never uses populate=*.
 */
export function buildSiteQuery(siteKey: string): string {
  const params = new URLSearchParams();

  // Filter by site key
  params.set('filters[key][$eq]', siteKey);

  // Limit to one result and only published entries
  params.set('pagination[pageSize]', '1');
  params.set('status', 'published');

  // Request only the fields used by our contract
  params.set('fields[0]', 'key');
  params.set('fields[1]', 'name');
  params.set('fields[2]', 'defaultLocale');

  // Populate nested components
  params.set('populate[defaultSeo]', '*');
  params.set('populate[brand]', '*');

  return `/api/sites?${params.toString()}`;
}
