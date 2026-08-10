import { strapiFetch } from './client';
import { getCmsConfig } from './config';
import {
  buildSupportArticlesQuery,
  buildSupportArticleBySlugQuery,
  buildSupportPageQuery,
} from './support-queries';
import {
  parseSupportArticlesResponse,
  parseSupportPageResponse,
} from './support-schemas';
import { normalizeArticleMediaUrls } from './support-adapter';
import type { SupportArticleViewModel } from './support-models';
import type { SupportPageViewModel } from './support-models';

// ── Fixed Category Mapping ──

export type SupportTemplate = 'blog' | 'insight';

export function getTemplateForCategory(category: string): SupportTemplate {
  if (category === 'insight') return 'insight';
  return 'blog'; // blog + support both use blog template
}

// ── Resolver Functions ──

/**
 * Get ALL published support articles (blog + support + insight) for a locale.
 */
export async function getSupportArticles(
  siteKey: string,
  locale: string
): Promise<SupportArticleViewModel[]> {
  try {
    const path = buildSupportArticlesQuery(siteKey, locale);
    const raw: unknown = await strapiFetch(path);

    if (
      !raw ||
      typeof raw !== 'object' ||
      !('data' in raw) ||
      !Array.isArray((raw as Record<string, unknown>).data) ||
      ((raw as Record<string, unknown>).data as unknown[]).length === 0
    ) {
      return [];
    }

    const articles = parseSupportArticlesResponse(raw);
    const cmsOrigin = getCmsConfig().baseUrl;
    if (!cmsOrigin) return articles;
    return articles.map(a => normalizeArticleMediaUrls(a, cmsOrigin));
  } catch {
    return [];
  }
}

/**
 * Get a single support article by slug.
 */
export async function getSupportArticleBySlug(
  siteKey: string,
  locale: string,
  slug: string
): Promise<SupportArticleViewModel | null> {
  try {
    const path = buildSupportArticleBySlugQuery(siteKey, locale, slug);
    const raw: unknown = await strapiFetch(path);

    if (
      !raw ||
      typeof raw !== 'object' ||
      !('data' in raw) ||
      !Array.isArray((raw as Record<string, unknown>).data) ||
      ((raw as Record<string, unknown>).data as unknown[]).length === 0
    ) {
      return null;
    }

    const articles = parseSupportArticlesResponse(raw);
    const article = articles[0] || null;
    if (!article) return null;

    const cmsOrigin = getCmsConfig().baseUrl;
    if (!cmsOrigin) return article;
    return normalizeArticleMediaUrls(article, cmsOrigin);
  } catch (err) {
    // CMS errors (400, 500, timeout) must NOT be mapped to 404;
    // they should surface so the caller can distinguish "not found" from "backend error".
    // Empty data (valid 200 with data:[]) is already handled in the try block.
    console.error('[support-resolver] Failed to fetch article by slug:', err);
    throw err;
  }
}

/**
 * Get support page content (listing page metadata, labels, SEO).
 */
export async function getSupportPage(
  siteKey: string,
  locale: string
): Promise<SupportPageViewModel | null> {
  try {
    const path = buildSupportPageQuery(siteKey, locale);
    const raw: unknown = await strapiFetch(path);

    if (
      !raw ||
      typeof raw !== 'object' ||
      !('data' in raw) ||
      !Array.isArray((raw as Record<string, unknown>).data) ||
      ((raw as Record<string, unknown>).data as unknown[]).length === 0
    ) {
      return null;
    }

    return parseSupportPageResponse(raw);
  } catch {
    return null;
  }
}
