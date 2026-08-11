import { strapiFetch } from './client';
import { getCmsConfig } from './config';
import { buildLegalPageQuery } from './legal-page-queries';
import { CmsContentNotFoundError } from './errors';

export interface LegalBlock {
  heading: string;
  content: string;
}

export interface LegalPageViewModel {
  kind: 'privacy' | 'terms';
  title: string;
  body: LegalBlock[];
  effectiveDate: string;
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
 * Fetch a Legal Page content from Strapi for the given locale and kind.
 * Throws CmsContentNotFoundError if no legal page is configured.
 */
export async function getLegalPage(
  locale: string,
  kind: 'privacy' | 'terms'
): Promise<LegalPageViewModel> {
  const config = getCmsConfig();

  if (!config.configured) {
    throw new Error('CMS not configured');
  }

  const path = buildLegalPageQuery(config.siteKey, locale, kind);

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

  const body: LegalBlock[] = bodyRaw.map((block: unknown) => {
    const b = (block ?? {}) as Record<string, unknown>;
    return {
      heading: typeof b.heading === 'string' ? b.heading : '',
      content: typeof b.content === 'string' ? b.content : '',
    };
  });

  return {
    kind,
    title: typeof attrs.title === 'string' ? attrs.title : '',
    body,
    effectiveDate:
      typeof attrs.effectiveDate === 'string' ? attrs.effectiveDate : '',
    seo: parseSeo(attrs.seo),
  };
}
