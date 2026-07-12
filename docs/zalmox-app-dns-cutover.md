# Cutover DNS - zalmox.app (platforma)

**Status:** app-ul merge pe URL-ul actual; DNS la zalmox.app inca nefinalizat.

**Scop:** cand muti domeniul, urmeaza pasii in ordine si bifeaza testele.

## Arhitectura tinta

| Host | Rol |
|------|-----|
| zalmox.app (+ www) | Platforma: landing, signup, /platform-admin |
| {slug}.zalmox.app | Tenant: site, /admin, guest app |
| domeniu custom | Tenant cu domeniu propriu (optional) |

Signup dupa cutover: zalmox.app/signup -> redirect https://{slug}.zalmox.app/admin/login

---

## Pregatire

- [ ] Acces registrar/Cloudflare pentru zalmox.app
- [ ] Acces Vercel (proiect productie)
- [ ] Acces Supabase Auth URL config
- [ ] Acces Resend (daca @zalmox.app)
- [ ] Noteaza URL-ul actual (rollback)
- [ ] Commit/deploy recent

---

## Pas 1 - DNS

| Tip | Nume | Valoare |
|-----|------|---------|
| A sau CNAME | @ | conform Vercel |
| CNAME | www | cname.vercel-dns.com |
| CNAME | * | cname.vercel-dns.com |

Fara *.zalmox.app -> ERR_CONNECTION_CLOSED pe subdomenii tenant.

Cloudflare: SSL Full (strict) daca proxy activ.

---

## Pas 2 - Vercel Domains (Valid Configuration)

1. zalmox.app
2. www.zalmox.app
3. *.zalmox.app

---

## Pas 3 - Env Vercel (Production) + Redeploy

| Variabila | Valoare |
|-----------|---------|
| NEXT_PUBLIC_PLATFORM_DOMAIN | zalmox.app |
| NEXT_PUBLIC_SITE_URL | https://zalmox.app |
| ZALMOX_ADMIN_EMAILS | emailuri platform admin |

Optional tranzitie: NEXT_PUBLIC_PLATFORM_HOSTS=domenii-vechi,virgula

---

## Pas 4 - Supabase Auth

| Camp | Valoare |
|------|---------|
| Site URL | https://zalmox.app |
| Redirect URLs | https://zalmox.app/** |
| | https://*.zalmox.app/** |

Pastreaza URL-uri vechi temporar la cutover gradual.

---

## Pas 5 - DB (o data per proiect)

```sql
UPDATE public.platform_settings
SET value = 'zalmox.app'
WHERE key = 'tenant_domain_suffix';
```

Tenanti existenti - verifica tenant_domains (nu migreaza singur):

```sql
SELECT t.slug, td.domain, td.routing_kind
FROM tenants t
JOIN tenant_domains td ON td.tenant_id = t.id
ORDER BY t.slug;
```

---

## Pas 6 - Resend

- Verifica domeniu zalmox.app (SPF/DKIM)
- RESEND_MAIL_DOMAIN daca e cazul
- Redeploy + email test din Setari tenant

---

## Pas 7 - Redeploy

Dupa DNS valid + env + Supabase.

---

## Teste post-cutover (bifeaza)

### A. Infrastructura

| # | URL | Asteptat | OK |
|---|-----|----------|-----|
| A1 | https://zalmox.app | Landing | |
| A2 | https://www.zalmox.app | OK/redirect | |
| A3 | https://probe-test.zalmox.app | Raspuns HTTP, nu connection closed | |

### B. Platforma

| # | URL | OK |
|---|-----|-----|
| B1 | /ro/signup | |
| B2 | /platform-admin | |
| B3 | /platform-admin/tools - env OK | |

### C. Tenant nou

| # | OK |
|---|-----|
| C1 | Signup slug unic |
| C2 | Redirect la {slug}.zalmox.app/admin/login |
| C3 | Login owner |
| C4 | Site public + calendar |
| C5 | tenant_domains are subdomeniul corect |

### D. Tenant existent

| # | OK |
|---|-----|
| D1 | {slug}.zalmox.app/admin/login |
| D2 | Domeniu custom (daca exista) |
| D3 | Gantt + cerere publica |
| D4 | Magic link din platform-admin |

### E. Securitate

| # | OK |
|---|-----|
| E1 | /admin pe apex -> redirect sau mesaj host |
| E2 | Tenant suspendat -> /tenant-suspended |

### F. Email/cron

| # | OK |
|---|-----|
| F1 | Email test |
| F2 | Cron in Vercel logs |

---

## Teste automate (local)

```bash
npm run typecheck
npm test
npm run build
```

Relevante: host.test.ts, proxy-platform-admin.test.ts, platform-admin.test.ts

Viitor: Playwright BASE_URL=https://zalmox.app

---

## Troubleshooting

| Simptom | Fix |
|---------|-----|
| Connection closed pe {slug}.zalmox.app | DNS * + Vercel *.zalmox.app |
| Signup redirect pe alt domeniu | NEXT_PUBLIC_PLATFORM_DOMAIN + redeploy |
| Fara proprietate la login | DB pas 5 + Supabase redirects |
| Magic link host gresit | Supabase Redirect URLs |
| platform-admin -> landing | ZALMOX_ADMIN_EMAILS |

---

## Rollback

1. DNS vechi 2. Env vechi 3. Redeploy 4. Supabase URLs vechi

---

## Dupa stabilizare

- Scoate NEXT_PUBLIC_PLATFORM_HOSTS legacy
- Commit + CI GitHub
- Playwright smoke

---

## Referinte

- vercel-env.md
- PRODUCTION-READINESS.md
- test-domeniu-hospira.md
- platform-auth-tenant-link.md