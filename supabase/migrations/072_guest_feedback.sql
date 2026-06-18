-- Guest-submitted feedback (separate from staff reviews in guest_stay_reviews).
-- One feedback per booking, submitted by the guest during/after checkout.

create table if not exists public.guest_feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text not null default '',
  submitted_at timestamptz not null default now(),

  constraint guest_feedback_one_per_booking unique (booking_id)
);

alter table public.guest_feedback enable row level security;

create policy "tenant_isolation" on public.guest_feedback
  for all using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create index idx_guest_feedback_booking on public.guest_feedback(booking_id);
create index idx_guest_feedback_tenant on public.guest_feedback(tenant_id);

comment on table public.guest_feedback is
  'Feedback trimis de oaspete la checkout — rating 1–5 stele + comentariu opțional.';
