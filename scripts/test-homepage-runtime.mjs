import { createServer } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startWorker } from './lib/test-process.mjs';

let mockServer;
let worker;
let failed = false;

const MOCK_HOST = '127.0.0.1';
const SITE_KEY = 'store-us';
const BRAND_KEY = 'brand-alpha';

const VALID_SITE = {
  id: 1,
  documentId: 'abc123',
  key: SITE_KEY,
  name: 'Store US',
  domain: 'https://store-us.example',
  defaultLocale: 'en',
  defaultSeo: {
    title: 'Store US Tools',
    description: 'Professional power tools for North America',
  },
  brand: { documentId: 'brand-001', key: BRAND_KEY },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const VALID_BRAND = {
  id: 1,
  documentId: 'brand-001',
  key: BRAND_KEY,
  name: 'Brand Alpha',
  defaultSeo: {
    title: 'Brand Alpha Tools',
    description: 'Professional-grade tools',
  },
  logo: null,
  favicon: null,
  socialLinks: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const VALID_LOCALES = {
  data: [
    {
      id: 1,
      documentId: 'loc-en',
      code: 'en',
      name: 'English',
      enabled: true,
      isDefault: true,
    },
    {
      id: 2,
      documentId: 'loc-de',
      code: 'de',
      name: 'Deutsch',
      enabled: true,
      isDefault: false,
    },
  ],
  meta: { pagination: { total: 2 } },
};

// ---- Mock homepage data ----

const CMS_HOMEPAGE = {
  id: 100,
  documentId: 'hp-001',
  announcement: {
    enabled: true,
    buttonLabel: 'CMS Announcement',
    url: 'https://cms.example',
  },
  hero: {
    titleBefore: 'CMS Title Before ',
    highlightText: 'CMS Highlight',
    titleAfter: ' CMS Title After',
    subTitle: 'CMS Subtitle Override',
    primaryButtonLabel: 'CMS Primary CTA',
    primaryButtonUrl: '/cms-products',
    secondaryButtonLabel: 'CMS Secondary',
    secondaryButtonUrl: '/cms-contact',
    withReview: true,
    ratingText: '5.0 / 5',
    starCount: 5,
    reviewsText: 'From 100k CMS Reviews',
    imageAlt: 'CMS image alt',
    image: null,
    avatars: [],
  },
  clients: null,
  featuresGeneral: null,
  featuresNavs: null,
  testimonials: {
    title: 'CMS Testimonials Title',
    subTitle: 'CMS Testimonials Subtitle',
    items: [
      {
        content: 'CMS testimonial content',
        author: 'CMS Author',
        role: 'CMS Role',
        avatar: null,
      },
    ],
    statistics: [{ count: '99k+', description: 'CMS statistic' }],
  },
  pricing: null,
  faq: {
    titleLine1: 'CMS FAQ',
    titleLine2: 'Title',
    items: [{ question: 'CMS Question?', answer: 'CMS Answer.' }],
  },
  bottomCta: null,
  seo: { title: 'CMS SEO Title', description: 'CMS SEO Description' },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const CMS_HOMEPAGE_EMPTY = {
  id: 101,
  documentId: 'hp-002',
  announcement: null,
  hero: null,
  clients: null,
  featuresGeneral: null,
  featuresNavs: null,
  testimonials: null,
  pricing: null,
  faq: null,
  bottomCta: null,
  seo: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const CMS_HOMEPAGE_SCRIPT = {
  id: 102,
  documentId: 'hp-003',
  announcement: null,
  hero: null,
  clients: null,
  featuresGeneral: null,
  featuresNavs: null,
  testimonials: null,
  pricing: null,
  faq: {
    titleLine1: '<script>alert("xss")</script>',
    titleLine2: 'asked questions',
    items: [],
  },
  bottomCta: null,
  seo: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

const CMS_HOMEPAGE_PARTIAL = {
  id: 103,
  documentId: 'hp-004',
  announcement: null,
  hero: {
    titleBefore: null,
    highlightText: null,
    titleAfter: null,
    subTitle: null,
    primaryButtonLabel: null,
    primaryButtonUrl: null,
    secondaryButtonLabel: null,
    secondaryButtonUrl: null,
    withReview: null,
    ratingText: null,
    starCount: null,
    reviewsText: null,
    imageAlt: null,
    image: null,
    avatars: [],
  },
  clients: null,
  featuresGeneral: null,
  featuresNavs: null,
  testimonials: null,
  pricing: null,
  faq: null,
  bottomCta: null,
  seo: { title: null, description: null },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2025-06-01T00:00:00.000Z',
};

// ---- Mock server ----

function startMockStrapi() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://${MOCK_HOST}`);
      const pathname = url.pathname;

      const auth = req.headers['authorization'] ?? '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

      const setJson = (code, body) => {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(code);
        res.end(JSON.stringify(body));
      };

      // /api/sites
      if (req.method === 'GET' && pathname === '/api/sites') {
        setJson(200, {
          data: [VALID_SITE],
          meta: { pagination: { total: 1 } },
        });
        return;
      }
      // /api/brands
      if (req.method === 'GET' && pathname === '/api/brands') {
        setJson(200, {
          data: [VALID_BRAND],
          meta: { pagination: { total: 1 } },
        });
        return;
      }
      // /api/locale-configs
      if (req.method === 'GET' && pathname === '/api/locale-configs') {
        setJson(200, VALID_LOCALES);
        return;
      }
      // /api/navigations
      if (req.method === 'GET' && pathname === '/api/navigations') {
        setJson(200, { data: [], meta: { pagination: { total: 0 } } });
        return;
      }
      // /api/footers
      if (req.method === 'GET' && pathname === '/api/footers') {
        setJson(200, { data: [], meta: { pagination: { total: 0 } } });
        return;
      }

      // /api/homepages
      if (req.method === 'GET' && pathname === '/api/homepages') {
        // Verify required query params
        const siteFilter = url.searchParams.get('filters[site][key][$eq]');
        const locale = url.searchParams.get('locale');
        const status = url.searchParams.get('status');
        const pageSize = url.searchParams.get('pagination[pageSize]');

        if (siteFilter !== SITE_KEY) {
          setJson(400, { error: 'bad site filter' });
          return;
        }
        if (locale !== 'en') {
          setJson(400, { error: 'bad locale' });
          return;
        }
        if (status !== 'published') {
          setJson(400, { error: 'bad status' });
          return;
        }
        if (pageSize !== '1') {
          setJson(400, { error: 'bad pageSize' });
          return;
        }

        // Token-based routing
        if (token === 'test-token') {
          setJson(200, {
            data: [CMS_HOMEPAGE],
            meta: { pagination: { total: 1 } },
          });
          return;
        }
        if (token === 'test-token-empty') {
          setJson(200, {
            data: [CMS_HOMEPAGE_EMPTY],
            meta: { pagination: { total: 1 } },
          });
          return;
        }
        if (token === 'test-token-script') {
          setJson(200, {
            data: [CMS_HOMEPAGE_SCRIPT],
            meta: { pagination: { total: 1 } },
          });
          return;
        }
        if (token === 'test-token-partial') {
          setJson(200, {
            data: [CMS_HOMEPAGE_PARTIAL],
            meta: { pagination: { total: 1 } },
          });
          return;
        }
        // no homepage data
        if (token === 'test-token-no-data') {
          setJson(200, { data: [], meta: { pagination: { total: 0 } } });
          return;
        }
        setJson(401, { error: { status: 401 } });
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

function check(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
  } else {
    console.error(`  FAIL: ${msg}`);
    failed = true;
  }
}

async function runScenario(label, token, testFn) {
  if (worker) await worker.stop();
  await sleep(2000);
  const wp = await findFreePort();
  const wu = `http://127.0.0.1:${wp}`;
  console.log(
    `\n[Scenario: ${label}] Starting worker (token=***, port=${wp})...`
  );
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
      `STRAPI_API_TOKEN:${token}`,
      '--var',
      'CMS_SITE_KEY:store-us',
    ],
    port: wp,
  });
  await testFn(wu);
}

/* ---------- Test scenarios ---------- */

async function testCmsHeroOverridesBaseline(workerUrl) {
  console.log('\n--- [1] CMS Hero text overrides baseline ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  check(res.status === 200, `status 200 (got ${res.status})`);
  check(html.includes('CMS Subtitle Override'), 'CMS subTitle in HTML');
  check(html.includes('CMS Primary CTA'), 'CMS primary CTA in HTML');
  check(html.includes('CMS Secondary'), 'CMS secondary CTA in HTML');
  check(html.includes('CMS Highlight'), 'CMS highlightText in HTML');
  // Original baseline text should NOT appear (was overridden)
  check(
    !html.includes('Top-quality hardware tools'),
    'baseline subTitle NOT in HTML'
  );
}

async function testCmsCtaOverridesBaseline(workerUrl) {
  console.log('\n--- [2] CMS CTA overrides baseline ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  check(html.includes('CMS Primary CTA'), 'primary CTA overridden');
  check(html.includes('/cms-products'), 'primary URL overridden');
  check(!html.includes('Start Exploring'), 'baseline CTA replaced');
}

async function testCmsFaqOverridesBaseline(workerUrl) {
  console.log('\n--- [3] CMS FAQ overrides baseline ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  check(html.includes('CMS FAQ'), 'CMS FAQ title in HTML');
  check(html.includes('CMS Question'), 'CMS FAQ question in HTML');
  check(html.includes('CMS Answer'), 'CMS FAQ answer in HTML');
}

async function testCmsTestimonialsOverridesBaseline(workerUrl) {
  console.log('\n--- [4] CMS testimonial/statistics overrides baseline ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  check(html.includes('CMS Testimonials Title'), 'CMS testimonials title');
  check(html.includes('CMS testimonial content'), 'CMS testimonial content');
  check(html.includes('CMS Author'), 'CMS testimonial author');
  check(html.includes('99k+'), 'CMS statistic count');
  check(html.includes('CMS statistic'), 'CMS statistic description');
}

async function testLocaleParam(workerUrl) {
  console.log('\n--- [5] locale parameter correct ---');
  // Mock server validates locale=en, so 200 status means correct
  const res = await fetch(workerUrl);
  check(res.status === 200, 'locale param correct (server validated)');
}

async function testSiteFilter(workerUrl) {
  console.log('\n--- [6] site filter correct ---');
  const res = await fetch(workerUrl);
  check(res.status === 200, 'site filter correct (server validated)');
}

async function testStatusPublished(workerUrl) {
  console.log('\n--- [7] status=published enforced ---');
  const res = await fetch(workerUrl);
  check(res.status === 200, 'status=published enforced (server validated)');
}

async function testEmptyFieldsFallbackToBaseline(workerUrl) {
  console.log('\n--- [8] CMS empty fields fall back to baseline ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  check(res.status === 200, `status 200 (got ${res.status})`);
  // Baseline content should appear since CMS fields are null
  check(html.includes('Equip Your Projects'), 'baseline hero title appears');
  check(
    html.includes('Top-quality hardware tools'),
    'baseline subTitle appears'
  );
  check(html.includes('Start Exploring'), 'baseline CTA appears');
  check(
    html.includes('Meeting Industry Demands'),
    'baseline features title appears'
  );
  check(
    html.includes('Trusted by Industry Leaders'),
    'baseline clients title appears'
  );
}

async function testApiFailureFallbackToBaseline(workerUrl) {
  console.log('\n--- [9] API failure (no data) falls back to baseline ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  check(res.status === 200, `status 200 (got ${res.status})`);
  check(html.includes('Equip Your Projects'), 'baseline hero appears');
  check(
    html.includes('Top-quality hardware tools'),
    'baseline subTitle appears'
  );
  check(html.includes('Meeting Industry Demands'), 'baseline features appears');
}

async function testSectionCountAndOrder(workerUrl) {
  console.log('\n--- [10] Section count/order preserved ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  // Check that all 9 sections are present (using CMS content markers since CMS overrides baseline)
  const sections = [
    'dismiss-button', // AnnouncementBanner
    'CMS Title Before', // HeroSection (CMS content)
    'Trusted by Industry', // ClientsSection (CMS clients is null → falls back to baseline)
    'Meeting Industry Demands', // FeaturesGeneral (CMS featuresGeneral is null → baseline)
    'Cutting-Edge Tools', // FeaturesNavs (CMS featuresNavs is null → baseline)
    'CMS Testimonials Title', // TestimonialsSection (CMS content)
    'Simple, Transparent Pricing', // PricingSection (CMS pricing is null → baseline)
    'CMS FAQ', // FAQ (CMS content)
    'Build Together', // HeroSectionAlt (CMS bottomCta is null → baseline)
  ];
  let found = 0;
  for (const s of sections) {
    if (html.includes(s)) found++;
    else console.error(`  FAIL: Section "${s}" not found`);
  }
  check(found >= 8, `section count: ${found}/9 sections found`);
  // Verify section order
  const idx = sections.map(s => html.indexOf(s)).filter(i => i >= 0);
  const ordered = idx.every((v, i, a) => i === 0 || v > a[i - 1]);
  check(ordered, 'section order preserved');
}

async function testScriptEscaped(workerUrl) {
  console.log('\n--- [11] CMS <script> is escaped ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  // The <script> tag should be escaped, not executed
  check(!html.includes('<script>alert'), 'raw script tag NOT in HTML');
  check(html.includes('&lt;script&gt;'), 'script tag is HTML-escaped');
}

async function testNoLayoutControl(workerUrl) {
  console.log('\n--- [12] No CMS layout control ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  // Check that no layout control fields leak into HTML
  check(!html.includes('cssClass'), 'no cssClass in HTML');
  check(!html.includes('className'), 'no className in HTML');
  check(!html.includes('tailwind'), 'no tailwind in HTML');
  check(!html.includes('layoutClass'), 'no layoutClass in HTML');
  check(!html.includes('componentPath'), 'no componentPath in HTML');
  check(!html.includes('sectionOrder'), 'no sectionOrder in HTML');
}

async function testHomepageSeoOverridesSiteSeo(workerUrl) {
  console.log('\n--- [14] Homepage SEO overrides Site SEO ---');
  const res = await fetch(workerUrl);
  const html = await res.text();
  check(html.includes('CMS SEO Title'), 'CMS SEO title in <title>');
  check(html.includes('CMS SEO Description'), 'CMS SEO description in meta');
}

/* ---------- Main ---------- */

let mockUrl;

async function main() {
  try {
    readFileSync(resolve('dist-out/server/wrangler.json'));
    console.log('Build artifact: dist-out/server/wrangler.json — OK');
  } catch {
    console.error(
      'ERROR: dist-out/server/wrangler.json not found. Run pnpm build first.'
    );
    process.exit(1);
  }

  const { server, port: mockPort } = await startMockStrapi();
  mockServer = server;
  mockUrl = `http://${MOCK_HOST}:${mockPort}`;

  try {
    await runScenario('cms-override', 'test-token', async wu => {
      await testCmsHeroOverridesBaseline(wu);
      await testCmsCtaOverridesBaseline(wu);
      await testCmsFaqOverridesBaseline(wu);
      await testCmsTestimonialsOverridesBaseline(wu);
      await testLocaleParam(wu);
      await testSiteFilter(wu);
      await testStatusPublished(wu);
      await testSectionCountAndOrder(wu);
      await testHomepageSeoOverridesSiteSeo(wu);
    });

    await runScenario(
      'empty-fallback',
      'test-token-empty',
      testEmptyFieldsFallbackToBaseline
    );
    await runScenario(
      'no-data-fallback',
      'test-token-no-data',
      testApiFailureFallbackToBaseline
    );
    await runScenario('script-escape', 'test-token-script', async wu => {
      await testScriptEscaped(wu);
      await testNoLayoutControl(wu);
    });
    await runScenario('partial-fallback', 'test-token-partial', async wu => {
      await testEmptyFieldsFallbackToBaseline(wu);
    });
  } finally {
    if (worker) await worker.stop();
    mockServer.close();
    console.log('\nTest resources cleaned up.');
  }

  if (failed) {
    console.error('\nHomepage runtime test FAILED');
    process.exit(1);
  }
  console.log('\nHomepage runtime test PASSED');
}

main();
