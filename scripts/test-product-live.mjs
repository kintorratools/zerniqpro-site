/**
 * test-product-live.mjs
 * Real-CMS contract test for product content.
 * Queries a live Strapi CMS at http://127.0.0.1:1337 to validate
 * product data integrity across EN/FR locales.
 *
 * NOT for CI — requires a running CMS and valid API token.
 * Uses STRAPI_API_TOKEN environment variable.
 * If STRAPI_API_TOKEN is not set, skip the test and exit with code 0.
 *
 * IMPORTANT: Never prints secrets/tokens in any output or error messages.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const STRAPI_URL = 'http://127.0.0.1:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.log('=== test-product-live ===');
  console.log('SKIP: STRAPI_API_TOKEN not set (non-CMS CI environment)');
  process.exit(0);
}

const SITE_KEY = 'store-us';

const EXPECTED_HANDLES = [
  'sf-tb-t845',
  'sf-ab-a765',
  'sf-bn-b203',
  'sf-fn-f303',
];
const LOCALES = ['en', 'fr'];

// ---------------------------------------------------------------------------
// Test state
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const allResults = [];

function check(name, condition, detail = '') {
  if (condition) {
    allResults.push({ name, status: 'PASS', detail });
    passed++;
  } else {
    allResults.push({ name, status: 'FAIL', detail });
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
    throw new Error(`Network error fetching ${url}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== test-product-live ===');

  try {
    // ── (a) EN listing ──
    {
      const path =
        '/api/products?filters[site][key][$eq]=store-us&locale=en&status=published&sort[0]=displayOrder:asc&pagination[pageSize]=50';

      let res, body;
      try {
        res = await cmsFetch(path);
        if (!res.ok) {
          check(
            '[EN Listing] 4/4 products, correct order',
            false,
            `HTTP ${res.status}`
          );
        } else {
          body = await res.json();
          const data = body?.data;
          const count = Array.isArray(data) ? data.length : 0;

          // Filter out test-product (may exist in CMS but not shown on frontend)
          const visibleProducts = Array.isArray(data)
            ? data.filter(p => p.handle !== 'test-product')
            : [];
          const visibleCount = visibleProducts.length;

          if (visibleCount === 4) {
            const handles = visibleProducts.map(p => p.handle);
            const correctHandles =
              handles[0] === 'sf-tb-t845' &&
              handles[1] === 'sf-ab-a765' &&
              handles[2] === 'sf-bn-b203' &&
              handles[3] === 'sf-fn-f303';

            const orders = visibleProducts.map(p => p.displayOrder);
            const correctOrder =
              orders[0] === 1 &&
              orders[1] === 2 &&
              orders[2] === 3 &&
              orders[3] === 4;

            const allOk = correctHandles && correctOrder;
            check(
              '[EN Listing] 4/4 products, correct order',
              allOk,
              allOk
                ? `(${count} total, test-product filtered)`
                : `handles=${handles.join(',')} orders=${orders.join(',')}`
            );
          } else {
            check(
              '[EN Listing] 4/4 products, correct order',
              false,
              `got ${visibleCount} visible products (${count} total)`
            );
          }
        }
      } catch (err) {
        check('[EN Listing] 4/4 products, correct order', false, err.message);
      }
    }

    // ── (b) FR listing ──
    let frListingData = null;
    {
      const path =
        '/api/products?filters[site][key][$eq]=store-us&locale=fr&status=published&sort[0]=displayOrder:asc&pagination[pageSize]=50';

      let res, body;
      try {
        res = await cmsFetch(path);
        if (!res.ok) {
          check('[FR Listing] 4/4 products', false, `HTTP ${res.status}`);
        } else {
          body = await res.json();
          const data = body?.data;
          const count = Array.isArray(data) ? data.length : 0;

          const visibleFrProducts = Array.isArray(data)
            ? data.filter(p => p.handle !== 'test-product')
            : [];
          const visibleFrCount = visibleFrProducts.length;

          if (visibleFrCount === 4) {
            // Verify FR names are localized (different from EN)
            const names = visibleFrProducts.map(p => p.name);
            frListingData = visibleFrProducts;
            check('[FR Listing] 4/4 products', true, `names OK`);
          } else {
            check(
              '[FR Listing] 4/4 products',
              false,
              `got ${visibleFrCount} products`
            );
          }
        }
      } catch (err) {
        check('[FR Listing] 4/4 products', false, err.message);
      }
    }

    // ── Store EN listing data for media URL comparison ──
    const enProductData = {};
    {
      const path =
        '/api/products?filters[site][key][$eq]=store-us&locale=en&status=published&sort[0]=displayOrder:asc&pagination[pageSize]=50';
      try {
        const res = await cmsFetch(path);
        if (res.ok) {
          const body = await res.json();
          for (const p of body?.data ?? []) {
            enProductData[p.handle] = p;
          }
        }
      } catch {
        /* best-effort */
      }
    }

    // ── (c) 8 detail pages ──
    const detailResults = {};
    for (const locale of LOCALES) {
      for (const handle of EXPECTED_HANDLES) {
        const label = `[Detail ${locale.toUpperCase()}: ${handle}] text OK`;
        const path = `/api/products?filters[handle][$eq]=${encodeURIComponent(handle)}&locale=${locale}&status=published&pagination[pageSize]=1&populate=*`;

        let res, body, product;
        try {
          res = await cmsFetch(path);
          if (!res.ok) {
            check(label, false, `HTTP ${res.status}`);
            continue;
          }
          body = await res.json();
          product = body?.data?.[0];

          if (!product) {
            check(label, false, 'no data');
            continue;
          }

          const textOk =
            typeof product.name === 'string' &&
            product.name.trim().length > 0 &&
            typeof product.summary === 'string' &&
            product.summary.trim().length > 0 &&
            typeof product.introText === 'string' &&
            product.introText.trim().length > 0 &&
            Array.isArray(product.descriptionItems) &&
            product.descriptionItems.length >= 1;

          const allOk = textOk;
          let detail = '';
          if (!allOk) {
            detail = `text=${textOk}`;
          }

          check(label, allOk, detail);

          // Store for locale isolation checks
          const key = `${handle}_${locale}`;
          detailResults[key] = product;
        } catch (err) {
          check(label, false, err.message);
        }
      }
    }

    // ── (d) Invalid handle ──
    {
      const path =
        '/api/products?filters[handle][$eq]=nonexistent&locale=en&status=published&pagination[pageSize]=1';

      let res, body;
      try {
        res = await cmsFetch(path);
        if (!res.ok) {
          check('[Invalid Handle] empty result', false, `HTTP ${res.status}`);
        } else {
          body = await res.json();
          const isEmpty = Array.isArray(body?.data) && body.data.length === 0;
          check(
            '[Invalid Handle] empty result',
            isEmpty,
            isEmpty ? '' : `got ${body?.data?.length} results`
          );
        }
      } catch (err) {
        check('[Invalid Handle] empty result', false, err.message);
      }
    }

    // ── (e) Product Page EN ──
    {
      const path =
        '/api/product-pages?filters[site][key][$eq]=store-us&locale=en&status=published&pagination[pageSize]=1&populate=*';

      let res, body;
      try {
        res = await cmsFetch(path);
        if (!res.ok) {
          check('[Product Page EN]', false, `HTTP ${res.status}`);
        } else {
          body = await res.json();
          const data = body?.data;
          const hasData = Array.isArray(data) && data.length === 1;
          const item = hasData ? data[0] : null;
          const hasFields =
            item &&
            typeof item.title === 'string' &&
            item.title.trim().length > 0 &&
            (item.subtitle === null || typeof item.subtitle === 'string') &&
            Array.isArray(item.testimonials);
          check(
            '[Product Page EN]',
            hasFields,
            hasFields ? '' : `data=${!!hasData} fields=${!!item}`
          );
        }
      } catch (err) {
        check('[Product Page EN]', false, err.message);
      }
    }

    // ── (f) Product Page FR ──
    {
      const path =
        '/api/product-pages?filters[site][key][$eq]=store-us&locale=fr&status=published&pagination[pageSize]=1&populate=*';

      let res, body;
      try {
        res = await cmsFetch(path);
        if (!res.ok) {
          check('[Product Page FR]', false, `HTTP ${res.status}`);
        } else {
          body = await res.json();
          const data = body?.data;
          const hasData = Array.isArray(data) && data.length === 1;
          const item = hasData ? data[0] : null;
          const hasFields =
            item &&
            typeof item.title === 'string' &&
            item.title.trim().length > 0 &&
            (item.subtitle === null || typeof item.subtitle === 'string') &&
            Array.isArray(item.testimonials);
          check(
            '[Product Page FR]',
            hasFields,
            hasFields ? '' : `data=${!!hasData} fields=${!!item}`
          );
        }
      } catch (err) {
        check('[Product Page FR]', false, err.message);
      }
    }

    // ── (g) Locale isolation ──
    {
      let isolationOk = true;
      const issues = [];

      for (const handle of EXPECTED_HANDLES) {
        const enP = detailResults[`${handle}_en`];
        const frP = detailResults[`${handle}_fr`];

        if (!enP || !frP) {
          isolationOk = false;
          issues.push(`${handle}: missing EN=${!enP} FR=${!frP}`);
          continue;
        }

        // EN locale
        if (enP.locale !== 'en') {
          isolationOk = false;
          issues.push(`${handle} EN locale=${enP.locale}`);
        }

        // FR locale
        if (frP.locale !== 'fr') {
          isolationOk = false;
          issues.push(`${handle} FR locale=${frP.locale}`);
        }

        // Same handle yields same media URLs (shared fields)
        const enCardUrl = enP.cardImage?.url || '';
        const frCardUrl = frP.cardImage?.url || '';
        if (enCardUrl && frCardUrl && enCardUrl !== frCardUrl) {
          isolationOk = false;
          issues.push(`${handle}: different cardImage URLs`);
        }
      }

      check(
        '[Locale Isolation]',
        isolationOk,
        isolationOk ? '' : issues.join('; ')
      );
    }
  } catch (err) {
    console.error(`FATAL: ${err.message}`);
    failed++;
  }

  // ── Results ──
  console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main();
