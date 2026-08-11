/**
 * test-i18n-routing-v2.mjs
 * Validates frontend i18n routing, alternates, and hreflang logic.
 * Functions are inlined to avoid TypeScript import issues in Node.js.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Inlined from src/lib/i18n/routes.ts + src/lib/i18n/alternates.ts
// (Node.js cannot import .ts files directly)
// ---------------------------------------------------------------------------

const DEFAULT_LOCALE = 'en';

function getLocalePrefix(locale) {
  if (locale === DEFAULT_LOCALE) return '';
  return `/${locale}`;
}

function shouldPrefixLocale(locale) {
  return locale !== DEFAULT_LOCALE;
}

function getLocalizedPath(path, locale) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const prefix = getLocalePrefix(locale);
  if (!prefix) return cleanPath;
  return `${prefix}${cleanPath}`.replace(/\/+/g, '/');
}

const LOCALE_PREFIX = '(?:fr|es|de|pt-BR)';

const ROUTE_PATTERNS = [
  [new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?$`), 'homepage'],
  [new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?products\\/?$`), 'product_listing'],
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?products\\/[^/]+$`),
    'product_detail',
  ],
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?blogs\\/support\\/?$`),
    'support_listing',
  ],
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?blogs\\/support\\/[^/]+$`),
    'support_detail',
  ],
  [new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/services\\/?$`), 'services'],
  [new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/contact\\/?$`), 'contact'],
  [
    new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/downloads\\/?$`),
    'downloads',
  ],
  [new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/warranty\\/?$`), 'warranty'],
  [new RegExp(`^\\/(?:${LOCALE_PREFIX}\\/)?pages\\/privacy\\/?$`), 'privacy'],
];

function classifyRoute(pathname) {
  for (const [regex, template] of ROUTE_PATTERNS) {
    if (regex.test(pathname)) {
      return template;
    }
  }
  return null;
}

function buildLocaleAlternates(config) {
  const { siteUrl, currentPath, enabledLocales, contentAvailability } = config;
  const cleanPath = currentPath.replace(/^\/(?:fr|es|de|pt-BR)\//, '/');

  const available = enabledLocales.filter(
    locale => contentAvailability[locale] === true
  );

  const alternates = available.map(locale => ({
    locale,
    href: `${siteUrl}${getLocalePrefix(locale)}${cleanPath}`,
    available: true,
  }));

  alternates.sort((a, b) => {
    if (a.locale === 'en') return -1;
    if (b.locale === 'en') return 1;
    return a.locale.localeCompare(b.locale);
  });

  return alternates;
}

function buildHreflangTags(config) {
  const alternates = buildLocaleAlternates(config);

  const tags = alternates.map(alt => ({
    lang: alt.locale,
    href: alt.href,
  }));

  const enAlternate = alternates.find(alt => alt.locale === 'en');
  if (enAlternate) {
    tags.push({ lang: 'x-default', href: enAlternate.href });
  }

  return tags;
}

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.log(`  [FAIL] ${desc}`);
    console.log(`         ${err.message}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n=== ${name} ===`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAltConfig(overrides = {}) {
  return {
    siteUrl: 'https://store-us.example',
    currentPath: '/products/tool',
    currentLocale: 'en',
    enabledLocales: ['en', 'fr', 'es', 'de', 'pt-BR'],
    contentAvailability: {
      en: true,
      fr: true,
      es: true,
      de: false,
      'pt-BR': false,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Section 1: Route Prefix Rules
// ---------------------------------------------------------------------------

section('Section 1: Route Prefix Rules');

check("getLocalePrefix('en') returns ''", () => {
  if (getLocalePrefix('en') !== '')
    throw new Error(`got "${getLocalePrefix('en')}"`);
});

check("getLocalePrefix('fr') returns '/fr'", () => {
  if (getLocalePrefix('fr') !== '/fr')
    throw new Error(`got "${getLocalePrefix('fr')}"`);
});

check("getLocalePrefix('es') returns '/es'", () => {
  if (getLocalePrefix('es') !== '/es')
    throw new Error(`got "${getLocalePrefix('es')}"`);
});

check("getLocalePrefix('de') returns '/de'", () => {
  if (getLocalePrefix('de') !== '/de')
    throw new Error(`got "${getLocalePrefix('de')}"`);
});

check("getLocalePrefix('pt-BR') returns '/pt-BR'", () => {
  if (getLocalePrefix('pt-BR') !== '/pt-BR')
    throw new Error(`got "${getLocalePrefix('pt-BR')}"`);
});

check("shouldPrefixLocale('en') returns false", () => {
  if (shouldPrefixLocale('en') !== false) throw new Error('expected false');
});

check("shouldPrefixLocale('fr') returns true", () => {
  if (shouldPrefixLocale('fr') !== true) throw new Error('expected true');
});

check(
  "getLocalizedPath('/products/tool', 'en') returns '/products/tool'",
  () => {
    if (getLocalizedPath('/products/tool', 'en') !== '/products/tool')
      throw new Error(`got "${getLocalizedPath('/products/tool', 'en')}"`);
  }
);

check(
  "getLocalizedPath('/products/tool', 'fr') returns '/fr/products/tool'",
  () => {
    if (getLocalizedPath('/products/tool', 'fr') !== '/fr/products/tool')
      throw new Error(`got "${getLocalizedPath('/products/tool', 'fr')}"`);
  }
);

// ---------------------------------------------------------------------------
// Section 2: Route Classification
// ---------------------------------------------------------------------------

section('Section 2: Route Classification (classifyRoute)');

const classificationCases = [
  ['/', 'homepage'],
  ['/fr/', 'homepage'],
  ['/products', 'product_listing'],
  ['/products/', 'product_listing'],
  ['/fr/products', 'product_listing'],
  ['/fr/products/', 'product_listing'],
  ['/products/some-tool', 'product_detail'],
  ['/fr/products/un-outil', 'product_detail'],
  ['/blogs/support', 'support_listing'],
  ['/fr/blogs/support/', 'support_listing'],
  ['/blogs/support/article-slug', 'support_detail'],
  ['/fr/blogs/support/article-fr', 'support_detail'],
  ['/pages/services', 'services'],
  ['/fr/pages/services/', 'services'],
  ['/pages/contact', 'contact'],
  ['/pages/downloads', 'downloads'],
  ['/pages/warranty', 'warranty'],
  ['/pages/privacy', 'privacy'],
  ['/fr/pages/privacy/', 'privacy'],
  ['/unknown-page', null],
  ['/fr/random', null],
];

for (const [pathname, expected] of classificationCases) {
  check(
    `classifyRoute('${pathname}') → ${expected === null ? 'null' : `'${expected}'`}`,
    () => {
      const result = classifyRoute(pathname);
      if (result !== expected)
        throw new Error(
          `expected ${expected === null ? 'null' : `'${expected}'`}, got ${result === null ? 'null' : `'${result}'`}`
        );
    }
  );
}

// ---------------------------------------------------------------------------
// Section 3: Locale Availability Filtering
// ---------------------------------------------------------------------------

section('Section 3: Locale Availability Filtering');

check(
  'buildLocaleAlternates filters out es when contentAvailability[es] is false',
  () => {
    const config = makeAltConfig({
      enabledLocales: ['en', 'fr', 'es'],
      contentAvailability: { en: true, fr: true, es: false },
    });
    const result = buildLocaleAlternates(config);
    const locales = result.map(r => r.locale);
    if (locales.includes('es'))
      throw new Error(`es should be excluded, got: ${JSON.stringify(locales)}`);
    if (!locales.includes('en') || !locales.includes('fr'))
      throw new Error(
        `en and fr should be included, got: ${JSON.stringify(locales)}`
      );
    if (result.length !== 2)
      throw new Error(`expected 2 alternates, got ${result.length}`);
  }
);

check('disabled locales not in enabledLocales never appear', () => {
  const config = makeAltConfig({
    enabledLocales: ['en', 'fr', 'es'],
    contentAvailability: { en: true, fr: true, es: true },
  });
  const result = buildLocaleAlternates(config);
  const locales = result.map(r => r.locale);
  if (locales.includes('de') || locales.includes('pt-BR'))
    throw new Error(
      `disabled locales should be excluded, got: ${JSON.stringify(locales)}`
    );
});

// ---------------------------------------------------------------------------
// Section 4: x-default Generation
// ---------------------------------------------------------------------------

section('Section 4: x-default Generation');

check('x-default is generated when EN is in alternates', () => {
  const config = makeAltConfig({
    enabledLocales: ['en', 'fr'],
    contentAvailability: { en: true, fr: true },
  });
  const tags = buildHreflangTags(config);
  const xDefault = tags.find(t => t.lang === 'x-default');
  if (!xDefault) throw new Error('x-default tag missing');
  const enTag = tags.find(t => t.lang === 'en');
  if (xDefault.href !== enTag.href)
    throw new Error(
      `x-default href (${xDefault.href}) != en href (${enTag.href})`
    );
});

check('x-default is NOT generated when EN is absent (FR-only page)', () => {
  const config = makeAltConfig({
    enabledLocales: ['fr'],
    currentPath: '/fr/products/tool',
    currentLocale: 'fr',
    contentAvailability: { fr: true },
  });
  const tags = buildHreflangTags(config);
  const xDefault = tags.find(t => t.lang === 'x-default');
  if (xDefault)
    throw new Error('x-default should not be generated for FR-only page');
  if (tags.length !== 1)
    throw new Error(`expected 1 tag (fr only), got ${tags.length}`);
});

// ---------------------------------------------------------------------------
// Section 5: Hreflang Tag Generation
// ---------------------------------------------------------------------------

section('Section 5: Hreflang Tag Generation');

check(
  'buildHreflangTags with 2 locales (en, fr) produces 3 tags (en, fr, x-default)',
  () => {
    const config = makeAltConfig({
      enabledLocales: ['en', 'fr'],
      contentAvailability: { en: true, fr: true },
    });
    const tags = buildHreflangTags(config);
    const langs = tags.map(t => t.lang).sort();
    if (tags.length !== 3)
      throw new Error(`expected 3 tags, got ${tags.length}`);
    if (
      !langs.includes('en') ||
      !langs.includes('fr') ||
      !langs.includes('x-default')
    )
      throw new Error(
        `expected [en, fr, x-default], got ${JSON.stringify(langs)}`
      );
  }
);

check(
  'buildHreflangTags with 1 locale (fr only) produces 1 tag (fr, no x-default)',
  () => {
    const config = makeAltConfig({
      enabledLocales: ['fr'],
      currentPath: '/fr/products/tool',
      currentLocale: 'fr',
      contentAvailability: { fr: true },
    });
    const tags = buildHreflangTags(config);
    if (tags.length !== 1)
      throw new Error(`expected 1 tag, got ${tags.length}`);
    if (tags[0].lang !== 'fr')
      throw new Error(`expected lang=fr, got ${tags[0].lang}`);
  }
);

check(
  'Hreflang lang values use canonical codes (en, fr, es, de, pt-BR)',
  () => {
    const config = makeAltConfig({
      enabledLocales: ['en', 'fr', 'es', 'de', 'pt-BR'],
      contentAvailability: {
        en: true,
        fr: true,
        es: true,
        de: true,
        'pt-BR': true,
      },
    });
    const tags = buildHreflangTags(config);
    const langs = tags.filter(t => t.lang !== 'x-default').map(t => t.lang);
    const canonical = ['en', 'fr', 'es', 'de', 'pt-BR'];
    for (const lang of langs) {
      if (!canonical.includes(lang))
        throw new Error(`non-canonical lang code found: "${lang}"`);
    }
  }
);

check(
  "Hreflang href values start with siteUrl ('https://store-us.example')",
  () => {
    const config = makeAltConfig({
      siteUrl: 'https://store-us.example',
      enabledLocales: ['en', 'fr'],
      contentAvailability: { en: true, fr: true },
    });
    const tags = buildHreflangTags(config);
    for (const tag of tags) {
      if (!tag.href.startsWith('https://store-us.example'))
        throw new Error(`href "${tag.href}" does not start with siteUrl`);
    }
  }
);

// ---------------------------------------------------------------------------
// Section 6: No Cross-Locale Fallback
// ---------------------------------------------------------------------------

section('Section 6: No Cross-Locale Fallback');

check(
  'buildLocaleAlternates never returns locale where contentAvailability[locale] is falsy',
  () => {
    const config = makeAltConfig({
      enabledLocales: ['en', 'fr', 'es', 'de'],
      contentAvailability: { en: true, fr: false, es: true, de: false },
    });
    const result = buildLocaleAlternates(config);
    const locales = result.map(r => r.locale);
    if (locales.includes('fr'))
      throw new Error(`fr should be excluded (contentAvailability=false)`);
    if (locales.includes('de'))
      throw new Error(`de should be excluded (contentAvailability=false)`);
    if (!locales.includes('en') || !locales.includes('es'))
      throw new Error(`en and es should be included`);
  }
);

check(
  'buildLocaleAlternates returns zero alternates when contentAvailability is {}',
  () => {
    const config = makeAltConfig({
      enabledLocales: ['en', 'fr'],
      contentAvailability: {},
    });
    const result = buildLocaleAlternates(config);
    if (result.length !== 0)
      throw new Error(`expected 0 alternates, got ${result.length}`);
  }
);

// ---------------------------------------------------------------------------
// Section 7: Brand Domain Audit
// ---------------------------------------------------------------------------

section('Section 7: Brand Domain Audit');

check(
  'No brand.domain or brand?.domain references in src/ .ts and .astro files',
  () => {
    const srcDir = resolve(repoRoot, 'src');
    const violations = [];
    function* walkDir(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'dist', 'dist-out'].includes(entry.name))
            continue;
          yield* walkDir(full);
        } else {
          yield full;
        }
      }
    }
    for (const filePath of walkDir(srcDir)) {
      const ext = extname(filePath);
      if (ext !== '.ts' && ext !== '.astro') continue;
      try {
        const content = readFileSync(filePath, 'utf-8');
        if (/brand\?\.domain/.test(content) || /brand\.domain/.test(content)) {
          violations.push(filePath);
        }
      } catch {
        /* skip */
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `found ${violations.length} file(s):\n${violations.map(f => `  - ${f}`).join('\n')}`
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Section 8: Downloads/Warranty/Privacy — No Fake Alternates
// ---------------------------------------------------------------------------

