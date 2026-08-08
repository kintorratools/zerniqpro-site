import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let failed = false;

const MOCK_HOST = '127.0.0.1';

/* ---------- Mock Strapi data ---------- */

const MOCK_BRAND = {
  id: 1,
  documentId: 'brand-001',
  key: 'zerniq',
  name: 'ZERNIQ',
  domain: 'https://zerniqpro.com',
  logo: { url: 'https://zerniqpro.com/logo.png', alt: 'ZERNIQ logo' },
  favicon: { url: 'https://zerniqpro.com/favicon.ico' },
  colors: { primary: '#ff6600', secondary: '#1e293b', accent: '#3b82f6' },
  defaultSeo: {
    title: 'ZERNIQ Tools',
    description: 'Professional power tools for North America',
    ogImage: { url: 'https://zerniqpro.com/og.png', alt: 'ZERNIQ' },
  },
  socialLinks: [{ platform: 'twitter', url: 'https://twitter.com/zerniq' }],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const MOCK_SITE = {
  id: 1,
  documentId: 'abc123',
  key: 'zerniq',
  name: 'ZERNIQ Site',
  defaultLocale: 'en',
  defaultSeo: {
    title: 'ZERNIQ Tools',
    description: 'Professional power tools for North America',
  },
  brand: { documentId: 'brand-001', key: 'zerniq' },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const MOCK_LOCALES = [
  {
    id: 1,
    documentId: 'loc-en',
    code: 'en',
    name: 'English',
    enabled: true,
    isDefault: true,
    direction: 'ltr',
  },
  {
    id: 2,
    documentId: 'loc-es',
    code: 'es',
    name: 'Español',
    enabled: true,
    isDefault: false,
    direction: 'ltr',
  },
  {
    id: 3,
    documentId: 'loc-de',
    code: 'de',
    name: 'Deutsch',
    enabled: false,
    isDefault: false,
    direction: 'ltr',
  },
  {
    id: 4,
    documentId: 'loc-fr',
    code: 'fr',
    name: 'Français',
    enabled: true,
    isDefault: false,
    direction: 'ltr',
  },
  {
    id: 5,
    documentId: 'loc-pt',
    code: 'pt-BR',
    name: 'Português (Brasil)',
    enabled: false,
    isDefault: false,
    direction: 'ltr',
  },
];

/* ---------- Mock data for Task 14: Site/Brand Key Decoupling ---------- */

const MOCK_BRAND_DIFF = {
  id: 2,
  documentId: 'ba-001',
  key: 'brand-alpha',
  name: 'Brand Alpha',
  domain: 'https://brand-alpha.com',
  logo: { url: 'https://brand-alpha.com/logo.png', alt: 'Brand Alpha logo' },
  favicon: { url: 'https://brand-alpha.com/favicon.ico' },
  colors: { primary: '#0000ff', secondary: '#333333', accent: '#ff0000' },
  defaultSeo: {
    title: 'Brand Alpha',
    description: 'Brand Alpha power tools',
    ogImage: { url: 'https://brand-alpha.com/og.png', alt: 'Brand Alpha' },
  },
  socialLinks: [
    { platform: 'facebook', url: 'https://facebook.com/brandalpha' },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const MOCK_SITE_DIFF = {
  id: 2,
  documentId: 'xyz789',
  key: 'store-us',
  name: 'US Store',
  defaultLocale: 'en',
  defaultSeo: {
    title: 'US Store',
    description: 'US Store for Brand Alpha',
  },
  brand: { documentId: 'ba-001', key: 'brand-alpha' },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const MOCK_LOCALES_DIFF = [
  {
    id: 101,
    documentId: 'loc-diff-en',
    code: 'en',
    name: 'English',
    enabled: true,
    isDefault: true,
    direction: 'ltr',
  },
  {
    id: 102,
    documentId: 'loc-diff-es',
    code: 'es',
    name: 'Español',
    enabled: true,
    isDefault: false,
    direction: 'ltr',
  },
  {
    id: 103,
    documentId: 'loc-diff-de',
    code: 'de',
    name: 'Deutsch',
    enabled: false,
    isDefault: false,
    direction: 'ltr',
  },
  {
    id: 104,
    documentId: 'loc-diff-fr',
    code: 'fr',
    name: 'Français',
    enabled: true,
    isDefault: false,
    direction: 'ltr',
  },
  {
    id: 105,
    documentId: 'loc-diff-pt',
    code: 'pt-BR',
    name: 'Português (Brasil)',
    enabled: false,
    isDefault: false,
    direction: 'ltr',
  },
];

/* ---------- Mock Strapi HTTP server (parameterized) ---------- */

/** Start a mock Strapi HTTP server.
 * @param {object} options
 * @param {object} [options.brand]       - brand data to serve (default: MOCK_BRAND)
 * @param {object} [options.site]        - site data to serve (default: MOCK_SITE)
 * @param {object[]} [options.locales]   - locales data to serve (default: MOCK_LOCALES)
 * @param {string} [options.siteKey]     - expected site key in query (default: 'zerniq')
 * @param {boolean} [options.validateBrandWithKey] - if true, validate brand by filters[key][$eq]
 * @param {(url: URL) => void} [options.onBrandRequest] - callback when brand is requested
 */
function startMockStrapi(options = {}) {
  const {
    brand = MOCK_BRAND,
    site = MOCK_SITE,
    locales = MOCK_LOCALES,
    siteKey = 'zerniq',
    validateBrandWithKey = false,
    onBrandRequest = null,
  } = options;

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://${MOCK_HOST}`);

      // Authorisation
      if (
        !req.headers['authorization'] ||
        !req.headers['authorization'].startsWith('Bearer ')
      ) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: { status: 401 } }));
        return;
      }
      if ((req.headers['accept'] ?? '') !== 'application/json') {
        res.writeHead(406);
        res.end(JSON.stringify({ error: { status: 406 } }));
        return;
      }

      // Track brand request (before validation, so we always capture)
      if (
        req.method === 'GET' &&
        url.pathname === '/api/brands' &&
        onBrandRequest
      ) {
        onBrandRequest(url);
      }

      // Validate siteKey filter per endpoint
      if (req.method === 'GET' && url.pathname === '/api/sites') {
        if (url.searchParams.get('filters[key][$eq]') !== siteKey) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
      } else if (req.method === 'GET' && url.pathname === '/api/brands') {
        // Phase 4.1: brand queried by own key, not site relationship
        if (url.searchParams.get('filters[key][$eq]') !== brand.key) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
      } else if (
        req.method === 'GET' &&
        url.pathname !== '/api/locale-configs' &&
        url.searchParams.get('filters[site][key][$eq]') !== siteKey
      ) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: { status: 400 } }));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/brands') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: [brand],
            meta: { pagination: { total: 1 } },
          })
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/sites') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: [site],
            meta: { pagination: { total: 1 } },
          })
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/locale-configs') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: locales,
            meta: { pagination: { total: locales.length } },
          })
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/navigations') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: [
              {
                id: 1,
                documentId: 'nav-001',
                items: [
                  { label: 'Home', href: '/', order: 1 },
                  { label: 'Products', href: '/products', order: 2 },
                  { label: 'Support', href: '/support', order: 3 },
                ],
              },
            ],
            meta: { pagination: { total: 1 } },
          })
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/footers') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: [
              {
                id: 1,
                documentId: 'footer-001',
                columns: [],
                copyright: '© 2026 Generic',
                legalLinks: [],
                socialLinks: [],
              },
            ],
            meta: { pagination: { total: 1 } },
          })
        );
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: { status: 404 } }));
    });

    server.listen(0, MOCK_HOST, () => {
      const port = server.address().port;
      console.log(`Mock Strapi on ${MOCK_HOST}:${port}`);
      resolve({ server, port });
    });

    server.on('error', reject);
  });
}

