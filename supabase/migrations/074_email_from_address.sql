-- Allow admin to customize the email sender name and address.

alter table public.pension_settings
  add column if not exists email_from_name text,
  add column if not exists email_from_address text;

comment on column public.pension_settings.email_from_name is
  'Numele expeditorului (ex: "Casa Emil"). Fallback: display_name.';
comment on column public.pension_settings.email_from_address is
  'Adresa expeditorului (ex: "contact@hospira.ro"). Fallback: noreply@domain.';
