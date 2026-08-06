/**
 * Strapi 5 flat entity — Site content type as returned by the REST API.
 * Multi-site design: a single Strapi instance serves multiple independent
 * storefronts keyed by a unique `key`.
 */
export interface SiteRecord {
  id: number;
  documentId: string;
  key: string;
  name: string;
  domain: string;
  defaultLocale: string;
  defaultSeo?: {
    title?: string;
    description?: string;
  };
  branding?: {
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

/**
 * View model consumed by the frontend.
 * Derived from SiteRecord after validation with sensible defaults.
 */
export interface SiteViewModel {
  key: string;
  name: string;
  domain: string;
  defaultLocale: string;
  seo: {
    title: string;
    description: string;
  };
  branding?: {
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    accentColor?: string;
  };
}