/** Start wrangler dev */
function startWorker(workerPort, mockUrl, siteKey = 'zerniq') {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'pnpm.cmd' : 'pnpm';

    const child = spawn(
      cmd,
      [
        'exec',
        'wrangler',
        'dev',
        '--config',
        'dist-out/server/wrangler.json',
        '--ip',
        '127.0.0.1',
        '--port',
        String(workerPort),
        '--var',
        `STRAPI_URL:${mockUrl}`,
        '--var',
        'STRAPI_API_TOKEN:test-token',
        '--var',
        `CMS_SITE_KEY:${siteKey}`,
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: isWin,
      }
    );

    let resolved = false;

    const onData = data => {
      const text = data.toString();
      if (!resolved && text.includes('http://')) {
        resolved = true;
        setTimeout(() => resolve(child), 2000);
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', err => {
      if (!resolved) reject(err);
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(child);
      }
    }, 30000);
  });
}

/** Wait for URL to respond */
async function waitForUrl(url, maxRetries = 50) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status >= 400) return true;
    } catch {
      /* still starting */
    }
    await sleep(500);
  }
  return false;
}

function stopProcess(proc) {
  if (!proc) return;
  try {
    proc.kill('SIGTERM');
    setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {}
    }, 3000);
  } catch {}
}

