# Tenant isolation (bulletproof rules)

## Production

1. **Tenant is resolved only from the request host** (`x-tenant-slug`, `x-tenant-domain`, or parsed `Host`). There is **no** fallback to “first tenant in database”.
2. **Admin data** uses `getTenantScope()` → `requireTenantIdForData()` + **active `tenant_members` row** for the logged-in user.
3. **Public calendar** uses `getTenantPublicScope()` → host tenant only, no staff login.
4. **Emails / display names** always receive an explicit `tenantId` from `requireTenantIdForData()` — never `getDefaultTenant()`.
5. **`bindTenantContextFromRequest()`** must run in layouts; failures are not swallowed.

## Local development

Set in `.env.local`:

```env
DEV_TENANT_SLUG=your-pension-slug
```

Use the same slug as in Supabase `tenants.slug`. Without it, only `DEV_FALLBACK_TENANT` (`__dev__`) is used when the host is plain `localhost`.

## Key modules

| Module | Role |
|--------|------|
| `lib/tenant/guards.ts` | `requireTenantIdForData()` — single ID source |
| `lib/tenant/scope.ts` | Staff vs public Supabase scope |
| `lib/tenant/bind-request-context.ts` | Plan gates / feature context |
| `proxy.ts` | Injects tenant headers on tenant hosts |

## Errors (user-facing via `formatAdminError`)

- `auth.tenant_host_required` — wrong URL (not on property subdomain)
- `auth.tenant_member_required` — logged in but not a member of this property
- `auth.tenant_scope_mismatch` — internal tenant ID mismatch (should not happen after fixes)
