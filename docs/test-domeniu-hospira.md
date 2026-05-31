# HOSPIRA — Test pe domeniu (remote, fără localhost)

Scop: **alții testează de la distanță** — signup, login, admin pe URL-uri reale (`test.hospira.ro`, `pensiune-x.test.hospira.ro`).

**Nu folosi** `localhost` pentru testeri externi. Folosește **Supabase Cloud** + **Vercel** + **DNS**.

---

## Arhitectura (pe scurt)

```
Tester deschide:     https://test.hospira.ro/ro/signup
                              ↓
Signup creează:      tenant + user Auth + slug.test.hospira.ro în DB
                              ↓
Redirect automat:    https://SLUG.test.hospira.ro/admin/login?signup=1
                              ↓
Login → admin pensiune
```

| Componentă | Unde | De ce separat |
|------------|------|----------------|
| **App** | Vercel (`hospira-test` sau similar) | URL public HTTPS |
| **DB + Auth** | Supabase Cloud (proiect `hospira-test`) | Nu DB local |
| **DNS** | `test.hospira.ro` + `*.test.hospira.ro` | Platform + subdomenii tenant |

> **Alternativă:** dacă vrei direct pe `hospira.ro` (fără `test.`), înlocuiește peste tot `test.hospira.ro` cu `hospira.ro` și `*.hospira.ro`.

---

## PAS 1 — Proiect Supabase Cloud (NU local)

