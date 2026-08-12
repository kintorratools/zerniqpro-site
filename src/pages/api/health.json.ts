export const prerender = false;

import { getCmsConfig } from '@lib/cms/config';

export async function GET() {
  const { siteKey, configured: cmsConfigured } = getCmsConfig();

  const body = {
    status: 'ok',
    runtime: 'cloudflare-workers',
    architecture: 'cloudflare-strapi-postgres-r2',
    siteKey,
    cmsConfigured,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
