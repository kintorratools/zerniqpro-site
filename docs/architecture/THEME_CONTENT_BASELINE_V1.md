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
