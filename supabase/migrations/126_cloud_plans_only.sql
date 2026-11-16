-- 126 — Zalmox sells four cloud plans only.
--
-- Migration 030 also allowed "local_*" and "hybrid_*" plans for installs that
-- were never built. The app no longer knows them (an unknown plan is treated
-- as Basic), so a property still stored on one moves to the cloud plan of the
-- same level first, and the database then accepts only the four cloud plans.

update public.tenants
set plan_id = case
    when plan_id like '%\_essential' escape '\' then 'essential'
    when plan_id like '%\_professional' escape '\' then 'professional'
    when plan_id like '%\_business' escape '\' then 'business'
    else plan_id
  end,
  updated_at = now()
where plan_id like 'local\_%' escape '\' or plan_id like 'hybrid\_%' escape '\';

alter table public.tenants drop constraint if exists tenants_plan_id_check;
alter table public.tenants add constraint tenants_plan_id_check
  check (plan_id in ('free', 'essential', 'professional', 'business'));
