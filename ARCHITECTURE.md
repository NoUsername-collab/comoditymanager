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
| `components/` | `domain/`, `services/`, `features/`, `lib/`, `components/` | `app/` (use `features/*/actions` instead); `@/lib/supabase/client` (use `lib/auth/mfa-browser`) |
| `features/` | same as components | `app/`; `@/lib/supabase/client` |
| `app/` | everything — **composition root** | — |

**Server actions** live in `features/<area>/actions/` (with `"use server"`).
Route files under `app/` re-export them for Next.js colocation — components import from `features/`, never from `app/`.

**Placement rule:** new feature screens go in `features/<area>/ui/`. Do **not** add feature UI under `components/admin/` except shared chrome (`shell/`, `ui/`, `feedback/`, `loading/`, `overlay/`, TopBar/Nav).

## Scoreboard (honest)

Update this table when a wave lands. Do not mark a slice “done” if UI still lives in `components/`.

| Slice | Actions | Loaders | UI |
|-------|---------|---------|----|
| guest-app | done | **stay layout + home + feature** | **in `features/guest-app/`** (model) |
| public-site | done | **layout + home + calendar + receptie + termeni + confirm** | **in `features/public-site/ui/`** (chrome: `LanguageSwitcher`, skeletons in `components/public`) |
| signup / alpha-gate | done | n/a | **in `features/signup/ui/` + `features/alpha-gate/ui/`** (landing included) |
| auth | done | n/a | **in `features/auth/ui/`** |
| checkin | done | **settings page** | **in `features/checkin/ui/`** (operative provider included) |
| calendar / gantt | done | **gantt core fetch** | **in `features/calendar/ui/`** |
| bookings | done | **list + detail + factura** | **in `features/bookings/ui/`** |
| buildings / rooms / structure | done | **list + new/edit + location structure/setup** | **in `features/buildings/ui/` + `features/rooms/ui/`** |
| guests | done | **list + detail + rebook** | **in `features/guests/ui/`** |
| cazari | n/a (uses bookings/activity) | **page data + labels re-export** | **in `features/cazari/ui/`** (search form included) |
| availability | done | **admin home + dashboard shell** | **in `features/availability/ui/`** (home dashboard included) |
| settings | done | **overview + all settings pages + statistics + location** | **panels + statistics in `features/settings/ui/`** (chrome stays in `components/admin/settings`) |
| onboarding | done | **pension settings** | **in `features/onboarding/ui/`** |
| platform-admin | done | **dashboard + tenants + tenant detail + logs** | **in `features/platform-admin/ui/`** |
| activity | done | **devlog page** | **in `features/activity/ui/`** (devlog filters included) |

**Already done (do not re-do):**
- `ZALMOX_ADMIN_EMAILS` + legacy fallback
- Dead hexagon (`IDataProvider`) removed
- **All server actions in `features/`** — `components → app` is a **strict zero**
- `app/` action files are thin re-exports only
- CSS *lives* in `src/styles/`
- **MFA / session binder use `lib/auth/mfa-browser`** — UI does not import `@/lib/supabase/client`
- Cazari / payments / activity CSS is route-scoped (`cazari`, `istoric`, `bookings/[id]` layouts)
- `gantt-premium.css` is an import barrel (`gantt-premium-{shell,toolbar,stays,overlays,density,quick-panel}.css`)
- `mobile-admin.css` is an import barrel (`mobile-admin-{hud,premium,flawless,alignment,touch}.css`)
- Leftover feature screens moved: home dashboard, statistics, devlog filters, cazari search
- Operative check-in provider in `features/checkin/ui/`; setup-issue badge in settings chrome

**Not done:**
- PMS chrome in `components/admin/{shell,ui,feedback,loading,overlay,settings}` + TopBar/Nav
- CSS barrels: do not add rules to `mobile-admin.css` or `gantt-premium.css`
- `app/` API cron routes and `statistics/export` still call `@/services/` (composition-root handlers, not pages)

## Product boundaries

