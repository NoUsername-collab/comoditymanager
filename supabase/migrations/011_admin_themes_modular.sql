-- Teme admin modulare: doar default | win95 | winxp (+ catalog)
-- Ordine: drop constraints → migrare date → add constraints

alter table public.pension_settings
  drop constraint if exists pension_settings_admin_palette_source_check;

alter table public.pension_settings
  drop constraint if exists pension_settings_admin_palette_key_check;

-- Migrare înainte de CHECK (rânduri vechi: pension, minimal, sezoane, cyberpunk, etc.)
update public.pension_settings
set
  admin_palette_source = 'catalog',
  admin_palette_key = case
    when admin_palette_key = 'win95' then 'win95'
    when admin_palette_key in ('winxp', 'win98') then 'winxp'
    when admin_palette_key in ('default', 'win95', 'winxp') then admin_palette_key
    else 'default'
  end;

alter table public.pension_settings
  add constraint pension_settings_admin_palette_source_check
  check (admin_palette_source = 'catalog');

alter table public.pension_settings
  add constraint pension_settings_admin_palette_key_check
  check (admin_palette_key in ('default', 'win95', 'winxp'));

alter table public.pension_settings
  alter column admin_palette_key set default 'default';

comment on column public.pension_settings.admin_palette_source is
  'Sursă temă: catalog (fix)';

comment on column public.pension_settings.admin_palette_key is
  'Temă: default | win95 | winxp';
