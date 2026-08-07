import { getCmsConfig } from './config';
import { strapiFetch } from './client';
import { buildNavigationQuery } from './navigation-queries';
import { parseNavigationResponse } from './navigation-schemas';
import { CmsContentNotFoundError } from './errors';
import type { NavigationViewModel } from './navigation-models';

/**
 * Fetch the navigation configuration from Strapi for the given site and locale.
 */
export async function getNavigation(
  siteKey: string,
  locale: string
): Promise<NavigationViewModel> {
  const config = getCmsConfig();
  const path = buildNavigationQuery(siteKey, locale);

  // strapiFetch response is treated as unknown for safety
  const raw: unknown = await strapiFetch(path);

  // Guard: must be an object with a data array containing at least one item
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('data' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).data) ||
    ((raw as Record<string, unknown>).data as unknown[]).length === 0
  ) {
    throw new CmsContentNotFoundError();
  }

  return parseNavigationResponse(raw);
}
