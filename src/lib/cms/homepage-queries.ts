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

  // Phase 7C-A: Explicit nested populate for all media and repeatable component fields.
  // Strapi 5 auto-populates sub-components; only media/relation fields need nested [populate].
  // Never use populate=* — every field is explicitly listed here.
  parts.push('populate[hero][populate][image]=true');
  parts.push('populate[hero][populate][avatars]=true');
  parts.push('populate[clients][populate][partners][populate][logo]=true');
  parts.push('populate[featuresGeneral][populate][image]=true');
  parts.push('populate[featuresGeneral][populate][items]=true');
  parts.push('populate[featuresNavs][populate][tabs][populate][image]=true');
  parts.push('populate[testimonials][populate][items][populate][avatar]=true');
  parts.push('populate[testimonials][populate][statistics]=true');
  parts.push('populate[pricing][populate][starterKit]=true');
  parts.push('populate[pricing][populate][professionalToolbox]=true');
  parts.push('populate[faq][populate][items]=true');
  parts.push('populate[announcement]=true');
  parts.push('populate[bottomCta]=true');
  parts.push('populate[seo]=true');

  return `/api/homepages?${parts.join('&')}`;
}
