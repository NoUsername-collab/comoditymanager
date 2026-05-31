# HOSPIRA — Staging pe domeniu (setup profesional)

Mediu: **Supabase Cloud** + **Vercel** + **DNS** — fără localhost.

**Staging Supabase (o singură dată, după migrări):**
```sql
UPDATE public.platform_settings
SET value = 'test.hospira.ro'
WHERE key = 'tenant_domain_suffix';
```
Aceasta e config per proiect — nu per pensiune. Orice signup nou creează automat `{slug}.test.hospira.ro`.

---

## Arhitectura

| Host | Rol |
|------|-----|
| `test.hospira.ro` | Platformă: landing, signup, prețuri |
| `{slug}.test.hospira.ro` | Tenant: admin, calendar, recepție |

Flux:

```
Signup pe test.hospira.ro
  → creează tenant + auth user + domeniu slug.test.hospira.ro în DB
  → redirect la https://{slug}.test.hospira.ro/admin/login
  → login → dashboard pensiune
```

---

## PAS 1 — Supabase (proiect staging)

1. Proiect separat (ex. `vzmhosadzhopixkfhkkv`)
2. Rulează migrările din `supabase/migrations/` **în ordine numerică**
3. Obligatoriu inclusiv:
   - `034_catalog_slug_per_tenant.sql`
   - `035_tenant_platform_domain.sql`
   - `036_platform_settings.sql`

4. **O singură dată pe staging** (config proiect, nu pensiune):
```sql
UPDATE public.platform_settings
SET value = 'test.hospira.ro'
WHERE key = 'tenant_domain_suffix';
```

**Authentication → URL configuration**

| Câmp | Valoare |
|------|---------|
| Site URL | `https://test.hospira.ro` |
| Redirect URLs | `https://test.hospira.ro/**` |
| | `https://*.test.hospira.ro/**` |

---

## PAS 2 — Vercel (env + deploy)

**Environment Variables (Production):**

| Variabilă | Valoare |
|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL proiect staging |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (secret) |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | `test.hospira.ro` |
| `NEXT_PUBLIC_SITE_URL` | `https://test.hospira.ro` |

Deploy din GitHub (`main`).

---

## PAS 3 — DNS (registrar / Cloudflare)

La domeniul `hospira.ro`:

| Tip | Nume | Valoare | TTL |
|-----|------|---------|-----|
| CNAME | `test` | `cname.vercel-dns.com` | Auto |
| CNAME | `*.test` | `cname.vercel-dns.com` | Auto |

**Important:** `*.test` nu e același lucru cu `*.hospira.ro`. Staging folosește **`*.test.hospira.ro`**.

---

## PAS 4 — Vercel Domains (obligatoriu)

**Project → Settings → Domains** — adaugă ambele:

1. `test.hospira.ro`
2. `*.test.hospira.ro`

Așteaptă status **Valid Configuration** + SSL verde (5–30 min).

`*.hospira.ro` (fără `test`) e pentru **producție** — nu îl folosi pe staging.

---

## PAS 5 — Verificare (înainte de testeri)

| Test | URL | Așteptat |
|------|-----|----------|
| Platformă | `https://test.hospira.ro/ro/signup` | Formular signup |
| Wildcard SSL | `https://pensiunea-test.test.hospira.ro` | Pagină Hospira (404/login OK, **nu** connection closed) |
| Signup complet | signup → redirect | `https://{slug}.test.hospira.ro/admin/login` |
| Login | credențiale signup | Dashboard admin |

Dacă wildcard pică: Vercel Domains → `*.test.hospira.ro` lipsește sau DNS `*.test` CNAME lipsește.

---

## Erori frecvente

| Simptom | Cauză | Fix |
|---------|-------|-----|
| `ERR_CONNECTION_CLOSED` pe `{slug}.test.hospira.ro` | Wildcard DNS/Vercel lipsă | Pas 3 + 4 |
| Redirect la `{slug}.hospira.ro` (fără `test`) | `NEXT_PUBLIC_PLATFORM_DOMAIN` greșit | Setează `test.hospira.ro` + redeploy |
| Signup „email deja folosit” | Rămân rânduri în `tenant_members` | `DELETE FROM tenants;` (Auth gol) |
| Signup eroare catalog | Migrarea 034 neaplicată | SQL Editor → 034 |
| `*.hospira.ro` Invalid pe Vercel | Normal pe staging | Folosește `*.test.hospira.ro` |

---

## Producție (când e gata)

Mediu **nou** Supabase + Vercel:

- `NEXT_PUBLIC_PLATFORM_DOMAIN=hospira.ro`
- DNS: `hospira.ro`, `www`, `*.hospira.ro` → Vercel
- Vercel Domains: `hospira.ro`, `*.hospira.ro`
- Signup înregistrează `{slug}.hospira.ro` automat (migrarea 035)

Nu promova DB-ul de staging în producție.
