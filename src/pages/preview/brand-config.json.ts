export const prerender = false;

import { getRuntimeConfig } from '@lib/runtime/site-runtime';
import {
  getEnabledLocales,
  isLocaleEnabled,
  getDefaultLocale,
} from '@lib/i18n/config';
import {
  CmsTimeoutError,
  CmsNotConfiguredError,
  CmsContentNotFoundError,
  CmsValidationError,
} from '@lib/cms/errors';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function GET() {
  try {
    const config = await getRuntimeConfig();
    const enabledLocales = getEnabledLocales(config.locales);
    const defaultLocale = getDefaultLocale(config.locales);

    return jsonResponse(200, {
      status: 'ok',
      brand: {
        key: config.brand.key,
        name: config.brand.name,
        domain: config.brand.domain,
        seo: config.brand.seo,
      },
      site: {
        key: config.site.key,
        name: config.site.name,
        defaultLocale: config.site.defaultLocale,
        brandKey: config.site.brandKey,
      },
      locales: enabledLocales,
      defaultLocale: defaultLocale.code,
      localeCheck: {
        en: isLocaleEnabled('en', config.locales),
        de: isLocaleEnabled('de', config.locales),
        fr: isLocaleEnabled('fr', config.locales),
      },
    });
  } catch (e) {
    if (e instanceof CmsNotConfiguredError) {
      return jsonResponse(503, { status: 'unconfigured' });
    }
    if (e instanceof CmsTimeoutError) {
      return jsonResponse(504, { status: 'timeout' });
    }
    return jsonResponse(502, { status: 'error' });
  }
}
