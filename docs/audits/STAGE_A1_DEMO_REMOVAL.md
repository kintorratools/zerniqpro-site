# Stage A1: Demo Authentication and Forms Removal

> **Date:** 2026-08-05
> **Branch:** `stage-a-demo-removal` (based on `theme-cleanup` @ `36c3f8d`)
> **Audit Source:** `docs/audits/THEME_CLEANUP_INVENTORY.md`
> **Scope:** Remove demo authentication modals, auth-only buttons, and demo form interception script.

## Repository Searches Performed

| Search Term | Scope | Matches Found |
|-------------|-------|---------------|
| `Authentication\|LoginModal\|RegisterModal\|RecoverModal\|GoogleBtn\|GithubBtn\|AuthBtn\|LoginBtn` | `src/` | 30 lines |
| `demoForms\|demo-form\|data-demo-form` | `src/` | 7 files |
| `hs-toggle-between-modals\|login-modal\|register-modal\|recover-modal` | `src/` | 8 lines |
| `PasswordInput` usage | `src/` | 3 files (LoginModal, RegisterModal only) |

## Files Deleted (7)

| # | File | Reason |
|---|------|--------|
| 1 | `src/components/sections/misc/Authentication.astro` | Hosts LoginBtn + LoginModal + RegisterModal + RecoverModal; all demo-only |
| 2 | `src/components/ui/forms/LoginModal.astro` | "Sign in" modal with `data-demo-form`, no backend |
| 3 | `src/components/ui/forms/RegisterModal.astro` | "Sign up" modal with `data-demo-form`, no backend |
| 4 | `src/components/ui/forms/RecoverModal.astro` | "Forgot password?" modal with `data-demo-form`, no backend |
| 5 | `src/components/ui/buttons/LoginBtn.astro` | Opens `#hs-toggle-between-modals-login-modal`; no other usage |
| 6 | `src/components/ui/buttons/GoogleBtn.astro` | "Sign in/up with Google" stub; used only in LoginModal + RegisterModal |
| 7 | `src/assets/scripts/demoForms.js` | Intercepts all `[data-demo-form]` submissions; demo-only runtime |

## Files Modified (5)

| # | File | Change |
|---|------|--------|
| 1 | `src/layouts/MainLayout.astro` | Removed `import '@scripts/demoForms.js'` (line 57) |
| 2 | `src/components/sections/navbar&footer/Navbar.astro` | Removed `Authentication` import (line 5) and `<Authentication />` (line 96); updated comment |
| 3 | `src/components/sections/navbar&footer/NavbarMegaMenu.astro` | Removed `Authentication` import (line 6) and `<Authentication />` (line 100); updated comment |
| 4 | `src/components/sections/navbar&footer/FooterSection.astro` | Removed `data-demo-form` and `data-demo-message` attributes from newsletter `<form>` |
| 5 | `src/components/sections/misc/ContactSection.astro` | Removed `data-demo-form` and `data-demo-message` from `<form>`; removed `data-demo-status` paragraph |

## Imports/Usages Removed

| Component | Import Locations Removed |
|-----------|-------------------------|
| `Authentication` | `Navbar.astro:5`, `NavbarMegaMenu.astro:6` |
| `LoginModal` | `Authentication.astro:3` (file deleted) |
| `RegisterModal` | `Authentication.astro:4` (file deleted) |
| `RecoverModal` | `Authentication.astro:5` (file deleted) |
| `LoginBtn` | `Authentication.astro:6` (file deleted) |
| `GoogleBtn` | `LoginModal.astro:7`, `RegisterModal.astro:6` (both files deleted) |
| `AuthBtn` (imports via deleted files) | `LoginModal.astro:6`, `RegisterModal.astro:7`, `RecoverModal.astro:4` (all files deleted) |
| `demoForms.js` | `MainLayout.astro:57` |

## Items Deliberately Retained

| Component/File | Reason |
|----------------|--------|
| `src/components/ui/buttons/AuthBtn.astro` | Used by `ContactSection.astro` as form submit button (NOT auth-only) |
| `src/components/ui/buttons/GithubBtn.astro` | Used by `HeroSectionAlt.astro` as CTA button; `LoginModal` import deleted but `HeroSectionAlt` still references it |
| `src/components/ui/forms/input/PasswordInput.astro` | General-purpose form input; `forgot` link references deleted modal but only fired from now-deleted LoginModal |
| `src/components/ui/forms/input/*.astro` (all other inputs) | Used by ContactSection, FooterSection; not auth-related |
| `src/components/ui/buttons/ProductTabBtn.astro` | Not related to auth |

## Possible Visual Regression Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Navbar missing gap where LoginBtn was | **NONE** — Auth component condenses into a single button, removal simply collapses empty space |
| Mobile menu broken | **NONE** — Authentication was inline via `<Authentication />`, no structural dependency |
| Contact form submit broken | **NONE** — `AuthBtn` retained, only `data-demo-form` attribute removed; form POST still fires |
| Newsletter form broken | **NONE** — Only `data-demo-form` attribute removed; form still functions |
| Console errors for missing `data-hs-overlay` targets | **NONE** — Preline autoInit only looks for existing `data-hs-overlay` attributes; LoginBtn deleted so its overlay trigger is gone |

## Required Validation Routes

- `/` — Homepage
- `/products/` — Product listing
- `/blog/` — Blog listing
- `/contact/` — Contact form
- `/services/` — Services (MegaMenu)
- `/404` — Custom 404

## Acceptance

All checks passed on 2026-08-05:

- [x] `pnpm format:check` — PASS
- [x] `pnpm build` — PASS
- [x] `pnpm test:smoke` — PASS
