/**
 * Build a relative Strapi API path for the Services Page query.
 * Filters by site key and locale; only requests published entries.
 * Explicitly populates nested media in service slots — never uses populate=*.
 *
 * IMPORTANT: Strapi 5 does NOT accept URL-encoded brackets ([, ]) or $ in query strings.
 * We build the query manually to avoid URLSearchParams encoding these characters.
 */
export function buildServicesPageQuery(
  siteKey: string,
  locale: string
): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push('pagination[pageSize]=1');

  // Populate nested media in service slots
  parts.push('populate[service1][populate][image1]=true');
  parts.push('populate[service1][populate][image2]=true');
  parts.push('populate[service2][populate][image1]=true');
  parts.push('populate[service2][populate][image2]=true');
  parts.push('populate[service3][populate][image1]=true');
  parts.push('populate[service3][populate][image2]=true');
  parts.push('populate[service4][populate][image1]=true');
  parts.push('populate[service4][populate][image2]=true');
  parts.push('populate[service5][populate][image1]=true');
  parts.push('populate[service5][populate][image2]=true');
  parts.push('populate[seo]=true');

  return `/api/services-pages?${parts.join('&')}`;
}
