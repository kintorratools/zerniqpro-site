import { getCmsConfig } from './config';
import { CmsError, CmsNotConfiguredError, CmsTimeoutError } from './errors';

/** Server-only fetch wrapper for Strapi. Always use `cache: 'no-store'` by default. */
export async function strapiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getCmsConfig();

  if (!config.configured) {
    throw new CmsNotConfiguredError();
  }

  const url = new URL(path, config.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(config.apiToken
          ? { Authorization: `Bearer ${config.apiToken}` }
          : {}),
        ...options.headers,
      },
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
