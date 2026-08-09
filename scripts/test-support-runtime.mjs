/**
 * test-support-runtime.mjs
 * Validates the support routes (blogs/support/*) source code for correctness.
 *
 * Runs structural checks against the source files without requiring a running
 * dev server. Covers file existence, forbidden patterns, SSR config, and
 * old route preservation.
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

// ---------------------------------------------------------------------------
// 1. New support files exist
// ---------------------------------------------------------------------------

console.log('\n--- 1. File existence ---');

const newFiles = [
  'src/lib/cms/support-models.ts',
  'src/lib/cms/support-schemas.ts',
  'src/lib/cms/support-queries.ts',
  'src/lib/cms/support-adapter.ts',
  'src/lib/cms/support-resolver.ts',
  'src/components/blocks/SafeBlocksRenderer.astro',
  'src/components/ui/cards/CardBlogSupport.astro',
  'src/components/ui/cards/CardBlogRecentSupport.astro',
  'src/components/ui/cards/CardInsightSupport.astro',
  'src/pages/blogs/support/index.astro',
  'src/pages/blogs/support/[handle].astro',
  'src/pages/fr/blogs/support/index.astro',
  'src/pages/fr/blogs/support/[handle].astro',
];

for (const file of newFiles) {
  const exists = existsSync(resolve(repoRoot, file));
  check(`File exists: ${file}`, exists);
}

// ---------------------------------------------------------------------------
// 2. No set:html in any new file (CMS content must be rendered safely)
// ---------------------------------------------------------------------------

console.log('\n--- 2. No set:html in new files ---');

for (const file of newFiles) {
  const fullPath = resolve(repoRoot, file);
  if (!existsSync(fullPath)) continue;
  let content = readFileSync(fullPath, 'utf-8');
  // Strip JS/TS comments (// and /* */) and Astro comments ({/* */})
  content = content
    .replace(/\/\/.*$/gm, '')               // single-line JS comments
    .replace(/\/\*[\s\S]*?\*\//g, '')       // multi-line JS comments
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');  // Astro comment blocks
  const hasSetHtml = content.includes('set:html');
  check(`No set:html in ${file}`, !hasSetHtml);
}

// ---------------------------------------------------------------------------
// 3. No brand.domain or example.com in CMS support files
// ---------------------------------------------------------------------------

console.log('\n--- 3. No brand.domain or example.com in CMS files ---');

const cmsFiles = [
  'support-models.ts',
  'support-schemas.ts',
  'support-queries.ts',
  'support-adapter.ts',
  'support-resolver.ts',
];

for (const file of cmsFiles) {
  const fullPath = resolve(repoRoot, 'src', 'lib', 'cms', file);
  if (!existsSync(fullPath)) continue;
  const content = readFileSync(fullPath, 'utf-8');
  check(`No brand.domain in ${file}`, !content.includes('brand.domain'));
  check(`No example.com in ${file}`, !content.includes('example.com'));
}

// ---------------------------------------------------------------------------
// 4. No populate=* in support queries (must use explicit field selection)
// ---------------------------------------------------------------------------

console.log('\n--- 4. No populate=* in queries ---');

{
  const queryPath = resolve(repoRoot, 'src', 'lib', 'cms', 'support-queries.ts');
  if (existsSync(queryPath)) {
    let content = readFileSync(queryPath, 'utf-8');
    // Strip comments so we only check actual code
    content = content
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    check('No populate=* in support-queries.ts', !content.includes('populate=*'));
  }
}

// ---------------------------------------------------------------------------
// 5. Category template mapping exists and is correct
// ---------------------------------------------------------------------------

console.log('\n--- 5. Category template mapping ---');

{
  const resolverPath = resolve(
    repoRoot,
    'src',
    'lib',
    'cms',
    'support-resolver.ts'
  );
  if (existsSync(resolverPath)) {
    const content = readFileSync(resolverPath, 'utf-8');
    check('getTemplateForCategory function exists', content.includes('getTemplateForCategory'));
    check("Category 'insight' maps to 'insight'", content.includes("'insight'"));
    check(
      "Category 'blog'/'support' maps to 'blog'",
      content.includes('return \'blog\'') || content.includes('return "blog"')
    );
  }
}

// ---------------------------------------------------------------------------
// 6. SSR config: prerender=false on detail pages (must be SSR)
// ---------------------------------------------------------------------------

console.log('\n--- 6. SSR prerender=false on detail pages ---');

{
  const enDetail = resolve(
    repoRoot,
    'src',
    'pages',
    'blogs',
    'support',
    '[handle].astro'
  );
  const frDetail = resolve(
    repoRoot,
    'src',
    'pages',
    'fr',
    'blogs',
    'support',
    '[handle].astro'
  );

  if (existsSync(enDetail)) {
    const content = readFileSync(enDetail, 'utf-8');
    check(
      'EN detail: prerender = false',
      content.includes('prerender = false')
    );
  }
  if (existsSync(frDetail)) {
    const content = readFileSync(frDetail, 'utf-8');
    check(
      'FR detail: prerender = false',
      content.includes('prerender = false')
    );
  }
}

