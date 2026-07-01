-- Expand admin_palette_key CHECK constraint to include new themes: pearl, slate, forest.
-- Migration 068 locked the constraint to ('noir', 'alpine', 'mediterranean').
-- The app now also ships 'pearl', 'slate', 'forest' and writing them violates the constraint.

alter table public.pension_settings
  drop constraint if exists pension_settings_admin_palette_key_check;

alter table public.pension_settings
  add constraint pension_settings_admin_palette_key_check
  check (admin_palette_key in ('noir', 'alpine', 'mediterranean', 'pearl', 'slate', 'forest'));
