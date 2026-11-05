-- 112 — Public site: the "coming soon" page says something.
-- A site that is not published showed only its name, with no word of why.
-- Empty coming-soon titles and leads get the default text in each language;
-- text the operator wrote is kept.

create function pg_temp.fill_empty(v jsonb, seed jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_out jsonb := case when jsonb_typeof(v) = 'object' then v else '{}'::jsonb end;
  v_locale text;
begin
  -- A plain string is legacy copy for every language; keep it.
  if jsonb_typeof(v) = 'string' and btrim(v #>> '{}') <> '' then
    return v;
  end if;
  foreach v_locale in array array['ro', 'en', 'bg'] loop
    if coalesce(btrim(v_out ->> v_locale), '') = '' then
      v_out := v_out || jsonb_build_object(v_locale, seed ->> v_locale);
    end if;
  end loop;
  return v_out;
end;
$$;

update public.public_site_settings set
  pages = coalesce(pages, '{}'::jsonb)
    || jsonb_build_object(
      'comingSoonTitle',
      pg_temp.fill_empty(pages -> 'comingSoonTitle', $json${"ro":"Pagina va fi online în curând","en":"We'll be online shortly","bg":"Страницата ще е онлайн скоро"}$json$::jsonb),
      'comingSoonLead',
      pg_temp.fill_empty(pages -> 'comingSoonLead', $json${"ro":"Pregătim pagina acestei pensiuni. Revino mai târziu sau contactează-ne pe datele de mai jos.","en":"This guesthouse page is being prepared. Please check back soon, or reach us using the contact details below.","bg":"Подготвяме публичната страница. Проверете отново скоро или се свържете с нас по данните по-долу."}$json$::jsonb)
    );
