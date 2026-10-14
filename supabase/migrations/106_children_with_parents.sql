-- 106 — Children stay with their parents.
-- A booking lists every minor by age, and each property sets its child rules:
-- babies need no bed, two children share a bed, one child (or a lone teen)
-- may sleep with the parents. Rooms are no longer split just because of a child.

alter table public.bookings
  add column if not exists children_ages smallint[],
  add column if not exists children_separate_room boolean not null default false;

-- Bookings made before ages were asked: the old form kept one free-text age
-- for a single accompanying minor. Recover it only where it is unambiguous.
update public.bookings
set children_ages = array[(substring(minor_age from '^\s*(\d{1,2})'))::smallint]
where children_ages is null
  and num_children = 1
  and minor_age ~ '^\s*\d{1,2}(\D|$)'
  and (substring(minor_age from '^\s*(\d{1,2})'))::int <= 17;

alter table public.bookings drop constraint if exists bookings_children_ages_check;
alter table public.bookings add constraint bookings_children_ages_check check (
  children_ages is null
  or (
    cardinality(children_ages) = num_children
    and array_position(children_ages, null) is null
    and 0 <= all (children_ages)
    and 17 >= all (children_ages)
  )
);

comment on column public.bookings.children_ages is
  'Vârsta fiecărui minor (0–17). NULL doar la rezervările vechi, fără vârste.';
comment on column public.bookings.children_separate_room is
  'Părinții au cerut cameră separată pentru copii. Implicit copiii stau cu un adult.';

alter table public.pension_settings
  add column if not exists child_max_age smallint not null default 13,
  add column if not exists infant_max_age smallint default 2,
  add column if not exists children_share_bed boolean not null default true,
  add column if not exists child_with_parents boolean not null default true,
  add column if not exists lone_teen_with_parents boolean not null default true;

alter table public.pension_settings drop constraint if exists pension_settings_child_ages_check;
alter table public.pension_settings add constraint pension_settings_child_ages_check check (
  child_max_age between 0 and 17
  and (infant_max_age is null or (infant_max_age between 0 and 5 and infant_max_age < child_max_age))
);

comment on column public.pension_settings.child_max_age is
  'Până la această vârstă inclusiv, minorul e copil (poate împărți patul). Implicit 13 = sub 14 ani.';
comment on column public.pension_settings.infant_max_age is
  'Până la această vârstă inclusiv, bebelușul nu ocupă pat (pătuț / cu părinții). NULL = fără regulă.';
comment on column public.pension_settings.children_share_bed is
  'Doi copii pot împărți un pat sau un pat suplimentar.';
comment on column public.pension_settings.child_with_parents is
  'Un copil pe cameră poate dormi cu părinții, fără loc propriu.';
comment on column public.pension_settings.lone_teen_with_parents is
  'Când e singurul minor din cameră, și un adolescent (până la 17 ani) poate sta cu părinții.';
