/**
 * test-support-live.mjs
 * Real-CMS contract test for support articles.
 * Queries the live Strapi API to validate data integrity across locales.
 *
 * NOT for CI — requires a running CMS and valid API token.
 * Uses STRAPI_URL, STRAPI_API_TOKEN (or CMS_API_TOKEN), CMS_SITE_KEY env vars.
 *
 * IMPORTANT: Never prints secrets/tokens in any output or error messages.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Configuration (no secrets printed)
// ---------------------------------------------------------------------------

const STRAPI_URL = process.env.STRAPI_URL;
const API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.CMS_API_TOKEN;
const SITE_KEY = process.env.CMS_SITE_KEY || 'store-us';

// ---------------------------------------------------------------------------
// Validate required env vars before anything else
// ---------------------------------------------------------------------------

if (!STRAPI_URL) {
  console.error(
    'ERROR: STRAPI_URL environment variable is not set.\n' +
      '  Please set it to the CMS base URL (e.g. http://127.0.0.1:1337).\n' +
      '  See .dev.vars for local configuration.'
  );
  process.exit(1);
}

if (!API_TOKEN) {
  console.error(
    'ERROR: STRAPI_API_TOKEN (or CMS_API_TOKEN) environment variable is not set.\n' +
      '  Please set it to a valid read-only CMS API token.\n' +
      '  See .dev.vars for local configuration.'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`);
    passed++;
  } else {
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

/**
 * Fetch from the CMS API with auth headers.
 * Never prints the token in errors.
 */
