export const prerender = false;

import { getCmsConfig } from '@lib/cms/config';
import { strapiFetch } from '@lib/cms/client';
import { CmsError } from '@lib/cms/errors';

export async function GET() {
  const config = getCmsConfig();

  // 503 — not configured
  if (!config.configured) {
    const body = {
      status: 'unconfigured',
      cmsReachable: false,
      siteKey: config.siteKey,
    };
    return new Response(JSON.stringify(body), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  }

  try {
    // Probe a lightweight endpoint — Strapi's own /api/health or similar
    await strapiFetch('/api/sites?pagination[limit]=1');

    const body = {
      status: 'connected',
      cmsReachable: true,
      siteKey: config.siteKey,
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof CmsError) {
      // 502 — configured but unreachable / bad gateway
      if (err.name === 'CmsTimeoutError') {
        const body = {
          status: 'timeout',
          cmsReachable: false,
          siteKey: config.siteKey,
        };
        return new Response(JSON.stringify(body), {
          status: 504,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        });
      }

      // Other CMS errors — 502
      const body = {
        status: 'error',
        cmsReachable: false,
        siteKey: config.siteKey,
      };
      return new Response(JSON.stringify(body), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Unexpected
    const body = {
      status: 'error',
      cmsReachable: false,
      siteKey: config.siteKey,
    };
    return new Response(JSON.stringify(body), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}
