import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let failed = false;

const MOCK_HOST = '127.0.0.1';

/* ---------- Mock Strapi data ---------- */

const MOCK_BRAND = {
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

const MOCK_SITE = {
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

const MOCK_NAVIGATION = {
  id: 1,
  documentId: 'nav-001',
  site: { key: 'store-us' },
  locale: { code: 'en' },
  items: [
    { id: 1, label: 'Home', href: '/', order: 1, visible: true },
    { id: 2, label: 'Products', href: '/products', order: 2, visible: true },
    { id: 3, label: 'Support', href: '/support', order: 3, visible: true },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const MOCK_FOOTER = {
  id: 1,
  documentId: 'ftr-001',
  site: { key: 'store-us' },
  locale: { code: 'en' },
  columns: [
    {
      id: 1,
      title: 'Legal',
      links: [
        { id: 1, label: 'Privacy Policy', url: '/privacy' },
        { id: 2, label: 'Terms', url: '/terms' },
      ],
    },
    {
      id: 2,
      title: 'Company',
      links: [
        { id: 3, label: 'About', url: '/about' },
        { id: 4, label: 'Contact', url: '/contact' },
      ],
    },
  ],
  copyright: 'Brand Alpha. All rights reserved.',
  legalLinks: [{ id: 1, label: 'Privacy', url: '/privacy' }],
  socialLinks: [
    { id: 1, platform: 'Facebook', url: 'https://facebook.com/brandalpha' },
    { id: 2, platform: 'Twitter', url: 'https://twitter.com/brandalpha' },
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

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

/** Start wrangler dev */
function startWorker(workerPort, mockUrl, siteKey = 'store-us') {
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

/** Scenario 1: Full global runtime (all CMS data available) */
async function testGlobalRuntime(workerUrl) {
  console.log('\n--- Full Global Runtime ---');
  const res = await fetch(`${workerUrl}/`);
  const html = await res.text();

  // 1. No hardcoded brands
  check(!html.includes('ScrewFast'), 'HTML has no ScrewFast');
  check(!html.includes('zerniqpro.com'), 'HTML has no zerniqpro.com');
  check(!html.includes('test-token'), 'HTML has no test token');

  // 2. Navbar from CMS
  check(html.includes('Home'), 'Navbar has Home');
  check(html.includes('Products'), 'Navbar has Products');
  check(html.includes('Support'), 'Navbar has Support');

  // 3. Footer from CMS
  check(html.includes('Privacy Policy'), 'Footer has Privacy Policy');
  check(html.includes('Terms'), 'Footer has Terms');
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
  // (de and pt-BR are disabled)

  // 6. Page returns 200
  check(res.status === 200, `status 200 (got ${res.status})`);
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
  check(html.includes('Support'), 'Fallback navbar has Support');
  // Footer should have minimal fallback
  // No hardcoded brands
  check(!html.includes('ScrewFast'), 'Fallback has no ScrewFast');
  check(!html.includes('zerniqpro.com'), 'Fallback has no zerniqpro.com');
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

  try {
    const { server, port: mockPort } = await startMockStrapi({
      siteKey: 'store-us',
    });
    mockServer = server;
    const mockUrl = `http://${MOCK_HOST}:${mockPort}`;

    const wp = await findFreePort();
    const wu = `http://127.0.0.1:${wp}`;
    console.log(`\n[Scenario 1] Starting wrangler dev on port ${wp}...`);

    workerProc = await startWorker(wp, mockUrl, 'store-us');
    const ready = await waitForUrl(wu);
    if (!ready) {
      console.error('FAIL: Worker did not start for Scenario 1');
      failed = true;
    } else {
      await testGlobalRuntime(wu);
    }
  } finally {
    stopProcess(workerProc);
    if (mockServer) mockServer.close();
  }

  // 3. Scenario 2: CMS failure — worker without mock Strapi
  // Point STRAPI_URL to a non-existent server so all CMS calls fail
  await sleep(2000);

  {
    const deadUrl = `http://${MOCK_HOST}:19999`; // no server on this port
    const wp = await findFreePort();
    const wu = `http://127.0.0.1:${wp}`;
    console.log(
      `\n[Scenario 2] Starting wrangler dev on port ${wp} (no CMS)...`
    );

    workerProc = await startWorker(wp, deadUrl, 'store-us');
    const ready = await waitForUrl(wu);
    if (!ready) {
      console.error('FAIL: Worker did not start for Scenario 2');
      failed = true;
    } else {
      await testCmsFailureFallback(wu);
    }

    stopProcess(workerProc);
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
