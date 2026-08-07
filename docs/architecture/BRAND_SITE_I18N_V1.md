# Brand / Site / i18n Foundation V1

## Overview

Phase 4 separates branding from site configuration and introduces a CMS-controlled locale system. A new **Brand** entity holds visual identity and domain metadata, while **Site** references Brand via a relation instead of embedding branding directly. A parallel **Locale** entity enables CMS-driven multi-language support with runtime tools for locale resolution.

## 1. Brand vs Site Separation

In Phase 3 and earlier, `Site` held branding directly as an optional component (`branding: { logoUrl, faviconUrl, primaryColor, accentColor }`). Phase 4 extracts branding into a standalone **Brand** entity and links Site to Brand via a Strapi relation.

### Brand Entity

| Field         | Type       | Required | Notes                                                 |
| ------------- | ---------- | -------- | ----------------------------------------------------- |
| `key`         | `string`   | Yes      | Unique lookup key (e.g. `zerniq`)                     |
| `name`        | `string`   | Yes      | Display name used in OG/title fallbacks               |
| `domain`      | `string`   | Yes      | Canonical domain (`https://...`)                      |
| `logo`        | `object`   | No       | `{ url, alt, width, height }`                         |
| `favicon`     | `string`   | No       | Favicon URL                                           |
| `colors`      | `object`   | No       | `{ primary, accent }` — hex colors                    |
| `seo`         | `object`   | No       | `{ title?, description? }` — brand-level SEO defaults |
| `socialLinks` | `object[]` | No       | `{ platform, url }[]` — social profiles               |

### Site Entity (Revised)

| Field           | Type       | Required | Notes                                             |
| --------------- | ---------- | -------- | ------------------------------------------------- |
| `key`           | `string`   | Yes      | Unique lookup key (e.g. `zerniq`)                 |
| `name`          | `string`   | Yes      | Site display name                                 |
| `defaultLocale` | `string`   | Yes      | Default locale code (e.g. `en`)                   |
| `defaultSeo`    | `object`   | No       | `{ title?, description? }` — site-level overrides |
| `brand`         | `relation` | Yes      | `{ documentId, key }` reference to Brand          |

The `branding` component is removed from Site. All visual identity fields now live on Brand.

### SiteViewModel (Frontend Contract)

```ts
interface SiteViewModel {
  key: string;
  name: string;
  defaultLocale: string;
  seo: { title: string; description: string };
  brandKey: string;
}
```

The ViewModel stores `brandKey` as the relation source. Brand identity is resolved in a subsequent fetch — Site no longer embeds brand domain or name directly.

### BrandViewModel (Frontend Contract)

```ts
interface BrandViewModel {
  key: string;
  name: string;
  domain: string;
  logo?: { url: string; alt?: string; width?: number; height?: number };
  favicon?: string;
  colors?: { primary: string; accent: string };
  seo: { title: string; description: string };
  socialLinks: Array<{ platform: string; url: string }>;
}
```

## 2. Data Flow

```
Strapi CMS
├── Brand (key=zerniq)
│   ├── name: "Zerniq"
│   ├── domain: "https://zerniqpro.com"
│   ├── logo: { url, alt, width, height }
│   ├── favicon: "https://..."
│   ├── colors: { primary: "#0A0A0A", accent: "#00E5FF" }
│   ├── seo: { title, description }
│   └── socialLinks: [{ platform, url }, ...]
│
├── Site (key=zerniq, brand={ documentId, key })
│   ├── defaultLocale: "en"
│   └── defaultSeo: { title?, description? }
│
└── Locale (en, es, de, fr, pt-BR)
    ├── code: "en"
    ├── enabled: true
    └── isDefault: true
              │
              ▼
  1. getSiteConfig(siteKey)  → SiteViewModel { brandKey: "zerniq", ... }
              │
              ▼
  2. Promise.all([
       getBrand(brandKey),   // filters[filters[key][$eq]]
       getLocales(siteKey),  // all locale entries (including disabled)
     ])
              │
              ▼
     RuntimeConfig {
       site: SiteViewModel,
       brand: BrandViewModel,
       locales: LocaleViewModel[]
     }
              │
              ▼
     getEnabledLocales() → ["en", "es", "fr"]
     getDefaultLocale()  → "en"
     isLocaleEnabled("de") → false
```

