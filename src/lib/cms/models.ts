/**
 * Strapi 5 flat entity — Site content type as returned by the REST API.
 * Strapi 5 has no `attributes` wrapper; fields are at the top level.
 */
export interface SiteRecord {
  id: number;
  documentId: string;
  siteName: string;
  siteKey: string;
  locale: string;
  defaultLocale: string;
  siteTitle: string;
  siteDescription: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/**
 * View model consumed by the frontend.
 * Derived from SiteRecord after validation with minimal mapping.
 */
export interface SiteViewModel {
  documentId: string;
  siteName: string;
  siteKey: string;
  locale: string;
  siteTitle: string;
  siteDescription: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: Record<string, string>;
  publishedAt: string | null;
}
