/**
 * Build a relative Strapi API path for the site query.
 * Uses Strapi 5 document-service filters via query string.
 */
export function buildSiteQuery(siteKey: string): string {
  return `/api/sites?filters[siteKey][$eq]=${encodeURIComponent(siteKey)}&populate=*`;
}
