# Zalmox / Zalmox — Architecture & Module Boundaries

This document defines **allowed import directions** and where new code should live.
Goal: thin routes, testable domain logic, no UI↔route spaghetti.

## Layer model

```
app/          → routes, layouts, thin re-exports only
features/     → vertical slices (guest-app, public-site, settings, …)
components/   → shared UI (admin, Zalmox-admin, public, …)
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

## Product boundaries

| Area | Route prefix | Code home |
|------|--------------|-----------|
| Tenant admin | `/admin/*` | `components/admin/`, `features/settings/` |
| Platform admin | `/Zalmox-admin/*` | `components/Zalmox-admin/`, `lib/Zalmox-admin/` |
| Guest app | `/stay/[code]/*` | `features/guest-app/`, `services/guest-app/` |
| Public site | `/`, `/calendar`, … | `features/public-site/`, `services/public-site/` |
| Platform landing | `/landing`, signup | `components/platform/`, `(platform)/` routes |

Do not mix tenant UI into `Zalmox-admin/` or platform-only logic into tenant `admin/`.

## Shared types (decoupling pattern)

Types used by both domain and services belong in **`domain/`**, not `services/`:

- `domain/tenant/types.ts` — `TenantMemberRole`
- `domain/booking/row.ts` — `BookingRow`, list row aliases
- `domain/cazari/page-lists.ts` — Cazări page payloads
- `domain/availability/day.ts` — `DayAvailability` (= `ComputedDay`)

Services **re-export** these for backward compatibility; new code imports from `domain/`.

## Feature modules

| Module | Purpose |
|--------|---------|
| `features/public-site/` | Public site UI, preview, domain types |
| `features/guest-app/` | Guest stay UI + `actions/` |
| `features/settings/` | Admin settings server actions |

When adding a new vertical, prefer `features/<name>/` over growing `components/` or `app/`.

## Config & env

- **Secrets / env vars**: only `lib/env/` (server, edge, client split)
- **Branding / platform domain**: env + `lib/tenant/host.ts` — not hardcoded in components
- **Legacy `nestio.ro`**: parsed in `lib/tenant/host.ts` for backward compatibility; product name is Zalmox

## Barrels (`index.ts`)

| Barrel | Status |
|--------|--------|
| `@/core` | Allowed — platform kernel entry |
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

Enforced by `css-boundaries.ts` for global-bundle leaks (`gantt-premium`, `admin-settings`, etc.).

## Mobile layout

`src/layout/mobile/` is intentionally decoupled — do not import admin or guest-app routes from mobile modules.

## Incremental migration checklist

When touching coupled code:

1. Move shared types to `domain/`
2. Move server actions to `features/*/actions/`
3. Keep `app/` as thin re-exports
4. Run `npm test` (includes import boundary audit)
5. Update this doc if you add a new layer rule

## Remaining debt (known)

- Many `app/` pages still call `services/` directly (acceptable for routes; extract loaders over time)
- Some `components/` import Supabase client for MFA (auth UI — candidate for `lib/auth/` facade)
- `services/availability-month.ts` imports a component helper (`RoomFeatureBadges`) — invert dependency
- `@/core` barrel still wide; prefer direct imports for new code
- Global CSS god files not yet split by feature — **resolved**: styles live under `src/styles/`; `globals.css` is a 1-line shim
- `mobile.css` split into layout-scoped bundles: `mobile-core` (global), `mobile-admin` (core), `mobile-settings` / `mobile-platform-admin` (scoped layouts), `mobile-gantt` / `mobile-cazari` / `mobile-avail` (per route), `mobile-public` (public layouts)
