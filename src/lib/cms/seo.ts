import type { BrandViewModel } from './brand-models';
import type { SiteViewModel } from './models';
import type { SEOConfig } from './seo-models';

export function resolveGlobalSeo(
  pageSeo?: Partial<SEOConfig>,
  runtime?: { brand: BrandViewModel; site: SiteViewModel }
): SEOConfig {
  const brand = runtime?.brand;
  const site = runtime?.site;

  return {
    title:
      pageSeo?.title ??
      site?.seo.title ??
      brand?.seo.title ??
      brand?.name ??
      '',
    description:
      pageSeo?.description ??
      site?.seo.description ??
      brand?.seo.description ??
      '',
    ogImage: pageSeo?.ogImage ?? brand?.seo.ogImage,
    twitterImage:
      pageSeo?.twitterImage ??
      (brand?.seo.ogImage as SEOConfig['twitterImage']),
    canonical: pageSeo?.canonical,
  };
}
