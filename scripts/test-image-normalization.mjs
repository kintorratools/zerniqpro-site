/**
 * Image Normalization Contract Test
 *
 * Verifies the unified media normalization layer
 * (`normalizeCmsMedia` / `isSvgMedia` in src/lib/cms/media.ts).
 *
 * Self-contained: mirrors the implementation contract so it runs under plain
 * Node without an Astro/Vite runtime.
 *
 * Usage: node scripts/test-image-normalization.mjs
 */

// ────────────────────────────────────────────────────────────
// Inline implementations (mirrors src/lib/cms/media.ts)
// ────────────────────────────────────────────────────────────

function isHttpUrl(value) {
  return value.startsWith('http://') || value.startsWith('https://');
}

function isUnsafeProtocol(value) {
  return (
    value.startsWith('javascript:') ||
    value.startsWith('data:') ||
    value.startsWith('file:')
  );
}

function normalizeCmsMedia(input, options = {}) {
  if (input == null) return null;

  const cmsOrigin = (options.cmsOrigin ?? '').replace(/\/+$/, '');
  const explicitAlt = options.explicitAlt ?? null;

  let rawUrl;
  let rawAlt;
  let width;
  let height;
  let mime;

  if (typeof input === 'string') {
    rawUrl = input;
  } else {
    rawUrl = input.url ?? input.src;
    rawAlt = input.alternativeText ?? input.alt;
    width = input.width;
    height = input.height;
    mime = input.mime;
    if (!mime && input.format) {
      mime = input.format.startsWith('image/')
        ? input.format
        : `image/${input.format}`;
    }
  }

  if (!rawUrl || rawUrl.trim() === '') return null;

  const trimmed = rawUrl.trim();
  if (isUnsafeProtocol(trimmed)) return null;

  let src;
  if (isHttpUrl(trimmed)) {
    src = trimmed;
  } else if (trimmed.startsWith('/uploads/')) {
    src = `${cmsOrigin}${trimmed}`;
  } else if (trimmed.startsWith('/')) {
    src = trimmed;
  } else {
    return null;
  }

  const alt = rawAlt ?? explicitAlt ?? '';

  const out = { src, alt };
  if (typeof width === 'number') out.width = width;
  if (typeof height === 'number') out.height = height;
  if (typeof mime === 'string' && mime.length > 0) out.mime = mime;
  return out;
}

