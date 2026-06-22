# Lansare — toate variantele de domeniu

## Variantele disponibile la lansare

| Variantă | URL exemplu | Ce vede vizitatorul | Unde lucrează staff-ul |
|----------|-------------|---------------------|-------------------------|
| **1. Subdomeniu Nestio** | `pensiunea.nestio.ro` | Site + calendar + tot | Același URL `/admin` |
| **2. Custom — complet** | `www.pensiunea.ro` | Tot (site + calendar + admin) | Pe domeniul propriu |
| **3. Custom — public** | `www.pensiunea.ro` | Site + calendar | `pensiunea.nestio.ro/admin` |
| **4. Custom — brand** | `www.pensiunea.ro` | Doar homepage + legal | Calendar/admin pe subdomeniul Nestio |

**Toți** clienții au automat varianta **1** la signup.

Variantele **2–4** se adaugă din **Admin → Setări → Domenii** (plan Professional+).

## Plan → variante custom

| Plan | custom_full | custom_public | custom_brand |
|------|-------------|---------------|--------------|
| Free | — | — | — |
| Essential | — | ✓ | ✓ |
| Professional+ | ✓ | ✓ | ✓ |
| Business | ✓ | ✓ | ✓ |

## Infrastructură producție (obligatoriu)

1. Supabase nou + migrări `001` … `037`
2. `platform_settings.tenant_domain_suffix` = `nestio.ro`
3. Vercel: `nestio.ro`, `www`, `*.nestio.ro` + nameserver-e sau `_acme-challenge`
4. Pentru **fiecare** domeniu custom client: adaugat în **Vercel Domains** + CNAME la registrar

## Ce nu e încă automat

- Adăugarea domeniului client în **Vercel** via API (pas manual sau viitor)
- Verificare DNS automată (acum: „Marchează verificat” după ce ai configurat DNS + Vercel)
