import { strapiFetch } from './client';
import { buildHomepageQuery } from './homepage-queries';
import { parseHomepageResponse } from './homepage-schemas';
import type { HomepageViewModel } from './homepage-models';

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

    return parseHomepageResponse(raw);
  } catch {
    // Any error (fetch, parse, timeout, etc.) → return null for baseline fallback
    return null;
  }
}
