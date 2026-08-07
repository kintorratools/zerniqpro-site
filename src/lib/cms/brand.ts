import { getCmsConfig } from './config';
import { strapiFetch } from './client';
import { buildBrandQuery } from './brand-queries';
import { parseBrandResponse } from './brand-schemas';
import { CmsContentNotFoundError } from './errors';
import type { BrandViewModel } from './brand-models';

/**
 * Fetch the brand configuration from Strapi for the given site key.
 * Falls back to `getCmsConfig().siteKey` if no argument is provided.
 */
export async function getBrand(siteKey?: string): Promise<BrandViewModel> {
  const config = getCmsConfig();
  const key = siteKey ?? config.siteKey;
  const path = buildBrandQuery(key);

  // strapiFetch response is treated as unknown for safety
  const raw: unknown = await strapiFetch(path);

  // Guard: must be an object with a data array
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('data' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).data) ||
    ((raw as Record<string, unknown>).data as unknown[]).length === 0
  ) {
    throw new CmsContentNotFoundError();
  }

  return parseBrandResponse(raw);
}
