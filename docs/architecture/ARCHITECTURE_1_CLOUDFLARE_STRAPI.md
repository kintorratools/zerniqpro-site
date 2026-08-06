# Architecture: Cloudflare SSR & Strapi Boundary

> **Phase 1** — Establishes the runtime boundary between the Astro frontend and the future Strapi backend. No Strapi deployment in this phase.

## Runtime Responsibilities

| Layer              | Runtime                   | Repository                   | Role                                                       |
| ------------------ | ------------------------- | ---------------------------- | ---------------------------------------------------------- |
| **Astro Frontend** | Cloudflare Workers        | `zerniqpro-site` (this repo) | Product pages, support docs, download pages, contact forms |
| **Strapi CMS**     | Cloudflare Containers     | Separate repo (TBD)          | Product content, installation guides, FAQ, troubleshooting |
| **PostgreSQL**     | External managed          | N/A                          | Strapi database                                            |
| **R2**             | Cloudflare Object Storage | N/A                          | Media, software downloads, driver files                    |

## Multi-Site Architecture

The `CMS_SITE_KEY` environment variable determines which site content to fetch from Strapi. This allows a single Strapi instance to serve multiple storefronts (e.g., North America, Europe) via separate Cloudflare Workers deployments.

```
Strapi (single instance)
├── siteKey: "zerniq-na"  → Worker A (zerniqpro.com)
├── siteKey: "zerniq-eu"  → Worker B (zerniqpro.eu)
└── siteKey: "another"    → Worker C
```

## Progressive Migration Path

### Phase 1 (current): Static Only

- All pages are statically generated from local `.md`/`.mdx` files
- Cloudflare adapter configured, but `output: "server"` is not set
- CMS adapter layer created but not called by any page
- Health endpoint confirms runtime readiness

### Phase 2: Single-Route SSR

- One route (e.g., `/api/health.json`) runs as SSR
- Validates Cloudflare Workers runtime compatibility
- Smoke test verifies runtime detection

### Phase 3: Strapi SSR

- Product/blog pages fetch from Strapi via `strapiFetch()`
- Content cache headers configured
- `output: "server"` enabled per-route

### Phase 4: Full Migration

- All content managed in Strapi
- Static fallback removed
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

## CMS Adapter Layer

```
src/lib/cms/
├── config.ts   — Reads env, returns CmsConfig
├── client.ts   — strapiFetch<T>() wrapper
├── errors.ts   — Typed CMS errors (never expose token)
└── types.ts    — Strapi 5 response structure, CmsConfig
```

## Validation

- `pnpm format:check` — Code formatting
- `pnpm build` — Astro + Cloudflare adapter build
- `pnpm test:smoke` — HTTP smoke test against `astro preview`

## This Phase Does NOT Include

- Strapi project creation or deployment
- Cloudflare account configuration
- R2 bucket setup
- PostgreSQL provisioning
- Actual `wrangler deploy`
- Any product, brand, or URL changes
