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

/** Start a mock Strapi HTTP server that handles /api/brands, /api/sites, and /api/locales */
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

      // Validate siteKey filter per endpoint
      if (req.method === 'GET' && url.pathname === '/api/sites') {
        if (url.searchParams.get('filters[key][$eq]') !== 'zerniq') {
          res.writeHead(400);
          res.end(JSON.stringify({ error: { status: 400 } }));
          return;
        }
      } else if (
        url.searchParams.get('filters[site][key][$eq]') !== 'zerniq'
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
            data: [MOCK_BRAND],
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
            data: [MOCK_SITE],
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
            meta: { pagination: { total: MOCK_LOCALES.length } },
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
  check(body.site.brand.key === 'zerniq', 'site.brand.key=zerniq');

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

    await testBrandAndLocales(wu);
  } finally {
    stopProcess(workerProcess);
    mockServer.close();
    console.log('\nTest resources cleaned up.');
  }

  if (failed) {
    console.error('\nBrand/i18n integration test FAILED');
    process.exit(1);
  }

  console.log('\nBrand/i18n integration test PASSED');
}

main();
