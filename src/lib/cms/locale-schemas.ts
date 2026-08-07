import { z } from 'astro/zod';
import type { LocaleRecord, LocaleViewModel } from './locale-models';
import { CmsValidationError } from './errors';

const localeCodeSchema = z.enum(['en', 'es', 'de', 'fr', 'pt-BR']);

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
    const defaults = val.data.filter(r => r.isDefault);
    if (defaults.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected exactly one default locale, got ${defaults.length}`,
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
