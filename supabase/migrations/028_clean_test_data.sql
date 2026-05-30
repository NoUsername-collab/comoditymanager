-- =============================================================================
-- 028 — Clean test data for production launch
--
-- Removes all test/demo data while preserving:
--   - Schema structure (tables, functions, triggers, RLS)
--   - Tenant "Casa Emil" (first real client)
--   - Room type & option definitions (catalog)
--   - Pension settings
--   - Buildings, floors, rooms structure
--
-- SAFE TO RUN: idempotent, only deletes operational data.
-- =============================================================================

-- ─── 1. Delete operational data (order matters for FK constraints) ──

-- Booking-related (most dependent first)
delete from public.booking_room_segments;
delete from public.booking_rooms;
delete from public.room_holds;
delete from public.room_blocks;
delete from public.bookings;

-- Guest data
delete from public.guest_stay_reviews;
delete from public.guest_profiles;
delete from public.guests;

-- Logs
delete from public.admin_activity_log;
delete from public.dev_logs;

-- ─── 2. Preserve structure ─────────────────────────────────────────
-- Buildings, floors, rooms → KEEP (owner configured these)
-- Pension settings → KEEP
-- Room type/option definitions → KEEP
-- Tenants → KEEP
-- Tenant members → KEEP
-- Tenant domains → KEEP

-- ─── 3. Update pension name to Hospira branding ────────────────────
-- (Optional: uncomment if you want to rebrand Casa Emil)
-- update public.pension_settings
--   set display_name = 'Casa Emil'
--   where display_name like '%Casa Emil%';

-- ─── 4. Reset sequences if any ─────────────────────────────────────
-- No serial sequences used (all UUID), so nothing to reset.

-- =============================================================================
-- Done. Database is clean for production.
-- Tenants, buildings, rooms, and settings are preserved.
-- =============================================================================
