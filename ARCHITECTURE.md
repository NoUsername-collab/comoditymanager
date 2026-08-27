# Zalmox — Architecture & Module Boundaries

This document defines **allowed import directions** and where new code should live.
Goal: thin routes, testable domain logic, no UI↔route spaghetti.

## Layer model

```
app/          → routes, layouts, thin re-exports only
features/     → vertical slices (guest-app, public-site, settings, …)
components/   → shared UI (admin, platform-admin, public, …)
services/     → data access, Supabase, caching, orchestration
domain/       → pure types, validation, business rules (no I/O)
lib/          → cross-cutting utilities (auth, env, tenant, security)
core/         → tenant context, plans, module registry (platform kernel)
```

### Import rules (enforced by `src/lib/architecture/import-boundaries.test.ts`)

| From | May import | Must NOT import |
|------|------------|-----------------|
| `domain/` | `domain/`, `lib/` (pure helpers only) | `services/`, `app/`, `components/`, Supabase |
| `services/` | `domain/`, `lib/`, other `services/` | `app/`, `components/` |
| `components/` | `domain/`, `services/`, `features/`, `lib/`, `components/` | `app/` (use `features/*/actions` instead) |
| `features/` | same as components | `app/` |
| `app/` | everything — **composition root** | — |

**Server actions** live in `features/<area>/actions/` (with `"use server"`).
Route files under `app/` re-export them for Next.js colocation — components import from `features/`, never from `app/`.

**Honest current state:** tenant admin, platform-admin, public calendar, signup, and alpha-gate server actions live in `features/`. **`components → app` is a strict zero** (enforced in `import-boundaries.test.ts`, multiline-aware). Route files under `app/` re-export actions; components import from `features/`, never from `app/`.

## Product boundaries

| Area | Route prefix | Code home |
|------|--------------|-----------|
| Tenant admin | `/admin/*` | `components/admin/` (UI), actions in `features/{checkin,calendar,bookings,buildings,rooms,guests,activity,availability,auth,settings,onboarding,simulation}/` |
| Platform admin | `/platform-admin/*` | `components/platform-admin/`, `features/platform-admin/`, `lib/platform-admin/` |
| Guest app | `/stay/[code]/*` | `features/guest-app/`, `services/guest-app/` |
| Public site | `/`, `/calendar`, … | `features/public-site/`, `services/public-site/` |
| Platform landing | `/landing`, signup | `components/platform/`, `features/signup/` |

Do not mix tenant UI into `platform-admin/` or platform-only logic into tenant `admin/`.

## Shared types (decoupling pattern)

Types used by both domain and services belong in **`domain/`**, not `services/` or `components/`:

- `domain/tenant/types.ts` — `TenantMemberRole`
- `domain/booking/row.ts` — `BookingRow`, list row aliases
- `domain/cazari/page-lists.ts` — Cazări page payloads
- `domain/cazari/labels.ts` — `CazariLabels`
- `domain/availability/day.ts` — `DayAvailability` (= `ComputedDay`)
- `domain/room/feature-filter.ts` — `roomMatchesFeatureFilter`

Services **re-export** these for backward compatibility; new code imports from `domain/`.

## Feature modules

| Module | Purpose |
|--------|---------|
| `features/public-site/` | Public site UI, preview, domain types, public calendar booking actions |
| `features/guest-app/` | Guest stay UI + `actions/` |
| `features/settings/` | Admin settings + room catalog server actions |
| `features/checkin/` | Check-in / tourist-sheet / payment-panel server actions |
| `features/calendar/` | Gantt create / move / hold / block server actions |
| `features/bookings/` | Booking cancel / checkout / phone / check-time / payment / invoice / guest-app share |
| `features/buildings/` | Building / floor / room-structure server actions |
| `features/guests/` | Guest profile / merge / notes / rebook server actions |
| `features/activity/` | Activity-log undo server actions |
| `features/availability/` | Day-availability detail server actions |
| `features/auth/` | Admin login, logout, forgot/reset password, bind-tenant-session |
| `features/onboarding/` | First-run onboarding server actions |
| `features/simulation/` | Demo/simulation trigger server actions |
| `features/platform-admin/` | Tenant provision / plan / domains / logs / tools server actions |
| `features/rooms/` | Create / update room from admin structure pages |
| `features/signup/` | Platform self-serve signup |
| `features/alpha-gate/` | Alpha unlock server action |

These slices are real. **PMS UI is still `components/admin`.** Action coupling from UI to `app/` is gone. Do not pretend the UI layer is migrated.

When adding a new vertical, prefer `features/<name>/` over growing `components/` or `app/`.

## Config & env

- **Secrets / env vars**: only `lib/env/` (server, edge, client split)
- **Platform admin emails**: `ZALMOX_ADMIN_EMAILS` (legacy `HOSPIRA_ADMIN_EMAILS` / `NESTIO_ADMIN_EMAILS` still accepted)
- **Branding / platform domain**: env + `lib/tenant/host.ts` — not hardcoded in components
- **Legacy `nestio.ro`**: parsed in `lib/tenant/host.ts` for backward compatibility; product name is Zalmox

