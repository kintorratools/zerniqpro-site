export const prerender = false;

import { getCmsConfig } from '@lib/cms/config';
import { getSiteConfig } from '@lib/cms/site';
import { CmsTimeoutError } from '@lib/cms/errors';

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

function probeResponse(
  status: number,
  body: Record<string, unknown>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: COMMON_HEADERS,
  });
}

export async function GET() {
  const config = getCmsConfig();

  if (!config.configured) {
    return probeResponse(503, {
      status: 'unconfigured',
      cmsReachable: false,
      siteKey: config.siteKey,
    });
  }

  try {
    const site = await getSiteConfig();

    return probeResponse(200, {
      status: 'ok',
      cmsReachable: true,
      site: {
        key: site.key,
        name: site.name,
        domain: site.domain,
        defaultLocale: site.defaultLocale,
      },
    });
  } catch (err) {
    if (err instanceof CmsTimeoutError) {
      return probeResponse(504, {
        status: 'timeout',
        cmsReachable: false,
        siteKey: config.siteKey,
      });
    }

    // Any other error (CmsError, CmsNotConfiguredError, CmsValidationError, etc.)
    return probeResponse(502, {
      status: 'error',
      cmsReachable: false,
      siteKey: config.siteKey,
    });
  }
}
