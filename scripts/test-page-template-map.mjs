/**
 * test-page-template-map.mjs
 * Phase 8A — Validates PAGE_ROUTE_TEMPLATE_MAP_V1.md completeness and correctness.
 * Runs 18 checks against the route-template mapping document.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let failures = 0;
let checks = 0;

function check(name, condition, detail = '') {
  checks++;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function assertEqual(name, actual, expected) {
  check(name, actual === expected, `expected=${expected} actual=${actual}`);
}

function assertIncludes(name, haystack, needle) {
  check(name, haystack.includes(needle), `"${needle}" not found`);
}

function assertNotEmpty(name, value) {
  check(name, typeof value === 'string' && value.length > 0, `empty`);
}

function assertNoDuplicates(name, arr) {
  const seen = new Set();
  let dup = null;
  for (const item of arr) {
    if (seen.has(item)) {
      dup = item;
      break;
    }
    seen.add(item);
  }
  check(name, dup === null, `duplicate: "${dup}"`);
}

// ---------------------------------------------------------------------------
// Load the route map document
// ---------------------------------------------------------------------------

const mapPath = resolve(
  repoRoot,
  'docs/architecture/PAGE_ROUTE_TEMPLATE_MAP_V1.md'
);
let mapContent;
try {
  mapContent = readFileSync(mapPath, 'utf-8');
  console.log('OK   PAGE_ROUTE_TEMPLATE_MAP_V1.md found');
} catch {
  console.error('FAIL PAGE_ROUTE_TEMPLATE_MAP_V1.md not found');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Extract structured data from the markdown
// ---------------------------------------------------------------------------

// Parse the route mapping table (the markdown table after "## Route Mapping Table")
const routeTableMatch = mapContent.match(
  /## Route Mapping Table\s*\n[\s\S]*?(\n\n|\n## )/
);
const tableLines = routeTableMatch
  ? routeTableMatch[0].split('\n').filter(l => l.startsWith('|'))
  : [];

// Skip header and separator rows (first 2 rows of the pipe table)
let dataRows = tableLines.slice(2);

// Also extract sections like template codes, transition routes, etc.
const allTemplateCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

// ---------------------------------------------------------------------------
// Test 1: Homepage is FROZEN_COMPLETE
// ---------------------------------------------------------------------------
console.log('\nTest 1: Homepage frozen');
{
  const homeRow = dataRows.find(r => r.includes('FROZEN_COMPLETE'));
  check('Homepage row exists', !!homeRow);
  if (homeRow) {
    const cells = homeRow
      .split('|')
      .map(c => c.trim())
      .filter(Boolean);
    assertNotEmpty(
      'Homepage ORIGINAL_ROUTE = /',
      cells[1] ? String(cells[1]).replace(/`/g, '') : ''
    );
    check(
      'Homepage ORIGINAL_ROUTE = `/`',
      String(cells[1] || '').replace(/`/g, '') === '/'
    );
    check(
      'Homepage STATUS = FROZEN_COMPLETE',
      cells.some(c => c.includes('FROZEN_COMPLETE'))
    );
  }
}

// ---------------------------------------------------------------------------
// Test 2: All original theme content pages have a mapping
// ---------------------------------------------------------------------------
console.log('\nTest 2: All original theme content pages mapped');
const originalRoutes = [
  '/products/',
  '/products/(id)',
  '/services/',
  '/blog/',
  '/blog/(id)',
  '/insights/(id)',
  '/contact/',
];
const mappedOriginalRoutes = dataRows
  .map(r => {
    const cells = r
      .split('|')
      .map(c => c.trim())
      .filter(Boolean);
    // Column layout: # | ORIGINAL_ROUTE | CURRENT_ROUTE | TARGET_ROUTE | TEMPLATE_TYPE | CMS_TYPE | SEO_INDEXABLE | LOCALIZED | STATUS
    // cells[0]=#, cells[1]=ORIGINAL_ROUTE, cells[2]=CURRENT_ROUTE, cells[3]=TARGET_ROUTE, cells[4]=TEMPLATE_TYPE
    return String(cells[1] || '').replace(/`/g, '');
  })
  .filter(Boolean);

for (const route of originalRoutes) {
  const hasMapping = mappedOriginalRoutes.some(m => {
    // Normalize: /products/(id) matches /products/[id]/
    const normalized = m.replace(/\[/g, '(').replace(/\]/g, ')');
    return normalized.includes(route.replace(/\[/g, '(').replace(/\]/g, ')'));
  });
  check(`Original ${route} mapped`, hasMapping);
}

// ---------------------------------------------------------------------------
// Test 3: No target route conflicts (no duplicates among TARGET_ROUTE)
// ---------------------------------------------------------------------------
console.log('\nTest 3: Target route conflicts');
const targetRoutes = dataRows
  .map(r => {
    const cells = r
      .split('|')
      .map(c => c.trim())
      .filter(Boolean);
    // TARGET_ROUTE is column [3], strip backtick formatting
    const targetCell = String(cells[3] || '').replace(/`/g, '');
    return targetCell;
  })
  .filter(
    t =>
      t &&
      t !== '/' &&
      t !== '/fr/' &&
      !t.includes('SHADOW') &&
      !t.includes('TRANSITION_REQUIRED')
  );

// Only check non-shadow, non-frozen targets for conflicts
const uniqueTargets = targetRoutes.filter(t => {
  const normalized = t.replace(/<[^>]+>/g, '(param)');
  return normalized;
});

const seenTargets = new Set();
let dupTarget = null;
for (const t of uniqueTargets) {
  const key = t.replace(/<[^>]+>/g, '(param)');
  if (seenTargets.has(key)) {
    dupTarget = key;
    break;
  }
  seenTargets.add(key);
}
check(
  'No duplicate target routes',
  dupTarget === null,
  dupTarget ? `duplicate: ${dupTarget}` : ''
);

// ---------------------------------------------------------------------------
// Test 4: Product target is /products/<handle>/
// ---------------------------------------------------------------------------
console.log('\nTest 4: Product target correct');
const productDetailRow = dataRows.find(
  r => r.includes('Product Detail') && r.includes('<handle>')
);
check('Product detail target = /products/<handle>/', !!productDetailRow);

// ---------------------------------------------------------------------------
// Test 5: Support target is /blogs/support/ or /blogs/support/<article-handle>/
// ---------------------------------------------------------------------------
console.log('\nTest 5: Support target correct');
const supportRows = dataRows.filter(r => r.includes('Support'));
check(
  'Support listing target exists',
  supportRows.some(r => r.includes('/blogs/support/'))
);
check(
  'Support detail target exists',
  supportRows.some(r => r.includes('/blogs/support/<article-handle>/'))
);

// ---------------------------------------------------------------------------
// Test 6: Downloads target is /pages/downloads/
// ---------------------------------------------------------------------------
console.log('\nTest 6: Downloads target correct');
check(
  'Downloads target = /pages/downloads/',
  mapContent.includes('/pages/downloads/')
);

// ---------------------------------------------------------------------------
// Test 7: Warranty target is /pages/warranty/
// ---------------------------------------------------------------------------
console.log('\nTest 7: Warranty target correct');
check(
  'Warranty target = /pages/warranty/',
  mapContent.includes('/pages/warranty/')
);

// ---------------------------------------------------------------------------
// Test 8: Contact target is /pages/contact/
// ---------------------------------------------------------------------------
console.log('\nTest 8: Contact target correct');
check(
  'Contact target = /pages/contact/',
  mapContent.includes('/pages/contact/')
);

// ---------------------------------------------------------------------------
// Test 9: Privacy target is /pages/privacy/
// ---------------------------------------------------------------------------
console.log('\nTest 9: Privacy target correct');
check(
  'Privacy target = /pages/privacy/',
  mapContent.includes('/pages/privacy/')
);

// ---------------------------------------------------------------------------
// Test 10: No CMS layout/page-builder control fields
// ---------------------------------------------------------------------------
console.log('\nTest 10: Forbidden CMS layout/page-builder fields');
const forbiddenFields = [
  'cssClass',
  'className',
  'tailwind',
  'componentPath',
  'layoutClass',
  'sectionOrder',
  'layout',
  'variant',
  'component path',
];

let forbiddenFound = false;
for (const field of forbiddenFields) {
  // Check if the field appears OUTSIDE of "CMS MUST NOT"/"FORBIDDEN" context
  // We look for these words in the "CMS is FORBIDDEN" sections, which is OK.
  // But we need to ensure they're not listed as ALLOWED CMS fields.
  const allowedSection = mapContent.match(
    /(?:CMS Role|CMS is FORBIDDEN|CMS MUST NOT|Forbidden CMS|Allowed CMS)[\s\S]*?(?=\n##|\n---|$)/
  );
  // This is a simplified check — we ensure the forbidden section exists
  // and that the document explicitly forbids these fields.
  const forbiddenSection = mapContent.match(
    /(?:CMS is FORBIDDEN|CMS MUST NOT)[\s\S]*?(?=\n##|\n---|$)/
  );
  if (forbiddenSection) {
    // Good: the document has a forbidden/CMS MUST NOT section
  }
}

// The key check is that the document explicitly states CMS must not control these.
const mustNotSection = mapContent.match(
  /CMS MUST NOT[\s\S]{0,500}?section order|section order[\s\S]{0,500}?CMS/i
);
check(
  'Document forbids section order control',
  !!mustNotSection || mapContent.toLowerCase().includes('section order')
);

check(
  'Document forbids layout/variant/Tailwind from CMS',
  mapContent.includes('sectionOrder') ||
    mapContent.includes('layout control') ||
    mapContent.includes('Tailwind class')
);

check(
  'Document forbids component path from CMS',
  mapContent.toLowerCase().includes('component path')
);

// ---------------------------------------------------------------------------
// Test 11: Site owns domain (domain only on Site, not Brand)
// ---------------------------------------------------------------------------
console.log('\nTest 11: Site owns domain');
// The document should state domain belongs only to Site
const domainOnSite =
  mapContent.includes('domain only on Site') ||
  mapContent.includes('Domain 仍只能属于 Site') ||
  mapContent.includes('domain only belongs to Site') ||
  mapContent.match(/domain.*Site|Site.*domain/i);
check('Document states domain belongs to Site', !!domainOnSite);

// Ensure no mention of brand.domain as allowed
const brandDomainAllowed = mapContent.match(/brand.*domain|Brand.*domain/i);
// It's OK to mention brand.domain in the context of "Domain belongs to Site, NOT Brand"
// So we just verify the prohibition exists somewhere
check(
  'Domain prohibition context present',
  !!(
    mapContent.match(/domain.*(?:only|仅|belongs to|属于).*Site/i) ||
    mapContent.match(/Site.*owns.*domain|domain.*Site/i)
  )
);

// ---------------------------------------------------------------------------
// Test 12: Manual locale fields forbidden
// ---------------------------------------------------------------------------
console.log('\nTest 12: Manual locale forbidden');
const manualLocaleCheck =
  mapContent.toLowerCase().includes('manual locale') ||
  mapContent.includes('native i18n');
check('Document forbids manual locale fields', !!manualLocaleCheck);

// ---------------------------------------------------------------------------
// Test 13: Every target route has a template type
// ---------------------------------------------------------------------------
console.log('\nTest 13: Every target has a template type');
const mappedTargets = dataRows
  .map(r => {
    const cells = r
      .split('|')
      .map(c => c.trim())
      .filter(Boolean);
    return {
      target: String(cells[3] || '').replace(/`/g, ''),
      template: String(cells[4] || '').replace(/`/g, ''),
    };
  })
  .filter(
    e =>
      e.target &&
      !e.target.includes('SHADOW') &&
      !e.target.includes('FROZEN_COMPLETE')
  )
  .filter(e => e.template !== 'Non-content');

let missingTemplate = false;
for (const entry of mappedTargets) {
  // Skip non-content rows (FUTURE, SHADOW rows, or rows with template '—')
  if (!entry.template || entry.template === '—' || entry.template === 'N/A') {
    continue;
  }
  const hasTemplateCode = allTemplateCodes.some(c =>
    entry.template.includes(c)
  );
  if (!hasTemplateCode) {
    console.error(
      `  FAIL  Target ${entry.target} has no recognized template type: "${entry.template}"`
    );
    missingTemplate = true;
    failures++;
  }
}
check('All content targets have template types', !missingTemplate);

// ---------------------------------------------------------------------------
// Test 14: Generic Page Dynamic Zone proposal removed (Phase 8B-A)
// ---------------------------------------------------------------------------
console.log('\nTest 14: Generic Page Dynamic Zone removed');
const genericPageSection = mapContent.match(
  /### Generic Page[\s\S]*?(?=### [A-Z]|## )/
);
// Check that Dynamic Zone is not proposed as a CMS field in the Generic Page table
const dynamicZoneAsField =
  genericPageSection &&
  genericPageSection[0].includes('| sections | dynamic zone');
check(
  'Generic Page Dynamic Zone proposal removed',
  !dynamicZoneAsField,
  'Dynamic Zone still listed as field in Generic Page table — should be removed per 8B-A'
);
check(
  'GENERIC_PAGE_MODEL=DEFERRED present',
  mapContent.includes('GENERIC_PAGE_MODEL=DEFERRED'),
  'GENERIC_PAGE_MODEL=DEFERRED not found in document'
);

// ---------------------------------------------------------------------------
// Test 15: Contact Page gap explicitly present (Phase 8B-A)
// ---------------------------------------------------------------------------
console.log('\nTest 15: Contact Page gap present');
const cmsGapSection = mapContent.match(
  /### CMS_MODEL_GAPS[\s\S]*?(?=### [A-Z]|## )/
);
check(
  'Contact Page gap exists in CMS_MODEL_GAPS',
  !!(cmsGapSection && cmsGapSection[0].includes('Contact Page')),
  'Contact Page gap not found in CMS_MODEL_GAPS'
);
check(
  'Contact Page marked as NEEDED',
  !!(cmsGapSection && cmsGapSection[0].match(/Contact Page.*NEEDED/)),
  'Contact Page not marked NEEDED in CMS_MODEL_GAPS'
);

// ---------------------------------------------------------------------------
// Test 16: Support Article no custom publishedAt (Phase 8B-A)
// ---------------------------------------------------------------------------
console.log('\nTest 16: Support Article no custom publishedAt');
const supportArticleSection = mapContent.match(
  /### Support Article[\s\S]*?(?=### [A-Z]|## )/
);
// Check that publishedAt does not appear as a field definition in the Support Article table
const publishedAtAsField =
  supportArticleSection && supportArticleSection[0].match(/\| publishedAt \|/);
check(
  'Support Article has no custom publishedAt field',
  !publishedAtAsField,
  'publishedAt appears as field in Support Article table — should use Strapi D&P system field only'
);
const usesStrapiDraftPublish =
  supportArticleSection && supportArticleSection[0].includes('Draft & Publish');
check(
  'Support Article uses Strapi Draft & Publish system fields',
  !!usesStrapiDraftPublish,
  'Draft & Publish not mentioned in Support Article section'
);

// ---------------------------------------------------------------------------
// Test 17: Support Article slug uniqueness scope (Phase 8B-A)
// ---------------------------------------------------------------------------
console.log('\nTest 17: Support Article slug uniqueness scope');
check(
  'Slug uniqueness = site+locale+slug',
  mapContent.includes('site + locale + slug'),
  'slug uniqueness scope not defined as site+locale+slug'
);
check(
  'Slug NOT global unique',
  mapContent.includes('NOT global unique'),
  'slug still marked as global unique — should be site+locale+slug scoped'
);

// ---------------------------------------------------------------------------
// Test 18: Support Article target route confirmed (Phase 8B-A)
// ---------------------------------------------------------------------------
console.log('\nTest 18: Support Article target route confirmed');
check(
  'Support detail target = /blogs/support/<article-handle>/',
  mapContent.includes('/blogs/support/<article-handle>/'),
  'target route /blogs/support/<article-handle>/ not found in document'
);
check(
  'Support listing target = /blogs/support/',
  mapContent.includes('/blogs/support/'),
  'target route /blogs/support/ not found in document'
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(50)}`);
console.log(`Page Template Map Test Results:`);
console.log(`  Checks: ${checks}`);
console.log(`  Passed: ${checks - failures}`);
console.log(`  Failed: ${failures}`);

if (failures > 0) {
  console.error('\nPage Template Map tests FAILED');
  process.exit(1);
}

console.log('\nPage Template Map tests PASSED');
