-- Block check-out when stay is unpaid (owner setting)
alter table public.pension_settings
  add column if not exists checkout_block_unpaid boolean not null default true;
