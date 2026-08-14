export type ImageTransformProvider = 'none' | 'cloudflare';

export type ImageBreakpointSet = 'productCard' | 'content' | 'hero';

export interface ImageBreakpoints {
  productCard: number[];
  content: number[];
  hero: number[];
}

/**
 * Per-component breakpoint policy.
 *
 * Keeps the number of generated transform variants bounded so we never emit a
 * uniform wall of resolutions for every image. Unpic still caps these against
 * the source width, but the explicit sets keep the intent explicit.
 */
export const IMAGE_BREAKPOINTS: ImageBreakpoints = {
  productCard: [320, 480, 640],
  content: [480, 768, 1024],
  hero: [640, 960, 1280, 1600],
};

export interface ImageTransformConfig {
  provider: ImageTransformProvider;
  /**
   * Optional Cloudflare zone domain for URL transformation.
   *
   * When undefined, @unpic emits a relative `/cdn-cgi/image/...` URL which
   * resolves against the site origin (the recommended same-zone behaviour).
   * Must never be hardcoded here — it comes from runtime/env/site config.
   */
  domain?: string;
  breakpoints: ImageBreakpoints;
}

export function resolveImageTransformProvider(
  value: string | null | undefined
): ImageTransformProvider {
  return (value ?? '').trim().toLowerCase() === 'cloudflare'
    ? 'cloudflare'
    : 'none';
}

export function getImageTransformConfig(
  env: { provider?: string | null; domain?: string | null } = {}
): ImageTransformConfig {
  const domain = (env.domain ?? '').trim();
  return {
    provider: resolveImageTransformProvider(env.provider),
    domain: domain.length > 0 ? domain : undefined,
    breakpoints: IMAGE_BREAKPOINTS,
  };
}

function readImportMetaEnv(): { provider?: string; domain?: string } {
  try {
    const env = (import.meta as { env?: Record<string, unknown> }).env ?? {};
    return {
      provider:
        typeof env.IMAGE_TRANSFORM_PROVIDER === 'string'
          ? env.IMAGE_TRANSFORM_PROVIDER
          : undefined,
      domain:
        typeof env.IMAGE_TRANSFORM_DOMAIN === 'string'
          ? env.IMAGE_TRANSFORM_DOMAIN
          : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Astro runtime entry point. Reads `IMAGE_TRANSFORM_PROVIDER` /
 * `IMAGE_TRANSFORM_DOMAIN` from `import.meta.env` (populated from the
 * `env.schema` declared in `astro.config.mjs`).
 */
export function getRuntimeImageTransformConfig(): ImageTransformConfig {
  return getImageTransformConfig(readImportMetaEnv());
}
