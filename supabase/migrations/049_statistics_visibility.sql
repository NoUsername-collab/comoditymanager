-- Cine poate vedea rapoartele statistice din panoul admin.
alter table public.pension_settings
  add column if not exists statistics_visibility text not null default 'owner'
    check (statistics_visibility in ('owner', 'admin', 'all'));

comment on column public.pension_settings.statistics_visibility is
  'owner = doar proprietar; admin = owner + admini; all = tot stafful';
