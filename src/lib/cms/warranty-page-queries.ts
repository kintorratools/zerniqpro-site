/**
 * Build a relative Strapi API path for the Warranty Page query.
 * Filters by site key and locale; only requests published entries.
 */
export function buildWarrantyPageQuery(
  siteKey: string,
  locale: string
): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push('populate[seo]=true');

  return `/api/warranty-pages?${parts.join('&')}`;
}
