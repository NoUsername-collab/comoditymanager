-- 122 — A guest's personal data: erased on request, identity documents kept
-- only for a set time (GDPR art. 17 and 5(1)(e)).
--
--   * erase_guest_personal_data(): the guest asked to be forgotten. Names,
--     contact, identity documents, notes and the guest's own words leave every
--     table; the stays stay (dates, rooms, prices) so occupancy and statistics
--     keep adding up. Issued invoices and recorded payments are accounting
--     documents and are kept as issued. Refused while the guest has a stay that
--     is not over.
--   * purge_expired_guest_identity(): every day, the identity documents (CNP,
--     document numbers, birth date and place, address) of guests whose last
--     stay ended more than the property's retention period ago are cleared,
--     on the guest file and on the check-in and pre-check-in records. Name and
--     contact stay, for rebooking.
--   * pension_settings.guest_identity_retention_months: that period, 36
--     months unless the owner sets another one (6 to 120).

alter table public.pension_settings
  add column if not exists guest_identity_retention_months integer not null default 36;

alter table public.pension_settings
  drop constraint if exists pension_settings_guest_identity_retention_months_check;
alter table public.pension_settings
  add constraint pension_settings_guest_identity_retention_months_check
  check (guest_identity_retention_months between 6 and 120);

comment on column public.pension_settings.guest_identity_retention_months is
  'Months after a guest''s last stay before their identity documents are cleared (purge_expired_guest_identity).';

alter table public.guests
  add column if not exists erased_at timestamptz,
  add column if not exists identity_purged_at timestamptz;

comment on column public.guests.erased_at is
  'When the guest''s personal data was erased on request; the row stays so their stays keep a guest.';
comment on column public.guests.identity_purged_at is
  'When the identity documents were last cleared by the retention period.';

