/** CMS fetch errors — never expose raw token or internal URLs. */

export class CmsError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'CmsError';
  }
}

export class CmsTimeoutError extends CmsError {
  constructor(timeoutMs: number) {
    super(`CMS request timed out after ${timeoutMs}ms`);
    this.name = 'CmsTimeoutError';
  }
}

export class CmsNotConfiguredError extends CmsError {
  constructor() {
    super('CMS is not configured (STRAPI_URL not set)');
    this.name = 'CmsNotConfiguredError';
  }
}
