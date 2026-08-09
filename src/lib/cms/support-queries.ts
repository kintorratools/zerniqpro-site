/**
 * Build a relative Strapi API path for support articles listing query.
 * Filters by site key and locale; only requests published entries.
 * Explicitly populates all nested fields — never uses populate=*.
 *
 * IMPORTANT: Strapi 5 does NOT accept URL-encoded brackets ([, ]) or $ in query strings.
 * We build the query manually to avoid URLSearchParams encoding these characters.
 */
export function buildSupportArticlesQuery(
  siteKey: string,
  locale: string
): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push('pagination[pageSize]=100');

  // Populate media and nested fields explicitly
  parts.push('populate[cardImage]=true');
  parts.push('populate[authorImage]=true');
  parts.push('populate[content]=true');
  parts.push('populate[seo]=true');
  parts.push('populate[tags]=true');

  return `/api/support-articles?${parts.join('&')}`;
}

/**
 * Build a relative Strapi API path for a single support article by slug.
 */
export function buildSupportArticleBySlugQuery(
  siteKey: string,
  locale: string,
  slug: string
): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`filters[slug][$eq]=${encodeURIComponent(slug)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push('pagination[pageSize]=1');

  parts.push('populate[cardImage]=true');
  parts.push('populate[authorImage]=true');
  parts.push('populate[content]=true');
  parts.push('populate[seo]=true');
  parts.push('populate[tags]=true');

  return `/api/support-articles?${parts.join('&')}`;
}

/**
 * Build a relative Strapi API path for the support page query.
 */
export function buildSupportPageQuery(siteKey: string, locale: string): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push('pagination[pageSize]=1');

  parts.push('populate[seo]=true');

  return `/api/support-pages?${parts.join('&')}`;
}
