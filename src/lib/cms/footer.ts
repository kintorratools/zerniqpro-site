import { getCmsConfig } from './config';
import { strapiFetch } from './client';
import { buildFooterQuery } from './footer-queries';
import { parseFooterResponse } from './footer-schemas';
import { CmsContentNotFoundError } from './errors';
import type { FooterViewModel } from './footer-models';

/**
 * Fetch the footer configuration from Strapi for the given site key and locale.
 */
export async function getFooter(
  siteKey: string,
  locale: string
): Promise<FooterViewModel> {
  const config = getCmsConfig();
  const path = buildFooterQuery(siteKey, locale);

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

  return parseFooterResponse(raw);
}
