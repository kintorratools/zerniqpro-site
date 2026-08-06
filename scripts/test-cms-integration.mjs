import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

let mockServer;
let previewProcess;
let failed = false;

const MOCK_HOST = '127.0.0.1';

const MOCK_SITE_RECORD = {
  id: 1,
  documentId: 'abc123',
  key: 'zerniq',
  name: 'ZERNIQ',
  domain: 'https://zerniqpro.com',
  defaultLocale: 'en',
  defaultSeo: {
    title: 'ZERNIQ Tools',
    description: 'Professional power tools for North America',
  },
  branding: {
    logoUrl: 'https://zerniqpro.com/logo.png',
    faviconUrl: 'https://zerniqpro.com/favicon.ico',
    primaryColor: '#ff6600',
    accentColor: '#1e293b',
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

/** Start a mock Strapi HTTP server on a dynamic port. Returns { server, url }. */
function startMockStrapi() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://${MOCK_HOST}`);

      if (req.method !== 'GET' || url.pathname !== '/api/sites') {
        res.writeHead(404);
        res.end(
          JSON.stringify({ error: { status: 404, message: 'Not found' } })
        );
        return;
      }

      // Verify required headers
      const auth = req.headers['authorization'] ?? '';
      if (auth !== 'Bearer test-token') {
        console.error(`  Mock: Missing/wrong Authorization header: "${auth}"`);
        res.writeHead(401);
        res.end(
          JSON.stringify({ error: { status: 401, message: 'Unauthorized' } })
        );
        return;
      }

      const accept = req.headers['accept'] ?? '';
      if (accept !== 'application/json') {
        console.error(`  Mock: Wrong Accept header: "${accept}"`);
        res.writeHead(406);
        res.end(
          JSON.stringify({ error: { status: 406, message: 'Not Acceptable' } })
        );
        return;
      }

      // Verify query parameters match the contract
      const key = url.searchParams.get('filters[key][$eq]');
      const pageSize = url.searchParams.get('pagination[pageSize]');
      const status = url.searchParams.get('status');

      if (key !== 'zerniq') {
        console.error(
          `  Mock: Expected filters[key][$eq]=zerniq, got "${key}"`
        );
        res.writeHead(400);
        res.end(
          JSON.stringify({ error: { status: 400, message: 'Bad request' } })
        );
        return;
      }
      if (pageSize !== '1') {
        console.error(
          `  Mock: Expected pagination[pageSize]=1, got "${pageSize}"`
        );
        res.writeHead(400);
        res.end(
          JSON.stringify({ error: { status: 400, message: 'Bad request' } })
        );
        return;
      }
      if (status !== 'published') {
        console.error(`  Mock: Expected status=published, got "${status}"`);
        res.writeHead(400);
        res.end(
          JSON.stringify({ error: { status: 400, message: 'Bad request' } })
        );
        return;
      }

      // Verify no populate=*
      if (url.searchParams.get('populate') === '*') {
        console.error('  Mock: populate=* detected — forbidden');
        res.writeHead(400);
        res.end(
          JSON.stringify({ error: { status: 400, message: 'Bad request' } })
        );
        return;
      }

      // Verify populate targets
      const popSeo = url.searchParams.get('populate[defaultSeo]');
      const popBrand = url.searchParams.get('populate[branding]');
      if (popSeo !== '*' || popBrand !== '*') {
        console.error(
          '  Mock: Missing populate[defaultSeo]=* or populate[branding]=*'
        );
        res.writeHead(400);
        res.end(
          JSON.stringify({ error: { status: 400, message: 'Bad request' } })
        );
        return;
      }

      // Verify field selection
      const f0 = url.searchParams.get('fields[0]');
      const f1 = url.searchParams.get('fields[1]');
      const f2 = url.searchParams.get('fields[2]');
      const f3 = url.searchParams.get('fields[3]');
      if (
        f0 !== 'key' ||
        f1 !== 'name' ||
        f2 !== 'domain' ||
        f3 !== 'defaultLocale'
      ) {
        console.error(
          `  Mock: Unexpected fields selection: ${f0},${f1},${f2},${f3}`
        );
        res.writeHead(400);
        res.end(
          JSON.stringify({ error: { status: 400, message: 'Bad request' } })
        );
        return;
      }

      // All checks passed
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(
        JSON.stringify({
          data: [MOCK_SITE_RECORD],
          meta: { pagination: { total: 1 } },
        })
      );
    });

    server.listen(0, MOCK_HOST, () => {
      const port = server.address().port;
      const url = `http://${MOCK_HOST}:${port}`;
      console.log(`Mock Strapi listening on ${url}`);
      resolve({ server, url, port });
    });

    server.on('error', reject);
  });
}

