/**
 * Canonical route contract for the ScrewFast/Astro site.
 *
 * Derived from Astro build behavior (NOT guessed):
 * - Astro uses `build.format = 'directory'` by default, so prerendered
 *   (static) pages are emitted as `.../index.html` and served WITH a
 *   trailing slash.
 * - Pages that set `export const prerender = false` are SSR and served
 *   WITHOUT a trailing slash.
 *
 * Prerendered (trailing slash): /fr, /blog, /blog/:id, /insights,
 *   /insights/:id, /fr/blog, /fr/blog/:id, /fr/insights, /fr/insights/:id.
 * SSR (no trailing slash): /, /services, /contact, /products,
 *   /products/:handle, /fr/services, /fr/contact, /fr/products, etc.
 */

/** Legacy template routes that 301-redirect to their canonical equivalent. */
const LEGACY_REDIRECTS = {
  '/pages/contact': '/contact',
  '/pages/services': '/services',
  '/fr/pages/contact': '/fr/contact',
  '/fr/pages/services': '/fr/services',
};

export function isTrailingSlashCanonical(path) {
  const p = (path || '/').replace(/\/+$/, '');
  return (
    p === '/fr' ||
    p === '/blog' ||
    p.startsWith('/blog/') ||
    p === '/insights' ||
    p.startsWith('/insights/') ||
    p === '/fr/blog' ||
    p.startsWith('/fr/blog/') ||
    p === '/fr/insights' ||
    p.startsWith('/fr/insights/')
  );
}

export function canonicalizeRoute(path) {
  const p = (path || '/').replace(/\/+$/, '');
  const clean = p === '' ? '/' : p;
  return isTrailingSlashCanonical(clean) ? clean + '/' : clean;
}

export function expectedCanonicalPath(path) {
  const legacy = LEGACY_REDIRECTS[path];
  return canonicalizeRoute(legacy ?? path);
}

/**
 * Fetch a URL following redirects with loop detection and a redirect cap.
 * Returns { status, finalUrl, html, redirects, error }.
 */
export async function fetchFinal(url, { maxRedirects = 8 } = {}) {
  let current = url;
  const redirects = [];
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(current, { redirect: 'manual' });
    const status = res.status;
    if (status >= 300 && status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        return {
          status,
          finalUrl: current,
          html: '',
          redirects,
          error: 'REDIRECT_WITHOUT_LOCATION',
        };
      }
      const next = new URL(location, current).toString();
      if (redirects.includes(next)) {
        return {
          status,
          finalUrl: next,
          html: '',
          redirects,
          error: 'REDIRECT_LOOP',
        };
      }
      redirects.push(next);
      current = next;
      continue;
    }
    const html = await res.text();
    return { status, finalUrl: current, html, redirects };
  }
  return {
    status: 0,
    finalUrl: current,
    html: '',
    redirects,
    error: 'TOO_MANY_REDIRECTS',
  };
}
