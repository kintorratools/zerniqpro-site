# Product Contract V1

## Overview

The Product Contract defines the data shape, validation rules, and API query for Strapi 5 product content. It is consumed by the shadow SSR route `/preview/products/[handle]` which validates end-to-end product delivery through the Cloudflare Worker runtime.

## Product Record (Strapi 5 Flat Entity)

| Field        | Type                                                       | Required | Notes                                            |
| ------------ | ---------------------------------------------------------- | -------- | ------------------------------------------------ |
| `id`         | `number`                                                   | Yes      | Strapi internal ID                               |
| `documentId` | `string`                                                   | Yes      | Strapi document ID                               |
| `handle`     | `string`                                                   | Yes      | URL-safe identifier (lowercase, digits, hyphens) |
| `name`       | `string`                                                   | Yes      | Displayed product name                           |
| `summary`    | `string`                                                   | Yes      | Short description for SEO/hero fallback          |
| `seo`        | `{title?, description?}`                                   | No       | Optional SEO override; may be `null`             |
| `hero`       | `{eyebrow?, heading?, description?, imageUrl?, imageAlt?}` | No       | Optional hero section; may be `null`             |
| `sections`   | `ProductSection[]`                                         | No       | Dynamic zone content blocks; may be `null`       |

## Supported Block Types (Dynamic Zones)

| `__component`            | Block Type       | Fields                                      |
| ------------------------ | ---------------- | ------------------------------------------- |
| `content.text`           | `text`           | `heading?`, `body?`                         |
| `content.feature-grid`   | `feature-grid`   | `heading?`, `items: [{title, description}]` |
| `content.specifications` | `specifications` | `heading?`, `rows: [{label, value}]`        |

Unknown `__component` values cause a `CmsValidationError`.

## Product View Model (Frontend Contract)

The ViewModel is derived from ProductRecord after Zod validation:

- `id`, `documentId` removed
- `__component` removed, replaced by `type` discriminator
- All `null` normalized to `undefined`
- SEO: empty/null → defaults (title=product name, description=summary)
- Hero: empty/null heading → product name, description → summary
- `hero.imageUrl` requires non-empty `hero.imageAlt`

## Validation Rules (Zod)

- `handle`: `/^[a-z0-9]+(-[a-z0-9]+)*$/`
- Required strings: `trim().min(1)`
- URLs: `http:`/`https:` only (enforced via `URL` parsing)
- Hero: `imageUrl` present → `imageAlt` required
- Limits: blocks ≤ 30, feature-grid items ≤ 24, spec rows ≤ 100
- No `set:html` or raw HTML rendering
- Fixed error messages — never leak Zod issues, data, or siteKey

## Query: `buildProductQuery(siteKey, handle)`

- `URLSearchParams` — no manual encoding
- `filters[site][key][$eq]` + `filters[handle][$eq]`
- `pagination[pageSize]=1`, `status=published`
- `fields[0..2]`: handle, name, summary only
- `populate[seo]=*`, `populate[hero]=*`, `populate[sections]=*` — never `populate=*`

## Shadow SSR Route: `/preview/products/[handle]`

- `export const prerender = false`
- Calls `getSiteConfig()` + `getProductByHandle()`
- Standalone semantic HTML (not MainLayout)
- Full SEO: title, meta description, canonical, robots noindex/nofollow
- Product JSON-LD with `@type: Product`, `brand.name` from site config
- Error states: 503 (unconfigured), 504 (timeout), 404 (not found), 502 (validation/error)
- Error pages never leak URL, token, response body, or stack traces
- All responses: `X-Robots-Tag: noindex, nofollow`

## Integration Test: `test-product-ssr.mjs`

- Production Worker bundle via `wrangler dev --config dist/server/wrangler.json --var ...`
- Mock Strapi handles both `/api/sites` and `/api/products`
- Validates: Authorization, Accept, site+handle filters, fields, status, populate
- Verifies: 200 HTML with h1, SEO, canonical, JSON-LD, no Offer, 3 blocks
- Verifies: no ScrewFast, token, or CMS URL leakage
- Error scenarios: 404 (not found), 502 (invalid data)

## This Phase Does NOT Include

- Modifying existing `/products/[id]` static pages
- Switching production routing to CMS-driven product pages
- Shopify pricing/inventory integration
