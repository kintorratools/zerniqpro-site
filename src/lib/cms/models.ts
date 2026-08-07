/**
 * Strapi 5 flat entity — Site content type as returned by the REST API.
 * Multi-site design: a single Strapi instance serves multiple independent
 * storefronts keyed by a unique `key`.
 *
 * Optional fields may be returned as `null` by Strapi (e.g. empty
 * components or optional fields left unset). The schema mapper normalizes
 * `null` → `undefined` before producing the SiteViewModel.
 */
export interface SiteRecord {
  id: number;
  documentId: string;
  key: string;
  name: string;
  defaultLocale: string;
  defaultSeo?: {
    title?: string | null;
    description?: string | null;
  } | null;
  brand?: {
    documentId: string;
    key: string;
  } | null;
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
  defaultLocale: string;
  seo: {
    title: string;
    description: string;
  };
  brand?: {
    key: string;
    name: string;
    domain: string;
  };
}
