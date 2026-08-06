export const prerender = false;

import { CMS_SITE_KEY, STRAPI_URL } from 'astro:env/server';

export async function GET() {
  const siteKey = CMS_SITE_KEY ?? 'zerniq';
  const cmsConfigured = Boolean(STRAPI_URL);

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
    },
  });
}
