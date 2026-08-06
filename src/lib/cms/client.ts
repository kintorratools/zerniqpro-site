import { getCmsConfig } from './config';
import { CmsError, CmsNotConfiguredError, CmsTimeoutError } from './errors';

/** Server-only fetch wrapper for Strapi. Always uses `cache: 'no-store'` by default. */
export async function strapiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getCmsConfig();

  if (!config.configured) {
    throw new CmsNotConfiguredError();
  }

  // Reject absolute or protocol-relative URLs that could leak tokens
  if (/^(?:https?:)?\/\//i.test(path)) {
    throw new CmsError('CMS path must be relative to Strapi API base');
  }

  const cmsUrl = new URL(path, config.baseUrl);

  // Ensure the resolved origin matches the configured STRAPI_URL origin
  const strapiOrigin = new URL(config.baseUrl!).origin;
  if (cmsUrl.origin !== strapiOrigin) {
    throw new CmsError('CMS request origin mismatch');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  // Merge headers: callers cannot override Authorization or Accept
  const merged = new Headers(options.headers);
  merged.set('Accept', 'application/json');
  if (config.apiToken) {
    merged.set('Authorization', `Bearer ${config.apiToken}`);
  }

  try {
    const res = await fetch(cmsUrl.toString(), {
      ...options,
      signal: controller.signal,
      headers: merged,
      cache: options.cache ?? 'no-store',
    });

    if (!res.ok) {
      throw new CmsError(`CMS responded with ${res.status}`, res.status);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof CmsError) throw err;

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new CmsTimeoutError(config.timeoutMs);
    }

    // Generic error — do NOT expose internals
    throw new CmsError('CMS request failed');
  } finally {
    clearTimeout(timeout);
  }
}
