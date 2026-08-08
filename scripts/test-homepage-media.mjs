/**
 * Homepage Media Contract Test
 *
 * A comprehensive, self-contained test script for the homepage media-related
 * functions and contracts. No mock server required — tests pure logic directly.
 *
 * Usage: node scripts/test-homepage-media.mjs
 */

// ────────────────────────────────────────────────────────────
// Inline implementations (mirrors src/lib/cms/media.ts)
// ────────────────────────────────────────────────────────────

/**
 * Resolve a Strapi media URL to an absolute URL.
 *
 * - null / undefined / empty → undefined
 * - `/uploads/...` → prepend cmsOrigin (trailing slash stripped)
 * - `http://` / `https://` → return as-is
 * - `javascript:`, `data:`, `file:` → undefined (unsafe)
 */
function resolveCmsMediaUrl(url, cmsOrigin) {
  if (!url || url.trim() === '') {
    return undefined;
  }

  // Block unsafe protocols
  if (
    url.startsWith('javascript:') ||
    url.startsWith('data:') ||
    url.startsWith('file:')
  ) {
    return undefined;
  }

  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative upload path — prepend CMS origin
  if (url.startsWith('/uploads/')) {
    const origin = cmsOrigin.replace(/\/+$/, '');
    return `${origin}${url}`;
  }

  // Anything else is unsupported
  return undefined;
}

/**
 * Sanitize a URL — only accept http:// and https:// protocols.
 * Rejects javascript:, data:, file:, and any other protocol.
 * Returns undefined for null / empty input.
 */
function sanitizeCmsMediaUrl(url) {
  if (!url || url.trim() === '') {
    return undefined;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return undefined;
}

/**
 * Resolve a CMS media URL, then sanitize the result.
 */
function resolveMediaUrl(url, cmsOrigin) {
  const resolved = resolveCmsMediaUrl(url, cmsOrigin);
  return sanitizeCmsMediaUrl(resolved);
}

/**
 * Convert a raw CMS media object to a normalized CmsMediaView.
 *
 * - null / undefined raw → null
 * - empty raw.url → null
 * - alt priority: raw.alternativeText → explicitAlt → ''
 * - width / height from raw if present
 */
function toCmsMediaView(raw, explicitAlt) {
  if (!raw || !raw.url || raw.url.trim() === '') {
    return null;
  }

  const alt = raw.alternativeText ?? explicitAlt ?? '';

  const view = { url: raw.url, alt };

  if (raw.width !== undefined) {
    view.width = raw.width;
  }
  if (raw.height !== undefined) {
    view.height = raw.height;
  }

  return view;
}

// ────────────────────────────────────────────────────────────
// Inline: buildHomepageQuery (mirrors src/lib/cms/homepage-queries.ts)
// ────────────────────────────────────────────────────────────

function buildHomepageQuery(siteKey, locale) {
  const parts = [];

  // Filters
  parts.push(`filters[site][key][$eq]=${encodeURIComponent(siteKey)}`);
  parts.push(`locale=${encodeURIComponent(locale)}`);
  parts.push('status=published');
  parts.push('pagination[pageSize]=1');

  // Explicit nested populate for all media and repeatable component fields
  parts.push('populate[hero][populate][image]=true');
  parts.push('populate[hero][populate][avatars]=true');
  parts.push('populate[clients][populate][partners][populate][logo]=true');
  parts.push('populate[featuresGeneral][populate][image]=true');
  parts.push('populate[featuresGeneral][populate][items]=true');
  parts.push('populate[featuresNavs][populate][tabs][populate][image]=true');
  parts.push('populate[testimonials][populate][items][populate][avatar]=true');
  parts.push('populate[testimonials][populate][statistics]=true');
  parts.push('populate[pricing][populate][starterKit]=true');
  parts.push('populate[pricing][populate][professionalToolbox]=true');
  parts.push('populate[faq][populate][items]=true');
  parts.push('populate[announcement]=true');
  parts.push('populate[bottomCta]=true');
  parts.push('populate[seo]=true');

  return `/api/homepages?${parts.join('&')}`;
}

// ────────────────────────────────────────────────────────────
// Inline: resolveMedia (mirrors src/lib/homepage/homepage-resolver.ts)
// ────────────────────────────────────────────────────────────

/**
 * Resolve a single media field: CMS non-null with non-empty url → CMS, else → baseline.
 */
function resolveMedia(cmsMedia, baselineMedia) {
  if (cmsMedia && cmsMedia.url && cmsMedia.url.trim() !== '') {
    return cmsMedia;
  }
  return baselineMedia;
}

// ────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────

let passed = 0;
let total = 0;

function check(condition, msg) {
  total++;
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(`[FAIL] ${msg}`);
  }
}

