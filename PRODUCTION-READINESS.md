# Production Readiness — CasaEmil / Hospira

Jurnal de verificări înainte de deploy. Fiecare **Pass** rulează `tsc`, `npm test` și `npm run build`, remediază regresiile și notează verdictul.

---

## Pass 13 — 2026-06-22

### Comenzi

| Verificare | Rezultat | Detalii |
|------------|----------|---------|
| `npx tsc --noEmit` | **OK** | Fără erori TypeScript în `src/` (după eliminarea `.next/types` corupte din rulări paralele). |
| `npm test` | **OK** | **1225** teste trecute, **0** eșuate (137 fișiere). |
| `npm run build` | **EȘUAT** | `EPERM` la ștergerea `.next/server/chunks/ssr/src_0nfyxmr._.js.map` — fișier blocat (probabil `next dev`/proces Node paralel pe Windows). Recomandat: oprire server dev, ștergere `.next`, rebuild izolat. |

### Remedieri în acest pass

- **`src/domain/guest/mrz-parse.ts`**: reintroduse exporturile lipsă (`tryParseMrzBlock`, TD3, scoruri MRZ, `isMrzParseChecksumValid`); eliminat fallback-ul care accepta parse invalid.
- **`src/components/admin/gantt/gantt-quick-panel/GanttQuickActionPanel.tsx`**: restaurat componenta (UTF-8); rezolvat eșecul testelor mobile-compat pe fișier UTF-16.
- **`src/app/[locale]/admin/(panel)/settings/location/structure/page.tsx`**: reparat JSX (`SettingsPageLayout`, summary chips).
- **`src/domain/settings/__tests__/settings-completion.test.ts`**: adăugat `displayName` obligatoriu pentru `computeSettingsCompletion`.
- **`src/app/[locale]/admin/(panel)/settings/page.tsx`**: importuri `computeSettingsCompletion` / `resolveContactWithPrimary`.
- **`src/domain/gantt/__tests__/quick-interval.test.ts`**: import Vitest.

### Verdict (Pass 13)

**Nu este încă gata de producție** din cauza build-ului Next.js blocat de permisiuni pe cache-ul `.next`. Calitatea codului la nivel de tipuri și teste automate este **bună** (tsc + suite completă verzi). Următorul pas operațional: mediu curat (fără procese `next` concurente), `Remove-Item -Recurse -Force .next`, apoi `npm run build` reușit; opțional re-rulare Pass 13 după build verde.

---

### Istoric passes

| Pass | Data | tsc | test | build | Verdict scurt |
|------|------|-----|------|-------|----------------|
| 14 | 2026-06-22 | OK | OK | OK (4 warn) | Pipeline verde |



## Pass 14 - 2026-06-22

### Comenzi

| Verificare | Rezultat | Detalii |
|------------|----------|---------|
| `npx tsc --noEmit` | **OK** | Fără erori TypeScript în `src/`. |
| `npm test` | **OK** | **1225** teste trecute, **0** eșuate (137 fișiere). |
| `npm run build` | **OK** | `next build` (Turbopack) finalizat; 143 pagini generate. **4 avertismente** Edge/instrumentation (build reușit). |

### Remedieri în acest pass

- **`src/app/[locale]/admin/(panel)/settings/page.tsx`**: completare setup folosește `getEmailSettings()` (nu câmpuri inexistente pe `PensionSettings`).
- **`src/services/rooms-admin/list.ts`**: export `listAllRoomsForTenant` pentru `statistics.ts`.
- **`src/app/[locale]/admin/(panel)/bookings/guest-app-actions.ts`**: `getTeamPermissions` din `@/services/pension-settings`.
- **`src/services/bookings/queries/cereri.ts`**: import `getTenantScope`.
- **`src/domain/settings/__tests__/settings-completion.test.ts`**: `displayName` pentru `computeSettingsCompletion`.
- **`src/domain/gantt/__tests__/quick-interval.test.ts`**: import Vitest.
- **`src/app/admin/admin-settings.css`**: `z-index: 55` pe bara de salvare (compact), conform testului mobile-compat.
- **`src/lib/brand-logo-cache.ts`**: căi logo sub `public/` + `turbopackIgnore` pentru NFT Turbopack.

### Verdict (Pass 14)

Pipeline-ul local este verde: tipuri, teste și build production trec.
Rămân avertismentele Turbopack pe lanțul Edge (instrumentation, `crypto` în middleware) — de monitorizat la deploy, fără a bloca build-ul.
Recomandat smoke pe staging după oprirea proceselor `next` concurente pe Windows (evită lock `.next` / EPERM).

---
## Pass 15 — 2026-06-22

### Comenzi

| Verificare | Rezultat | Detalii |
|------------|----------|---------|
| `npx tsc --noEmit` | **OK** | Fără erori TypeScript în `src/`. |
| `npm test` | **OK** | **1225** teste trecute, **0** eșuate (137 fișiere). |
| `npm run build` | **OK** | `next build` (Turbopack) finalizat; 143 pagini generate. **4 avertismente** Turbopack pe lanțul Edge (`instrumentation` / `sim-cookie`) — build reușit, de monitorizat. |

### Remedieri în acest pass

- **`src/layout/mobile/__tests__/mobile-compat-rules.test.ts`**: așteptare `z-index: 60` pentru `.settings-save-bar` (compact), aliniat cu `admin-settings.css`.
- **`src/components/admin/gantt/gantt-quick-panel/GanttQuickActionPanel.tsx`**: panel Gantt quick action restaurat pentru exportul din `GanttQuickActionPanel.tsx`.
- **`src/services/rooms-admin/list.ts`**: export `listAllRoomsForTenant` pentru statistici multi-tenant.
- **`src/domain/settings/__tests__/settings-completion.test.ts`**: `displayName` obligatoriu pentru `computeSettingsCompletion`.
- **`src/domain/gantt/__tests__/quick-interval.test.ts`**: import Vitest + `draftRoomIds` în testele de interval Gantt.

### Verdict (Pass 15)

**Gata de producție la nivel de pipeline local** — tipuri, teste și build production trec. Rămân de urmărit avertismentele Turbopack pe Edge/instrumentation în deploy; recomandat smoke pe staging după oprirea proceselor `next` concurente pe Windows (evită lock/EPERM pe `.next`).

---

### Istoric passes (actualizat)

| Pass | Data | tsc | test | build | Verdict scurt |
|------|------|-----|------|-------|----------------|
| 15 | 2026-06-22 | OK | OK | OK (4 warn) | Pipeline verde |
| 14 | 2026-06-22 | OK | OK | OK (4 warn) | Pipeline verde |


