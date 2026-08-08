import type { HomepageViewModel } from '../cms/homepage-models';

/**
 * Check if a string value is effectively empty (null, undefined, or empty after trim).
 */
function isEmptyString(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

/**
 * Resolve a single string field: CMS non-empty → CMS, else → baseline.
 */
function resolveString(
  cmsValue: string | null | undefined,
  baselineValue: string
): string {
  return isEmptyString(cmsValue) ? baselineValue : (cmsValue as string);
}

/**
 * Resolve a boolean field: CMS null/undefined → baseline, else → CMS.
 */
function resolveBoolean(
  cmsValue: boolean | null | undefined,
  baselineValue: boolean
): boolean {
  return cmsValue == null ? baselineValue : cmsValue;
}

/**
 * Resolve a number field: CMS null/undefined → baseline, else → CMS.
 */
function resolveNumber(
  cmsValue: number | null | undefined,
  baselineValue: number
): number {
  return cmsValue == null ? baselineValue : cmsValue;
}

/**
 * Resolve a repeatable list: CMS has >=1 item → CMS, else → baseline.
 */
function resolveList<T>(
  cmsList: T[] | null | undefined,
  baselineList: T[]
): T[] {
  if (cmsList && cmsList.length > 0) {
    return cmsList;
  }
  return baselineList;
}

/**
 * Merge CMS Homepage data with Theme baseline.
 * Every field follows: CMS non-empty → CMS; CMS empty/null → baseline.
 * Sections never disappear — empty fields fall back to baseline values.
 */
export function resolveHomepageContent(
  cms: HomepageViewModel | null,
  baseline: HomepageViewModel
): HomepageViewModel {
  // If CMS returned nothing, use full baseline
  if (!cms) {
    return baseline;
  }

  return {
    announcement: {
      enabled: resolveBoolean(
        cms.announcement?.enabled,
        baseline.announcement.enabled
      ),
      buttonLabel: resolveString(
        cms.announcement?.buttonLabel,
        baseline.announcement.buttonLabel
      ),
      url: resolveString(cms.announcement?.url, baseline.announcement.url),
    },
    hero: {
      titleBefore: resolveString(
        cms.hero?.titleBefore,
        baseline.hero.titleBefore
      ),
      highlightText: resolveString(
        cms.hero?.highlightText,
        baseline.hero.highlightText
      ),
      titleAfter: resolveString(cms.hero?.titleAfter, baseline.hero.titleAfter),
      subTitle: resolveString(cms.hero?.subTitle, baseline.hero.subTitle),
      primaryButtonLabel: resolveString(
        cms.hero?.primaryButtonLabel,
        baseline.hero.primaryButtonLabel
      ),
      primaryButtonUrl: resolveString(
        cms.hero?.primaryButtonUrl,
        baseline.hero.primaryButtonUrl
      ),
      secondaryButtonLabel: resolveString(
        cms.hero?.secondaryButtonLabel,
        baseline.hero.secondaryButtonLabel
      ),
      secondaryButtonUrl: resolveString(
        cms.hero?.secondaryButtonUrl,
        baseline.hero.secondaryButtonUrl
      ),
      withReview: resolveBoolean(
        cms.hero?.withReview,
        baseline.hero.withReview
      ),
      ratingText: resolveString(cms.hero?.ratingText, baseline.hero.ratingText),
      starCount: resolveNumber(cms.hero?.starCount, baseline.hero.starCount),
      reviewsText: resolveString(
        cms.hero?.reviewsText,
        baseline.hero.reviewsText
      ),
      imageAlt: resolveString(cms.hero?.imageAlt, baseline.hero.imageAlt),
      image: cms.hero?.image ?? baseline.hero.image,
      // Avatars: CMS has >=1 → use CMS; else baseline
      avatars: resolveList(cms.hero?.avatars, baseline.hero.avatars),
    },
    clients: {
      title: resolveString(cms.clients?.title, baseline.clients.title),
      subTitle: resolveString(cms.clients?.subTitle, baseline.clients.subTitle),
      partners: resolveList(cms.clients?.partners, baseline.clients.partners),
    },
    featuresGeneral: {
      title: resolveString(
        cms.featuresGeneral?.title,
        baseline.featuresGeneral.title
      ),
      subTitle: resolveString(
        cms.featuresGeneral?.subTitle,
        baseline.featuresGeneral.subTitle
      ),
      imageAlt: resolveString(
        cms.featuresGeneral?.imageAlt,
        baseline.featuresGeneral.imageAlt
      ),
      image: cms.featuresGeneral?.image ?? baseline.featuresGeneral.image,
      items: resolveList(
        cms.featuresGeneral?.items,
        baseline.featuresGeneral.items
      ),
    },
    featuresNavs: {
      titleBefore: resolveString(
        cms.featuresNavs?.titleBefore,
        baseline.featuresNavs.titleBefore
      ),
      highlightText: resolveString(
        cms.featuresNavs?.highlightText,
        baseline.featuresNavs.highlightText
      ),
      titleAfter: resolveString(
        cms.featuresNavs?.titleAfter,
        baseline.featuresNavs.titleAfter
      ),
      tabs: resolveList(cms.featuresNavs?.tabs, baseline.featuresNavs.tabs),
    },
    testimonials: {
      title: resolveString(
        cms.testimonials?.title,
        baseline.testimonials.title
      ),
      subTitle: resolveString(
        cms.testimonials?.subTitle,
        baseline.testimonials.subTitle
      ),
      items: resolveList(cms.testimonials?.items, baseline.testimonials.items),
      statistics: resolveList(
        cms.testimonials?.statistics,
        baseline.testimonials.statistics
      ),
    },
    pricing: {
      title: resolveString(cms.pricing?.title, baseline.pricing.title),
      subTitle: resolveString(cms.pricing?.subTitle, baseline.pricing.subTitle),
      badge: resolveString(cms.pricing?.badge, baseline.pricing.badge),
      thirdOption: resolveString(
        cms.pricing?.thirdOption,
        baseline.pricing.thirdOption
      ),
      btnText: resolveString(cms.pricing?.btnText, baseline.pricing.btnText),
      starterKit: cms.pricing?.starterKit ?? baseline.pricing.starterKit,
      professionalToolbox:
        cms.pricing?.professionalToolbox ??
        baseline.pricing.professionalToolbox,
    },
    faq: {
      titleLine1: resolveString(cms.faq?.titleLine1, baseline.faq.titleLine1),
      titleLine2: resolveString(cms.faq?.titleLine2, baseline.faq.titleLine2),
      items: resolveList(cms.faq?.items, baseline.faq.items),
    },
    bottomCta: {
      title: resolveString(cms.bottomCta?.title, baseline.bottomCta.title),
      subTitle: resolveString(
        cms.bottomCta?.subTitle,
        baseline.bottomCta.subTitle
      ),
      buttonLabel: resolveString(
        cms.bottomCta?.buttonLabel,
        baseline.bottomCta.buttonLabel
      ),
      url: resolveString(cms.bottomCta?.url, baseline.bottomCta.url),
    },
    seo: {
      title: resolveString(cms.seo?.title, baseline.seo.title),
      description: resolveString(
        cms.seo?.description,
        baseline.seo.description
      ),
    },
  };
}
