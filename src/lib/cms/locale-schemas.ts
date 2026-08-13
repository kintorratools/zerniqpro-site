import { z } from 'astro/zod';
import type { LocaleRecord, LocaleViewModel } from './locale-models';
import { CmsValidationError } from './errors';

const localeCodeSchema = z.enum(['en', 'es', 'de', 'fr', 'fa', 'ja', 'zh-cn']);

/** Raw Strapi 5 flat entity shape — Locale content type */
const localeRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  code: localeCodeSchema,
  name: z.string().trim().min(1),
  enabled: z.boolean(),
  isDefault: z.boolean(),
  direction: z.enum(['ltr', 'rtl']).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Strapi collection response: { data: LocaleRecord[] } */
const strapiCollectionLocaleSchema = z
  .object({
    data: z.array(localeRecordSchema),
  })
  .superRefine((val, ctx) => {
    // 1. Must have exactly 7 entries (all 7 codes present)
    if (val.data.length !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected exactly 7 locales, got ${val.data.length}`,
        path: ['data'],
      });
    }

    // 2. No duplicate codes
    const codes = val.data.map(r => r.code);
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
    if (dupes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate locale codes found: ${[...new Set(dupes)].join(', ')}`,
        path: ['data'],
      });
    }

    // 3. en must exist
    const enLocale = val.data.find(r => r.code === 'en');
    if (!enLocale) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'English locale (en) is required but not found',
        path: ['data'],
      });
    }

    // 4. en.enabled === true
    if (enLocale && !enLocale.enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'English locale (en) must be enabled',
        path: ['data'],
      });
    }

    // 5. en.isDefault === true
    if (enLocale && !enLocale.isDefault) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'English locale (en) must be the default locale',
        path: ['data'],
      });
    }

    // 6. Exactly one isDefault === true
    const defaults = val.data.filter(r => r.isDefault);
    if (defaults.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected exactly one default locale, got ${defaults.length}`,
        path: ['data'],
      });
    }

    // 7. Default locale must have enabled === true
    if (defaults.length === 1 && !defaults[0].enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The default locale must be enabled',
        path: ['data'],
      });
    }
  });

/** Normalize null to undefined */
function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

/** Map a validated LocaleRecord to LocaleViewModel with defaults */
function toViewModel(record: LocaleRecord): LocaleViewModel {
  return {
    code: record.code,
    name: record.name,
    enabled: record.enabled,
    isDefault: record.isDefault,
    direction: nullToUndefined(record.direction) ?? 'ltr',
  };
}

/** Parse and validate a Strapi collection response, returning all locales */
export function parseLocaleCollectionResponse(raw: unknown): LocaleViewModel[] {
  const result = strapiCollectionLocaleSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  return result.data.data.map(r => toViewModel(r));
}
