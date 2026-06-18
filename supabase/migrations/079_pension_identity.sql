-- 079 — Central pension identity (display + contact) with optional channel overrides.

alter table public.pension_settings
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists contact_whatsapp text,
  add column if not exists contact_telegram text,
  add column if not exists contact_facebook text,
  add column if not exists contact_instagram text;

alter table public.public_site_settings
  add column if not exists use_primary_contact boolean not null default true;

alter table public.guest_app_settings
  add column if not exists use_primary_contact boolean not null default true;

comment on column public.pension_settings.contact_email is
  'Primary public contact email for site, guest app, and transactional identity.';
comment on column public.public_site_settings.use_primary_contact is
  'When true, public site contact fields fall back to pension_settings contact.';
comment on column public.guest_app_settings.use_primary_contact is
  'When true, guest app hotel contact falls back to pension_settings contact.';
