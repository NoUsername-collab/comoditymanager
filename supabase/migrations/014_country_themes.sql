-- Teme țări: România, Italia, Franța, Polonia, Spania

alter table public.pension_settings
  drop constraint if exists pension_settings_admin_palette_key_check;

alter table public.pension_settings
  add constraint pension_settings_admin_palette_key_check
  check (
    admin_palette_key in (
      'default',
      'win95',
      'winxp',
      'romania',
      'italy',
      'france',
      'poland',
      'spain'
    )
  );

comment on column public.pension_settings.admin_palette_key is
  'Temă admin: default, win95, winxp, romania, italy, france, poland, spain';
