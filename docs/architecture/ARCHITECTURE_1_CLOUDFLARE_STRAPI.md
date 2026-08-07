# Architecture: Cloudflare SSR & Strapi Boundary

> **Phase 1 (completed)** — Mixed/hybrid foundation: static pages with one on-demand SSR health endpoint.
> No Strapi deployment in this phase.

## Runtime Responsibilities

| Layer              | Runtime                   | Repository                   | Role                                                       |
| ------------------ | ------------------------- | ---------------------------- | ---------------------------------------------------------- |
| **Astro Frontend** | Cloudflare Workers        | `zerniqpro-site` (this repo) | Product pages, support docs, download pages, contact forms |
| **Strapi CMS**     | Cloudflare Containers     | Separate repo (TBD)          | Product content, installation guides, FAQ, troubleshooting |
| **PostgreSQL**     | External managed          | N/A                          | Strapi database                                            |
| **R2**             | Cloudflare Object Storage | N/A                          | Media, software downloads, driver files                    |

## Multi-Site Architecture

The `CMS_SITE_KEY` environment variable is the **only** deployment variable that selects which site content to fetch from Strapi. This single key determines all site-specific behavior — page routing, locale availability, and content filtering. All brand identity (name, domain, logo, colors, SEO metadata, social links) is resolved at runtime from Strapi via the Brand entity linked to the selected Site. This allows a single Strapi instance to serve multiple storefronts (e.g., different brands, different product lines, regional variants) via separate Cloudflare Workers deployments, each with its own `CMS_SITE_KEY`.

```
Strapi (single instance)
├── CMS_SITE_KEY: "zerniq"     → Worker A (Zerniq brand, North America)
├── CMS_SITE_KEY: "screwfast"  → Worker B (ScrewFast brand, UK)
├── CMS_SITE_KEY: "aussie"     → Worker C (AussieSteel brand, AU)
```

## Progressive Migration Path

### Phase 1 (current): Mixed Foundation

- All pages are statically generated from local `.md`/`.mdx` files
- One SSR endpoint: `/api/health.json` runs on-demand (`export const prerender = false`)
- Cloudflare adapter configured, `output` remains at default (static)
- CMS adapter layer created but not called by any page
- Health endpoint confirms Workers runtime readiness

### Phase 2 (completed): Site Contract & Connectivity Probe

**Site Record (Strapi 5 flat entity)**:

- `key`, `name`, `domain`, `defaultLocale` — required identity fields
- `defaultSeo` (`{ title?, description? }`) — optional SEO override; may be `null` from Strapi
- `branding` (`{ logoUrl?, faviconUrl?, primaryColor?, accentColor? }`) — optional brand assets; may be `null` from Strapi
- Strapi returns `null` for empty optional components/fields; mapper normalizes `null → undefined`

**Site View Model (frontend contract)**:

- `key`, `name`, `domain`, `defaultLocale`
- `seo` (`{ title, description }`) — defaults to name if not provided, trimmed whitespace → default
- `branding?` — never contains `null`

**Zod validation via `astro/zod`**:

- `key`/`name`/`defaultLocale`: `trim().min(1)` non-empty
- `domain`, `logoUrl`, `faviconUrl`: `z.string().url()` + `refine()` for `http:`/`https:` only
- `primaryColor`/`accentColor`: hex regex accepting only `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`
- `defaultSeo`/`branding` accept `null` (Strapi nullable), inner fields accept `null`
- Errors use fixed messages; never leak Zod issues, data, or siteKey

**Query: `buildSiteQuery(siteKey)`**:

- Uses `URLSearchParams` — no manual encoding
- `filters[key][$eq]`, `pagination[pageSize]=1`, `status=published`
- `fields[0..3]`: only `key`, `name`, `domain`, `defaultLocale`
- `populate[defaultSeo]=*` and `populate[branding]=*` — never `populate=*`

**Endpoint: `/api/cms-probe.json`**:

- Calls `getSiteConfig()` (not raw `strapiFetch`) — full pipeline exercised
- All responses include `X-Robots-Tag: noindex, nofollow`
- 503 unconfigured / 200 ok + site data / 504 timeout / 502 error

**Integration test: `test-cms-integration.mjs`**:

