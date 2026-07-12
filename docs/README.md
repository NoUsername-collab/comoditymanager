# Documentation index

Onboarding for **Zalmox** (platformă multi-tenant). Start: [README](../README.md) → [ARCHITECTURE](../ARCHITECTURE.md).

## Engineer
- [tenant-security.md](./tenant-security.md) — izolare tenant, `DEV_TENANT_SLUG`
- [DDD.md](./DDD.md) — limite domain
- `npm test` — include import/CSS boundary audits

## Operare (live sau tenant nou)
- [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) — **smoke test** + checklist infra
- [zalmox-app-dns-cutover.md](./zalmox-app-dns-cutover.md) — **DNS `zalmox.app`** + teste post-migrare (când ești deblocat)
- [vercel-env.md](./vercel-env.md) — variabile Vercel
- [acces-staff.md](./acces-staff.md) — login staff pe domeniul pensiunii

## Legacy names (în tranziție)
- `HOSPIRA_ADMIN_EMAILS` → `ZALMOX_ADMIN_EMAILS`
- `/hospira-admin` → `/platform-admin`
- `ADMIN_EMAIL` / `setup-staff` → doar dev legacy; producție = `tenant_members` + signup/provision
