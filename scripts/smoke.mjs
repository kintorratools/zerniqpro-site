const ROUTES = [
  { path: '/', expectStatus: s => s >= 200 && s < 300 },
  { path: '/fr/', expectStatus: s => s >= 200 && s < 300 },
  // Product listing is SSR-only (CMS-dependent), accept errors when no CMS
  {
    path: '/products/',
    expectStatus: s =>
      (s >= 200 && s < 300) || s === 500 || s === 502 || s === 503,
  },
  { path: '/blog/', expectStatus: s => s >= 200 && s < 300 },
  { path: '/contact/', expectStatus: s => s >= 200 && s < 400 },
  { path: '/404', expectStatus: s => s === 404 },
  { path: '/api/health.json', expectStatus: s => s === 200 },
  // CMS probe: 200 if CMS configured, 503 if not, 502 if CMS error
  {
    path: '/api/cms-probe.json',
    expectStatus: s => s === 200 || s === 502 || s === 503,
  },
  // Product preview: 200/404 if CMS configured, 503 if not, 502 if CMS error
  {
    path: '/preview/products/test-product/',
    expectStatus: s => s === 200 || s === 404 || s === 502 || s === 503,
  },
];

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:4321';

let failed = false;

for (const route of ROUTES) {
  try {
    const res = await fetch(`${BASE}${route.path}`, { redirect: 'manual' });

    if (route.expectStatus(res.status)) {
      console.log(`OK   ${route.path} -> ${res.status}`);
    } else {
      console.error(`FAIL ${route.path} -> ${res.status} (unexpected)`);
      failed = true;
      continue;
    }

    // Extra checks for health endpoint
    if (route.path === '/api/health.json') {
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        console.error(
          `FAIL ${route.path} -> Content-Type is not JSON: "${ct}"`
        );
        failed = true;
        continue;
      }

      const cacheControl = res.headers.get('cache-control') ?? '';
      if (!cacheControl.includes('no-store')) {
        console.error(
          `FAIL ${route.path} -> Cache-Control missing no-store: "${cacheControl}"`
        );
        failed = true;
        continue;
      }

      const body = await res.json();

      if (body.status !== 'ok') {
        console.error(
          `FAIL ${route.path} -> status is "${body.status}", expected "ok"`
        );
        failed = true;
        continue;
      }
      if (body.runtime !== 'cloudflare-workers') {
        console.error(
          `FAIL ${route.path} -> runtime is "${body.runtime}", expected "cloudflare-workers"`
        );
        failed = true;
        continue;
      }
      if (body.architecture !== 'cloudflare-strapi-postgres-r2') {
        console.error(
          `FAIL ${route.path} -> architecture is "${body.architecture}", expected "cloudflare-strapi-postgres-r2"`
        );
        failed = true;
        continue;
      }
      if (typeof body.siteKey !== 'string' || body.siteKey.length === 0) {
        console.error(
          `FAIL ${route.path} -> siteKey is not a non-empty string: "${body.siteKey}"`
        );
        failed = true;
        continue;
      }
      if (typeof body.cmsConfigured !== 'boolean') {
        console.error(
          `FAIL ${route.path} -> cmsConfigured is not boolean: ${typeof body.cmsConfigured}`
        );
        failed = true;
        continue;
      }

      console.log(`OK   ${route.path} -> health checks passed`);
    }

    // Extra checks for CMS probe endpoint
    if (route.path === '/api/cms-probe.json') {
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        console.error(
          `FAIL ${route.path} -> Content-Type is not JSON: "${ct}"`
        );
        failed = true;
        continue;
      }

      const cacheControl = res.headers.get('cache-control') ?? '';
      if (!cacheControl.includes('no-store')) {
        console.error(
          `FAIL ${route.path} -> Cache-Control missing no-store: "${cacheControl}"`
        );
        failed = true;
        continue;
      }

      const xRobots = res.headers.get('x-robots-tag') ?? '';
      if (!xRobots.includes('noindex') || !xRobots.includes('nofollow')) {
        console.error(
          `FAIL ${route.path} -> X-Robots-Tag must include noindex and nofollow: "${xRobots}"`
        );
        failed = true;
        continue;
      }

      const body = await res.json();

      // Accept 'ok', 'unconfigured', 'error'. Timeout (status=timeout) is treated as FAIL.
      if (
        body.status !== 'ok' &&
        body.status !== 'unconfigured' &&
        body.status !== 'error'
      ) {
        console.error(
          `FAIL ${route.path} -> status is "${body.status}", expected "ok", "unconfigured", or "error"`
        );
        failed = true;
        continue;
      }

      if (body.status === 'ok') {
        // CMS is reachable and configured — site data is nested in body.site
        if (
          typeof body.cmsReachable !== 'boolean' ||
          body.cmsReachable !== true
        ) {
          console.error(`FAIL ${route.path} -> cmsReachable is not true`);
          failed = true;
          continue;
        }
        const s = body.site;
        if (!s || typeof s !== 'object') {
          console.error(`FAIL ${route.path} -> site object is missing`);
          failed = true;
          continue;
        }
        if (typeof s.key !== 'string' || s.key.length === 0) {
          console.error(
            `FAIL ${route.path} -> site.key is not a non-empty string: "${s.key}"`
          );
          failed = true;
          continue;
        }
        if (typeof s.name !== 'string') {
          console.error(
            `FAIL ${route.path} -> site.name is not a string: "${s.name}"`
          );
          failed = true;
          continue;
        }
        if (typeof s.domain !== 'string' || !s.domain.startsWith('http')) {
          console.error(
            `FAIL ${route.path} -> site.domain is not an http/https URL: "${s.domain}"`
          );
          failed = true;
          continue;
        }
        if (
          typeof s.defaultLocale !== 'string' ||
          s.defaultLocale.length === 0
        ) {
          console.error(
            `FAIL ${route.path} -> site.defaultLocale is not a non-empty string: "${s.defaultLocale}"`
          );
          failed = true;
          continue;
        }
        if (typeof s.brandKey !== 'string' || s.brandKey.length === 0) {
          console.error(
            `FAIL ${route.path} -> site.brandKey is not a non-empty string: "${s.brandKey}"`
          );
          failed = true;
          continue;
        }
      } else {
        // status is 'unconfigured' or 'error' — expects top-level siteKey
        if (
          typeof body.cmsReachable !== 'boolean' ||
          body.cmsReachable !== false
        ) {
          console.error(
            `FAIL ${route.path} -> cmsReachable is not false for status=${body.status}`
          );
          failed = true;
          continue;
        }
        if (typeof body.siteKey !== 'string' || body.siteKey.length === 0) {
          console.error(
            `FAIL ${route.path} -> siteKey is not a non-empty string: "${body.siteKey}"`
          );
          failed = true;
          continue;
        }
      }

      console.log(
        `OK   ${route.path} -> cms-probe checks passed (status=${body.status})`
      );
    }

    // Extra checks for product preview shadow route (only when reachable)
    if (route.path === '/preview/products/test-product/') {
      if (res.status === 404) {
        // Production guard returns 404 — no X-Robots-Tag expected
        console.log(`OK   ${route.path} -> 404 (production guard active)`);
      } else {
        const xRobots = res.headers.get('x-robots-tag') ?? '';
        if (!xRobots.includes('noindex') || !xRobots.includes('nofollow')) {
          console.error(
            `FAIL ${route.path} -> X-Robots-Tag must include noindex and nofollow: "${xRobots}"`
          );
          failed = true;
          continue;
        }
        console.log(`OK   ${route.path} -> noindex/nofollow verified`);
      }
    }
  } catch (err) {
    console.error(`FAIL ${route.path} -> ${err.message}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nSmoke test FAILED');
  process.exit(1);
}

console.log('\nSmoke test PASSED');