-- ── Erase on request ──────────────────────────────────────────────────────
create or replace function public.erase_guest_personal_data(p_tenant_id uuid, p_guest_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests%rowtype;
  v_booking_ids uuid[];
  v_needles text[];
  v_needle text;
begin
  select * into v_guest
  from public.guests
  where id = p_guest_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'guest.not_found';
  end if;
  if v_guest.erased_at is not null then
    return;
  end if;

  -- The guest's stays: as the booking's guest or as one of its occupants.
  select coalesce(array_agg(distinct b.id), '{}') into v_booking_ids
  from public.bookings b
  where b.tenant_id = p_tenant_id
    and (
      b.guest_id = p_guest_id
      or exists (
        select 1 from public.booking_occupants o
        where o.tenant_id = p_tenant_id and o.booking_id = b.id and o.guest_id = p_guest_id
      )
    );

  if exists (
    select 1 from public.bookings b
    where b.tenant_id = p_tenant_id
      and b.guest_id = p_guest_id
      and b.status <> 'anulata'
      and b.check_out >= current_date
  ) then
    raise exception 'guest.has_open_stay';
  end if;

  -- What may name the guest in free text (activity log summaries).
  v_needles := array_remove(array[
    nullif(btrim(v_guest.display_name), ''),
    nullif(btrim(concat_ws(' ', v_guest.last_name, v_guest.first_name)), ''),
    nullif(btrim(concat_ws(' ', v_guest.first_name, v_guest.last_name)), ''),
    nullif(btrim(v_guest.email), ''),
    nullif(btrim(v_guest.phone), '')
  ], null);

  update public.guests set
    last_name = '',
    first_name = '',
    display_name = '—',
    phone = null,
    phone_normalized = null,
    email = null,
    email_normalized = null,
    notes = null,
    tags = '{}',
    identity_status = 'draft',
    doc_type = null,
    doc_series = null,
    doc_number = null,
    doc_issued_by = null,
    doc_issue_date = null,
    doc_expiry_date = null,
    cnp = null,
    birth_date = null,
    birth_place = null,
    nationality = null,
    address = null,
    city = null,
    county = null,
    country = null,
    sex = null,
    national_id_type = null,
    national_id = null,
    erased_at = now()
  where id = p_guest_id and tenant_id = p_tenant_id;

  update public.guest_profiles set
    flag_level = 'normal',
    blacklist_reason = null,
    blacklisted_by_email = null,
    unblacklisted_by_email = null,
    manual_note = null
  where guest_id = p_guest_id and tenant_id = p_tenant_id;

  update public.guest_stay_reviews set note = null, reviewed_by_email = null
  where tenant_id = p_tenant_id and (guest_id = p_guest_id or booking_id = any(v_booking_ids));

  -- Bookings where this guest is the one who booked.
  update public.bookings set
    guest_name = '—',
    guest_last_name = null,
    guest_first_name = null,
    guest_email = '',
    guest_phone = null,
    notes = null,
    guest_alert_note = null,
    minor_age = null
  where tenant_id = p_tenant_id and guest_id = p_guest_id;

  update public.checkin_guests set
    full_name = '—',
    last_name = null,
    first_name = null,
    phone = null,
    document_type = null,
    document_series = null,
    document_number = null,
    national_id = null,
    nationality = null,
    birth_date = null
  where tenant_id = p_tenant_id
    and (
      guest_id = p_guest_id
      -- The representative row of a check-in on the guest's own booking, saved before guests were linked.
      or (
        guest_id is null
        and is_representative
        and checkin_id in (
          select c.id from public.checkins c
          join public.bookings b on b.id = c.booking_id and b.tenant_id = c.tenant_id
          where c.tenant_id = p_tenant_id and b.guest_id = p_guest_id
        )
      )
    );

  update public.checkins set notes = null
  where tenant_id = p_tenant_id
    and booking_id in (select id from public.bookings where tenant_id = p_tenant_id and guest_id = p_guest_id);

  delete from public.guest_precheckin_submissions
  where tenant_id = p_tenant_id
    and booking_id in (select id from public.bookings where tenant_id = p_tenant_id and guest_id = p_guest_id);

  delete from public.guest_reception_requests
  where tenant_id = p_tenant_id
    and booking_id in (select id from public.bookings where tenant_id = p_tenant_id and guest_id = p_guest_id);

  update public.guest_green_stay_requests set note = null
  where tenant_id = p_tenant_id
    and booking_id in (select id from public.bookings where tenant_id = p_tenant_id and guest_id = p_guest_id);

  update public.guest_feedback set comment = ''
  where tenant_id = p_tenant_id
    and booking_id in (select id from public.bookings where tenant_id = p_tenant_id and guest_id = p_guest_id);

  update public.guest_loyalty_refs set revoked_at = coalesce(revoked_at, now())
  where tenant_id = p_tenant_id and guest_id = p_guest_id;

  update public.booking_guest_access set revoked_at = coalesce(revoked_at, now())
  where tenant_id = p_tenant_id
    and booking_id in (select id from public.bookings where tenant_id = p_tenant_id and guest_id = p_guest_id);

  -- The activity log keeps what happened, without who it happened to.
  foreach v_needle in array v_needles loop
    if char_length(v_needle) >= 3 then
      update public.admin_activity_log
      set summary = replace(summary, v_needle, '—')
      where tenant_id = p_tenant_id and position(v_needle in summary) > 0;
    end if;
  end loop;
  update public.admin_activity_log
  set metadata = metadata - array['guest_name', 'guest_email', 'guest_phone', 'guest_first_name', 'guest_last_name', 'email', 'phone', 'name']
  where tenant_id = p_tenant_id
    and (entity_id = p_guest_id::text or entity_id in (select unnest(v_booking_ids)::text));
end;
$$;

revoke all on function public.erase_guest_personal_data(uuid, uuid) from public, anon, authenticated;

comment on function public.erase_guest_personal_data(uuid, uuid) is
  'Erases a guest''s personal data on request; stays, invoices and payments remain. Service role only.';

-- ── Identity documents past the retention period ──────────────────────────
create or replace function public.purge_expired_guest_identity(p_today date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guests integer := 0;
begin
  -- Guest files: the last stay that is over, per guest.
  with last_stay as (
    select b.tenant_id, b.guest_id, max(b.check_out) as last_out
    from public.bookings b
    where b.guest_id is not null and b.status <> 'anulata'
    group by b.tenant_id, b.guest_id
  ),
  open_stay as (
    select distinct b.tenant_id, b.guest_id
    from public.bookings b
    where b.guest_id is not null and b.status <> 'anulata' and b.check_out >= p_today
  ),
  expired as (
    select g.id, g.tenant_id
    from public.guests g
    join public.pension_settings ps on ps.tenant_id = g.tenant_id
    left join last_stay ls on ls.tenant_id = g.tenant_id and ls.guest_id = g.id
    where g.erased_at is null
      and not exists (select 1 from open_stay os where os.tenant_id = g.tenant_id and os.guest_id = g.id)
      and coalesce(ls.last_out, g.created_at::date)
          < (p_today - make_interval(months => ps.guest_identity_retention_months))::date
      and (g.cnp is not null or g.doc_number is not null or g.doc_series is not null
           or g.national_id is not null or g.birth_date is not null or g.birth_place is not null
           or g.address is not null or g.doc_issue_date is not null)
  )
  update public.guests g set
    doc_series = null,
    doc_number = null,
    doc_issued_by = null,
    doc_issue_date = null,
    doc_expiry_date = null,
    cnp = null,
    birth_date = null,
    birth_place = null,
    address = null,
    national_id_type = null,
    national_id = null,
    identity_status = 'draft',
    identity_purged_at = now()
  from expired e
  where g.id = e.id and g.tenant_id = e.tenant_id;
  get diagnostics v_guests = row_count;

  -- Check-in and pre-check-in records of stays that ended before the period.
  update public.checkin_guests cg set
    document_type = null,
    document_series = null,
    document_number = null,
    national_id = null,
    birth_date = null
  from public.checkins c
  join public.bookings b on b.id = c.booking_id and b.tenant_id = c.tenant_id
  join public.pension_settings ps on ps.tenant_id = c.tenant_id
  where cg.checkin_id = c.id
    and cg.tenant_id = c.tenant_id
    and b.check_out < (p_today - make_interval(months => ps.guest_identity_retention_months))::date
    and (cg.document_number is not null or cg.national_id is not null or cg.birth_date is not null
         or cg.document_series is not null);

  delete from public.guest_precheckin_submissions s
  using public.bookings b, public.pension_settings ps
  where b.id = s.booking_id and b.tenant_id = s.tenant_id
    and ps.tenant_id = s.tenant_id
    and b.check_out < (p_today - make_interval(months => ps.guest_identity_retention_months))::date;

  return v_guests;
end;
$$;

revoke all on function public.purge_expired_guest_identity(date) from public, anon, authenticated;

comment on function public.purge_expired_guest_identity(date) is
  'Clears identity documents older than each property''s retention period. Run daily by cron; service role only.';
