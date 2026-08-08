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
 * Resolve the effective locale for content fetching.
 * 1. If locale is provided and enabled in Locale Config, use it.
 * 2. If locale is provided but disabled, fall back to site default.
 * 3. If no locale is provided, use site default.
 */
function resolveLocale(
  requested: string | undefined,
  defaultLocale: string,
  locales: LocaleViewModel[]
): string {
  if (!requested) return defaultLocale;
  const config = locales.find(l => l.code === requested);
  return config?.enabled ? requested : defaultLocale;
}

/**
 * Aggregate site, brand, locale, navigation, and footer configuration.
 * Fetches site first, then brand, locales, navigation, and footer in parallel.
 * Navigation and footer are optional: if their CMS fetch fails, they degrade
 * to empty defaults so global chrome can still render fallback content.
 * Used by Navbar, Footer, Meta, Schema, and other global components.
 *
 * @param locale - Optional locale override for Strapi native i18n queries.
 *                 If empty, disabled, or not provided, falls back to site.defaultLocale.
 */
export async function getRuntimeConfig(
  locale?: string
): Promise<RuntimeConfig> {
  const site = await getSiteConfig();
  const defaultLocale = site.defaultLocale || 'en';

  // Site, brand, and locales are required — failures propagate.
  const [brand, locales] = await Promise.all([
    getBrand(site.brandKey),
    getLocales(site.key),
  ]);

  const effectiveLocale = resolveLocale(locale, defaultLocale, locales);

  // Navigation and footer are optional — failures degrade to empty defaults.
  const [navigationResult, footerResult] = await Promise.allSettled([
    getNavigation(site.key, effectiveLocale),
    getFooter(site.key, effectiveLocale),
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
