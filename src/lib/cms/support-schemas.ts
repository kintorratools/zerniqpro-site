import { z } from 'astro/zod';
import type {
  SupportArticleViewModel,
  SupportPageViewModel,
  SafeBlock,
} from './support-models';
import { CmsValidationError, CmsContentNotFoundError } from './errors';
import { toCmsMediaView } from './media';
import type { CmsMedia } from './media';

/** Accept empty string, null, or a valid string */
const nullableString = z.string().trim().nullable().optional();

/** Media field shape from Strapi 5 */
const mediaSchema = z.preprocess(
  (val: unknown): CmsMedia | null | undefined => {
    if (val === null || val === undefined || typeof val !== 'object')
      return val as null | undefined;
    const obj = val as Record<string, unknown>;
    return {
      url: typeof obj.url === 'string' ? obj.url : undefined,
      alternativeText:
        typeof obj.alternativeText === 'string'
          ? obj.alternativeText
          : undefined,
      width: typeof obj.width === 'number' ? obj.width : undefined,
      height: typeof obj.height === 'number' ? obj.height : undefined,
      mime: typeof obj.mime === 'string' ? obj.mime : undefined,
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
    .optional()
);

/** Recursive safe block schema */
const safeBlockSchema: z.ZodType<SafeBlock> = z.lazy(() =>
  z.object({
    type: z.string(),
    children: z.array(safeBlockSchema).optional(),
    text: z.string().optional(),
    level: z.number().optional(),
    format: z.string().optional(),
    url: z.string().optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
  })
);

/** SEO schema */
const articleSeoSchema = z.object({
  title: nullableString,
  description: nullableString,
});

/** Support article record from Strapi 5 flat response */
const supportArticleRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  locale: z.string().nullable().optional(),
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  excerpt: z.string().trim().nullable().optional().default(''),
  content: z.array(safeBlockSchema).nullable().optional().default([]),
  category: z.enum(['blog', 'support', 'insight']).nullable().optional(),
  tags: z.array(z.string().trim()).nullable().optional().default([]),
  author: z.string().trim().nullable().optional().default(''),
  authorRole: z.string().trim().nullable().optional().default(''),
  displayDate: z.string().nullable().optional(),
  readTimeMinutes: z.number().int().nullable().optional(),
  cardImage: mediaSchema,
  cardImageAlt: z.string().trim().nullable().optional().default(''),
  authorImage: mediaSchema,
  authorImageAlt: z.string().trim().nullable().optional().default(''),
  seo: articleSeoSchema.nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Support page record from Strapi 5 flat response */
const supportPageRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  title: z.string().trim().nullable().optional().default(''),
  subtitle: z.string().trim().nullable().optional().default(''),
  insightsTitle: z.string().trim().nullable().optional().default(''),
  insightsSubtitle: z.string().trim().nullable().optional().default(''),
  recentCtaLabel: z.string().trim().nullable().optional().default(''),
  emptyArticlesText: z.string().trim().nullable().optional().default(''),
  emptyInsightsText: z.string().trim().nullable().optional().default(''),
  relatedTitle: z.string().trim().nullable().optional().default(''),
  feedbackTitle: z.string().trim().nullable().optional().default(''),
  feedbackYesLabel: z.string().trim().nullable().optional().default(''),
  feedbackNoLabel: z.string().trim().nullable().optional().default(''),
  seo: z
    .object({
      title: nullableString,
      description: nullableString,
    })
    .nullable()
    .optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Strapi collection response: { data: SupportArticleRecord[] } */
const strapiCollectionArticlesSchema = z.object({
  data: z.array(supportArticleRecordSchema),
});

/** Strapi collection response: { data: SupportPageRecord[] } */
const strapiCollectionPageSchema = z.object({
  data: z.array(supportPageRecordSchema),
});

/** Normalize null to undefined */
function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

/** Map a validated article record to SupportArticleViewModel */
function toArticleViewModel(
  record: z.infer<typeof supportArticleRecordSchema>
): SupportArticleViewModel {
  return {
    documentId: record.documentId,
    locale: nullToUndefined(record.locale) || 'en',
    title: record.title,
    slug: record.slug,
    excerpt: nullToUndefined(record.excerpt) || '',
    content: record.content || [],
    category: nullToUndefined(record.category) || 'blog',
    tags: record.tags || [],
    author: nullToUndefined(record.author) || '',
    authorRole: nullToUndefined(record.authorRole) || '',
    displayDate: nullToUndefined(record.displayDate) || null,
    readTimeMinutes: nullToUndefined(record.readTimeMinutes) ?? null,
    cardImage: toCmsMediaView(record.cardImage ?? null, record.cardImageAlt),
    cardImageAlt: nullToUndefined(record.cardImageAlt) || '',
    authorImage: toCmsMediaView(
      record.authorImage ?? null,
      record.authorImageAlt
    ),
    authorImageAlt: nullToUndefined(record.authorImageAlt) || '',
    seo: {
      title: nullToUndefined(record.seo?.title)?.trim() || record.title,
      description:
        nullToUndefined(record.seo?.description)?.trim() ||
        nullToUndefined(record.excerpt) ||
        '',
    },
  };
}

/** Map a validated page record to SupportPageViewModel */
function toPageViewModel(
  record: z.infer<typeof supportPageRecordSchema>
): SupportPageViewModel {
  return {
    title: nullToUndefined(record.title) || '',
    subtitle: nullToUndefined(record.subtitle) || '',
    insightsTitle: nullToUndefined(record.insightsTitle) || '',
    insightsSubtitle: nullToUndefined(record.insightsSubtitle) || '',
    recentCtaLabel: nullToUndefined(record.recentCtaLabel) || '',
    emptyArticlesText: nullToUndefined(record.emptyArticlesText) || '',
    emptyInsightsText: nullToUndefined(record.emptyInsightsText) || '',
    relatedTitle: nullToUndefined(record.relatedTitle) || '',
    feedbackTitle: nullToUndefined(record.feedbackTitle) || '',
    feedbackYesLabel: nullToUndefined(record.feedbackYesLabel) || '',
    feedbackNoLabel: nullToUndefined(record.feedbackNoLabel) || '',
    seo: {
      title: nullToUndefined(record.seo?.title)?.trim() || '',
      description: nullToUndefined(record.seo?.description)?.trim() || '',
    },
  };
}

/** Parse article collection response, returning an array of ViewModels */
export function parseSupportArticlesResponse(
  raw: unknown
): SupportArticleViewModel[] {
  const result = strapiCollectionArticlesSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  return result.data.data.map(toArticleViewModel);
}

/** Parse page collection response, returning the first match */
export function parseSupportPageResponse(raw: unknown): SupportPageViewModel {
  const result = strapiCollectionPageSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  const match = result.data.data[0];

  if (!match) {
    throw new CmsContentNotFoundError();
  }

  return toPageViewModel(match);
}
