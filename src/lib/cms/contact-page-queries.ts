/**
 * Build a relative Strapi API path for the Contact Page query.
 * Filters by site key and locale; only requests published entries.
 *
 * IMPORTANT: Strapi 5 does NOT accept URL-encoded brackets ([, ]) or $ in query strings.
 * We build the query manually to avoid URLSearchParams encoding these characters.
 */
export function buildContactPageQuery(siteKey: string, locale: string): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push('pagination[pageSize]=1');
  parts.push('populate[seo]=true');

  return `/api/contact-pages?${parts.join('&')}`;
}
