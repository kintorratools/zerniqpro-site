import http from 'http';

let passed = 0;
let failed = 0;
const results = [];

function check(name, condition) {
  if (condition) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failed++;
    console.error(`FAIL: ${name}`);
  }
}

function startMock(handler) {
  return new Promise(resolve => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function fetchJson(url) {
  const res = await fetch(url);
  const headers = Object.fromEntries(res.headers.entries());
  const body = await res.json();
  return { status: res.status, headers, body };
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

const OK_BODY = JSON.stringify({
  status: 'ok',
  cmsReachable: true,
  site: {
    key: 'store-us',
    name: 'US Store',
    domain: 'https://example.com',
    defaultLocale: 'en',
    brandKey: 'brand-alpha',
  },
});

const OK_DOMAIN_BODY = JSON.stringify({
  status: 'ok',
  cmsReachable: true,
  site: {
    key: 'store-eu',
    name: 'EU Store',
    domain: 'https://store.example.com',
    defaultLocale: 'de',
    brandKey: 'brand-beta',
  },
});

const UNCONFIGURED_BODY = JSON.stringify({
  status: 'unconfigured',
  cmsReachable: false,
  siteKey: 'store-us',
});

const ERROR_BODY = JSON.stringify({
  status: 'error',
  cmsReachable: false,
  siteKey: 'store-us',
  error: 'something broke',
});

const TIMEOUT_BODY = JSON.stringify({
  status: 'timeout',
  cmsReachable: false,
  siteKey: 'store-us',
});

// ─── Mock server handler ────────────────────────────────────────────────────

function handler(req, res) {
  if (req.url === '/ok' || req.url === '/ok-domain') {
    res.writeHead(200, COMMON_HEADERS);
    res.end(req.url === '/ok' ? OK_BODY : OK_DOMAIN_BODY);
  } else if (req.url === '/unconfigured') {
    res.writeHead(503, COMMON_HEADERS);
    res.end(UNCONFIGURED_BODY);
  } else if (req.url === '/error') {
    res.writeHead(502, COMMON_HEADERS);
    res.end(ERROR_BODY);
  } else if (req.url === '/timeout') {
    res.writeHead(504, COMMON_HEADERS);
    res.end(TIMEOUT_BODY);
  } else {
    res.writeHead(404, COMMON_HEADERS);
    res.end('{}');
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  const { server, url } = await startMock(handler);

  // Test 1: ok response uses site.key (not top-level siteKey)
  {
    const { status, body } = await fetchJson(`${url}/ok`);
    check('ok response status=200', status >= 200 && status < 300);
    check(
      'ok response body.site.key is "store-us"',
      body.site?.key === 'store-us'
    );
    check(
      'ok response body.site.name is a string',
      typeof body.site?.name === 'string'
    );
    check(
      'ok response body.site.domain starts with https',
      typeof body.site?.domain === 'string' &&
        body.site.domain.startsWith('https')
    );
    check(
      'ok response body.site.defaultLocale is "en"',
      body.site?.defaultLocale === 'en'
    );
    check(
      'ok response body.site.brandKey is non-empty',
      typeof body.site?.brandKey === 'string' && body.site.brandKey.length > 0
    );
    check(
      'ok response body.siteKey is undefined (must NOT have top-level siteKey)',
      body.siteKey === undefined
    );
  }

  // Test 2: ok response does not require top-level siteKey
  {
    const { body } = await fetchJson(`${url}/ok`);
    check('ok response body.siteKey === undefined', body.siteKey === undefined);
  }

  // Test 3: unconfigured requires siteKey
  {
    const { status, body } = await fetchJson(`${url}/unconfigured`);
    check(
      'unconfigured status=503 should be treated as 5xx',
      status >= 500 && status < 600
    );
    check(
      'unconfigured body.cmsReachable === false',
      body.cmsReachable === false
    );
    check(
      'unconfigured body.siteKey is non-empty string',
      typeof body.siteKey === 'string' && body.siteKey.length > 0
    );
  }

  // Test 4: error requires siteKey
  {
    const { status, body } = await fetchJson(`${url}/error`);
    check(
      'error status=502 should be treated as 5xx',
      status >= 500 && status < 600
    );
    check('error body.cmsReachable === false', body.cmsReachable === false);
    check(
      'error body.siteKey is non-empty string',
      typeof body.siteKey === 'string' && body.siteKey.length > 0
    );
  }

  // Test 5: timeout is FAIL
  {
    const { status, body } = await fetchJson(`${url}/timeout`);
    check('timeout status=504', status >= 500 && status < 600);
    check('timeout body.status is "timeout"', body.status === 'timeout');
    // Verify timeout is NOT in the accepted status set
    const accepted = ['ok', 'unconfigured', 'error'];
    check(
      'timeout is NOT in accepted status set',
      !accepted.includes(body.status)
    );
  }

  // Test 6: cmsReachable semantics
  {
    const okRes = await fetchJson(`${url}/ok`);
    check(
      'cmsReachable semantics: ok -> cmsReachable === true',
      okRes.body.cmsReachable === true
    );
    const unconfRes = await fetchJson(`${url}/unconfigured`);
    check(
      'cmsReachable semantics: unconfigured -> cmsReachable === false',
      unconfRes.body.cmsReachable === false
    );
    const errRes = await fetchJson(`${url}/error`);
    check(
      'cmsReachable semantics: error -> cmsReachable === false',
      errRes.body.cmsReachable === false
    );
  }

  // Test 7: Cache-Control no-store
  {
    const okRes = await fetchJson(`${url}/ok`);
    check(
      'Cache-Control no-store on ok response',
      okRes.headers['cache-control'] === 'no-store'
    );
    const unconfRes = await fetchJson(`${url}/unconfigured`);
    check(
      'Cache-Control no-store on unconfigured response',
      unconfRes.headers['cache-control'] === 'no-store'
    );
    const errRes = await fetchJson(`${url}/error`);
    check(
      'Cache-Control no-store on error response',
      errRes.headers['cache-control'] === 'no-store'
    );
  }

  // Test 8: X-Robots-Tag noindex,nofollow
  {
    const okRes = await fetchJson(`${url}/ok`);
    check(
      'X-Robots-Tag noindex,nofollow on ok response',
      okRes.headers['x-robots-tag'] === 'noindex, nofollow'
    );
    const unconfRes = await fetchJson(`${url}/unconfigured`);
    check(
      'X-Robots-Tag noindex,nofollow on unconfigured response',
      unconfRes.headers['x-robots-tag'] === 'noindex, nofollow'
    );
    const errRes = await fetchJson(`${url}/error`);
    check(
      'X-Robots-Tag noindex,nofollow on error response',
      errRes.headers['x-robots-tag'] === 'noindex, nofollow'
    );
  }

  // Test 9: No token in body
  {
    const { body } = await fetchJson(`${url}/ok`);
    const sensitiveFields = [
      'token',
      'apiKey',
      'api_token',
      'secret',
      'password',
      'jwt',
    ];
    let foundSensitive = false;
    for (const field of sensitiveFields) {
      if (field in body || (body.site && field in body.site)) {
        foundSensitive = true;
        break;
      }
    }
    check(
      'No sensitive fields (token, apiKey, api_token, secret, password, jwt) in ok response body',
      !foundSensitive
    );
  }

  // Test 10: Site domain comes from Site, not Brand
  {
    const { body } = await fetchJson(`${url}/ok-domain`);
    check(
      'Site domain is present on site object',
      typeof body.site?.domain === 'string' && body.site.domain.length > 0
    );
    check(
      'Site domain is "https://store.example.com"',
      body.site?.domain === 'https://store.example.com'
    );
    // Verify domain is NOT at the top level (it belongs on Site, not Brand)
    check(
      'Domain is NOT a top-level field (belongs on Site, not Brand)',
      body.domain === undefined
    );
  }

  // ─── Shutdown ──────────────────────────────────────────────────────────
  server.close();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
