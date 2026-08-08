/**
 * Strapi 5 flat entity — Brand content type as returned by the REST API.
 * Multi-site design: each brand belongs to a site relation.
 *
 * Optional fields may be returned as `null` by Strapi (e.g. empty
 * components or optional fields left unset). The schema mapper normalizes
 * `null` → `undefined` before producing the BrandViewModel.
 */
export interface SocialLink {
  platform?: string | null;
  url?: string | null;
}

export interface BrandRecord {
  id: number;
  documentId: string;
  key: string;
  name: string;
  legalName?: string | null;
  logo?: { url?: string | null; alt?: string | null } | null;
  favicon?: { url?: string | null } | null;
  colors?: {
    primary?: string | null;
    secondary?: string | null;
    accent?: string | null;
  } | null;
  defaultSeo?: {
    title?: string | null;
    description?: string | null;
    ogImage?: { url?: string | null; alt?: string | null } | null;
  } | null;
  socialLinks?: SocialLink[] | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

/**
 * View model consumed by the frontend.
 * Derived from BrandRecord after validation with sensible defaults.
 */
export interface BrandViewModel {
  key: string;
  name: string;
  logo?: { url?: string; alt?: string };
  favicon?: { url?: string };
  colors?: { primary?: string; secondary?: string; accent?: string };
  seo: {
    title: string;
    description: string;
    ogImage?: { url?: string; alt?: string };
  };
  socialLinks?: Array<{ platform: string; url: string }>;
}
