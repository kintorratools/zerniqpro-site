# Theme Content Baseline V1

## Source of Truth

- Git ref: `theme-cleanup`
- Commit: `15da780b4fcda4501aa8bfc28c165d517ba2cf70`
- This is the original ScrewFast theme content and visual baseline.

## THEME_PRESERVATION_RULE

Preserve original theme:

- Visual style
- DOM structure
- Tailwind classes
- Layout / spacing
- Typography
- Responsive layout
- Hover / transition
- Preline interaction
- Dark mode
- Animation
- Cards / buttons / tabs / gallery layout

Principle: Astro = presentation/layout/interaction, Strapi = editable content/assets/data only.

**CMS must NOT store**: CSS classes, Tailwind classes, component paths, layout control fields.
**Forbidden CMS fields**: `cssClass`, `className`, `tailwind`, `componentPath`, `layoutClass`.

## CONTENT_PRESERVATION_BASELINE

Use theme-cleanup as the original content/structure baseline.

CMS migration flow:

1. Original theme content → copy to Strapi initial content
2. Frontend reads CMS
3. Page default result should match original theme as closely as possible

**PROHIBITED without explicit user request**:

- Deleting menu items
- Deleting footer columns
- Deleting sections
- Changing section order
- Simplifying CTAs
- Removing image slots
- Removing interactive elements
- Replacing original content with new neutral content

When brand text/logo/images need changes: only expose those fields to CMS.

## Original Theme Content Inventory

### Navbar (5 items)

| #   | Label    | URL       |
| --- | -------- | --------- |
| 1   | Home     | /         |
| 2   | Products | /products |
| 3   | Services | /services |
| 4   | Blog     | /blog     |
| 5   | Contact  | /contact  |

### Footer (2 columns + 5 social)

**Column 1 — Ecosystem:**

| Label                 | URL               |
| --------------------- | ----------------- |
| Documentation         | /welcome-to-docs/ |
| Tools & Equipment     | /products         |
| Construction Services | /services         |

**Column 2 — Company:**

| Label     | URL   |
| --------- | ----- |
| About us  | #     |
| Blog      | /blog |
| Careers   | #     |
| Customers | #     |

**Social Links (5 slots):**

| #   | Platform    | URL |
| --- | ----------- | --- |
| 1   | Facebook    | #   |
| 2   | X (Twitter) | #   |
| 3   | GitHub      | #   |
| 4   | Google      | #   |
| 5   | Slack       | #   |

**Other Footer Elements:**

- Newsletter visual area (with email input + subscribe button)
- Hiring badge
- Copyright area
- Social icon area

### Homepage Sections (9 sections, in order)

1. AnnouncementBanner
2. HeroSection
3. ClientsSection
4. FeaturesGeneral
5. FeaturesNavs
6. TestimonialsSection
7. PricingSection
8. FAQ
9. HeroSectionAlt

### Other preserved components

- ThemeIcon (dark mode toggle)
- LanguagePicker (locale switcher)
- BrandLogo (fallback SVG logo)
- All UI components (buttons, cards, tabs, icons, etc.)

### Remaining Page Content Inventory (non-Homepage)

The following pages are preserved from the theme baseline and will be migrated to CMS in Phase 8B+.

**Products listing — `/products/`:**

| Section Order | Component                                       | Data                                           |
| ------------- | ----------------------------------------------- | ---------------------------------------------- |
| 1             | Page header (title + subtitle + CTA)            | title, subtitle (hardcoded)                    |
| 2             | Product grid (CardSmall / CardWide alternating) | getCollection('products')                      |
| 3             | FeaturesStatsAlt                                | title, subtitle, benefits (3 items, hardcoded) |
| 4             | TestimonialsSectionAlt                          | title, testimonials (3 items, hardcoded)       |

**Product detail — `/products/[id]/`:**