/** Spawn Astro dev server as a child process (dev mode accesses process.env, unlike preview) */
function startPreview(previewPort, mockUrl) {
  // Set env on parent process so child inherits it naturally
  process.env.CMS_SITE_KEY = 'zerniq';
  process.env.STRAPI_URL = mockUrl;
  process.env.STRAPI_API_TOKEN = 'test-token';

  return new Promise((resolve, reject) => {
    const astroBin = './node_modules/astro/bin/astro.mjs';
    const child = spawn(
      process.execPath,
      [astroBin, 'dev', '--host', '127.0.0.1', '--port', String(previewPort)],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let resolved = false;

    const onData = data => {
      const text = data.toString();
      if (!resolved && (text.includes('Local') || text.includes('http://'))) {
        resolved = true;
        setTimeout(() => resolve(child), 1000);
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
    }, 20000);
  });
}

/** Wait for a URL to be reachable */
async function waitForUrl(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status >= 400) return true;
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  return false;
}

/** Stop a child process */
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

async function testCmsProbe(previewUrl) {
  console.log('\n--- Test: /api/cms-probe.json end-to-end ---');

  try {
    const res = await fetch(`${previewUrl}/api/cms-probe.json`);
    const body = await res.json();

    // Status code check
    if (res.status !== 200) {
      console.error(`FAIL: expected HTTP 200, got ${res.status}`);
      console.error(`  Body: ${JSON.stringify(body)}`);
      failed = true;
      return;
    }
    console.log(`PASS: HTTP ${res.status}`);

    // Status field
    if (body.status !== 'ok') {
      console.error(`FAIL: expected status "ok", got "${body.status}"`);
      failed = true;
      return;
    }
    console.log(`PASS: status = "ok"`);

    // cmsReachable
    if (body.cmsReachable !== true) {
      console.error(
        `FAIL: expected cmsReachable=true, got ${body.cmsReachable}`
      );
      failed = true;
      return;
    }
    console.log(`PASS: cmsReachable = true`);

    // Site object
    const site = body.site;
    if (!site || typeof site !== 'object') {
      console.error('FAIL: missing site object');
      failed = true;
      return;
    }

    if (site.key !== 'zerniq') {
      console.error(`FAIL: site.key expected "zerniq", got "${site.key}"`);
      failed = true;
      return;
    }
    if (site.name !== 'ZERNIQ') {
      console.error(`FAIL: site.name expected "ZERNIQ", got "${site.name}"`);
      failed = true;
      return;
    }
    if (site.domain !== 'https://zerniqpro.com') {
      console.error(
        `FAIL: site.domain expected "https://zerniqpro.com", got "${site.domain}"`
      );
      failed = true;
      return;
    }
    if (site.defaultLocale !== 'en') {
      console.error(
        `FAIL: site.defaultLocale expected "en", got "${site.defaultLocale}"`
      );
      failed = true;
      return;
    }
    console.log(`PASS: site.key = "zerniq"`);
    console.log(`PASS: site.name = "ZERNIQ"`);
    console.log(`PASS: site.domain = "https://zerniqpro.com"`);
    console.log(`PASS: site.defaultLocale = "en"`);

    // Cache-Control header
    const cacheControl = res.headers.get('cache-control') ?? '';
    if (!cacheControl.includes('no-store')) {
      console.error(`FAIL: Cache-Control missing no-store: "${cacheControl}"`);
      failed = true;
      return;
    }
    console.log(`PASS: Cache-Control includes no-store`);

    // X-Robots-Tag header
    const xRobots = res.headers.get('x-robots-tag') ?? '';
    if (!xRobots.includes('noindex') || !xRobots.includes('nofollow')) {
      console.error(
        `FAIL: X-Robots-Tag must include noindex and nofollow: "${xRobots}"`
      );
      failed = true;
      return;
    }
    console.log(`PASS: X-Robots-Tag includes noindex and nofollow`);

    // Verify no sensitive data leaked
    if (
      JSON.stringify(body).includes('test-token') ||
      JSON.stringify(body).includes('token')
    ) {
      console.error('FAIL: Response contains token or sensitive data');
      failed = true;
      return;
    }
    console.log(`PASS: No sensitive data in response`);
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    failed = true;
  }
}

async function main() {
  // 1. Start mock Strapi on a dynamic port
  const { server, url: mockUrl } = await startMockStrapi();
  mockServer = server;

  // 2. Find an available port for Astro preview
  // Use a specific port to avoid conflicts with the concurrent smoke test
  const previewPort = 4322;
  const previewUrl = `http://127.0.0.1:${previewPort}`;

  // 3. Start Astro preview with mock Strapi as CMS backend
  console.log(`\nStarting Astro preview on port ${previewPort}...`);
  previewProcess = await startPreview(previewPort, mockUrl);

  const ready = await waitForUrl(previewUrl);
  if (!ready) {
    console.error('FAIL: Astro preview did not start');
    failed = true;
  } else {
    console.log('Astro preview is ready.');
    await testCmsProbe(previewUrl);
  }

  // 4. Cleanup
  stopProcess(previewProcess);
  mockServer.close();
  console.log('\nTest resources cleaned up.');

  if (failed) {
    console.error('\nCMS integration test FAILED');
    process.exit(1);
  }

  console.log('\nCMS integration test PASSED');
}

main();
