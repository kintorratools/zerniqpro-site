# Page Route Template Map V1

## Metadata

- Git ref: `site-rebuild-v1`
- Frontend HEAD: `fbe94ce7`
- CMS HEAD: `84883813`
- Baseline commit: `15da780b4fcda4501aa8bfc28c165d517ba2cf70`
- Phase: 8A — Remaining Page Baseline + CMS Template Mapping

---

## Fixed Template Types

Only these 9 Astro template types are allowed. Astro controls layout, section order, DOM, style, and interaction. CMS only controls text, media, data, and SEO.

**CMS is FORBIDDEN from controlling**: `sectionOrder`, `layout`, `variant`, `Tailwind class`, `component path`, `DOM`, free section reorder. Product's existing Dynamic Zone must NOT be expanded into a generic Page Builder.

| Code | Template Type         | Astro Role                                 | CMS Role                                              |
| ---- | --------------------- | ------------------------------------------ | ----------------------------------------------------- |
| A    | Product Listing       | Grid/list layout, card components, sort    | Product entries (handle, title, media, description)   |
| B    | Product Detail        | Hero, tabs, specs, blueprints, GSAP anim   | Product fields (handle, media, features, specs, SEO)  |
| C    | Support Listing       | Article grid, category filters, pagination | Support Article entries (slug, title, excerpt, media) |
| D    | Support Detail        | Article body, related posts, social share  | Support Article fields (slug, content, media, SEO)    |
| E    | Generic Informational | MainSection, Left/Right blocks, stats      | Generic Page fields (title, sections, media, CTA)     |
| F    | Contact               | Contact form, field validation             | Contact config (form fields, recipient, subject)      |
| G    | Downloads             | File listing, categories, download links   | Download entries (file, version, platform, category)  |
| H    | Warranty              | Warranty info, terms display               | Warranty Page fields (content, terms, SEO)            |
| I    | Legal                 | Privacy/Terms text display                 | Legal Page fields (content, effective date, SEO)      |

---

## Route Mapping Table

| #   | ORIGINAL_ROUTE    | CURRENT_ROUTE                 | TARGET_ROUTE                                | TEMPLATE_TYPE               | CMS_TYPE        | SEO_INDEXABLE | LOCALIZED | STATUS              |
| --- | ----------------- | ----------------------------- | ------------------------------------------- | --------------------------- | --------------- | ------------- | --------- | ------------------- |
| 1   | `/`               | `/`                           | `/`                                         | FROZEN_COMPLETE             | Homepage        | yes           | yes       | FROZEN_COMPLETE     |
| 2   | `/products/`      | `/products/`                  | `/products/`                                | A — Product Listing         | Product         | yes           | yes       | UNCHANGED           |
| 3   | `/products/[id]/` | `/products/[id]/`             | `/products/<handle>/`                       | B — Product Detail          | Product         | yes           | yes       | UNCHANGED           |
| 4   | `/services/`      | `/services/`                  | `/pages/services/`                          | E — Generic Informational   | Generic Page    | yes           | yes       | TRANSITION_REQUIRED |
| 5   | `/blog/`          | `/blog/`                      | `/blogs/support/`                           | C — Support Listing         | Support Article | yes           | yes       | TRANSITION_REQUIRED |
| 6   | `/blog/[id]/`     | `/blog/[id]/`                 | `/blogs/support/<article-handle>/`          | D — Support Detail          | Support Article | yes           | yes       | TRANSITION_REQUIRED |
| 7   | `/insights/[id]/` | `/insights/[id]/`             | `/blogs/support/<article-handle>/` (merged) | D — Support Detail          | Support Article | yes           | yes       | TRANSITION_REQUIRED |
| 8   | `/contact/`       | `/contact/`                   | `/pages/contact/`                           | F — Contact                 | Contact         | yes           | yes       | TRANSITION_REQUIRED |
| 9   | —                 | `/preview/products/<handle>/` | `/preview/`                                 | B — Product Detail (shadow) | Product         | no            | no        | SHADOW              |
| 10  | `/fr/`            | `/fr/`                        | `/fr/`                                      | A-I (localized mirrors)     | (same as en)    | yes           | yes       | UNCHANGED           |
| 11  | —                 | —                             | `/pages/downloads/`                         | G — Downloads               | Download        | yes           | yes       | READY_UNPUBLISHED   |
| 12  | —                 | —                             | `/pages/warranty/`                          | H — Warranty                | Warranty        | yes           | yes       | READY_UNPUBLISHED   |
| 13  | —                 | —                             | `/pages/privacy/`                           | I — Legal                   | Legal Page      | yes           | yes       | READY_UNPUBLISHED   |
| 14  | —                 | —                             | `/fr/pages/downloads/`                      | G — Downloads               | Download        | yes           | yes       | READY_UNPUBLISHED   |
| 15  | —                 | —                             | `/fr/pages/warranty/`                       | H — Warranty                | Warranty        | yes           | yes       | READY_UNPUBLISHED   |
| 16  | —                 | —                             | `/fr/pages/privacy/`                        | I — Legal                   | Legal Page      | yes           | yes       | READY_UNPUBLISHED   |
| 17  | `/404`            | `/404`                        | `/404`                                      | Non-content                 | N/A             | no            | yes       | UNCHANGED           |

