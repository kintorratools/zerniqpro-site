/**
 * Build a relative Strapi API path for the Legal Page query.
 * Filters by site key, locale, and kind; only requests published entries.
 */
export function buildLegalPageQuery(
  siteKey: string,
  locale: string,
  kind: string
): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push(`filters[kind][$eq]=${encodeURIComponent(kind)}`);
  parts.push('populate[body][populate]=*');
  parts.push('populate[seo]=true');

  return `/api/legal-pages?${parts.join('&')}`;
}
