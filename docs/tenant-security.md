# Multi-tenant security (Hospira)

## Layers

1. **Host routing** — `x-tenant-slug` / domain → `getActiveTenantIdForData()`
2. **Staff membership** — `assertStaffTenantAccess()` on every `getTenantScope()` call (tenant hosts only)
3. **Query filters** — `.eq("tenant_id", tenantId)` in services
4. **RLS** — `tenant_row_visible()` requires JWT `app_metadata.tenant_id` + active `tenant_members` row
5. **RPC guards** — e.g. `confirm_booking_with_rooms(..., p_tenant_id)` must match booking tenant
6. **Triggers** — `reject_tenant_id_change` blocks moving rows between tenants

## Migrations (run in order)

- `045_tenant_rls_bulletproof.sql`
- `046_rpc_and_session_tenant_guards.sql`

## After deploy

Admin panel binds JWT tenant on load via `StaffTenantSessionBinder` → `bind_auth_tenant_for_host`.

Service-role server code still bypasses RLS; never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

## Verify

```sql
-- As authenticated user with tenant A claim: must not see tenant B bookings
select count(*) from public.bookings;
```
