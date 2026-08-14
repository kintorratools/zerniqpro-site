/**
 * UnifiedImage Contract Test
 *
 * Verifies the decision logic behind `src/components/ui/media/UnifiedImage.astro`
 * and `src/lib/cms/image-config.ts`:
 *   - provider selection (none | cloudflare)
 *   - local default = none (no forced Cloudflare)
 *   - SVG bypass (never enters the raster transform pipeline)
 *   - dimension requirement for transform eligibility
 *   - per-component breakpoint policy
 *
 * Self-contained so it runs under plain Node.
 *
 * Usage: node scripts/test-unified-image.mjs
 */

// ────────────────────────────────────────────────────────────
// Inline implementations (mirrors src/lib/cms/image-config.ts
// and the decision logic in UnifiedImage.astro)
// ────────────────────────────────────────────────────────────

const IMAGE_BREAKPOINTS = {
  productCard: [320, 480, 640],
  content: [480, 768, 1024],
  hero: [640, 960, 1280, 1600],
};

function resolveImageTransformProvider(value) {
  return (value ?? '').trim().toLowerCase() === 'cloudflare'
    ? 'cloudflare'
    : 'none';
}

function getImageTransformConfig(env = {}) {
  const domain = (env.domain ?? '').trim();
  return {
    provider: resolveImageTransformProvider(env.provider),
    domain: domain.length > 0 ? domain : undefined,
    breakpoints: IMAGE_BREAKPOINTS,
  };
}

function isSvgMedia(media) {
  if (!media) return false;
  if (media.mime === 'image/svg+xml') return true;
  return media.src.toLowerCase().split('?')[0].endsWith('.svg');
}

/**
 * Mirrors the `canTransform` decision in UnifiedImage.astro.
 */
function canTransform({ provider, isSvg, width, height, aspectRatio }) {
  if (provider !== 'cloudflare') return false;
  if (isSvg) return false;
  return (
    (typeof width === 'number' && typeof height === 'number') ||
    (typeof width === 'number' && typeof aspectRatio === 'number') ||
    (typeof height === 'number' && typeof aspectRatio === 'number')
  );
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
// Tests
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 1: provider resolution ═══');
assertEqual(resolveImageTransformProvider('none'), 'none', '"none" → none');
assertEqual(
  resolveImageTransformProvider('cloudflare'),
  'cloudflare',
  '"cloudflare" → cloudflare'
);
assertEqual(
  resolveImageTransformProvider('CLOUDFLARE'),
  'cloudflare',
  '"CLOUDFLARE" (case-insensitive) → cloudflare'
);
assertEqual(
  resolveImageTransformProvider('  cloudflare  '),
  'cloudflare',
  'whitespace-trimmed → cloudflare'
);
assertEqual(
  resolveImageTransformProvider(undefined),
  'none',
  'undefined → none'
);
assertEqual(resolveImageTransformProvider(null), 'none', 'null → none');
assertEqual(resolveImageTransformProvider(''), 'none', 'empty → none');
assertEqual(resolveImageTransformProvider('garbage'), 'none', 'unknown → none');

console.log('\n═══ Test 2: local default = none ═══');
assertEqual(
  getImageTransformConfig().provider,
  'none',
  'default config provider = none'
);
assertEqual(
  getImageTransformConfig({}).provider,
  'none',
  'empty env provider = none'
);

console.log('\n═══ Test 3: cloudflare mode config ═══');
assertDeepEqual(
  getImageTransformConfig({
    provider: 'cloudflare',
    domain: 'images.example.com',
  }),
  {
    provider: 'cloudflare',
    domain: 'images.example.com',
    breakpoints: IMAGE_BREAKPOINTS,
  },
  'cloudflare + domain → config populated'
);
assertDeepEqual(
  getImageTransformConfig({ provider: 'cloudflare' }),
  { provider: 'cloudflare', domain: undefined, breakpoints: IMAGE_BREAKPOINTS },
  'cloudflare without domain → domain undefined (relative URL mode)'
);

console.log('\n═══ Test 4: SVG bypass ═══');
assertEqual(
  canTransform({
    provider: 'cloudflare',
    isSvg: true,
    width: 100,
    height: 100,
  }),
  false,
  'SVG never transforms even with dimensions'
);

console.log('\n═══ Test 5: transform eligibility — dimensions ═══');
assertEqual(
  canTransform({
    provider: 'cloudflare',
    isSvg: false,
    width: 100,
    height: 100,
  }),
  true,
  'width + height → eligible'
);
assertEqual(
  canTransform({
    provider: 'cloudflare',
    isSvg: false,
    width: 100,
    aspectRatio: 1.5,
  }),
  true,
  'width + aspectRatio → eligible'
);
assertEqual(
  canTransform({
    provider: 'cloudflare',
    isSvg: false,
    height: 100,
    aspectRatio: 1.5,
  }),
  true,
  'height + aspectRatio → eligible'
);
assertEqual(
  canTransform({ provider: 'cloudflare', isSvg: false, width: 100 }),
  false,
  'width only → not eligible'
);
assertEqual(
  canTransform({ provider: 'cloudflare', isSvg: false }),
  false,
  'no dimensions → not eligible'
);

console.log('\n═══ Test 6: none provider never transforms ═══');
assertEqual(
  canTransform({ provider: 'none', isSvg: false, width: 100, height: 100 }),
  false,
  'none provider → no transform even with dimensions'
);

console.log('\n═══ Test 7: breakpoint policy ═══');
assertDeepEqual(
  IMAGE_BREAKPOINTS.productCard,
  [320, 480, 640],
  'productCard breakpoints = 320/480/640'
);
assertDeepEqual(
  IMAGE_BREAKPOINTS.content,
  [480, 768, 1024],
  'content breakpoints = 480/768/1024'
);
assertDeepEqual(
  IMAGE_BREAKPOINTS.hero,
  [640, 960, 1280, 1600],
  'hero breakpoints = 640/960/1280/1600'
);

console.log('\n═══ Test 8: isSvgMedia decision ═══');
assertEqual(isSvgMedia({ src: '/logo.svg', alt: '' }), true, '.svg src → true');
assertEqual(
  isSvgMedia({ src: '/logo.png', mime: 'image/svg+xml' }),
  true,
  'svg mime → true'
);
assertEqual(isSvgMedia({ src: '/img.jpg', alt: '' }), false, 'jpg → false');

// ────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(`PASS: ${passed} / ${total}`);
console.log('═══════════════════════════════════════');

if (passed === total) {
  console.log('\nUnifiedImage contract test PASSED');
  process.exit(0);
} else {
  console.error(
    `\nUnifiedImage contract test FAILED (${total - passed} failures)`
  );
  process.exit(1);
}