---

## Original Theme Content Page Audit

### `/` — Homepage

**Status**: FROZEN_COMPLETE (Phase 7B/7C-A complete)

**Page file**: `src/pages/index.astro`
**Components**: AnnouncementBanner, HeroSection, ClientsSection, FeaturesGeneral, FeaturesNavs, TestimonialsSection, PricingSection, FAQ, HeroSectionAlt (9 sections, in order)
**Data sources**: Strapi CMS (homepage collection), local theme fallback (`src/lib/homepage/homepage-baseline.ts`)
**Local media**: Theme baseline images (hero, avatars, partner logos, feature images, testimonial avatars)
**CTA/Form**: Hero CTA, bottom CTA
**Interactive**: Preline tabs, FAQ accordion, dark mode

---

### `/products/` — Product Listing

**Status**: UNCHANGED

**Page file**: `src/pages/products/index.astro`
**Components** (in order):

1. Page header (title + subtitle + PrimaryCTA "Customer Stories")
2. Product grid (CardSmall / CardWide alternating)
3. FeaturesStatsAlt ("Why Choose Acme?")
4. TestimonialsSectionAlt ("What Our Customers Say")
   **Data sources**: `getCollection('products')` from Astro content collections, `SITE` from `@data/constants`
   **Local media**: None (testimonial avatars use Unsplash URLs)
   **CTA/Form**: "Customer Stories" button linking to #testimonials
   **Interactive**: Grid layout, card components

---

### `/products/[id]/` — Product Detail

**Status**: UNCHANGED

**Page file**: `src/pages/products/[id].astro`
**Components** (in order):

1. Overlay (GSAP animation reveal)
2. Hero section (title, description, main image)
3. Product tab navigation (3 tabs)
4. Tab 1 — Long Description (title, subtitle, CTA button, description list)
5. Tab 2 — Specifications (specsLeft / specsRight OR tableData)
6. Tab 3 — Blueprints (first image, second image)
   **Data sources**: `getCollection('products')`, `SITE` from `@data/constants`
   **Local media**: Product images via Astro content collection
   **CTA/Form**: CTA button in Long Description tab
   **Interactive**: GSAP entrance animation, tab switching with transitions

---

### `/services/` — Services

**Status**: UNCHANGED

**Page file**: `src/pages/services.astro`
**Components** (in order):

1. MainSection (hero: "Uniting Expertise with Your Vision", CTA "Schedule a Consultation")
2. 5 alternating RightSection / LeftSection blocks (articles array):
   - "Delivering Expert Guidance" (2 images)
   - "Transforming Designs into Reality" (1 image, "Learn More" CTA)
   - "Navigating Projects with Professional Oversight" (2 images)
   - "Ensuring Long-lasting Performance" (1 image)
   - "Crafting Bespoke Strategies for Unique Challenges" (2 images, "Read more" CTA)
3. FeaturesStats ("By the Numbers": 96%, 99.8%, 5,000+, 85%)
   **Data sources**: `SITE` from `@data/constants`, 8 local images, hardcoded `articles` array (5 items)
   **Local media**: 8 images (`blueprints-image.avif`, `person-working.avif`, `before-after.avif`, `construction-workers.avif`, `aerial-view.avif`, `using-tools.avif`, `progress-building.avif`, `under-construction.avif`)
   **CTA/Form**: "Schedule a Consultation", "Learn More", "Read more"
   **Interactive**: Alternating left/right layout

---

### `/blog/` — Blog Listing

**Status**: UNCHANGED

**Page file**: `src/pages/blog/index.astro`
**Components** (in order):

