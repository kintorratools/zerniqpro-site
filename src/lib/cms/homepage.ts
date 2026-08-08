import { strapiFetch } from './client';
import { getCmsConfig } from './config';
import { buildHomepageQuery } from './homepage-queries';
import { parseHomepageResponse } from './homepage-schemas';
import type { HomepageViewModel } from './homepage-models';
import type { CmsMediaView } from './media';
import { resolveMediaUrl } from './media';

/**
 * Normalize all media URLs in the ViewModel.
 * - `/uploads/...` paths are prefixed with cmsOrigin
 * - `https://...` URLs are kept as-is
 * - Unsafe protocols (`javascript:`, `data:`, `file:`) result in null
 * - Fields that resolve to undefined are set to null
 */
function normalizeHomepageMediaUrls(
  vm: HomepageViewModel,
  cmsOrigin: string
): HomepageViewModel {
  const normalize = (
    field: CmsMediaView | null | undefined
  ): CmsMediaView | null => {
    if (!field) return null;
    const resolved = resolveMediaUrl(field.url, cmsOrigin);
    if (!resolved) return null;
    return { ...field, url: resolved };
  };

  return {
    ...vm,
    hero: {
      ...vm.hero,
      image: normalize(vm.hero.image),
      avatars: vm.hero.avatars.map(normalize),
    },
    clients: {
      ...vm.clients,
      partners: vm.clients.partners.map(p => ({
        ...p,
        logo: normalize(p.logo),
      })),
    },
    featuresGeneral: {
      ...vm.featuresGeneral,
      image: normalize(vm.featuresGeneral.image),
    },
    featuresNavs: {
      ...vm.featuresNavs,
      tabs: vm.featuresNavs.tabs.map(t => ({
        ...t,
        image: normalize(t.image),
      })),
    },
    testimonials: {
      ...vm.testimonials,
      items: vm.testimonials.items.map(i => ({
        ...i,
        avatar: normalize(i.avatar),
      })),
    },
  };
}

/**
 * Fetch the homepage content from Strapi for the given site and locale.
 * Returns null when CMS is not configured, content is not found, or any error occurs.
 * Does NOT throw — caller handles fallback to baseline.
 */
export async function getHomepage(
  siteKey: string,
  locale: string
): Promise<HomepageViewModel | null> {
  try {
    const path = buildHomepageQuery(siteKey, locale);

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
      return null;
    }

    const vm = parseHomepageResponse(raw);
    const cmsOrigin = getCmsConfig().baseUrl;
    if (!cmsOrigin) return vm;
    return normalizeHomepageMediaUrls(vm, cmsOrigin);
  } catch {
    // Any error (fetch, parse, timeout, etc.) → return null for baseline fallback
    return null;
  }
}
