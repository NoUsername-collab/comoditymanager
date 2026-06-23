# CasaEmil / Hospira — Architecture & Module Boundaries

This document defines **allowed import directions** and where new code should live.
Goal: thin routes, testable domain logic, no UI↔route spaghetti.

## Layer model

```
app/          → routes, layouts, thin re-exports only
features/     → vertical slices (guest-app, public-site, settings, …)
components/   → shared UI (admin, hospira-admin, public, …)
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
| Platform admin | `/hospira-admin/*` | `components/hospira-admin/`, `lib/hospira-admin/` |
| Guest app | `/stay/[code]/*` | `features/guest-app/`, `services/guest-app/` |
| Public site | `/`, `/calendar`, … | `features/public-site/`, `services/public-site/` |
| Platform landing | `/landing`, signup | `components/platform/`, `(platform)/` routes |

Do not mix tenant UI into `hospira-admin/` or platform-only logic into tenant `admin/`.

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
- **Legacy `nestio.ro`**: parsed in `lib/tenant/host.ts` for backward compatibility; product name is Hospira

## Barrels (`index.ts`)

| Barrel | Status |
|--------|--------|
| `@/core` | Allowed — platform kernel entry |
| `@/layout/mobile` | Allowed — mobile layout API |
| `@/services/bookings`, `@/services/guests`, `@/services/checkin` | Legacy re-exports; prefer direct file imports for tree-shaking |
| `@/features/settings/actions` | Allowed — settings action surface |

Avoid new mega-barrels that re-export entire subtrees.

## CSS / styling

Large global CSS files (`globals.css`, `admin-*.css`) are **legacy debt**.
New styles: co-locate with feature or use theme tokens in `src/styles/themes/`.
Do not add more cross-cutting rules to `globals.css` without a migration plan.

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
- Global CSS god files not yet split by feature
