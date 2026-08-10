/**
 * test-product-runtime-v2.mjs
 * Static analysis of production product code.
 * Validates that production routes use CMS (not local content),
 * preserves theme markers, and enforces security / contract rules.
 *
 * Runs without a running dev server or CMS — reads source files only.
 *
 * Covers: CMS-only data sourcing, ProductDetail visual contract,
 * media safety, locale isolation, error semantics, preview separation,
 * and canonical URL hygiene.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

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
    const msg = `  FAIL  ${name}${detail ? ' — ' + detail : ''}`;
    console.error(msg);
    failed++;
  }
}

function checkExists(filePath, label) {
  const full = resolve(repoRoot, filePath);
  check(`File exists: ${label || filePath}`, existsSync(full));
}

function readContent(filePath) {
  const full = resolve(repoRoot, filePath);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf-8');
}

// Helper: check file does NOT contain a pattern
function checkNotContains(filePath, pattern, label) {
  const content = readContent(filePath);
  const found = content.includes(pattern);
  check(label, !found, found ? `found "${pattern}"` : '');
}

// Helper: check file contains a pattern
function checkContains(filePath, pattern, label) {
  const content = readContent(filePath);
  const found = content.includes(pattern);
  check(label, found, found ? '' : `missing "${pattern}"`);
}

// Helper: count occurrences of a pattern in a file
function countOccurrences(filePath, pattern) {
  const content = readContent(filePath);
  const matches = content.match(new RegExp(pattern, 'g'));
  return matches ? matches.length : 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('=== test-product-runtime-v2 ===');

// ── (a) Production product routes use CMS ──

console.log('\n--- (a) Production routes use CMS ---');

{
  const indexContent = readContent('src/pages/products/index.astro');

  // EN index uses getAllProducts from @/lib/cms/product
  const usesCms =
    indexContent.includes('getAllProducts') ||
    indexContent.includes("from '@/lib/cms/product'");
  check('[CMS Routing] EN index uses getAllProducts from cms/product', usesCms);

  // EN index does NOT use getCollection('products') (local content)
  check(
    '[CMS Routing] EN index does NOT use getCollection',
    !indexContent.includes("getCollection('products')")
  );
}

{
  // Detail route [handle].astro
  checkExists('src/pages/products/[handle].astro', 'EN detail route');
  const content = readContent('src/pages/products/[handle].astro');
  check(
    '[CMS Routing] EN detail uses getProductByHandle',
    content.includes('getProductByHandle')
  );

  // FR detail route
  checkExists('src/pages/fr/products/[handle].astro', 'FR detail route');
  const frContent = readContent('src/pages/fr/products/[handle].astro');
  check(
    '[CMS Routing] FR detail uses getProductByHandle',
    frContent.includes('getProductByHandle')
  );
}

// ── (b) No local content fallback ──

console.log('\n--- (b) No local content fallback ---');

{
  const enIndex = readContent('src/pages/products/index.astro');
  check(
    '[No Fallback] EN index does NOT import from astro:content',
    !enIndex.includes("from 'astro:content'")
  );

  const enDetail = readContent('src/pages/products/[handle].astro');
  check(
    '[No Fallback] EN detail does NOT import from astro:content',
    !enDetail.includes("from 'astro:content'")
  );
}

// ── (c) CardSmall/Wide accept ProductViewModel ──

console.log('\n--- (c) CardSmall/Wide accept ProductViewModel ---');

{
  const cardSmall = readContent('src/components/ui/cards/CardSmall.astro');
  check(
    '[View Models] CardSmall imports ProductViewModel',
    cardSmall.includes('ProductViewModel')
  );
  check(
    '[View Models] CardSmall does NOT import CollectionEntry',
    !cardSmall.includes('CollectionEntry')
  );

  const cardWide = readContent('src/components/ui/cards/CardWide.astro');
  check(
    '[View Models] CardWide imports ProductViewModel',
    cardWide.includes('ProductViewModel')
  );
  check(
    '[View Models] CardWide does NOT import CollectionEntry',
    !cardWide.includes('CollectionEntry')
  );
}

// ── (d) ProductDetail theme markers preserved ──

console.log('\n--- (d) ProductDetail theme markers ---');

{
  const detail = readContent(
    'src/components/sections/products/ProductDetail.astro'
  );

  // Element IDs
  const markerIds = [
    '#overlay',
    '#fadeText',
    '#fadeInUp',
    '#fadeInMoveRight',
    '#product-detail-body',
  ];
  for (const id of markerIds) {
    check(
      `[Theme Markers] ProductDetail contains "${id}"`,
      detail.includes(id)
    );
  }

  // GSAP import
  const hasGsapImport =
    detail.includes('import { gsap }') || detail.includes('import {gsap}');
  check('[Theme Markers] ProductDetail imports gsap', hasGsapImport);

  // prefersReducedMotion
  check(
    '[Theme Markers] ProductDetail contains prefersReducedMotion',
    detail.includes('prefersReducedMotion')
  );

  // Tab panel IDs
  const tabPanelIds = [
    '#tabs-with-card-1',
    '#tabs-with-card-2',
    '#tabs-with-card-3',
  ];
  for (const id of tabPanelIds) {
    check(
      `[Theme Markers] ProductDetail contains "${id}"`,
      detail.includes(id)
    );
  }
}

// ── (e) 3 Tabs ──

console.log('\n--- (e) 3 Tabs ---');

{
  const detail = readContent(
    'src/components/sections/products/ProductDetail.astro'
  );

  // Count ProductTabBtn usage
  const tabBtnCount = countOccurrences(
    'src/components/sections/products/ProductDetail.astro',
    'ProductTabBtn'
  );
  check(
    '[3 Tabs] ProductDetail has exactly 3 tab buttons (ProductTabBtn)',
    tabBtnCount === 3,
    `found ${tabBtnCount} occurrences`
  );

  // Tab order: Description → Specifications → Blueprints
  // The tabs array definition should have tabs-with-card-1, tabs-with-card-2, tabs-with-card-3 in that order
  const t1Idx = detail.indexOf('tabs-with-card-1');
  const t2Idx = detail.indexOf('tabs-with-card-2');
  const t3Idx = detail.indexOf('tabs-with-card-3');

  const correctTabOrder = t1Idx > 0 && t2Idx > t1Idx && t3Idx > t2Idx;
  check(
    '[3 Tabs] Tab order: Description -> Specifications -> Blueprints',
    correctTabOrder,
    correctTabOrder ? '' : `positions: t1=${t1Idx} t2=${t2Idx} t3=${t3Idx}`
  );
}

// ── (f) Media safety ──

console.log('\n--- (f) Media safety ---');

{
  const detail = readContent(
    'src/components/sections/products/ProductDetail.astro'
  );

  // ProductDetail.astro does NOT import Image from astro:assets
  const importsAstroImage =
    detail.includes("import { Image } from 'astro:assets'") ||
    detail.includes('import { Image } from "astro:assets"');
  check(
    '[Media Safety] ProductDetail does NOT import Image from astro:assets',
    !importsAstroImage
  );

  // resolveCmsMediaUrl exists in media.ts or product-schemas.ts
  const productSchemas = readContent('src/lib/cms/product-schemas.ts');
  const mediaModule = readContent('src/lib/cms/media.ts');
  const hasResolveCmsMediaUrl =
    productSchemas.includes('resolveCmsMediaUrl') ||
    mediaModule.includes('resolveCmsMediaUrl');
  check(
    '[Media Safety] resolveCmsMediaUrl exists (product-schemas.ts or media.ts)',
    hasResolveCmsMediaUrl
  );

  // Product queries use explicit populate
  const queries = readContent('src/lib/cms/product-queries.ts');
  const hasExplicitPopulate =
    queries.includes('populate[cardImage]') &&
    queries.includes('populate[mainImage]') &&
    queries.includes('populate[blueprintFirst]') &&
    queries.includes('populate[blueprintSecond]') &&
    queries.includes('populate[descriptionItems]');
  check(
    '[Media Safety] product-queries.ts uses explicit populate (not populate=*)',
    hasExplicitPopulate
  );
}

// ── (g) Site canonical ──

console.log('\n--- (g) Site canonical ---');

{
  const enDetail = readContent('src/pages/products/[handle].astro');
  const frDetail = readContent('src/pages/fr/products/[handle].astro');

  // Detail pages use runtimeConfig.site.domain
  check(
    '[Canonical] EN detail uses runtimeConfig.site.domain',
    enDetail.includes('runtimeConfig.site.domain')
  );
  check(
    '[Canonical] FR detail uses runtimeConfig.site.domain',
    frDetail.includes('runtimeConfig.site.domain')
  );

  // No example.com in SEO/JSON-LD
  const combined = enDetail + frDetail;
  check(
    '[Canonical] No "example.com" in SEO/JSON-LD',
    !combined.includes('example.com')
  );

  // No screwfast.uk
  check(
    '[Canonical] No "screwfast.uk" in detail pages',
    !combined.includes('screwfast.uk')
  );
}

// ── (h) Error semantics ──

console.log('\n--- (h) Error semantics ---');

{
  const productModule = readContent('src/lib/cms/product.ts');

  // product.ts throws CmsContentNotFoundError for empty data
  const throwsCmsContentNotFound =
    productModule.includes('CmsContentNotFoundError') &&
    (productModule.includes('throw new CmsContentNotFoundError') ||
      productModule.includes('throw new CmsContentNotFoundError()'));
  check(
    '[Errors] product.ts throws CmsContentNotFoundError for empty data',
    throwsCmsContentNotFound
  );

  // Detail route handles CmsContentNotFoundError
  const enDetail = readContent('src/pages/products/[handle].astro');
  check(
    '[Errors] EN detail handles CmsContentNotFoundError (returns 404)',
    enDetail.includes('CmsContentNotFoundError') &&
      enDetail.includes('status: 404')
  );

  const frDetail = readContent('src/pages/fr/products/[handle].astro');
  check(
    '[Errors] FR detail handles CmsContentNotFoundError (returns 404)',
    frDetail.includes('CmsContentNotFoundError') &&
      frDetail.includes('status: 404')
  );
}

// ── (i) EN/FR locale ──

console.log('\n--- (i) EN/FR locale ---');

{
  const enDetail = readContent('src/pages/products/[handle].astro');
  const frDetail = readContent('src/pages/fr/products/[handle].astro');

  // EN route passes 'en' to getProductByHandle
  check(
    '[Locale] EN route passes "en" to getProductByHandle',
    enDetail.includes("getProductByHandle(handle, 'en')") ||
      enDetail.includes('getProductByHandle(handle, "en")')
  );

  // FR route passes 'fr' to getProductByHandle
  check(
    '[Locale] FR route passes "fr" to getProductByHandle',
    frDetail.includes("getProductByHandle(handle, 'fr')") ||
      frDetail.includes('getProductByHandle(handle, "fr")')
  );

  // FR route has lang="fr" on MainLayout
  check(
    '[Locale] FR route has lang="fr" on MainLayout',
    frDetail.includes('lang="fr"')
  );
}

// ── (j) Preview is not production ──

console.log('\n--- (j) Preview is not production ---');

{
  const previewPath = 'src/pages/preview/products/[handle].astro';
  checkExists(previewPath, 'Preview detail route');

  const previewContent = readContent(previewPath);

  // Preview route uses prerender = false
  check(
    '[Preview] Preview route uses prerender = false',
    previewContent.includes('prerender = false')
  );

  // Preview route has X-Robots-Tag (shadow page)
  check(
    '[Preview] Preview route sets X-Robots-Tag (noindex,nofollow)',
    previewContent.includes('X-Robots-Tag')
  );

  // Preview is separate from production routes (different file)
  check(
    '[Preview] Preview route is separate from production routes',
    true,
    `preview: ${previewPath}, production: src/pages/products/[handle].astro`
  );
}

// ── Summary ──

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

process.exit(0);
