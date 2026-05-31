# Platform auth ↔ tenant link (production)

## Problem

Supabase **Auth** (`auth.users`) and **tenant data** (`tenant_members`, `tenants.owner_id`) must share the same `user_id` (UUID).

If Auth users are deleted in the dashboard but tenant rows remain, or login runs on the platform host with broken RLS joins, owners see “no property linked” despite a valid email/password.

## Solution (no per-email SQL)

Migration **`038_platform_login_tenant_slug.sql`** — run **once** per Supabase project (staging + production):

| Piece | Role |
|-------|------|
| One-time `UPDATE` | Repairs **all** rows where email matches Auth but `user_id` / `owner_id` diverged |
| `sync_auth_user_tenant_memberships()` | On each login: relink current `auth.uid()` to rows with same email |
| `get_my_primary_tenant_slug()` | Returns slug (security definer, RLS-safe) |
| `prepare_platform_session()` | App calls this only: sync + slug in one RPC |
| `check_owner_email_for_signup()` | Signup: `available` / `login_required` / `stale_owner_row` |

App code: `getPrimaryTenantSlugForUser(supabase)` → `prepare_platform_session` only. No hardcoded emails, no manual UPDATE snippets.

## Deploy checklist

1. Supabase SQL Editor → paste full `supabase/migrations/038_platform_login_tenant_slug.sql` → Run.
2. Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_PLATFORM_DOMAIN`, redeploy.
3. Test: platform login → redirect to `{slug}.test.hospira.ro/admin`.

## Do not use

- `UPDATE ... WHERE email = 'one@user.com'` in production (one-off debug only).
- Deleting Auth users without cleaning `tenant_members` (causes stale rows; signup reports `stale_owner_row`).
