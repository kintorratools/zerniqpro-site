import { z } from 'astro/zod';
import type { SiteRecord, SiteViewModel } from './models';
import { CmsValidationError } from './errors';

/** Strapi may return null for optional components or fields */
const nullableString = z.string().trim().nullable().optional();

/** URL that must use http or https protocol */
const urlField = z
  .string()
  .url()
  .refine(
    val => {
      try {
        const u = new URL(val);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'must be an http or https URL' }
  );

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
      title: nullableString,
      description: nullableString,
    })
    .nullable()
    .optional(),
  brand: z
    .object({
      documentId: z.string(),
      key: z.string().trim().min(1),
    })
    .nullable()
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Strapi collection response: { data: SiteRecord[] } */
const strapiCollectionSiteSchema = z.object({
  data: z.array(siteRecordSchema),
});

/** Normalize null to undefined (Strapi null → ViewModel undefined) */
function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

/** Map a validated SiteRecord to SiteViewModel with defaults */
function toViewModel(record: SiteRecord): SiteViewModel {
  // SEO: normalize null, trim, fall back to defaults
  const seoTitle =
    nullToUndefined(record.defaultSeo?.title)?.trim() || record.name;
  const seoDescription =
    nullToUndefined(record.defaultSeo?.description)?.trim() || '';

  if (!record.brand || !record.brand.key?.trim()) {
    throw new CmsValidationError();
  }

  return {
    key: record.key,
    name: record.name,
    domain: record.domain.replace(/\/$/, ''),
    defaultLocale: record.defaultLocale,
    seo: { title: seoTitle, description: seoDescription },
    brandKey: record.brand.key.trim(),
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
