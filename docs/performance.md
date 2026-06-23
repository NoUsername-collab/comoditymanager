# Performance notes — Hospira / Casa Emil

Actualizat 2026-06-22 (pass agresiv + diagnostic real).

## Diagnostic — ce era lent (măsurat în cod, nu presupuneri)

| Bottleneck | Impact | Pagini afectate |
|------------|--------|-----------------|
| **OnboardingBar** fără Suspense în layout admin | 6 query-uri count blocau shell-ul pe fiecare pagină admin (onboarding incomplet) | Toate `/admin/*` |
| **Gantt `listBookingsForRange`** + `attachGuestProfiles` | +1 round-trip DB inutil (Gantt nu folosește `guest_profile`) | `/admin/calendar` |
| **`releaseExpiredRoomHolds`** înainte de read holds | Write blocant înainte de fetch occupancy | `/admin/calendar` |
| **Calendar page** fără streaming | TTFB = timp total `loadCalendarCoreData` (7 query-uri paralele + attach check-in) | `/admin/calendar` |
| **Guest stay layout** waterfall | `resolveGuestAccessByCode` după batch config | `/stay/[code]/*` |
| **`resolveGuestAppContext`** secvențial | `liveState` + `precheckinPrefill` una după alta | `/stay/[code]` |
| **`getStaffShellAccess`** secvențial | `getTeamPermissions` aștepta auth context | Shell admin |
| **CheckinModal** import static pe home | CSS + shell check-in în bundle home | `/admin` |

## Ce s-a schimbat (acest pass)

| Fix | Mecanism |
|-----|----------|
| Onboarding | `OnboardingBarLazy` + `Suspense` în layout admin |
| Gantt bookings | Fără `attachGuestProfiles` pe `listBookingsForRange` |
| Occupancy holds | `releaseExpiredRoomHolds` fire-and-forget, holds în paralel |
| Calendar TTFB | `CalendarGanttSection` în `Suspense` — shell + skeleton instant |
| Guest app | Layout: session în `Promise.all`; context: `liveState` ∥ `precheckinPrefill` |
| Admin shell | `getStaffShellAccess`: auth ∥ `getTeamPermissions` |
| Admin home | `CheckinModal` via `dynamic()` |
| Settings | `SettingsShellWithSetupIssues` (deja prezent, confirmat streaming) |

## Ce e optimizat (baseline anterior)

| Zonă | Mecanism |
|------|----------|
| **Gantt calendar** | `loadCalendarCoreData` + `listBookingsForRange` — `unstable_cache` 45s, `React.cache` per request, bypass cache în sim |
| **Cazări operațional** | `CAZARI_LIST_SELECT` (fără coloane audit), filtru DB horizon 365z + grace 30z, cache 30s |
| **Check-in attach** | Fără write-uri orphan pe read paths; `repairOrphans` doar pe detaliu booking |
| **Guest highlights** | Un singur batch hydrate pentru toate bucket-urile |
| **Guest profiles list** | Select coloane țintă, fără `ensureGuestProfiles` upsert pe read |
| **Clădiri / pensiune / email** | `unstable_cache` 300s cu tag-uri tenant |
| **Tenants** | `TENANT_ROW_SELECT` în loc de `select("*")` |
| **Gantt UI** | Shell lazy, heatmap/cereri lazy, popover hover lazy (`dynamic`) |
| **Gantt rânduri** | Virtualizare `GanttVirtualizedBody`; memo pe row/bar; cache culori clădiri |
| **MRZ OCR** | `tesseract.js` — import dinamic, worker singleton |
| **Check-in CSS** | Scos din bundle global admin — încărcat la deschidere modal/wizard |
| **Bundle** | `optimizePackageImports` — date-fns, supabase, next-intl, RHF, zod, sentry |
| **Barrel imports** | Tipuri Gantt din `@/services/bookings/types` (nu barrel) |
| **Imagini** | `next/image` pe galerii public/guest + `remotePatterns` Supabase |
| **Fonturi** | `display: swap`; mono fără preload |
| **Liste lungi** | `content-visibility: auto` pe carduri cazări + oaspeți |
| **Settings** | `resolveSetupIssues` + `buildSettingsAlerts` în paralel; context `cache()` + `Promise.all` |
| **Prefetch** | Calendar/statistics/disponibilitate — fără prefetch eager la mount nav |
| **CSS route** | `admin-settings.css` doar pe `/admin/settings/*`; `admin-login.css` doar pe login |

