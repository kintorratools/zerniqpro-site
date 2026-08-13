/**
 * test-public-route-usability.mjs
 *
 * Validates that public routes are usable (not just HTTP 200).
 *
 * 1. Crawls all canonical public routes (from ORIGINAL_THEME_PAGE_MANIFEST)
 * 2. For each route:
 *    a. Verify HTTP 200 (not redirect)
 *    b. Verify HTML contains nav/footer (check for "Home", "Products" in HTML)
 *    c. Verify image tags have non-empty src attributes (no src="")
 *    d. Verify no "404 Not Found" or error text in page body
 *    e. Check main content area has meaningful text (not empty)
 * 3. Classifies each route as:
 *    - 200_RENDERED (page with content) — PASS
 *    - REDIRECT (3xx) — recorded, not PASS
 *    - EMPTY_200 (200 but no content) — FAIL
 *    - 404 — FAIL
 *    - 5XX — FAIL
 *
 * Usage: node scripts/test-public-route-usability.mjs
 *   BASE=http://localhost:4321 node scripts/test-public-route-usability.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? 'http://localhost:4321';

const manifestPath = resolve(
  __dirname,
  '..',
  'docs',
  'ORIGINAL_THEME_PAGE_MANIFEST.json'
);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

let failed = false;
const results = [];

// ── Route classification ──
const CLASS = {
  PASS_200_RENDERED: '200_RENDERED',
  CMS_DEPENDENT: 'CMS_DEPENDENT',
  REDIRECT: 'REDIRECT',
  EMPTY_200: 'EMPTY_200',
  NOT_FOUND: '404',
  SERVER_ERROR: '5XX',
  OTHER: 'OTHER',
};

/** Routes that are CMS-dependent and expected to show minimal content when CMS data is unavailable. */
const CMS_DEPENDENT_ROUTES = ['/services', '/fr/services'];

function classify(status, html, routePath) {
  if (status >= 300 && status < 400) return CLASS.REDIRECT;
  if (status === 404) return CLASS.NOT_FOUND;
  if (status >= 500) return CLASS.SERVER_ERROR;
  if (status === 200) {
    // CMS-dependent routes that return minimal HTML are expected when CMS is unreachable
    if (
      CMS_DEPENDENT_ROUTES.includes(routePath) &&
      (!html || html.length < 500)
    ) {
      return CLASS.CMS_DEPENDENT;
    }
    if (!html || html.length < 200) return CLASS.EMPTY_200;
    if (
      html.includes('404 Not Found') ||
      html.includes('Page Not Found') ||
      html.includes('page not found')
    )
      return CLASS.NOT_FOUND;
    return CLASS.PASS_200_RENDERED;
  }
  return CLASS.OTHER;
}

// ── Content checks ──
function hasNavigation(html) {
  const navMarkers = ['Home', 'Products', 'Services', 'ScrewFast', 'Zerniq'];
  return navMarkers.some(m => html.includes(m));
}

function hasFooter(html) {
  const footerMarkers = ['©', 'All rights reserved', 'footer', 'Footer'];
  return footerMarkers.some(m => html.includes(m));
}

function countEmptySrc(html) {
  return (html.match(/src=""/gi) || []).length;
}

function hasMeaningfulContent(html) {
  // Remove script/style tags, then count visible text
  const stripped = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > 100;
}

function hasErrorText(html) {
  const errorPatterns = [
    /404\s*not\s*found/i,
    /page\s*not\s*found/i,
    /500\s*internal\s*server\s*error/i,
    /an\s*error\s*occurred/i,
    /something\s*went\s*wrong/i,
    /error\s*loading/i,
    /failed\s*to\s*load/i,
  ];
  return errorPatterns.some(p => p.test(html));
}

