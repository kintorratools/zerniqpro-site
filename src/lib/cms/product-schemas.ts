import { z } from 'astro/zod';
import type { ProductViewModel, ProductPageViewModel } from './product-models';
import type { CmsMedia } from './media';
import { CmsValidationError, CmsContentNotFoundError } from './errors';

// ── Helpers ──

/** Strapi may return null for optional fields */
const nullableString = z.string().trim().nullable().optional();

/** Strapi may return URL fields as empty string — normalise to null */
const nullableUrl = z.preprocess(
  val => (val === '' ? null : val),
  z.string().trim().nullable().optional()
);

/** Normalize null to undefined (Strapi null → ViewModel undefined) */
function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

// ── Media schema (Strapi 5 flat format + { data: { attributes: {...} } } wrapper) ──

const mediaSchema = z.preprocess(
  (val: unknown): CmsMedia | null | undefined => {
    if (val === null || val === undefined || typeof val !== 'object')
      return val as null | undefined;
    const obj = val as Record<string, unknown>;

    // Handle Strapi 5 media relation wrapper: { data: { id, attributes: { url, ... } } }
    // or flat format: { id, documentId, url, alternativeText, ... }
    let source = obj;

    // Check for { data: {...} } wrapper
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      const dataObj = obj.data as Record<string, unknown>;
      // If inner object has 'attributes', extract from there (Strapi 4 / document-service style)
      if (
        dataObj.attributes &&
        typeof dataObj.attributes === 'object' &&
        !Array.isArray(dataObj.attributes)
      ) {
        source = dataObj.attributes as Record<string, unknown>;
      } else {
        // Flat Strapi 5 format
        source = dataObj;
      }
    }

    return {
      url: typeof source.url === 'string' ? source.url : undefined,
      alternativeText:
        typeof source.alternativeText === 'string'
          ? source.alternativeText
          : undefined,
      width: typeof source.width === 'number' ? source.width : undefined,
      height: typeof source.height === 'number' ? source.height : undefined,
      mime: typeof source.mime === 'string' ? source.mime : undefined,
    };
  },
  z
    .object({
      url: z.string().optional(),
      alternativeText: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      mime: z.string().optional(),
    })
    .nullable()
);

// ── Component schemas ──

