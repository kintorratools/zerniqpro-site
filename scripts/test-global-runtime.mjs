import { createServer } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startWorker } from './lib/test-process.mjs';

let failed = false;

const MOCK_HOST = '127.0.0.1';

/* ---------- Mock Strapi data ---------- */

const MOCK_BRAND = {
  id: 2,
  documentId: 'ba-001',
  key: 'brand-alpha',
  name: 'Brand Alpha',
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

const MOCK_SITE = {
  id: 2,
  documentId: 'xyz789',
  key: 'store-us',
  name: 'US Store',
  domain: 'https://store-us.example',
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
    documentId: 'loc-fa',
    code: 'fa',
    name: 'فارسی',
    enabled: false,
    isDefault: false,
    direction: 'rtl',
  },
  {
    id: 6,
    documentId: 'loc-ja',
    code: 'ja',
    name: '日本語',
    enabled: false,
    isDefault: false,
    direction: 'ltr',
  },
  {
    id: 7,
    documentId: 'loc-zh',
    code: 'zh-cn',
    name: '简体中文',
    enabled: false,
    isDefault: false,
    direction: 'ltr',
  },
];

const MOCK_NAVIGATION = {
  id: 1,
  documentId: 'nav-001',
  site: { key: 'store-us' },
  locale: 'en',
  items: [
    { id: 1, label: 'Home', href: '/', order: 1, visible: true },
    { id: 2, label: 'Products', href: '/products', order: 2, visible: true },
    { id: 3, label: 'Services', href: '/services', order: 3, visible: true },
    { id: 4, label: 'Blog', href: '/blog', order: 4, visible: true },
    { id: 5, label: 'Contact', href: '/contact', order: 5, visible: true },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const MOCK_FOOTER = {
  id: 1,
  documentId: 'ftr-001',
  site: { key: 'store-us' },
  locale: 'en',
  columns: [
    {
      id: 1,
      title: 'Ecosystem',
      links: [
        { id: 1, label: 'Documentation', url: '/docs' },
        { id: 2, label: 'Tools & Equipment', url: '/products' },
        { id: 3, label: 'Construction Services', url: '/services' },
      ],
    },
    {
      id: 2,
      title: 'Company',
      links: [
        { id: 4, label: 'About us', url: '/about' },
        { id: 5, label: 'Blog', url: '/blog' },
        { id: 6, label: 'Careers', url: '/careers' },
        { id: 7, label: 'Customers', url: '/customers' },
      ],
    },
  ],
  copyright: 'Brand Alpha. All rights reserved.',
  legalLinks: [{ id: 1, label: 'Privacy', url: '/privacy' }],
  socialLinks: [
    { id: 1, platform: 'Facebook', url: 'https://facebook.com/brandalpha' },
    { id: 2, platform: 'Twitter', url: 'https://twitter.com/brandalpha' },
    { id: 3, platform: 'LinkedIn', url: 'https://linkedin.com/brandalpha' },
    { id: 4, platform: 'YouTube', url: 'https://youtube.com/brandalpha' },
    { id: 5, platform: 'Instagram', url: 'https://instagram.com/brandalpha' },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

/* ---------- Mock Strapi HTTP server (failure mode) ---------- */

function startFailureStrapi() {
  return new Promise((resolve, reject) => {
    const server = createServer((_req, res) => {
      res.writeHead(503);
      res.end(
        JSON.stringify({
          error: {
            status: 503,
            name: 'ServiceUnavailable',
            message: 'Simulated CMS failure',
          },
        })
      );
    });

    server.listen(0, MOCK_HOST, () => {
      const port = server.address().port;
      console.log(`Mock Strapi (failure) on ${MOCK_HOST}:${port}`);
      resolve({ server, port });
    });

    server.on('error', reject);
  });
}

/* ---------- Mock Strapi HTTP server (parameterized) ---------- */

function startMockStrapi(options = {}) {
  const {
    brand = MOCK_BRAND,
    site = MOCK_SITE,
    locales = MOCK_LOCALES,
    navigation = MOCK_NAVIGATION,
    footer = MOCK_FOOTER,
    siteKey = 'store-us',
  } = options;

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://${MOCK_HOST}`);

      // Authorization
      const auth = req.headers['authorization'] ?? '';
      if (!auth.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: { status: 401 } }));
        return;
      }

      // Accept header
      if ((req.headers['accept'] ?? '') !== 'application/json') {
        res.writeHead(406);
        res.end(JSON.stringify({ error: { status: 406 } }));
        return;
      }

      // Validate siteKey filter on site-specific endpoints
      if (req.method === 'GET' && url.pathname === '/api/sites') {
        if (url.searchParams.get('filters[key][$eq]') !== siteKey) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
      } else if (req.method === 'GET' && url.pathname === '/api/brands') {
        if (url.searchParams.get('filters[key][$eq]') !== brand.key) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
      } else if (
        req.method === 'GET' &&
        url.pathname === '/api/locale-configs'
      ) {
        if (url.searchParams.get('filters[site][key][$eq]') !== siteKey) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
      } else if (req.method === 'GET' && url.pathname === '/api/navigations') {
        if (url.searchParams.get('filters[site][key][$eq]') !== siteKey) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
        if (url.searchParams.get('locale') !== 'en') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
      } else if (req.method === 'GET' && url.pathname === '/api/footers') {
        if (url.searchParams.get('filters[site][key][$eq]') !== siteKey) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
        if (url.searchParams.get('locale') !== 'en') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
      } else if (req.method === 'GET') {
        // Unknown path
        res.writeHead(404);
        res.end(JSON.stringify({ error: { status: 404 } }));
        return;
      }

      // Route: /api/sites
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

      // Route: /api/brands
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

      // Route: /api/locale-configs
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

      // Route: /api/navigations
      if (req.method === 'GET' && url.pathname === '/api/navigations') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: [navigation],
            meta: { pagination: { total: 1 } },
          })
        );
        return;
      }

      // Route: /api/footers
      if (req.method === 'GET' && url.pathname === '/api/footers') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: [footer],
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

