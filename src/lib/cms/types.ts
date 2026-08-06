/**
 * Strapi CMS types — reserved for Strapi 5 data/meta response structure.
 * No concrete Product model is defined in this stage.
 */

export interface StrapiResponseMeta {
  pagination?: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

export interface StrapiResponse<T> {
  data: T;
  meta?: StrapiResponseMeta;
}

export interface StrapiCollectionResponse<T> {
  data: T[];
  meta?: StrapiResponseMeta;
}

export interface StrapiError {
  status: number;
  name: string;
  message: string;
}

export interface CmsConfig {
  siteKey: string;
  baseUrl: string | undefined;
  apiToken: string | undefined;
  timeoutMs: number;
  configured: boolean;
}
