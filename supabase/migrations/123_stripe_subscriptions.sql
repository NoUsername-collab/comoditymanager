-- 123 — Paying for Light and PRO by card (Stripe Billing).
--
-- The owner subscribes from the panel (Stripe Checkout) and manages the card,
-- the plan and cancelling in Stripe's customer portal. Stripe tells Zalmox
-- through its webhook; each event is applied once (stripe_webhook_events) and
-- the subscription is always re-read from Stripe, so events arriving late or
-- out of order cannot leave the property on the wrong plan.
--
-- tenants.stripe_customer_id / stripe_subscription_id already exist (026).
-- The plan itself stays in tenants.plan_id; these columns say how it is paid.

alter table public.tenants
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false;

alter table public.tenants
  drop constraint if exists tenants_subscription_status_check;
alter table public.tenants
  add constraint tenants_subscription_status_check
  check (
    subscription_status is null
    or subscription_status in (
      'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'
    )
  );

comment on column public.tenants.subscription_status is
  'Stripe subscription status for a card-paid plan; null when the plan is free or set by the Zalmox team.';
comment on column public.tenants.subscription_current_period_end is
  'End of the period already paid; the plan renews or, when cancelled, ends then.';
comment on column public.tenants.subscription_cancel_at_period_end is
  'The owner cancelled; the plan stays until subscription_current_period_end.';

create unique index if not exists tenants_stripe_customer_id_key
  on public.tenants (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists tenants_stripe_subscription_id_key
  on public.tenants (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Events already applied; Stripe may send one more than once.
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is
  'Stripe webhook event ids already processed (service role only).';

alter table public.stripe_webhook_events enable row level security;
-- No policy: only the service role (the webhook) reads and writes it.
