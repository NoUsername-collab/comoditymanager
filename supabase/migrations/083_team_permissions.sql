-- Per-tenant staff permission toggles (admin vs operator) configured by owner.
alter table public.pension_settings
  add column if not exists team_permissions jsonb not null default '{
    "admin": {
      "reception_ops": true,
      "booking_management": true,
      "pension_settings": true,
      "location_structure": true,
      "team_admin": true,
      "reports_tools": false
    },
    "operator": {
      "reception_ops": true,
      "booking_management": false,
      "pension_settings": false,
      "location_structure": false,
      "team_admin": false,
      "reports_tools": false
    }
  }'::jsonb;

comment on column public.pension_settings.team_permissions is
  'Owner-configured permission groups for admin and operator staff; owner always has full access';