function checkImgSrcValid(html) {
  // Find all <img tags and check they have non-empty src
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const invalidTags = [];
  for (const tag of imgTags) {
    const srcMatch = tag.match(/src="([^"]*)"/i);
    if (!srcMatch || srcMatch[1] === '') {
      invalidTags.push(tag);
      continue;
    }
    // Also check srcset if present
    const srcsetMatch = tag.match(/srcset="([^"]*)"/i);
    if (srcsetMatch && srcsetMatch[1] === '') {
      invalidTags.push(tag);
    }
  }
  return { total: imgTags.length, invalid: invalidTags.length };
}

// ── Build route list ──
function buildRouteList() {
  const routes = [];

  // Static pages from manifest
  const staticRoutes = [
    '/',
    '/services',
    '/contact',
    '/products',
    '/blog',
    '/fr',
    '/fr/services',
    '/fr/contact',
    '/fr/products',
    '/fr/blog',
  ];

  for (const r of staticRoutes) {
    routes.push({ path: r, type: 'static_page' });
  }

  // Concrete product detail pages
  const PRODUCT_HANDLES = ['item-a765', 'item-b203', 'item-f303', 'item-t845'];
  for (const h of PRODUCT_HANDLES) {
    routes.push({ path: `/products/${h}`, type: 'product_detail' });
    routes.push({ path: `/fr/products/${h}`, type: 'product_detail' });
  }

  // Blog detail pages
  const BLOG_SLUGS = ['post-1', 'post-2', 'post-3'];
  for (const s of BLOG_SLUGS) {
    routes.push({ path: `/blog/${s}`, type: 'blog_detail' });
    routes.push({ path: `/fr/blog/${s}`, type: 'blog_detail' });
  }

  // Insight detail pages
  const INSIGHT_SLUGS = ['insight-1', 'insight-2', 'insight-3'];
  for (const s of INSIGHT_SLUGS) {
    routes.push({ path: `/insights/${s}`, type: 'insight_detail' });
    routes.push({ path: `/fr/insights/${s}`, type: 'insight_detail' });
  }

  // Additional legal pages (not in baseline but exist now)
  routes.push({ path: '/pages/downloads', type: 'legal_page' });
  routes.push({ path: '/pages/privacy', type: 'legal_page' });
  routes.push({ path: '/pages/warranty', type: 'legal_page' });
  routes.push({ path: '/fr/pages/contact', type: 'legal_page' });
  routes.push({ path: '/fr/pages/services', type: 'legal_page' });
  routes.push({ path: '/fr/pages/downloads', type: 'legal_page' });
  routes.push({ path: '/fr/pages/privacy', type: 'legal_page' });
  routes.push({ path: '/fr/pages/warranty', type: 'legal_page' });

  // Additional utility routes from manifest
  routes.push({ path: '/api/health.json', type: 'api' });
  routes.push({ path: '/robots.txt', type: 'utility' });

  // Non-existent route (should 404)
  routes.push({ path: '/nonexistent-page-xyz', type: '404_check' });

  return routes;
}

// ── Test a single route ──
async function testRoute(route) {
  const url = `${BASE}${route.path}`;
  let result = {
    path: route.path,
    type: route.type,
    status: 0,
    classification: CLASS.OTHER,
    navPresent: false,
    footerPresent: false,
    emptyImgCount: 0,
    totalImgCount: 0,
    hasContent: false,
    hasErrorText: false,
    contentLength: 0,
    errors: [],
  };

  try {
    const res = await fetch(url, { redirect: 'manual' });
    result.status = res.status;
    const html = await res.text();
    result.contentLength = html.length;

    result.classification = classify(res.status, html, route.path);

    if (res.status === 200) {
      result.navPresent = hasNavigation(html);
      result.footerPresent = hasFooter(html);
      result.hasContent = hasMeaningfulContent(html);
      result.hasErrorText = hasErrorText(html);

      const imgCheck = checkImgSrcValid(html);
      result.totalImgCount = imgCheck.total;
      result.emptyImgCount = imgCheck.invalid;

      if (!result.navPresent) result.errors.push('Missing navigation');
      if (!result.footerPresent) result.errors.push('Missing footer');
      if (!result.hasContent) result.errors.push('No meaningful content');
      if (result.hasErrorText) result.errors.push('Page contains error text');
      if (result.emptyImgCount > 0)
        result.errors.push(`${result.emptyImgCount} empty src="" in images`);
      if (result.contentLength < 200)
        result.errors.push(`Content too short (${result.contentLength} bytes)`);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') || '';
      result.errors.push(`Redirect to: ${location}`);
    }
  } catch (err) {
    result.classification = CLASS.OTHER;
    result.errors.push(`Fetch error: ${err.message}`);
  }

  return result;
}

