import { z } from 'astro/zod';
import type { HomepageViewModel } from './homepage-models';
import { CmsValidationError, CmsContentNotFoundError } from './errors';
import { toCmsMediaView } from './media';
import type { CmsMedia, CmsMediaView } from './media';

/** Accept empty string, null, or a valid string */
const nullableString = z.string().trim().nullable().optional();

/** Accept strings; HTML escape is applied at render time via escapeCmsText() */
const safeString = z.string().trim().nullable().optional();

/** Media field shape from Strapi 5 — liberal preprocessor that extracts the fields we need */
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

// ── Sub-component schemas ──

const partnerSchema = z.object({
  name: z.string().trim().min(1).nullable().optional().default(''),
  url: z.string().nullable().optional().default('#'),
  alt: z.string().nullable().optional().default(''),
  logo: mediaSchema,
});

const featureItemSchema = z.object({
  heading: z.string().trim().min(1),
  content: z.string().trim().min(1),
  svg: z.string().trim().min(1),
});

const featureTabSchema = z.object({
  heading: z.string().trim().min(1),
  content: z.string().trim().min(1),
  iconKey: z.string().trim().min(1),
  imageAlt: z.string().nullable().optional().default(''),
  image: mediaSchema,
});

const testimonialItemSchema = z.object({
  content: z.string().trim().min(1),
  author: z.string().trim().min(1),
  role: z.string().trim().min(1),
  avatar: mediaSchema,
});

const statisticSchema = z.object({
  count: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

const pricingPlanSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.string().trim().min(1),
  cents: z.preprocess(
    val => (val === null || val === undefined ? '.00' : val),
    z.string().trim().default('.00')
  ),
  billingFrequency: z.preprocess(
    val => (val === null || val === undefined ? 'USD / monthly' : val),
    z.string().trim().default('USD / monthly')
  ),
  features: z.array(z.string().trim().min(1)),
  purchaseBtnTitle: z.string().trim().min(1),
  purchaseLink: z.preprocess(
    val => (val === null || val === undefined ? '#' : val),
    z.string().default('#')
  ),
});

const faqItemSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

// ── Section schemas ──

const announcementSchema = z.object({
  enabled: z.boolean().nullable().optional().default(true),
  buttonLabel: safeString,
  url: z.string().nullable().optional().default(''),
});

const heroSchema = z.object({
  titleBefore: safeString,
  highlightText: safeString,
  titleAfter: safeString,
  subTitle: safeString,
  primaryButtonLabel: safeString,
  primaryButtonUrl: z.string().nullable().optional().default(''),
  secondaryButtonLabel: safeString,
  secondaryButtonUrl: z.string().nullable().optional().default(''),
  withReview: z.boolean().nullable().optional().default(true),
  ratingText: safeString,
  starCount: z.number().int().min(0).max(5).nullable().optional().default(4),
  reviewsText: safeString,
  imageAlt: z.string().nullable().optional().default(''),
  image: mediaSchema,
  avatars: z.array(mediaSchema).nullable().optional().default([]),
});

const clientsSchema = z.object({
  title: nullableString,
  subTitle: nullableString,
  partners: z.array(partnerSchema).nullable().optional().default([]),
});

const featuresGeneralSchema = z.object({
  title: nullableString,
  subTitle: nullableString,
  imageAlt: z.string().nullable().optional().default(''),
  image: mediaSchema,
  items: z.array(featureItemSchema).nullable().optional().default([]),
});

const featuresNavsSchema = z.object({
  titleBefore: safeString,
  highlightText: safeString,
  titleAfter: safeString,
  tabs: z.array(featureTabSchema).nullable().optional().default([]),
});

const testimonialsSchema = z.object({
  title: nullableString,
  subTitle: nullableString,
  items: z.array(testimonialItemSchema).nullable().optional().default([]),
  statistics: z.array(statisticSchema).nullable().optional().default([]),
});

const pricingSchema = z.object({
  title: nullableString,
  subTitle: nullableString,
  badge: nullableString,
  thirdOption: nullableString,
  btnText: nullableString,
  starterKit: pricingPlanSchema.nullable().optional(),
  professionalToolbox: pricingPlanSchema.nullable().optional(),
});

const faqSchema = z.object({
  titleLine1: safeString,
  titleLine2: safeString,
  items: z.array(faqItemSchema).nullable().optional().default([]),
});

const bottomCtaSchema = z.object({
  title: nullableString,
  subTitle: nullableString,
  buttonLabel: nullableString,
  url: z.string().nullable().optional().default(''),
});

const seoSchema = z.object({
  title: nullableString,
  description: nullableString,
});