| Section Order | Component                                  | Data                                             |
| ------------- | ------------------------------------------ | ------------------------------------------------ |
| 1             | GSAP overlay (animation reveal)            | —                                                |
| 2             | Hero (title, description, main image, CTA) | product.data                                     |
| 3             | Tab navigation (3 tabs)                    | product.data.tabs                                |
| 4             | Tab 1: Long Description + Description List | product.data.longDescription, descriptionList    |
| 5             | Tab 2: Specifications (list or table)      | product.data.specificationsLeft/Right, tableData |
| 6             | Tab 3: Blueprints (2 images)               | product.data.blueprints                          |

**Services — `/services/`:**

| Section Order | Component                         | Data                                               |
| ------------- | --------------------------------- | -------------------------------------------------- |
| 1             | MainSection (hero + CTA)          | title, subtitle, btnTitle, btnURL                  |
| 2-6           | 5 alternating Right/Left sections | articles array (5 hardcoded Article objects)       |
| 7             | FeaturesStats                     | title, subtitle, mainStat, stats array (hardcoded) |

**Blog listing — `/blog/`:**

| Section Order | Component                           | Data                        |
| ------------- | ----------------------------------- | --------------------------- |
| 1             | Page header (title, subtitle)       | title, subtitle (hardcoded) |
| 2             | Blog post grid (CardBlog)           | getCollection('blog')       |
| 3             | Most recent post (CardBlogRecent)   | blogPosts[0]                |
| 4             | Insights section (CardInsight grid) | getCollection('insights')   |

**Blog detail — `/blog/[id]/`:**

| Section Order | Component                           | Data                |
| ------------- | ----------------------------------- | ------------------- |
| 1             | Author/date/title header            | post.data           |
| 2             | Card image                          | post.data.cardImage |
| 3             | Article content (rendered Markdown) | render(post)        |
| 4             | Tags                                | post.data.tags      |
| 5             | Bookmark + SocialShare              | post.data.title     |
| 6             | PostFeedback form                   | —                   |
| 7             | Related articles grid               | blogPosts filter    |

**Insights detail — `/insights/[id]/`:**

| Section Order | Component               | Data      |
| ------------- | ----------------------- | --------- |
| 1             | InsightDetail component | post.data |

**Contact — `/contact/`:**

| Section Order | Component             | Data |
| ------------- | --------------------- | ---- |
| 1             | ContactSection (form) | —    |

## REMAINING_PAGE_CONTENT_PRESERVATION_RULE

This rule extends `CONTENT_PRESERVATION_BASELINE` to all non-Homepage pages listed above.

**CMS migration flow for remaining pages:**

1. Original Theme content (as documented in the inventory tables above) → copy to Strapi initial content
2. Frontend reads CMS for text/media/data/SEO fields only
3. Page default result must match original theme as closely as possible
4. Astro retains full control of: layout, section order, DOM, CSS/Tailwind, responsive, dark mode, animation, interaction

**PROHIBITED during CMS migration of remaining pages:**

- Deleting any section from the section order documented above
- Deleting any CTA button (`Schedule a Consultation`, `Learn More`, `Read more`, `Customer Stories`, etc.)
- Deleting any form (`ContactSection`, `PostFeedback`, etc.)
- Reducing content: all 5 services articles, all 3 product testimonials, all 3 benefits, all 4 stats, all related articles must be preserved
- Replacing original images with different images (local media paths must be kept unless CMS media is populated with the SAME image)
- Reordering sections within a page
- Simplifying interactive behavior (GSAP animations, tab switching, bookmark toggle, social share)
- Converting alternating Left/Right section layout to a flat list

**Allowed CMS field exposure for remaining pages:**

- Text fields: title, subtitle, description, content body, testimonial text, stat labels
- Media fields: images (via CmsMedia type with theme fallback), alt text
- Data fields: product specifications, service articles, blog/insight entries, FAQ items
- SEO fields: meta title, meta description, OG title, structured data
- CTA fields: button label, button URL (CMS controls text and target, Astro controls rendering)

**CMS MUST NOT store for remaining pages:**

- Section order, layout variant, component selection
- CSS classes, Tailwind classes, dark mode config
- Animation parameters, transition timings
- DOM structure, responsive breakpoints
- Component paths, render logic