let scenarioErrors = []; // collect per-scenario failure info

function check(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
  } else {
    console.error(`  FAIL: ${msg}`);
    scenarioErrors.push(msg);
    failed = true;
  }
}

/** Output safe diagnostics when scenario assertions fail */
function diagnoseFailures(scenario, html) {
  if (scenarioErrors.length === 0) return;
  console.error(`\n[DIAGNOSTICS] ${scenario}`);
  console.error(`  HTML length: ${html?.length ?? 'N/A'} chars`);
  console.error(`  Failed assertions (${scenarioErrors.length}):`);
  for (const err of scenarioErrors) {
    console.error(`    - ${err}`);
  }

  // Check for CMS parse indicators (these are safe — no secrets)
  const hasHtml = !!html;
  const hasHead = hasHtml && html.includes('<head>');
  const hasBody = hasHtml && html.includes('<body');

  console.error(`  HTML structure: head=${hasHead} body=${hasBody}`);

  // Distinguish failure type
  if (!hasHtml || html.length < 200) {
    console.error('  Likely cause: Page render failure or worker crash');
  } else if (hasHead && hasBody) {
    console.error('  Likely cause: CMS data mismatch or fixture outdated');
  } else {
    console.error('  Likely cause: CMS parse failure or empty response');
  }

  // Safe expected content hints (no secrets)
  console.error(
    '  Expected nav labels: Home, Products, Services, Blog, Contact'
  );
  console.error(
    '  Expected footer labels: Documentation, Tools & Equipment, Construction Services, About us, Blog, Careers, Customers'
  );
  console.error('  Expected copyright: Brand Alpha. All rights reserved.');
  console.error('  Expected locales: /es, /fr');
  console.error(
    '  NOTE: API tokens, Authorization headers, and secrets are intentionally NOT shown in diagnostics.\n'
  );
}

/* ---------- Test scenarios ---------- */

/** Scenario 1: Full global runtime (all CMS data available) */
async function testGlobalRuntime(workerUrl) {
  console.log('\n--- Full Global Runtime ---');
  const res = await fetch(`${workerUrl}/`);
  const html = await res.text();

  // 1. No hardcoded brands
  check(!html.includes('ScrewFast'), 'HTML has no ScrewFast');
  check(!html.includes('test-token'), 'HTML has no test token');

  // 2. Navbar from CMS — 5-item baseline
  check(html.includes('Home'), 'Navbar has Home');
  check(html.includes('Products'), 'Navbar has Products');
  check(html.includes('Services'), 'Navbar has Services');
  check(html.includes('Blog'), 'Navbar has Blog');
  check(html.includes('Contact'), 'Navbar has Contact');

  // 3. Footer from CMS — Theme baseline
  check(html.includes('Ecosystem'), 'Footer has Ecosystem column');
  check(html.includes('Documentation'), 'Footer has Documentation');
  check(
    html.includes('Tools &amp; Equipment') ||
      html.includes('Tools & Equipment'),
    'Footer has Tools & Equipment'
  );
  check(
    html.includes('Construction Services'),
    'Footer has Construction Services'
  );
  check(html.includes('About us'), 'Footer has About us');
  check(html.includes('Careers'), 'Footer has Careers');
  check(html.includes('Customers'), 'Footer has Customers');
  check(
    html.includes('Brand Alpha. All rights reserved.'),
    'Footer has copyright'
  );

  // 4. Organization JSON-LD
  check(
    html.includes('"name":"Brand Alpha"'),
    'JSON-LD Organization name is Brand Alpha'
  );

  // 5. Locale switching
  check(html.includes('/es'), 'HTML has Spanish locale link');
  check(html.includes('/fr'), 'HTML has French locale link');
  // disabled locales should NOT appear as hreflang alternates
  // (de, fa, ja, and zh-cn are disabled)

  // 6. Page returns 200
  check(res.status === 200, `status 200 (got ${res.status})`);

  diagnoseFailures('Scenario 1: Full Global Runtime', html);
}

