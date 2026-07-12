# Variabile Vercel — Zalmox (platformă) + tenant

Ghid pentru deploy pe [Vercel](https://vercel.com).  
**Zalmox** = platforma SaaS (apex, landing, signup, `/platform-admin`).  
**Tenant** = o pensiune oarecare (subdomeniu `{slug}.{platform}` sau domeniu custom) — nu există un „tenant special” al proiectului.

> Dacă aplicația e deja live, folosește acest doc pentru audit env și onboarding tenant nou, nu ca presupunere de prim deploy.

## 1. Checklist rapid (Production)

În **Vercel → Project → Settings → Environment Variables**, setează pentru **Production**:

| Variabilă | Obligatoriu | Secret | Note |
|-----------|-------------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Nu | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Nu | Settings → API → anon |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Da** | service_role — niciodată în git |
| `ZALMOX_ADMIN_EMAILS` | Recomandat | Nu | Acces `/platform-admin` (virgulă). Legacy: `HOSPIRA_ADMIN_EMAILS`, `NESTIO_ADMIN_EMAILS` |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | Recomandat | Nu | Apex platformă (ex. `zalmox.ro`) |
| `NEXT_PUBLIC_SITE_URL` | Recomandat | Nu | ex. `https://zalmox.ro` |
| `ADMIN_EMAIL` | Legacy dev | Nu | Doar `npm run setup-staff` local — nu e necesar în prod multi-tenant |
| `OPERATOR_EMAIL` | Legacy dev | Nu | La fel |
| `ADMIN_LOCATION_UNLOCK_SECRET` | Recomandat | **Da** | `npm run env:secret` local, copiază valoarea |
| `NEXT_PUBLIC_PENSION_NAME` | Opțional | Nu | Fallback display name în dev |
| `RESEND_API_KEY` | Pentru email | **Da** | [Resend](https://resend.com) → API Keys (`re_...`) |
| `RESEND_MAIL_DOMAIN` | Opțional | Nu | Domeniu verificat Resend |
| `CRON_SECRET` | Pentru cron | **Da** | Vercel → `/api/cron/*` (backup, rezumat zilnic) |

**După `RESEND_API_KEY`:** Redeploy (Deployments → ⋯ → Redeploy).

### Interzis pe Production

| Variabilă | Motiv |
|-----------|--------|
| `ADMIN_INITIAL_PASSWORD` | Doar local la setup script |
| `OPERATOR_INITIAL_PASSWORD` | Doar local |
| `ADMIN_FACTORY_RESET_ENABLED=true` | Șterge date — doar staging |

Build-ul **eșuează** dacă regulile sunt încălcate (`prebuild` → `npm run env:check`).

## 2. Tipuri de email (nu le amesteca)

| Rol | Exemplu platformă | Exemplu tenant | Unde se configurează |
|-----|-------------------|----------------|----------------------|
| **Contact platformă** | `contact@zalmox.app` | — | cod / footer landing |
| **Auth platform admin** | `ops@zalmox.app` | — | `ZALMOX_ADMIN_EMAILS` (Vercel) |
| **Auth staff tenant** | — | `owner@pension.ro`, `receptie@pension.ro` | Supabase Auth + `tenant_members` |
| **Expeditor notificări** | `noreply@zalmox.ro` | `noreply@pension.ro` | Setări → Email (tenant); fallback `RESEND_MAIL_DOMAIN` |
| **Reply-to** | — | `contact@pension.ro` | Setări → Email sau contact site |
| **Destinatari notificări** | — | owner + admini activi | `tenants.owner_email` + `tenant_members` |

**Provider:** `RESEND_API_KEY` pe Vercel. Fără cheie → noop în dev.

## 3. Preview / Staging

```
NEXT_PUBLIC_PLATFORM_DOMAIN=test.hospira.ro   # sau domeniul tău de staging
NEXT_PUBLIC_SITE_URL=https://test.hospira.ro
```

Conturi staff pe staging: create local sau provision din platform-admin — **nu** pune parole inițiale pe Vercel.

## 4. Ordinea corectă (tenant nou)

### A. Supabase
1. Migrări SQL aplicate.
2. URL + anon + service_role în Vercel.
3. Tenant: signup, **Provision tenant** (`/platform-admin`) sau RPC `onboard_new_tenant`.
4. Verifică `tenant_domains` pentru slug + domenii custom.

### B. Staff (dacă nu vine din signup/provision)
```bash
cp .env.example .env.local
# Supabase + ZALMOX_ADMIN_EMAILS + ADMIN_EMAIL/OPERATOR_EMAIL (legacy dev)
npm run env:check:setup
npm run setup-staff
```

### C. Vercel + DNS
1. Variabile din tabel (fără parole inițiale pe Production).
2. `npm run env:secret` → `ADMIN_LOCATION_UNLOCK_SECRET`.
3. Resend — domenii verificate pentru platformă și tenant.
4. DNS: apex + wildcard tenant subdomains; CNAME/A pentru domeniu custom.
5. Push → deploy.

### D. Verificare post-deploy (înlocuiește placeholder-ele)

| URL | Așteptat |
|-----|----------|
| `https://{platform-apex}` | Landing Zalmox |
| `https://{slug}.{platform}` | Site public tenant |
| `https://{domeniu-custom}` | Site tenant (dacă configurat) |
| `https://{domeniu-tenant}/admin/login` | Login staff |
| `/platform-admin` | Panel operatori Zalmox |

Smoke complet: [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md).

## 5. Comenzi utile

| Comandă | Scop |
|---------|------|
| `npm run env:check` | Validează `.env.local` |
| `npm run env:check:prod` | Simulează reguli producție |
| `npm run env:check:setup` | Înainte de setup-staff |
| `npm run env:secret` | Generează `ADMIN_LOCATION_UNLOCK_SECRET` |
| `npm run setup-staff` | Legacy — Admin + Operator (dev) |
| `npm run setup-platform-admin` | Cont platform admin în Supabase Auth |

## 6. Validare automată

- **Build:** `prebuild` → `scripts/check-env.mjs`
- **Runtime:** `src/instrumentation.ts` + `src/lib/env/server.ts` (Zod)
- **Edge:** `src/lib/env/edge.ts`
- **CI:** `.github/workflows/ci.yml` — test + typecheck + build

## 7. Erori frecvente

**„Cont neautorizat” după login**  
→ Emailul nu e în `tenant_members` pentru tenantul de pe host, sau login pe apex în loc de domeniul pensiunii.

**`tenant_host_required`**  
→ Deschide admin pe domeniul pensiunii (`{slug}.{platform}` sau custom), nu pe apex.

**Email nu pleacă**  
→ `RESEND_API_KEY`, domeniu verificat Resend, redeploy după env.

**Tenant suspendat**  
→ Status în `/platform-admin` → redirect la `/tenant-suspended` (comportament așteptat).

## 8. Securitate

- `service_role`, `RESEND_API_KEY`, `ADMIN_LOCATION_UNLOCK_SECRET`, `CRON_SECRET` — **Secret** în Vercel.
- Parole staff: **Administrare locație → Conturi staff** (după unlock).
- Nu commita `.env.local` sau chei în git.
