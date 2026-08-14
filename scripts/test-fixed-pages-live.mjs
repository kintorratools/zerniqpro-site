/**
 * test-fixed-pages-live.mjs
 * Real-CMS contract test for services-page and contact-page content.
 * Queries a live Strapi CMS at http://127.0.0.1:1337 to validate
 * data integrity across EN/FR locales.
 *
 * NOT for CI — requires a running CMS and valid API token.
 * Uses STRAPI_API_TOKEN environment variable.
 * If STRAPI_API_TOKEN is not set, skip the test.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const STRAPI_URL = process.env.STRAPI_URL || 'http://127.0.0.1:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!API_TOKEN) {
  console.log('=== test-fixed-pages-live ===');
  console.log('SKIP: STRAPI_API_TOKEN not set (non-CMS CI environment)');
  process.exit(0);
}

const SITE_KEY = process.env.CMS_SITE_KEY || 'store-us';

// ---------------------------------------------------------------------------
// Test state
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

async function cmsFetch(path) {
  const url = `${STRAPI_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  return res;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== test-fixed-pages-live ===');

  // ── (a) Services Page EN ──
  try {
    const path = `/api/services-pages?filters[site][key][$eq]=${SITE_KEY}&locale=en&status=published&pagination[pageSize]=1&populate[service1][populate][image1]=true&populate[service1][populate][image2]=true&populate[service2][populate][image1]=true&populate[service2][populate][image2]=true&populate[service3][populate][image1]=true&populate[service3][populate][image2]=true&populate[service4][populate][image1]=true&populate[service4][populate][image2]=true&populate[service5][populate][image1]=true&populate[service5][populate][image2]=true`;
    const res = await cmsFetch(path);
    if (!res.ok) {
      check('[Services EN] Page exists', false, `HTTP ${res.status}`);
    } else {
      const body = await res.json();
      const data = body?.data;
      check(
        '[Services EN] Page exists',
        Array.isArray(data) && data.length === 1
      );
      const page = data?.[0];
      if (page) {
        check(
          '[Services EN] introTitle non-empty',
          typeof page.introTitle === 'string' && page.introTitle.length > 0
        );
        check(
          '[Services EN] service1 exists',
          page.service1 && typeof page.service1.title === 'string'
        );
        check(
          '[Services EN] service5 exists',
          page.service5 && typeof page.service5.title === 'string'
        );
        check(
          '[Services EN] statsTitle matches',
          page.statsTitle === 'By the Numbers'
        );
        check(
          '[Services EN] mainStatValue matches',
          page.mainStatValue === '96%'
        );
      }
    }
  } catch (err) {
    check('[Services EN] Page exists', false, err.message);
  }

  // ── (b) Services Page FR ──
  try {
    const path = `/api/services-pages?filters[site][key][$eq]=${SITE_KEY}&locale=fr&status=published&pagination[pageSize]=1`;
    const res = await cmsFetch(path);
    if (!res.ok) {
      check('[Services FR] Page exists', false, `HTTP ${res.status}`);
    } else {
      const body = await res.json();
      const data = body?.data;
      check(
        '[Services FR] Page exists',
        Array.isArray(data) && data.length === 1
      );
      const page = data?.[0];
      if (page) {
        check('[Services FR] locale is fr', page.locale === 'fr');
        check(
          '[Services FR] introTitle non-empty',
          typeof page.introTitle === 'string' && page.introTitle.length > 0
        );
        check(
          '[Services FR] introTitle is French',
          page.introTitle.startsWith("Unir l'expertise")
        );
      }
    }
  } catch (err) {
    check('[Services FR] Page exists', false, err.message);
  }

  // ── (c) Contact Page EN ──
  try {
    const path = `/api/contact-pages?filters[site][key][$eq]=${SITE_KEY}&locale=en&status=published&pagination[pageSize]=1`;
    const res = await cmsFetch(path);
    if (!res.ok) {
      check('[Contact EN] Page exists', false, `HTTP ${res.status}`);
    } else {
      const body = await res.json();
      const data = body?.data;
      check(
        '[Contact EN] Page exists',
        Array.isArray(data) && data.length === 1
      );
      const page = data?.[0];
      if (page) {
        check('[Contact EN] title matches', page.title === 'Contact us');
        check(
          '[Contact EN] formTitle non-empty',
          typeof page.formTitle === 'string' && page.formTitle.length > 0
        );
        check(
          '[Contact EN] knowledge block exists',
          typeof page.knowledgeHeading === 'string'
        );
        check(
          '[Contact EN] office block exists',
          typeof page.officeHeading === 'string'
        );
        check(
          '[Contact EN] email block exists',
          typeof page.emailHeading === 'string'
        );
        check(
          '[Contact EN] demoMessage non-empty',
          typeof page.demoMessage === 'string' &&
            page.demoMessage.includes('Demo')
        );
      }
    }
  } catch (err) {
    check('[Contact EN] Page exists', false, err.message);
  }

  // ── (d) Contact Page FR ──
  try {
    const path = `/api/contact-pages?filters[site][key][$eq]=${SITE_KEY}&locale=fr&status=published&pagination[pageSize]=1`;
    const res = await cmsFetch(path);
    if (!res.ok) {
      check('[Contact FR] Page exists', false, `HTTP ${res.status}`);
    } else {
      const body = await res.json();
      const data = body?.data;
      check(
        '[Contact FR] Page exists',
        Array.isArray(data) && data.length === 1
      );
      const page = data?.[0];
      if (page) {
        check('[Contact FR] locale is fr', page.locale === 'fr');
        check('[Contact FR] title matches', page.title === 'Contactez-nous');
        check(
          '[Contact FR] formTitle is French',
          page.formTitle?.includes('Remplissez') || false
        );
      }
    }
  } catch (err) {
    check('[Contact FR] Page exists', false, err.message);
  }

  // ── (e) Locale isolation ──
  try {
    const enPath = `/api/services-pages?filters[site][key][$eq]=${SITE_KEY}&locale=en&status=published&pagination[pageSize]=1`;
    const frPath = `/api/services-pages?filters[site][key][$eq]=${SITE_KEY}&locale=fr&status=published&pagination[pageSize]=1`;
    const [enRes, frRes] = await Promise.all([
      cmsFetch(enPath),
      cmsFetch(frPath),
    ]);
    const enBody = await enRes.json();
    const frBody = await frRes.json();
    const enIntro = enBody.data?.[0]?.introTitle || '';
    const frIntro = frBody.data?.[0]?.introTitle || '';
    check('[Locale Isolation] EN ≠ FR introTitle', enIntro !== frIntro);
    check(
      '[Locale Isolation] FR introTitle is French',
      !frIntro.includes('Expertise') || frIntro.includes('expertise')
    );
  } catch (err) {
    check('[Locale Isolation] EN ≠ FR', false, err.message);
  }

  // ── Results ──
  console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
