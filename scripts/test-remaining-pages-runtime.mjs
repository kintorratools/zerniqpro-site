/**
 * test-remaining-pages-runtime.mjs
 * Static analysis of Downloads, Warranty, and Privacy CMS pages.
 * Validates prerender settings, CMS data sourcing, error semantics,
 * and safe rendering practices.
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

console.log('=== test-remaining-pages-runtime ===');

// ── (1) 6 route files exist ──

console.log('\n--- (1) Route files exist ---');
checkExists('src/pages/pages/downloads.astro', 'EN Downloads');
checkExists('src/pages/fr/pages/downloads.astro', 'FR Downloads');
checkExists('src/pages/pages/warranty.astro', 'EN Warranty');
checkExists('src/pages/fr/pages/warranty.astro', 'FR Warranty');
checkExists('src/pages/pages/privacy.astro', 'EN Privacy');
checkExists('src/pages/fr/pages/privacy.astro', 'FR Privacy');

// ── (2) All routes have prerender = false ──

console.log('\n--- (2) Prerender = false ---');
const routes = [
  'src/pages/pages/downloads.astro',
  'src/pages/fr/pages/downloads.astro',
  'src/pages/pages/warranty.astro',
  'src/pages/fr/pages/warranty.astro',
  'src/pages/pages/privacy.astro',
  'src/pages/fr/pages/privacy.astro',
];

for (const route of routes) {
  const content = readContent(route);
  check(
    `Prerender: ${route} has prerender = false`,
    content.includes('prerender = false')
  );
}

// ── (3) All import getRuntimeConfig for canonical ──

console.log('\n--- (3) getRuntimeConfig import ---');
for (const route of routes) {
  const content = readContent(route);
  check(
    `getRuntimeConfig: ${route} imports getRuntimeConfig`,
    content.includes('getRuntimeConfig')
  );
  check(
    `runtimeConfig.site.domain: ${route} uses site.domain`,
    content.includes('runtimeConfig.site.domain') ||
      content.includes('runtimeConfig?.site?.domain')
  );
}

// ── (4) All use CmsContentNotFoundError ──

console.log('\n--- (4) CmsContentNotFoundError usage ---');
for (const route of routes) {
  const content = readContent(route);
  check(
    `CmsContentNotFoundError: ${route} imports/uses CmsContentNotFoundError`,
    content.includes('CmsContentNotFoundError')
  );
}

// ── (5) No local fallback ──

console.log('\n--- (5) No local fallback ---');
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
  // Allow @data/constants (SITE constants) but flag content data imports
  const hasNonConstantsDataImport = (() => {
    const importLines = content.split('\n').filter(l => l.includes('import'));
    for (const line of importLines) {
      if (
        (line.includes('@data/') || line.includes('@content/')) &&
        !line.includes('@data/constants')
      ) {
        return true;
      }
    }
    return false;
  })();
  check(
    `No fallback: ${route} no non-constants data import`,
    !hasNonConstantsDataImport,
    hasNonConstantsDataImport ? 'Has content data import' : ''
  );
}

// ── (6) Downloads page imports getDownloads + getDownloadsPage ──

console.log('\n--- (6) Downloads data sourcing ---');
{
  const enContent = readContent('src/pages/pages/downloads.astro');
  check(
    'Downloads EN: imports getDownloadsPage',
    enContent.includes('getDownloadsPage')
  );
  check(
    'Downloads EN: imports getDownloads',
    enContent.includes('getDownloads')
  );
  check(
    'Downloads EN: calls getDownloadsPage with locale',
    enContent.includes("getDownloadsPage('en')") ||
      enContent.includes('getDownloadsPage("en")')
  );
  check(
    'Downloads EN: calls getDownloads with locale',
    enContent.includes("getDownloads('en')") ||
      enContent.includes('getDownloads("en")')
  );

  const frContent = readContent('src/pages/fr/pages/downloads.astro');
  check(
    'Downloads FR: imports getDownloadsPage',
    frContent.includes('getDownloadsPage')
  );
  check(
    'Downloads FR: imports getDownloads',
    frContent.includes('getDownloads')
  );
  check(
    'Downloads FR: calls getDownloadsPage with locale',
    frContent.includes("getDownloadsPage('fr')") ||
      frContent.includes('getDownloadsPage("fr")')
  );
  check(
    'Downloads FR: calls getDownloads with locale',
    frContent.includes("getDownloads('fr')") ||
      frContent.includes('getDownloads("fr")')
  );
}

// ── (7) Privacy page uses getLegalPage with kind='privacy' ──

console.log('\n--- (7) Privacy data sourcing ---');
{
  const enContent = readContent('src/pages/pages/privacy.astro');
  check('Privacy EN: imports getLegalPage', enContent.includes('getLegalPage'));
  check(
    'Privacy EN: calls getLegalPage with kind=privacy',
    enContent.includes("getLegalPage('en', 'privacy')") ||
      enContent.includes('getLegalPage("en", "privacy")')
  );

  const frContent = readContent('src/pages/fr/pages/privacy.astro');
  check('Privacy FR: imports getLegalPage', frContent.includes('getLegalPage'));
  check(
    'Privacy FR: calls getLegalPage with kind=privacy',
    frContent.includes("getLegalPage('fr', 'privacy')") ||
      frContent.includes('getLegalPage("fr", "privacy")')
  );
}

// ── (8) Warranty page has safe body blocks rendering (no set:html) ──

console.log('\n--- (8) Warranty safe rendering ---');
for (const route of [
  'src/pages/pages/warranty.astro',
  'src/pages/fr/pages/warranty.astro',
]) {
  const content = readContent(route);
  check(
    `Safe render: ${route} no set:html`,
    !content.includes('set:html') && !content.includes('set-html')
  );
  check(
    `Safe render: ${route} renders body with .map()`,
    content.includes('.body.map') || content.includes('warrantyPage.body.map')
  );
  check(
    `Safe render: ${route} uses block.heading`,
    content.includes('block.heading')
  );
  check(
    `Safe render: ${route} uses block.content`,
    content.includes('block.content')
  );
}

// Also check privacy for no set:html
for (const route of [
  'src/pages/pages/privacy.astro',
  'src/pages/fr/pages/privacy.astro',
]) {
  const content = readContent(route);
  check(
    `Safe render: ${route} no set:html`,
    !content.includes('set:html') && !content.includes('set-html')
  );
}

// ── (9) Error semantics ──

console.log('\n--- (9) Error semantics ---');
for (const route of routes) {
  const content = readContent(route);
  const has404 = content.includes('status: 404');
  const has503 = content.includes('status: 503');
  const has502 = content.includes('status: 502');
  check(`Error: ${route} has 404 for not found`, has404);
  check(`Error: ${route} has 503 for no CMS`, has503);
  check(`Error: ${route} has 502 fallback`, has502);
  check(
    `Error: ${route} catches CmsContentNotFoundError`,
    content.includes('CmsContentNotFoundError')
  );
}

// ── (10) Site canonical uses site.domain from getRuntimeConfig ──

console.log('\n--- (10) Site canonical ---');
for (const route of routes) {
  const content = readContent(route);
  const usesSiteDomain =
    content.includes('runtimeConfig.site.domain') ||
    content.includes('runtimeConfig?.site?.domain') ||
    content.includes('siteDomain');
  check(`Canonical: ${route} uses site domain`, usesSiteDomain);
  check(`Canonical: ${route} no example.com`, !content.includes('example.com'));
  check(
    `Canonical: ${route} no screwfast.uk`,
    !content.includes('screwfast.uk')
  );
}

// ── (11) DisplayOrder sort logic in downloads ──

console.log('\n--- (11) DisplayOrder sort logic ---');
{
  const dlContent = readContent('src/lib/cms/downloads-page.ts');
  check(
    'downloads-page.ts: has displayOrder sort',
    dlContent.includes('displayOrder') &&
      (dlContent.includes('.sort') || dlContent.includes('sort('))
  );
  check(
    'downloads-page.ts: sort by a.displayOrder - b.displayOrder',
    dlContent.includes('a.displayOrder - b.displayOrder') ||
      dlContent.includes('a.displayOrder - b.displayOrder')
  );

  const dlModels = readContent('src/lib/cms/download-models.ts');
  check(
    'download-models.ts: has displayOrder field',
    dlModels.includes('displayOrder')
  );
}

// ── (12) CMS library files exist ──

console.log('\n--- (12) CMS library files ---');
const libFiles = [
  'src/lib/cms/download-models.ts',
  'src/lib/cms/download-queries.ts',
  'src/lib/cms/downloads-page.ts',
  'src/lib/cms/downloads-page-queries.ts',
  'src/lib/cms/warranty-page.ts',
  'src/lib/cms/warranty-page-queries.ts',
  'src/lib/cms/legal-page.ts',
  'src/lib/cms/legal-page-queries.ts',
];

for (const f of libFiles) {
  checkExists(f, f);
}

// ── (aa) Locale isolation ──

console.log('\n--- (aa) Locale isolation ---');
{
  const enDownloads = readContent('src/pages/pages/downloads.astro');
  const frDownloads = readContent('src/pages/fr/pages/downloads.astro');
  check(
    'Downloads EN: inLanguage en-US',
    enDownloads.includes("inLanguage: 'en-US'")
  );
  check(
    'Downloads FR: inLanguage fr',
    frDownloads.includes("inLanguage: 'fr'")
  );
  check(
    'Downloads FR: lang="fr" on MainLayout',
    frDownloads.includes('lang="fr"')
  );

  const enWarranty = readContent('src/pages/pages/warranty.astro');
  const frWarranty = readContent('src/pages/fr/pages/warranty.astro');
  check(
    'Warranty EN: inLanguage en-US',
    enWarranty.includes("inLanguage: 'en-US'")
  );
  check('Warranty FR: inLanguage fr', frWarranty.includes("inLanguage: 'fr'"));
  check(
    'Warranty FR: lang="fr" on MainLayout',
    frWarranty.includes('lang="fr"')
  );

  const enPrivacy = readContent('src/pages/pages/privacy.astro');
  const frPrivacy = readContent('src/pages/fr/pages/privacy.astro');
  check(
    'Privacy EN: inLanguage en-US',
    enPrivacy.includes("inLanguage: 'en-US'")
  );
  check('Privacy FR: inLanguage fr', frPrivacy.includes("inLanguage: 'fr'"));
  check('Privacy FR: lang="fr" on MainLayout', frPrivacy.includes('lang="fr"'));
}

// ── Results ──

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
process.exit(0);
