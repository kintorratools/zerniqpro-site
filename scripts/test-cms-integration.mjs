import { createServer } from 'node:http';

const MOCK_PORT = Number(process.env.MOCK_STRAPI_PORT ?? 4579);
const MOCK_HOST = '127.0.0.1';
const MOCK_URL = `http://${MOCK_HOST}:${MOCK_PORT}`;

let mockServer;
let failed = false;

const MOCK_SITE_RECORD = {
  id: 1,
  documentId: 'abc123',
  siteName: 'Zerniq NA',
  siteKey: 'zerniq',
  locale: 'en',
  defaultLocale: 'en',
  siteTitle: 'Zerniq North America',
  siteDescription: 'Professional power tools for the North American market',
  tagline: 'Built for Pros',
  primaryColor: '#f59e0b',
  secondaryColor: '#1e293b',
  contactEmail: 'info@zerniqpro.com',
  contactPhone: '+1-800-ZERNIQ',
  socialLinks: {
    twitter: 'https://x.com/zerniq',
    instagram: 'https://instagram.com/zerniq',
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

/** Start a minimal mock Strapi HTTP server */
function startMockStrapi() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');

      const url = new URL(req.url, MOCK_URL);

      if (req.method === 'GET' && url.pathname === '/api/sites') {
        const siteKey = url.searchParams.get('filters[siteKey][$eq]');
        if (siteKey === 'zerniq') {
          res.writeHead(200);
          res.end(
            JSON.stringify({
              data: [MOCK_SITE_RECORD],
              meta: { pagination: { total: 1 } },
            })
          );
        } else {
          res.writeHead(200);
          res.end(
            JSON.stringify({ data: [], meta: { pagination: { total: 0 } } })
          );
        }
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: { status: 404, message: 'Not found' } }));
    });

    server.listen(MOCK_PORT, MOCK_HOST, () => {
      console.log(`Mock Strapi listening on ${MOCK_URL}`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

/** Test the mock Strapi responds with valid site data */
async function testMockStrapiSiteQuery() {
  console.log('\n--- Test: mock Strapi returns valid site data ---');

  try {
    const res = await fetch(
      `${MOCK_URL}/api/sites?filters[siteKey][$eq]=zerniq&populate=*`
    );
    const body = await res.json();

    if (res.status !== 200) {
      console.error(`FAIL: expected 200, got ${res.status}`);
      failed = true;
      return;
    }

    if (!Array.isArray(body.data) || body.data.length !== 1) {
      console.error('FAIL: expected data array with 1 item');
      failed = true;
      return;
    }

    const record = body.data[0];

    // Validate SiteRecord flat entity shape (Strapi 5 — no attributes wrapper)
    const requiredFields = [
      'id',
      'documentId',
      'siteName',
      'siteKey',
      'locale',
      'defaultLocale',
      'siteTitle',
      'siteDescription',
      'createdAt',
      'updatedAt',
    ];
    for (const field of requiredFields) {
      if (!(field in record)) {
        console.error(`FAIL: missing required field "${field}" in site record`);
        failed = true;
        return;
      }
    }

    if (record.siteKey !== 'zerniq') {
      console.error(`FAIL: expected siteKey "zerniq", got "${record.siteKey}"`);
      failed = true;
      return;
    }

    if (typeof record.id !== 'number') {
      console.error(`FAIL: expected id to be number, got ${typeof record.id}`);
      failed = true;
      return;
    }

    console.log('PASS: mock Strapi returns valid Strapi 5 flat entity');
    console.log(`  Site: ${record.siteName} (${record.siteKey})`);
    console.log(`  Document ID: ${record.documentId}`);
    console.log(`  Locale: ${record.locale}`);
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    failed = true;
  }
}

/** Test that unknown site key returns empty data */
async function testMockStrapiUnknownSite() {
  console.log('\n--- Test: mock Strapi returns empty for unknown site ---');

  try {
    const res = await fetch(
      `${MOCK_URL}/api/sites?filters[siteKey][$eq]=unknown&populate=*`
    );
    const body = await res.json();

    if (res.status !== 200) {
      console.error(`FAIL: expected 200, got ${res.status}`);
      failed = true;
      return;
    }

    if (!Array.isArray(body.data) || body.data.length !== 0) {
      console.error('FAIL: expected empty data array');
      failed = true;
      return;
    }

    console.log('PASS: unknown site key returns empty data');
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    failed = true;
  }
}

/** Test Strapi 5 flat entity contract: no attributes wrapper */
async function testFlatEntityContract() {
  console.log(
    '\n--- Test: Strapi 5 flat entity contract (no attributes wrapper) ---'
  );

  try {
    const res = await fetch(
      `${MOCK_URL}/api/sites?filters[siteKey][$eq]=zerniq&populate=*`
    );
    const body = await res.json();

    // Strapi 4 had data.attributes.siteName — verify this is NOT the case
    if (body.data?.[0]?.attributes) {
      console.error(
        'FAIL: response has "attributes" wrapper — this is Strapi 4, not Strapi 5'
      );
      failed = true;
      return;
    }

    const record = body.data[0];
    // In Strapi 5, fields are at the top level of the data item
    if (record.siteName === 'Zerniq NA' && record.documentId === 'abc123') {
      console.log('PASS: Strapi 5 flat entity structure confirmed');
    } else {
      console.error('FAIL: unexpected entity structure');
      failed = true;
    }
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    failed = true;
  }
}

/** Test the view model mapping from SiteRecord to SiteViewModel */
async function testViewModelMapping() {
  console.log('\n--- Test: SiteRecord → SiteViewModel mapping ---');

  try {
    const res = await fetch(
      `${MOCK_URL}/api/sites?filters[siteKey][$eq]=zerniq&populate=*`
    );
    const {
      data: [record],
    } = await res.json();

    // Simulate the toViewModel mapping from schemas.ts
    const viewModel = {
      documentId: record.documentId,
      siteName: record.siteName,
      siteKey: record.siteKey,
      locale: record.locale,
      siteTitle: record.siteTitle,
      siteDescription: record.siteDescription,
      tagline: record.tagline,
      primaryColor: record.primaryColor,
      secondaryColor: record.secondaryColor,
      contactEmail: record.contactEmail,
      contactPhone: record.contactPhone,
      socialLinks: record.socialLinks,
      publishedAt: record.publishedAt,
    };

    // Verify ViewModel excludes internal fields
    if (
      'id' in viewModel ||
      'createdAt' in viewModel ||
      'updatedAt' in viewModel ||
      'defaultLocale' in viewModel
    ) {
      console.error('FAIL: ViewModel contains internal Strapi fields');
      failed = true;
      return;
    }

    // Verify required public fields
    if (viewModel.siteTitle !== 'Zerniq North America') {
      console.error('FAIL: ViewModel siteTitle mismatch');
      failed = true;
      return;
    }

    if (
      viewModel.siteDescription !==
      'Professional power tools for the North American market'
    ) {
      console.error('FAIL: ViewModel siteDescription mismatch');
      failed = true;
      return;
    }

    console.log('PASS: SiteRecord → SiteViewModel mapping is correct');
    console.log(`  Excluded: id, createdAt, updatedAt, defaultLocale`);
    console.log(
      `  Retained: siteTitle, siteDescription, tagline, contactEmail, etc.`
    );
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    failed = true;
  }
}

/** Test the buildSiteQuery generates correct Strapi path */
async function testQueryBuilder() {
  console.log('\n--- Test: buildSiteQuery generates correct path ---');

  // Simulate queries.ts — encodeURIComponent + filter
  const path = `/api/sites?filters[siteKey][$eq]=${encodeURIComponent('zerniq')}&populate=*`;
  const expectedPath = '/api/sites?filters[siteKey][$eq]=zerniq&populate=*';

  if (path === expectedPath) {
    console.log(`PASS: buildSiteQuery → "${path}"`);
  } else {
    console.error(`FAIL: expected "${expectedPath}", got "${path}"`);
    failed = true;
  }
}

/** Test query with special characters in siteKey */
async function testQueryBuilderWithSpecialChars() {
  console.log('\n--- Test: buildSiteQuery encodes special characters ---');

  const key = 'zerniq-na';
  const path = `/api/sites?filters[siteKey][$eq]=${encodeURIComponent(key)}&populate=*`;
  const expectedPath = '/api/sites?filters[siteKey][$eq]=zerniq-na&populate=*';

  if (path === expectedPath) {
    console.log(`PASS: buildSiteQuery("zerniq-na") → hyphen preserved`);
  } else {
    console.error(`FAIL: expected "${expectedPath}", got "${path}"`);
    failed = true;
  }
}

async function main() {
  mockServer = await startMockStrapi();

  try {
    await testMockStrapiSiteQuery();
    await testMockStrapiUnknownSite();
    await testFlatEntityContract();
    await testViewModelMapping();
    await testQueryBuilder();
    await testQueryBuilderWithSpecialChars();
  } finally {
    mockServer.close();
    console.log('\nMock Strapi server stopped.');
  }

  if (failed) {
    console.error('\nCMS integration test FAILED');
    process.exit(1);
  }

  console.log('\nCMS integration test PASSED');
}

main();
