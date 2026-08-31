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

**Placement rule:** new feature screens go in `features/<area>/ui/`. Do **not** add feature UI under `components/admin/` except shared chrome (`shell/`, `ui/`, `feedback/`, `loading/`, `overlay/`, TopBar/Nav).

## Scoreboard (honest)

Update this table when a wave lands. Do not mark a slice “done” if UI still lives in `components/`.

| Slice | Actions | Loaders | UI |
|-------|---------|---------|----|
| guest-app | done | **fat layout extracted** | **in `features/guest-app/`** (model) |
| public-site | done | leftover | leftover (`components/calendar`, `components/public`) |
| signup / alpha-gate | done | n/a | leftover |
| auth | done | n/a | **in `features/auth/ui/`** |
| checkin | done | leftover | **in `features/checkin/ui/`** |
| calendar / gantt | done | leftover | leftover (`components/admin/gantt`) |
| bookings | done | **detail + factura** | **in `features/bookings/ui/`** |
| buildings / rooms / structure | done | **rooms new/edit** | **in `features/buildings/ui/` + `features/rooms/ui/`** |
| guests | done | **guest detail** | **in `features/guests/ui/`** |
| cazari | n/a (uses bookings/activity) | **page data** | **in `features/cazari/ui/`** |
| availability | done | leftover | **in `features/availability/ui/`** |
| settings | done | leftover | **panels in `features/settings/ui/`** (chrome stays in `components/admin/settings`) |
| onboarding | done | leftover | **in `features/onboarding/ui/`** |
| platform-admin | done | leftover | leftover (`components/platform-admin`) |
| activity | done | n/a | leftover |

**Already done (do not re-do):**
- `ZALMOX_ADMIN_EMAILS` + legacy fallback
- Dead hexagon (`IDataProvider`) removed
- **All server actions in `features/`** — `components → app` is a **strict zero**
- `app/` action files are thin re-exports only
- CSS *lives* in `src/styles/` (size is a separate leftover)

**Not done:**
- PMS UI: ~279 files in `components/admin/` (shell stays; feature folders move)
- ~40 `page.tsx` + 3 layouts still import `@/services/` (extract `features/<area>/loaders.ts`)
- 3 components import Supabase browser client (MFA / session binder)
- CSS size: god-file freeze; split only when that feature’s UI moves

## Product boundaries

| Area | Route prefix | Code home |
|------|--------------|-----------|
| Tenant admin | `/admin/*` | chrome in `components/admin/{shell,ui,feedback}`; feature UI **target** `features/<area>/ui/`; actions already in `features/` |
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

| Module | What is actually there |
|--------|------------------------|
| `features/public-site/` | Preview UI + calendar/confirm **actions** (public booking forms still in `components/`) |
| `features/guest-app/` | Stay UI + `actions/` |
| `features/settings/` | Settings + catalog **actions** + `ui/` (panels; chrome stays in `components/admin/settings`) |
| `features/checkin/` | Check-in **actions** + `ui/` |
| `features/calendar/` | Gantt **actions** |
| `features/bookings/` | Booking **actions** + `loaders.ts` + `ui/` (detail, invoice, payments, checkout, confirm) |
| `features/buildings/` | Building/floor **actions** + `ui/` (dashboard, structure) |
| `features/guests/` | Guest **actions** + `loaders.ts` + `ui/` |
| `features/activity/` | Undo **actions** |
| `features/availability/` | Day-detail **actions** + `ui/` (dashboard, home preview) |
| `features/auth/` | Login / logout / password / bind-session **actions** + `ui/` (login, MFA challenge, forgot/reset) |
| `features/onboarding/` | Onboarding **actions** + `ui/` (wizard, bar, checklist) |
| `features/platform-admin/` | Platform **actions** |
| `features/rooms/` | Room create/edit **actions** + `loaders.ts` + `ui/` (forms, catalog badges) |
| `features/signup/` | Signup **action** |
| `features/alpha-gate/` | Unlock **action** |

**PMS UI is still `components/admin`.** Actions are migrated. UI and page loaders are the remaining waves (B–C in the UI migration plan).

When adding a new vertical, put actions + loaders + UI under `features/<name>/` — not `components/admin/` or fat `app/` pages.

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
| `styles/features/layout/mobile-admin.css` | 4772 |
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
2. Server actions already live in `features/` — keep `app/` as thin re-exports
3. Extract page data to `features/<area>/loaders.ts` — `page.tsx` = guard + loader + render
4. Move feature UI to `features/<area>/ui/` — chrome stays in `components/admin/{shell,ui,feedback}`
5. Keep `components → app` at zero
6. Run `npm test` (includes import/CSS boundary audits)
7. Update the **Scoreboard** in this doc

**Wave order (do not skip to Gantt):** A scoreboard (this section) → B fat-page loaders → C UI slices (auth → … → gantt last) → D MFA facade → E CSS only if that slice is already open.

## Remaining debt (known)

- PMS feature UI still in `components/admin/` (~279 files); shell stays
- `app/` pages still import `@/services/` until loaders exist for that route
- MFA / session binder import `@/lib/supabase/client` (Val D)
- `@/core` barrel: prefer direct imports for new code
- CSS location is correct; **size is not** — god files frozen at current line caps
- Legacy host names (`nestio`, `hospira`) still appear in routing/CSS class names