1. Page header (title, subtitle)
2. Blog post grid (CardBlog components, excluding most recent)
3. Most recent post (CardBlogRecent)
4. Insights section (secondTitle + CardInsight grid, 3-column)
   **Data sources**: `getCollection('blog')`, `getCollection('insights')`, `SITE` from `@data/constants`
   **Local media**: Blog card images via Astro content collection
   **CTA/Form**: None
   **Interactive**: Card hover effects

---

### `/blog/[id]/` — Blog Detail

**Status**: UNCHANGED

**Page file**: `src/pages/blog/[id].astro`
**Components** (in order):

1. Author/title/date header
2. Card image
3. Article content (rendered Markdown)
4. Tags
5. Bookmark button + SocialShare
6. PostFeedback ("Was this post helpful?")
7. Related articles (CardRelated grid, 2-column)
   **Data sources**: `getCollection('blog')`, `SITE` from `@data/constants`, `render(post)` for MDX/Markdown
   **Local media**: Blog card image via Astro content collection
   **CTA/Form**: PostFeedback form
   **Interactive**: Bookmark toggle, SocialShare, PostFeedback

---

### `/insights/[id]/` — Insights Detail

**Status**: UNCHANGED

**Page file**: `src/pages/insights/[id].astro`
**Components** (in order):

1. InsightDetail component
   **Data sources**: `getCollection('insights')`, `SITE` from `@data/constants`
   **Local media**: Insight card image via Astro content collection
   **CTA/Form**: None
   **Interactive**: InsightDetail component behavior

---

### `/contact/` — Contact Page

**Status**: UNCHANGED

**Page file**: `src/pages/contact.astro`
**Components** (in order):

1. ContactSection
   **Data sources**: `SITE` from `@data/constants`
   **Local media**: None
   **CTA/Form**: Contact form (field validation in ContactSection component)
   **Interactive**: Form submission, validation

---

## Theme Diff Results

All non-homepage pages are UNCHANGED relative to baseline `15da780b`. The homepage (`/`) is CMS_ADAPTED_PRESERVED (Phase 7B).

| Page              | Section Order | DOM Structure | Tailwind  | Images    | CTA/Button | Form      | Responsive | Dark Mode | Preline   | Result                |
| ----------------- | ------------- | ------------- | --------- | --------- | ---------- | --------- | ---------- | --------- | --------- | --------------------- |
| `/`               | PRESERVED     | PRESERVED     | PRESERVED | PRESERVED | PRESERVED  | PRESERVED | PRESERVED  | PRESERVED | PRESERVED | CMS_ADAPTED_PRESERVED |
| `/products/`      | UNCHANGED     | UNCHANGED     | UNCHANGED | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED | UNCHANGED             |
| `/products/[id]/` | UNCHANGED     | UNCHANGED     | UNCHANGED | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED | UNCHANGED             |
| `/services/`      | UNCHANGED     | UNCHANGED     | UNCHANGED | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED | UNCHANGED             |
| `/blog/`          | UNCHANGED     | UNCHANGED     | UNCHANGED | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED | UNCHANGED             |
| `/blog/[id]/`     | UNCHANGED     | UNCHANGED     | UNCHANGED | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED | UNCHANGED             |
| `/insights/[id]/` | UNCHANGED     | UNCHANGED     | UNCHANGED | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED | UNCHANGED             |
| `/contact/`       | UNCHANGED     | UNCHANGED     | UNCHANGED | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED  | UNCHANGED | UNCHANGED | UNCHANGED             |

**UNEXPECTED_DIVERGENCE_COUNT**: 0

---

## Current Page Audit Summary

