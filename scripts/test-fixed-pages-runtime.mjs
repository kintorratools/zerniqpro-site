/**
 * test-fixed-pages-runtime.mjs
 * Static analysis of Services + Contact CMS pages.
 * Validates prerender settings, CMS data sourcing, error semantics,
 * visual contract preservation, and theme markers.
 *
 * Runs without a running dev server or CMS — reads source files only.
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
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function readContent(filePath) {
  const full = resolve(repoRoot, filePath);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf-8');
}

function checkExists(filePath, label) {
  const full = resolve(repoRoot, filePath);
  check(`File exists: ${label || filePath}`, existsSync(full));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('=== test-fixed-pages-runtime ===');

// ── (a) 4 routes exist ──

console.log('\n--- (a) Route files exist ---');
checkExists('src/pages/pages/services.astro', 'EN Services');
checkExists('src/pages/fr/pages/services.astro', 'FR Services');
checkExists('src/pages/pages/contact.astro', 'EN Contact');
checkExists('src/pages/fr/pages/contact.astro', 'FR Contact');

// ── (b) All routes are SSR-only (prerender = false) ──

console.log('\n--- (b) Prerender = false ---');
const routes = [
  'src/pages/pages/services.astro',
  'src/pages/fr/pages/services.astro',
  'src/pages/pages/contact.astro',
  'src/pages/fr/pages/contact.astro',
];
for (const route of routes) {
  const content = readContent(route);
  check(
    `Prerender: ${route} has prerender = false`,
    content.includes('prerender = false')
  );
}

// ── (c) No local fallback ──

console.log('\n--- (c) No local fallback ---');
for (const route of routes) {
  const content = readContent(route);
  check(
    `No fallback: ${route} does NOT import from astro:content`,
    !content.includes("from 'astro:content'") &&
      !content.includes('from "astro:content"')
  );
  check(
    `No fallback: ${route} does NOT use getCollection`,
    !content.includes('getCollection')
  );
}

// ── (d) Error semantics ──

console.log('\n--- (d) Error semantics ---');
for (const route of routes) {
  const content = readContent(route);
  const has404 = content.includes('status: 404');
  const has503 = content.includes('status: 503');
  const has502 = content.includes('status: 502');
  check(`Error: ${route} has 404 for not found`, has404);
  check(`Error: ${route} has 503 for no CMS`, has503);
  check(`Error: ${route} has 502 fallback`, has502);
  const catchesError = content.includes('CmsContentNotFoundError');
  check(`Error: ${route} catches CmsContentNotFoundError`, catchesError);
}

// ── (e) Services CMS data sourcing ──

console.log('\n--- (e) Services data sourcing ---');
{
  const enContent = readContent('src/pages/pages/services.astro');
  check(
    'Services EN: imports getServicesPage',
    enContent.includes('getServicesPage')
  );
  check(
    'Services EN: calls getServicesPage with locale',
    enContent.includes("getServicesPage('en')") ||
      enContent.includes('getServicesPage("en")')
  );

  const frContent = readContent('src/pages/fr/pages/services.astro');
  check(
    'Services FR: imports getServicesPage',
    frContent.includes('getServicesPage')
  );
  check(
    'Services FR: calls getServicesPage with locale',
    frContent.includes("getServicesPage('fr')") ||
      frContent.includes('getServicesPage("fr")')
  );
}

// ── (f) Contact CMS data sourcing ──

console.log('\n--- (f) Contact data sourcing ---');
{
  const enContent = readContent('src/pages/pages/contact.astro');
  check(
    'Contact EN: imports getContactPage',
    enContent.includes('getContactPage')
  );
  check(
    'Contact EN: calls getContactPage with locale',
    enContent.includes("getContactPage('en')") ||
      enContent.includes('getContactPage("en")')
  );

  const frContent = readContent('src/pages/fr/pages/contact.astro');
  check(
    'Contact FR: imports getContactPage',
    frContent.includes('getContactPage')
  );
  check(
    'Contact FR: calls getContactPage with locale',
    frContent.includes("getContactPage('fr')") ||
      frContent.includes('getContactPage("fr")')
  );
}

// ── (g) Services fixed order (5 sections, alternating Right/Left) ──

console.log('\n--- (g) Services fixed order ---');
{
  const content = readContent('src/pages/pages/services.astro');

  // MainSection is used for intro
  check(
    'Services: MainSection component preserved',
    content.includes('MainSection')
  );

  // 5 services: 3 Right, 2 Left (count entries in articles array)
  const rightCount = (content.match(/isRightSection:\s*true/g) || []).length;
  const leftCount = (content.match(/isRightSection:\s*false/g) || []).length;
  check('Services: 3 Right sections', rightCount === 3, `found ${rightCount}`);
  check('Services: 2 Left sections', leftCount === 2, `found ${leftCount}`);

  // FeaturesStats preserved
  check(
    'Services: FeaturesStats component preserved',
    content.includes('FeaturesStats')
  );

  // Stats fields used (CMS-driven)
  check(
    'Services: statsTitle from CMS',
    content.includes('servicesPage.statsTitle')
  );
  check(
    'Services: mainStatValue from CMS',
    content.includes('servicesPage.mainStatValue')
  );
}

// ── (h) Contact form demo mode preserved ──

console.log('\n--- (h) Contact demo mode ---');
{
  const content = readContent(
    'src/components/sections/misc/ContactSection.astro'
  );
  check('Contact: demo form preserved', content.includes('data-demo-form'));
  check(
    'Contact: demo message preserved',
    content.includes('data-demo-message')
  );
  check(
    'Contact: form inputs preserved (firstName)',
    content.includes('hs-firstname-contacts')
  );
  check(
    'Contact: form inputs preserved (lastName)',
    content.includes('hs-lastname-contacts')
  );
  check(
    'Contact: form inputs preserved (email)',
    content.includes('hs-email-contacts')
  );
  check(
    'Contact: form inputs preserved (phone)',
    content.includes('hs-phone-number')
  );
  check(
    'Contact: form inputs preserved (details)',
    content.includes('hs-about-contacts')
  );

  // No hardcoded locale copy; props-driven
  const hasGetMarketingLocale = content.includes('getMarketingLocale');
  check('Contact: no hardcoded locale', !hasGetMarketingLocale);
  const hasAstroProps = content.includes('Astro.props');
  check('Contact: uses Astro.props for copy', hasAstroProps);
}

// ── (i) Site canonical URLs ──

console.log('\n--- (i) Site canonical ---');
for (const route of routes) {
  const content = readContent(route);
  const usesSiteDomain =
    content.includes('runtimeConfig.site.domain') ||
    content.includes('siteDomain');
  check(`Canonical: ${route} uses site domain`, usesSiteDomain);
  check(`Canonical: ${route} no example.com`, !content.includes('example.com'));
  check(
    `Canonical: ${route} no screwfast.uk`,
    !content.includes('screwfast.uk')
  );
}

// ── (j) Locale isolation ──

console.log('\n--- (j) Locale isolation ---');
{
  const enServices = readContent('src/pages/pages/services.astro');
  const frServices = readContent('src/pages/fr/pages/services.astro');
  check(
    'Services EN: inLanguage en-US',
    enServices.includes("inLanguage: 'en-US'")
  );
  check('Services FR: inLanguage fr', frServices.includes("inLanguage: 'fr'"));
  check(
    'Services FR: lang="fr" on MainLayout',
    frServices.includes('lang="fr"')
  );
}

// ── (k) ContactSection receives CMS model ──

console.log('\n--- (k) ContactSection CMS props ---');
{
  const contactSection = readContent(
    'src/components/sections/misc/ContactSection.astro'
  );
  check(
    'ContactSection: officeName field',
    contactSection.includes('officeName')
  );
  check(
    'ContactSection: officeAddress field',
    contactSection.includes('officeAddress')
  );
  check(
    'ContactSection: contactEmail field',
    contactSection.includes('contactEmail')
  );
  check(
    'ContactSection: knowledgeLinkLabel field',
    contactSection.includes('knowledgeLinkLabel')
  );
  check(
    'ContactSection: knowledgeLinkUrl field',
    contactSection.includes('knowledgeLinkUrl')
  );
  check(
    'ContactSection: demoMessage field',
    contactSection.includes('demoMessage')
  );
}

// ── Results ──

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
process.exit(0);
