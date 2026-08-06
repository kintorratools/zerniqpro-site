import { z } from 'astro/zod';
import type { SiteRecord, SiteViewModel } from './models';
import { CmsValidationError } from './errors';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{3,8}$/, 'must be a hex color');

const urlField = z.string().url();

/** Raw Strapi 5 flat entity shape — no attributes wrapper */
const siteRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  domain: urlField,
  defaultLocale: z.string().trim().min(1),
  defaultSeo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  branding: z
    .object({
      logoUrl: urlField.optional(),
      faviconUrl: urlField.optional(),
      primaryColor: hexColor.optional(),
      accentColor: hexColor.optional(),
    })
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Strapi collection response: { data: SiteRecord[] } */
const strapiCollectionSiteSchema = z.object({
  data: z.array(siteRecordSchema),
});

/** Map a validated SiteRecord to SiteViewModel with defaults */
function toViewModel(record: SiteRecord): SiteViewModel {
  return {
    key: record.key,
    name: record.name,
    domain: record.domain,
    defaultLocale: record.defaultLocale,
    seo: {
      title: record.defaultSeo?.title || record.name,
      description:
        record.defaultSeo?.description ||
        `Official website for ${record.name}.`,
    },
    branding: record.branding
      ? {
          logoUrl: record.branding.logoUrl,
          faviconUrl: record.branding.faviconUrl,
          primaryColor: record.branding.primaryColor,
          accentColor: record.branding.accentColor,
        }
      : undefined,
  };
}

/** Parse and validate a Strapi collection response, returning the first match */
export function parseSiteCollectionResponse(raw: unknown): SiteViewModel {
  const result = strapiCollectionSiteSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  const match = result.data.data[0];

  if (!match) {
    throw new CmsValidationError();
  }

  return toViewModel(match);
}
