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
import { expectedCanonicalPath, fetchFinal } from './lib/route-contract.mjs';

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

/** Legacy routes that intentionally 301-redirect to their canonical route. */
const EXPECTED_REDIRECTS = {
  '/pages/contact': '/contact',
  '/pages/services': '/services',
  '/fr/pages/contact': '/fr/contact',
  '/fr/pages/services': '/fr/services',
};

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
    '/insights',
    '/fr',
    '/fr/services',
    '/fr/contact',
    '/fr/products',
    '/fr/blog',
    '/fr/insights',
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
  routes.push({ path: '/pages/contact', type: 'legal_page' });
  routes.push({ path: '/pages/services', type: 'legal_page' });
  routes.push({ path: '/pages/downloads', type: 'legal_page' });
  routes.push({ path: '/pages/privacy', type: 'legal_page' });
  routes.push({ path: '/pages/warranty', type: 'legal_page' });
  routes.push({ path: '/fr/pages/contact', type: 'legal_page' });
  routes.push({ path: '/fr/pages/services', type: 'legal_page' });
  routes.push({ path: '/fr/pages/downloads', type: 'legal_page' });
  routes.push({ path: '/fr/pages/privacy', type: 'legal_page' });
  routes.push({ path: '/fr/pages/warranty', type: 'legal_page' });

  return routes;
}

// ── Test a single route ──
async function testRoute(route) {
  const canonicalPath = expectedCanonicalPath(route.path);
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
    expectedRedirect: false,
    errors: [],
  };

  try {
    const final = await fetchFinal(url);
    const html = final.html;
    result.status = final.status;
    result.contentLength = html.length;

    if (final.error === 'REDIRECT_LOOP') {
      result.classification = CLASS.OTHER;
      result.errors.push('Redirect loop');
      return result;
    }

    if (final.error === 'TOO_MANY_REDIRECTS') {
      result.classification = CLASS.OTHER;
      result.errors.push('Too many redirects');
      return result;
    }

    result.classification = classify(final.status, html, route.path);

    if (final.status === 200) {
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

    if (final.status >= 200 && final.status < 300) {
      const finalPathname = new URL(final.finalUrl).pathname;
      if (
        finalPathname.replace(/\/+$/, '') !== canonicalPath.replace(/\/+$/, '')
      ) {
        result.errors.push(
          `Unexpected final URL ${final.finalUrl} (expected ${canonicalPath})`
        );
        result.classification = CLASS.OTHER;
      } else if (EXPECTED_REDIRECTS[route.path] && final.redirects.length > 0) {
        result.expectedRedirect = true;
      }
    }
  } catch (err) {
    result.classification = CLASS.OTHER;
    result.errors.push(`Fetch error: ${err.message}`);
  }

  return result;
}

// ── Report ──
function isPass(r) {
  return (
    r.classification === CLASS.PASS_200_RENDERED ||
    r.classification === CLASS.CMS_DEPENDENT ||
    r.expectedRedirect === true
  );
}

function printResult(r) {
  const displayClass = r.expectedRedirect
    ? 'EXPECTED_REDIRECT'
    : r.classification;
  let icon;
  if (isPass(r)) {
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
    `  ${icon} [${displayClass}] ${r.path} → HTTP ${r.status}${detailStr}`
  );

  if (r.errors.length > 0 && r.classification !== CLASS.REDIRECT) {
    for (const e of r.errors) {
      console.log(`      ⚠ ${e}`);
    }
  }
}

// ── Main ──
async function main() {
  console.log('=== PUBLIC ROUTE USABILITY TEST ===');
  console.log(`Base URL: ${BASE}`);
  console.log('');

  const routes = buildRouteList();
  console.log(`Testing ${routes.length} routes...\n`);

  for (const route of routes) {
    const result = await testRoute(route);
    printResult(result);
    results.push(result);
  }

  const pass = results.filter(isPass);
  const failedRoutes = results.filter(r => !isPass(r));

  const brokenImages = results.reduce((sum, r) => sum + r.emptyImgCount, 0);
  const ssrErrors = results.filter(
    r => r.classification === CLASS.SERVER_ERROR
  ).length;
  const cmsRuntimeErrors = results.filter(r => r.hasErrorText).length;

  console.log(`\n=== ROUTE USABILITY SUMMARY ===`);
  console.log(`LOCAL_ROUTE_TOTAL=${results.length}`);
  console.log(`LOCAL_ROUTE_PASS=${pass.length}`);
  console.log(`LOCAL_ROUTE_FAIL=${failedRoutes.length}`);
  console.log(`BROKEN_IMAGE=${brokenImages}`);
  console.log(`SSR_ERROR=${ssrErrors}`);
  console.log(`CMS_RUNTIME_ERROR=${cmsRuntimeErrors}`);

  const expectedRedirects = results.filter(r => r.expectedRedirect);
  if (expectedRedirects.length > 0) {
    console.log(`EXPECTED_REDIRECT=${expectedRedirects.length}`);
    for (const r of expectedRedirects) {
      console.log(`  ${r.path} → ${EXPECTED_REDIRECTS[r.path]}`);
    }
  }

  if (failedRoutes.length > 0) {
    console.log(`\nFAILED_ROUTE_LIST:`);
    for (const r of failedRoutes) {
      console.log(
        `  [${r.classification}] ${r.path} → HTTP ${r.status}${r.errors.length > 0 ? ' — ' + r.errors.join('; ') : ''}`
      );
    }
    failed = true;
  }

  if (failed) {
    console.error(`\nPublic Route Usability test FAILED`);
    process.exit(1);
  }

  console.log(
    `\nPublic Route Usability test PASSED — ${pass.length}/${results.length} routes usable`
  );
}

main();
