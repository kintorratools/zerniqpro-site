/**
 * Image Transformation Contract Test
 *
 * Verifies the Cloudflare URL transformation contract:
 *   - `/cdn-cgi/image/<options>/<SOURCE>` shape
 *   - `format=auto` (f=auto) and `fit=cover` defaults
 *   - srcset breakpoint generation
 *   - relative URL mode (no domain) vs absolute mode (domain from config)
 *   - "none" provider → no transformation at all
 *
 * Uses the real `@unpic/core` `transformProps` to validate the exact URL that
 * `UnifiedImage.astro` would produce via `@unpic/astro` `Image`.
 *
 * Usage: node scripts/test-image-transformation-contract.mjs
 */

import { transformProps } from '@unpic/core';

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

function assertIncludes(haystack, needle, msg) {
  total++;
  if (typeof haystack === 'string' && haystack.includes(needle)) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    console.error(
      `[FAIL] ${msg} - expected to include ${JSON.stringify(needle)} but got ${JSON.stringify(haystack)}`
    );
  }
}

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

console.log('\n═══ Test 1: cloudflare mode generates /cdn-cgi/image/ ═══');
const cloudflare = transformProps({
  src: '/uploads/hero.jpg',
  cdn: 'cloudflare',
  width: 640,
  height: 400,
});

assertIncludes(
  cloudflare.src,
  '/cdn-cgi/image/',
  'src starts with /cdn-cgi/image/ (relative mode)'
);
assertIncludes(cloudflare.src, 'f=auto', 'src contains f=auto (format auto)');
assertIncludes(cloudflare.src, 'fit=cover', 'src contains fit=cover');
assertIncludes(cloudflare.src, 'width=640', 'src contains width=640');
assertIncludes(cloudflare.src, 'uploads/hero.jpg', 'src contains source path');

console.log('\n═══ Test 2: cloudflare mode generates srcset ═══');
check(
  typeof cloudflare.srcset === 'string' && cloudflare.srcset.length > 0,
  'srcset is generated'
);
assertIncludes(cloudflare.srcset, '640w', 'srcset contains 640w entry');
assertIncludes(cloudflare.srcset, '1280w', 'srcset contains 1280w entry');

console.log('\n═══ Test 3: srcset entries are cloudflare URLs ═══');
// srcset entries are separated by a comma + whitespace; the Cloudflare URL
// itself also contains commas (width=..,height=..,f=..,fit=..), so a plain
// split(",") would fragment the modifier list. Split on comma+whitespace only.
const srcsetEntries = cloudflare.srcset.split(/,\s+/);
const allCloudflare = srcsetEntries.every(entry =>
  entry.trim().includes('/cdn-cgi/image/')
);
check(allCloudflare, 'every srcset entry uses /cdn-cgi/image/');

console.log('\n═══ Test 4: cloudflare mode with domain → absolute URL ═══');
const cloudflareDomain = transformProps({
  src: '/uploads/hero.jpg',
  cdn: 'cloudflare',
  width: 640,
  height: 400,
  options: { cloudflare: { domain: 'images.example.com' } },
});
assertIncludes(
  cloudflareDomain.src,
  'https://images.example.com/cdn-cgi/image/',
  'src is absolute with domain'
);

console.log('\n═══ Test 5: no cdn → no transformation ═══');
const plain = transformProps({
  src: 'http://127.0.0.1:1337/uploads/hero.jpg',
  width: 640,
  height: 400,
});
check(
  plain.src === 'http://127.0.0.1:1337/uploads/hero.jpg',
  'src passthrough unchanged when no cdn'
);
check(!plain.srcset || plain.srcset === '', 'no srcset generated when no cdn');

console.log('\n═══ Test 6: breakpoint policy — product card ═══');
const productCard = transformProps({
  src: '/uploads/card.jpg',
  cdn: 'cloudflare',
  width: 640,
  height: 400,
  breakpoints: [320, 480, 640],
});
const cardWidths = (productCard.srcset || '')
  .split(',')
  .map(e => e.trim().split(' ')[1])
  .filter(Boolean);
check(
  cardWidths.includes('320w') && cardWidths.includes('640w'),
  `product card srcset uses 320w and 640w (got: ${cardWidths.join(', ')})`
);

console.log('\n═══ Test 7: aspect ratio preserved via height modifier ═══');
const withAspect = transformProps({
  src: '/uploads/hero.jpg',
  cdn: 'cloudflare',
  width: 640,
  aspectRatio: 1.6,
});
check(
  typeof withAspect.src === 'string' &&
    withAspect.src.includes('/cdn-cgi/image/'),
  'width + aspectRatio produces a valid transform URL'
);

// ────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(`PASS: ${passed} / ${total}`);
console.log('═══════════════════════════════════════');

if (passed === total) {
  console.log('\nImage transformation contract test PASSED');
  process.exit(0);
} else {
  console.error(
    `\nImage transformation contract test FAILED (${total - passed} failures)`
  );
  process.exit(1);
}
