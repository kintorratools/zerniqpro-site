import { z } from 'astro/zod';
import type { SiteRecord, SiteViewModel } from './models';
import { CmsValidationError } from './errors';

/** Raw Strapi 5 flat entity shape — no attributes wrapper */
const siteRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  siteName: z.string(),
  siteKey: z.string(),
  locale: z.string(),
  defaultLocale: z.string(),
  siteTitle: z.string(),
  siteDescription: z.string(),
  tagline: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
});

/** Strapi single-entry response: { data: SiteRecord } */
const strapiSingleSiteSchema = z.object({
  data: siteRecordSchema,
});

/** Strapi collection response: { data: SiteRecord[] } */
const strapiCollectionSiteSchema = z.object({
  data: z.array(siteRecordSchema),
});

/** Map a validated SiteRecord to SiteViewModel */
function toViewModel(record: SiteRecord): SiteViewModel {
  return {
    documentId: record.documentId,
    siteName: record.siteName,
    siteKey: record.siteKey,
    locale: record.locale,
    siteTitle: record.siteTitle,
    siteDescription: record.siteDescription,
    tagline: record.tagline,
    primaryColor: record.primaryColor,
    secondaryColor: record.secondaryColor,
    contactEmail: record.contactEmail,
    contactPhone: record.contactPhone,
    socialLinks: record.socialLinks,
    publishedAt: record.publishedAt,
  };
}

/** Parse and validate a Strapi single-entry response */
export function parseSiteResponse(raw: unknown): SiteViewModel {
  const result = strapiSingleSiteSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError(
      `Site response invalid: ${result.error.message}`
    );
  }

  return toViewModel(result.data.data);
}

/** Parse and validate a Strapi collection response, returning the first match */
export function parseSiteCollectionResponse(
  raw: unknown,
  siteKey: string
): SiteViewModel {
  const result = strapiCollectionSiteSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError(
      `Site collection response invalid: ${result.error.message}`
    );
  }

  const sites = result.data.data;
  const match = sites.find(s => s.siteKey === siteKey);

  if (!match) {
    throw new CmsValidationError(`No site found with siteKey "${siteKey}"`);
  }

  return toViewModel(match);
}
