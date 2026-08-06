import { z } from 'astro/zod';
import type { SiteRecord, SiteViewModel } from './models';
import { CmsValidationError } from './errors';

/** Accept only #RGB, #RGBA, #RRGGBB, #RRGGBBAA */
const hexColor = z
  .string()
  .regex(
    /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/,
    'must be a hex color (#RGB, #RGBA, #RRGGBB, or #RRGGBBAA)'
  );

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

/** Strapi may return null for optional components or fields */
const nullableString = z.string().trim().nullable().optional();
const nullableUrl = urlField.nullable().optional();
const nullableHex = hexColor.nullable().optional();

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
  branding: z
    .object({
      logoUrl: nullableUrl,
      faviconUrl: nullableUrl,
      primaryColor: nullableHex,
      accentColor: nullableHex,
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
    nullToUndefined(record.defaultSeo?.description)?.trim() ||
    `Official website for ${record.name}.`;

  // Branding: normalize null/undefined at component and field level
  const rawBranding = nullToUndefined(record.branding);
  const branding = rawBranding
    ? {
        logoUrl: nullToUndefined(rawBranding.logoUrl),
        faviconUrl: nullToUndefined(rawBranding.faviconUrl),
        primaryColor: nullToUndefined(rawBranding.primaryColor),
        accentColor: nullToUndefined(rawBranding.accentColor),
      }
    : undefined;

  return {
    key: record.key,
    name: record.name,
    domain: record.domain,
    defaultLocale: record.defaultLocale,
    seo: { title: seoTitle, description: seoDescription },
    branding,
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