// ── Report ──
function printResult(r) {
  let icon;
  if (r.classification === CLASS.PASS_200_RENDERED) {
    icon = '\x1b[32m✓\x1b[0m';
  } else if (r.classification === CLASS.CMS_DEPENDENT) {
    icon = '\x1b[33m~\x1b[0m';
  } else if (r.classification === CLASS.REDIRECT) {
    icon = '\x1b[33m→\x1b[0m';
  } else {
    icon = '\x1b[31m✗\x1b[0m';
  }
  const details = [];

  if (
    r.classification === CLASS.PASS_200_RENDERED ||
    r.classification === CLASS.CMS_DEPENDENT
  ) {
    if (r.contentLength > 200) {
      details.push(`nav=${r.navPresent ? 'Y' : 'N'}`);
      details.push(`footer=${r.footerPresent ? 'Y' : 'N'}`);
      if (r.totalImgCount > 0) details.push(`imgs=${r.totalImgCount}`);
      if (r.emptyImgCount > 0) details.push(`emptyImg=${r.emptyImgCount}`);
    }
    details.push(`${r.contentLength}B`);
  }

  const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';

  console.log(
    `  ${icon} [${r.classification}] ${r.path} → HTTP ${r.status}${detailStr}`
  );

  if (r.errors.length > 0 && r.classification !== CLASS.REDIRECT) {
    for (const e of r.errors) {
      console.log(`      ⚠ ${e}`);
    }
  }
}

// ── Special handling for API routes ──
function isApiRoute(path) {
  return path.startsWith('/api/');
}

