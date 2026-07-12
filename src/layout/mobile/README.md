# Mobile Layout

Decoupled viewport layout system for Zalmox. When working with AI, say **"Mobile layout"** to target this module.

## Modes (`data-layout-mode` on `<html>`)

| Mode | Rule | Shell behavior |
|------|------|----------------|
| `mobile` | `min(width, height) < 640` | Bottom nav, drawer — **portrait & landscape** |
| `tablet` | width 640–1023 | Scroll nav, tighter padding |
| `desktop` | width ≥ 1024 | Full desktop chrome |

**Orientation:** `data-layout-orientation` = `portrait` | `landscape` (landscape uses compact bottom nav).

Uses `visualViewport` when available (iOS URL bar). **Chrome** (`data-layout-chrome`): `compact` = bottom nav + drawer (mobile + tablet portrait); `wide` = desktop chrome.

Set before first paint via boot script in `boot-script.ts` (re-exported from `display-profile.ts`).

## Display settings integration

Settings → **Layout ecran** (`hospira-display-layout` in localStorage):

| Preference | Display profile | Shell chrome |
|------------|-----------------|--------------|
| `auto` | Viewport (phone → `narrow`) | Auto (`compact` on phone / tablet portrait) |
| `narrow` (Îngust) | `narrow` | `compact` (forced mobile shell) |
| `wide` / `laptop` / `compact-laptop` | Forced profile | `wide` (desktop shell on device) |

Single apply path: `applyDocumentLayout()` in `apply-document-layout.ts`.

## File map

| Path | Role |
|------|------|
| `breakpoints.ts` | Canonical px values (JS source of truth) |
| `resolve.ts` | Pure width → mode/breakpoint |
| `dom.ts` | Apply/read `data-layout-mode` on document |
| `admin-tabs.ts` | Shared admin nav items (top + bottom nav) |
| `../components/` | Shell chrome (`AdminMobileBottomNav`, `PublicMobileMenu`, `MobileShell`) |
| `../../styles/features/layout/mobile-layout.css` | Shell primitives + `@import` of `mobile-core.css` (global) |
| `../../styles/features/layout/mobile-core.css` | Guards, alignment tokens, touch targets (~350 lines) |
| `../../styles/features/layout/mobile-admin.css` | Admin core (HUD + general admin pages) |
| `../../styles/features/layout/mobile-settings.css` | Admin settings UI (settings pages) |
| `../../styles/features/layout/mobile-platform-admin.css` | Platform admin UI (nestio-admin / platform-admin) |
| `../../styles/features/layout/mobile-gantt.css` | Gantt calendar only (`calendar/layout.tsx`) |
| `../../styles/features/layout/mobile-cazari.css` | Cazări + guests (`cazari/`, `guests/` layouts) |
| `../../styles/features/layout/mobile-avail.css` | Disponibilitate (`disponibilitate/layout.tsx`) |
| `../../styles/features/layout/mobile-public.css` | Public site + platform marketing + guest-app (import in public layouts) |
| `../../hooks/useMobileLayout.ts` | React hook when JS must branch |

## Rules

1. **CSS first** — style with `html[data-layout-mode="mobile"]` or `html.layout-mobile`, not JS branches.
2. **Hook only for behavior** — drawers, focus traps, conditional mount of light client chrome.
3. **Do not duplicate breakpoints** — import `LAYOUT_BREAKPOINTS` or use `--ml-bp-*` in CSS.
4. **`data-display-profile`** — density for admin/Gantt; **`data-layout-chrome`** — shell (bottom nav vs desktop). Both respect Settings unless `auto`.
5. **Prefer `data-layout-chrome="compact"`** in CSS over `@media` or `touch-device` alone.

## Adding mobile styles to a page

```css
/* Prefer attribute selectors (no JS) */
html[data-layout-mode="mobile"] .my-page__sidebar {
  display: none;
}

html[data-layout-surface="admin"][data-layout-mode="mobile"] .my-widget {
  padding-inline: 1rem;
}
```

## Adding a new surface

1. Wrap layout in `<MobileShell surface="platform" />`.
2. Add `ml-shell--platform` rules in `mobile-layout.css` if needed.
3. Add mobile chrome component under `src/layout/components/`.

## Mobile UX verification (390×844)

| Check | Command / route |
|-------|-----------------|
| CSS contract (touch, cards, safe-area) | `npx vitest run src/layout/mobile/__tests__/` |
| Layout math (compact on phone) | `display-integration.test.ts` |
| E2E smoke (iPhone 13) | `npm run test:e2e:mobile` (needs `E2E_ADMIN_*`) |

**Card-over-table pattern** (compact): use paired classes `*-cards` + `*-table-desktop`, hide one via `html[data-layout-chrome="compact"]` in `mobile-layout-flawless.css`. Examples: `hospira-log-*`, `statistics-*`, `invoice-line-*`.

**Drawers:** `useMobileDrawer` — focus trap + Escape + `ml-drawer-open` on `<html>`.

**PWA (Add to Home Screen):** `src/app/manifest.ts` — `display: standalone`, theme colors, start at `/admin`. iOS: `appleWebApp` in root `layout.tsx`.
