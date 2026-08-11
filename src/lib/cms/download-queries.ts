/**
 * Build a relative Strapi API path for the Downloads query.
 * Filters by site key and locale; only requests published entries.
 */
export function buildDownloadsQuery(siteKey: string, locale: string): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push('pagination[pageSize]=500');
  parts.push('populate[file]=true');

  return `/api/downloads?${parts.join('&')}`;
}