/** Raw Strapi 5 flat entity shape */
const homepageRecordSchema = z.object({
  id: z.number(),
  documentId: z.string(),
  announcement: announcementSchema.nullable().optional(),
  hero: heroSchema.nullable().optional(),
  clients: clientsSchema.nullable().optional(),
  featuresGeneral: featuresGeneralSchema.nullable().optional(),
  featuresNavs: featuresNavsSchema.nullable().optional(),
  testimonials: testimonialsSchema.nullable().optional(),
  pricing: pricingSchema.nullable().optional(),
  faq: faqSchema.nullable().optional(),
  bottomCta: bottomCtaSchema.nullable().optional(),
  seo: seoSchema.nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

/** Strapi collection response: { data: HomepageRecord[] } */
const strapiCollectionHomepageSchema = z.object({
  data: z.array(homepageRecordSchema),
});

/** Normalize null to undefined */
function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  return v === null ? undefined : v;
}

/** Map a validated HomepageRecord to HomepageViewModel with defaults */
function toHomepageViewModel(
  record: z.infer<typeof homepageRecordSchema>
): HomepageViewModel {
  return {
    announcement: {
      enabled: record.announcement?.enabled ?? true,
      buttonLabel:
        nullToUndefined(record.announcement?.buttonLabel)?.trim() || '',
      url: nullToUndefined(record.announcement?.url) || '',
    },
    hero: {
      titleBefore: nullToUndefined(record.hero?.titleBefore)?.trim() || '',
      highlightText: nullToUndefined(record.hero?.highlightText)?.trim() || '',
      titleAfter: nullToUndefined(record.hero?.titleAfter)?.trim() || '',
      subTitle: nullToUndefined(record.hero?.subTitle)?.trim() || '',
      primaryButtonLabel:
        nullToUndefined(record.hero?.primaryButtonLabel)?.trim() || '',
      primaryButtonUrl: nullToUndefined(record.hero?.primaryButtonUrl) || '',
      secondaryButtonLabel:
        nullToUndefined(record.hero?.secondaryButtonLabel)?.trim() || '',
      secondaryButtonUrl:
        nullToUndefined(record.hero?.secondaryButtonUrl) || '',
      withReview: record.hero?.withReview ?? true,
      ratingText: nullToUndefined(record.hero?.ratingText)?.trim() || '',
      starCount: record.hero?.starCount ?? 4,
      reviewsText: nullToUndefined(record.hero?.reviewsText)?.trim() || '',
      imageAlt: nullToUndefined(record.hero?.imageAlt) || '',
      image: toCmsMediaView(record.hero?.image ?? null, record.hero?.imageAlt),
      avatars: (record.hero?.avatars ?? [])
        .map(a => toCmsMediaView(a, null))
        .filter((v): v is CmsMediaView => v !== null),
    },
    clients: {
      title: nullToUndefined(record.clients?.title)?.trim() || '',
      subTitle: nullToUndefined(record.clients?.subTitle)?.trim() || '',
      partners: (record.clients?.partners ?? []).map(p => ({
        name: p.name || '',
        url: p.url || '#',
        alt: p.alt || '',
        logo: toCmsMediaView(p.logo ?? null, p.alt),
      })),
    },
    featuresGeneral: {
      title: nullToUndefined(record.featuresGeneral?.title)?.trim() || '',
      subTitle: nullToUndefined(record.featuresGeneral?.subTitle)?.trim() || '',
      imageAlt: nullToUndefined(record.featuresGeneral?.imageAlt) || '',
      image: toCmsMediaView(
        record.featuresGeneral?.image ?? null,
        record.featuresGeneral?.imageAlt
      ),
      items: record.featuresGeneral?.items ?? [],
    },
    featuresNavs: {
      titleBefore:
        nullToUndefined(record.featuresNavs?.titleBefore)?.trim() || '',
      highlightText:
        nullToUndefined(record.featuresNavs?.highlightText)?.trim() || '',
      titleAfter:
        nullToUndefined(record.featuresNavs?.titleAfter)?.trim() || '',
      tabs: (record.featuresNavs?.tabs ?? []).map(t => ({
        heading: t.heading,
        content: t.content,
        iconKey: t.iconKey,
        imageAlt: t.imageAlt || '',
        image: toCmsMediaView(t.image ?? null, t.imageAlt),
      })),
    },
    testimonials: {
      title: nullToUndefined(record.testimonials?.title)?.trim() || '',
      subTitle: nullToUndefined(record.testimonials?.subTitle)?.trim() || '',
      items: (record.testimonials?.items ?? []).map(t => ({
        content: t.content,
        author: t.author,
        role: t.role,
        avatar: toCmsMediaView(t.avatar ?? null, null),
      })),
      statistics: record.testimonials?.statistics ?? [],
    },
    pricing: {
      title: nullToUndefined(record.pricing?.title)?.trim() || '',
      subTitle: nullToUndefined(record.pricing?.subTitle)?.trim() || '',
      badge: nullToUndefined(record.pricing?.badge)?.trim() || '',
      thirdOption: nullToUndefined(record.pricing?.thirdOption)?.trim() || '',
      btnText: nullToUndefined(record.pricing?.btnText)?.trim() || '',
      starterKit: record.pricing?.starterKit ?? {
        name: '',
        description: '',
        price: '',
        cents: '.00',
        billingFrequency: 'USD / monthly',
        features: [],
        purchaseBtnTitle: '',
        purchaseLink: '#',
      },
      professionalToolbox: record.pricing?.professionalToolbox ?? {
        name: '',
        description: '',
        price: '',
        cents: '.00',
        billingFrequency: 'USD / monthly',
        features: [],
        purchaseBtnTitle: '',
        purchaseLink: '#',
      },
    },
    faq: {
      titleLine1: nullToUndefined(record.faq?.titleLine1)?.trim() || '',
      titleLine2: nullToUndefined(record.faq?.titleLine2)?.trim() || '',
      items: record.faq?.items ?? [],
    },
    bottomCta: {
      title: nullToUndefined(record.bottomCta?.title)?.trim() || '',
      subTitle: nullToUndefined(record.bottomCta?.subTitle)?.trim() || '',
      buttonLabel: nullToUndefined(record.bottomCta?.buttonLabel)?.trim() || '',
      url: nullToUndefined(record.bottomCta?.url) || '',
    },
    seo: {
      title: nullToUndefined(record.seo?.title)?.trim() || '',
      description: nullToUndefined(record.seo?.description)?.trim() || '',
    },
  };
}

/** Parse and validate a Strapi collection response, returning the first match */
export function parseHomepageResponse(raw: unknown): HomepageViewModel {
  const result = strapiCollectionHomepageSchema.safeParse(raw);
  if (!result.success) {
    throw new CmsValidationError();
  }

  const match = result.data.data[0];

  if (!match) {
    throw new CmsContentNotFoundError();
  }

  return toHomepageViewModel(match);
}