/** Scenario 2: CMS failure fallback */
async function testCmsFailureFallback(workerUrl) {
  console.log('\n--- CMS Failure Fallback ---');
  const res = await fetch(`${workerUrl}/`);
  const html = await res.text();

  check(res.status === 200, `status 200 (got ${res.status})`);
  // With no CMS data, navigation/fallback should show minimal fallback
  check(html.includes('Home'), 'Fallback navbar has Home');
  check(html.includes('Products'), 'Fallback navbar has Products');
  // No hardcoded brands
  check(!html.includes('ScrewFast'), 'Fallback has no ScrewFast');

  diagnoseFailures('Scenario 2: CMS Failure Fallback', html);
}

/* ---------- Main ---------- */

async function main() {
  // 1. Verify build artifacts exist
  try {
    readFileSync(resolve('dist-out/server/wrangler.json'));
    console.log('Build artifact: dist-out/server/wrangler.json — OK');
  } catch {
    console.error(
      'ERROR: dist-out/server/wrangler.json not found. Run pnpm build first.'
    );
    process.exit(1);
  }

  // 2. Scenario 1: Full global runtime with mock Strapi
  let mockServer;
  let workerProc;

  scenarioErrors = [];
  try {
    const { server, port: mockPort } = await startMockStrapi({
      siteKey: 'store-us',
    });
    mockServer = server;
    const mockUrl = `http://${MOCK_HOST}:${mockPort}`;

    const wp = await findFreePort();
    const wu = `http://127.0.0.1:${wp}`;
    console.log(`\n[Scenario 1] Starting wrangler dev on port ${wp}...`);

    workerProc = await startWorker({
      cmd: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      args: [
        'exec',
        'wrangler',
        'dev',
        '--config',
        'dist-out/server/wrangler.json',
        '--ip',
        '127.0.0.1',
        '--port',
        String(wp),
        '--var',
        `STRAPI_URL:${mockUrl}`,
        '--var',
        'STRAPI_API_TOKEN:test-token',
        '--var',
        'CMS_SITE_KEY:store-us',
      ],
      port: wp,
    });
    await testGlobalRuntime(wu);
  } finally {
    if (workerProc) await workerProc.stop();
    if (mockServer) mockServer.close();
  }

  // 3. Scenario 2: CMS failure — worker with 503-returning mock Strapi
  // All CMS endpoints return 503, triggering fallback in runtime config and homepage
  await sleep(2000);
  scenarioErrors = [];

  {
    let failServer;
    try {
      const { server, port: failPort } = await startFailureStrapi();
      failServer = server;
      const failUrl = `http://${MOCK_HOST}:${failPort}`;
      const wp = await findFreePort();
      const wu = `http://127.0.0.1:${wp}`;
      console.log(
        `\n[Scenario 2] Starting wrangler dev on port ${wp} (CMS 503)...`
      );

      workerProc = await startWorker({
        cmd: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
        args: [
          'exec',
          'wrangler',
          'dev',
          '--config',
          'dist-out/server/wrangler.json',
          '--ip',
          '127.0.0.1',
          '--port',
          String(wp),
          '--var',
          `STRAPI_URL:${failUrl}`,
          '--var',
          'STRAPI_API_TOKEN:test-token',
          '--var',
          'CMS_SITE_KEY:store-us',
        ],
        port: wp,
      });
      await testCmsFailureFallback(wu);

      await workerProc.stop();
    } finally {
      if (failServer) failServer.close();
    }
  }

  // Clean up
  console.log('\nTest resources cleaned up.');
  if (failed) {
    console.error('\nGlobal runtime integration test FAILED');
    process.exit(1);
  }

  console.log('\nGlobal runtime integration test PASSED');
}

main();