function assertEqual(actual, expected, msg) {
  total++;
  if (actual === expected) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(
      `[FAIL] ${msg} - expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
    );
  }
}

function assertDeepEqual(actual, expected, msg) {
  total++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(`[FAIL] ${msg} - expected ${e} but got ${a}`);
  }
}

// ────────────────────────────────────────────────────────────
// Test 1: resolveCmsMediaUrl — relative URL normalization
// ────────────────────────────────────────────────────────────

console.log(
  '\n═══ Test 1: resolveCmsMediaUrl — relative URL normalization ═══'
);

assertEqual(
  resolveCmsMediaUrl('/uploads/hero.jpg', 'http://127.0.0.1:1337'),
  'http://127.0.0.1:1337/uploads/hero.jpg',
  '/uploads/hero.jpg → http://127.0.0.1:1337/uploads/hero.jpg'
);

assertEqual(
  resolveCmsMediaUrl('/uploads/hero.jpg', 'http://127.0.0.1:1337/'),
  'http://127.0.0.1:1337/uploads/hero.jpg',
  '/uploads/hero.jpg → strips trailing slash from cmsOrigin'
);

assertEqual(
  resolveCmsMediaUrl('/uploads/deep/nested/img.png', 'http://127.0.0.1:1337'),
  'http://127.0.0.1:1337/uploads/deep/nested/img.png',
  'nested upload path preserved'
);

// ────────────────────────────────────────────────────────────
// Test 2: resolveCmsMediaUrl — null/empty/undefined
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 2: resolveCmsMediaUrl — null/empty/undefined ═══');

assertEqual(
  resolveCmsMediaUrl(null, 'http://127.0.0.1:1337'),
  undefined,
  'null → undefined'
);

assertEqual(
  resolveCmsMediaUrl(undefined, 'http://127.0.0.1:1337'),
  undefined,
  'undefined → undefined'
);

assertEqual(
  resolveCmsMediaUrl('', 'http://127.0.0.1:1337'),
  undefined,
  "'' → undefined"
);

assertEqual(
  resolveCmsMediaUrl('   ', 'http://127.0.0.1:1337'),
  undefined,
  'whitespace-only → undefined'
);

// ────────────────────────────────────────────────────────────
// Test 3: resolveCmsMediaUrl — absolute URL preservation
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 3: resolveCmsMediaUrl — absolute URL preservation ═══');

assertEqual(
  resolveCmsMediaUrl(
    'https://cdn.example.com/img.jpg',
    'http://127.0.0.1:1337'
  ),
  'https://cdn.example.com/img.jpg',
  'https:// URL preserved as-is'
);

assertEqual(
  resolveCmsMediaUrl('http://cdn.example.com/img.jpg', 'http://127.0.0.1:1337'),
  'http://cdn.example.com/img.jpg',
  'http:// URL preserved as-is'
);

assertEqual(
  resolveCmsMediaUrl(
    'https://images.unsplash.com/photo.jpg?w=300&h=300&q=80',
    'http://127.0.0.1:1337'
  ),
  'https://images.unsplash.com/photo.jpg?w=300&h=300&q=80',
  'https:// URL with query string preserved'
);

// ────────────────────────────────────────────────────────────
// Test 4: resolveCmsMediaUrl — unsafe protocol rejection
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 4: resolveCmsMediaUrl — unsafe protocol rejection ═══');

assertEqual(
  resolveCmsMediaUrl('javascript:alert(1)', 'http://127.0.0.1:1337'),
  undefined,
  'javascript: → undefined'
);

assertEqual(
  resolveCmsMediaUrl(
    'data:text/html,<script>alert(1)</script>',
    'http://127.0.0.1:1337'
  ),
  undefined,
  'data: → undefined'
);

assertEqual(
  resolveCmsMediaUrl('file:///etc/passwd', 'http://127.0.0.1:1337'),
  undefined,
  'file: → undefined'
);

assertEqual(
  resolveCmsMediaUrl('javascript:void(0)', 'http://127.0.0.1:1337'),
  undefined,
  'javascript:void(0) → undefined'
);

// ────────────────────────────────────────────────────────────
// Test 5: resolveCmsMediaUrl — unsupported relative paths
// ────────────────────────────────────────────────────────────

console.log(
  '\n═══ Test 5: resolveCmsMediaUrl — unsupported relative paths ═══'
);

assertEqual(
  resolveCmsMediaUrl('/images/hero.jpg', 'http://127.0.0.1:1337'),
  undefined,
  '/images/ (not /uploads/) → undefined'
);

assertEqual(
  resolveCmsMediaUrl('./relative.jpg', 'http://127.0.0.1:1337'),
  undefined,
  './relative → undefined'
);

assertEqual(
  resolveCmsMediaUrl(
    'ftp://files.example.com/img.jpg',
    'http://127.0.0.1:1337'
  ),
  undefined,
  'ftp:// → undefined'
);

// ────────────────────────────────────────────────────────────
// Test 6: sanitizeCmsMediaUrl
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 6: sanitizeCmsMediaUrl ═══');

assertEqual(
  sanitizeCmsMediaUrl('http://ok.com'),
  'http://ok.com',
  'http:// → http://'
);

assertEqual(
  sanitizeCmsMediaUrl('https://ok.com'),
  'https://ok.com',
  'https:// → https://'
);

assertEqual(
  sanitizeCmsMediaUrl('javascript:alert(1)'),
  undefined,
  'javascript: → undefined'
);

assertEqual(
  sanitizeCmsMediaUrl('ftp://files.example.com'),
  undefined,
  'ftp:// → undefined'
);

assertEqual(
  sanitizeCmsMediaUrl('data:text/html,<script>'),
  undefined,
  'data: → undefined'
);

assertEqual(
  sanitizeCmsMediaUrl('file:///etc/passwd'),
  undefined,
  'file: → undefined'
);

assertEqual(sanitizeCmsMediaUrl(null), undefined, 'null → undefined');

assertEqual(sanitizeCmsMediaUrl(undefined), undefined, 'undefined → undefined');

assertEqual(sanitizeCmsMediaUrl(''), undefined, "'' → undefined");

assertEqual(
  sanitizeCmsMediaUrl('   '),
  undefined,
  'whitespace-only → undefined'
);

// ────────────────────────────────────────────────────────────
// Test 7: resolveMediaUrl (combined resolve + sanitize)
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 7: resolveMediaUrl (combined resolve + sanitize) ═══');

assertEqual(
  resolveMediaUrl('/uploads/hero.jpg', 'http://127.0.0.1:1337'),
  'http://127.0.0.1:1337/uploads/hero.jpg',
  '/uploads/hero.jpg → sanitized http URL'
);

assertEqual(
  resolveMediaUrl('https://cdn.example.com/img.jpg', 'http://127.0.0.1:1337'),
  'https://cdn.example.com/img.jpg',
  'https:// URL → sanitized https URL'
);

assertEqual(
  resolveMediaUrl('/images/not-upload.jpg', 'http://127.0.0.1:1337'),
  undefined,
  '/images/ (unsupported path) → sanitized to undefined'
);

assertEqual(
  resolveMediaUrl('javascript:alert(1)', 'http://127.0.0.1:1337'),
  undefined,
  'javascript: → sanitized to undefined'
);

// ────────────────────────────────────────────────────────────
// Test 8: toCmsMediaView — null/empty handling
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 8: toCmsMediaView — null/empty handling ═══');

assertEqual(toCmsMediaView(null, null), null, 'null → null');

assertEqual(toCmsMediaView(undefined, null), null, 'undefined → null');

assertEqual(toCmsMediaView({ url: '' }, null), null, '{ url: "" } → null');

assertEqual(
  toCmsMediaView({ url: '   ' }, null),
  null,
  '{ url: "   " } → null'
);

// ────────────────────────────────────────────────────────────
// Test 9: toCmsMediaView — alt text priority
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 9: toCmsMediaView — alt text priority ═══');

assertDeepEqual(
  toCmsMediaView({ url: '/uploads/a.jpg', alternativeText: 'Alt' }, null),
  { url: '/uploads/a.jpg', alt: 'Alt' },
  '{ url, alternativeText: "Alt" } → alt="Alt"'
);

assertDeepEqual(
  toCmsMediaView({ url: '/uploads/a.jpg' }, 'Explicit'),
  { url: '/uploads/a.jpg', alt: 'Explicit' },
  '{ url } with explicitAlt "Explicit" → alt="Explicit"'
);

assertDeepEqual(
  toCmsMediaView({ url: '/uploads/a.jpg', alternativeText: 'Alt' }, 'Explicit'),
  { url: '/uploads/a.jpg', alt: 'Alt' },
  'alternativeText "Alt" takes priority over explicitAlt "Explicit"'
);

assertDeepEqual(
  toCmsMediaView({ url: '/uploads/a.jpg' }, null),
  { url: '/uploads/a.jpg', alt: '' },
  'no alt text → alt=""'
);

assertDeepEqual(
  toCmsMediaView({ url: '/uploads/a.jpg' }, ''),
  { url: '/uploads/a.jpg', alt: '' },
  'explicitAlt "" → alt=""'
);

// ────────────────────────────────────────────────────────────
// Test 10: toCmsMediaView — width/height preservation
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 10: toCmsMediaView — width/height preservation ═══');

assertDeepEqual(
  toCmsMediaView({ url: '/uploads/a.jpg', width: 800, height: 600 }, null),
  { url: '/uploads/a.jpg', alt: '', width: 800, height: 600 },
  'width and height preserved'
);

assertDeepEqual(
  toCmsMediaView({ url: '/uploads/a.jpg', width: 800 }, null),
  { url: '/uploads/a.jpg', alt: '', width: 800 },
  'only width preserved'
);

assertDeepEqual(
  toCmsMediaView({ url: '/uploads/a.jpg', height: 600 }, null),
  { url: '/uploads/a.jpg', alt: '', height: 600 },
  'only height preserved'
);

assertDeepEqual(
  toCmsMediaView({ url: '/uploads/a.jpg', width: 0, height: 0 }, null),
  { url: '/uploads/a.jpg', alt: '', width: 0, height: 0 },
  'zero width/height preserved (falsy but defined)'
);

// ────────────────────────────────────────────────────────────
// Test 11: Media fallback — resolveMedia (hero image)
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 11: Media fallback — resolveMedia (hero image) ═══');

const baselineHeroImage = {
  url: '/src/assets/images/hero-image.avif',
  alt: 'Baseline hero',
};
const cmsHeroWithUrl = { url: '/uploads/cms-hero.jpg', alt: 'CMS hero' };
const cmsHeroEmpty = { url: '', alt: '' };
const cmsHeroNull = null;

assertDeepEqual(
  resolveMedia(cmsHeroWithUrl, baselineHeroImage),
  cmsHeroWithUrl,
  'CMS hero.image with url → use CMS'
);

assertDeepEqual(
  resolveMedia(cmsHeroEmpty, baselineHeroImage),
  baselineHeroImage,
  'CMS hero.image with empty url → use baseline'
);

assertDeepEqual(
  resolveMedia(cmsHeroNull, baselineHeroImage),
  baselineHeroImage,
  'CMS hero.image null → use baseline'
);

assertDeepEqual(
  resolveMedia(undefined, baselineHeroImage),
  baselineHeroImage,
  'CMS hero.image undefined → use baseline'
);

// ────────────────────────────────────────────────────────────
// Test 12: Media fallback — resolveMedia (testimonial avatar)
// ────────────────────────────────────────────────────────────

console.log(
  '\n═══ Test 12: Media fallback — resolveMedia (testimonial avatar) ═══'
);

const baselineAvatar = {
  url: 'https://images.unsplash.com/photo.jpg',
  alt: '',
};
const cmsAvatarWithUrl = { url: '/uploads/cms-avatar.jpg', alt: 'CMS avatar' };
const cmsAvatarEmpty = { url: '', alt: '' };

assertDeepEqual(
  resolveMedia(cmsAvatarWithUrl, baselineAvatar),
  cmsAvatarWithUrl,
  'CMS avatar with url → use CMS'
);

assertDeepEqual(
  resolveMedia(cmsAvatarEmpty, baselineAvatar),
  baselineAvatar,
  'CMS avatar with empty url → use baseline avatar'
);

assertDeepEqual(
  resolveMedia(null, baselineAvatar),
  baselineAvatar,
  'CMS avatar null → use baseline'
);

// ────────────────────────────────────────────────────────────
// Test 13: Media fallback — resolveMedia (feature image)
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 13: Media fallback — resolveMedia (feature image) ═══');

const baselineFeatureImage = {
  url: '/src/assets/images/features-image.avif',
  alt: 'Baseline feature',
};
const cmsFeatureWithUrl = {
  url: '/uploads/cms-feature.jpg',
  alt: 'CMS feature',
};

assertDeepEqual(
  resolveMedia(cmsFeatureWithUrl, baselineFeatureImage),
  cmsFeatureWithUrl,
  'CMS featuresGeneral.image with url → use CMS'
);

assertDeepEqual(
  resolveMedia(null, baselineFeatureImage),
  baselineFeatureImage,
  'CMS featuresGeneral.image null → use baseline'
);

// ────────────────────────────────────────────────────────────
// Test 14: Media fallback — resolveMedia (tab image by iconKey)
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 14: Media fallback — resolveMedia (tab image) ═══');

const baselineToolsImage = {
  url: '/src/assets/images/automated-tools.avif',
  alt: 'Tools',
};
const baselineDashboardImage = {
  url: '/src/assets/images/dashboard-image.avif',
  alt: 'Dashboard',
};
const baselineConstructionImage = {
  url: '/src/assets/images/construction-image.avif',
  alt: 'Construction',
};
const cmsTabWithImage = { url: '/uploads/cms-tab.jpg', alt: 'CMS tab' };

// tools iconKey → tools baseline image
assertDeepEqual(
  resolveMedia(null, baselineToolsImage),
  baselineToolsImage,
  'tools tab: CMS null → baseline tools image'
);

// dashboard iconKey → dashboard baseline image
assertDeepEqual(
  resolveMedia(null, baselineDashboardImage),
  baselineDashboardImage,
  'dashboard tab: CMS null → baseline dashboard image'
);

// house iconKey → construction baseline image
assertDeepEqual(
  resolveMedia(null, baselineConstructionImage),
  baselineConstructionImage,
  'house tab: CMS null → baseline construction image'
);

// CMS provides image → use CMS
assertDeepEqual(
  resolveMedia(cmsTabWithImage, baselineToolsImage),
  cmsTabWithImage,
  'tools tab: CMS with url → use CMS image'
);

// ────────────────────────────────────────────────────────────
// Test 15: Media fallback — resolveMedia (partner logo)
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 15: Media fallback — resolveMedia (partner logo) ═══');

const baselinePartnerLogo = { url: '#', alt: 'Partner' };
const cmsPartnerWithLogo = {
  url: '/uploads/cms-partner-logo.svg',
  alt: 'CMS Partner',
};

assertDeepEqual(
  resolveMedia(cmsPartnerWithLogo, baselinePartnerLogo),
  cmsPartnerWithLogo,
  'CMS partner logo with url → use CMS'
);

assertDeepEqual(
  resolveMedia(null, baselinePartnerLogo),
  baselinePartnerLogo,
  'CMS partner logo null → use baseline SVG'
);

assertDeepEqual(
  resolveMedia({ url: '', alt: '' }, baselinePartnerLogo),
  baselinePartnerLogo,
  'CMS partner logo empty url → use baseline SVG'
);

// ────────────────────────────────────────────────────────────
// Test 16: buildHomepageQuery — nested query contract
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 16: buildHomepageQuery — nested query contract ═══');

const query = buildHomepageQuery('store-us', 'en');

// Verify all populate entries
check(
  query.includes('populate[hero][populate][image]=true'),
  'contains populate[hero][populate][image]=true'
);
check(
  query.includes('populate[hero][populate][avatars]=true'),
  'contains populate[hero][populate][avatars]=true'
);
check(
  query.includes('populate[clients][populate][partners][populate][logo]=true'),
  'contains populate[clients][populate][partners][populate][logo]=true'
);
check(
  query.includes('populate[featuresGeneral][populate][image]=true'),
  'contains populate[featuresGeneral][populate][image]=true'
);
check(
  query.includes('populate[featuresGeneral][populate][items]=true'),
  'contains populate[featuresGeneral][populate][items]=true'
);
check(
  query.includes(
    'populate[featuresNavs][populate][tabs][populate][image]=true'
  ),
  'contains populate[featuresNavs][populate][tabs][populate][image]=true'
);
check(
  query.includes(
    'populate[testimonials][populate][items][populate][avatar]=true'
  ),
  'contains populate[testimonials][populate][items][populate][avatar]=true'
);
check(
  query.includes('populate[testimonials][populate][statistics]=true'),
  'contains populate[testimonials][populate][statistics]=true'
);
check(
  query.includes('populate[pricing][populate][starterKit]=true'),
  'contains populate[pricing][populate][starterKit]=true'
);
check(
  query.includes('populate[pricing][populate][professionalToolbox]=true'),
  'contains populate[pricing][populate][professionalToolbox]=true'
);
check(
  query.includes('populate[faq][populate][items]=true'),
  'contains populate[faq][populate][items]=true'
);
check(
  query.includes('populate[announcement]=true'),
  'contains populate[announcement]=true'
);
check(
  query.includes('populate[bottomCta]=true'),
  'contains populate[bottomCta]=true'
);
check(query.includes('populate[seo]=true'), 'contains populate[seo]=true');

// Verify filters
check(
  query.includes('filters[site][key][$eq]=store-us'),
  'contains filters[site][key][$eq]=store-us'
);
check(query.includes('locale=en'), 'contains locale=en');
check(query.includes('status=published'), 'contains status=published');
check(
  query.includes('pagination[pageSize]=1'),
  'contains pagination[pageSize]=1'
);

// Verify starts with /api/homepages?
check(query.startsWith('/api/homepages?'), 'query starts with /api/homepages?');

// ────────────────────────────────────────────────────────────
// Test 17: buildHomepageQuery — no populate=*
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 17: buildHomepageQuery — no populate=* ═══');

check(!query.includes('populate=*'), 'does NOT contain populate=*');

// ────────────────────────────────────────────────────────────
// Test 18: buildHomepageQuery — no token/secret in URL
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 18: buildHomepageQuery — no token/secret in URL ═══');

const lowerQuery = query.toLowerCase();
check(!lowerQuery.includes('token'), 'does NOT contain "token"');
check(!lowerQuery.includes('bearer'), 'does NOT contain "bearer"');
check(!lowerQuery.includes('api_key'), 'does NOT contain "api_key"');
check(!lowerQuery.includes('secret'), 'does NOT contain "secret"');
check(!lowerQuery.includes('auth'), 'does NOT contain "auth"');
check(!lowerQuery.includes('password'), 'does NOT contain "password"');

// ────────────────────────────────────────────────────────────
// Test 19: buildHomepageQuery — no section reordering fields
// ────────────────────────────────────────────────────────────

console.log(
  '\n═══ Test 19: buildHomepageQuery — no section reordering fields ═══'
);

check(!query.includes('sectionOrder'), 'does NOT contain sectionOrder');
check(!query.includes('sort'), 'does NOT contain sort parameter');
check(!query.includes('order'), 'does NOT contain order parameter');
check(!query.includes('layout'), 'does NOT contain layout');

// ────────────────────────────────────────────────────────────
// Test 20: buildHomepageQuery — URL-encodes special characters
// ────────────────────────────────────────────────────────────

console.log(
  '\n═══ Test 20: buildHomepageQuery — URL-encodes special characters ═══'
);

const queryWithSpaces = buildHomepageQuery('store us', 'en');
check(
  queryWithSpaces.includes('store%20us'),
  'siteKey with space is URL-encoded'
);

const queryWithSpecial = buildHomepageQuery('store-us & more', 'fr');
check(
  queryWithSpecial.includes('store-us%20%26%20more'),
  'siteKey with & is URL-encoded'
);

const queryWithLocale = buildHomepageQuery('store-us', 'zh-CN');
check(
  queryWithLocale.includes('zh-CN'),
  'locale zh-CN preserved (hyphen not encoded)'
);

// ────────────────────────────────────────────────────────────
// Test 21: resolveMedia — edge cases
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 21: resolveMedia — edge cases ═══');

const baseline = { url: '/baseline.jpg', alt: 'Baseline' };

// CMS media with whitespace-only url
assertDeepEqual(
  resolveMedia({ url: '   ', alt: '' }, baseline),
  baseline,
  'whitespace-only url → baseline'
);

// CMS media with url but no alt
assertDeepEqual(
  resolveMedia({ url: '/cms.jpg' }, baseline),
  { url: '/cms.jpg' },
  'CMS media with url but no alt → CMS (url truthy, alt undefined)'
);

// CMS media with url set to null
assertDeepEqual(
  resolveMedia({ url: null, alt: '' }, baseline),
  baseline,
  'url: null → baseline (null is falsy)'
);

// CMS media is empty object
assertDeepEqual(
  resolveMedia({}, baseline),
  baseline,
  'empty object {} → baseline (url undefined)'
);

// ────────────────────────────────────────────────────────────
// Test 22: resolveCmsMediaUrl — trailing slash edge cases
// ────────────────────────────────────────────────────────────

console.log(
  '\n═══ Test 22: resolveCmsMediaUrl — trailing slash edge cases ═══'
);

assertEqual(
  resolveCmsMediaUrl('/uploads/a.jpg', 'http://127.0.0.1:1337//'),
  'http://127.0.0.1:1337/uploads/a.jpg',
  'multiple trailing slashes stripped'
);

assertEqual(
  resolveCmsMediaUrl('/uploads/a.jpg', 'http://127.0.0.1:1337'),
  'http://127.0.0.1:1337/uploads/a.jpg',
  'no trailing slash → no change'
);

// ────────────────────────────────────────────────────────────
// Test 23: buildHomepageQuery — count of populate entries
// ────────────────────────────────────────────────────────────

console.log(
  '\n═══ Test 23: buildHomepageQuery — count of populate entries ═══'
);

const populateCount = (query.match(/populate\[/g) || []).length;
check(
  populateCount >= 14,
  `populate entries count: ${populateCount} (expected >= 14)`
);

// ────────────────────────────────────────────────────────────
// Test 24: resolveMedia — preserves extra properties
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 24: resolveMedia — preserves extra properties ═══');

const cmsMediaWithExtras = {
  url: '/uploads/a.jpg',
  alt: 'Alt',
  width: 800,
  height: 600,
  mime: 'image/jpeg',
};
const result = resolveMedia(cmsMediaWithExtras, baseline);
assertDeepEqual(
  result,
  cmsMediaWithExtras,
  'CMS media with extra props (width, height, mime) → preserved'
);

// ────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(`PASS: ${passed} / ${total}`);
console.log('═══════════════════════════════════════');

if (passed === total) {
  console.log('\nHomepage media contract test PASSED');
  process.exit(0);
} else {
  console.error(
    `\nHomepage media contract test FAILED (${total - passed} failures)`
  );
  process.exit(1);
}
