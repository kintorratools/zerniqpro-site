import { strapiFetch } from './client';
import { getCmsConfig } from './config';
import { buildServicesPageQuery } from './services-page-queries';
import type { CmsMedia, CmsMediaView } from './media';
import { resolveMediaUrl } from './media';
import { CmsContentNotFoundError } from './errors';

export interface ServiceSlot {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaUrl?: string;
  image1: CmsMediaView | null;
  image1Alt: string;
  image2: CmsMediaView | null;
  image2Alt: string;
}

export interface ServicesPageViewModel {
  introTitle: string;
  introSubtitle: string;
  introCtaLabel?: string;
  introCtaUrl?: string;
  service1: ServiceSlot;
  service2: ServiceSlot;
  service3: ServiceSlot;
  service4: ServiceSlot;
  service5: ServiceSlot;
  statsTitle: string;
  statsSubtitle: string;
  mainStatValue: string;
  mainStatDescription: string;
  stat1Value: string;
  stat1Description: string;
  stat2Value: string;
  stat2Description: string;
  stat3Value: string;
  stat3Description: string;
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

/** Parse a raw service slot from the Strapi response. */
function parseServiceSlot(raw: unknown, cmsOrigin: string): ServiceSlot {
  const obj = (raw as Record<string, unknown>) ?? {};

  const image1Raw = extractMediaAttributes(obj.image1);
  const image2Raw = extractMediaAttributes(obj.image2);

  const image1Url = image1Raw?.url
    ? resolveMediaUrl(image1Raw.url, cmsOrigin)
    : undefined;
  const image2Url = image2Raw?.url
    ? resolveMediaUrl(image2Raw.url, cmsOrigin)
    : undefined;

  const image1Alt = image1Raw?.alternativeText ?? '';
  const image2Alt = image2Raw?.alternativeText ?? '';

  return {
    title: typeof obj.title === 'string' ? obj.title : '',
    description: typeof obj.description === 'string' ? obj.description : '',
    ctaLabel: typeof obj.ctaLabel === 'string' ? obj.ctaLabel : undefined,
    ctaUrl: typeof obj.ctaUrl === 'string' ? obj.ctaUrl : undefined,
    image1: image1Url
      ? {
          url: image1Url,
          alt: image1Alt,
          width: image1Raw?.width,
          height: image1Raw?.height,
        }
      : null,
    image1Alt,
    image2: image2Url
      ? {
          url: image2Url,
          alt: image2Alt,
          width: image2Raw?.width,
          height: image2Raw?.height,
        }
      : null,
    image2Alt,
  };
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
 * Fetch the Services Page content from Strapi for the given locale.
 * Throws CmsContentNotFoundError if no services page is configured.
 */
export async function getServicesPage(
  locale: string
): Promise<ServicesPageViewModel> {
  const config = getCmsConfig();

  if (!config.configured) {
    throw new Error('CMS not configured');
  }

  const path = buildServicesPageQuery(config.siteKey, locale);

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

  const cmsOrigin = config.baseUrl ?? '';

  return {
    introTitle: typeof attrs.introTitle === 'string' ? attrs.introTitle : '',
    introSubtitle:
      typeof attrs.introSubtitle === 'string' ? attrs.introSubtitle : '',
    introCtaLabel:
      typeof attrs.introCtaLabel === 'string' ? attrs.introCtaLabel : undefined,
    introCtaUrl:
      typeof attrs.introCtaUrl === 'string' ? attrs.introCtaUrl : undefined,
    service1: parseServiceSlot(attrs.service1, cmsOrigin),
    service2: parseServiceSlot(attrs.service2, cmsOrigin),
    service3: parseServiceSlot(attrs.service3, cmsOrigin),
    service4: parseServiceSlot(attrs.service4, cmsOrigin),
    service5: parseServiceSlot(attrs.service5, cmsOrigin),
    statsTitle: typeof attrs.statsTitle === 'string' ? attrs.statsTitle : '',
    statsSubtitle:
      typeof attrs.statsSubtitle === 'string' ? attrs.statsSubtitle : '',
    mainStatValue:
      typeof attrs.mainStatValue === 'string' ? attrs.mainStatValue : '',
    mainStatDescription:
      typeof attrs.mainStatDescription === 'string'
        ? attrs.mainStatDescription
        : '',
    stat1Value: typeof attrs.stat1Value === 'string' ? attrs.stat1Value : '',
    stat1Description:
      typeof attrs.stat1Description === 'string' ? attrs.stat1Description : '',
    stat2Value: typeof attrs.stat2Value === 'string' ? attrs.stat2Value : '',
    stat2Description:
      typeof attrs.stat2Description === 'string' ? attrs.stat2Description : '',
    stat3Value: typeof attrs.stat3Value === 'string' ? attrs.stat3Value : '',
    stat3Description:
      typeof attrs.stat3Description === 'string' ? attrs.stat3Description : '',
    seo: parseSeo(attrs.seo),
  };
}