/** Repeatable component: descriptionItems, specificationsLeft, specificationsRight */
const descriptionItemSchema = z.object({
  id: z.number(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

/** SEO component */
const seoSchema = z
  .object({
    id: z.number(),
    title: nullableString,
    description: nullableString,
  })
  .nullable()
  .optional();

// ── Strapi 5 flat entity schema ──

const productRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  handle: z.string(),
  name: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  displayOrder: z.number().nullable().optional(),
  introText: z.string().trim().nullable().optional(),
  cardImage: mediaSchema,
  mainImage: mediaSchema,
  mainImageAlt: nullableString,
  descriptionTabLabel: nullableString,
  specificationsTabLabel: nullableString,
  blueprintsTabLabel: nullableString,
  longDescriptionTitle: nullableString,
  longDescriptionSubtitle: nullableString,
  ctaLabel: nullableString,
  ctaUrl: nullableUrl,
  descriptionItems: z.array(descriptionItemSchema).nullable().optional(),
  specificationsLeft: z.array(descriptionItemSchema).nullable().optional(),
  specificationsRight: z.array(descriptionItemSchema).nullable().optional(),
  tableData: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  blueprintFirst: mediaSchema,
  blueprintSecond: mediaSchema,
  blueprintFirstAlt: nullableString,
  blueprintSecondAlt: nullableString,
  seo: seoSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

// ── Product Page record schema ──

const testimonialItemSchema = z.object({
  id: z.number(),
  content: z.string().trim().min(1),
  author: z.string().trim().min(1),
  role: z.string().trim().min(1),
  avatar: mediaSchema,
});

const productPageRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  title: nullableString,
  subtitle: nullableString,
  customerStoriesLabel: nullableString,
  whyChooseTitle: nullableString,
  whyChooseSubtitle: nullableString,
  benefit1: nullableString,
  benefit2: nullableString,
  benefit3: nullableString,
  testimonialsTitle: nullableString,
  testimonials: z.array(testimonialItemSchema).nullable().optional(),
  seo: seoSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

// ── Collection response schemas ──

const strapiProductCollectionSchema = z.object({
  data: z.array(productRecordSchema),
});

const strapiProductPageCollectionSchema = z.object({
  data: z.array(productPageRecordSchema),
});

// ── Nullable media → CmsMedia | null ──

function toCmsMediaNullable(raw: CmsMedia | null | undefined): CmsMedia | null {
  if (
    !raw ||
    (!raw.url && !raw.alternativeText && !raw.width && !raw.height && !raw.mime)
  ) {
    return null;
  }
  return raw;
}

// ── ViewModel mappers ──

/** Map a validated product record to ProductViewModel with defaults */
function toProductViewModel(
  record: z.infer<typeof productRecordSchema>
): ProductViewModel {
  const seoTitle = nullToUndefined(record.seo?.title)?.trim() || record.name;
  const seoDescription =
    nullToUndefined(record.seo?.description)?.trim() || record.summary;

  return {
    documentId: record.documentId,
    handle: record.handle,
    name: record.name,
    summary: record.summary,
    displayOrder: record.displayOrder ?? 0,
    introText: nullToUndefined(record.introText)?.trim() || '',
    cardImage: toCmsMediaNullable(record.cardImage ?? null),
    mainImage: toCmsMediaNullable(record.mainImage ?? null),
    mainImageAlt: nullToUndefined(record.mainImageAlt)?.trim() || '',
    descriptionTabLabel:
      nullToUndefined(record.descriptionTabLabel)?.trim() || 'Description',
    specificationsTabLabel:
      nullToUndefined(record.specificationsTabLabel)?.trim() ||
      'Specifications',
    blueprintsTabLabel:
      nullToUndefined(record.blueprintsTabLabel)?.trim() || 'Blueprints',
    longDescriptionTitle:
      nullToUndefined(record.longDescriptionTitle)?.trim() || '',
    longDescriptionSubtitle:
      nullToUndefined(record.longDescriptionSubtitle)?.trim() || '',
    ctaLabel: nullToUndefined(record.ctaLabel)?.trim() || '',
    ctaUrl: nullToUndefined(record.ctaUrl) || '',
    descriptionItems: (record.descriptionItems ?? []).map(item => ({
      title: item.title,
      description: item.description,
    })),
    specificationsLeft: (record.specificationsLeft ?? []).map(item => ({
      title: item.title,
      description: item.description,
    })),
    specificationsRight: (record.specificationsRight ?? []).map(item => ({
      title: item.title,
      description: item.description,
    })),
    tableData: record.tableData ?? null,
    blueprintFirst: toCmsMediaNullable(record.blueprintFirst ?? null),
    blueprintSecond: toCmsMediaNullable(record.blueprintSecond ?? null),
    blueprintFirstAlt: nullToUndefined(record.blueprintFirstAlt)?.trim() || '',
    blueprintSecondAlt:
      nullToUndefined(record.blueprintSecondAlt)?.trim() || '',
    seo: {
      title: seoTitle,
      description: seoDescription,
    },
  };
}

/** Map a validated product page record to ProductPageViewModel with defaults */
function toProductPageViewModel(
  record: z.infer<typeof productPageRecordSchema>
): ProductPageViewModel {
  return {
    documentId: record.documentId,
    title: nullToUndefined(record.title)?.trim() || 'Products',
    subtitle: nullToUndefined(record.subtitle)?.trim() || '',
    customerStoriesLabel:
      nullToUndefined(record.customerStoriesLabel)?.trim() ||
      'Customer Stories',
    whyChooseTitle:
      nullToUndefined(record.whyChooseTitle)?.trim() || 'Why Choose Us',
    whyChooseSubtitle: nullToUndefined(record.whyChooseSubtitle)?.trim() || '',
    benefit1: nullToUndefined(record.benefit1)?.trim() || '',
    benefit2: nullToUndefined(record.benefit2)?.trim() || '',
    benefit3: nullToUndefined(record.benefit3)?.trim() || '',
    testimonialsTitle:
      nullToUndefined(record.testimonialsTitle)?.trim() || 'Testimonials',
    testimonials: (record.testimonials ?? []).map(t => ({
      content: t.content,
      author: t.author,
      role: t.role,
      avatar: toCmsMediaNullable(t.avatar ?? null),
    })),
    seo: {
      title:
        nullToUndefined(record.seo?.title)?.trim() ||
        nullToUndefined(record.title)?.trim() ||
        'Products',
      description: nullToUndefined(record.seo?.description)?.trim() || '',
    },
  };
}

// ── Public parse functions ──

/**
 * Parse a Strapi collection response and return ALL validated ProductViewModels.
 * Returns an empty array if the data array is empty (no error thrown —
 * used by getAllProducts which handles the empty case at the caller level).
 */
export function parseProductCollection(raw: unknown): ProductViewModel[] {
  const result = strapiProductCollectionSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  return result.data.data.map(record => toProductViewModel(record));
}

/**
 * Parse a Strapi collection response and return the FIRST match.
 * Throws CmsContentNotFoundError if the data array is empty.
 */
export function parseProductCollectionResponse(raw: unknown): ProductViewModel {
  const result = strapiProductCollectionSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  const match = result.data.data[0];

  if (!match) {
    throw new CmsContentNotFoundError();
  }

  return toProductViewModel(match);
}

/**
 * Parse a Strapi Product Page collection response and return the first match.
 * Throws CmsContentNotFoundError if the data array is empty.
 */
export function parseProductPageResponse(raw: unknown): ProductPageViewModel {
  const result = strapiProductPageCollectionSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  const match = result.data.data[0];

  if (!match) {
    throw new CmsContentNotFoundError();
  }

  return toProductPageViewModel(match);
}
