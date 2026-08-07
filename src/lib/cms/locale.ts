import { getCmsConfig } from './config';
import { strapiFetch } from './client';
import { buildLocaleQuery } from './locale-queries';
import { parseLocaleCollectionResponse } from './locale-schemas';
import { CmsContentNotFoundError } from './errors';
import type { LocaleViewModel } from './locale-models';

/**
 * Fetch all enabled locales from Strapi for the given site key.
 * Falls back to `getCmsConfig().siteKey` if no argument is provided.
 * Enforces that 'en' is always enabled regardless of CMS data.
 */
export async function getLocales(siteKey?: string): Promise<LocaleViewModel[]> {
  const config = getCmsConfig();
  const key = siteKey ?? config.siteKey;
  const path = buildLocaleQuery(key);

  // strapiFetch response is treated as unknown for safety
  const raw: unknown = await strapiFetch(path);

  // Guard: must be an object with a data array
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('data' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).data)
  ) {
    throw new CmsContentNotFoundError();
  }

  const locales = parseLocaleCollectionResponse(raw);

  // Enforce: en is always enabled
  for (const loc of locales) {
    if (loc.code === 'en') {
      loc.enabled = true;
    }
  }

  return locales;
}
