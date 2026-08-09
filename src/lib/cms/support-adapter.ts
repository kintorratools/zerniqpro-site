import type { SupportArticleViewModel } from './support-models';
import type { CmsMediaView } from './media';
import { resolveMediaUrl } from './media';

/**
 * Normalize all media URLs in a SupportArticleViewModel.
 * - `/uploads/...` paths are prefixed with cmsOrigin
 * - `https://...` URLs are kept as-is
 * - Fields that resolve to undefined are set to null
 */
export function normalizeArticleMediaUrls(
  article: SupportArticleViewModel,
  cmsOrigin: string
): SupportArticleViewModel {
  const normalize = (
    field: CmsMediaView | null | undefined
  ): CmsMediaView | null => {
    if (!field) return null;
    const resolved = resolveMediaUrl(field.url, cmsOrigin);
    if (!resolved) return null;
    return { ...field, url: resolved };
  };

  return {
    ...article,
    cardImage: normalize(article.cardImage),
    authorImage: normalize(article.authorImage),
  };
}
