/**
 * Build relative Strapi API paths for product queries.
 * Filters by site key, handle, and locale; only requests published entries.
 * Explicitly populates fixed 8D-B media and component fields — never uses populate=*.
 *
 * IMPORTANT: Strapi 5 does NOT accept URL-encoded brackets ([, ]) or $ in query strings.
 * We build the query manually to avoid URLSearchParams encoding these characters.
 */

/**
 * Build query for all products (listing page).
 * Sorted by displayOrder ascending; page size 50.
 */
export function buildProductsQuery(siteKey: string, locale?: string): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  if (locale) {
    parts.push(`locale=${encodeURIComponent(locale)}`);
  }
  parts.push('status=published');
  parts.push('pagination[pageSize]=50');
  parts.push('sort[0]=displayOrder:asc');

  // Media fields (non-localized, shared across locales)
  parts.push('populate[cardImage][populate]=*');
  parts.push('populate[mainImage][populate]=*');
  parts.push('populate[blueprintFirst][populate]=*');
  parts.push('populate[blueprintSecond][populate]=*');

  // Repeatable component fields (localized)
  parts.push('populate[descriptionItems][populate]=*');
  parts.push('populate[specificationsLeft][populate]=*');
  parts.push('populate[specificationsRight][populate]=*');

  // SEO component
  parts.push('populate[seo][populate]=*');

  return `/api/products?${parts.join('&')}`;
}

/**
 * Build query for a single product by handle.
 * Same populates as buildProductsQuery but adds handle filter and page size 1.
 */
export function buildProductByHandleQuery(
  siteKey: string,
  handle: string,
  locale?: string
): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`filters[handle][$eq]=${encodeURIComponent(handle)}`);
  if (locale) {
    parts.push(`locale=${encodeURIComponent(locale)}`);
  }
  parts.push('status=published');
  parts.push('pagination[pageSize]=1');

  // Media fields (non-localized)
  parts.push('populate[cardImage][populate]=*');
  parts.push('populate[mainImage][populate]=*');
  parts.push('populate[blueprintFirst][populate]=*');
  parts.push('populate[blueprintSecond][populate]=*');

  // Repeatable component fields (localized)
  parts.push('populate[descriptionItems][populate]=*');
  parts.push('populate[specificationsLeft][populate]=*');
  parts.push('populate[specificationsRight][populate]=*');

  // SEO component
  parts.push('populate[seo][populate]=*');

  return `/api/products?${parts.join('&')}`;
}

/**
 * Build query for the Product Page content type (/products/ listing page).
 */
export function buildProductPageQuery(
  siteKey: string,
  locale?: string
): string {
  const parts: string[] = [];

  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  if (locale) {
    parts.push(`locale=${encodeURIComponent(locale)}`);
  }
  parts.push('status=published');
  parts.push('pagination[pageSize]=1');

  parts.push('populate[testimonials][populate]=*');
  parts.push('populate[seo][populate]=*');

  return `/api/product-pages?${parts.join('&')}`;
}
