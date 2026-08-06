# Architecture: Cloudflare SSR & Strapi Boundary

> **Phase 1 (current)** — Mixed/hybrid foundation: static pages with one on-demand SSR health endpoint.
> No Strapi deployment in this phase.

## Runtime Responsibilities

| Layer              | Runtime                   | Repository                   | Role                                                       |
| ------------------ | ------------------------- | ---------------------------- | ---------------------------------------------------------- |
| **Astro Frontend** | Cloudflare Workers        | `zerniqpro-site` (this repo) | Product pages, support docs, download pages, contact forms |
| **Strapi CMS**     | Cloudflare Containers     | Separate repo (TBD)          | Product content, installation guides, FAQ, troubleshooting |
| **PostgreSQL**     | External managed          | N/A                          | Strapi database                                            |
| **R2**             | Cloudflare Object Storage | N/A                          | Media, software downloads, driver files                    |

## Multi-Site Architecture

The `CMS_SITE_KEY` environment variable determines which site content to fetch from Strapi. This allows a single Strapi instance to serve multiple storefronts (e.g., different brands, different product lines, regional variants) via separate Cloudflare Workers deployments.

```
Strapi (single instance)
├── siteKey: "zerniq-na"      → Worker A (North America product line)
├── siteKey: "zerniq-eu"      → Worker B (EU product line)
├── siteKey: "another-brand"  → Worker C (different brand)
```

## Progressive Migration Path

### Phase 1 (current): Mixed Foundation

- All pages are statically generated from local `.md`/`.mdx` files
- One SSR endpoint: `/api/health.json` runs on-demand (`export const prerender = false`)
- Cloudflare adapter configured, `output` remains at default (static)
- CMS adapter layer created but not called by any page
- Health endpoint confirms Workers runtime readiness

### Phase 2 (current): Site Contract & Connectivity Probe

- Generic `SiteRecord` (Strapi 5 flat entity) and `SiteViewModel` (frontend contract) defined
- Zod validation via `astro/zod` ensures data integrity
- `buildSiteQuery(siteKey)` generates filtered Strapi API paths
- `getSiteConfig()` fetches and validates site config from Strapi
- `/api/cms-probe.json` endpoint: 503 unconfigured / 200 connected / 504 timeout
- Mock Strapi server in `test-cms-integration.mjs` for local CMS contract validation
- Smoke test verifies probe returns 503 when CMS unconfigured

### Phase 3: Per-Route SSR Content

- Product and support pages use `export const prerender = false`
- Content fetched from Strapi via `strapiFetch()`
- Content cache headers configured per route
- Static fallback retained for non-CMS pages

### Phase 4: Full Migration

- All content managed in Strapi
- Static fallback removed
- Global `output: "server"` considered only at this stage
- Shopify integration for cart/checkout (see below)

## Shopify Future Integration

Shopify will only handle:

- Product pricing and variants
- Inventory management
- Cart and checkout
- Order management
- Payment processing

All content (product descriptions, specs, guides, support) remains in Strapi.

## Database Constraints

| Option         | Status                                                |
| -------------- | ----------------------------------------------------- |
| **D1**         | **Prohibited** — Not suitable as Strapi database      |
| **R2 / FUSE**  | **Prohibited** — Object storage, not a database       |
| **PostgreSQL** | **Required** — External managed PostgreSQL for Strapi |

## Environment Variables

| Variable                 | Context | Access | Default                 | Purpose                 |
| ------------------------ | ------- | ------ | ----------------------- | ----------------------- |
| `SITE_URL`               | server  | public | `https://zerniqpro.com` | Canonical site URL      |
| `CMS_SITE_KEY`           | server  | public | `zerniq`                | Multi-site content key  |
| `CMS_REQUEST_TIMEOUT_MS` | server  | public | `8000`                  | Strapi fetch timeout    |
| `STRAPI_URL`             | server  | secret | (none)                  | Strapi API base URL     |
| `STRAPI_API_TOKEN`       | server  | secret | (none)                  | Strapi API bearer token |

Secrets (`STRAPI_URL`, `STRAPI_API_TOKEN`) are accessed via `getSecret()` from `astro:env/server`.

## CMS Adapter Layer

```
src/lib/cms/
├── config.ts   — getCmsConfig() reads env via getSecret() for secrets
├── client.ts   — strapiFetch<T>() wrapper with origin guard
├── errors.ts   — Typed CMS errors (never expose URL, token, or response body)
├── types.ts    — Strapi 5 response structure, CmsConfig
├── models.ts   — SiteRecord (Strapi 5 flat entity) and SiteViewModel (frontend contract)
├── schemas.ts  — Zod validation via astro/zod (SiteRecord → SiteViewModel)
├── queries.ts  — buildSiteQuery(siteKey) returns relative Strapi API path
└── site.ts     — getSiteConfig() fetches and validates site config from Strapi
```

### Security: `strapiFetch()` Origin Guard

- Rejects absolute URLs (`http://`, `https://`) and protocol-relative paths (`//`)
- Validates resolved origin matches `STRAPI_URL` origin
- Callers cannot override `Authorization` or `Accept` headers
- Errors never expose the configured URL or token

## Validation

- `pnpm format:check` — Code formatting
- `pnpm build` — Astro + Cloudflare adapter build
- `pnpm worker:dry-run` — Wrangler dry-run validates Worker entry
- `pnpm test:cms` — CMS integration test against mock Strapi server
- `pnpm test:smoke` — HTTP smoke test against `astro preview`

## This Phase Does NOT Include

- Strapi project creation or deployment
- Cloudflare account configuration
- R2 bucket setup
- PostgreSQL provisioning
- Actual `wrangler deploy`
- Any product, brand, or URL changes
