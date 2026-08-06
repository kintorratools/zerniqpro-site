import { getCmsConfig } from './config';
import { strapiFetch } from './client';
import { buildSiteQuery } from './queries';
import { parseSiteCollectionResponse } from './schemas';
import { CmsContentNotFoundError } from './errors';
import type { SiteViewModel } from './models';
import type { StrapiCollectionResponse } from './types';
import type { SiteRecord } from './models';

/**
 * Fetch the site configuration from Strapi for the given site key.
 * Falls back to `getCmsConfig().siteKey` if no argument is provided.
 */
export async function getSiteConfig(siteKey?: string): Promise<SiteViewModel> {
  const config = getCmsConfig();
  const key = siteKey ?? config.siteKey;
  const path = buildSiteQuery(key);

  // Strapi returns a collection-response when filtering even if single match
  const raw = await strapiFetch<StrapiCollectionResponse<SiteRecord>>(path);

  if (!raw?.data?.length) {
    throw new CmsContentNotFoundError(key);
  }

  return parseSiteCollectionResponse(raw, key);
}