### Runtime Config Layer

`getRuntimeConfig()` is the single entry point that resolves all Phase 4.1 data. It follows a two-step pattern:

1. `getSiteConfig(siteKey)` — fetches Site first, extracts `brandKey` from the result
2. `Promise.all([getBrand(brandKey), getLocales(siteKey)])` — fetches Brand and Locales in parallel using the resolved `brandKey`

The result is a `RuntimeConfig` object consumed by layout components, middleware, and i18n utilities. All calls share the same `strapiFetch` origin guard and error handling.

### Brand Query (`brand-queries.ts`)

`buildBrandQuery(brandKey)` filters by `filters[key][$eq]` — the Brand's own unique key, not the site key. This decouples Brand lookup from Site, allowing the same Brand to be referenced by multiple Sites if needed.

### Site Runtime (`site-runtime.ts`)

`getRuntimeConfig()` first calls `getSiteConfig()` to obtain `brandKey` from the Site record, then issues `getBrand(brandKey)` and `getLocales(siteKey)` in parallel. Brand is no longer populated inline by the Site query.

### i18n Config (`i18n/config.ts`)

| Export                  | Return Type         | Description                            |
| ----------------------- | ------------------- | -------------------------------------- |
| `getEnabledLocales()`   | `string[]`          | Locale codes where `enabled === true`  |
| `getDefaultLocale()`    | `string`            | Locale code where `isDefault === true` |
| `isLocaleEnabled(code)` | `boolean`           | Whether a given locale code is enabled |
| `getLocaleConfig()`     | `LocaleViewModel[]` | All locale records after validation    |

## 3. Locale Lifecycle

### CMS-Controlled

Locales are managed in Strapi. The Content Editor toggles a locale's `enabled` flag via the Strapi admin panel. The five supported locale codes (`en`, `es`, `de`, `fr`, `pt-BR`) are fixed in the schema — the CMS controls which are enabled or disabled, but cannot add or remove locale codes. All locale entries (including disabled ones) are fetched from Strapi; `getEnabledLocales()` filters the result for display.

### Rules

| Rule              | Detail                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `en` is mandatory | The `en` locale MUST always exist, be enabled, and be the default. It is the canonical fallback for all content. |
| Default locale    | Exactly one locale has `isDefault: true`. Must be `en`.                                                          |
| Supported codes   | `en`, `es`, `de`, `fr`, `pt-BR` — fixed in the schema; CMS cannot add/remove codes.                              |
| Enabled toggle    | Non-default locales can be toggled on/off. Disabled locales are excluded from `getEnabledLocales()`.             |
| No auto-creation  | The frontend never creates or modifies locale records.                                                           |

### Locale Record (Strapi 5 Flat Entity)

| Field       | Type      | Required | Notes                                |
| ----------- | --------- | -------- | ------------------------------------ |
| `code`      | `string`  | Yes      | ISO locale code (e.g. `en`, `es`)    |
| `enabled`   | `boolean` | Yes      | CMS-controlled enable/disable toggle |
| `isDefault` | `boolean` | Yes      | Exactly one locale must be `true`    |

### LocaleViewModel (Frontend Contract)

```ts
interface LocaleViewModel {
  code: string;
  enabled: boolean;
  isDefault: boolean;
}
```

### Query: `buildLocaleQuery()`

- `pagination[pageSize]=100` — all locales in one request
- `fields[0..2]`: `code`, `enabled`, `isDefault`
- No filters — returns all locale records
- Always `status=published`

### Validation (Zod)

- `code`: `/^[a-z]{2}(-[A-Z]{2})?$/` — enforces `xx` or `xx-XX` format
- `enabled`, `isDefault`: `z.boolean()`
- At least one locale with `enabled: true`
- Exactly one locale with `isDefault: true`
- `en` must be present and enabled

## 4. Future Auto-Translation Interface

> **Phase 5+ placeholder** — not implemented in Phase 4.

Strapi's i18n plugin will provide content-level translation for all collection types (Product, Page, etc.). The planned workflow:

