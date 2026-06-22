# Variabile Vercel — Hospira (platformă) + Casa Emil (tenant)

Ghid pas cu pas pentru deploy pe [Vercel](https://vercel.com).  
Platforma se numește **Hospira**; tenantul exemplu rămâne **Casa Emil** (`casaemil.ro`, slug `casa-emil`).

## 1. Checklist rapid (Production)

În **Vercel → Project → Settings → Environment Variables**, setează pentru **Production**:

| Variabilă | Obligatoriu | Secret | Note |
|-----------|-------------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Nu | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Nu | Settings → API → anon |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Da** | service_role — niciodată în git |
| `HOSPIRA_ADMIN_EMAILS` | Recomandat | Nu | Acces `/hospira-admin` (virgulă). Legacy: `NESTIO_ADMIN_EMAILS` |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | Recomandat | Nu | ex. `hospira.ro` |
| `NEXT_PUBLIC_SITE_URL` | Recomandat | Nu | ex. `https://hospira.ro` |
| `ADMIN_EMAIL` | Tenant legacy | Nu | Cont Admin Supabase (login `Admin`) — ex. Casa Emil |
| `OPERATOR_EMAIL` | Tenant legacy | Nu | Cont Operator — diferit de Admin |
| `ADMIN_LOCATION_UNLOCK_SECRET` | Recomandat | **Da** | `npm run env:secret` local, copiază valoarea |
| `NEXT_PUBLIC_PENSION_NAME` | Opțional | Nu | ex. `Casa Emil` |
| `RESEND_API_KEY` | Pentru email | **Da** | [Resend](https://resend.com) → API Keys (`re_...`) |
| `RESEND_MAIL_DOMAIN` | Opțional | Nu | Domeniu verificat Resend dacă diferă de `NEXT_PUBLIC_PLATFORM_DOMAIN` |
| `CRON_SECRET` | Pentru cron | **Da** | Vercel injectează pentru `/api/cron/*` (backup, rezumat zilnic) |

**După `RESEND_API_KEY`:** Redeploy (Deployments → ⋯ → Redeploy). Variabilele noi nu intră în deploy-ul vechi.

### Interzis pe Production

| Variabilă | Motiv |
|-----------|--------|
| `ADMIN_INITIAL_PASSWORD` | Doar local la `npm run setup-staff` |
| `OPERATOR_INITIAL_PASSWORD` | Doar local la `npm run setup-staff` |
| `ADMIN_FACTORY_RESET_ENABLED=true` | Șterge toate datele — doar staging |

Build-ul **eșuează automat** dacă aceste reguli sunt încălcate (`prebuild` → `npm run env:check`).

## 2. Tipuri de email (nu le amesteca)

| Rol | Exemplu Hospira | Exemplu Casa Emil | Unde se configurează |
|-----|-----------------|-------------------|----------------------|
| **Contact platformă** | `contact@hospira.ro` | — | `PLATFORM_CONTACT_EMAIL` în cod; footer landing |
| **Auth platform admin** | `ops@hospira.ro` | — | `HOSPIRA_ADMIN_EMAILS` (Vercel) — acces `/hospira-admin` |
| **Auth staff tenant** | — | `admin@casaemil.ro`, `operator@casaemil.ro` | Supabase Auth + `ADMIN_EMAIL` / `OPERATOR_EMAIL` (legacy) sau `tenant_members` |
| **Expeditor notificări** | `noreply@hospira.ro` sau domeniu tenant | `noreply@casaemil.ro` | Setări → Email în admin tenant; fallback `RESEND_MAIL_DOMAIN` |
| **Reply-to notificări** | — | `contact@casaemil.ro` | Setări → Email (`email_reply_to`) sau contact site public |
| **Destinatari notificări** | — | owner + admini activi | `tenants.owner_email` + `tenant_members` (rol owner/admin) |

**Provider trimitere:** `RESEND_API_KEY` pe Vercel (platform-wide). Fără cheie, emailurile sunt noop în dev.

**Rezumat zilnic:** cron `/api/cron/daily-summary` (05:00 UTC) — respectă `email_notify_daily_summary` din Setări → Email.

## 3. Preview / Staging (Vercel Preview)

Pentru branch-uri de test, poți adăuga:

```
NEXT_PUBLIC_PLATFORM_DOMAIN=test.hospira.ro
NEXT_PUBLIC_SITE_URL=https://test.hospira.ro
ADMIN_FACTORY_RESET_ENABLED=true
```

Totuși **nu** pune parole inițiale pe Vercel — conturile se creează o singură dată local:

```bash
cp .env.staging.example .env.staging.local
# completează valorile + parole inițiale
npm run env:check:setup:staging
npm run setup-staff:staging
```

## 4. Ordinea corectă (setup nou)

### A. Supabase

1. Rulează migrările SQL în SQL Editor (inclusiv `085_revert_platform_domains_to_hospira.sql`).
2. Notează URL + anon + service_role.
3. Verifică `tenant_domains`: `casa-emil.hospira.ro` + `casaemil.ro` pentru Casa Emil.

### B. Local (o singură dată)

```bash
cp .env.example .env.local
# completează Supabase + HOSPIRA_ADMIN_EMAILS + emailuri staff Casa Emil
npm run env:check:setup
npm run setup-staff
```

### C. Vercel + DNS

1. Adaugă variabilele din tabel (fără parole inițiale).
2. Generează secret unlock:
   ```bash
   npm run env:secret
   ```
3. Configurează Resend (domeniu `hospira.ro` + `casaemil.ro` pentru tenant).
4. DNS:
   - `hospira.ro` + `*.hospira.ro` → Vercel (platformă + subdomenii tenant)
   - `casaemil.ro` + `www.casaemil.ro` → Vercel (tenant custom)
5. Push → deploy; build rulează `env:check` automat.

### D. Verificare post-deploy

- `https://hospira.ro` → landing platformă
- `https://casa-emil.hospira.ro` sau `https://casaemil.ro` → site tenant Casa Emil
- Login **Operator** Casa Emil pe `casaemil.ro` → Gantt, rezervări OK
- Setări → Email → trimite email test
- `/hospira-admin` cu email din `HOSPIRA_ADMIN_EMAILS`

## 5. Comenzi utile

| Comandă | Scop |
|---------|------|
| `npm run env:check` | Validează `.env.local` |
| `npm run env:check:staging` | Validează `.env.staging.local` |
| `npm run env:check:prod` | Simulează reguli producție |
| `npm run env:check:setup` | Verifică înainte de setup-staff |
| `npm run env:secret` | Generează `ADMIN_LOCATION_UNLOCK_SECRET` |
| `npm run setup-staff` | Creează conturi Admin + Operator în Supabase |
| `npm run setup-platform-admin` | Creează cont platform admin în Supabase Auth |

## 6. Validare automată

- **Build**: `prebuild` → `scripts/check-env.mjs`
- **Runtime server**: `src/instrumentation.ts` + `src/lib/env/server.ts` (Zod)
- **Middleware**: `src/lib/env/edge.ts` (Edge-safe)
- **Resend**: opțional la build — citit la runtime din `lib/email/provider.ts`

## 7. Erori frecvente

**Build eșuează: `ADMIN_EMAIL și OPERATOR_EMAIL trebuie să fie diferite`**  
→ Două conturi Supabase Auth separate, emailuri diferite.

**Build eșuează: `SUPABASE_SERVICE_ROLE_KEY` lipsește**  
→ Adaugă în Vercel Environment Variables (Production + Preview dacă folosești preview).

**Login OK dar „Cont neautorizat”**  
→ Emailul contului Supabase nu match-uiește `ADMIN_EMAIL` / `OPERATOR_EMAIL` din Vercel.

**„Deschide aplicația pe subdomeniul pensiunii” (`tenant_host_required`)**  
→ Admin tenant trebuie deschis pe `casaemil.ro` sau `casa-emil.hospira.ro`, nu pe `hospira.ro` (apex platformă).

**Email test eșuează / nu pleacă nimic**  
→ Verifică `RESEND_API_KEY`, domeniu verificat în Resend, redeploy după setare env.

**Unlock administrare locație nu merge**  
→ Parola introdusă trebuie să fie parola contului **Admin** din Supabase (nu Operator).

## 8. Securitate

- `service_role`, `RESEND_API_KEY`, `ADMIN_LOCATION_UNLOCK_SECRET`, `CRON_SECRET` — **Secret** în Vercel.
- Parole staff se schimbă din **Administrare locație → Conturi staff** (după unlock).
- Nu trimite `.env.local` sau chei în chat / GitHub.
