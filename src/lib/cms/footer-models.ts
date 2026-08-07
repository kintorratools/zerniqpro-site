/**
 * Strapi 5 flat entity — Footer content type as returned by the REST API.
 * Multi-site design: each footer belongs to a site relation and a locale.
 *
 * Optional fields may be returned as `null` by Strapi (e.g. empty
 * components or optional fields left unset). The schema mapper normalizes
 * `null` → `undefined` before producing the FooterViewModel.
 */
export interface FooterLinkRecord {
  id?: number;
  label?: string | null;
  url?: string | null;
}

export interface FooterColumnRecord {
  id?: number;
  title?: string | null;
  links?: FooterLinkRecord[] | null;
}

export interface SocialLinkRecord {
  id?: number;
  platform?: string | null;
  url?: string | null;
}

export interface FooterRecord {
  id: number;
  documentId: string;
  site?: { key?: string } | null;
  locale?: { code?: string } | null;
  columns?: FooterColumnRecord[] | null;
  copyright?: string | null;
  legalLinks?: FooterLinkRecord[] | null;
  socialLinks?: SocialLinkRecord[] | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterSocialLink {
  platform: string;
  url: string;
}

export interface FooterViewModel {
  columns: FooterColumn[];
  copyright: string;
  legalLinks: FooterLink[];
  socialLinks: FooterSocialLink[];
}