| Classification | Count | Pages                                                                                                 |
| -------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| UNCHANGED      | 10    | /products/, /products/[id]/, /services/, /blog/, /blog/[id]/, /insights/[id]/, /contact/, /fr/*, /404 |
| CMS_ADAPTED    | 1     | / (homepage)                                                                                          |
| ADDED/SHADOW   | 1     | /preview/                                                                                             |
| REMOVED        | 0     | —                                                                                                     |
| PLACEHOLDER    | 0     | —                                                                                                     |

**ORIGINAL_CONTENT_PAGE_COUNT**: 7 (non-homepage: products listing, products detail, services, blog listing, blog detail, insights detail, contact)
**CURRENT_CONTENT_PAGE_COUNT**: 7 (same 7 pages, unchanged)

---

## CMS Gap Analysis

### CMS_MODEL_GAPS

| Model            | Needed     | Reason                                                                                   |
| ---------------- | ---------- | ---------------------------------------------------------------------------------------- |
| Product Category | NOT_NEEDED | Products already have CMS schema; categories can be flat tags or filters                 |
| Support Article  | NEEDED     | Current /blog/ and /insights/ use Astro content collections; need CMS model for articles |
| Download         | NEEDED     | New target route `/pages/downloads/` requires Download content type                      |
| Contact Page     | NEEDED     | New target route `/pages/contact/` requires Contact CMS model (deferred to future phase) |
| Generic Page     | NEEDED     | /services/, future /pages/warranty/, /pages/privacy/ need reusable page model            |

### Support Article (Needed)

| Field     | Type                          | Config                                 |
| --------- | ----------------------------- | -------------------------------------- |
| slug      | string                        | Required, localized, NOT global unique |
| title     | string                        | Required, i18n localized               |
| excerpt   | text                          | Required, i18n localized               |
| content   | blocks                        | Required, i18n localized               |
| cardImage | media                         | Optional (Phase 7C-B)                  |
| tags      | json                          | Optional                               |
| author    | string                        | Optional                               |
| category  | enum: blog/insight/support    | Required                               |
| seo       | component (seo)               | Optional                               |
| site      | relation (many-to-one → Site) | Required                               |

Config: Site-scoped, native i18n, Draft & Publish. Slug uniqueness scope = site + locale + slug (NOT global unique). No custom publishedAt — uses Strapi Draft & Publish system field only. No manual locale field. Domain only on Site. Slug allows only lowercase letters, numbers, and hyphens.

### Download (Needed)

| Field       | Type                          | Config                   |
| ----------- | ----------------------------- | ------------------------ |
| title       | string                        | Required, i18n localized |
| description | text                          | Required, i18n localized |
| file        | media                         | Required (Phase 7C-B)    |
| version     | string                        | Optional                 |
| platform    | enum                          | Optional                 |
| category    | string                        | Optional                 |
| site        | relation (many-to-one → Site) | Required                 |

Config: Site-scoped, native i18n, Draft & Publish, slug from title.

### Generic Page (DEFERRED — No Dynamic Zone)

**GENERIC_PAGE_MODEL=DEFERRED**. Each actual page type (Services, Warranty, Privacy, etc.) MUST first define a fixed Astro slot contract before any CMS model is created. CMS CANNOT use Dynamic Zone to determine section structure or order.

The Generic Page CMS model will be created in a future phase once each concrete page's fixed slot contract is defined. At that point, the model will include only fixed Component fields — never a Dynamic Zone.

Config: Site-scoped, native i18n, Draft & Publish. Must NOT include: cssClass, className, tailwind, layout, variant, componentPath, sectionOrder, Dynamic Zone.

---

## Product Contract Verification

Source: `docs/architecture/PRODUCT_CONTRACT_V1.md`

| Check                                                                        | Status                  |
| ---------------------------------------------------------------------------- | ----------------------- |
| PRODUCT_ROUTE_TARGET=`/products/<handle>/`                                   | CONFIRMED               |
| Product CMS schema exists                                                    | CONFIRMED               |
| Frontend route `/products/[id]/` exists                                      | CONFIRMED               |
| Product preview `/preview/products/<handle>/` exists                         | CONFIRMED               |
| Dynamic Zone with content.text, content.feature-grid, content.specifications | CONFIRMED               |
| handle, title, description, media, features, specifications, SEO fields      | PRESENT (in CMS schema) |
| Site relation                                                                | PRESENT                 |

**PRODUCT_CONTRACT_GAPS**:

1. Support Article relation on Product (future: link products to related support articles)
2. Download relation on Product (future: link products to downloadable resources)

---

## Transition Routes

The following original theme routes require URL transition. Current routes MUST NOT be deleted until SEO redirects are implemented in a future phase:

| ORIGINAL_ROUTE    | TARGET_ROUTE                       | Reason                                      |
| ----------------- | ---------------------------------- | ------------------------------------------- |
| `/services/`      | `/pages/services/`                 | Consolidate under /pages/ namespace         |
| `/blog/`          | `/blogs/support/`                  | Merge blog + insights into Support Articles |
| `/blog/[id]/`     | `/blogs/support/<article-handle>/` | Merge blog + insights into Support Articles |
| `/insights/[id]/` | `/blogs/support/<article-handle>/` | Merge into unified Support Article detail   |
| `/contact/`       | `/pages/contact/`                  | Consolidate under /pages/ namespace         |

**TRANSITION_ROUTES**: 5
