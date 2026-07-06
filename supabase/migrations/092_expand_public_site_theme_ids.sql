-- Expand public_site_settings.theme_id CHECK constraint to include pearl, slate, forest.
-- Migration 054 locked it to ('noir', 'alpine', 'mediterranean'); the public-site
-- theme picker now offers all 6 design themes (same catalog as admin_palette_key).

alter table public.public_site_settings
  drop constraint if exists public_site_settings_theme_id_check;

alter table public.public_site_settings
  add constraint public_site_settings_theme_id_check
  check (theme_id in ('noir', 'alpine', 'mediterranean', 'pearl', 'slate', 'forest'));