## Barrels (`index.ts`)

| Barrel | Status |
|--------|--------|
| `@/core` | Allowed — platform kernel entry (tenant, plans, gates). Prefer direct imports for new code |
| `@/layout/mobile` | Allowed — mobile layout API |
| `@/services/bookings`, `@/services/guests`, `@/services/checkin` | Legacy re-exports; prefer direct file imports for tree-shaking |
| `@/features/settings/actions` | Allowed — settings action surface |

Avoid new mega-barrels that re-export entire subtrees.

## CSS / styling

Styles live under **`src/styles/`** — not scattered in `src/app/` (except the root `globals.css` shim required by Next.js).

| Layer | Path | Role |
|-------|------|------|
| Entry | `styles/entry/` | Global bundle: Tailwind, tokens, site brand |
| Themes | `styles/themes/` | Day/night tokens, admin palette bridge |
| Tokens | `styles/tokens/` | Semantic surface variables |
| Admin shell | `styles/admin/` | HUD, liquid, today bar (admin routes only) |
| Features | `styles/features/{admin,public,platform,guest,layout,shared}/` | Route/feature CSS |

**Import rules:**
- Root layout: `app/globals.css` → `styles/entry/global.css` only
- Route layouts import from `@/styles/features/...`
- New CSS files go in `styles/features/` or `styles/admin/` — never `src/app/*.css`
- Enforced by `src/lib/architecture/__tests__/css-boundaries.test.ts`

**Placement vs size:** CSS *lives* in the right folders. Size is not solved. God files (line caps enforced — must not grow):

| File | Cap (lines) |
|------|-------------|
| `styles/features/layout/mobile-admin.css` | 4794 |
| `styles/features/admin/gantt-premium.css` | 4654 |

**Freeze:** do not add rules to these two files. New styles go in a route-scoped sheet or Tailwind in JSX. Split only when you already touch that feature.

**Hybrid styling:** Tailwind v4 utilities for layout/spacing; BEM classes + CSS variables for feature UI. Prefer theme tokens over hardcoded colors.

**Incremental Tailwind pattern (example: `SettingsSaveBar`):**
- Layout/spacing/colors in JSX: `flex`, `gap-*`, `text-[var(--admin-text-muted)]`
- Keep BEM hooks only where mobile CSS or complex chrome depends on them: `.settings-save-bar`, `.settings-save-bar__actions`
- Compact sticky/offset rules stay in `admin-settings.css` + `mobile-core.css` (`data-layout-chrome="compact"`)

**Route scoping:** Heavy bundles load only on routes that need them — not in the global entry.

| Bundle | Entry import | Route layout |
|--------|--------------|--------------|
| `gantt-premium.css` (+ `gantt.css`, stay chips) | `admin-gantt-features.css` | `admin/(panel)/calendar/layout.tsx` |
| `gantt-mobile.css` | direct | `admin/(panel)/calendar/layout.tsx` |
| `admin-settings.css` | direct | `admin/(panel)/settings/layout.tsx` |
| `admin-availability-route.css` | direct | `admin/(panel)/disponibilitate/layout.tsx` |
| `admin-checkin.css` | `import-checkin-styles.ts` | `CheckinModal`, `CheckinWizardLauncher` |
| `mobile-admin.css` | direct | `admin/(panel)/layout.tsx` |
| `mobile-settings.css` | direct | `admin/(panel)/settings/layout.tsx` |
| `mobile-platform-admin.css` | direct | `platform-admin/(panel)/layout.tsx` |
| `mobile-gantt.css` | direct | `admin/(panel)/calendar/layout.tsx` |
| `mobile-cazari.css` | direct | `admin/(panel)/cazari/layout.tsx`, `guests/layout.tsx` |
| `mobile-avail.css` | direct | `admin/(panel)/disponibilitate/layout.tsx` |

Enforced by `css-boundaries.ts` for global-bundle leaks (`gantt-premium`, `admin-settings`, etc.) and god-file line caps.

## Mobile layout

`src/layout/mobile/` is intentionally decoupled — do not import admin or guest-app routes from mobile modules.

## Incremental migration checklist

When touching coupled code:

1. Move shared types to `domain/`
2. Move server actions to `features/*/actions/`
3. Keep `app/` as thin re-exports
4. Keep `components → app` at zero — new UI must import `features/<area>`, not `app/`
5. Run `npm test` (includes import/CSS boundary audits)
6. Update this doc if you add a new layer rule

## Remaining debt (known)

- PMS core UI is still `components/admin` (~277 files), not `features/`
- Many `app/` pages still call `services/` directly (acceptable for routes; extract loaders over time)
- Some `components/` import Supabase client for MFA (auth UI — candidate for `lib/auth/` facade)
- `@/core` barrel still wide; prefer direct imports for new code
- CSS location is correct; **size is not** — `mobile-admin.css` and `gantt-premium.css` are frozen at current line caps
- Legacy host names (`nestio`, `hospira`) still appear in routing/CSS class names