- Verifies `dist/server/wrangler.json` build artifact exists
- Starts mock Strapi on dynamic port (`listen(0)`) — validates Auth, Accept, query params
- Spawns production Worker via `wrangler dev --config dist/server/wrangler.json --var KEY:VALUE ...` with dynamic port
- Both `astro dev` and `astro preview` use the Cloudflare Vite plugin + `workerd` runtime (not plain Node SSR)
- Boundary tests: invalid hex → 502, invalid protocol → 502, nullable fields → 200 with safe defaults
- `.dev.vars` is never created or modified by the test

### Phase 3 (completed): Shadow SSR & Product Contract

- Product Contract established: `ProductRecord` → `ProductViewModel` with Zod validation
- Dynamic zone block types: text, feature-grid, specifications
- Shadow SSR route: `/preview/products/[handle]` validates full CMS → Worker pipeline
- Product SSR integration test uses `wrangler dev` with production bundle
- Existing `/products/[id]` static pages remain unchanged
- Product JSON-LD, canonical URLs, and SEO metadata verified

### Phase 4 (completed): Brand / Site / i18n Foundation

- Brand entity separated from Site: Brand holds logo, favicon, colors, domain, social links
- Site references Brand via relation (documentId, key); no longer holds branding directly
- Locale system: CMS-controlled multi-language (en, es, de, fr, pt-BR)
- Runtime config layer: `getRuntimeConfig()` aggregates Brand + Site + Locales
- i18n tools: `getEnabledLocales()`, `isLocaleEnabled()`, `getDefaultLocale()`
- Brand/i18n integration test via wrangler dev

### Phase 4.1 (current): Brand Query Refactor & Generic Template Scan

- `CMS_SITE_KEY` is the only deployment-level variable; all brand identity comes from Strapi
- Brand queried by its own `key` field (`filters[key][$eq]`) — no longer filtered by `filters[site][key][$eq]`
- Runtime flow: fetch Site first → extract `brandKey` → parallel `getBrand(brandKey)` + `getLocales(siteKey)`
- `SiteViewModel` carries `brandKey` as the relation source (not inline brand data)
- All five locale codes (en, es, de, fr, pt-BR) are fixed in schema; CMS controls enable/disable only
- English (en) always required: must exist, be enabled, be the default locale
- `getLocales()` returns all locale records (including disabled); `getEnabledLocales()` filters for display
- Generic template scan script (`test:generic`) detects brand-specific hardcoded strings in source

### Phase 5: Full Migration

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
├── config.ts          — getCmsConfig() reads env via getSecret() for secrets
├── client.ts          — strapiFetch<T>() wrapper with origin guard
├── errors.ts          — Typed CMS errors (never expose URL, token, or response body)
├── types.ts           — Strapi 5 response structure, CmsConfig
├── models.ts          — SiteRecord (Strapi 5 flat entity) and SiteViewModel (frontend contract)
├── schemas.ts         — Zod validation via astro/zod (SiteRecord → SiteViewModel)
├── queries.ts         — buildSiteQuery(siteKey) returns relative Strapi API path
├── site.ts            — getSiteConfig() fetches and validates site config from Strapi
├── brand-models.ts    — BrandRecord and BrandViewModel
├── brand-schemas.ts   — Brand Zod validation
├── brand-queries.ts   — buildBrandQuery()
├── brand.ts           — getBrand()
├── locale-models.ts   — LocaleRecord and LocaleViewModel
├── locale-schemas.ts  — Locale Zod validation
├── locale-queries.ts  — buildLocaleQuery()
├── locale.ts          — getLocales()
├── product-models.ts  — ProductRecord and ProductViewModel
├── product-schemas.ts — Product Zod validation
├── product-queries.ts — buildProductQuery()
└── product.ts         — getProductByHandle()
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
- `pnpm test:product` — Product SSR integration test via wrangler dev
- `pnpm test:brand-i18n` — Brand & i18n integration test via wrangler dev
- `pnpm test:smoke` — HTTP smoke test against `astro preview`

## This Phase Does NOT Include

- Strapi project creation or deployment
- Cloudflare account configuration
- R2 bucket setup
- PostgreSQL provisioning
- Actual `wrangler deploy`
- Any product, brand, or URL changes
