import { getCmsConfig } from './config';
import { strapiFetch } from './client';
import { buildProductQuery } from './product-queries';
import { parseProductCollectionResponse } from './product-schemas';
import { CmsContentNotFoundError } from './errors';
import type { ProductViewModel } from './product-models';

/**
 * Fetch a product from Strapi by handle.
 * Site key is read from the runtime CMS config.
 */
export async function getProductByHandle(
  handle: string
): Promise<ProductViewModel> {
  const config = getCmsConfig();
  const path = buildProductQuery(config.siteKey, handle);

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

  return parseProductCollectionResponse(raw);
}
