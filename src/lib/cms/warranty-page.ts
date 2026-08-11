import { strapiFetch } from './client';
import { getCmsConfig } from './config';
import { buildWarrantyPageQuery } from './warranty-page-queries';
import { CmsContentNotFoundError } from './errors';

export interface WarrantyBlock {
  heading: string;
  content: string;
}

export interface WarrantyPageViewModel {
  title: string;
  intro: string;
  body: WarrantyBlock[];
  contactCtaLabel: string;
  contactCtaUrl: string;
  seo: { title?: string; description?: string } | null;
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
 * Fetch the Warranty Page content from Strapi for the given locale.
 * Throws CmsContentNotFoundError if no warranty page is configured.
 */
export async function getWarrantyPage(
  locale: string
): Promise<WarrantyPageViewModel> {
  const config = getCmsConfig();

  if (!config.configured) {
    throw new Error('CMS not configured');
  }

  const path = buildWarrantyPageQuery(config.siteKey, locale);

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

  const bodyRaw = Array.isArray(attrs.body) ? (attrs.body as unknown[]) : [];

  const body: WarrantyBlock[] = bodyRaw.map((block: unknown) => {
    const b = (block ?? {}) as Record<string, unknown>;
    return {
      heading: typeof b.heading === 'string' ? b.heading : '',
      content: typeof b.content === 'string' ? b.content : '',
    };
  });

  return {
    title: typeof attrs.title === 'string' ? attrs.title : '',
    intro: typeof attrs.intro === 'string' ? attrs.intro : '',
    body,
    contactCtaLabel:
      typeof attrs.contactCtaLabel === 'string' ? attrs.contactCtaLabel : '',
    contactCtaUrl:
      typeof attrs.contactCtaUrl === 'string' ? attrs.contactCtaUrl : '',
    seo: parseSeo(attrs.seo),
  };
}
