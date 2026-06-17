-- Unified stay review: one polarity, one intensity, one note per stay.

alter table public.guest_stay_reviews
  add column if not exists polarity text
    check (polarity is null or polarity in ('positive', 'negative')),
  add column if not exists intensity smallint
    check (intensity is null or intensity between 1 and 5),
  add column if not exists note text;

do $$
declare
  has_positive_note boolean;
  has_negative_note boolean;
  has_positive_stars boolean;
  has_negative_stars boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guest_stay_reviews'
      and column_name = 'positive_note'
  ) into has_positive_note;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guest_stay_reviews'
      and column_name = 'negative_note'
  ) into has_negative_note;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guest_stay_reviews'
      and column_name = 'positive_stars'
  ) into has_positive_stars;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guest_stay_reviews'
      and column_name = 'negative_stars'
  ) into has_negative_stars;

  if has_positive_note then
    if has_positive_stars then
      execute $sql$
        update public.guest_stay_reviews
        set
          polarity = 'positive',
          intensity = coalesce(
            case when positive_stars between 1 and 5 then positive_stars end,
            case when stars between 1 and 5 then stars end,
            3
          ),
          note = positive_note
        where positive_note is not null
          and trim(positive_note) <> ''
          and (polarity is null or note is null or trim(note) = '')
      $sql$;
    else
      execute $sql$
        update public.guest_stay_reviews
        set
          polarity = 'positive',
          intensity = coalesce(case when stars between 1 and 5 then stars end, 3),
          note = positive_note
        where positive_note is not null
          and trim(positive_note) <> ''
          and (polarity is null or note is null or trim(note) = '')
      $sql$;
    end if;
  end if;

  if has_negative_note then
    if has_positive_note then
      if has_negative_stars then
        execute $sql$
          update public.guest_stay_reviews
          set
            polarity = 'negative',
            intensity = coalesce(
              case when negative_stars between 1 and 5 then negative_stars end,
              3
            ),
            note = negative_note
          where negative_note is not null
            and trim(negative_note) <> ''
            and (positive_note is null or trim(positive_note) = '')
            and (polarity is null or note is null or trim(note) = '')
        $sql$;
      else
        execute $sql$
          update public.guest_stay_reviews
          set
            polarity = 'negative',
            intensity = coalesce(case when stars between 1 and 5 then stars end, 3),
            note = negative_note
          where negative_note is not null
            and trim(negative_note) <> ''
            and (positive_note is null or trim(positive_note) = '')
            and (polarity is null or note is null or trim(note) = '')
        $sql$;
      end if;
    elsif has_negative_stars then
      execute $sql$
        update public.guest_stay_reviews
        set
          polarity = 'negative',
          intensity = coalesce(
            case when negative_stars between 1 and 5 then negative_stars end,
            3
          ),
          note = negative_note
        where negative_note is not null
          and trim(negative_note) <> ''
          and (polarity is null or note is null or trim(note) = '')
      $sql$;
    else
      execute $sql$
        update public.guest_stay_reviews
        set
          polarity = 'negative',
          intensity = coalesce(case when stars between 1 and 5 then stars end, 3),
          note = negative_note
        where negative_note is not null
          and trim(negative_note) <> ''
          and (polarity is null or note is null or trim(note) = '')
      $sql$;
    end if;
  end if;
end $$;

update public.guest_stay_reviews
set
  polarity = coalesce(polarity, 'positive'),
  intensity = coalesce(intensity, case when stars between 1 and 5 then stars else 3 end),
  note = coalesce(nullif(trim(note), ''), 'Review migrat')
where polarity is null
   or intensity is null
   or note is null
   or trim(note) = '';

alter table public.guest_stay_reviews
  drop column if exists positive_note,
  drop column if exists negative_note,
  drop column if exists positive_stars,
  drop column if exists negative_stars;

alter table public.guest_stay_reviews
  alter column polarity set not null,
  alter column intensity set not null,
  alter column note set not null;

alter table public.guest_stay_reviews
  drop constraint if exists guest_stay_reviews_polarity_check;

alter table public.guest_stay_reviews
  add constraint guest_stay_reviews_polarity_check
    check (polarity in ('positive', 'negative'));

comment on table public.guest_stay_reviews is
  'Evaluare internă per sejur: un singur ton (pozitiv/negativ), intensitate 1–5, notă liberă.';

comment on column public.guest_stay_reviews.polarity is
  'positive sau negative — un singur tip de review per sejur';

comment on column public.guest_stay_reviews.intensity is
  '1–5: la pozitiv, 5=excelent; la negativ, 5=problemă majoră';

comment on column public.guest_stay_reviews.note is
  'Notă liberă staff pentru acest sejur';

comment on column public.guest_stay_reviews.stars is
  'Rating efectiv 1–5 al clientului pentru acest sejur (derivat din polarity + intensity)';
