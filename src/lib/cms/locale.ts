import { strapiFetch } from './client';
import { buildLocaleQuery } from './locale-queries';
import { parseLocaleCollectionResponse } from './locale-schemas';
import { CmsContentNotFoundError } from './errors';
import type { LocaleViewModel } from './locale-models';

/**
 * Fetch all locales (including disabled) from Strapi for the given site key.
 */
export async function getLocales(siteKey: string): Promise<LocaleViewModel[]> {
  const path = buildLocaleQuery(siteKey);

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

  return parseLocaleCollectionResponse(raw);
}