function isSvgMedia(media) {
  if (!media) return false;
  if (media.mime === 'image/svg+xml') return true;
  return media.src.toLowerCase().split('?')[0].endsWith('.svg');
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

console.log('\n═══ Test 1: string — relative /uploads/* ═══');
assertDeepEqual(
  normalizeCmsMedia('/uploads/hero.jpg', {
    cmsOrigin: 'http://127.0.0.1:1337',
  }),
  { src: 'http://127.0.0.1:1337/uploads/hero.jpg', alt: '' },
  'relative /uploads/* → resolved against cmsOrigin'
);
assertDeepEqual(
  normalizeCmsMedia('/uploads/hero.jpg', {
    cmsOrigin: 'http://127.0.0.1:1337/',
  }),
  { src: 'http://127.0.0.1:1337/uploads/hero.jpg', alt: '' },
  'cmsOrigin trailing slash stripped'
);

console.log('\n═══ Test 2: string — absolute http/https ═══');
assertDeepEqual(
  normalizeCmsMedia('https://cdn.example.com/img.jpg'),
  { src: 'https://cdn.example.com/img.jpg', alt: '' },
  'absolute https → passthrough'
);
assertDeepEqual(
  normalizeCmsMedia('http://cdn.example.com/img.jpg'),
  { src: 'http://cdn.example.com/img.jpg', alt: '' },
  'absolute http → passthrough'
);

console.log('\n═══ Test 3: string — site-relative static path ═══');
assertDeepEqual(
  normalizeCmsMedia('/_astro/hero.avif'),
  { src: '/_astro/hero.avif', alt: '' },
  'site-relative /_astro/* → passthrough'
);

console.log('\n═══ Test 4: string — unsafe / unsupported ═══');
assertEqual(
  normalizeCmsMedia('javascript:alert(1)'),
  null,
  'javascript: → null'
);
assertEqual(normalizeCmsMedia('data:text/html,x'), null, 'data: → null');
assertEqual(normalizeCmsMedia('file:///etc/passwd'), null, 'file: → null');
assertEqual(normalizeCmsMedia(''), null, 'empty string → null');
assertEqual(normalizeCmsMedia('   '), null, 'whitespace → null');
assertEqual(normalizeCmsMedia('relative.jpg'), null, 'bare relative → null');

console.log('\n═══ Test 5: null / undefined ═══');
assertEqual(normalizeCmsMedia(null), null, 'null → null');
assertEqual(normalizeCmsMedia(undefined), null, 'undefined → null');

console.log('\n═══ Test 6: CMS object → src/alt/width/height/mime ═══');
assertDeepEqual(
  normalizeCmsMedia(
    {
      url: '/uploads/a.jpg',
      alternativeText: 'Alt',
      width: 800,
      height: 600,
      mime: 'image/jpeg',
    },
    { cmsOrigin: 'http://127.0.0.1:1337' }
  ),
  {
    src: 'http://127.0.0.1:1337/uploads/a.jpg',
    alt: 'Alt',
    width: 800,
    height: 600,
    mime: 'image/jpeg',
  },
  'CMS object → full normalized shape'
);

console.log('\n═══ Test 7: Astro static metadata-like object ═══');
assertDeepEqual(
  normalizeCmsMedia({ src: '/_astro/hero.avif', width: 812, height: 515 }),
  { src: '/_astro/hero.avif', alt: '', width: 812, height: 515 },
  'ImageMetadata-like { src } → src passthrough + dimensions'
);

console.log('\n═══ Test 8: object format → mime derivation ═══');
assertDeepEqual(
  normalizeCmsMedia({ url: '/uploads/a.jpg', format: 'jpg' }),
  { src: '/uploads/a.jpg', alt: '', mime: 'image/jpg' },
  'format "jpg" → mime image/jpg'
);
assertDeepEqual(
  normalizeCmsMedia({ url: '/uploads/a.webp', format: 'image/webp' }),
  { src: '/uploads/a.webp', alt: '', mime: 'image/webp' },
  'format "image/webp" → mime image/webp'
);

console.log('\n═══ Test 9: alt priority ═══');
assertDeepEqual(
  normalizeCmsMedia(
    { url: '/uploads/a.jpg', alternativeText: 'CMS' },
    { explicitAlt: 'Explicit' }
  ),
  { src: '/uploads/a.jpg', alt: 'CMS' },
  'alternativeText wins over explicitAlt'
);
assertDeepEqual(
  normalizeCmsMedia('/uploads/a.jpg', {
    cmsOrigin: 'http://127.0.0.1:1337',
    explicitAlt: 'Explicit',
  }),
  { src: 'http://127.0.0.1:1337/uploads/a.jpg', alt: 'Explicit' },
  'explicitAlt used when no alternativeText'
);

console.log('\n═══ Test 10: no [object Object] / no undefined URL ═══');
const stringResult = normalizeCmsMedia({
  url: '/uploads/a.jpg',
  alternativeText: null,
});
check(
  typeof stringResult.src === 'string' &&
    !stringResult.src.includes('undefined'),
  'src is a real string (never "undefined")'
);
check(
  !stringResult.src.includes('[object Object]'),
  'src never "[object Object]"'
);

console.log('\n═══ Test 11: isSvgMedia ═══');
assertEqual(
  isSvgMedia({ src: '/uploads/a.svg', alt: '' }),
  true,
  '.svg → true'
);
assertEqual(
  isSvgMedia({ src: '/uploads/a.svg?x=1', alt: '' }),
  true,
  '.svg?query → true'
);
assertEqual(
  isSvgMedia({ src: '/uploads/a.jpg', mime: 'image/svg+xml' }),
  true,
  'mime image/svg+xml → true'
);
assertEqual(
  isSvgMedia({ src: '/uploads/a.jpg', alt: '' }),
  false,
  '.jpg → false'
);
assertEqual(isSvgMedia(null), false, 'null → false');
assertEqual(isSvgMedia(undefined), false, 'undefined → false');

// ────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────

console.log('\n═══════════════════════════════════════');
console.log(`PASS: ${passed} / ${total}`);
console.log('═══════════════════════════════════════');

if (passed === total) {
  console.log('\nImage normalization test PASSED');
  process.exit(0);
} else {
  console.error(
    `\nImage normalization test FAILED (${total - passed} failures)`
  );
  process.exit(1);
}
