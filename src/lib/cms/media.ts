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