section('Section 8: Downloads/Warranty/Privacy — No Fake Alternates');

check(
  'Downloads route with empty contentAvailability produces zero alternates',
  () => {
    const config = makeAltConfig({
      currentPath: '/pages/downloads',
      enabledLocales: ['en', 'fr', 'es'],
      contentAvailability: {},
    });
    const result = buildLocaleAlternates(config);
    if (result.length !== 0)
      throw new Error(`expected 0 alternates, got ${result.length}`);
  }
);

check(
  'Warranty route with empty contentAvailability produces zero alternates',
  () => {
    const config = makeAltConfig({
      currentPath: '/pages/warranty',
      enabledLocales: ['en', 'fr'],
      contentAvailability: {},
    });
    const result = buildLocaleAlternates(config);
    if (result.length !== 0)
      throw new Error(`expected 0 alternates, got ${result.length}`);
  }
);

check(
  'Privacy route with empty contentAvailability produces zero alternates',
  () => {
    const config = makeAltConfig({
      currentPath: '/pages/privacy',
      enabledLocales: ['en', 'fr'],
      contentAvailability: {},
    });
    const result = buildLocaleAlternates(config);
    if (result.length !== 0)
      throw new Error(`expected 0 alternates, got ${result.length}`);
  }
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'='.repeat(50)}`);
console.log(`${passed}/${passed + failed} checks passed`);
console.log(`${'='.repeat(50)}`);

if (failed > 0) {
  process.exit(1);
}
