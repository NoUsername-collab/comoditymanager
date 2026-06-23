# Pregătire producție — Hospira / pensiune (Casa Emil)

**Ultima verificare:** 22 iunie 2026 (Pass 12) — **Pass 11**  
**Verdict:** **CU CONDIȚII** — aplicația e funcțională pentru recepție, dar go-live-ul necesită pași manuali (infra + configurare).

## Rezultate verificare automată

| Verificare | Rezultat |
|------------|----------|
| `npx tsc --noEmit` | ✅ OK |
| `npm test` | ✅ 1225/1225 teste |
| `npm run build` | ✅ OK (4 avertismente Edge Runtime — nu blochează deploy) |

## Verdict pentru owner (non-programator)

**CU CONDIȚII** — Poți folosi aplicația la recepție după ce completezi checklist-ul de mai jos (Vercel, DNS, email, conturi staff, MFA recomandat).

---

## Ce poate face operatorul FĂRĂ programator

Din panoul admin pe **domeniul pensiunii** (`casaemil.ro` sau subdomeniu tenant):

### Zilnic la recepție
- **Calendar Gantt** — vezi ocuparea, mută rezervări, creează hold/blocări/cereri/stay direct
- **Cazări** — lista sejururilor active, check-in / check-out, istoric
- **Rezervări** — confirmă cereri noi de pe site, anulează, detalii oaspete
- **Disponibilitate** — calendar săptămânal/lunar, verifică locuri libere
- **Oaspeți** — fișe clienți, note, scanare CI/pașaport (MRZ), rebook
- **Recepție rapidă** — flux scurt pentru sosiri

### Setări (parțial — depinde de rol)
- **Operator:** temă personală, notificări locale, unele setări operaționale dacă owner-ul le permite în **Permisiuni echipă**
- **Admin / Owner:** tot restul — site public, email, fiscal, staff, domenii, MFA, identitate pensiune

### Site public (fără login)
- Pagină pensiune, calendar rezervări online, confirmare cerere
- **Guest app** — link stay pentru oaspeți (`/stay/[code]`)

### Ce NU face operatorul singur
- Deploy pe server, DNS, chei API (Supabase, Resend, Vercel)
- Crearea inițială a conturilor în Supabase Auth
- Migrări bază de date
- Acces **Hospira platform admin** (`/hospira-admin`) — doar echipa platformă

---

## Checklist GO-LIVE (manual, înainte de producție)

### 1. Supabase
- [ ] Rulează toate migrările SQL din `supabase/migrations/` (inclusiv `085_revert_platform_domains_to_hospira.sql`)
- [ ] Notează `NEXT_PUBLIC_SUPABASE_URL`, `anon key`, `service_role key`
- [ ] Verifică `tenant_domains`: subdomeniu + domeniu custom (ex. `casa-emil.hospira.ro`, `casaemil.ro`)

### 2. Conturi staff (o singură dată, local)
```bash
cp .env.example .env.local
# completează Supabase + emailuri staff
npm run env:check:setup
npm run setup-staff
```
- [ ] Admin și Operator — emailuri **diferite** în Supabase Auth
- [ ] Șterge `ADMIN_INITIAL_PASSWORD` din `.env` după setup

### 3. Vercel — Environment Variables (Production)
| Variabilă | Obligatoriu |
|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Da |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Da |
| `SUPABASE_SERVICE_ROLE_KEY` | Da (Secret) |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | Da (ex. `hospira.ro`) |
| `NEXT_PUBLIC_SITE_URL` | Da |
| `HOSPIRA_ADMIN_EMAILS` | Pentru `/hospira-admin` |
| `ADMIN_EMAIL` / `OPERATOR_EMAIL` | Legacy tenant Casa Emil |
| `ADMIN_LOCATION_UNLOCK_SECRET` | Recomandat (`npm run env:secret`) |
| `RESEND_API_KEY` | Pentru emailuri (Secret) |
| `CRON_SECRET` | Cron backup + rezumat zilnic |

**Interzis pe Production:** `ADMIN_INITIAL_PASSWORD`, `ADMIN_FACTORY_RESET_ENABLED=true`

Detalii: [docs/vercel-env.md](./vercel-env.md)

### 4. DNS
- [ ] `hospira.ro` + `*.hospira.ro` → Vercel
- [ ] `casaemil.ro` + `www` → Vercel

### 5. Resend (email)
- [ ] Verifică domeniile `hospira.ro` și `casaemil.ro`
- [ ] Setează expeditor/reply-to în **Setări → Email** (admin tenant)
- [ ] Trimite email test după deploy
- [ ] **Redeploy** după ce adaugi `RESEND_API_KEY`

