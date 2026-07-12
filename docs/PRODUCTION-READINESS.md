# Pregătire producție — Zalmox (platformă multi-tenant)

**Ultima verificare:** 8 iulie 2026  
**Context:** platforma și tenantii pot fi **deja live** — documentul servește la validare periodică, onboarding tenant nou și checklist infra.

**DNS `zalmox.app` încă în curs?** Când muți domeniul, urmează [zalmox-app-dns-cutover.md](./zalmox-app-dns-cutover.md) (checklist + serie de teste).

## Rezultate verificare automată (local)

| Verificare | Rezultat |
|------------|----------|
| GitHub Actions CI | `npm test` + `test:security` + `typecheck` + `build` (`.github/workflows/ci.yml`) |
| `npm run typecheck` | ✅ OK |
| `npm test` | ✅ 1,308+ teste |
| `npm run build` | ✅ OK |

Rulează local înainte de deploy: `npm test && npm run typecheck && npm run build`.

---

## Ce poate face operatorul FĂRĂ programator

Din panoul admin pe **domeniul pensiunii** (subdomeniu `{slug}.{platform}` sau domeniu custom din `tenant_domains`):

### Zilnic la recepție
- **Calendar Gantt** — ocupare, mutări, hold/blocări/cereri/stay
- **Cazări** — sejururi active, check-in / check-out, istoric
- **Rezervări** — confirmă cereri de pe site, anulează, detalii oaspete
- **Disponibilitate** — calendar săptămânal/lunar
- **Oaspeți** — fișe, note, scanare CI/pașaport (MRZ), rebook
- **Recepție rapidă** — flux scurt pentru sosiri

### Setări (depinde de rol)
- **Operator:** temă, notificări locale, setări permise în **Permisiuni echipă**
- **Admin / Owner:** site public, email, fiscal, staff, domenii, MFA, identitate pensiune

### Site public (fără login)
- Pagină pensiune, calendar rezervări, confirmare cerere
- **Guest app** — `/stay/[code]`

### Ce NU face operatorul singur
- Deploy, DNS, chei API (Supabase, Resend, Vercel)
- Crearea inițială a conturilor în Supabase Auth (prima dată)
- Migrări bază de date
- Acces **platform admin** (`/platform-admin`) — doar echipa Zalmox

---

## Smoke test — platformă live (≈10 min)

Folosește URL-urile reale ale tenantului tău (`{slug}`, domeniu custom dacă există).

| # | Verificare | OK? |
|---|------------|-----|
| 1 | Site public — homepage + calendar | ☐ |
| 2 | Cerere rezervare (incognito) → apare în admin | ☐ |
| 3 | Login staff pe **domeniul pensiunii** (nu pe apex platformă) | ☐ |
| 4 | Gantt — vizualizare + acțiune rapidă pe cameră | ☐ |
| 5 | Cazări — deschide sejur / check-in scurt | ☐ |
| 6 | Mobil — meniul de jos + setări (bara salvare) | ☐ |
| 7 | Email test din Setări → Email (dacă Resend e activ) | ☐ |
| 8 | `/platform-admin` — login cu email din `ZALMOX_ADMIN_EMAILS` | ☐ |
| 9 | Tenant suspendat (staging) → redirect `/tenant-suspended` | ☐ |

**Bookmark recomandat pentru recepție:** `https://{domeniu-tenant}/admin/login`

---

## Checklist — tenant nou sau infra nouă

### 1. Supabase
- [ ] Migrările din `supabase/migrations/` sunt aplicate
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, anon key, service_role key în Vercel
- [ ] Rând în `tenant_domains`: subdomeniu `{slug}.{platform}` + eventual domeniu custom

### 2. Conturi staff (prima dată per tenant)

**Preferat:** signup public sau **Provision tenant** din `/platform-admin` → owner în `tenant_members`.

**Legacy (script local, un singur tenant de dev):**
```bash
cp .env.example .env.local
npm run env:check:setup
npm run setup-staff   # folosește ADMIN_EMAIL / OPERATOR_EMAIL din .env
```
- [ ] Emailuri Admin și Operator **diferite** în Supabase Auth
- [ ] Șterge `ADMIN_INITIAL_PASSWORD` din `.env` după setup

### 3. Vercel — Environment Variables (Production)

| Variabilă | Obligatoriu |
|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Da |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Da |
| `SUPABASE_SERVICE_ROLE_KEY` | Da (Secret) |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | Da (apex platformă, ex. `zalmox.ro`) |
| `NEXT_PUBLIC_SITE_URL` | Da |
| `ZALMOX_ADMIN_EMAILS` | Pentru `/platform-admin` |
| `ADMIN_LOCATION_UNLOCK_SECRET` | Recomandat (`npm run env:secret`) |
| `RESEND_API_KEY` | Pentru emailuri (Secret) |
| `CRON_SECRET` | Cron backup + rezumat zilnic |

**Legacy (opțional):** `HOSPIRA_ADMIN_EMAILS`, `NESTIO_ADMIN_EMAILS`, `ADMIN_EMAIL` / `OPERATOR_EMAIL` — vezi [vercel-env.md](./vercel-env.md).

**Interzis pe Production:** `ADMIN_INITIAL_PASSWORD`, `ADMIN_FACTORY_RESET_ENABLED=true`

### 4. DNS
- [ ] Apex platformă + `*.{apex}` → Vercel (subdomenii tenant)
- [ ] Domeniu custom tenant (`pension.example.ro`, `www`) → Vercel

### 5. Resend (email)
- [ ] Domenii verificate (platformă + tenant dacă trimite de pe domeniu propriu)
- [ ] Expeditor/reply-to în **Setări → Email** (admin tenant)
- [ ] **Redeploy** după adăugarea `RESEND_API_KEY`

### 6. MFA (recomandat)
- [ ] Owner/Admin: **Setări → Securitate** sau `/admin/security/mfa`

### 7. Configurare pensiune (din admin)
- [ ] **Identitate**, **Site public**, **Check-in**, **Email**
- [ ] **Setup issues** (roata din meniu) — fără avertismente critice

---

## Comenzi utile (programator)

```bash
npm run env:check
npm run env:check:prod
npm run setup-platform-admin
npx tsc --noEmit && npm test && npm run build
```

---

## Riscuri / limitări cunoscute

- Admin tenant pe **domeniul pensiunii**, nu pe apex platformă
- Fără `RESEND_API_KEY`, emailurile sunt noop în dev
- MRZ/OCR poate necesita reîncercare la calitate slabă
- Tenant `suspended` / `cancelled` — blocat la edge (except login + pagina suspend)

---

## Referințe

- [docs/README.md](./README.md) — index documentație
- [vercel-env.md](./vercel-env.md) — variabile Vercel
- [acces-staff.md](./acces-staff.md) — acces staff
- [tenant-security.md](./tenant-security.md) — izolare tenant
- [.env.example](../.env.example) — șablon variabile
