/**
 * Build a relative Strapi API path for the homepage query.
 * Filters by site key and locale; only requests published entries.
 * Explicitly populates fixed components — never uses populate=*.
 *
 * IMPORTANT: Strapi 5 does NOT accept URL-encoded brackets ([, ]) or $ in query strings.
 * We build the query manually to avoid URLSearchParams encoding these characters.
 */
export function buildHomepageQuery(siteKey: string, locale: string): string {
  const parts: string[] = [];

  // Filters
  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push('pagination[pageSize]=1');

  // Explicitly populate only the fixed homepage components.
  // Strapi 5 auto-populates sub-components; only media/relation fields need nested [populate].
  // Media nested populate is deferred to Phase 7C (CMS_MEDIA_RUNTIME=DEFERRED_TO_7C).
  // Basic component populate is sufficient for all text/CTA/list fields.
  parts.push('populate[announcement]=true');
  parts.push('populate[hero]=true');
  parts.push('populate[clients]=true');
  parts.push('populate[featuresGeneral]=true');
  parts.push('populate[featuresNavs]=true');
  parts.push('populate[testimonials]=true');
  parts.push('populate[pricing]=true');
  parts.push('populate[faq]=true');
  parts.push('populate[bottomCta]=true');
  parts.push('populate[seo]=true');

  return `/api/homepages?${parts.join('&')}`;
}
