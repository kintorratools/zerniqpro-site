const ROUTES = [
  { path: '/', expectStatus: s => s >= 200 && s < 300 },
  { path: '/fr/', expectStatus: s => s >= 200 && s < 300 },
  { path: '/products/', expectStatus: s => s >= 200 && s < 300 },
  { path: '/blog/', expectStatus: s => s >= 200 && s < 300 },
  { path: '/contact/', expectStatus: s => s >= 200 && s < 300 },
  { path: '/404', expectStatus: s => s === 404 },
  { path: '/api/health.json', expectStatus: s => s === 200 },
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
