import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const fs = await import('fs');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

let failed = false;

function check(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
  } else {
    console.error(`  FAIL: ${msg}`);
    failed = true;
  }
}

/* ---------- 1. Key components exist ---------- */
console.log('\n--- Component Existence ---');

const KEY_COMPONENTS = [
  'HeroSection',
  'HeroSectionAlt',
  'ClientsSection',
  'FeaturesGeneral',
  'FeaturesNavs',
  'TestimonialsSection',
  'PricingSection',
  'FAQ',
  'AnnouncementBanner',
  'Navbar',
  'FooterSection',
];

const componentPaths = {
  HeroSection: 'src/components/sections/landing/HeroSection.astro',
  HeroSectionAlt: 'src/components/sections/landing/HeroSectionAlt.astro',
  ClientsSection: 'src/components/sections/landing/ClientsSection.astro',
  FeaturesGeneral: 'src/components/sections/features/FeaturesGeneral.astro',
  FeaturesNavs: 'src/components/sections/features/FeaturesNavs.astro',
  TestimonialsSection:
    'src/components/sections/testimonials/TestimonialsSection.astro',
  PricingSection: 'src/components/sections/pricing/PricingSection.astro',
  FAQ: 'src/components/sections/misc/FAQ.astro',
  AnnouncementBanner: 'src/components/ui/banners/AnnouncementBanner.astro',
  Navbar: 'src/components/sections/navbar&footer/Navbar.astro',
  FooterSection: 'src/components/sections/navbar&footer/FooterSection.astro',
};

for (const name of KEY_COMPONENTS) {
  const p = componentPaths[name];
  const exists = p ? existsSync(resolve(root, p)) : false;
  check(exists, `Component ${name} exists (${p})`);
}

/* ---------- 2. Homepage section order ---------- */
console.log('\n--- Homepage Section Order ---');

const indexPath = resolve(root, 'src/pages/index.astro');
if (!existsSync(indexPath)) {
  check(false, 'Homepage index.astro exists');
  process.exit(1);
}

const indexContent = readFileSync(indexPath, 'utf-8');

// Extract section components in order from the template
const sectionOrderRegex = /<(\w+)\b/g;
const matches = [...indexContent.matchAll(sectionOrderRegex)];
const orderedComponents = matches
  .map(m => m[1])
  .filter(name =>
    [
      'AnnouncementBanner',
      'HeroSection',
      'HeroSectionAlt',
      'ClientsSection',
      'FeaturesGeneral',
      'FeaturesNavs',
      'TestimonialsSection',
      'PricingSection',
      'FAQ',
    ].includes(name)
  );

const EXPECTED_ORDER = [
  'AnnouncementBanner',
  'HeroSection',
  'ClientsSection',
  'FeaturesGeneral',
  'FeaturesNavs',
  'TestimonialsSection',
  'PricingSection',
  'FAQ',
  'HeroSectionAlt',
];

const pageOrder = JSON.stringify(orderedComponents);
const expectedOrder = JSON.stringify(EXPECTED_ORDER);
check(
  pageOrder === expectedOrder,
  `Homepage section order matches expected:\n    Expected: ${expectedOrder}\n    Got:      ${pageOrder}`
);

/* ---------- 3. No forbidden layout control fields in CMS models ---------- */
console.log('\n--- CMS Model Layout Control Fields ---');

const FORBIDDEN_FIELDS = [
  'cssClass',
  'className',
  'tailwind',
  'componentPath',
  'layoutClass',
];

// Check Strapi CMS content type schemas
const strapiSchemasDir = resolve(root, '..', 'product-sites-cms', 'src', 'api');
const contentTypesDir = resolve(
  root,
  '..',
  'product-sites-cms',
  'src',
  'components'
);

