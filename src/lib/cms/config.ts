import {
  CMS_REQUEST_TIMEOUT_MS,
  getSecret,
} from 'astro:env/server';
import type { CmsConfig } from './types';

export function getCmsConfig(): CmsConfig {
  const secretStrapiUrl = getSecret('STRAPI_URL');
  const secretStrapiToken = getSecret('STRAPI_API_TOKEN');
  const secretSiteKey = getSecret('CMS_SITE_KEY');

  return {
    siteKey: secretSiteKey ?? 'site-template',
    baseUrl: secretStrapiUrl,
    apiToken: secretStrapiToken,
    timeoutMs: CMS_REQUEST_TIMEOUT_MS ?? 8000,
    configured: Boolean(secretStrapiUrl),
  };
}
