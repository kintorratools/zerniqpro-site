# Stage A1: Demo Authentication Removal

> **Date:** 2026-08-05
> **Branch:** `stage-a-demo-removal` (based on `theme-cleanup` @ `36c3f8d`)
> **Audit Source:** `docs/audits/THEME_CLEANUP_INVENTORY.md`
> **Scope:** Remove demo authentication UI components only. Form safeguards retained until a real form backend is implemented.

## Repository Searches Performed

| Search Term | Scope | Matches Found |
|-------------|-------|---------------|
| `Authentication\|LoginModal\|RegisterModal\|RecoverModal\|GoogleBtn\|LoginBtn` | `src/` | 30 lines |
| `hs-toggle-between-modals` | `src/` | 8 lines |
| `EmailInput\|PasswordInput\|Checkbox` (excluding self) | `src/` | 0 (orphaned after modal deletion) |

## Files Deleted (9)

| # | File | Reason |
|---|------|--------|
| 1 | `src/components/sections/misc/Authentication.astro` | Hosts LoginBtn + LoginModal + RegisterModal + RecoverModal; all demo-only |
| 2 | `src/components/ui/forms/LoginModal.astro` | "Sign in" modal; no backend |
| 3 | `src/components/ui/forms/RegisterModal.astro` | "Sign up" modal; no backend |
| 4 | `src/components/ui/forms/RecoverModal.astro` | "Forgot password?" modal; no backend |
| 5 | `src/components/ui/buttons/LoginBtn.astro` | Opens `#hs-toggle-between-modals-login-modal`; no other usage |
| 6 | `src/components/ui/buttons/GoogleBtn.astro` | "Sign in/up with Google" stub; used only in LoginModal + RegisterModal |
| 7 | `src/components/ui/forms/input/EmailInput.astro` | Orphaned — only imported by deleted LoginModal + RegisterModal |
| 8 | `src/components/ui/forms/input/PasswordInput.astro` | Orphaned — only imported by deleted LoginModal + RegisterModal. Contained a `data-hs-overlay` reference to the deleted recover modal and was therefore not retained as a generic component. |
| 9 | `src/components/ui/forms/input/Checkbox.astro` | Orphaned — only imported by deleted RegisterModal |

## Files Modified (2)

| # | File | Change |
|---|------|--------|
| 1 | `src/components/sections/navbar&footer/Navbar.astro` | Removed `Authentication` import and `<Authentication />` usage |
| 2 | `src/components/sections/navbar&footer/NavbarMegaMenu.astro` | Removed `Authentication` import and `<Authentication />` usage |

## Items Deliberately Retained

| Component/File | Reason |
|----------------|--------|
| `src/assets/scripts/demoForms.js` | Kept to provide honest "Demo only — not connected to a backend" feedback on contact and newsletter forms until a real form endpoint is implemented |
| `src/layouts/MainLayout.astro` | Restored `import '@scripts/demoForms.js'` to keep demo-form guard functional |
| `src/components/sections/misc/ContactSection.astro` | Restored `data-demo-form` attribute — preserves "Thanks! (Demo only)" message on submit |
| `src/components/sections/navbar&footer/FooterSection.astro` | Restored `data-demo-form` attribute on newsletter form |
| `src/components/ui/buttons/AuthBtn.astro` | Used by ContactSection as form submit button (NOT auth-only) |
| `src/components/ui/buttons/GithubBtn.astro` | Used by HeroSectionAlt as CTA button |
| `src/components/ui/forms/input/TextInput.astro` | Used by ContactSection |
| `src/components/ui/forms/input/EmailContactInput.astro` | Used by ContactSection |
| `src/components/ui/forms/input/PhoneInput.astro` | Used by ContactSection |
| `src/components/ui/forms/input/TextAreaInput.astro` | Used by ContactSection |
| `src/components/ui/forms/input/EmailFooterInput.astro` | Used by FooterSection |

## Possible Visual Regression Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Navbar missing LoginBtn | NONE — Auth component condenses into an inline button; removal collapses empty space |
| Mobile menu broken | NONE — Authentication was a child of the nav link container |
| Deleted `data-hs-overlay` targets cause errors | NONE — Preline autoInit only scans existing DOM; no orphaned overlay trigger remains |

## Required Validation Routes

- `/` — Homepage
- `/products/` — Product listing
- `/blog/` — Blog listing
- `/contact/` — Contact form (verify "Demo only" message still appears on submit)
- `/services/` — Services (MegaMenu)
- `/404` — Custom 404

## Acceptance

- [x] `pnpm format:check` — PASS
- [x] `pnpm build` — PASS (108 pages)
- [x] `pnpm test:smoke` — PASS (6/6)