// Collect all schema.json files from both content types and components
function collectSchemaFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  try {
    const entries = readdirSync(dir, { recursive: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, String(entry));
      try {
        if (statSync(fullPath).isFile() && String(entry).endsWith('.json')) {
          results.push(fullPath);
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return results;
}

const schemaFiles = [
  ...collectSchemaFiles(strapiSchemasDir),
  ...collectSchemaFiles(contentTypesDir),
];

console.log(`  Found ${schemaFiles.length} schema files to scan`);

const filesWithForbidden = [];

for (const file of schemaFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    const lower = content.toLowerCase();
    for (const field of FORBIDDEN_FIELDS) {
      if (lower.includes(`"${field.toLowerCase()}"`)) {
        filesWithForbidden.push({ file, field });
      }
    }
  } catch {
    /* skip unreadable */
  }
}

if (filesWithForbidden.length > 0) {
  for (const { file, field } of filesWithForbidden) {
    console.error(`  FAIL: ${file} contains forbidden field "${field}"`);
  }
  failed = true;
} else {
  check(true, 'No CMS model contains forbidden fields');
}

/* ---------- 4. No hardcoded brands in production code ---------- */
console.log('\n--- Brand Hardcoding Scan ---');

// Scan key source files for hardcoded brand names
const FORBIDDEN_BRANDS = ['ScrewFast', 'MEITE', 'AussieSteel', 'screwfast.uk'];

function scanDirForBrands(dir, extensions = ['.astro', '.ts', '.tsx']) {
  const results = [];
  if (!existsSync(dir)) return results;
  try {
    const entries = readdirSync(dir, { recursive: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, String(entry));
      try {
        if (!statSync(fullPath).isFile()) continue;
        const ext = String(entry).substring(String(entry).lastIndexOf('.'));
        if (!extensions.includes(ext)) continue;
        // Skip test files, mock data, and seed data
        const relPath = fullPath.replace(root, '');
        if (
          relPath.includes('test-') ||
          relPath.includes('__tests__') ||
          relPath.includes('seed') ||
          relPath.includes('Mock') ||
          relPath.includes('mock') ||
          relPath.includes('node_modules') ||
          relPath.includes('dist')
        )
          continue;

        const content = readFileSync(fullPath, 'utf-8');
        for (const brand of FORBIDDEN_BRANDS) {
          if (content.includes(brand)) {
            results.push({ file: relPath, brand });
          }
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return results;
}

const brandViolations = scanDirForBrands(resolve(root, 'src'));
if (brandViolations.length > 0) {
  for (const { file, brand } of brandViolations) {
    console.error(`  FAIL: ${file} contains hardcoded brand "${brand}"`);
  }
  failed = true;
} else {
  check(true, 'No hardcoded brands in production source');
}

/* ---------- 5. Navbar Baseline Verification ---------- */
console.log('\n--- Navbar Baseline ---');

const navbarPath = 'src/components/sections/navbar&footer/Navbar.astro';
const navbarContent = fs.readFileSync(navbarPath, 'utf-8');

// Check Navbar FALLBACK has 5 items
const fallbackMatch = navbarContent.match(
  /const FALLBACK[^=]*=\s*\[([\s\S]*?)\];/
);
if (fallbackMatch) {
  const items = fallbackMatch[1];
  const labelMatches = [...items.matchAll(/label:\s*['"]([^'"]+)['"]/g)];
  const labels = labelMatches.map(m => m[1]);

  console.log(`  Navbar FALLBACK labels: ${JSON.stringify(labels)}`);

  // Check count
  if (labels.length === 5) {
    console.log(`  PASS: NAVBAR_BASELINE_ITEMS=5`);
  } else {
    console.error(
      `  FAIL: NAVBAR_BASELINE_ITEMS=${labels.length} (expected 5)`
    );
    failed = true;
  }

  // Check order
  const expectedNav = ['Home', 'Products', 'Services', 'Blog', 'Contact'];
  const orderMatch = expectedNav.every((label, i) => labels[i] === label);
  if (orderMatch) {
    console.log(
      `  PASS: Navbar baseline order correct: Home → Products → Services → Blog → Contact`
    );
  } else {
    console.error(
      `  FAIL: Navbar baseline order incorrect. Expected: ${JSON.stringify(expectedNav)}, Got: ${JSON.stringify(labels)}`
    );
    failed = true;
  }

  // Check no Support simplification
  if (
    labels.includes('Support') &&
    !labels.includes('Services') &&
    !labels.includes('Blog') &&
    !labels.includes('Contact')
  ) {
    console.error(
      `  FAIL: SUPPORT_SIMPLIFICATION_DETECTED — Navbar uses Support instead of Services/Blog/Contact`
    );
    failed = true;
  } else if (!labels.includes('Support')) {
    console.log(
      `  PASS: SUPPORT_SIMPLIFICATION_REMOVED — Support not in Navbar fallback`
    );
  }
} else {
  console.error(`  FAIL: Could not parse Navbar FALLBACK constant`);
  failed = true;
}

/* ---------- 6. Footer Baseline Verification ---------- */
console.log('\n--- Footer Baseline ---');

const footerPath = 'src/components/sections/navbar&footer/FooterSection.astro';
const footerContent = fs.readFileSync(footerPath, 'utf-8');

// Check for column structure in fallback
const ecosystemMatch =
  footerContent.includes('Ecosystem') || footerContent.includes('ecosystem');
const companyMatch =
  footerContent.includes('Company') || footerContent.includes('company');

if (ecosystemMatch && companyMatch) {
  console.log(
    `  PASS: FOOTER_BASELINE_COLUMNS — Ecosystem and Company columns present`
  );
} else {
  console.error(
    `  FAIL: FOOTER_BASELINE_COLUMNS — Ecosystem=${ecosystemMatch}, Company=${companyMatch}`
  );
  failed = true;
}

// Check for footer links
const footerLinks = [
  'Documentation',
  'Tools',
  'Equipment',
  'Construction Services',
  'About us',
  'Blog',
  'Careers',
  'Customers',
];
let foundLinks = 0;
footerLinks.forEach(link => {
  if (footerContent.includes(link)) foundLinks++;
});
if (foundLinks >= 7) {
  console.log(
    `  PASS: FOOTER_BASELINE_LINKS — ${foundLinks}/8 expected links found`
  );
} else {
  console.error(
    `  FAIL: FOOTER_BASELINE_LINKS — only ${foundLinks}/8 expected links found`
  );
  failed = true;
}

// Check social slots (5)
const socialMatches = footerContent.match(
  /social|Social|facebook|Facebook|github|GitHub|google|Google|slack|Slack/g
);
const socialCount = socialMatches
  ? new Set(socialMatches.map(s => s.toLowerCase())).size
  : 0;
if (socialCount >= 5) {
  console.log(
    `  PASS: FOOTER_SOCIAL_SLOTS=5 — ${socialCount} unique social platforms referenced`
  );
} else {
  console.error(
    `  FAIL: FOOTER_SOCIAL_SLOTS — only ${socialCount} unique social platforms (expected >=5)`
  );
  failed = true;
}

// Check newsletter area exists
const newsletterMatch =
  footerContent.includes('newsletter') ||
  footerContent.includes('Newsletter') ||
  footerContent.includes('Subscribe');
if (newsletterMatch) {
  console.log(`  PASS: Newsletter area preserved in footer`);
} else {
  console.error(`  FAIL: Newsletter area missing from footer`);
  failed = true;
}

/* ---------- 7. BrandViewModel: no domain field ---------- */
console.log('\n--- BRAND_DOMAIN_FIELD Check ---');

const brandModelsPath = resolve(root, 'src', 'lib', 'cms', 'brand-models.ts');
if (!existsSync(brandModelsPath)) {
  check(false, 'brand-models.ts exists');
} else {
  const brandModelsContent = readFileSync(brandModelsPath, 'utf-8');
  // Extract BrandViewModel interface body
  const bvmMatch = brandModelsContent.match(
    /export interface BrandViewModel\s*\{([\s\S]*?)\n\}/
  );
  if (!bvmMatch) {
    console.error('  FAIL: Could not parse BrandViewModel interface');
    failed = true;
  } else {
    const hasBrandDomain = bvmMatch[1].includes('domain');
    if (hasBrandDomain) {
      console.error(
        '  FAIL: BRAND_DOMAIN_FIELD=PRESENT — BrandViewModel has domain field (should be absent)'
      );
      failed = true;
    } else {
      console.log(
        '  PASS: BRAND_DOMAIN_FIELD=ABSENT — BrandViewModel has no domain field'
      );
    }
  }
}

/* ---------- 8. SiteViewModel: domain field present ---------- */
console.log('\n--- SITE_DOMAIN_FIELD Check ---');

const modelsPath = resolve(root, 'src', 'lib', 'cms', 'models.ts');
if (!existsSync(modelsPath)) {
  check(false, 'models.ts exists');
} else {
  const modelsContent = readFileSync(modelsPath, 'utf-8');
  // Extract SiteViewModel interface body
  const svmMatch = modelsContent.match(
    /export interface SiteViewModel\s*\{([\s\S]*?)\n\}/
  );
  if (!svmMatch) {
    console.error('  FAIL: Could not parse SiteViewModel interface');
    failed = true;
  } else {
    const hasSiteDomain = svmMatch[1].includes('domain');
    if (hasSiteDomain) {
      console.log(
        '  PASS: SITE_DOMAIN_FIELD=PRESENT — SiteViewModel has domain field'
      );
    } else {
      console.error(
        '  FAIL: SITE_DOMAIN_FIELD=ABSENT — SiteViewModel missing domain field'
      );
      failed = true;
    }
  }
}

/* ---------- 9. No fabricated SEO descriptions ---------- */
console.log('\n--- FABRICATED_SEO_DESCRIPTION Check ---');

const brandSchemasPath = resolve(root, 'src', 'lib', 'cms', 'brand-schemas.ts');
const schemasPath = resolve(root, 'src', 'lib', 'cms', 'schemas.ts');

const fabricatedSeoPattern = /Official website for/i;

const seoFiles = [];
if (existsSync(brandSchemasPath)) {
  const brandSchemasContent = readFileSync(brandSchemasPath, 'utf-8');
  if (fabricatedSeoPattern.test(brandSchemasContent)) {
    seoFiles.push('brand-schemas.ts');
  }
}
if (existsSync(schemasPath)) {
  const schemasContent = readFileSync(schemasPath, 'utf-8');
  if (fabricatedSeoPattern.test(schemasContent)) {
    seoFiles.push('schemas.ts');
  }
}

if (seoFiles.length > 0) {
  for (const f of seoFiles) {
    console.error(
      `  FAIL: FABRICATED_SEO_DESCRIPTION=PRESENT — "${f}" contains fabricated SEO description`
    );
  }
  failed = true;
} else {
  console.log(
    '  PASS: FABRICATED_SEO_DESCRIPTION=ABSENT — no fabricated SEO descriptions in CMS schemas'
  );
}

/* ---------- Result ---------- */
console.log('');
if (failed) {
  console.error('Theme preservation test FAILED');
  process.exit(1);
}
console.log('Theme preservation test PASSED');
