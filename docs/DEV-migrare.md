# Dev acum → Producție client (când răspunde PFA)

## Acum (fără client)

| Ce | Unde |
|----|------|
| Supabase | **Contul tău personal** — proiect `casa-emil-dev` |
| Test live 2+ săpt. | Proiect separat + Vercel staging — vezi **`mediu-test-live.md`** |
| Email | Nu e nevoie pentru SQL / UI local |
| Domeniu | `casaemil.ro` stă — DNS/email când vrea clientul |
| Date în DB | Test + structură; poți șterge tot și reimporta |

## Când clientul e OK

1. **Supabase nou** (recomandat) pe `admin@casaemil.ro` — proiect gol, migrări 001–005, **fără** date din staging/dev.
2. **Zoho** 2 useri: `admin@`, `contact@`.
3. **Vercel prod** (sau Cloudflare Pages) pe `casaemil.ro` → env vars = chei proiect **prod** (nu staging).
4. **Auth** Supabase prod: Site URL `https://casaemil.ro`.
5. **Legal:** `docs/sabloane-legal-v01.md` înainte de trafic public.
6. **Închide staging** (opțional): ștergi proiect Vercel `casa-emil-staging` + parolă — vezi `mediu-test-live.md` secțiunea „După test”.

## Ce NU refactorăm la migrare

- Codul (`domain/`, `services/`) — același
- `supabase/migrations/` — rulezi pe proiect nou
- Foldere app — neschimbate

## Rulează local

```bash
cp .env.example .env.local
# completează cheile Supabase DEV
npm run dev
```
