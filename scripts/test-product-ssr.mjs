import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let mockServer;
let workerProcess;
let failed = false;

const MOCK_HOST = '127.0.0.1';

/* ---------- Mock Strapi data ---------- */

const MOCK_BRAND = {
  id: 1,
  documentId: 'brand-001',
  key: 'zerniq',
  name: 'ZERNIQ',
  domain: 'https://zerniqpro.com',
  defaultSeo: {
    title: 'ZERNIQ Tools',
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
  key: 'zerniq',
  name: 'ZERNIQ',
  defaultLocale: 'en',
  defaultSeo: {
    title: 'ZERNIQ Tools',
    description: 'Professional power tools for North America',
  },
  brand: {
    documentId: 'brand-001',
    key: 'zerniq',
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
  seo: {
    title: 'XP600 DTF Printer — Shop Now',
    description: 'High-quality DTF printing with XP600 print heads',
  },
  hero: {
    eyebrow: 'New Release',
    heading: 'Next-Gen DTF Printing',
    description: 'Faster, sharper, more reliable',
    imageUrl: 'https://zerniqpro.com/images/xp600-hero.png',
    imageAlt: 'XP600 DTF Printer in action',
  },
  sections: [
    {
      __component: 'content.text',
      heading: 'Overview',
      body: 'The XP600 DTF Printer delivers professional-grade direct-to-film transfers for any fabric type.',
    },
    {
      __component: 'content.feature-grid',
      heading: 'Key Features',
      items: [
        {
          title: 'High Resolution',
          description: '1440 DPI printing for crisp details',
        },
        { title: 'Fast Output', description: 'Up to 3 sqm per hour' },
        {
          title: 'Versatile',
          description: 'Works with cotton, polyester, blends',
        },
      ],
    },
    {
      __component: 'content.specifications',
      heading: 'Technical Specifications',
      rows: [
        { label: 'Print Head', value: 'XP600' },
        { label: 'Max Width', value: '60cm' },
        { label: 'Ink Type', value: 'DTF Pigment' },
      ],
    },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const INVALID_PRODUCT = {
  id: 2,
  documentId: 'prod-002',
  handle: 'bad-product',
  name: 'Bad Product',
  summary: 'This product has invalid data',
  sections: [
    {
      __component: 'content.unknown',
      heading: 'Bad',
    },
  ],
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
        if (url.searchParams.get('filters[key][$eq]') !== 'zerniq') {
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

      if (req.method === 'GET' && url.pathname === '/api/locales') {
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
        if (url.searchParams.get('filters[key][$eq]') !== 'zerniq') {
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
        if (url.searchParams.get('filters[site][key][$eq]') !== 'zerniq') {
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

/** Start wrangler dev */
function startWorker(workerPort, mockUrl) {
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
        'dist/server/wrangler.json',
        '--ip',
        '127.0.0.1',
        '--port',
        String(workerPort),
        '--var',
        `STRAPI_URL:${mockUrl}`,
        '--var',
        'STRAPI_API_TOKEN:test-token',
        '--var',
        'CMS_SITE_KEY:zerniq',
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
  check(html.includes('ZERNIQ'), 'title includes site name');
  check(
    html.includes('<meta name="description"'),
    'HTML contains meta description'
  );

  // Canonical
  check(
    html.includes('https://zerniqpro.com/products/xp600-dtf-printer/'),
    'canonical URL correct'
  );

  // JSON-LD
  check(html.includes('application/ld+json'), 'JSON-LD present');
  check(html.includes('"@type":"Product"'), 'JSON-LD @type=Product');
  check(html.includes('"ZERNIQ"'), 'JSON-LD brand=ZERNIQ');

  // No Offer / price / inventory
  check(!html.includes('"Offer"'), 'no Offer in JSON-LD');
  check(!html.includes('"price"'), 'no price in JSON-LD');
  check(!html.includes('"offers"'), 'no offers in JSON-LD');

  // Three blocks rendered
  check(html.includes('Overview'), 'text block heading rendered');
  check(html.includes('Key Features'), 'feature-grid block heading rendered');
  check(
    html.includes('Technical Specifications'),
    'specifications block rendered'
  );

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
    readFileSync(resolve('dist/server/wrangler.json'));
    console.log('Build artifact: dist/server/wrangler.json — OK');
  } catch {
    console.error(
      'ERROR: dist/server/wrangler.json not found. Run pnpm build first.'
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

    workerProcess = await startWorker(wp, mockUrl);
    const ready = await waitForUrl(wu);
    if (!ready) {
      console.error('FAIL: Worker did not start');
      failed = true;
      return;
    }

    await testValidProduct(wu);
    await testNonExistentProduct(wu);
    await testInvalidProduct(wu);
  } finally {
    stopProcess(workerProcess);
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
