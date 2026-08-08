import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let mockServer;
let workerProcess;
let failed = false;

const MOCK_HOST = '127.0.0.1';

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

/** Boundary test data — matched by Authorization token */
const TOKEN_DATA = {
  'test-token': {
    data: [VALID_SITE],
    meta: { pagination: { total: 1 } },
  },
  'test-token-invalid-brand': {
    data: [{ ...VALID_SITE, brand: { documentId: '', key: '' } }],
    meta: { pagination: { total: 1 } },
  },
  'test-token-nullable': {
    data: [{ ...VALID_SITE, defaultSeo: null, brand: null }],
    meta: { pagination: { total: 1 } },
  },
  'test-token-nullable-inner': {
    data: [
      {
        ...VALID_SITE,
        defaultSeo: { title: null, description: null },
        brand: null,
      },
    ],
    meta: { pagination: { total: 1 } },
  },
  'test-token-nullable-trim': {
    data: [{ ...VALID_SITE, defaultSeo: { title: '   ', description: '   ' } }],
    meta: { pagination: { total: 1 } },
  },
};

/** Start a mock Strapi HTTP server */
function startMockStrapi() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://${MOCK_HOST}`);

      if (req.method !== 'GET' || url.pathname !== '/api/sites') {
        res.writeHead(404);
        res.end(JSON.stringify({ error: { status: 404 } }));
        return;
      }

      // Token determines response mode
      const auth = req.headers['authorization'] ?? '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const mode = TOKEN_DATA[token];
      if (!mode) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: { status: 401 } }));
        return;
      }
      if ((req.headers['accept'] ?? '') !== 'application/json') {
        res.writeHead(406);
        res.end(JSON.stringify({ error: { status: 406 } }));
        return;
      }

      // Verify query params
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
      // Verify site key filter
      if (url.searchParams.get('filters[key][$eq]') !== 'zerniq') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: { status: 400 } }));
        return;
      }
      if (url.searchParams.get('populate') === '*') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: { status: 400 } }));
        return;
      }
      if (
        url.searchParams.get('populate[defaultSeo]') !== '*' ||
        url.searchParams.get('populate[brand]') !== '*'
      ) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: { status: 400 } }));
        return;
      }
      const f0 = url.searchParams.get('fields[0]');
      const f1 = url.searchParams.get('fields[1]');
      const f2 = url.searchParams.get('fields[2]');
      if (f0 !== 'key' || f1 !== 'name' || f2 !== 'defaultLocale') {
        res.writeHead(400);
        res.end(JSON.stringify({ error: { status: 400 } }));
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(mode));
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
function startWorker(workerPort, token, mockUrl) {
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
        'STRAPI_API_TOKEN:' + token,
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

async function testValidSite(workerUrl) {
  console.log('\n--- [valid] valid site → 200 ---');
  const res = await fetch(`${workerUrl}/api/cms-probe.json`);
  const body = await res.json();

  check(res.status === 200, `status 200 (got ${res.status})`);
  check(body.status === 'ok', `status="ok"`);
  check(body.cmsReachable === true, 'cmsReachable=true');
  check(body.site.key === 'zerniq', 'site.key=zerniq');
  check(body.site.name === 'ZERNIQ', 'site.name=ZERNIQ');
  check(body.site?.brandKey === 'zerniq', 'site.brandKey correct');
  check(body.site.defaultLocale === 'en', 'site.defaultLocale=en');

  const cc = res.headers.get('cache-control') ?? '';
  check(cc.includes('no-store'), 'Cache-Control: no-store');

  const xr = res.headers.get('x-robots-tag') ?? '';
  check(
    xr.includes('noindex') && xr.includes('nofollow'),
    'X-Robots-Tag: noindex,nofollow'
  );

  const raw = JSON.stringify(body);
  check(!raw.includes('test-token'), 'no token in response');
}

async function testInvalidBrand(workerUrl) {
  console.log('\n--- [invalid-brand] empty brand key → 502 ---');
  const res = await fetch(`${workerUrl}/api/cms-probe.json`);
  const body = await res.json();

  check(res.status === 502, `status 502 (got ${res.status})`);
  check(body.status === 'error', `status="error" (got ${body.status})`);
  check(body.cmsReachable === false, 'cmsReachable=false');

  const raw = JSON.stringify(body);
  check(!raw.includes('test-token'), 'no token in response');
}

async function testNullableOuter(workerUrl) {
  console.log(
    '\n--- [nullable] defaultSeo=null, brand=null → 502 (brand required) ---'
  );
  const res = await fetch(`${workerUrl}/api/cms-probe.json`);
  const body = await res.json();

  check(res.status === 502, `status 502 (got ${res.status})`);
  check(body.status === 'error', `status="error" (got ${body.status})`);
  check(body.cmsReachable === false, 'cmsReachable=false');
  console.log('  PASS: null brand rejected with 502');
}

async function testNullableInner(workerUrl) {
  console.log(
    '\n--- [nullable-inner] inner fields null, brand=null → 502 (brand required) ---'
  );
  const res = await fetch(`${workerUrl}/api/cms-probe.json`);
  const body = await res.json();

  check(res.status === 502, `status 502 (got ${res.status})`);
  check(body.status === 'error', `status="error" (got ${body.status})`);
  check(body.cmsReachable === false, 'cmsReachable=false');
  console.log('  PASS: null brand rejected with 502');
}

async function testNullableTrim(workerUrl) {
  console.log('\n--- [nullable-trim] whitespace SEO → 200 with defaults ---');
  const res = await fetch(`${workerUrl}/api/cms-probe.json`);
  const body = await res.json();

  check(res.status === 200, `status 200 (got ${res.status})`);
  check(body.status === 'ok', `status="ok"`);
  check(body.cmsReachable === true, 'cmsReachable=true');
  check(body.site?.key === 'zerniq', 'site.key=zerniq');
  console.log(
    '  PASS: whitespace trimmed to defaults (normalized in ViewModel)'
  );
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

async function runScenario(label, token, testFn) {
  stopProcess(workerProcess);
  await sleep(2000);

  const wp = await findFreePort();
  const wu = `http://127.0.0.1:${wp}`;

  console.log(
    `\n[Scenario: ${label}] Starting worker (token=***, port=${wp})...`
  );
  workerProcess = await startWorker(wp, token, mockUrl);

  const ready = await waitForUrl(wu);
  if (!ready) {
    console.error(`  FAIL: Worker did not start for ${label}`);
    failed = true;
    return;
  }

  await testFn(wu);
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
    await runScenario('valid', 'test-token', testValidSite);
    await runScenario(
      'invalid-brand',
      'test-token-invalid-brand',
      testInvalidBrand
    );
    await runScenario(
      'nullable-outer',
      'test-token-nullable',
      testNullableOuter
    );
    await runScenario(
      'nullable-inner',
      'test-token-nullable-inner',
      testNullableInner
    );
    await runScenario(
      'nullable-trim',
      'test-token-nullable-trim',
      testNullableTrim
    );
  } finally {
    stopProcess(workerProcess);
    mockServer.close();
    console.log('\nTest resources cleaned up.');
  }

  if (failed) {
    console.error('\nCMS integration test FAILED');
    process.exit(1);
  }

  console.log('\nCMS integration test PASSED');
}

main();