{
  const enListing = resolve(
    repoRoot,
    'src',
    'pages',
    'blogs',
    'support',
    'index.astro'
  );
  const frListing = resolve(
    repoRoot,
    'src',
    'pages',
    'fr',
    'blogs',
    'support',
    'index.astro'
  );

  if (existsSync(enListing)) {
    const content = readFileSync(enListing, 'utf-8');
    check(
      'EN listing: prerender = false',
      content.includes('prerender = false')
    );
  }
  if (existsSync(frListing)) {
    const content = readFileSync(frListing, 'utf-8');
    check(
      'FR listing: prerender = false',
      content.includes('prerender = false')
    );
  }
}

// ---------------------------------------------------------------------------
// 7. Old routes preserved (/blog/, /insights/)
// ---------------------------------------------------------------------------

console.log('\n--- 7. Old routes preserved ---');

const oldRoutes = [
  'src/pages/blog/index.astro',
  'src/pages/blog/[id].astro',
  'src/pages/fr/blog/index.astro',
  'src/pages/fr/blog/[id].astro',
  'src/pages/insights/[id].astro',
  'src/pages/fr/insights/[id].astro',
];

for (const route of oldRoutes) {
  const exists = existsSync(resolve(repoRoot, route));
  check(`Old route preserved: ${route}`, exists);
}

// ---------------------------------------------------------------------------
// 8. SafeBlocksRenderer generates heading IDs (for TOC)
// ---------------------------------------------------------------------------

console.log('\n--- 8. SafeBlocksRenderer heading IDs ---');

{
  const rendererPath = resolve(
    repoRoot,
    'src',
    'components',
    'blocks',
    'SafeBlocksRenderer.astro'
  );
  if (existsSync(rendererPath)) {
    const content = readFileSync(rendererPath, 'utf-8');
    check(
      'Heading ID generation (slugify) exists',
      content.includes('slugify')
    );
    check(
      'Headings have id={slugify(text)}',
      content.includes('id={slugify(') || content.includes('id={slugify(')
    );
  }
}

// ---------------------------------------------------------------------------
// 9. SupportPageViewModel has all required fields
// ---------------------------------------------------------------------------

console.log('\n--- 9. SupportPageViewModel fields ---');

{
  const modelsPath = resolve(
    repoRoot,
    'src',
    'lib',
    'cms',
    'support-models.ts'
  );
  if (existsSync(modelsPath)) {
    const content = readFileSync(modelsPath, 'utf-8');
    const requiredFields = [
      'title',
      'subtitle',
      'insightsTitle',
      'insightsSubtitle',
      'recentCtaLabel',
      'emptyArticlesText',
      'emptyInsightsText',
      'relatedTitle',
      'feedbackTitle',
      'feedbackYesLabel',
      'feedbackNoLabel',
    ];

    for (const field of requiredFields) {
      check(
        `SupportPageViewModel has: ${field}`,
        new RegExp(`\\b${field}\\b`).test(content)
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 10. Support article category enum includes blog, support, insight
// ---------------------------------------------------------------------------

console.log('\n--- 10. Support article categories ---');

{
  const modelsPath = resolve(
    repoRoot,
    'src',
    'lib',
    'cms',
    'support-models.ts'
  );
  if (existsSync(modelsPath)) {
    const content = readFileSync(modelsPath, 'utf-8');
    check(
      "Category type includes 'blog'",
      content.includes("'blog'") || content.includes('"blog"')
    );
    check(
      "Category type includes 'support'",
      content.includes("'support'") || content.includes('"support"')
    );
    check(
      "Category type includes 'insight'",
      content.includes("'insight'") || content.includes('"insight"')
    );
  }
}

// ---------------------------------------------------------------------------
// 11. Support article model has required fields
// ---------------------------------------------------------------------------

console.log('\n--- 11. SupportArticleViewModel fields ---');

{
  const modelsPath = resolve(
    repoRoot,
    'src',
    'lib',
    'cms',
    'support-models.ts'
  );
  if (existsSync(modelsPath)) {
    const content = readFileSync(modelsPath, 'utf-8');
    const articleFields = [
      'documentId',
      'locale',
      'title',
      'slug',
      'excerpt',
      'category',
      'tags',
      'author',
      'authorRole',
      'displayDate',
      'readTimeMinutes',
      'cardImage',
      'authorImage',
      'seo',
    ];

    for (const field of articleFields) {
      check(
        `SupportArticleViewModel has: ${field}`,
        new RegExp(`\\b${field}\\b`).test(content)
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const total = passed + failed;
console.log(`\n${'='.repeat(50)}`);
console.log(`Support Runtime Test Results:`);
console.log(`  Checks: ${total}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);

if (failed > 0) {
  console.error('\nSupport runtime tests FAILED');
  process.exit(1);
}

console.log('\nSupport runtime tests PASSED');
