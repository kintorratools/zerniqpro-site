import { z } from 'astro/zod';
import type {
  FooterLinkRecord,
  FooterColumnRecord,
  SocialLinkRecord,
  FooterRecord,
  FooterViewModel,
} from './footer-models';
import { CmsValidationError } from './errors';

/** Strapi may return null for optional fields */
const nullableString = z.string().trim().nullable().optional();

/** Footer link component */
const footerLinkRecordSchema = z.object({
  id: z.number().optional(),
  label: nullableString,
  url: nullableString,
});

/** Footer column component with nested links */
const footerColumnRecordSchema = z.object({
  id: z.number().optional(),
  title: nullableString,
  links: z.array(footerLinkRecordSchema).nullable().optional(),
});

/** Social link component */
const socialLinkRecordSchema = z.object({
  id: z.number().optional(),
  platform: nullableString,
  url: nullableString,
});

/** Raw Strapi 5 flat entity shape */
const footerRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  site: z
    .object({
      key: z.string().optional(),
    })
    .nullable()
    .optional(),
  locale: z.string().trim().nullable().optional(),
  columns: z.array(footerColumnRecordSchema).nullable().optional(),
  copyright: nullableString,
  legalLinks: z.array(footerLinkRecordSchema).nullable().optional(),
  socialLinks: z.array(socialLinkRecordSchema).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Strapi collection response: { data: FooterRecord[] } */
const strapiCollectionFooterSchema = z.object({
  data: z.array(footerRecordSchema),
});

/** Normalize null to undefined (Strapi null → ViewModel undefined) */
function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

/** Map a validated FooterRecord to FooterViewModel with defaults */
export function toFooterViewModel(record: FooterRecord): FooterViewModel {
  // Columns: filter null, map title (fallback ''), filter links where both label and url are non-empty
  const columns: FooterViewModel['columns'] = (record.columns ?? [])
    .filter((c): c is FooterColumnRecord => c != null)
    .map(col => ({
      title: nullToUndefined(col.title)?.trim() || '',
      links: (col.links ?? [])
        .filter((l): l is FooterLinkRecord => l != null)
        .map(l => ({
          label: nullToUndefined(l.label),
          url: nullToUndefined(l.url),
        }))
        .filter(
          (l): l is { label: string; url: string } =>
            typeof l.label === 'string' &&
            l.label.trim().length > 0 &&
            typeof l.url === 'string' &&
            l.url.trim().length > 0
        ),
    }));

  // Copyright: fallback to empty string
  const copyright = nullToUndefined(record.copyright)?.trim() || '';

  // Legal links: same filter as column links
  const legalLinks = (record.legalLinks ?? [])
    .filter((l): l is FooterLinkRecord => l != null)
    .map(l => ({
      label: nullToUndefined(l.label),
      url: nullToUndefined(l.url),
    }))
    .filter(
      (l): l is { label: string; url: string } =>
        typeof l.label === 'string' &&
        l.label.trim().length > 0 &&
        typeof l.url === 'string' &&
        l.url.trim().length > 0
    );

  // Social links: filter null, filter entries where both platform and url are non-empty strings
  const socialLinks: FooterViewModel['socialLinks'] = (record.socialLinks ?? [])
    .filter((s): s is SocialLinkRecord => s != null)
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
    columns,
    copyright,
    legalLinks,
    socialLinks,
  };
}

/** Parse and validate a Strapi collection response, returning the first match */
export function parseFooterResponse(raw: unknown): FooterViewModel {
  const result = strapiCollectionFooterSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  const match = result.data.data[0];

  if (!match) {
    throw new CmsValidationError();
  }

  return toFooterViewModel(match);
}
