import { z } from 'astro/zod';
import type { BrandRecord, BrandViewModel } from './brand-models';
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

/** Strapi may return null for optional fields */
const nullableString = z.string().trim().nullable().optional();
const nullableUrl = urlField.nullable().optional();
const nullableHex = hexColor.nullable().optional();

/** Key: lowercase letters, digits, single hyphens only */
const keySchema = z
  .string()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'key must be lowercase letters, digits, and single hyphens'
  );

/** Logo component schema */
const logoSchema = z
  .object({
    url: nullableUrl,
    alt: nullableString,
  })
  .nullable()
  .optional();

/** Favicon component schema */
const faviconSchema = z
  .object({
    url: nullableUrl,
  })
  .nullable()
  .optional();

/** Colors component schema */
const colorsSchema = z
  .object({
    primary: nullableHex,
    secondary: nullableHex,
    accent: nullableHex,
  })
  .nullable()
  .optional();

/** SEO component schema with optional ogImage */
const seoSchema = z
  .object({
    title: nullableString,
    description: nullableString,
    ogImage: z
      .object({
        url: nullableUrl,
        alt: nullableString,
      })
      .nullable()
      .optional(),
  })
  .nullable()
  .optional();

/** Social link item schema */
const socialLinkSchema = z.object({
  platform: nullableString,
  url: nullableUrl,
});

/** Raw Strapi 5 flat entity shape */
const brandRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  key: keySchema,
  name: z.string().trim().min(1),
  legalName: nullableString,
  logo: logoSchema,
  favicon: faviconSchema,
  colors: colorsSchema,
  defaultSeo: seoSchema,
  socialLinks: z.array(socialLinkSchema).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Strapi collection response: { data: BrandRecord[] } */
const strapiCollectionBrandSchema = z.object({
  data: z.array(brandRecordSchema),
});

/** Normalize null to undefined (Strapi null → ViewModel undefined) */
function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

/** Map a validated BrandRecord to BrandViewModel with defaults */
function toViewModel(record: BrandRecord): BrandViewModel {
  // SEO: normalize null, trim, fall back to defaults
  const seoTitle =
    nullToUndefined(record.defaultSeo?.title)?.trim() || record.name;
  const seoDescription =
    nullToUndefined(record.defaultSeo?.description)?.trim() || '';

  // SEO ogImage: normalize null/undefined
  const rawOgImage = nullToUndefined(record.defaultSeo?.ogImage);
  const seoOgImage = rawOgImage
    ? {
        url: nullToUndefined(rawOgImage.url),
        alt: nullToUndefined(rawOgImage.alt),
      }
    : undefined;

  // Logo: normalize null/undefined at component and field level
  const rawLogo = nullToUndefined(record.logo);
  const logo = rawLogo
    ? {
        url: nullToUndefined(rawLogo.url),
        alt: nullToUndefined(rawLogo.alt),
      }
    : undefined;

  // Favicon: normalize null/undefined at component and field level
  const rawFavicon = nullToUndefined(record.favicon);
  const favicon = rawFavicon
    ? {
        url: nullToUndefined(rawFavicon.url),
      }
    : undefined;

  // Colors: normalize null/undefined at component and field level
  const rawColors = nullToUndefined(record.colors);
  const colors = rawColors
    ? {
        primary: nullToUndefined(rawColors.primary),
        secondary: nullToUndefined(rawColors.secondary),
        accent: nullToUndefined(rawColors.accent),
      }
    : undefined;

  // Social links: filter null, require both platform and url
  const socialLinks = (record.socialLinks ?? [])
    .filter(s => s != null)
    .map(s => ({
      platform: nullToUndefined(s.platform),
      url: nullToUndefined(s.url),
    }))
    .filter(
      (s): s is { platform: string; url: string } =>
        typeof s.platform === 'string' &&
        s.platform.trim().length > 0 &&
        typeof s.url === 'string' &&
        s.url.trim().length > 0
    );

  return {
    key: record.key,
    name: record.name,
    logo,
    favicon,
    colors,
    seo: {
      title: seoTitle,
      description: seoDescription,
      ...(seoOgImage ? { ogImage: seoOgImage } : {}),
    },
    ...(socialLinks.length > 0 ? { socialLinks } : {}),
  };
}

/** Parse and validate a Strapi collection response, returning the first match */
export function parseBrandResponse(raw: unknown): BrandViewModel {
  const result = strapiCollectionBrandSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  const match = result.data.data[0];

  if (!match) {
    throw new CmsValidationError();
  }

  return toViewModel(match);
}
