-- Paletă admin + mod zi/noapte (setări pensiune)

alter table public.pension_settings
  add column if not exists admin_palette_source text not null default 'catalog'
    check (admin_palette_source in ('catalog', 'season_auto', 'season_manual'));

alter table public.pension_settings
  add column if not exists admin_palette_key text not null default 'pension';

alter table public.pension_settings
  add column if not exists admin_day_night text not null default 'night'
    check (admin_day_night in ('day', 'night'));

comment on column public.pension_settings.admin_palette_source is
  'catalog = una din 6 palete generale; season_auto = anotimp curent; season_manual = anotimp ales';

comment on column public.pension_settings.admin_palette_key is
  'ID paletă: pension|minimal|ocean|forest|rose|win95|win98|winxp|cyberpunk|victorian|medieval|newspaper sau spring|summer|autumn|winter';

comment on column public.pension_settings.admin_day_night is
  'Aspect zi sau noapte pentru paleta activă';
