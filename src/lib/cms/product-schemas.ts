import { z } from 'astro/zod';
import type {
  ProductRecord,
  ProductViewModel,
  ProductBlock,
} from './product-models';
import { CmsValidationError, CmsContentNotFoundError } from './errors';

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
/** Accept empty string, null, or valid URL — Strapi may return "" for empty URL fields */
const nullableUrl = z.preprocess(
  val => (val === '' ? null : val),
  urlField.nullable().optional()
);

/** Handle: lowercase letters, digits, single hyphens only */
const handleSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'handle must be lowercase letters, digits, and single hyphens'
  );

/** SEO component schema */
const seoSchema = z
  .object({
    title: nullableString,
    description: nullableString,
  })
  .nullable()
  .optional();

/** Hero component schema */
const heroSchema = z
  .object({
    eyebrow: nullableString,
    heading: nullableString,
    description: nullableString,
    imageUrl: nullableUrl,
    imageAlt: nullableString,
  })
  .nullable()
  .optional()
  .superRefine((val, ctx) => {
    if (!val) return;
    // If imageUrl is present and non-empty, imageAlt must be non-empty
    const img = val.imageUrl;
    if (img && typeof img === 'string' && img.trim().length > 0) {
      const alt = val.imageAlt;
      if (!alt || typeof alt !== 'string' || alt.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'imageAlt is required when imageUrl is present',
          path: ['imageAlt'],
        });
      }
    }
  });

/** Section item schemas — discriminated by __component */
const textSectionSchema = z.object({
  __component: z.literal('content.text'),
  heading: nullableString,
  body: nullableString,
});

const featureGridSectionSchema = z.object({
  __component: z.literal('content.feature-grid'),
  heading: nullableString,
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
      })
    )
    .max(24),
});

const specificationsSectionSchema = z.object({
  __component: z.literal('content.specifications'),
  heading: nullableString,
  rows: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        value: z.string().trim().min(1),
      })
    )
    .max(100),
});

/** Raw Strapi 5 flat entity shape */
const productRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  handle: handleSchema,
  name: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  seo: seoSchema,
  hero: heroSchema,
  sections: z
    .array(
      z.union([
        textSectionSchema,
        featureGridSectionSchema,
        specificationsSectionSchema,
      ])
    )
    .max(30)
    .nullable()
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Strapi collection response: { data: ProductRecord[] } */
const strapiCollectionProductSchema = z.object({
  data: z.array(productRecordSchema),
});

/** Normalize null to undefined */
function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

/** Parse a single validated section into a ProductBlock */
function parseSection(
  section: z.infer<
    | typeof textSectionSchema
    | typeof featureGridSectionSchema
    | typeof specificationsSectionSchema
  >
): ProductBlock {
  switch (section.__component) {
    case 'content.text': {
      const s = textSectionSchema.parse(section);
      return {
        type: 'text' as const,
        heading: nullToUndefined(s.heading),
        body: nullToUndefined(s.body),
      };
    }
    case 'content.feature-grid': {
      const s = featureGridSectionSchema.parse(section);
      return {
        type: 'feature-grid' as const,
        heading: nullToUndefined(s.heading),
        items: s.items,
      };
    }
    case 'content.specifications': {
      const s = specificationsSectionSchema.parse(section);
      return {
        type: 'specifications' as const,
        heading: nullToUndefined(s.heading),
        rows: s.rows,
      };
    }
    default:
      throw new CmsValidationError();
  }
}

/** Map a validated ProductRecord to ProductViewModel with defaults */
function toViewModel(record: ProductRecord): ProductViewModel {
  // SEO: normalize null, trim, fall back to defaults
  const seoTitle = nullToUndefined(record.seo?.title)?.trim() || record.name;
  const seoDescription =
    nullToUndefined(record.seo?.description)?.trim() || record.summary;

  // Hero: normalize null/undefined, apply defaults
  const rawHero = nullToUndefined(record.hero);
  const hero = rawHero
    ? {
        eyebrow: nullToUndefined(rawHero.eyebrow),
        heading: nullToUndefined(rawHero.heading)?.trim() || record.name,
        description:
          nullToUndefined(rawHero.description)?.trim() || record.summary,
        imageUrl: nullToUndefined(rawHero.imageUrl),
        imageAlt: nullToUndefined(rawHero.imageAlt),
      }
    : undefined;

  // Sections → blocks
  const blocks: ProductBlock[] = (record.sections ?? [])
    .filter(s => s != null)
    .map(s => parseSection(s));

  return {
    handle: record.handle,
    name: record.name,
    summary: record.summary,
    seo: { title: seoTitle, description: seoDescription },
    hero,
    blocks,
  };
}

/** Parse and validate a Strapi collection response, returning the first match */
export function parseProductCollectionResponse(raw: unknown): ProductViewModel {
  const result = strapiCollectionProductSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  const match = result.data.data[0];

  if (!match) {
    throw new CmsContentNotFoundError();
  }

  return toViewModel(match);
}
