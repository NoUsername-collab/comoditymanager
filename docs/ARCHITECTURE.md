# Architecture — Hospira / Casa Emil

Actualizat 2026-06-22. Ghid pentru **decuplare straturi** și **performanță** — cele două se susțin reciproc.

## Straturi

```
app/          → rute, layout, server actions (orchestrare)
features/     → UI + logică de feature (guest-app, public-site, settings, gantt)
components/   → UI reutilizabil, fără IO direct
services/     → IO (Supabase, cache, email) — singura poartă spre date
domain/       → pure: tipuri, validări, transformări, reguli de business
lib/          → utilitare cross-cutting (auth helpers, env, cache tags)
```

### Reguli de import

| De la | Poate importa | Nu importa |
|-------|---------------|------------|
| `domain/` | alte module `domain/`, tipuri pure | `services/`, `components/`, `@/lib/supabase/*`, React |
| `services/` | `domain/`, `lib/`, Supabase admin/server | `components/`, `features/*/ui` |
| `features/` | `domain/`, `services/`, `components/` | `@/lib/supabase/*` direct |
| `components/` | `domain/`, alte `components/`, hooks | `@/lib/supabase/*`, query-uri DB |
| `app/` | orice strat inferior | logică de business inline (mută în `domain/` sau `services/`) |

**Excepții documentate**

- **Client auth MFA** (`MfaEnrollmentPanel`, `MfaChallengeForm`, `StaffTenantSessionBinder`) — `createClient()` din `@/lib/supabase/client` pentru fluxuri browser-only.
- **Server actions** în `app/` — pot apela Supabase pentru mutații, dar citirile trec prin `services/`.

## Feature folders

| Feature | Locație | Responsabilitate |
|---------|---------|----------------|
| Site public | `features/public-site/` | secțiuni, teme, preview |
| Guest app | `features/guest-app/` | ecran oaspeți, check-in, MRZ |
| Settings | `components/admin/settings/` + `features/settings/actions/` | formulare admin, salvare |
| Gantt | `components/admin/gantt/` + `domain/gantt/` | calendar operațional |

Paginile din `app/` compun feature-urile; nu duplică logica din `domain/`.

## Performanță + decuplare

### Cache la granița de serviciu

Fiecare serviciu expune funcții **cached per-request** (`React.cache`) și, unde datele sunt tenant-static, **`unstable_cache`** cu tag-uri din `lib/cache-tags.ts`.

```typescript
// services/example.ts
const loadForTenant = cache((tenantId: string) =>
  unstable_cache(() => fetchUncached(tenantId), ["key", tenantId], {
    tags: [tenantTag(tenantId, CACHE_TAGS.example)],
    revalidate: 120,
  })(),
);
```

**Reguli**

- După split-uri „god class”, păstrează **aceleași chei de cache** (`["setup-onboarding-context", tenantId]`, etc.).
- `Promise.all` la granița paginii — **nu** waterfall între servicii independente.
- `React.cache` dedupează în același request (ex.: `getPensionIdentity` apelat din 2 servicii = 1 query).

### Bundle: import dinamic la granița de feature

Componente grele (Gantt, MRZ/Tesseract, preview site public, heatmap) folosesc `dynamic(..., { ssr: false })` în fișiere `*Lazy.tsx` — UI-ul rămâne decuplat, bundle-ul inițial rămâne mic.

Domain greu (`mrz-parse`) poate fi importat dinamic din `domain/guest/mrz.ts` pentru a nu trage parserul în bundle-uri care doar afișează UI.

### Fără N+1 după split

- Agregă date în serviciu (`loadOnboardingIssueContext`, `getPublicSiteAdminBundle`) — o pagină = un `Promise.all`, nu loop-uri cu await.
- `getPublicSiteAdminBundle` — config + `primaryContact` paralel, cached; înlocuiește apeluri duplicate identity + config.

### Importuri lean

- `optimizePackageImports` în `next.config.ts` pentru biblioteci voluminoase.
- Feature-urile nu importă barrel-uri întregi din alte feature-uri — doar module țintă (`@/features/public-site/domain/types`, nu tot folderul).
- CSS de feature (ex. `public-site-v2.css`) doar în componente lazy/preview, nu în layout global.

## Anti-pattern

| Anti-pattern | Alternativă |
|--------------|-------------|
| Componentă → Supabase | `services/` + props / server component loader |
| Query în layout fără cache | `unstable_cache` + tag revalidate la save |
| `getXForAdmin()` uncached duplicat | același loader cached + `revalidateTag` în action |
| Split serviciu → 5 await secvențiale | `Promise.all` la orchestrator (pagină sau facade serviciu) |
| `@media (max-width)` pentru chrome mobil | `html[data-layout-chrome="compact"]` (vezi `layout/mobile/`) |

## Verificare locală

```bash
npx tsc --noEmit
npm test
npm run build
npm run analyze   # opțional — bundle analyzer
```

## Referințe

- `docs/performance.md` — optimizări existente
- `docs/performance-roadmap.md` — pași viitori
- `CLAUDE.md` / `AGENTS.md` — convenții Next.js proiect
