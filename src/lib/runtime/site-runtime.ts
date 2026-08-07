import { getSiteConfig } from '@lib/cms/site';
import { getBrand } from '@lib/cms/brand';
import { getLocales } from '@lib/cms/locale';
import { getNavigation } from '@lib/cms/navigation';
import { getFooter } from '@lib/cms/footer';
import type { SiteViewModel } from '@lib/cms/models';
import type { BrandViewModel } from '@lib/cms/brand-models';
import type { LocaleViewModel } from '@lib/cms/locale-models';
import type { NavigationViewModel } from '@lib/cms/navigation-models';
import type { FooterViewModel } from '@lib/cms/footer-models';

export interface RuntimeConfig {
  site: SiteViewModel;
  brand: BrandViewModel;
  locales: LocaleViewModel[];
  navigation: NavigationViewModel;
  footer: FooterViewModel;
}

/**
 * Aggregate site, brand, locale, navigation, and footer configuration.
 * Fetches site first, then brand, locales, navigation, and footer in parallel.
 * Navigation and footer are optional: if their CMS fetch fails, they degrade
 * to empty defaults so global chrome can still render fallback content.
 * Used by Navbar, Footer, Meta, Schema, and other global components.
 */
export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const site = await getSiteConfig();
  const defaultLocale = site.defaultLocale || 'en';

  // Site, brand, and locales are required — failures propagate.
  const [brand, locales] = await Promise.all([
    getBrand(site.brandKey),
    getLocales(site.key),
  ]);

  // Navigation and footer are optional — failures degrade to empty defaults.
  const [navigationResult, footerResult] = await Promise.allSettled([
    getNavigation(site.key, defaultLocale),
    getFooter(site.key, defaultLocale),
  ]);

  const navigation: NavigationViewModel =
    navigationResult.status === 'fulfilled'
      ? navigationResult.value
      : { items: [] };
  const footer: FooterViewModel =
    footerResult.status === 'fulfilled'
      ? footerResult.value
      : { columns: [], copyright: '', legalLinks: [], socialLinks: [] };

  return { site, brand, locales, navigation, footer };
}
