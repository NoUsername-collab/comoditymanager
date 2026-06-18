-- Add optional weather coordinates to pension_settings.
-- Used by the guest app weather widget (Open-Meteo API).

alter table public.pension_settings
  add column if not exists weather_lat double precision,
  add column if not exists weather_lng double precision;

comment on column public.pension_settings.weather_lat is
  'Latitudine pentru widget-ul meteo din guest app.';
comment on column public.pension_settings.weather_lng is
  'Longitudine pentru widget-ul meteo din guest app.';