async function cmsFetch(path) {
  const url = `${STRAPI_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    return res;
  } catch (err) {
    // Network/system error — no token in message
    throw new Error(`Network error fetching ${url}: ${err.message}`);
  }
}

/**
 * Helper: run a check that expects HTTP 200 and optionally inspects the JSON body.
 */
async function apiCheck(testName, path, validateFn) {
  let res;
  try {
    res = await cmsFetch(path);
  } catch (err) {
    check(testName, false, `Fetch error: ${err.message}`);
    return null;
  }

  if (!res.ok) {
    check(testName, false, `HTTP ${res.status} ${res.statusText}`);
    return null;
  }

  let body;
  try {
    body = await res.json();
  } catch (err) {
    check(testName, false, `JSON parse error: ${err.message}`);
    return null;
  }

  if (validateFn) {
    validateFn(body, testName);
  } else {
    check(testName, true, `HTTP ${res.status}`);
  }

  return body;
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

async function main() {
  // ---------------------------------------------------------------------------
  // Assertion 12: Source-code check — query strings must NOT contain
  // populate[content] or populate[tags] (must not be in support-queries.ts)
  // ---------------------------------------------------------------------------

  console.log(
    '\n--- 1. Source code: no populate[content] or populate[tags] ---'
  );

  {
    const queryPath = resolve(
      repoRoot,
      'src',
      'lib',
      'cms',
      'support-queries.ts'
    );
    if (existsSync(queryPath)) {
      const content = readFileSync(queryPath, 'utf-8');
      check(
        'support-queries.ts does NOT contain populate[content]',
        !content.includes('populate[content]')
      );
      check(
        'support-queries.ts does NOT contain populate[tags]',
        !content.includes('populate[tags]')
      );
    } else {
      check(
        'support-queries.ts exists for code check',
        false,
        'File not found'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 1. EN listing query returns 200
  // ---------------------------------------------------------------------------

  console.log('\n--- 2. EN listing ---');

  const listingPathEn =
    `/api/support-articles?` +
    `filters[site][key][$eq]=${encodeURIComponent(SITE_KEY)}` +
    `&locale=en` +
    `&status=published` +
    `&pagination[pageSize]=100` +
    `&populate[cardImage]=true` +
    `&populate[authorImage]=true` +
    `&populate[seo]=true`;

  // We'll store the listings for later assertion reuse
  let enListingBody = await apiCheck(
    'EN listing returns 200',
    listingPathEn,
    body => {
      check(
        'EN listing has data array',
        Array.isArray(body?.data),
        `data length: ${body?.data?.length ?? 'N/A'}`
      );
    }
  );

  // ---------------------------------------------------------------------------
  // 2. FR listing query returns 200
  // ---------------------------------------------------------------------------

  console.log('\n--- 3. FR listing ---');

  const listingPathFr =
    `/api/support-articles?` +
    `filters[site][key][$eq]=${encodeURIComponent(SITE_KEY)}` +
    `&locale=fr` +
    `&status=published` +
    `&pagination[pageSize]=100` +
    `&populate[cardImage]=true` +
    `&populate[authorImage]=true` +
    `&populate[seo]=true`;

  let frListingBody = await apiCheck(
    'FR listing returns 200',
    listingPathFr,
    body => {
      check(
        'FR listing has data array',
        Array.isArray(body?.data),
        `data length: ${body?.data?.length ?? 'N/A'}`
      );
    }
  );

  // ---------------------------------------------------------------------------
  // 3-6. Specific article queries by slug
  // ---------------------------------------------------------------------------

  const articleSlugs = [
    { slug: 'post-1', label: 'post-1', locales: ['en', 'fr'] },
    { slug: 'insight-1', label: 'insight-1', locales: ['en', 'fr'] },
  ];

  // Object to store article data for cross-reference checks
  const articleData = {};

  let assertionNum = 4;

  for (const { slug, label, locales } of articleSlugs) {
    for (const locale of locales) {
      console.log(
        `\n--- ${assertionNum}. ${locale.toUpperCase()} ${label} article ---`
      );
      assertionNum++;

      const articlePath =
        `/api/support-articles?` +
        `filters[site][key][$eq]=${encodeURIComponent(SITE_KEY)}` +
        `&filters[slug][$eq]=${encodeURIComponent(slug)}` +
        `&locale=${locale}` +
        `&status=published` +
        `&pagination[pageSize]=1` +
        `&populate[cardImage]=true` +
        `&populate[authorImage]=true` +
        `&populate[seo]=true`;

      const body = await apiCheck(
        `${locale.toUpperCase()} ${label} article exists`,
        articlePath,
        body => {
          const data = body?.data;
          check(
            `${locale.toUpperCase()} ${label} data is array with 1 item`,
            Array.isArray(data) && data.length === 1,
            `data length: ${Array.isArray(data) ? data.length : 'not an array'}`
          );
        }
      );

      // Store for later assertions
      if (body?.data?.[0]) {
        const key = `${slug}_${locale}`;
        articleData[key] = body.data[0];
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Article content is non-empty (not null, not empty array)
  // ---------------------------------------------------------------------------

  console.log('\n--- 8. Article content is non-empty ---');

  for (const [key, article] of Object.entries(articleData)) {
    const content = article?.content;
    const hasContent =
      content !== null &&
      content !== undefined &&
      !(Array.isArray(content) && content.length === 0);
    check(
      `${key}: content is non-empty`,
      hasContent,
      hasContent ? '' : `content: ${JSON.stringify(content)?.slice(0, 50)}`
    );
  }

  // ---------------------------------------------------------------------------
  // 8. Tags are correct type (Array.isArray)
  // ---------------------------------------------------------------------------

  console.log('\n--- 9. Tags are correct type ---');

  for (const [key, article] of Object.entries(articleData)) {
    const tags = article?.tags;
    check(
      `${key}: tags is an array or null`,
      tags === null || Array.isArray(tags),
      `type: ${typeof tags}, isArray: ${Array.isArray(tags)}`
    );
  }

  // ---------------------------------------------------------------------------
  // 9. Media is resolvable (cardImage.url and authorImage.url are strings or null)
  // ---------------------------------------------------------------------------

  console.log('\n--- 10. Media is resolvable ---');

  for (const [key, article] of Object.entries(articleData)) {
    const cardUrl = article?.cardImage?.url;
    const authorUrl = article?.authorImage?.url;
    check(
      `${key}: cardImage.url is string or null`,
      cardUrl === null || typeof cardUrl === 'string',
      `cardImage.url type: ${typeof cardUrl}`
    );
    check(
      `${key}: authorImage.url is string, null, or undefined`,
      authorUrl == null || typeof authorUrl === 'string',
      `authorImage.url type: ${typeof authorUrl}`
    );
  }

  // ---------------------------------------------------------------------------
  // 10. EN and FR post-1 have distinct documentId values (locale isolation verified)
  // ---------------------------------------------------------------------------

  console.log('\n--- 11. Locale isolation: EN vs FR documentId ---');

  const enPost1 = articleData['post-1_en'];
  const frPost1 = articleData['post-1_fr'];
  const enInsight1 = articleData['insight-1_en'];
  const frInsight1 = articleData['insight-1_fr'];

  if (enPost1 && frPost1) {
    check(
      'EN post-1 has a documentId',
      typeof enPost1.documentId === 'string' && enPost1.documentId.length > 0,
      `EN documentId: ${enPost1.documentId}`
    );
    check(
      'FR post-1 has a documentId',
      typeof frPost1.documentId === 'string' && frPost1.documentId.length > 0,
      `FR documentId: ${frPost1.documentId}`
    );
  } else {
    check(
      'EN and FR post-1 both exist for documentId check',
      false,
      'Missing one or both locale articles'
    );
  }

  if (enInsight1 && frInsight1) {
    check(
      'EN insight-1 has a documentId',
      typeof enInsight1.documentId === 'string' &&
        enInsight1.documentId.length > 0,
      `EN documentId: ${enInsight1.documentId}`
    );
    check(
      'FR insight-1 has a documentId',
      typeof frInsight1.documentId === 'string' &&
        frInsight1.documentId.length > 0,
      `FR documentId: ${frInsight1.documentId}`
    );
  }

  // Locale isolation: verify each article pair has correct locale values.
  // Strapi 5 i18n shares the same documentId across locales (by design);
  // locale isolation is verified by the distinct locale field.
  check(
    'post-1 EN locale is "en"',
    enPost1 && enPost1.locale === 'en',
    enPost1 ? `locale: ${enPost1.locale}` : 'missing article'
  );
  check(
    'post-1 FR locale is "fr"',
    frPost1 && frPost1.locale === 'fr',
    frPost1 ? `locale: ${frPost1.locale}` : 'missing article'
  );
  check(
    'insight-1 EN locale is "en"',
    enInsight1 && enInsight1.locale === 'en',
    enInsight1 ? `locale: ${enInsight1.locale}` : 'missing article'
  );
  check(
    'insight-1 FR locale is "fr"',
    frInsight1 && frInsight1.locale === 'fr',
    frInsight1 ? `locale: ${frInsight1.locale}` : 'missing article'
  );

  // Verify EN and FR locales differ for each article pair
  if (enPost1 && frPost1) {
    check(
      'post-1 has different locales for EN vs FR',
      enPost1.locale !== frPost1.locale,
      `EN: ${enPost1.locale}, FR: ${frPost1.locale}`
    );
  }
  if (enInsight1 && frInsight1) {
    check(
      'insight-1 has different locales for EN vs FR',
      enInsight1.locale !== frInsight1.locale,
      `EN: ${enInsight1.locale}, FR: ${frInsight1.locale}`
    );
  }

  // ---------------------------------------------------------------------------
  // 11. Nonexistent slug returns empty data (not API error)
  // ---------------------------------------------------------------------------

  console.log('\n--- 12. Nonexistent slug returns empty data ---');

  const nonexistentPath =
    `/api/support-articles?` +
    `filters[site][key][$eq]=${encodeURIComponent(SITE_KEY)}` +
    `&filters[slug][$eq]=nonexistent-article-xyz` +
    `&locale=en` +
    `&status=published` +
    `&pagination[pageSize]=1`;

  let res;
  try {
    res = await cmsFetch(nonexistentPath);
  } catch (err) {
    check(
      'Nonexistent slug query succeeds',
      false,
      `Fetch error: ${err.message}`
    );
  }

  if (res) {
    if (res.status === 200) {
      check('Nonexistent slug returns HTTP 200', true);
      let body;
      try {
        body = await res.json();
        check(
          'Nonexistent slug returns empty data array',
          Array.isArray(body?.data) && body.data.length === 0,
          `data: ${JSON.stringify(body?.data)?.slice(0, 100)}`
        );
      } catch (err) {
        check(
          'Nonexistent slug body is valid JSON',
          false,
          `Parse error: ${err.message}`
        );
      }
    } else {
      check(
        'Nonexistent slug returns HTTP 200',
        false,
        `Got HTTP ${res.status} ${res.statusText}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  const total = passed + failed;
  console.log(`\n${'='.repeat(50)}`);
  console.log('Support Live CMS Contract Test Results:');
  console.log(`  Checks: ${total}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nSupport live CMS tests FAILED');
    process.exit(1);
  }

  console.log('\nSupport live CMS tests PASSED');
}

main().catch(err => {
  console.error('\nFATAL: Unexpected error during test execution:');
  // Never print the raw error — it could contain tokens
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
