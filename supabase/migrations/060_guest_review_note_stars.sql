-- Stele per notă pozitivă/negativă — modificatori ai ratingului general.

alter table public.guest_stay_reviews
  add column if not exists positive_stars smallint
    check (positive_stars is null or positive_stars between 1 and 5),
  add column if not exists negative_stars smallint
    check (negative_stars is null or negative_stars between 1 and 5);

comment on column public.guest_stay_reviews.positive_stars is
  'Intensitate notă pozitivă (1=ok, 5=excelent) — contribuie direct la stars.';
comment on column public.guest_stay_reviews.negative_stars is
  'Gravitate notă negativă (1=foarte grav, 5=minor) — scade ratingul general.';

-- Legacy: review-uri doar cu stele generale → tratează ca notă pozitivă implicită.
update public.guest_stay_reviews
set positive_stars = stars
where positive_stars is null
  and stars is not null
  and (positive_note is not null and trim(positive_note) <> '');