### 6. MFA (recomandat)
- [ ] Owner/Admin: **Setări → Securitate** sau `/admin/security/mfa`
- [ ] Activează MFA pe conturile cu acces la date sensibile

### 7. Configurare pensiune (din admin, fără cod)
- [ ] **Setări → Identitate** — nume, contact
- [ ] **Setări → Site public** — publică site-ul, galerie, hero
- [ ] **Setări → Check-in** — ore implicite, reguli
- [ ] **Setări → Email** — notificări, rezumat zilnic
- [ ] Urmează indicatorii **Setup issues** (roata din meniu) până dispar avertismentele

### 8. Verificare post-deploy
- [ ] `https://casaemil.ro` — site public
- [ ] Login operator pe domeniul tenant (nu pe apex `hospira.ro`)
- [ ] Gantt + o rezervare test
- [ ] Cerere de pe site → apare în admin
- [ ] Email test din setări

---

## Test 10 minute pe telefon

1. **Deschide** `https://casaemil.ro/admin/login` (bookmark).
2. **Loghează-te** ca Operator.
3. **Acasă** — vezi pensiunea, sosiri/plecări azi.
4. **Calendar** — glisează pe o cameră; deschide acțiune rapidă (hold sau cerere).
5. **Cazări** — deschide un sejur; verifică butoanele check-in.
6. **Meniul de jos** (mobil) — navighează între Acasă, Calendar, Cazări, Mai mult.
7. **Setări** — deschide pagina; bara de salvare rămâne vizibilă jos.
8. **Site public** (tab incognito) — calendar, trimite o cerere test.
9. **Înapoi în admin** — cererea apare la Rezervări/Cazări.
10. **Deconectare** — buton din colț.

---

## Comenzi utile (programator / setup inițial)

```bash
npm run env:check          # validează .env.local
npm run env:check:prod     # simulează reguli Vercel Production
npm run setup-staff        # creează Admin + Operator în Supabase
npm run setup-platform-admin
npx tsc --noEmit && npm test && npm run build
```

---

## Riscuri / limitări cunoscute

- Admin tenant trebuie deschis pe **domeniul pensiunii**, nu pe `hospira.ro` (apex platformă).
- Fără `RESEND_API_KEY`, emailurile nu pleacă (noop în dev).
- Scanarea MRZ (CI) poate necesita reîncercare la calitate OCR slabă.
- Build-ul afișează avertismente Edge pentru `crypto`/`process.on` — nu au blocat build-ul; monitorizare la deploy.


---

## Pass 11 (22 iunie 2026) — operatori non-tehnici

**Verdict CODE:** **READY FOR PRODUCTION** (neschimbat față de Pass 10). **DEPLOY / operator:** rămâne **CU CONDIȚII** (checklist manual mai jos).

| Poartă | Rezultat Pass 11 |
|--------|------------------|
| 
px tsc --noEmit | ✅ 0 erori |
| 
pm test | ✅ 1225/1225 |
| 
pm run build | ✅ OK (4 avertismente Edge — crypto / process.on) |

**Spot-check P0 UX:** fără regresii — mesaje RO, fără digest Next expus utilizatorului (doar cod suport opac unde e prevăzut).

**Remedieri în acest pass (fără commit):** test settings-completion rescris; listAllRoomsForTenant pentru statistici; settings-save-bar z-index 55 (compat mobil); test quick-interval vitest.
---

## Referințe

- [docs/vercel-env.md](./vercel-env.md) — variabile Vercel pas cu pas
- [docs/acces-staff.md](./acces-staff.md) — cum intră staff-ul
- [docs/mediul-test-live.md](./mediu-test-live.md) — staging vs producție
- [.env.example](../.env.example) — șablon variabile

---

## Pass 12 — 22 iunie 2026

### Checklist Pass 12

| Verificare | Pass 12 | Notă |
|------------|---------|------|
| `npx tsc --noEmit` | ✅ | Fără erori TypeScript |
| `npm test` | ✅ | 1225/1225 (Vitest) |
| `npm run build` | ✅ | Compilare + typecheck Next OK |

### Ce s-a reparat în Pass 12

- **`src/domain/guest/mrz-parse.ts`** — refăcute exporturile pentru checksum ICAO, TD3, `tryParseMrzBlock` și refinare candidați (testele MRZ/OCR trec din nou).
- **`src/domain/settings/__tests__/settings-completion.test.ts`** — corectată sintaxa stricată (`displayName` / șiruri corupte).
- **`src/domain/gantt/__tests__/quick-interval.test.ts`** — import Vitest duplicat eliminat.

### Verdict tehnic Pass 12

**GATA pentru continuarea checklist-ului de go-live** — porțile automate locale (tsc, teste, build) sunt verzi; deploy-ul rămâne condiționat de pașii manuali din checklist (Vercel, DNS, Resend, MFA).

