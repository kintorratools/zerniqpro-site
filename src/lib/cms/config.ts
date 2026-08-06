import {
  CMS_SITE_KEY,
  CMS_REQUEST_TIMEOUT_MS,
  STRAPI_URL,
  STRAPI_API_TOKEN,
} from 'astro:env/server';
import type { CmsConfig } from './types';

export function getCmsConfig(): CmsConfig {
  return {
    siteKey: CMS_SITE_KEY ?? 'zerniq',
    baseUrl: STRAPI_URL,
    apiToken: STRAPI_API_TOKEN,
    timeoutMs: CMS_REQUEST_TIMEOUT_MS ?? 8000,
    configured: Boolean(STRAPI_URL),
  };
}
