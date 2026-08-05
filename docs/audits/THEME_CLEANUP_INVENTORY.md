# Theme Cleanup Inventory: ScrewFast → ZERNIQ

> **Audit Date:** 2026-08-05  
> **Repository:** `zerniqpro-site` (`theme-cleanup` branch)  
> **Baseline Tag:** `screwfast-baseline-verified-20260805` (commit `35a5cd0`)  
> **Source Template:** [mearashadowfax/ScrewFast](https://github.com/mearashadowfax/ScrewFast) — MIT License, Copyright (c) 2024 Emil Gulamov  
> **Audit Scope:** Read-only. No files modified. No packages installed. No code deleted.

---

## 1. Brand References

### 1.1 Occurrences by Category

| Term | Unique Files | Count |
|------|-------------|-------|
| `ScrewFast` / `screwfast` | ~55+ | ~200+ occurrences |
| `screwfast.uk` | ~18 | ~30+ |
| `mearashadowfax` | 21 | ~25 |
| `Emil Gulamov` | 3 | 3 |
| `screwfast-template` (npm name) | 1 | 1 |

### 1.2 Critical Configuration Files Requiring Change

| File | Field | Current Value |
|------|-------|---------------|
| `src/data_files/constants.ts:4` | `SITE.title` | `'ScrewFast'` |
| `src/data_files/constants.ts:10` | `SITE.url` | `'https://screwfast.uk'` |
| `src/data_files/constants.ts:11` | `SITE.author` | `'Emil Gulamov'` |
| `astro.config.mjs:11` | `site` | `'https://screwfast.uk'` |
| `astro.config.mjs:37` | Starlight `title` | `'ScrewFast Docs'` |
| `astro.config.mjs:106` | Starlight social `href` | `'https://github.com/mearashadowfax/ScrewFast'` |
| `astro.config.mjs:124,131` | OG/Twitter image URLs | `'https://screwfast.uk/social.webp'` |
| `package.json:2` | `name` | `"screwfast-template"` |
| `src/pages/manifest.json.ts:47-48` | PWA manifest | `'ScrewFast'` |
| `src/components/Meta.astro:123` | Fallback domain | `'screwfast.uk'` |
| `.github/FUNDING.yml:13` | Buy Me a Coffee | `mearashadowfax` |
| `CODE_OF_CONDUCT.md:62` | Reporting email | `emilgulamov@live.com` |

### 1.3 Navigation & Social Links

| File | Link Target |
|------|-------------|
| `src/utils/navigation.ts:33` | `github: 'https://github.com/mearashadowfax/ScrewFast'` |
| `src/utils/navigation.ts:31-35` | Facebook, Twitter, Google, Slack — placeholder URLs |
| `src/utils/fr/navigation.ts:32` | Same GitHub link; Facebook, X, Google, Slack → `'#'` |
| `src/components/sections/misc/ContactSection.astro:161-162` | `support@screwfast.uk` |

### 1.4 Content Files (All Languages)

All page `.astro` files (en + fr): `index`, `services`, `contact`, `products/index`, `products/[id]`, `blog/index`, `blog/[id]` contain "ScrewFast" in hero titles, subtitles, meta descriptions, and structured data.

All documentation `.mdx` files across 7 languages (`de`, `en`, `es`, `fa`, `fr`, `ja`, `zh-cn`) reference "ScrewFast" in titles, descriptions, and welcome pages.

All data files: `faqs.json`, `features.json`, `pricing.json`, `mega_link.ts` (+ fr variants) reference ScrewFast.

---

## 2. Demo and Fabricated Business Content

### 2.1 Testimonials

| Location | Persona | Company | Cited Claim |
|----------|---------|---------|-------------|
| `src/pages/index.astro` (en+fr) | Samantha Ruiz | ConstructIt Inc. | "boosted our project efficiency" |
| `src/pages/products/index.astro` (en+fr) | Jason Clark | TopBuild | (generic product testimonial) |
| `src/pages/products/index.astro` (en+fr) | Maria Gonzalez | Creative Spaces | (generic product testimonial) |
| `src/pages/products/index.astro` (en+fr) | Richard Kim | WoodWright | (generic product testimonial) |

**Verdict:** All 4 personas, 4 companies, and all quotes are fictitious. All use Unsplash stock photos.

### 2.2 Fabricated Statistics

| Page | Statistic | Verdict |
|------|-----------|---------|
| `index.astro` (en+fr) | "70k+ customers", "35% efficiency boost", "15.3% cost reduction", "2x assembly speed" | FICTITIOUS |
| `services.astro` (en+fr) | "96% satisfaction", "99.8% completion rate", "5,000+ installations", "85% YoY growth" | FICTITIOUS |
| `index.astro` (en+fr) | "4.8 / 5 rating", "12.8k+ reviews", "7k+ avatar badge" | FICTITIOUS |

### 2.3 Pricing Plans (Fictitious)

| File | Plan | Price | Billing |
|------|------|-------|---------|
| `src/data_files/pricing.json` | "Starter Kit" | $49.00 | USD / monthly |
| `src/data_files/pricing.json` | "Professional Toolbox" | $89.00 | USD / monthly (badged "Best value") |
| `src/data_files/fr/pricing.json` | "Starter Kit" (fr) | $49.00 | USD / mensuel |
| `src/data_files/fr/pricing.json` | "Professional Toolbox" (fr) | $89.00 | USD / mensuel |

**ZERNIQ Impact:** Purchases will initially redirect to Amazon, so no in-site pricing or subscription tiers are needed.

### 2.4 Login / Signup / Auth (All Demo)

| Component | Status |
|-----------|--------|
| `src/components/sections/misc/Authentication.astro` | Hosts all 3 auth modals |
| `src/components/ui/forms/LoginModal.astro` | `data-demo-form` — "Demo only – sign-in is not connected to a backend." |
| `src/components/ui/forms/RegisterModal.astro` | `data-demo-form` — "Demo only – registration is not connected to a backend." |
| `src/components/ui/forms/RecoverModal.astro` | `data-demo-form` — "Demo only – password recovery is not connected to a backend." |
| `src/components/ui/buttons/GoogleBtn.astro` | "Sign in with Google" stub |
| `src/components/ui/buttons/GithubBtn.astro` | "Sign in with GitHub" stub |

**Verdict:** All auth is non-functional demo. ZERNIQ needs no auth (redirect-to-Amazon model).

### 2.5 Demo Forms

| File | Form Type | Message |
|------|-----------|---------|
| `src/assets/scripts/demoForms.js` | Intercepts all `[data-demo-form]` | "Demo only — this form is not connected to a backend." |
| `ContactSection.astro` | Contact form | `data-demo-form` |
| `LoginModal.astro` | Sign in | `data-demo-form` |
| `RegisterModal.astro` | Sign up | `data-demo-form` |
| `RecoverModal.astro` | Forgot password | `data-demo-form` |
| `FooterSection.astro` | Newsletter signup | `data-demo-form` |

### 2.6 Partner Logos (All Placeholder)

`src/data_files/constants.ts` contains 4 inline SVG logos, each with:
> `Logo is used for demonstration purposes only and should be replaced in customized versions.`

### 2.7 Fictitious Company Data

| Field | Value |
|-------|-------|
| Company name | ScrewFast |
| Address (ContactSection) | 72 Union Terrace, E10 4PE London |
| Support email | support@screwfast.uk |
| Tagline | "Top-quality Hardware Tools" |

---

## 3. Routes and Pages

### 3.1 Complete Route Inventory

| Source File | Output URL | En | Fr | Classification | Reasoning |
|-------------|------------|-----|-----|----------------|-----------|
| `src/pages/index.astro` | `/` | Y | `/fr` | **MODIFY** | Replace hero, stats, testimonials with ZERNIQ content; keep layout structure |
| `src/pages/404.astro` | `/404` | Y | — | **KEEP** | Standard 404, rebrand only |
| `src/pages/services.astro` | `/services` | Y | `/fr/services` | **DELETE** | Entirely ScrewFast construction services; ZERNIQ has no equivalent |
| `src/pages/contact.astro` | `/contact` | Y | `/fr/contact` | **MODIFY** | Keep route; replace form, address, email, map |
| `src/pages/blog/index.astro` | `/blog` | Y | `/fr/blog` | **MODIFY** | Keep route; rename to support/article; replace all content |
| `src/pages/blog/[id].astro` | `/blog/:id` | Y | `/fr/blog/:id` | **MODIFY** | Redirect to new support/article schema |
| `src/pages/products/index.astro` | `/products` | Y | `/fr/products` | **MODIFY** | Keep route for Amazon product listings; replace all content |
| `src/pages/products/[id].astro` | `/products/:id` | Y | `/fr/products/:id` | **MODIFY** | Replace fake hardware with real ZERNIQ products |
| `src/pages/insights/[id].astro` | `/insights/:id` | — (list page missing) | — | **DELETE** | Fictitious industry content; no use for ZERNIQ |
| `src/pages/favicon.ico.ts` | `/favicon.ico` | — | — | **KEEP** | Rebrand icon only |
| `src/pages/robots.txt.ts` | `/robots.txt` | — | — | **MODIFY** | Update sitemap URL, add GPTBot/OAI policies |
| `src/pages/manifest.json.ts` | `/manifest.json` | — | — | **KEEP** | Rebrand name/short_name only |

### 3.2 Dynamic Route Parameters

| Route | Param | Content Source |
|-------|-------|---------------|
| `/products/:id` | `id` | `src/content/products/` (4 items per language) |
| `/blog/:id` | `id` | `src/content/blog/` (3 posts per language) |
| `/insights/:id` | `id` | `src/content/insights/` (3 items per language) |

### 3.3 Summary

| Classification | Count |
|----------------|-------|
| KEEP | 3 (404, favicon.ico, manifest.json) |
| MODIFY | 8 |
| DELETE | 2 (services, insights) |
| REPLACE | 0 (covered by MODIFY) |
| MOVE | 0 |
| **Total routes requiring action** | **10** |

---

## 4. Shopify-Compatible Target Routes

If the site later migrates to native Shopify, the following current routes would conflict:

| Shopify Target | Current Equivalent | Status |
|----------------|-------------------|--------|
| `/products/{handle}` | `/products/[id]` | Compatible — slug-based |
| `/blogs/support/{handle}` | `/blog/[id]` | **Incompatible** — must rename `/blog` → `/blogs/support` |
| `/pages/downloads` | **Missing** | No equivalent |
| `/pages/warranty` | **Missing** | No equivalent |
| `/pages/contact` | `/contact` | Compatible |
| `/pages/privacy` | **Missing** | No equivalent |

**Recommendation:** Add `/pages/downloads`, `/pages/warranty`, `/pages/privacy` as new routes now (even if stubs) to establish URL stability before Shopify migration. Rename `/blog` → `/support` or `/blogs/support` in **Stage B**.

---

## 5. Content Collections

### 5.1 `products` Collection

**Current Schema** (`src/content.config.ts`):
```ts
title, description, main { id, content, imgCard, imgMain, imgAlt },
tabs[] { id, dataTab, title },
longDescription { title, subTitle, btnTitle, btnURL },
descriptionList[] { title, subTitle },
specificationsLeft[] { title, subTitle },
specificationsRight[]? { title, subTitle },
tableData[]? { feature[], description[][] },
blueprints { first?, second? }
```

**ZERNIQ Needs:**
- [x] `title` — Keep
- [x] `description` — Keep
- [x] `imgCard`, `imgMain`, `imgAlt` — Keep (product images)
- [x] `specificationsLeft/Right` — Keep (repurpose as tech specs)
- [ ] `tabs` — REMOVE (no tab UI needed for Amazon redirect)
- [ ] `longDescription.btnTitle/btnURL` — REMOVE (Amazon links will be per-product)
- [ ] `blueprints` — REMOVE (construction blueprints, not relevant)
- [ ] `tableData` — REMOVE (overly complex, use list-based specs)
- [ ] **MISSING:** `amazonUrl` — Link to Amazon product page
- [ ] **MISSING:** `category` — Product categories (drills, saws, accessories)
- [ ] **MISSING:** `sku` — Product SKU code
- [ ] **MISSING:** `compatibility` — OS/model compatibility list

### 5.2 `blog` Collection

**Current Schema:**
```ts
title, description, author, role?, authorImage, authorImageAlt,
pubDate, cardImage, cardImageAlt, readTime, tags[]
```

**Current Content:** 3 posts (en + fr) all ScrewFast branded, all by fictitious authors.

**ZERNIQ Needs (rename to `support` or `articles`):**
- [x] `title`, `description`, `pubDate`, `cardImage`, `tags` — Keep
- [ ] `author`, `role`, `authorImage` — REMOVE (no author persona)
- [ ] `readTime` — REMOVE
- [ ] **MISSING:** `category` — (installation, troubleshooting, FAQ, maintenance)
- [ ] **MISSING:** `relatedProducts[]` — Link to relevant products
- [ ] **MISSING:** `reviewedDate` — Last content review date
- [ ] **MISSING:** `reviewer` — Content reviewer name

### 5.3 `insights` Collection

**Current Content:** 3 articles (en + fr), all ScrewFast marketing fluff.

**Verdict:** **DELETE ENTIRE COLLECTION.** ZERNIQ has no use for "insights" content.

### 5.4 `docs` Collection (Starlight)

**Current Content:** ~35 MDX files across 7 languages covering construction guides, tool care, project planning, safety, technical specs.

**Verdict:** **DELETE ALL EXISTING DOCS CONTENT.** Replace with ZERNIQ installation guides, user manuals, troubleshooting.

**Starlight itself:** Keep for doc rendering. Useful for installation guides and product manuals.

---

## 6. JavaScript and Dependencies

### 6.1 Production Dependencies

| Package | Usage Location | Usage Type | Classification | Reasoning |
|---------|---------------|------------|----------------|------------|
| `astro` v7.1.6 | Entire project | Framework | **REQUIRED** | |
| `@astrojs/check` | Type checking | Dev tool | **REQUIRED** | |
| `@astrojs/mdx` | `astro.config.mjs` | MDX content rendering | **REQUIRED** | Docs use MDX |
| `@astrojs/sitemap` | `astro.config.mjs` | Sitemap generation | **REQUIRED** | SEO |
| `@astrojs/starlight` | `astro.config.mjs` | Documentation UI | **REQUIRED** | User manuals via docs |
| `@tailwindcss/vite` | `astro.config.mjs` | CSS framework | **REQUIRED** | |
| `tailwindcss` | Project-wide | CSS utilities | **REQUIRED** | |
| `sharp` | Image optimization | Image processing (Astro) | **REQUIRED** | |
| `sharp-ico` | `favicon.ico.ts` | ICO generation | **CONDITIONAL** | Only if favicon.ico generation kept |
| `html-minifier-terser` | `process-html.mjs` | HTML minification | **REQUIRED** | Post-build optimization |
| `clipboard` | `SocialShare.astro` | Copy-to-clipboard | **CONDITIONAL** | Only if social sharing kept |
| `gsap` | `ProductDetail.astro`, `InsightDetail.astro` | Scroll animations | **REMOVE_CANDIDATE** | 2 components only; unnecessary for static product pages |
| `lenis` | `MainLayout.astro` (global) | Smooth scrolling | **REMOVE_CANDIDATE** | Loaded on every page; cosmetic only |
| `preline` | `MainLayout.astro` (global) | UI component JS | **REQUIRED** | Used by Navbar, Footer, modals, dropdowns |
| `globby` | Not found in source | Unknown (possibly `process-html.mjs`) | **CONDITIONAL** | Investigate before removal |

### 6.2 Dev Dependencies

| Package | Classification |
|---------|---------------|
| `prettier` + plugins | **REQUIRED** |
| `typescript` | **REQUIRED** |
| `@tailwindcss/forms` | **REQUIRED** (form styling) |
| `@tailwindcss/typography` | **REQUIRED** (blog/doc prose) |
| `astro-vtbot` | **CONDITIONAL** (View Transitions for Starlight only via `Head.astro`) |

### 6.3 Dependency Summary

| Classification | Count |
|----------------|-------|
| REQUIRED | 12 |
| CONDITIONAL | 3 |
| REMOVE_CANDIDATE | 2 (gsap, lenis) |

---

## 7. Global Scripts

### 7.1 Scripts Loaded on Every Page (via `MainLayout.astro`)

| Script | Source | Purpose | Performance Impact |
|--------|--------|---------|-------------------|
| **Dark mode inline** | Lines 43-54, inline `<script is:inline>` | Check localStorage/system preference for dark mode | Negligible (synchronous, < 1KB) |
| **lenisSmoothScroll.js** | Line 56, dynamic import via `<script>` | Lenis smooth scrolling library init | **HIGH** — loads `lenis` npm package on every page, adds scroll event listeners |
| **demoForms.js** | Line 57, dynamic import via `<script>` | Intercept all `[data-demo-form]` submissions | **REMOVE** — Demo-only functionality; no value for production |
| **Preline init** | Lines 84-93, dynamic import via `<script>` | `HSStaticMethods.autoInit()` for Navbar, dropdowns, modals | **Medium** — Required for interactive components, but auto-init runs on every page |
| **Scrollbar hide CSS** | Lines 95-105, `<style>` | Hide browser scrollbar | Negligible |

### 7.2 Component-Specific Scripts

| Script | File | Usage |
|--------|------|-------|
| GSAP + ScrollTrigger | `ProductDetail.astro`, `InsightDetail.astro` | Scroll-triggered fade-in animations for product/insight pages |
| ClipboardJS | `SocialShare.astro` | Copy link to clipboard |
| astro-vtbot (Starlight) | `ui/starlight/Head.astro` | View Transitions for documentation pages only |

### 7.3 Script Audit Verdict

- **demoForms.js** — Remove immediately. False form submissions provide no value.
- **lenisSmoothScroll.js** — Remove after confirming no pages depend on smooth scrolling UX. Browser-native `scroll-behavior: smooth` is sufficient.
- **gsap + ScrollTrigger** — Remove after ProductDetail page redesign. Static pages don't need scroll animations.
- **Preline** — Keep. Required for Navbar mobile menu, dropdowns, modals.
- **Dark mode** — Keep. Essential accessibility feature.

---

## 8. SEO and AEO

### 8.1 Current Implementation

| Element | Current Value | File | ZERNIQ Action |
|---------|--------------|------|---------------|
| **Canonical URLs** | Dynamic via `Meta.astro:36-37` | `Meta.astro` | Keep logic, update domain |
| **Open Graph** | `og:locale`, `og:url`, `og:title`, `og:description`, `og:image`, `og:site_name` | `Meta.astro:105-117` | Update all values |
| **Twitter Cards** | `summary_large_image` + domain/site/description/image | `Meta.astro:120-128` | Update domain and image |
| **hreflang** | `en` ↔ `fr` | `Meta.astro:96-102` | Keep logic, reduce to en only (ZERNIQ likely English-first) |
| **Organization JSON-LD** | `@type: WebPage` with `isPartOf: WebSite` | `constants.ts:17-31` | Replace with ZERNIQ schemas |
| **Product JSON-LD** | In `products/index.astro` and `products/[id].astro` | Page files | Replace with real product data |
| **Breadcrumb JSON-LD** | **NOT PRESENT** | — | Add for product and support pages |
| **robots.txt** | Allows all bots, `Crawl-delay` for Googlebot (10), Yandex (2), archive.org_bot (2) | `robots.txt.ts` | Add `GPTBot`, `OAI-SearchBot` directives |
| **Sitemap** | `@astrojs/sitemap` with en/fr locales | `astro.config.mjs` | Update to ZERNIQ domain |
| **OAI-SearchBot** | **NOT PRESENT** | — | Add to robots.txt |
| **GPTBot policy** | **NOT PRESENT** | — | Add to robots.txt |
| **Schema IDs/URLs** | `@id: 'https://screwfast.uk'` hardcoded | Multiple pages | Replace with ZERNIQ domain |
| **Default language** | `inLanguage: 'en-US'` | `constants.ts:20` | Keep |

### 8.2 Hard-Coded Domains

All structured data blocks in page files use `https://screwfast.uk` directly:
- `src/pages/services.astro`, `contact.astro`, `products/index.astro`, `blog/index.astro`, `blog/[id].astro`
- `src/pages/fr/services.astro`, `fr/contact.astro`, `fr/products/index.astro`, `fr/blog/index.astro`, `fr/blog/[id].astro`

### 8.3 Missing SEO Elements for ZERNIQ

- [ ] Product reviews/ratings structured data
- [ ] FAQ schema (QAPage or FAQPage)
- [ ] HowTo schema for installation guides
- [ ] VideoObject schema for product demonstration videos
- [ ] LocalBusiness schema (if physical location)

---

## 9. External Assets and Domains

### 9.1 Unsplash Images

External image domain allowed in CSP: `images.unsplash.com` (`vercel.json:8`)

Used in:
| File | Unsplash URL |
|------|-------------|
| `src/pages/index.astro` | `photo-1593104547489-5cfb3839a3b5` (testimonial avatar) |
| `src/pages/products/index.astro` | `photo-1500648767791-00dcc994a43e`, `photo-1544005313-94ddf0286df2`, `photo-1474176857210-7287d38d27c6` (testimonial avatars) |
| `src/data_files/mega_link.ts` | Stock portrait (success story) |
| `astro.config.mjs:13` | `image.domains: ['images.unsplash.com']` |

**Verdict:** All Unsplash references should be removed. Replace with local ZERNIQ product photography.

### 9.2 External Image Domains

| Domain | Usage | Action |
|--------|-------|--------|
| `images.unsplash.com` | Testimonial avatars, demo content | **REMOVE** |
| `vyclk3sx0z.ufs.sh` | README.md demo image | **REMOVE** (README rewrite) |

### 9.3 External Scripts

**None.** All JS is bundled locally via npm packages. No CDN scripts.

### 9.4 External Fonts

**None detected.** Fonts appear to be system fonts or bundled.

### 9.5 Third-Party Forms

All forms are `data-demo-form` stubs. No external form services configured.

### 9.6 Analytics / Tracking

**None detected.** No Google Analytics, Plausible, Fathom, or other tracking scripts found.

---

## 10. Licensing

### 10.1 MIT License Requirements

```
MIT License
Copyright (c) 2024 Emil Gulamov

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.
```

### 10.2 Required Actions

| Requirement | Action |
|-------------|--------|
| Original copyright notice in LICENSE | **KEEP** — Replace "ScrewFast" branding but retain MIT notice and Emil Gulamov copyright |
| Permission notice in source | Not required in individual files by MIT, but optionally add attribution comment |
| Visual credit | **NOT REQUIRED** — MIT does not mandate visual credit on the website |
| LICENSE file preservation | **KEEP** — Retain `LICENSE` file with original copyright line |

### 10.3 Attribution Recommendation

Add to README or a CREDITS section:
> This project is based on [ScrewFast](https://github.com/mearashadowfax/ScrewFast) by Emil Gulamov (MIT License).

---

## 11. Cleanup Plan: Six Stages

### Stage A: Identity and Fabricated-Content Removal

| # | File(s) | Action | Risk | Verified By |
|---|---------|--------|------|-------------|
| A1 | `src/data_files/constants.ts` | Replace SITE.title, url, author, tagline, descriptions | MEDIUM | Build + smoke |
| A2 | `astro.config.mjs` | Replace site URL, Starlight title, social link | MEDIUM | Build + smoke |
| A3 | `package.json` | Rename `"name"` from `screwfast-template` | LOW | `pnpm install` |
| A4 | `.github/FUNDING.yml` | Remove `buy_me_a_coffee: mearashadowfax` | LOW | N/A |
| A5 | `CODE_OF_CONDUCT.md` | Replace email `emilgulamov@live.com` | LOW | N/A |
| A6 | `src/pages/manifest.json.ts` | Replace PWA name | LOW | Build |
| A7 | `src/utils/navigation.ts` | Replace social links, remove placeholder URLs | LOW | Build |
| A8 | `src/utils/fr/navigation.ts` | Replace social links, update for ZERNIQ routes | LOW | Build |
| A9 | `src/components/sections/misc/ContactSection.astro` | Replace `support@screwfast.uk`, address, map | LOW | Build |
| A10 | `src/components/Meta.astro` | Replace `screwfast.uk` fallback | LOW | Build |
| A11 | `src/assets/scripts/demoForms.js` | **DELETE** | LOW | Build + smoke |
| A12 | All page `.astro` files | Replace "ScrewFast" in hero titles, structured data | HIGH | Build + smoke + visual check |
| A13 | All data JSON files | Replace ScrewFast references in faqs, features, pricing | MEDIUM | Build |

### Stage B: Route Restructuring

| # | File(s) | Action | Risk | Verified By |
|---|---------|--------|------|-------------|
| B1 | `src/pages/services.astro` (en+fr) | **DELETE** | LOW | Build |
| B2 | `src/pages/insights/[id].astro` (en+fr) | **DELETE** | LOW | Build |
| B3 | `src/content/insights/` | **DELETE ENTIRE DIRECTORY** | LOW | Build |
| B4 | `src/content/blog/` → `src/content/support/` | Rename collection | HIGH | Schema update + build + smoke |
| B5 | `src/pages/blog/` → `src/pages/support/` | Rename route directory | HIGH | Build + smoke |
| B6 | `src/pages/downloads.astro` | **CREATE** new page | LOW | Build + smoke |
| B7 | `src/pages/warranty.astro` | **CREATE** new page | LOW | Build + smoke |
| B8 | `src/pages/privacy.astro` | **CREATE** new page | LOW | Build + smoke |
| B9 | Navigation files (en+fr) | Update all route references | MEDIUM | Build |

### Stage C: Dependency Reduction

| # | Dependency | Action | Risk | Verified By |
|---|-----------|--------|------|-------------|
| C1 | `gsap` | **REMOVE** after removing ProductDetail/InsightDetail GSAP usage | LOW | Build + smoke |
| C2 | `lenis` | **REMOVE** after removing `lenisSmoothScroll.js` import from MainLayout | MEDIUM | Visual regress check |
| C3 | `clipboard` | **REMOVE** if SocialShare component removed | LOW | Build |
| C4 | `globby` | Investigate usage in `process-html.mjs`; remove if unused | LOW | Build |
| C5 | `astro-vtbot` | Keep if Starlight docs retained; remove if docs removed | LOW | Build |

### Stage D: Content-Schema Redesign

| # | Action | Risk |
|---|--------|------|
| D1 | Update `products` schema: remove `tabs`, `blueprints`, `tableData`, `longDescription.btn*`; add `amazonUrl`, `sku`, `category`, `compatibility` | HIGH |
| D2 | Rename `blog` collection to `support` with new schema | HIGH |
| D3 | Delete `insights` collection from `content.config.ts` | LOW |
| D4 | Replace all Starlight `docs/` content with ZERNIQ installation/setup/troubleshooting guides | HIGH |
| D5 | Write real ZERNIQ product entries (4 products minimum) | HIGH |
| D6 | Write real ZERNIQ support articles | HIGH |

### Stage E: SEO/AEO Correction

| # | Action | Risk |
|---|--------|------|
| E1 | Update all structured data blocks with ZERNIQ domain and schemas | MEDIUM |
| E2 | Add Organization JSON-LD for ZERNIQ | LOW |
| E3 | Add BreadcrumbList schema to product and support pages | LOW |
| E4 | Update `robots.txt.ts` — add GPTBot, OAI-SearchBot policies | LOW |
| E5 | Update sitemap config for ZERNIQ domain | LOW |
| E6 | Update hreflang — reduce to en only if French not needed | LOW |
| E7 | Update vercel.json CSP — remove `images.unsplash.com` | LOW |

### Stage F: Visual Branding

| # | Action | Risk |
|---|--------|------|
| F1 | Replace favicon (`src/images/icon.svg`, `src/images/icon.png`) | LOW |
| F2 | Replace `public/social.webp` (OG image) | LOW |
| F3 | Replace `public/favicon.ico` (if static) | LOW |
| F4 | Replace Unsplash product images with real photography | MEDIUM |
| F5 | Update `src/assets/styles/global.css` — review color palette for ZERNIQ brand | MEDIUM |
| F6 | Replace footer section patent/legal text | LOW |
| F7 | Remove `ClientsSection` (fake partner logos) from homepage | MEDIUM |
| F8 | Remove `PricingSection` (fake pricing plans) from homepage | MEDIUM |

---

## 12. Final Summary

### 12.1 File-Level Statistics

| Metric | Count |
|--------|-------|
| **Total source files** | ~180+ |
| **Total pages (.astro)** | 17 |
| **Content collection files** | ~60 |
| **Total current routes** | 12 unique (en) + 8 (fr) + docs (7 langs) |
| **Delete candidates (pages)** | 4 (`services` en+fr, `insights` en+fr) |
| **Delete candidates (collections)** | 1 (`insights` — 6 files) |
| **Delete candidates (components)** | ~15 (auth modals, forms, auth buttons) |
| **Modify candidates** | ~120 (all page files, data files, config) |
| **Dependency removal candidates** | 2–4 |

### 12.2 Priority Breakdown

#### P0 — Blockers (must fix before going live)

- [ ] Replace all `screwfast.uk` hardcoded domains (SEO sabotage if deployed with wrong domain)
- [ ] Replace `https://github.com/mearashadowfax/ScrewFast` links (directs users to wrong repo)
- [ ] Remove `emilgulamov@live.com` from CODE_OF_CONDUCT.md (privacy concern)
- [ ] Remove demoForms.js (false form submissions in production)

#### P1 — Required Changes

- [ ] Replace ScrewFast brand name in all page titles, meta descriptions, structured data (~120 files)
- [ ] Replace fictitious statistics, testimonials, pricing
- [ ] Remove auth modals (Login/Register/Recover)
- [ ] Remove Partner/Clients section with fake logos
- [ ] Replace Unsplash images with real ZERNIQ photography
- [ ] Replace placeholder social links
- [ ] Update robots.txt, sitemap, and SEO metadata

#### P2 — Optional Improvements

- [ ] Remove `gsap` and `lenis` dependencies
- [ ] Rename `/blog` → `/support`
- [ ] Add `/downloads`, `/warranty`, `/privacy` pages
- [ ] Add product categories and Amazon integration
- [ ] Add FAQ schema for AI search visibility
- [ ] Reduce i18n from 7 Starlight languages to 1–2

### 12.3 Recommended First Cleanup Commit

```
commit: "refactor: remove ScrewFast demo content and branding"
scope:
  - Delete src/assets/scripts/demoForms.js
  - Delete src/components/sections/misc/Authentication.astro
  - Delete src/components/ui/forms/LoginModal.astro
  - Delete src/components/ui/forms/RegisterModal.astro
  - Delete src/components/ui/forms/RecoverModal.astro
  - Delete src/components/ui/buttons/GoogleBtn.astro
  - Delete src/components/ui/buttons/GithubBtn.astro
  - Delete src/components/ui/buttons/AuthBtn.astro
  - Delete src/components/ui/buttons/LoginBtn.astro
  - Replace src/data_files/constants.ts (SITE/SEO/OG values)
  - Remove demo form attributes from ContactSection and FooterSection
  - Update astro.config.mjs site URL
risk: MEDIUM
verification: pnpm build && pnpm test:smoke
```

---

*Report generated by automated repository audit. All file paths verified against `theme-cleanup` branch at commit `35a5cd0`.*  
*No files were modified during this audit.*