function findFreePort() {
  return new Promise(resolve => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

/* ---------- Helpers ---------- */

function check(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
  } else {
    console.error(`  FAIL: ${msg}`);
    failed = true;
  }
}

/* ---------- Test scenarios ---------- */

async function testBrandAndLocales(workerUrl) {
  console.log('\n--- Brand + Site + Locales → 200 ---');
  const res = await fetch(`${workerUrl}/preview/brand-config.json`);
  const body = await res.json();

  check(res.status === 200, `status 200 (got ${res.status})`);
  check(body.status === 'ok', `status="ok"`);
  check(body.brand.key === 'zerniq', 'brand.key=zerniq');
  check(body.brand.name === 'ZERNIQ', 'brand.name=ZERNIQ');
  check(body.brand.domain === 'https://zerniqpro.com', 'brand.domain correct');
  check(body.brand.seo.title === 'ZERNIQ Tools', 'brand.seo.title correct');
  check(
    body.brand.seo.description.includes('Professional power tools'),
    'brand.seo.description includes "Professional power tools"'
  );
  check(body.site.key === 'zerniq', 'site.key=zerniq');
  check(body.site.brandKey === 'zerniq', 'site.brandKey=zerniq');

  // Locale checks
  check(Array.isArray(body.locales), 'locales is an array');
  check(
    body.locales.length === 3,
    `locales has 3 entries (got ${body.locales.length})`
  );
  check(body.locales.includes('en'), 'locales includes en');
  check(body.locales.includes('es'), 'locales includes es');
  check(body.locales.includes('fr'), 'locales includes fr');
  check(!body.locales.includes('de'), 'locales excludes de (disabled)');
  check(!body.locales.includes('pt-BR'), 'locales excludes pt-BR (disabled)');

  check(body.defaultLocale === 'en', 'defaultLocale=en');

  // Locale check map
  check(body.localeCheck.en === true, 'localeCheck.en=true');
  check(body.localeCheck.de === false, 'localeCheck.de=false');
  check(body.localeCheck.fr === true, 'localeCheck.fr=true');

  // Headers
  const xr = res.headers.get('x-robots-tag') ?? '';
  check(
    xr.includes('noindex') && xr.includes('nofollow'),
    'X-Robots-Tag: noindex,nofollow'
  );

  // No token leakage
  const raw = JSON.stringify(body);
  check(!raw.includes('test-token'), 'no token in response');
}

/** Task 14: Site/Brand Key Decoupling — mock returns site.key != brand.key */
async function testSiteBrandKeyDifferent(workerUrl, capturedRef) {
  console.log('\n--- Site/Brand Key Different (decoupling) ---');
  const res = await fetch(`${workerUrl}/preview/brand-config.json`);
  const body = await res.json();

  check(res.status === 200, `status 200 (got ${res.status})`);
  check(body.status === 'ok', `status="ok"`);

  // Verify the mock received a brand request with filters[key][$eq]=brand-alpha
  check(
    capturedRef.val === 'brand-alpha',
    `brand query used filters[key][$eq]=brand-alpha (got "${capturedRef.val}")`
  );

  // Response assertions
  check(body.brand.key === 'brand-alpha', 'brand.key=brand-alpha');
  check(body.brand.name === 'Brand Alpha', 'brand.name=Brand Alpha');
  check(
    body.brand.domain === 'https://brand-alpha.com',
    'brand.domain=brand-alpha.com'
  );
  check(body.site.key === 'store-us', 'site.key=store-us');
  check(body.site.brandKey === 'brand-alpha', 'site.brandKey=brand-alpha');

  // No token leakage
  const raw = JSON.stringify(body);
  check(!raw.includes('test-token'), 'no token in response');
}

/* ---------- Task 15: Locale Validation ---------- */

const LOCALE_BASE = (overrides = {}) => ({
  id: 1,
  documentId: 'loc-en',
  code: 'en',
  name: 'English',
  enabled: true,
  isDefault: true,
  direction: 'ltr',
  ...overrides,
});

const LOCALE_ES = {
  id: 2,
  documentId: 'loc-es',
  code: 'es',
  name: 'Español',
  enabled: true,
  isDefault: false,
  direction: 'ltr',
};

const LOCALE_FR = {
  id: 3,
  documentId: 'loc-fr',
  code: 'fr',
  name: 'Français',
  enabled: true,
  isDefault: false,
  direction: 'ltr',
};

/** Helper to spin up mock + worker, run test, then clean up */
async function runLocaleTest(testName, localeData) {
  console.log(`\n--- Locale Invalid: ${testName} ---`);

  const { server, port: mockPort } = await startMockStrapi({
    locales: localeData,
    siteKey: 'zerniq',
  });
  const mockUrl = `http://${MOCK_HOST}:${mockPort}`;

  let workerProc;
  try {
    const wp = await findFreePort();
    const wu = `http://127.0.0.1:${wp}`;
    console.log(`  Starting wrangler dev on port ${wp}...`);

    workerProc = await startWorker(wp, mockUrl, 'zerniq');
    const ready = await waitForUrl(wu);
    if (!ready) {
      console.error(`  FAIL: Worker did not start`);
      failed = true;
      return;
    }

    const res = await fetch(`${wu}/preview/brand-config.json`);
    check(res.status === 502, `status 502 (got ${res.status})`);
  } finally {
    stopProcess(workerProc);
    server.close();
  }
}

async function testLocaleEnMissing() {
  // en is completely absent from locales
  await runLocaleTest('en missing', [
    { ...LOCALE_ES, isDefault: true },
    { ...LOCALE_FR },
  ]);
}

async function testLocaleEnDisabled() {
  // en present but enabled=false
  await runLocaleTest('en disabled', [
    LOCALE_BASE({ enabled: false }),
    { ...LOCALE_ES },
    { ...LOCALE_FR },
  ]);
}

async function testLocaleEnNotDefault() {
  // en present and enabled, but isDefault=false; es is default
  await runLocaleTest('en not default', [
    LOCALE_BASE({ isDefault: false }),
    { ...LOCALE_ES, isDefault: true },
    { ...LOCALE_FR },
  ]);
}

async function testLocaleTwoDefaults() {
  // en and es both isDefault=true
  await runLocaleTest('two defaults', [
    LOCALE_BASE({ isDefault: true }),
    { ...LOCALE_ES, isDefault: true },
    { ...LOCALE_FR },
  ]);
}

async function testLocaleDuplicate() {
  // two locales with code='en'
  await runLocaleTest('duplicate en', [
    LOCALE_BASE(),
    {
      id: 2,
      documentId: 'loc-en-2',
      code: 'en',
      name: 'English (UK)',
      enabled: true,
      isDefault: false,
      direction: 'ltr',
    },
  ]);
}

/* ---------- Main ---------- */

async function main() {
  // 1. Verify build artifacts
  try {
    readFileSync(resolve('dist-out/server/wrangler.json'));
    console.log('Build artifact: dist-out/server/wrangler.json — OK');
  } catch {
    console.error(
      'ERROR: dist-out/server/wrangler.json not found. Run pnpm build first.'
    );
    process.exit(1);
  }

  // 2. Main test: same brand key = site key
  {
    const { server, port: mockPort } = await startMockStrapi({
      siteKey: 'zerniq',
    });
    const mockUrl = `http://${MOCK_HOST}:${mockPort}`;

    let workerProc;
    try {
      const wp = await findFreePort();
      const wu = `http://127.0.0.1:${wp}`;
      console.log(`\nStarting wrangler dev on port ${wp}...`);

      workerProc = await startWorker(wp, mockUrl, 'zerniq');
      const ready = await waitForUrl(wu);
      if (!ready) {
        console.error('FAIL: Worker did not start');
        failed = true;
      } else {
        await testBrandAndLocales(wu);
      }
    } finally {
      stopProcess(workerProc);
      server.close();
    }
  }

  // 3. Task 14: Site/Brand Key Decoupling
  {
    let capturedRef = { val: null };

    const { server, port: mockPort } = await startMockStrapi({
      brand: MOCK_BRAND_DIFF,
      site: MOCK_SITE_DIFF,
      locales: MOCK_LOCALES_DIFF,
      siteKey: 'store-us',
      validateBrandWithKey: true,
      onBrandRequest: url => {
        capturedRef.val = url.searchParams.get('filters[key][$eq]');
      },
    });
    const mockUrl = `http://${MOCK_HOST}:${mockPort}`;

    let workerProc;
    try {
      const wp = await findFreePort();
      const wu = `http://127.0.0.1:${wp}`;
      console.log(
        `\nStarting wrangler dev on port ${wp} (CMS_SITE_KEY=store-us)...`
      );

      workerProc = await startWorker(wp, mockUrl, 'store-us');
      const ready = await waitForUrl(wu);
      if (!ready) {
        console.error('FAIL: Worker did not start');
        failed = true;
      } else {
        await testSiteBrandKeyDifferent(wu, capturedRef);
      }
    } finally {
      stopProcess(workerProc);
      server.close();
    }
  }

  // 4. Task 15: Locale Validation Scenarios
  await testLocaleEnMissing();
  await testLocaleEnDisabled();
  await testLocaleEnNotDefault();
  await testLocaleTwoDefaults();
  await testLocaleDuplicate();

  // Report
  console.log('\nTest resources cleaned up.');
  if (failed) {
    console.error('\nBrand/i18n integration test FAILED');
    process.exit(1);
  }

  console.log('\nBrand/i18n integration test PASSED');
}

main();
