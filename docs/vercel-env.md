# Variabile Vercel — Casa Emil

Ghid pas cu pas pentru deploy **bulletproof** pe [Vercel](https://vercel.com).  
Proiect live: `comoditymanager.vercel.app`

## 1. Checklist rapid (Production)

În **Vercel → Project → Settings → Environment Variables**, setează pentru **Production**:

| Variabilă | Obligatoriu | Secret | Note |
|-----------|-------------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Nu | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Nu | Settings → API → anon |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Da** | service_role — niciodată în git |
| `ADMIN_EMAIL` | ✅ | Nu | Email cont Admin în Supabase Auth |
| `OPERATOR_EMAIL` | ✅ | Nu | Email cont Operator (diferit de Admin) |
| `ADMIN_LOCATION_UNLOCK_SECRET` | Recomandat | **Da** | `npm run env:secret` local, copiază valoarea |
| `NEXT_PUBLIC_PENSION_NAME` | Opțional | Nu | ex. `Casa Emil` |

### Interzis pe Production

| Variabilă | Motiv |
|-----------|--------|
| `ADMIN_INITIAL_PASSWORD` | Doar local la `npm run setup-staff` |
| `OPERATOR_INITIAL_PASSWORD` | Doar local la `npm run setup-staff` |
| `ADMIN_FACTORY_RESET_ENABLED=true` | Șterge toate datele — doar staging |

Build-ul **eșuează automat** dacă aceste reguli sunt încălcate (`prebuild` → `npm run env:check`).

## 2. Preview / Staging (Vercel Preview)

Pentru branch-uri de test, poți adăuga:

```
ADMIN_FACTORY_RESET_ENABLED=true
```

Totuși **nu** pune parole inițiale pe Vercel — conturile se creează o singură dată local:

```bash
cp .env.staging.example .env.staging.local
# completează valorile + parole inițiale
npm run env:check:setup:staging
npm run setup-staff:staging
```

## 3. Ordinea corectă (setup nou)

### A. Supabase

1. Rulează migrările SQL (`001` … `015`) în SQL Editor.
2. Notează URL + anon + service_role.

### B. Local (o singură dată)

```bash
cp .env.example .env.local
# completează Supabase + emailuri staff
# setează ADMIN_INITIAL_PASSWORD și OPERATOR_INITIAL_PASSWORD
npm run env:check:setup
npm run setup-staff
```

### C. Vercel

1. Adaugă variabilele din tabel (fără parole inițiale).
2. Generează secret unlock:
   ```bash
   npm run env:secret
   ```
3. Push → deploy; build rulează `env:check` automat.

### D. Verificare post-deploy

- Login **Operator** → Gantt, rezervări OK
- Setări → temă + sunet OK
- Setări → Administrare locație → parola **Admin** → clădiri/camere OK

## 4. Comenzi utile

| Comandă | Scop |
|---------|------|
| `npm run env:check` | Validează `.env.local` |
| `npm run env:check:staging` | Validează `.env.staging.local` |
| `npm run env:check:prod` | Simulează reguli producție |
| `npm run env:check:setup` | Verifică înainte de setup-staff |
| `npm run env:secret` | Generează `ADMIN_LOCATION_UNLOCK_SECRET` |
| `npm run setup-staff` | Creează conturi Admin + Operator în Supabase |

## 5. Validare automată

- **Build**: `prebuild` → `scripts/check-env.mjs`
- **Runtime server**: `src/instrumentation.ts` + `src/lib/env/server.ts` (Zod)
- **Middleware**: `src/lib/env/edge.ts` (Edge-safe)

## 6. Erori frecvente

**Build eșuează: `ADMIN_EMAIL și OPERATOR_EMAIL trebuie să fie diferite`**  
→ Două conturi Supabase Auth separate, emailuri diferite.

**Build eșuează: `SUPABASE_SERVICE_ROLE_KEY` lipsește**  
→ Adaugă în Vercel Environment Variables (Production + Preview dacă folosești preview).

**Login OK dar „Cont neautorizat”**  
→ Emailul contului Supabase nu match-uiește `ADMIN_EMAIL` / `OPERATOR_EMAIL` din Vercel.

**Unlock administrare locație nu merge**  
→ Parola introdusă trebuie să fie parola contului **Admin** din Supabase (nu Operator).

## 7. Securitate

- `service_role` și `ADMIN_LOCATION_UNLOCK_SECRET` — **Secret** în Vercel, rotire periodică dacă e compromis.
- Parole staff se schimbă din **Administrare locație → Conturi staff** (după unlock).
- Nu trimite `.env.local` sau chei în chat / GitHub.
