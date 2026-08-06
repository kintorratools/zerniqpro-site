/** CMS fetch errors — never expose raw token, internal URLs, or response body. */

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

export class CmsContentNotFoundError extends CmsError {
  constructor() {
    super('CMS content was not found');
    this.name = 'CmsContentNotFoundError';
  }
}

export class CmsValidationError extends CmsError {
  constructor() {
    super('CMS response validation failed');
    this.name = 'CmsValidationError';
  }
}
