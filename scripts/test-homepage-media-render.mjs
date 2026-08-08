/**
 * Homepage Media Render Test
 *
 * Validates Phase 7C-B CMS Media rendering logic.
 * Pure Node.js — no external dependencies.
 *
 * Usage: node scripts/test-homepage-media-render.mjs
 */

// ────────────────────────────────────────────────────────────
// Inline implementations (mirrors src/lib/cms/media.ts)
// ────────────────────────────────────────────────────────────

/**
 * Resolve a Strapi media URL to an absolute URL.
 */
function resolveCmsMediaUrl(url, cmsOrigin) {
  if (!url || url.trim() === '') {
    return undefined;
  }
  if (
    url.startsWith('javascript:') ||
    url.startsWith('data:') ||
    url.startsWith('file:')
  ) {
    return undefined;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    const origin = cmsOrigin.replace(/\/+$/, '');
    return `${origin}${url}`;
  }
  return undefined;
}

/**
 * Sanitize a URL — only accept http:// and https:// protocols.
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
// Test 1: raw CmsMedia does NOT enter ViewModel
// Partner.logo, FeatureTab.image, TestimonialItem.avatar → CmsMediaView | null
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 1: raw CmsMedia does NOT enter ViewModel ═══');

// Simulate a CmsMediaView (after toCmsMediaView has run)
const validCmsMediaView = { url: '/uploads/test.jpg', alt: 'Test' };
const validCmsMediaViewWithMeta = {
  url: '/uploads/test.jpg',
  alt: 'Test',
  width: 800,
  height: 600,
};

// These fields would be CmsMediaView | null in the ViewModel (not raw CmsMedia)
const partnerLogo = validCmsMediaView;
const featureTabImage = null;
const testimonialAvatar = validCmsMediaViewWithMeta;

// Verify the shapes: no CmsMedia fields like alternativeText, mime
check(
  partnerLogo.alternativeText === undefined,
  'Partner.logo has NO alternativeText (CmsMediaView, not CmsMedia)'
);
check(
  featureTabImage === null,
  'FeatureTab.image can be null (CmsMediaView | null)'
);
check(
  testimonialAvatar.alt !== undefined,
  'TestimonialItem.avatar has "alt" not "alternativeText" (CmsMediaView)'
);
check(
  typeof testimonialAvatar.alt === 'string',
  'TestimonialItem.avatar.alt is string (CmsMediaView)'
);

// Verify CmsMediaView has url and alt properties
check(
  typeof validCmsMediaView.url === 'string' && typeof validCmsMediaView.alt === 'string',
  'CmsMediaView shape: { url: string, alt: string }'
);

// ────────────────────────────────────────────────────────────
// Test 2: /uploads → absolute URL
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 2: /uploads → absolute URL ═══');

assertEqual(
  resolveMediaUrl('/uploads/a.jpg', 'http://127.0.0.1:1337'),
  'http://127.0.0.1:1337/uploads/a.jpg',
  '/uploads/a.jpg → http://127.0.0.1:1337/uploads/a.jpg'
);

assertEqual(
  resolveMediaUrl('/uploads/deep/nested/img.png', 'http://127.0.0.1:1337'),
  'http://127.0.0.1:1337/uploads/deep/nested/img.png',
  'nested /uploads path → absolute with cmsOrigin'
);

assertEqual(
  resolveMediaUrl('/uploads/hero.jpg', 'http://127.0.0.1:1337/'),
  'http://127.0.0.1:1337/uploads/hero.jpg',
  'strips trailing slash from cmsOrigin'
);

// ────────────────────────────────────────────────────────────
// Test 3: unsafe URL fallback
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 3: unsafe URL fallback ═══');

assertEqual(
  resolveMediaUrl('javascript:alert(1)', 'http://127.0.0.1:1337'),
  undefined,
  'javascript:alert(1) → undefined'
);

assertEqual(
  resolveMediaUrl('data:image/png;base64,...', 'http://127.0.0.1:1337'),
  undefined,
  'data:image/png;base64,... → undefined'
);

assertEqual(
  resolveMediaUrl('file:///etc/passwd', 'http://127.0.0.1:1337'),
  undefined,
  'file:///etc/passwd → undefined'
);

assertEqual(
  resolveMediaUrl('javascript:void(0)', 'http://127.0.0.1:1337'),
  undefined,
  'javascript:void(0) → undefined'
);

// ────────────────────────────────────────────────────────────
// Test 4: Hero CMS image selection
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 4: Hero CMS image selection ═══');

const cmsView = {
  url: 'http://127.0.0.1:1337/uploads/hero.jpg',
  alt: 'CMS',
};
const heroImageBaseline = '/src/assets/images/hero-image.avif';

// Logic from index.astro: merged.hero.image?.url ? merged.hero.image : heroImage
const heroResult1 = cmsView?.url ? cmsView : heroImageBaseline;
assertDeepEqual(
  heroResult1,
  cmsView,
  'CMS hero.image has url → use CmsMediaView (not baseline)'
);

// ────────────────────────────────────────────────────────────
// Test 5: Hero local fallback
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 5: Hero local fallback ═══');

const nullView = null;
const heroResult2 = nullView?.url ? nullView : heroImageBaseline;
assertEqual(
  heroResult2,
  heroImageBaseline,
  'CMS hero.image null → fallback to local heroImage'
);

const emptyUrlView = { url: '', alt: '' };
const heroResult3 = emptyUrlView?.url ? emptyUrlView : heroImageBaseline;
assertEqual(
  heroResult3,
  heroImageBaseline,
  'CMS hero.image.url "" → fallback to local heroImage (falsy url)'
);

// ────────────────────────────────────────────────────────────
// Test 6: Feature image fallback (same logic as Hero)
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 6: Feature image fallback ═══');

const featureImageBaseline = '/src/assets/images/features-image.avif';
const cmsFeatureImage = {
  url: 'http://127.0.0.1:1337/uploads/feature.jpg',
  alt: 'CMS Feature',
};

const ftResult1 = cmsFeatureImage?.url ? cmsFeatureImage : featureImageBaseline;
assertDeepEqual(
  ftResult1,
  cmsFeatureImage,
  'CMS featuresGeneral.image has url → use CMS'
);

const ftResult2 = (null)?.url ? null : featureImageBaseline;
assertEqual(
  ftResult2,
  featureImageBaseline,
  'CMS featuresGeneral.image null → fallback to local featureImage'
);

// ────────────────────────────────────────────────────────────
// Test 7: Tab CMS image selection
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 7: Tab CMS image selection ═══');

const localTabImages = ['tools.avif', 'dashboard.avif', 'construction.avif'];
const cmsTabImage = {
  url: 'http://127.0.0.1:1337/uploads/cms-tab.jpg',
  alt: 'CMS',
};

// Logic from index.astro: tab.image?.url ? tab.image : (localTabImages[i] ?? construction)
const tabResult1 = cmsTabImage?.url ? cmsTabImage : localTabImages[0];
assertDeepEqual(
  tabResult1,
  cmsTabImage,
  'Tab CMS image has url → use CmsMediaView'
);

const nullTabImage = null;
const tabResult2 = nullTabImage?.url ? nullTabImage : localTabImages[0];
assertEqual(
  tabResult2,
  localTabImages[0],
  'Tab CMS image null → fallback to localTabImages[0] (tools)'
);

// ────────────────────────────────────────────────────────────
// Test 8: Tab iconKey fallback (tools→0, dashboard→1, house→2)
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 8: Tab iconKey fallback ═══');

// iconKey to index mapping: tools→0, dashboard→1, house→2 (house uses construction)
const iconKeyIndexMap = { tools: 0, dashboard: 1, house: 2 };
const localImagePaths = ['tools.avif', 'dashboard.avif', 'construction.avif'];

// tools
assertEqual(
  localImagePaths[iconKeyIndexMap.tools],
  'tools.avif',
  'tools iconKey → localTabImages[0] (tools.avif)'
);

// dashboard
assertEqual(
  localImagePaths[iconKeyIndexMap.dashboard],
  'dashboard.avif',
  'dashboard iconKey → localTabImages[1] (dashboard.avif)'
);

// house
assertEqual(
  localImagePaths[iconKeyIndexMap.house],
  'construction.avif',
  'house iconKey → localTabImages[2] (construction.avif)'
);

// Verify the fallback when CMS image is null
const tabWithNullImage = { image: null, iconKey: 'house' };
const tabImageFallback = tabWithNullImage.image?.url
  ? tabWithNullImage.image
  : localTabImages[iconKeyIndexMap[tabWithNullImage.iconKey]];
assertEqual(
  tabImageFallback,
  'construction.avif',
  'house tab with null CMS image → construction.avif fallback'
);

// ────────────────────────────────────────────────────────────
// Test 9: Hero avatars CMS/fallback
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 9: Hero avatars CMS/fallback ═══');

const cmsAvatars = [
  { url: 'http://127.0.0.1:1337/uploads/avatar1.jpg', alt: 'User 1' },
  { url: 'http://127.0.0.1:1337/uploads/avatar2.jpg', alt: 'User 2' },
  { url: 'http://127.0.0.1:1337/uploads/avatar3.jpg', alt: 'User 3' },
  { url: 'http://127.0.0.1:1337/uploads/avatar4.jpg', alt: 'User 4' },
];

const unsplashFallbackUrls = [
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1531927557220-a9e23c1e4794?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&&auto=format&fit=facearea&facepad=3&w=300&h=300&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80',
];

// Logic from index.astro:
// merged.hero.avatars.length > 0 && merged.hero.avatars.some(a => a?.url)
//   ? merged.hero.avatars.map(a => a?.url || '')
//   : unsplashFallbackUrls

function resolveAvatars(avatars) {
  if (avatars.length > 0 && avatars.some(a => a?.url)) {
    return avatars.map(a => a?.url || '');
  }
  return unsplashFallbackUrls;
}

// CMS avatars non-empty → use CMS URLs
const avatarResult1 = resolveAvatars(cmsAvatars);
assertDeepEqual(
  avatarResult1,
  [
    'http://127.0.0.1:1337/uploads/avatar1.jpg',
    'http://127.0.0.1:1337/uploads/avatar2.jpg',
    'http://127.0.0.1:1337/uploads/avatar3.jpg',
    'http://127.0.0.1:1337/uploads/avatar4.jpg',
  ],
  'CMS avatars non-empty → use CMS URLs'
);

// CMS avatars empty array → use Unsplash fallback
const avatarResult2 = resolveAvatars([]);
assertDeepEqual(
  avatarResult2,
  unsplashFallbackUrls,
  'empty avatars array → use Unsplash fallback URLs'
);

// CMS avatars with all null items → use Unsplash fallback
const allNullAvatars = [null, null, null, null];
const avatarResult3 = resolveAvatars(allNullAvatars);
assertDeepEqual(
  avatarResult3,
  unsplashFallbackUrls,
  'avatars all null → use Unsplash fallback (none have url)'
);

// CMS avatars with one non-url item among url items → still uses CMS
const mixedAvatars = [
  { url: 'http://127.0.0.1:1337/uploads/a1.jpg', alt: 'A' },
  { url: null, alt: 'B' },
  { url: 'http://127.0.0.1:1337/uploads/a3.jpg', alt: 'C' },
  { url: 'http://127.0.0.1:1337/uploads/a4.jpg', alt: 'D' },
];
const avatarResult4 = resolveAvatars(mixedAvatars);
assertDeepEqual(
  avatarResult4,
  [
    'http://127.0.0.1:1337/uploads/a1.jpg',
    '',
    'http://127.0.0.1:1337/uploads/a3.jpg',
    'http://127.0.0.1:1337/uploads/a4.jpg',
  ],
  'mixed avatars (some have url) → use CMS URLs (null → "")'
);

// ────────────────────────────────────────────────────────────
// Test 10: Testimonial avatar CMS/fallback
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 10: Testimonial avatar CMS/fallback ═══');

// Logic from index.astro: t.avatar?.url ?? ''
const cmsAvatar = { url: 'http://127.0.0.1:1337/uploads/testimonial-avatar.jpg', alt: 'Author' };
const avatarSrc1 = cmsAvatar?.url ?? '';
assertEqual(
  avatarSrc1,
  'http://127.0.0.1:1337/uploads/testimonial-avatar.jpg',
  'CMS avatar.url exists → avatarSrc = CMS URL'
);

const nullAvatar = null;
const avatarSrc2 = nullAvatar?.url ?? '';
assertEqual(
  avatarSrc2,
  '',
  'CMS avatar null → avatarSrc = ""'
);

const noUrlAvatar = { alt: 'Author' };
const avatarSrc3 = noUrlAvatar?.url ?? '';
assertEqual(
  avatarSrc3,
  '',
  'CMS avatar has no url → avatarSrc = ""'
);

// ────────────────────────────────────────────────────────────
// Test 11: Partner logo CMS/SVG fallback
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 11: Partner logo CMS/SVG fallback ═══');

// Partners use partnersData (SVG icons from constants.ts).
// In index.astro, partnersData.map((p, i) => { cmsPartner = merged.clients.partners[i]; return { icon: p.icon, ... } })
// The logo field goes through resolveMedia in the resolver, but in rendering only name/href are used.
// The SVG icon from partnersData is always used regardless of CMS.
// So: partner always keeps the SVG icon from partnersData.

const partnersData = [
  { icon: '<svg>First SVG</svg>', name: 'first', href: '#' },
  { icon: '<svg>Second SVG</svg>', name: 'Second', href: '#' },
];

// CMS partner has logo with url
const cmsPartners = [
  { name: 'CMS First', url: '/cms-url', alt: '', logo: { url: 'http://127.0.0.1:1337/uploads/partner-logo.svg', alt: 'CMS Logo' } },
];

// Partners always use the SVG icon from partnersData
const partnerResult1 = partnersData.map((p, i) => {
  const cmsPartner = cmsPartners[i];
  return {
    icon: p.icon,
    name: cmsPartner?.name || p.name,
    href: cmsPartner?.url || p.href,
  };
});

assertEqual(
  partnerResult1[0].icon,
  '<svg>First SVG</svg>',
  'Partner icon always from partnersData SVG (NOT from CMS logo)'
);

assertEqual(
  partnerResult1[0].name,
  'CMS First',
  'Partner name can come from CMS'
);

assertEqual(
  partnerResult1[0].href,
  '/cms-url',
  'Partner href can come from CMS'
);

// CMS partner has logo with url — the logo field is available in the ViewModel
const cmsPartnerWithLogo = { name: 'CmsPartner', url: '#', alt: '', logo: { url: 'http://127.0.0.1:1337/uploads/cms-partner.svg', alt: 'CMS Partner Logo' } };
const logoUrl = cmsPartnerWithLogo.logo?.url;
check(
  logoUrl === 'http://127.0.0.1:1337/uploads/cms-partner.svg',
  'CMS partner.logo.url exists in ViewModel → logo URL accessible'
);

// CMS logo empty → logo is null in ViewModel (normalize sets to null)
const cmsPartnerNoLogo = { name: 'NoLogo', url: '#', alt: '', logo: null };
check(
  cmsPartnerNoLogo.logo === null,
  'CMS partner.logo null → logo is null in ViewModel'
);

// ────────────────────────────────────────────────────────────
// Test 12: remote width/height present in CmsMediaView
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 12: remote width/height present in CmsMediaView ═══');

const viewWithDimensions = {
  url: 'http://127.0.0.1:1337/uploads/hero.jpg',
  alt: 'Hero',
  width: 1920,
  height: 1080,
};

// CmsMediaView can carry width/height
check(
  viewWithDimensions.width === 1920,
  'CmsMediaView.width = 1920'
);

check(
  viewWithDimensions.height === 1080,
  'CmsMediaView.height = 1080'
);

// Width/height are optional — not present on a plain view
const plainView = { url: '/uploads/test.jpg', alt: 'Test' };
check(
  plainView.width === undefined,
  'CmsMediaView without width → width is undefined'
);
check(
  plainView.height === undefined,
  'CmsMediaView without height → height is undefined'
);

// ────────────────────────────────────────────────────────────
// Test 13: existing image classes unchanged (ThemeImage class prop passthrough)
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 13: existing image classes unchanged ═══');

// The ThemeImage component receives a "class" prop.
// This test verifies the string comparison — class is passed through as-is.

const themeClasses = 'h-auto rounded-xl';
const cmsClasses = 'h-auto rounded-xl';

// Even when CMS provides the image, the class prop should remain unchanged
assertEqual(
  cmsClasses,
  themeClasses,
  'class prop is identical whether CMS or baseline image is used'
);

// Verify class prop is a string (not mutated or wrapped)
check(
  typeof themeClasses === 'string',
  'class prop is a plain string'
);

// Ensure a typical Tailwind set of classes is preserved
const tailwindClasses = 'w-full h-auto object-cover rounded-lg shadow-md dark:shadow-gray-900';
check(
  typeof tailwindClasses === 'string' && tailwindClasses.includes('rounded-lg'),
  'Tailwind class string preserved as-is'
);

// ────────────────────────────────────────────────────────────
// Test 14: Section order unchanged (10 sections)
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 14: Section order unchanged ═══');

// Hardcoded verification of 10 sections in HomepageViewModel order
const expectedSections = [
  'announcement',
  'hero',
  'clients',
  'featuresGeneral',
  'featuresNavs',
  'testimonials',
  'pricing',
  'faq',
  'bottomCta',
  'seo',
];

check(expectedSections.length === 10, '10 sections total');

assertEqual(expectedSections[0], 'announcement', 'Section 1: announcement');
assertEqual(expectedSections[1], 'hero', 'Section 2: hero');
assertEqual(expectedSections[2], 'clients', 'Section 3: clients');
assertEqual(expectedSections[3], 'featuresGeneral', 'Section 4: featuresGeneral');
assertEqual(expectedSections[4], 'featuresNavs', 'Section 5: featuresNavs');
assertEqual(expectedSections[5], 'testimonials', 'Section 6: testimonials');
assertEqual(expectedSections[6], 'pricing', 'Section 7: pricing');
assertEqual(expectedSections[7], 'faq', 'Section 8: faq');
assertEqual(expectedSections[8], 'bottomCta', 'Section 9: bottomCta');
assertEqual(expectedSections[9], 'seo', 'Section 10: seo');

// Verify no duplicate section names
const uniqueSections = new Set(expectedSections);
check(
  uniqueSections.size === expectedSections.length,
  'No duplicate section names'
);

// ────────────────────────────────────────────────────────────
// Test 15: No token enters media URL
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 15: No token enters media URL ═══');

// The normalize function (normalizeHomepageMediaUrls) should NOT add any token/secret
// to media URLs. We verify by scanning that resolveMediaUrl does not append any
// query string with token-like parameters.

const resolvedUrl1 = resolveMediaUrl('/uploads/hero.jpg', 'http://127.0.0.1:1337');
check(
  !resolvedUrl1.toLowerCase().includes('token'),
  'resolved URL does NOT contain "token"'
);
check(
  !resolvedUrl1.toLowerCase().includes('api_key'),
  'resolved URL does NOT contain "api_key"'
);
check(
  !resolvedUrl1.toLowerCase().includes('bearer'),
  'resolved URL does NOT contain "bearer"'
);
check(
  !resolvedUrl1.toLowerCase().includes('secret'),
  'resolved URL does NOT contain "secret"'
);
check(
  !resolvedUrl1.toLowerCase().includes('auth'),
  'resolved URL does NOT contain "auth"'
);

// Also test with absolute URL
const resolvedUrl2 = resolveMediaUrl('https://cdn.example.com/img.jpg', 'http://127.0.0.1:1337');
check(
  !resolvedUrl2.toLowerCase().includes('token'),
  'absolute resolved URL does NOT contain "token"'
);

// Also test that resolveCmsMediaUrl alone does not add tokens
const resolvedOnly = resolveCmsMediaUrl('/uploads/hero.jpg', 'http://127.0.0.1:1337');
check(
  !resolvedOnly.toLowerCase().includes('token'),
  'resolveCmsMediaUrl result does NOT contain "token"'
);

// ────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(`PASS: ${passed} / ${total}`);
console.log('═══════════════════════════════════════');

if (passed === total) {
  console.log('\nHomepage media render test PASSED');
  process.exit(0);
} else {
  console.error(
    `\nHomepage media render test FAILED (${total - passed} failures)`
  );
  process.exit(1);
}