## Verificare locală

```bash
npm run analyze    # bundle analyzer (ANALYZE=true)
npm test
npx tsc --noEmit
npm run build      # notează First Load JS din output
```

## Build baseline (înregistrare)

Rulați `npm run build` și notați din output:
- **First Load JS** per rută admin/public critică
- **Shared chunks** total
- Rute țintă: `/admin/calendar`, `/admin/cazari`, `/admin/guests`, landing public

## Lighthouse-relevant

- TTFB: mai mic pe cazări (fără write-uri check-in, query bounded)
- LCP: `next/image` + lazy galerii
- TBT/INP: Gantt popover/check-in JS amânat; CSS check-in off critical path
- CLS: `contain-intrinsic-size` pe liste cazări

## Build — chunk-uri mari (tipice)

După `npm run build`, verifică output-ul `.next` sau `ANALYZE=true npm run analyze`:

| Chunk / rută | Conținut probabil |
|--------------|-------------------|
| `admin/calendar` | Gantt virtualizat, heatmap lazy, dialoguri dynamic |
| `admin/checkin` + MRZ | `tesseract.js` (dynamic, la scan) |
| `admin/statistics` | Agregări server + chart lazy |
| `admin/disponibilitate` | `AvailabilityDashboardLazy` |
| Shared vendor | date-fns, supabase, next-intl (tree-shaken via `optimizePackageImports`) |

CSS admin: `admin-features` fără settings (~650 linii + teme); gantt/checkin CSS doar pe rutele lor.

## Următorii pași (opțional)

1. **attachCheckinRecordState** variantă ușoară pentru Gantt (3 query-uri în loc de 5)
2. **Shared calendar context** între Gantt și heatmap disponibilitate
3. **`listGanttRooms()`** — select îngust camere pentru calendar
4. **Admin home** — `loadMonthComparison` / milestones în Suspense separat

## Server audit (2026-06-22)

### Slow patterns remediated this pass

| Pattern | Fix |
|---------|-----|
| `requireTenantIdForData()` called 10+× per render | `React.cache()` in guards + resolve-id |
| Statistics report recomputed every request | `unstable_cache` 120s, tenant-scoped |
| Month compare + dashboard share stats base | `loadStatisticsBaseDataForTenant` + cross-request cache |
| Building dashboard availability stays | `unstable_cache` 45s on `loadStaysForAvailability` |
| Guest highlights (4 parallel queries + batch) | `unstable_cache` 60s per tenant |
| Tenant members / domains lists | `unstable_cache` + explicit column selects |
| Guest row `SELECT *` | `GUEST_ROW_SELECT` / `GUEST_PROFILE_SUMMARY_SELECT` |
| Public site config | settings + sections fetched in parallel |
| Daily summary cron | per-tenant email/summary/recipients in `Promise.all` |
| Guest app settings | `unstable_cache` 300s per tenant |

### Still watch (no migration unless profiling confirms)

- **Statistics** `loadAllBookingsForStatisticsImpl` — full tenant booking history; index `(tenant_id, check_in)` helps
- **Guest search** text `ilike` on `display_name`/`email`/`phone` — consider `pg_trgm` if search feels slow
- **Activity log** `metadata->>booking_id` filter — GIN on `metadata` if booking timeline grows large
- **Backup cron** `SELECT *` per table — intentional for full export; not hot path
- **inviteTenantMember** `listUsers({ perPage: 1000 })` — Auth admin scan; rare admin action

### Missing indexes (report only)

```sql
-- bookings: gantt range, cazări, statistics
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_check_in ON bookings (tenant_id, check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status ON bookings (tenant_id, status);

-- guest search
CREATE INDEX IF NOT EXISTS idx_guests_tenant_phone_norm ON guests (tenant_id, phone_normalized);
CREATE INDEX IF NOT EXISTS idx_guests_tenant_email_norm ON guests (tenant_id, email_normalized);

-- activity log booking metadata
CREATE INDEX IF NOT EXISTS idx_admin_activity_tenant_created ON admin_activity_log (tenant_id, created_at DESC);
```

## Anti-pattern

- `linear-gradient` pe carduri operaționale (vezi `docs/design-color-roadmap.md`)
- Query-uri în layout fără cache pentru date tenant statice
- `tesseract` import static în client bundle
- `attachCheckinRecordState` cu repair pe liste/read paths