| Area | Route prefix | Code home |
|------|--------------|-----------|
| Tenant admin | `/admin/*` | chrome in `components/admin/{shell,ui,feedback}`; feature UI **target** `features/<area>/ui/`; actions already in `features/` |
| Platform admin | `/platform-admin/*` | UI in `features/platform-admin/ui/`; actions in `features/platform-admin/`; `lib/platform-admin/` |
| Guest app | `/stay/[code]/*` | `features/guest-app/`, `services/guest-app/` |
| Public site | `/`, `/calendar`, … | UI in `features/public-site/ui/` (+ existing sections/hero); shared chrome in `components/public`; `services/public-site/` |
| Platform landing | `/landing`, signup | UI in `features/signup/ui/` + `features/alpha-gate/ui/` |

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
| `features/public-site/` | Preview UI + calendar/confirm **actions** + `loaders.ts` + `ui/` (booking forms, tenant header/footer/staff) |
| `features/guest-app/` | Stay UI + `actions/` + `loaders.ts` |
| `features/settings/` | Settings + catalog **actions** + `loaders.ts` + `ui/` (panels + statistics; chrome stays in `components/admin/settings`) |
| `features/checkin/` | Check-in **actions** + `loaders.ts` + `ui/` (wizard + operative provider) |
| `features/calendar/` | Gantt **actions** + `loaders.ts` + `ui/` (calendar, bars, toolbar, dialogs) |
| `features/bookings/` | Booking **actions** + `loaders.ts` + `ui/` (detail, invoice, payments, checkout, confirm) |
| `features/buildings/` | Building/floor **actions** + `loaders.ts` + `ui/` (dashboard, structure) |
| `features/guests/` | Guest **actions** + `loaders.ts` + `ui/` |
| `features/activity/` | Undo **actions** + `loaders.ts` + `ui/` (istoric, booking timeline, devlog filters) |
| `features/availability/` | Day-detail **actions** + `loaders.ts` + `ui/` (dashboard, home preview, today board) |
| `features/cazari/` | `loaders.ts` + `ui/` (stay lists, search form) |
| `features/auth/` | Login / logout / password / bind-session **actions** + `ui/` (login, MFA challenge, forgot/reset) |
| `features/onboarding/` | Onboarding **actions** + `loaders.ts` + `ui/` (wizard, bar, checklist) |
| `features/platform-admin/` | Platform **actions** + `loaders.ts` + `ui/` (tenants, logs, tools) |
| `features/rooms/` | Room create/edit **actions** + `loaders.ts` + `ui/` (forms, catalog badges) |
| `features/signup/` | Signup **action** + `ui/` (form + platform landing) |
| `features/alpha-gate/` | Unlock **action** + `ui/` |

**PMS chrome stays in `components/admin/{shell,ui,feedback,loading,overlay}` plus TopBar/Nav and `settings/` chrome.** Feature screens are in `features/<area>/ui/`. CSS god files are import barrels.

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
| `styles/features/layout/mobile-admin.css` | 8 (import barrel; sheets in `mobile-admin-*.css`) |
| `styles/features/admin/gantt-premium.css` | 9 (import barrel; sheets in `gantt-premium-*.css`) |

**Freeze:** do not add rules to the `mobile-admin.css` or `gantt-premium.css` barrels. New Gantt styles go in `gantt-premium-*.css`. New admin-shell mobile styles go in `mobile-admin-*.css` (or a route-scoped sheet / Tailwind in JSX).

**Hybrid styling:** Tailwind v4 utilities for layout/spacing; BEM classes + CSS variables for feature UI. Prefer theme tokens over hardcoded colors.

**Incremental Tailwind pattern (example: `SettingsSaveBar`):**
- Layout/spacing/colors in JSX: `flex`, `gap-*`, `text-[var(--admin-text-muted)]`
- Keep BEM hooks only where mobile CSS or complex chrome depends on them: `.settings-save-bar`, `.settings-save-bar__actions`
- Compact sticky/offset rules stay in `admin-settings.css` + `mobile-core.css` (`data-layout-chrome="compact"`)

**Route scoping:** Heavy bundles load only on routes that need them — not in the global entry.

| Bundle | Entry import | Route layout |
|--------|--------------|--------------|
| `gantt-premium.css` (+ `gantt.css`, stay chips, `gantt-premium-*.css` slices) | `admin-gantt-features.css` | `admin/(panel)/calendar/layout.tsx` |
| `gantt-mobile.css` | direct | `admin/(panel)/calendar/layout.tsx` |
| `admin-settings.css` | direct | `admin/(panel)/settings/layout.tsx` |
| `admin-history.css` | direct | `admin/(panel)/istoric/layout.tsx`, `cazari/layout.tsx`, `bookings/[id]/layout.tsx` |
| `admin-cazari-toolbar.css` | direct | `admin/(panel)/cazari/layout.tsx` |
| `admin-cazari-cards.css` | direct | `admin/(panel)/cazari/layout.tsx`, `bookings/[id]/layout.tsx` |
| `admin-payments.css` | direct | `admin/(panel)/bookings/[id]/layout.tsx` |
| `admin-booking-detail.css` | direct | `admin/(panel)/bookings/[id]/layout.tsx` |
| `admin-availability-route.css` | direct | `admin/(panel)/disponibilitate/layout.tsx` |
| `admin-checkin.css` | `import-checkin-styles.ts` | `CheckinModal`, `CheckinWizardLauncher` |
| `mobile-admin.css` (+ `mobile-admin-*.css` slices) | direct | `admin/(panel)/layout.tsx` |
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

**Wave order:** A scoreboard (this section) → B fat-page loaders (done) → C UI slices (done; gantt last) → D MFA facade (done) → E CSS: cazari/payments/activity un-globalled; `gantt-premium.css` and `mobile-admin.css` split into section sheets.

## Remaining debt (known)

- PMS chrome stays in `components/admin/{shell,ui,feedback,loading,overlay,settings}` plus TopBar/Nav
- `@/core` barrel: prefer direct imports for new code
- CSS location is correct; god files are barrels (`mobile-admin.css`, `gantt-premium.css`) — do not add rules to them
- Legacy host names (`nestio`, `hospira`) still appear in routing/CSS class names
