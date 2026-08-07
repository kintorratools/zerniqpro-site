import { getSiteConfig } from '@lib/cms/site';
import { getBrand } from '@lib/cms/brand';
import { getLocales } from '@lib/cms/locale';
import type { SiteViewModel } from '@lib/cms/models';
import type { BrandViewModel } from '@lib/cms/brand-models';
import type { LocaleViewModel } from '@lib/cms/locale-models';

export interface RuntimeConfig {
  site: SiteViewModel;
  brand: BrandViewModel;
  locales: LocaleViewModel[];
}

/**
 * Aggregate site, brand, and locale configuration.
 * Fetches site first, then brand and locales in parallel.
 * Used by Navbar, Footer, Meta, Schema, and other global components.
 */
export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  const site = await getSiteConfig();
  const [brand, locales] = await Promise.all([
    getBrand(site.brandKey),
    getLocales(site.key),
  ]);

  return { site, brand, locales };
}