1. **Source content** is authored in the default locale (`en`).
2. **Strapi i18n plugin** creates locale variants for each enabled locale.
3. **Translation providers** (DeepL, Google Translate API, or similar) are triggered by Strapi lifecycle hooks or admin UI action.
4. **Translation queue** holds pending auto-translations with status tracking.
5. **CMS webhook** notifies the Worker to purge cached locale-specific pages.

The i18n plugin stores per-locale content in Strapi's database. The frontend queries content by locale via `?locale=es` query parameter on existing API endpoints.

## 5. Manual Review Process

All translations — whether auto-generated or manual — follow a review workflow before publication:

1. **Draft** — Translation is created (auto or manual) and saved as draft.
2. **Review** — A content editor reviews the translation in Strapi's admin panel, comparing against the source locale.
3. **Publish** — After review, the editor publishes the locale variant, making it available via the API.
4. **Stale detection** — If the source content changes, translated drafts are flagged for re-translation.

The review process is entirely within Strapi Admin. The frontend only ever receives published content.

## 6. API Reference

### New Files

| File                              | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `src/lib/cms/brand-models.ts`     | `BrandRecord` and `BrandViewModel` interfaces                    |
| `src/lib/cms/brand-schemas.ts`    | Zod validation: `BrandRecord` → `BrandViewModel`                 |
| `src/lib/cms/brand-queries.ts`    | `buildBrandQuery(brandKey)` — returns Strapi API path            |
| `src/lib/cms/brand.ts`            | `getBrand(brandKey)` — fetches and validates brand from Strapi   |
| `src/lib/cms/locale-models.ts`    | `LocaleRecord` and `LocaleViewModel` interfaces                  |
| `src/lib/cms/locale-schemas.ts`   | Zod validation: `LocaleRecord[]` → `LocaleViewModel[]`           |
| `src/lib/cms/locale-queries.ts`   | `buildLocaleQuery()` — returns Strapi API path for all locales   |
| `src/lib/cms/locale.ts`           | `getLocales()` — fetches and validates all locales from Strapi   |
| `src/lib/runtime/site-runtime.ts` | `getRuntimeConfig()` — aggregates Site + Brand + Locales         |
| `src/lib/i18n/config.ts`          | `getEnabledLocales()`, `isLocaleEnabled()`, `getDefaultLocale()` |

### Modified Files

| File                              | Change                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `src/lib/cms/models.ts`           | SiteRecord: remove `branding`, add `brand: { documentId, key }`                      |
|                                   | SiteViewModel: add `brandKey: string`                                                |
| `src/lib/cms/schemas.ts`          | Remove `branding` from `siteRecordSchema`; add brand relation schema                 |
|                                   | `toViewModel()` extracts `brandKey` from the brand relation                          |
| `src/lib/cms/queries.ts`          | `buildSiteQuery()` populates `brand` instead of `branding`                           |
| `src/lib/cms/site.ts`             | `getSiteConfig()` returns SiteViewModel with `brandKey`; Brand is fetched separately |
| `src/lib/cms/brand.ts`            | `getBrand(brandKey)` queries by Brand.key via `filters[key][$eq]`                    |
| `src/lib/cms/brand-queries.ts`    | `buildBrandQuery(brandKey)` filters on Brand's own key                               |
| `src/lib/runtime/site-runtime.ts` | `getRuntimeConfig()` fetches Site first, then parallel Brand + Locales               |

## 7. Validation

- `pnpm format:check` — Code formatting
- `pnpm build` — Astro + Cloudflare adapter build
- `pnpm test:brand-i18n` — Brand & i18n integration test via `wrangler dev`
  - Verifies `getRuntimeConfig()` aggregates Brand + Site + Locales
  - Mock Strapi serves `/api/brands`, `/api/sites`, and `/api/locales`
  - Validates Brand→Site relation population
  - Validates enabled/disabled locale toggling
  - Validates `getEnabledLocales()`, `isLocaleEnabled()`, `getDefaultLocale()`

## This Phase Does NOT Include

- Content translation (Phase 5+)
- Strapi i18n plugin configuration
- Locale-specific page routing
- Language switcher UI
- Translation provider integration (DeepL, Google Translate, etc.)
- Modifying existing static pages to use runtime config
