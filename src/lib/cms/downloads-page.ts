import { strapiFetch } from './client';
import { getCmsConfig } from './config';
import { buildDownloadsPageQuery } from './downloads-page-queries';
import { buildDownloadsQuery } from './download-queries';
import type { CmsMedia, CmsMediaView } from './media';
import { resolveMediaUrl } from './media';
import { CmsContentNotFoundError } from './errors';
import type { DownloadEntry } from './download-models';

export type { DownloadEntry };
export interface DownloadsPageViewModel {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyText: string;
  seo: { title?: string; description?: string } | null;
}

/** Extract a flat media object from a Strapi 5 response (handles both nested {data:{attributes:{...}}} and flat formats). */
function extractMediaAttributes(raw: unknown): CmsMedia | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  // Strapi 5 nested media relation: { data: { attributes: { url, ... } } }
  if ('data' in obj && obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>;
    if (
      'attributes' in data &&
      data.attributes &&
      typeof data.attributes === 'object'
    ) {
      const attrs = data.attributes as Record<string, unknown>;
      return {
        url: typeof attrs.url === 'string' ? attrs.url : undefined,
        alternativeText:
          typeof attrs.alternativeText === 'string'
            ? attrs.alternativeText
            : undefined,
        width: typeof attrs.width === 'number' ? attrs.width : undefined,
        height: typeof attrs.height === 'number' ? attrs.height : undefined,
        mime: typeof attrs.mime === 'string' ? attrs.mime : undefined,
      };
    }
  }

  // Flat media format: { url, alternativeText, width, height, mime }
  if ('url' in obj) {
    return {
      url: typeof obj.url === 'string' ? obj.url : undefined,
      alternativeText:
        typeof obj.alternativeText === 'string'
          ? obj.alternativeText
          : undefined,
      width: typeof obj.width === 'number' ? obj.width : undefined,
      height: typeof obj.height === 'number' ? obj.height : undefined,
      mime: typeof obj.mime === 'string' ? obj.mime : undefined,
    };
  }

  return null;
}

/** Parse SEO from the Strapi response. */
function parseSeo(
  raw: unknown
): { title?: string; description?: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title : undefined;
  const description =
    typeof obj.description === 'string' ? obj.description : undefined;
  if (!title && !description) return null;
  return { title, description };
}

/**
 * Fetch the Downloads Page content from Strapi for the given locale.
 * Throws CmsContentNotFoundError if no downloads page is configured.
 */
export async function getDownloadsPage(
  locale: string
): Promise<DownloadsPageViewModel> {
  const config = getCmsConfig();

  if (!config.configured) {
    throw new Error('CMS not configured');
  }

  const path = buildDownloadsPageQuery(config.siteKey, locale);

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

  const dataArr = (raw as Record<string, unknown>).data as unknown[];
  const entry = dataArr[0] as Record<string, unknown>;
  const attrs = (entry.attributes ?? entry) as Record<string, unknown>;

  return {
    title: typeof attrs.title === 'string' ? attrs.title : '',
    subtitle: typeof attrs.subtitle === 'string' ? attrs.subtitle : '',
    emptyTitle: typeof attrs.emptyTitle === 'string' ? attrs.emptyTitle : '',
    emptyText: typeof attrs.emptyText === 'string' ? attrs.emptyText : '',
    seo: parseSeo(attrs.seo),
  };
}

/**
 * Fetch the list of Downloads from Strapi for the given locale.
 * Sorted by displayOrder ascending.
 */
export async function getDownloads(locale: string): Promise<DownloadEntry[]> {
  const config = getCmsConfig();

  if (!config.configured) {
    throw new Error('CMS not configured');
  }

  const path = buildDownloadsQuery(config.siteKey, locale);

  const raw: unknown = await strapiFetch(path);

  if (
    !raw ||
    typeof raw !== 'object' ||
    !('data' in raw) ||
    !Array.isArray((raw as Record<string, unknown>).data)
  ) {
    return [];
  }

  const dataArr = (raw as Record<string, unknown>).data as unknown[];
  const cmsOrigin = config.baseUrl ?? '';

  const downloads: DownloadEntry[] = dataArr.map((item: unknown) => {
    const entry = item as Record<string, unknown>;
    const attrs = (entry.attributes ?? entry) as Record<string, unknown>;

    const fileRaw = extractMediaAttributes(attrs.file);
    const fileUrl = fileRaw?.url
      ? resolveMediaUrl(fileRaw.url, cmsOrigin)
      : undefined;

    return {
      id: typeof entry.id === 'number' ? entry.id : 0,
      title: typeof attrs.title === 'string' ? attrs.title : '',
      description:
        typeof attrs.description === 'string' ? attrs.description : '',
      categoryKey:
        typeof attrs.categoryKey === 'string' ? attrs.categoryKey : '',
      categoryLabel:
        typeof attrs.categoryLabel === 'string' ? attrs.categoryLabel : '',
      version: typeof attrs.version === 'string' ? attrs.version : '',
      platform: typeof attrs.platform === 'string' ? attrs.platform : '',
      file: fileUrl
        ? {
            url: fileUrl,
            alt: fileRaw?.alternativeText ?? '',
            width: fileRaw?.width,
            height: fileRaw?.height,
          }
        : null,
      displayOrder:
        typeof attrs.displayOrder === 'number' ? attrs.displayOrder : 0,
    };
  });

  downloads.sort((a, b) => a.displayOrder - b.displayOrder);
  return downloads;
}
