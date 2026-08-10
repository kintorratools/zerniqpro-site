import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startWorker } from './lib/test-process.mjs';

let mockServer;
let worker;
let failed = false;

const MOCK_HOST = '127.0.0.1';

/* ---------- Mock Strapi data ---------- */

const MOCK_BRAND = {
  id: 1,
  documentId: 'brand-001',
  key: 'brand-alpha',
  name: 'Store US',
  defaultSeo: {
    title: 'Store US Tools',
    description: 'Professional power tools for North America',
  },
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

const VALID_SITE = {
  id: 1,
  documentId: 'abc123',
  key: 'store-us',
  name: 'Store US',
  domain: 'https://store-us.example',
  defaultLocale: 'en',
  defaultSeo: {
    title: 'Store US Tools',
    description: 'Professional power tools for North America',
  },
  brand: {
    documentId: 'brand-001',
    key: 'brand-alpha',
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const VALID_PRODUCT = {
  id: 1,
  documentId: 'prod-001',
  handle: 'xp600-dtf-printer',
  name: 'XP600 DTF Printer',
  summary: 'Professional direct-to-film printing solution',
  displayOrder: 1,
  introText: 'The XP600 DTF Printer delivers professional-grade direct-to-film transfers for any fabric type.',
  cardImage: null,
  mainImage: { url: 'https://store-us.example/images/xp600-hero.png', alternativeText: 'XP600 DTF Printer in action', width: 1200, height: 800, mime: 'image/png' },
  mainImageAlt: 'XP600 DTF Printer in action',
  descriptionTabLabel: 'Description',
  specificationsTabLabel: 'Specifications',
  blueprintsTabLabel: 'Blueprints',
  longDescriptionTitle: 'Overview',
  longDescriptionSubtitle: 'Professional DTF Printing',
  ctaLabel: 'Order Now',
  ctaUrl: 'https://store-us.example/order',
  descriptionItems: [
    { id: 1, title: 'High Resolution', description: '1440 DPI printing for crisp details' },
    { id: 2, title: 'Fast Output', description: 'Up to 3 sqm per hour' },
    { id: 3, title: 'Versatile', description: 'Works with cotton, polyester, blends' },
  ],
  specificationsLeft: [
    { id: 10, title: 'Print Head', description: 'XP600' },
    { id: 11, title: 'Max Width', description: '60cm' },
    { id: 12, title: 'Ink Type', description: 'DTF Pigment' },
  ],
  specificationsRight: [],
  tableData: null,
  blueprintFirst: null,
  blueprintFirstAlt: '',
  blueprintSecond: null,
  blueprintSecondAlt: '',
  seo: {
    id: 1,
    title: 'XP600 DTF Printer — Shop Now',
    description: 'High-quality DTF printing with XP600 print heads',
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const INVALID_PRODUCT = {
  id: 2,
  documentId: 'prod-002',
  handle: 'bad-product',
  name: '',
  summary: '',
  displayOrder: null,
  introText: null,
  cardImage: null,
  mainImage: null,
  mainImageAlt: null,
  descriptionTabLabel: null,
  specificationsTabLabel: null,
  blueprintsTabLabel: null,
  longDescriptionTitle: null,
  longDescriptionSubtitle: null,
  ctaLabel: null,
  ctaUrl: null,
  descriptionItems: null,
  specificationsLeft: null,
  specificationsRight: null,
  tableData: null,
  blueprintFirst: null,
  blueprintFirstAlt: null,
  blueprintSecond: null,
  blueprintSecondAlt: null,
  seo: null,
  createdAt: '2025-01-01T00:00:00.000Z',
};

/** Start a mock Strapi HTTP server that handles both /api/sites and /api/products */
function startMockStrapi() {
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

      if (req.method === 'GET' && url.pathname === '/api/brands') {
        // Verify brand query params
        if (url.searchParams.get('filters[key][$eq]') !== 'brand-alpha') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: [MOCK_BRAND],
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
            data: MOCK_LOCALES,
            meta: { pagination: { total: 5 } },
          })
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/sites') {
        // Verify site query params
        if (url.searchParams.get('filters[key][$eq]') !== 'store-us') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
        if (url.searchParams.get('pagination[pageSize]') !== '1') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
        if (url.searchParams.get('status') !== 'published') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            data: [VALID_SITE],
            meta: { pagination: { total: 1 } },
          })
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/products') {
        // Verify product query params
        if (url.searchParams.get('filters[site][key][$eq]') !== 'store-us') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
        const productHandle = url.searchParams.get('filters[handle][$eq]');
        if (!productHandle) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
        if (url.searchParams.get('pagination[pageSize]') !== '1') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
        if (url.searchParams.get('status') !== 'published') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }

        // Return data based on handle
        if (productHandle === 'xp600-dtf-printer') {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(
            JSON.stringify({
              data: [VALID_PRODUCT],
              meta: { pagination: { total: 1 } },
            })
          );
          return;
        }

        if (productHandle === 'bad-product') {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(
            JSON.stringify({
              data: [INVALID_PRODUCT],
              meta: { pagination: { total: 1 } },
            })
          );
          return;
        }

        // Non-existent product
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({ data: [], meta: { pagination: { total: 0 } } })
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

/* ---------- Test scenarios ---------- */

async function testValidProduct(workerUrl) {
  console.log('\n--- [valid] XP600 DTF Printer → 200 ---');
  const res = await fetch(`${workerUrl}/preview/products/xp600-dtf-printer/`);
  const html = await res.text();

  check(res.status === 200, `status 200 (got ${res.status})`);

  // HTML content checks
  check(html.includes('XP600 DTF Printer'), 'HTML contains product name');
  check(
    html.includes('Professional direct-to-film printing solution'),
    'HTML contains summary'
  );
  const h1Count = (html.match(/<h1[^>]*>/g) || []).length;
  check(h1Count === 1, `exactly one <h1> (found ${h1Count})`);
  check(html.includes('<title>'), 'HTML contains <title>');
  check(html.includes('XP600 DTF Printer'), 'title includes product name');
  check(html.includes('Store US'), 'title includes site name');
  check(
    html.includes('<meta name="description"'),
    'HTML contains meta description'
  );

  // Canonical
  check(
    html.includes('https://store-us.example/products/xp600-dtf-printer/'),
    'canonical URL correct'
  );

  // JSON-LD
  check(html.includes('application/ld+json'), 'JSON-LD present');
  check(html.includes('"@type":"Product"'), 'JSON-LD @type=Product');
  check(html.includes('"Store US"'), 'JSON-LD brand=Store US');

  // No Offer / price / inventory
  check(!html.includes('"Offer"'), 'no Offer in JSON-LD');
  check(!html.includes('"price"'), 'no price in JSON-LD');
  check(!html.includes('"offers"'), 'no offers in JSON-LD');

  // Fixed field sections rendered
  check(html.includes('Overview'), 'long description title rendered');
  check(html.includes('Description'), 'description tab label rendered');
  check(html.includes('Specifications'), 'specifications tab label rendered');
  check(html.includes('High Resolution'), 'description item rendered');
  check(html.includes('Print Head'), 'specification item rendered');

  // Headers
  const xr = res.headers.get('x-robots-tag') ?? '';
  check(
    xr.includes('noindex') && xr.includes('nofollow'),
    'X-Robots-Tag: noindex,nofollow'
  );

  // No leakage
  check(!html.includes('ScrewFast'), 'no ScrewFast in HTML');
  check(!html.includes('test-token'), 'no token in HTML');
  check(!html.includes('127.0.0.1'), 'no mock URL in HTML');
}

async function testNonExistentProduct(workerUrl) {
  console.log('\n--- [404] non-existent handle → 404 ---');
  const res = await fetch(`${workerUrl}/preview/products/nonexistent/`);
  const html = await res.text();

  check(res.status === 404, `status 404 (got ${res.status})`);
  check(html.includes('404'), 'HTML contains 404');

  const xr = res.headers.get('x-robots-tag') ?? '';
  check(
    xr.includes('noindex') && xr.includes('nofollow'),
    'X-Robots-Tag: noindex,nofollow'
  );

  check(!html.includes('test-token'), 'no token in 404 HTML');
}

async function testInvalidProduct(workerUrl) {
  console.log('\n--- [502] invalid product data → 502 ---');
  const res = await fetch(`${workerUrl}/preview/products/bad-product/`);
  const html = await res.text();

  check(res.status === 502, `status 502 (got ${res.status})`);
  check(html.includes('502'), 'HTML contains 502');

  const xr = res.headers.get('x-robots-tag') ?? '';
  check(
    xr.includes('noindex') && xr.includes('nofollow'),
    'X-Robots-Tag: noindex,nofollow'
  );

  check(!html.includes('test-token'), 'no token in 502 HTML');
  check(!html.includes('Bad Product'), 'no product data in 502 HTML');
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

/* ---------- Main ---------- */

let mockUrl;

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

  // 2. Start mock Strapi
  const { server, port: mockPort } = await startMockStrapi();
  mockServer = server;
  mockUrl = `http://${MOCK_HOST}:${mockPort}`;

  try {
    // Start worker once for all tests
    const wp = await findFreePort();
    const wu = `http://127.0.0.1:${wp}`;
    console.log(`\nStarting wrangler dev on port ${wp}...`);

    worker = await startWorker({
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

    await testValidProduct(wu);
    await testNonExistentProduct(wu);
    await testInvalidProduct(wu);
  } finally {
    if (worker) await worker.stop();
    mockServer.close();
    console.log('\nTest resources cleaned up.');
  }

  if (failed) {
    console.error('\nProduct SSR test FAILED');
    process.exit(1);
  }

  console.log('\nProduct SSR test PASSED');
}

main();
