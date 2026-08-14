// ── Media types ──

export interface CmsMedia {
  url?: string;
  alternativeText?: string;
  width?: number;
  height?: number;
  mime?: string;
}

export interface CmsMediaView {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

// ── URL utilities ──

/**
 * Resolve a Strapi media URL to an absolute URL.
 *
 * - null / undefined / empty → undefined
 * - `/uploads/...` → prepend cmsOrigin (trailing slash stripped)
 * - `http://` / `https://` → return as-is
 * - `javascript:`, `data:`, `file:` → undefined (unsafe)
 */
export function resolveCmsMediaUrl(
  url: string | null | undefined,
  cmsOrigin: string
): string | undefined {
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
export function sanitizeCmsMediaUrl(
  url: string | null | undefined
): string | undefined {
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
 *
 * Same resolution logic as resolveCmsMediaUrl, but additionally
 * passes the resolved URL through sanitizeCmsMediaUrl to ensure
 * only http(s) URLs are returned.
 */
export function resolveMediaUrl(
  url: string | null | undefined,
  cmsOrigin: string
): string | undefined {
  const resolved = resolveCmsMediaUrl(url, cmsOrigin);
  return sanitizeCmsMediaUrl(resolved);
}

// ── ViewModel converter ──

/**
 * Convert a raw CMS media object to a normalized CmsMediaView.
 *
 * - null / undefined raw → null
 * - empty raw.url → null
 * - alt priority: raw.alternativeText → explicitAlt → ''
 * - width / height from raw if present
 */
export function toCmsMediaView(
  raw: CmsMedia | null | undefined,
  explicitAlt: string | null | undefined
): CmsMediaView | null {
  if (!raw || !raw.url || raw.url.trim() === '') {
    return null;
  }

  const alt = raw.alternativeText ?? explicitAlt ?? '';

  const view: CmsMediaView = { url: raw.url, alt };

  if (raw.width !== undefined) {
    view.width = raw.width;
  }
  if (raw.height !== undefined) {
    view.height = raw.height;
  }

  return view;
}

// ── Unified normalization ──

export interface NormalizedMedia {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  mime?: string;
}

export interface MediaSourceObject {
  url?: string | null;
  src?: string | null;
  alternativeText?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  mime?: string | null;
  format?: string | null;
}

export type MediaInput = string | MediaSourceObject | null | undefined;

export interface NormalizeMediaOptions {
  cmsOrigin?: string;
  explicitAlt?: string | null;
}

function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function isUnsafeProtocol(value: string): boolean {
  return (
    value.startsWith('javascript:') ||
    value.startsWith('data:') ||
    value.startsWith('file:')
  );
}

/**
 * Normalize any supported media input into a single
 * `{ src, alt, width, height, mime }` shape.
 *
 * - `string`: relative `/uploads/*` → resolved against cmsOrigin;
 *   http(s) → passthrough; other `/...` site-relative → passthrough;
 *   unsafe protocol → null.
 * - object (`CmsMedia` or Astro static `ImageMetadata`-like): extracts
 *   `url`/`src`, `alternativeText`/`alt`, `width`, `height`, `mime`/`format`.
 * - `null`/`undefined` → null.
 *
 * Never returns `[object Object]` or an undefined URL.
 */
export function normalizeCmsMedia(
  input: MediaInput,
  options: NormalizeMediaOptions = {}
): NormalizedMedia | null {
  if (input == null) return null;

  const cmsOrigin = (options.cmsOrigin ?? '').replace(/\/+$/, '');
  const explicitAlt = options.explicitAlt ?? null;

  let rawUrl: string | null | undefined;
  let rawAlt: string | null | undefined;
  let width: number | null | undefined;
  let height: number | null | undefined;
  let mime: string | null | undefined;

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

  let src: string;
  if (isHttpUrl(trimmed)) {
    src = trimmed;
  } else if (trimmed.startsWith('/uploads/')) {
    src = `${cmsOrigin}${trimmed}`;
  } else if (trimmed.startsWith('/')) {
    // site-relative static asset (e.g. /_astro/..., /banner-pattern.svg)
    src = trimmed;
  } else {
    return null;
  }

  const alt = rawAlt ?? explicitAlt ?? '';

  return {
    src,
    alt,
    ...(typeof width === 'number' ? { width } : {}),
    ...(typeof height === 'number' ? { height } : {}),
    ...(typeof mime === 'string' && mime.length > 0 ? { mime } : {}),
  };
}

export function isSvgMedia(media: NormalizedMedia | null | undefined): boolean {
  if (!media) return false;
  if (media.mime === 'image/svg+xml') return true;
  return media.src.toLowerCase().split('?')[0].endsWith('.svg');
}