1. [supabase.com](https://supabase.com) → **New project**
2. Nume: `hospira-test`, regiune **EU (Frankfurt)** — aproape de RO/BG/MD
3. Așteaptă proiectul activ (~2 min)
4. **SQL Editor** → rulează migrările din repo, **în ordine numerică**:
   - `supabase/migrations/001_pension_core.sql`
   - `002` … până la `033_activity_undo.sql`
   
   **Shortcut dacă ai Supabase CLI:**
   ```powershell
   cd c:\Users\Administrator\Desktop\CasaEmil
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

5. **Settings → API** → copiază:
   - Project URL
   - `anon` key
   - `service_role` key (**secret** — doar server/Vercel)

---

## PAS 2 — Auth Supabase (obligatoriu pentru login remote)

**Authentication → URL configuration**

| Câmp | Valoare |
|------|---------|
| **Site URL** | `https://test.hospira.ro` |
| **Redirect URLs** (câte o linie) | `https://test.hospira.ro/**` |
| | `https://*.test.hospira.ro/**` |

Fără wildcard `*.test.hospira.ro`, login-ul pe subdomeniul pensiunii **pică** după signup.

**Authentication → Providers → Email:** Enabled, confirm email poate fi OFF pentru test rapid.

---

## PAS 3 — Fișier env staging (pe PC-ul tău)

```powershell
cd c:\Users\Administrator\Desktop\CasaEmil
Copy-Item .env.staging.example .env.staging.local
```

Completează `.env.staging.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# DOMENIU TEST (important!)
NEXT_PUBLIC_PLATFORM_DOMAIN=test.hospira.ro
NEXT_PUBLIC_SITE_URL=https://test.hospira.ro

ADMIN_EMAIL=admin@test.hospira.ro
OPERATOR_EMAIL=operator@test.hospira.ro
NEXT_PUBLIC_PENSION_NAME=Hospira Test
```

Verifică:

```powershell
npm run env:check:staging
```

---

## PAS 4 — Deploy Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import repo GitHub
2. Nume proiect: `hospira-test`
3. **Settings → Environment Variables → Production** (toate din `.env.staging.local`):

| Variabilă | Obligatoriu signup |
|-----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ **fără asta signup = eroare generică** |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | ✅ `test.hospira.ro` |
| `NEXT_PUBLIC_SITE_URL` | ✅ `https://test.hospira.ro` |
| `ADMIN_EMAIL` | ✅ |
| `OPERATOR_EMAIL` | ✅ |

4. **Deploy** (push pe Git sau Redeploy manual)

---

## PAS 5 — DNS (domeniu real)

La registrar-ul domeniului `hospira.ro` (Cloudflare, etc.):

| Tip | Nume | Valoare |
|-----|------|---------|
| CNAME | `test` | `cname.vercel-dns.com` |
| CNAME | `*.test` | `cname.vercel-dns.com` |

În **Vercel → Project → Settings → Domains**, adaugă:

- `test.hospira.ro`
- `*.test.hospira.ro`

Așteaptă SSL verde (5–30 min).

> **Notă Vercel:** unele registrars cer A record pentru apex; pentru **test** subdomeniu, CNAME e suficient.

---

## PAS 6 — Verificare înainte să trimiți link-ul

Deschide tu (nu localhost):

| URL | Așteptat |
|-----|----------|
| `https://test.hospira.ro/ro/landing` | Pagină Hospira |
| `https://test.hospira.ro/ro/signup` | Formular creare cont |
| `https://test.hospira.ro/ro/preturi` | Prețuri |

**Test signup complet:**

1. Nume pensiune: `Pensiune Test Remote`
2. Email **nou** (ex. `tester+1@gmail.com`)
3. Parolă min. 8 caractere
4. Success → redirect la `https://XXXX.test.hospira.ro/admin/login?signup=1&email=...`
5. Login cu aceeași parolă → intră în admin

Dacă pică: Vercel → **Logs** (Functions) sau terminal local la deploy — caută `[SIGNUP] RPC error:`.

---

## PAS 7 — Ce trimiți testerilor (copy-paste)

```
HOSPIRA — test de la distanță

1. Deschide: https://test.hospira.ro/ro/signup
2. Creează pensiune (nume, email nou, parolă min. 8 caractere)
3. După înregistrare ești dus automat la login-ul pensiunii tale
4. Loghează-te cu emailul și parola alese

Pagină prețuri: https://test.hospira.ro/ro/preturi

Probleme? Trimite screenshot + ora exactă.
```

---

## Timezone (RO / MD / BG)

La signup, timezone-ul tenantului se setează automat după țară:

| Țară formular | Timezone salvat în DB |
|---------------|------------------------|
| RO | `Europe/Bucharest` |
| MD | `Europe/Chisinau` |
| BG | `Europe/Sofia` |

DB stochează UTC (`timestamptz`); afișarea folosește coloana `timezone` a fiecărei pensiuni.

---

## Erori frecvente (remote)

| Simptom | Cauză | Fix |
|---------|-------|-----|
| Signup „A apărut o eroare” | `SUPABASE_SERVICE_ROLE_KEY` lipsește pe Vercel | Pas 4 |
| Signup „A apărut o eroare” | DB: plan constraint / funcție veche | Migrări 030+ în SQL Editor |
| Redirect la `slug.test.hospira.ro` nu se încarcă | DNS `*.test` lipsește | Pas 5 |
| Login loop / auth fail | Redirect URLs Supabase incomplete | Pas 2 |
| `tenants_plan_id_check` la SQL | Constraint vechi | Migrarea 030 (DROP constraint înainte de UPDATE) |

---

## SQL Editor Cloud (link)

Supabase → proiectul tău → **SQL Editor**  
URL tip: `https://supabase.com/dashboard/project/YOUR_REF/sql/new`

**Nu** folosi SQL Editor local (`127.0.0.1:54323`) pentru test remote — testerii nu au acces la el.

---

## După test

1. Schimbă/șterge useri test din Supabase → Authentication
2. Opțional: pause proiect Supabase `hospira-test`
3. Vercel: păstrezi sau ștergi proiectul `hospira-test`
4. Producție = proiect Supabase **nou** + `hospira.ro` (fără `test.`) — nu promova DB-ul de test

---

## Checklist rapid

- [ ] Supabase Cloud `hospira-test` + migrări + recovery 01–06 → `signup_ready = YES`
- [ ] Auth URLs: `test.hospira.ro` + `*.test.hospira.ro/**`
- [ ] Vercel env: service_role + `NEXT_PUBLIC_PLATFORM_DOMAIN=test.hospira.ro`
- [ ] DNS: `test` + `*.test` → Vercel
- [ ] Tu ai testat signup pe `https://test.hospira.ro/ro/signup`
- [ ] Trimis link-ul testerilor (Pas 7)
