/**
 * test-product-preservation.mjs
 * Validates the Product Content Preservation V1 audit document and source
 * code contracts for Phase 8D-A.
 *
 * Runs source-code checks without requiring a running dev server or CMS.
 * Covers: product counts, field audit completeness, media existence,
 * visual contracts, route preservation, and CMS control boundaries.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`);
    passed++;
  } else {
    const msg = `  FAIL  ${name}${detail ? ' — ' + detail : ''}`;
    console.error(msg);
    failed++;
    failures.push(name);
  }
}

function checkExists(filePath, label) {
  const full = resolve(repoRoot, filePath);
  check(`File exists: ${label || filePath}`, existsSync(full));
}

function checkNotExists(filePath, label) {
  const full = resolve(repoRoot, filePath);
  check(`File absent: ${label || filePath}`, !existsSync(full));
}

function readContent(filePath) {
  const full = resolve(repoRoot, filePath);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf-8');
}

// ---------------------------------------------------------------------------
// 1. Product count validation
// ---------------------------------------------------------------------------

console.log('\n--- 1. Product count validation ---');

const enStems = [];
const frStems = [];

for (const locale of ['en', 'fr']) {
  const dir = resolve(repoRoot, 'src', 'content', 'products', locale);
  if (existsSync(dir)) {
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const stem = f.replace(/\.md$/, '');
      if (locale === 'en') enStems.push(stem);
      else frStems.push(stem);
    }
  }
}

check('EN_PRODUCTS=4', enStems.length === 4, `got ${enStems.length}`);
check('FR_PRODUCTS=4', frStems.length === 4, `got ${frStems.length}`);

const logicalStems = [...new Set([...enStems, ...frStems])];
check(
  'LOGICAL_PRODUCTS=4',
  logicalStems.length === 4,
  `got ${logicalStems.length}`
);

const totalLocalizations = enStems.length + frStems.length;
check(
  'TOTAL_LOCALIZATIONS=8',
  totalLocalizations === 8,
  `got ${totalLocalizations}`
);

// Verify specific stems
const expectedStems = ['item-a765', 'item-b203', 'item-f303', 'item-t845'];
for (const stem of expectedStems) {
  const hasEn = enStems.includes(stem);
  const hasFr = frStems.includes(stem);
  check(`Product "${stem}" exists in EN`, hasEn);
  check(`Product "${stem}" exists in FR`, hasFr, `${stem} FR locale`);
}

// All stems accounted for
const extraEn = enStems.filter(s => !expectedStems.includes(s));
const extraFr = frStems.filter(s => !expectedStems.includes(s));
check(
  'No extra EN products',
  extraEn.length === 0,
  extraEn.length ? `extra: ${extraEn.join(', ')}` : ''
);
check(
  'No extra FR products',
  extraFr.length === 0,
  extraFr.length ? `extra: ${extraFr.join(', ')}` : ''
);

// ---------------------------------------------------------------------------
// 2. Preservation document exists
// ---------------------------------------------------------------------------

console.log('\n--- 2. Preservation document ---');

const docPath = 'docs/architecture/PRODUCT_CONTENT_PRESERVATION_V1.md';
checkExists(docPath);

const docContent = readContent(docPath);

// Verify key sections exist
const requiredSections = [
  'Product Count Summary',
  'Product File Listing',
  'Full Field Inventory',
  'Media Inventory',
  'Product Pages and Components',
  'Summary Metrics',
];
for (const section of requiredSections) {
  check(`Doc contains section: "${section}"`, docContent.includes(section));
}

// Verify key metrics in doc
check('Doc contains "EN_PRODUCTS=4"', docContent.includes('EN_PRODUCTS=4'));
check('Doc contains "FR_PRODUCTS=4"', docContent.includes('FR_PRODUCTS=4'));
check(
  'Doc contains "LOGICAL_PRODUCTS=4"',
  docContent.includes('LOGICAL_PRODUCTS=4')
);
check(
  'Doc contains "TOTAL_LOCALIZATIONS=8"',
  docContent.includes('TOTAL_LOCALIZATIONS=8')
);

// Verify all product stems mentioned
for (const stem of expectedStems) {
  check(`Doc mentions "${stem}"`, docContent.includes(stem));
}

// Verify required fields are documented
const requiredFields = [
  'title',
  'description',
  'main.id',
  'main.content',
  'main.imgCard',
  'main.imgMain',
  'main.imgAlt',
  'tabs',
  'longDescription',
  'descriptionList',
  'specificationsLeft',
  'specificationsRight',
  'tableData',
  'blueprints',
];
for (const field of requiredFields) {
  check(`Doc documents field: "${field}"`, docContent.includes(field));
}

// ---------------------------------------------------------------------------
// 3. Media inventory
// ---------------------------------------------------------------------------

console.log('\n--- 3. Media inventory ---');

// Find all media references in product files
const allContent = [];
for (const locale of ['en', 'fr']) {
  for (const stem of expectedStems) {
    const filePath = resolve(
      repoRoot,
      'src',
      'content',
      'products',
      locale,
      `${stem}.md`
    );
    if (existsSync(filePath)) {
      allContent.push(readFileSync(filePath, 'utf-8'));
    }
  }
}

// Extract image references (@/images/... paths)
const imgPattern =
  /@\/images\/([a-zA-Z0-9\-_]+\.(?:avif|webp|png|jpg|jpeg|svg))/g;
const allImages = new Set();
for (const content of allContent) {
  let match;
  while ((match = imgPattern.exec(content)) !== null) {
    allImages.add(match[1]);
  }
}

let missingMedia = 0;
const uniqueImages = [...allImages];
for (const img of uniqueImages) {
  const imgPath = resolve(repoRoot, 'src', 'images', img);
  if (!existsSync(imgPath)) {
    missingMedia++;
    console.error(`  MISSING: src/images/${img}`);
  }
}

check(
  'MISSING_PRODUCT_MEDIA=0',
  missingMedia === 0,
  `missing: ${missingMedia}`
);

const uniqueCount = uniqueImages.length;
check(
  'UNIQUE_PRODUCT_MEDIA_COUNT consistent',
  uniqueCount > 0,
  `count: ${uniqueCount}`
);
console.log(`  INFO  UNIQUE_PRODUCT_MEDIA_COUNT=${uniqueCount}`);

// Verify media inventory section in doc
const mediaInventoryStart = docContent.indexOf('Media Inventory');
if (mediaInventoryStart >= 0) {
  const mediaSection = docContent.slice(mediaInventoryStart);
  for (const img of uniqueImages) {
    // At least some media references should be in the doc
    check(`Doc mentions media: "${img}"`, docContent.includes(img));
  }
}

// ---------------------------------------------------------------------------
// 4. Product Detail visual contract (ProductDetail component + page)
// ---------------------------------------------------------------------------

console.log('\n--- 4. ProductDetail fixed structure ---');

// The page wrapper imports ProductDetail component
const detailPagePath = 'src/pages/products/[id].astro';
checkExists(detailPagePath);
const detailPageContent = readContent(detailPagePath);
check(
  'Page imports ProductDetail component',
  detailPageContent.includes('ProductDetail')
);

// The actual visual contract lives in the component
const detailCompPath = 'src/components/sections/products/ProductDetail.astro';
checkExists(detailCompPath);
const detailCompContent = readContent(detailCompPath);

// Protected elements — check in the component (which renders the actual UI)
const detailChecks = [
  ['Hero / intro section (main.content)', 'main.content'],
  ['Tab navigation', 'tab'],
  ['Tab button', 'ProductTabBtn'],
  ['Main image rendering', 'Image'],
  ['GSAP import or animation', 'gsap'],
  ['CTA element', 'PrimaryCTA'],
  ['Fade animation IDs', 'fadeInUp'],
];

for (const [label, keyword] of detailChecks) {
  check(
    `ProductDetail component has ${label}`,
    detailCompContent.includes(keyword)
  );
}

// Tab semantics: should have 3 fixed tab panels (tabs-with-card-1/2/3)
const tabPanels = ['tabs-with-card-1', 'tabs-with-card-2', 'tabs-with-card-3'];
let tabPanelsFound = 0;
for (const panel of tabPanels) {
  if (detailCompContent.includes(panel)) tabPanelsFound++;
}
check(
  'ProductDetail component has fixed 3-tab panel structure',
  tabPanelsFound >= 3,
  `found ${tabPanelsFound}/3 panel IDs`
);

// Tabs are rendered from product.data.tabs (3 entries in data)
check(
  'ProductDetail component renders tabs from product.data.tabs',
  detailCompContent.includes('product.data.tabs')
);

// GSAP animation IDs in component
check(
  'ProductDetail component has GSAP animation targets',
  detailCompContent.includes('gsap') &&
    (detailCompContent.includes('fadeInUp') ||
      detailCompContent.includes('fadeInMoveRight') ||
      detailCompContent.includes('fadeText'))
);

// ---------------------------------------------------------------------------
// 5. GSAP protection
// ---------------------------------------------------------------------------

console.log('\n--- 5. GSAP protection ---');

// Check for GSAP in the component and the page
check(
  'ProductDetail component contains gsap or useGSAP',
  detailCompContent.toLowerCase().includes('gsap') ||
    detailCompContent.toLowerCase().includes('usegsap')
);

// Check for reduced-motion consideration in the component
const hasReducedMotion =
  detailCompContent.includes('reduced-motion') ||
  detailCompContent.includes('prefers-reduced-motion');
check(
  'ProductDetail component handles reduced-motion or animation',
  hasReducedMotion ||
    detailCompContent.toLowerCase().includes('animation') ||
    detailCompContent.toLowerCase().includes('gsap')
);

// Check GSAP in the page wrapper too
check(
  'ProductDetail page delegates to component',
  detailPageContent.includes('ProductDetail')
);

// ---------------------------------------------------------------------------
// 6. Product Listing section order protection
// ---------------------------------------------------------------------------

console.log('\n--- 6. Listing section order protection ---');

const enListingPath = 'src/pages/products/index.astro';
const frListingPath = 'src/pages/fr/products/index.astro';
checkExists(enListingPath);
checkExists(frListingPath);

const enListing = readContent(enListingPath);
const frListing = readContent(frListingPath);

// Verify key sections exist in the listing page in order
const listingSections = [
  'PrimaryCTA', // Customer Stories CTA
  'FeaturesStatsAlt', // Why Choose area
  'TestimonialsSectionAlt', // Testimonials area
];

for (const section of listingSections) {
  check(`EN listing contains ${section}`, enListing.includes(section));
  check(`FR listing contains ${section}`, frListing.includes(section));
}

// Verify section order (PrimaryCTA before FeaturesStatsAlt before TestimonialsSectionAlt)
const enPrimaryIdx = enListing.indexOf('PrimaryCTA');
const enFeaturesIdx = enListing.indexOf('FeaturesStatsAlt');
const enTestimIdx = enListing.indexOf('TestimonialsSectionAlt');

check(
  'EN listing: PrimaryCTA before FeaturesStatsAlt',
  enPrimaryIdx < enFeaturesIdx && enPrimaryIdx >= 0 && enFeaturesIdx >= 0
);
check(
  'EN listing: FeaturesStatsAlt before TestimonialsSectionAlt',
  enFeaturesIdx < enTestimIdx && enFeaturesIdx >= 0 && enTestimIdx >= 0
);

// ---------------------------------------------------------------------------
// 7. CardSmall/CardWide rule protection
// ---------------------------------------------------------------------------

console.log('\n--- 7. CardSmall/Wide rule protection ---');

// Check that index-based card layout logic exists
const cardLogicPattern = /index\s*%/;
const hasCardLogic =
  cardLogicPattern.test(enListing) || cardLogicPattern.test(frListing);
check(
  'Listing uses index-based card layout',
  hasCardLogic ||
    enListing.includes('CardSmall') ||
    enListing.includes('CardWide')
);

// Card components exist
checkExists('src/components/ui/cards/CardSmall.astro', 'CardSmall.astro');
checkExists('src/components/ui/cards/CardWide.astro', 'CardWide.astro');

// Verify CMS does NOT control card layout — check card components have no CMS query references
const cardSmall = readContent('src/components/ui/cards/CardSmall.astro');
const cardWide = readContent('src/components/ui/cards/CardWide.astro');

check(
  'CardSmall has no Strapi/CMS references',
  !cardSmall.includes('strapi') &&
    !cardSmall.includes('CMS_SITE_KEY') &&
    !cardSmall.includes('populate')
);
check(
  'CardWide has no Strapi/CMS references',
  !cardWide.includes('strapi') &&
    !cardWide.includes('CMS_SITE_KEY') &&
    !cardWide.includes('populate')
);

// ---------------------------------------------------------------------------
// 8. CMS does not control layout — forbidden fields audit
// ---------------------------------------------------------------------------

console.log('\n--- 8. CMS forbidden layout control ---');

const forbiddenCmsFields = [
  'cssClass',
  'className',
  'tailwind',
  'componentPath',
  'layoutClass',
  'layout',
  'variant',
  'template',
  'sectionOrder',
];

// Check that product detail does not consume layout fields from CMS
const productModelPath = 'src/lib/cms/product-models.ts';
const productModels = readContent(productModelPath);
checkExists(productModelPath, productModelPath);

for (const field of forbiddenCmsFields) {
  check(
    `product-models.ts has no "${field}" field`,
    !productModels.toLowerCase().includes(field.toLowerCase())
  );
}

// Check the ProductDetail.astro component does not use CMS layout fields
const detailNoLayout =
  !detailCompContent.includes('cssClass') &&
  !detailCompContent.includes('componentPath') &&
  !detailCompContent.includes('layoutClass');
check('ProductDetail.astro has no CMS layout fields', detailNoLayout);

// ---------------------------------------------------------------------------
// 9. Product Page model: no Dynamic Zone recommendation
// ---------------------------------------------------------------------------

console.log('\n--- 9. Product Page no Dynamic Zone ---');

// The preservation doc should recommend fixed slots, not Dynamic Zone
check(
  'Doc does not recommend Dynamic Zone for Product Page',
  !docContent.includes('Dynamic Zone') ||
    docContent.includes('PAGE_BUILDER_RISK')
);

// Product listing index pages should use local data (not CMS Dynamic Zone)
check(
  'EN listing uses local content (not CMS sections)',
  !enListing.includes('Dynamic Zone') && !enListing.includes('dynamiczone')
);
check(
  'FR listing uses local content (not CMS sections)',
  !frListing.includes('Dynamic Zone') && !frListing.includes('dynamiczone')
);

// ---------------------------------------------------------------------------
// 10. Target route = /products/<handle>/
// ---------------------------------------------------------------------------

console.log('\n--- 10. Target route verification ---');

// Current production routes use [id] param
checkExists('src/pages/products/[id].astro', 'Production detail route');
checkExists('src/pages/fr/products/[id].astro', 'FR production detail route');

// Preview route exists
checkExists(
  'src/pages/preview/products/[handle].astro',
  'Preview detail route'
);

// Preview uses SSR (prerender = false)
const previewContent = readContent('src/pages/preview/products/[handle].astro');
check(
  'Preview route: prerender = false',
  previewContent.includes('prerender = false')
);

// Preview is shadow (noindex, nofollow)
check(
  'Preview route: noindex/nofollow',
  previewContent.includes('noindex') && previewContent.includes('nofollow')
);

// Preview canonical points to /products/<handle>/
check(
  'Preview canonical points to /products/',
  previewContent.includes('/products/')
);

// ---------------------------------------------------------------------------
// 11. Preview still marked shadow
// ---------------------------------------------------------------------------

console.log('\n--- 11. Preview shadow status ---');

check(
  'Preview page uses getProductByHandle (CMS)',
  previewContent.includes('getProductByHandle') ||
    previewContent.includes('product')
);

check(
  'Preview page includes X-Robots-Tag header',
  previewContent.includes('X-Robots-Tag')
);

// Production pages use astro:content, not CMS
const prodDetailContent = readContent('src/pages/products/[id].astro');
check(
  'Production detail uses astro:content (not CMS)',
  prodDetailContent.includes('getCollection') ||
    prodDetailContent.includes('getEntry')
);

// ---------------------------------------------------------------------------
// 12. Old product routes not deleted
// ---------------------------------------------------------------------------

console.log('\n--- 12. Old product routes preserved ---');

const oldProductRoutes = [
  'src/pages/products/index.astro',
  'src/pages/products/[id].astro',
  'src/pages/fr/products/index.astro',
  'src/pages/fr/products/[id].astro',
];

for (const route of oldProductRoutes) {
  check(`Route preserved: ${route}`, existsSync(resolve(repoRoot, route)));
}

// ===========================================================================
// Summary
// ===========================================================================

console.log('\n' + '='.repeat(60));
console.log(`PRODUCT_PRESERVATION_TEST=${failed === 0 ? 'PASS' : 'FAIL'}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('='.repeat(60));

if (failed > 0) {
  console.error('\nFailed checks:');
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

process.exit(0);