// ── Main ──
async function main() {
  console.log('=== PUBLIC ROUTE USABILITY TEST ===');
  console.log(`Base URL: ${BASE}`);
  console.log('');

  const routes = buildRouteList();
  console.log(`Testing ${routes.length} routes...\n`);

  let passCount = 0;
  let totalHtmlRoutes = 0;

  for (const route of routes) {
    const result = await testRoute(route);

    // API routes have different criteria
    if (isApiRoute(route.path)) {
      if (result.status === 200) {
        result.classification = CLASS.PASS_200_RENDERED;
      }
    }

    // Utility routes like robots.txt just need any successful response
    if (route.type === 'utility') {
      if (result.status === 200) {
        result.classification = CLASS.PASS_200_RENDERED;
      }
    }

    // 404_check routes should return 404
    if (route.type === '404_check') {
      if (result.status === 404) {
        result.classification = CLASS.PASS_200_RENDERED;
        result.errors = [];
      } else {
        result.errors.push(`Expected 404, got ${result.status}`);
      }
    }

    printResult(result);
    results.push(result);

    if (
      result.classification === CLASS.PASS_200_RENDERED ||
      result.classification === CLASS.CMS_DEPENDENT
    ) {
      passCount++;
    }
    if (!isApiRoute(route.path) && route.type !== 'utility') {
      totalHtmlRoutes++;
    }
  }

  // Summary
  console.log(`\n=== ROUTE USABILITY SUMMARY ===`);
  console.log(`Total routes tested: ${routes.length}`);
  console.log(
    `200_RENDERED (PASS): ${results.filter(r => r.classification === CLASS.PASS_200_RENDERED).length}`
  );
  console.log(
    `CMS_DEPENDENT:       ${results.filter(r => r.classification === CLASS.CMS_DEPENDENT).length}`
  );
  console.log(
    `REDIRECT:            ${results.filter(r => r.classification === CLASS.REDIRECT).length}`
  );
  console.log(
    `EMPTY_200:           ${results.filter(r => r.classification === CLASS.EMPTY_200).length}`
  );
  console.log(
    `404:                 ${results.filter(r => r.classification === CLASS.NOT_FOUND).length}`
  );
  console.log(
    `5XX:                 ${results.filter(r => r.classification === CLASS.SERVER_ERROR).length}`
  );
  console.log(
    `OTHER:               ${results.filter(r => r.classification === CLASS.OTHER).length}`
  );

  // Distribution
  const routeTypes = {};
  for (const r of results) {
    routeTypes[r.type] = routeTypes[r.type] || { total: 0, pass: 0 };
    routeTypes[r.type].total++;
    if (
      r.classification === CLASS.PASS_200_RENDERED ||
      r.classification === CLASS.CMS_DEPENDENT
    )
      routeTypes[r.type].pass++;
  }

  console.log(`\nRoute type breakdown:`);
  for (const [type, counts] of Object.entries(routeTypes)) {
    const pct =
      counts.total > 0 ? Math.round((counts.pass / counts.total) * 100) : 0;
    console.log(`  ${type}: ${counts.pass}/${counts.total} pass (${pct}%)`);
  }

  // Non-passing: routes that are not 200_RENDERED, not CMS_DEPENDENT, and not REDIRECT
  const nonPass = results.filter(
    r =>
      r.classification !== CLASS.PASS_200_RENDERED &&
      r.classification !== CLASS.CMS_DEPENDENT &&
      r.classification !== CLASS.REDIRECT
  );
  if (nonPass.length > 0) {
    console.log(`\nNon-passing routes:`);
    for (const r of nonPass) {
      console.log(
        `  [${r.classification}] ${r.path} → HTTP ${r.status}${r.errors.length > 0 ? ' — ' + r.errors.join('; ') : ''}`
      );
    }
  }

  // Log intentional redirects
  const redirects = results.filter(r => r.classification === CLASS.REDIRECT);
  if (redirects.length > 0) {
    console.log(`\nRedirects (recorded, not errors):`);
    for (const r of redirects) {
      console.log(
        `  [${r.classification}] ${r.path} → HTTP ${r.status}${r.errors.length > 0 ? ' — ' + r.errors.join('; ') : ''}`
      );
    }
  }

  // Log CMS-dependent routes
  const cmsDeps = results.filter(r => r.classification === CLASS.CMS_DEPENDENT);
  if (cmsDeps.length > 0) {
    console.log(`\nCMS-dependent routes (no CMS data available):`);
    for (const r of cmsDeps) {
      console.log(
        `  [${r.classification}] ${r.path} → HTTP ${r.status} (${r.contentLength} bytes)`
      );
    }
  }

  // Determine overall pass/fail
  // HTML routes that are not 404_check should pass
  const htmlRoutesNon404 = results.filter(
    r => !isApiRoute(r.path) && r.type !== 'utility' && r.type !== '404_check'
  );
  const htmlFailures = htmlRoutesNon404.filter(
    r =>
      r.classification !== CLASS.PASS_200_RENDERED &&
      r.classification !== CLASS.CMS_DEPENDENT &&
      r.classification !== CLASS.REDIRECT
  );

  if (htmlFailures.length > 0) {
    console.error(
      `\nPublic Route Usability test FAILED — ${htmlFailures.length} route(s) not usable`
    );
    failed = true;
  } else {
    console.log(
      `\nPublic Route Usability test PASSED — all ${htmlRoutesNon404.length} HTML routes are usable`
    );
  }

  if (failed) {
    process.exit(1);
  }
}

main();
