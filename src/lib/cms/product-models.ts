/**
 * Strapi 5 flat entity — Product content type as returned by the REST API.
 * Uses Strapi dynamic zones for sections (__component discriminator).
 * Optional fields may be returned as null by Strapi.
 */
export interface ProductRecord {
  id: number;
  documentId: string;
  handle: string;
  name: string;
  summary: string;
  seo?: {
    title?: string | null;
    description?: string | null;
  } | null;
  hero?: {
    eyebrow?: string | null;
    heading?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    imageAlt?: string | null;
  } | null;
  sections?: ProductSection[] | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

/** Strapi dynamic zone section — discriminated by __component */
export type ProductSection =
  | {
      __component: 'content.text';
      heading?: string | null;
      body?: string | null;
    }
  | {
      __component: 'content.feature-grid';
      heading?: string | null;
      items: Array<{ title: string; description: string }>;
    }
  | {
      __component: 'content.specifications';
      heading?: string | null;
      rows: Array<{ label: string; value: string }>;
    };

/**
 * View model consumed by the frontend after validation.
 * No id, documentId, __component, or null values.
 * Sections become blocks with a type discriminator.
 */
export interface ProductViewModel {
  handle: string;
  name: string;
  summary: string;
  seo: {
    title: string;
    description: string;
  };
  hero?: {
    eyebrow?: string;
    heading?: string;
    description?: string;
    imageUrl?: string;
    imageAlt?: string;
  };
  blocks: ProductBlock[];
}

export type ProductBlock =
  | { type: 'text'; heading?: string; body?: string }
  | {
      type: 'feature-grid';
      heading?: string;
      items: Array<{ title: string; description: string }>;
    }
  | {
      type: 'specifications';
      heading?: string;
      rows: Array<{ label: string; value: string }>;
    };
