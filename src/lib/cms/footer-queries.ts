/**
 * Build a relative Strapi API path for the footer query.
 * Filters by site key and locale; only requests needed fields.
 * Never uses populate=*.
 */
export function buildFooterQuery(siteKey: string, locale: string): string {
  const params = new URLSearchParams();
  params.set('filters[site][key][$eq]', siteKey);
  params.set('filters[locale][code][$eq]', locale);
  params.set('pagination[pageSize]', '1');
  params.set('status', 'published');
  params.set('populate[columns]', '*');
  params.set('populate[columns][populate][links]', '*');
  params.set('populate[legalLinks]', '*');
  params.set('populate[socialLinks]', '*');
  return `/api/footers?${params.toString()}`;
}
