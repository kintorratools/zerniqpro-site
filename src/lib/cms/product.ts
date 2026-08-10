import { getCmsConfig } from './config';
import { strapiFetch } from './client';
import {
  buildProductsQuery,
  buildProductByHandleQuery,
  buildProductPageQuery,
} from './product-queries';
import {
  parseProductCollection,
  parseProductCollectionResponse,
  parseProductPageResponse,
} from './product-schemas';
import { CmsContentNotFoundError } from './errors';
import { resolveMediaUrl } from './media';
import type { CmsMedia } from './media';
import type { ProductViewModel, ProductPageViewModel } from './product-models';

// ── Media URL normalization ──

/** Resolve a CmsMedia URL relative to the CMS origin. Returns null if unresolvable. */
function normalizeCmsMedia(
  media: CmsMedia | null,
  cmsOrigin: string
): CmsMedia | null {
  if (!media || !media.url) return null;
  const resolved = resolveMediaUrl(media.url, cmsOrigin);
  if (!resolved) return null;
  return { ...media, url: resolved };
}

/** Normalize all media URLs in a ProductViewModel */
function normalizeProductMediaUrls(
  vm: ProductViewModel,
  cmsOrigin: string
): ProductViewModel {
  return {
    ...vm,
    cardImage: normalizeCmsMedia(vm.cardImage, cmsOrigin),
    mainImage: normalizeCmsMedia(vm.mainImage, cmsOrigin),
    blueprintFirst: normalizeCmsMedia(vm.blueprintFirst, cmsOrigin),
    blueprintSecond: normalizeCmsMedia(vm.blueprintSecond, cmsOrigin),
  };
}

/** Normalize all media URLs in a ProductPageViewModel */
function normalizeProductPageMediaUrls(
  vm: ProductPageViewModel,
  cmsOrigin: string
): ProductPageViewModel {
  return {
    ...vm,
    testimonials: vm.testimonials.map(t => ({
      ...t,
      avatar: normalizeCmsMedia(t.avatar, cmsOrigin),
    })),
  };
}

// ── Public API ──

/**
 * Fetch all published products for the current site.
 * Filters out the test-product handle.
 * Returns an empty array when no products exist (no error thrown).
 */
export async function getAllProducts(
  locale?: string
): Promise<ProductViewModel[]> {
  const config = getCmsConfig();
  const path = buildProductsQuery(config.siteKey, locale);

  const raw: unknown = await strapiFetch(path);

  // Guard: response must have a data array
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('data' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).data)
  ) {
    return [];
  }

  const products = parseProductCollection(raw);

  // Filter out test-product and normalize media URLs
  const cmsOrigin = config.baseUrl;
  const filtered = products
    .filter(p => p.handle !== 'test-product')
    .filter(p => p.handle.length > 0);

  if (!cmsOrigin) return filtered;

  return filtered.map(vm => normalizeProductMediaUrls(vm, cmsOrigin));
}

/**
 * Fetch a single product by handle.
 * Throws CmsContentNotFoundError if no matching product is found.
 */
export async function getProductByHandle(
  handle: string,
  locale?: string
): Promise<ProductViewModel> {
  const config = getCmsConfig();
  const path = buildProductByHandleQuery(config.siteKey, handle, locale);

  const raw: unknown = await strapiFetch(path);

  // Guard: must be an object with a non-empty data array
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('data' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).data) ||
    ((raw as Record<string, unknown>).data as unknown[]).length === 0
  ) {
    throw new CmsContentNotFoundError();
  }

  const vm = parseProductCollectionResponse(raw);

  const cmsOrigin = config.baseUrl;
  if (!cmsOrigin) return vm;

  return normalizeProductMediaUrls(vm, cmsOrigin);
}

/**
 * Fetch the Product Page content (for the /products/ listing page).
 * Throws CmsContentNotFoundError if no product page is configured.
 */
export async function getProductPage(
  locale?: string
): Promise<ProductPageViewModel> {
  const config = getCmsConfig();
  const path = buildProductPageQuery(config.siteKey, locale);

  const raw: unknown = await strapiFetch(path);

  // Guard: must be an object with a non-empty data array
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('data' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).data) ||
    ((raw as Record<string, unknown>).data as unknown[]).length === 0
  ) {
    throw new CmsContentNotFoundError();
  }

  const vm = parseProductPageResponse(raw);

  const cmsOrigin = config.baseUrl;
  if (!cmsOrigin) return vm;

  return normalizeProductPageMediaUrls(vm, cmsOrigin);
}
