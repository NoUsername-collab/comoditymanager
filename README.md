# Zalmox

Multi-tenant property management system (PMS) for pensions and small hotels — Gantt calendar, check-in with MRZ/passport scanning, fiscal invoicing, guest stay app, public booking site, and platform admin.

**Stack:** Next.js 16 · React 19 · Supabase · TypeScript · Tailwind CSS 4 · Vitest

## Quick start (local dev)

```bash
cp .env.example .env.local
# Supabase keys + ZALMOX_ADMIN_EMAILS (see .env.example)

npm run env:check:setup
npm install
npm run setup-platform-admin   # once — platform admin account
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For tenant admin locally, set `DEV_TENANT_SLUG` in `.env.local` (see [docs/tenant-security.md](./docs/tenant-security.md)).

**Staff pe un tenant:** preferat signup (`/signup`) sau provision din `/platform-admin`. `npm run setup-staff` rămâne pentru legacy dev (vezi `.env.example`).

## Verify

```bash
npm run typecheck
npm test
npm run build
```

Baseline: **1,308+ tests**, strict TypeScript.

**CI:** GitHub Actions — `npm test`, `test:security`, `typecheck`, `build` on push/PR to `main` ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)).

## Project map

| Area | Route | Code |
|------|-------|------|
| Tenant admin (reception) | `/admin/*` | `src/components/admin/`, `src/styles/features/admin/` |
| Platform admin | `/platform-admin/*` | `src/components/platform-admin/`, `src/lib/platform-admin/` |
| Public site + booking | `/`, `/calendar` | `src/features/public-site/` |
| Guest stay app | `/stay/[code]` | `src/features/guest-app/` |
| Platform landing | `/landing`, `/signup` | `src/app/[locale]/(platform)/` |

**Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md) — layers, imports, CSS. Enforced by `import-boundaries.test.ts` and `css-boundaries.test.ts`.

## Documentation

**[docs/README.md](./docs/README.md)** — index.

| Doc | Audience |
|-----|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Engineers |
| [docs/PRODUCTION-READINESS.md](./docs/PRODUCTION-READINESS.md) | Smoke test + checklist tenant / infra |
| [docs/vercel-env.md](./docs/vercel-env.md) | Deploy — Vercel env |
| [docs/tenant-security.md](./docs/tenant-security.md) | Multi-tenant isolation |
| [docs/acces-staff.md](./docs/acces-staff.md) | Operators — login |
| [docs/DDD.md](./docs/DDD.md) | Domain boundaries |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm test` | Unit + architecture tests |
| `npm run test:e2e` | Playwright e2e |
| `npm run env:check` | Validate `.env.local` |
| `npm run setup-platform-admin` | Platform admin (Supabase Auth) |
| `npm run setup-staff` | Legacy dev — tenant admin + operator |

## License

Private — Zalmox.
