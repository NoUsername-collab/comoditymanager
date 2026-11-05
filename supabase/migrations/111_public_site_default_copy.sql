-- 111 — Public site: default menu labels and privacy text, and default copy in the right language.
-- 1. Sites were created with empty menu labels, and an empty label hides its link,
--    so no site showed "Book" or any other link in its header. Empty labels get
--    the default ones.
-- 2. The privacy page had no default text and rendered empty. Empty privacy and
--    terms titles, leads and the privacy body get the default text; {email} and
--    {name} are filled in when the page renders. The terms body stays empty so
--    the page keeps showing the cancellation policy from the booking rules.
-- 3. Older editors saved one language's default text into every language
--    ("Check availability" on the Romanian page). A default text found in the
--    wrong language is replaced by the same default in the right one. Text the
--    operator wrote is never matched, so it is left alone.

-- Every default text, as { ro, en, bg }.
create function pg_temp.default_triads()
returns jsonb
language sql
immutable
as $fn$ select $json$[{"ro":"Cazare pensiune","en":"Guesthouse stay","bg":"Настаняване"},{"ro":"Cazare liniștită pentru familie și concediu scurt. Alegi datele online, primești răspuns personal de la recepție — fără plată automată, fără surprize.","en":"Peaceful stays for families and short breaks. Pick dates online, get a personal reply from reception — no automatic payment, no surprises.","bg":"Спокойен престой за семейства и кратки почивки. Избирате дати онлайн, получавате личен отговор от рецепцията — без автоматично плащане."},{"ro":"Cald, simplu, ca acasă — exact cum promite numele.","en":"Warm, simple, like home — just as the name promises.","bg":"Топло и просто, като у дома."},{"ro":"Cere disponibilitate","en":"Check availability","bg":"Провери наличност"},{"ro":"Cum funcționează","en":"How it works","bg":"Как работи"},{"ro":"Despre noi","en":"About us","bg":"За нас"},{"ro":"Cazare liniștită, camere îngrijite și gazde care îți răspund personal — tot ce ai nevoie pentru un sejur fără griji.","en":"Quiet stays, well-kept rooms and hosts who reply in person — everything you need for an easy trip.","bg":"Спокоен престой, поддържани стаи и домакини, които отговарят лично — всичко за едно безгрижно пътуване."},{"ro":"De ce e simplu","en":"Why it's simple","bg":"Защо е просто"},{"ro":"Trei lucruri clare — fără surprize la plată online.","en":"Three clear points — no surprises at online checkout.","bg":"Три ясни точки — без изненади при плащане онлайн."},{"ro":"Camere confortabile","en":"Comfortable rooms","bg":"Удобни стаи"},{"ro":"Opțiuni cu sau fără aer condiționat, potrivite pentru familii.","en":"Options with or without air conditioning, suitable for families.","bg":"Опции с или без климатик, подходящи за семейства."},{"ro":"Cerere în câteva minute","en":"Request in minutes","bg":"Заявка за минути"},{"ro":"Alegi perioada, vezi variante și preț estimat, apoi trimiți datele.","en":"Pick dates, see options and an estimated price, then send your details.","bg":"Избирате период, виждате опции и ориентировъчна цена, после изпращате данните."},{"ro":"Confirmare de la pensiune","en":"Confirmation by us","bg":"Потвърждение от нас"},{"ro":"Rezervarea devine fermă doar după ce vă contactăm. Fără plată online.","en":"Your booking is firm only after we contact you. No online payment.","bg":"Резервацията става твърда едва след като се свържем с вас. Без онлайн плащане."},{"ro":"Pașii rezervării","en":"Booking steps","bg":"Стъпки за резервация"},{"ro":"De la cerere la sejur confirmat — transparent pentru oaspeți.","en":"From request to confirmed stay — transparent for guests.","bg":"От заявка до потвърден престой — прозрачно за гостите."},{"ro":"Alegi perioada","en":"Pick your dates","bg":"Избирате период"},{"ro":"Completezi datele, număr persoane și vezi variantele disponibile.","en":"Enter dates, number of guests, and see available options.","bg":"Въвеждате дати, брой гости и виждате наличните опции."},{"ro":"Reținem provizoriu","en":"Temporary hold","bg":"Временно задържане"},{"ro":"Camerele din varianta aleasă sunt blocate temporar până la răspuns.","en":"Rooms in your chosen option are held briefly until we reply.","bg":"Стаите от избраната опция се блокират временно до отговор."},{"ro":"Confirmăm noi","en":"We confirm","bg":"Потвърждаваме ние"},{"ro":"Vă contactăm cu prețul final și detaliile check-in / check-out.","en":"We contact you with the final price and check-in / check-out details.","bg":"Свързваме се с вас с крайна цена и детайли за check-in / check-out."},{"ro":"Gata să trimiți o cerere?","en":"Ready to send a request?","bg":"Готови да изпратите заявка?"},{"ro":"Durează câteva minute. Dacă perioada nu e liberă, îți spunem imediat — fără cont și fără card.","en":"Takes a few minutes. If dates aren't free, we'll tell you right away — no account, no card.","bg":"Отнема няколко минути. Ако няма свободни дати, ще ви кажем веднага — без акаунт и карта."},{"ro":"Deschide calendarul","en":"Open calendar","bg":"Отвори календара"},{"ro":"Galerie","en":"Gallery","bg":"Галерия"},{"ro":"Acasă","en":"Home","bg":"Начало"},{"ro":"Confidențialitate","en":"Privacy","bg":"Поверителност"},{"ro":"Termeni","en":"Terms","bg":"Условия"},{"ro":"Rezervare","en":"Book a stay","bg":"Резервация"},{"ro":"Politica de confidențialitate","en":"Privacy policy","bg":"Политика за поверителност"},{"ro":"Cum prelucrăm datele trimise prin formularul de cerere de cazare (GDPR).","en":"How we process data submitted through the stay request form (GDPR).","bg":"Как обработваме данните, изпратени чрез формуляра за запитване за настаняване (GDPR)."},{"ro":"Respectăm Regulamentul (UE) 2016/679 (GDPR). Această pagină descrie cum prelucrăm datele pe care ni le trimiteți prin formularul de cerere de cazare.\n\nCe date colectăm\n• Nume, email, telefon (opțional)\n• Date despre sejur (check-in, check-out, număr persoane)\n• Mesaj opțional și informații despre minori, dacă le furnizați\n\nDe ce le folosim\nPentru a răspunde la cererea de cazare, a confirma disponibilitatea și a gestiona rezervarea la pensiune.\n\nTemei legal\nExecutarea demersurilor precontractuale la cererea dumneavoastră și interesul legitim al operatorului (art. 6 GDPR).\n\nDurata păstrării\nPăstrăm datele pe durata necesară pentru gestionarea rezervării și îndeplinirea obligațiilor legale (contabilitate, fiscalitate).\n\nDrepturile tale\nAveți dreptul de acces, rectificare, ștergere, restricționare, opoziție și portabilitate. Pentru exercitarea drepturilor, scrieți la {email}.","en":"We comply with Regulation (EU) 2016/679 (GDPR). This page describes how we process data you send via the stay request form.\n\nData we collect\n• Name, email, phone (optional)\n• Stay details (check-in, check-out, number of guests)\n• Optional message and minor information, if provided\n\nWhy we use it\nTo respond to your stay request, confirm availability, and manage your booking.\n\nLegal basis\nSteps at your request before a contract and our legitimate interest (Art. 6 GDPR).\n\nRetention\nWe keep data as long as needed to manage the booking and meet legal obligations (accounting, tax).\n\nYour rights\nYou have rights of access, rectification, erasure, restriction, objection, and portability. Contact {email}.","bg":"Спазваме Регламент (ЕС) 2016/679 (GDPR). Тази страница описва как обработваме данните, които ни изпращате чрез формуляра за запитване за настаняване.\n\nКакви данни събираме\n• Име, имейл, телефон (по избор)\n• Данни за престоя (настаняване, напускане, брой гости)\n• Съобщение по избор и информация за непълнолетни, ако я предоставите\n\nЗа какво ги използваме\nЗа да отговорим на запитването ви, да потвърдим наличността и да управляваме резервацията.\n\nПравно основание\nПредприемане на стъпки по ваше искане преди сключване на договор и законният интерес на администратора (чл. 6 GDPR).\n\nСрок на съхранение\nСъхраняваме данните толкова, колкото е необходимо за управление на резервацията и за изпълнение на законовите задължения (счетоводство, данъци).\n\nВашите права\nИмате право на достъп, коригиране, изтриване, ограничаване, възражение и преносимост. За да ги упражните, пишете ни на {email}."},{"ro":"Termeni și condiții","en":"Terms and conditions","bg":"Общи условия"},{"ro":"Reguli clare pentru cererea de cazare online — ce înseamnă confirmarea de la pensiune.","en":"Clear rules for online stay requests — what confirmation by the guesthouse means.","bg":"Ясни правила за онлайн запитванията за настаняване — какво означава потвърждението от къщата за гости."}]$json$::jsonb $fn$;

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

create function pg_temp.fill_empty_fields(target jsonb, seeds jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_out jsonb := coalesce(target, '{}'::jsonb);
  v_key text;
begin
  for v_key in select jsonb_object_keys(seeds) loop
    v_out := v_out || jsonb_build_object(v_key, pg_temp.fill_empty(v_out -> v_key, seeds -> v_key));
  end loop;
  return v_out;
end;
$$;

-- Walks any jsonb; every { ro, en, bg } text gets default copy moved to its language.
create function pg_temp.fix_wrong_language(v jsonb, triads jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_out jsonb;
  v_key text;
  v_locale text;
  v_text text;
  v_triad jsonb;
begin
  if jsonb_typeof(v) = 'array' then
    select coalesce(jsonb_agg(pg_temp.fix_wrong_language(item, triads) order by ord), '[]'::jsonb)
    into v_out
    from jsonb_array_elements(v) with ordinality as e(item, ord);
    return v_out;
  end if;

  if jsonb_typeof(v) <> 'object' then
    return v;
  end if;

  if v <> '{}'::jsonb
    and not exists (select 1 from jsonb_object_keys(v) k where k not in ('ro', 'en', 'bg'))
    and not exists (select 1 from jsonb_each(v) e where jsonb_typeof(e.value) <> 'string')
  then
    v_out := v;
    foreach v_locale in array array['ro', 'en', 'bg'] loop
      v_text := v ->> v_locale;
      continue when v_text is null;
      for v_triad in select value from jsonb_array_elements(triads) loop
        if v_text <> v_triad ->> v_locale
          and (v_text = v_triad ->> 'ro' or v_text = v_triad ->> 'en' or v_text = v_triad ->> 'bg')
        then
          v_out := v_out || jsonb_build_object(v_locale, v_triad ->> v_locale);
          exit;
        end if;
      end loop;
    end loop;
    return v_out;
  end if;

  v_out := '{}'::jsonb;
  for v_key in select jsonb_object_keys(v) loop
    v_out := v_out || jsonb_build_object(v_key, pg_temp.fix_wrong_language(v -> v_key, triads));
  end loop;
  return v_out;
end;
$$;

update public.public_site_settings set
  chrome = pg_temp.fix_wrong_language(
    pg_temp.fill_empty_fields(chrome, $json${"navHome":{"ro":"Acasă","en":"Home","bg":"Начало"},"navPrivacy":{"ro":"Confidențialitate","en":"Privacy","bg":"Поверителност"},"navTerms":{"ro":"Termeni","en":"Terms","bg":"Условия"},"navBook":{"ro":"Rezervare","en":"Book a stay","bg":"Резервация"}}$json$::jsonb),
    pg_temp.default_triads()
  ),
  pages = pg_temp.fix_wrong_language(
    pg_temp.fill_empty_fields(pages, $json${"privacyTitle":{"ro":"Politica de confidențialitate","en":"Privacy policy","bg":"Политика за поверителност"},"privacyLead":{"ro":"Cum prelucrăm datele trimise prin formularul de cerere de cazare (GDPR).","en":"How we process data submitted through the stay request form (GDPR).","bg":"Как обработваме данните, изпратени чрез формуляра за запитване за настаняване (GDPR)."},"privacyBody":{"ro":"Respectăm Regulamentul (UE) 2016/679 (GDPR). Această pagină descrie cum prelucrăm datele pe care ni le trimiteți prin formularul de cerere de cazare.\n\nCe date colectăm\n• Nume, email, telefon (opțional)\n• Date despre sejur (check-in, check-out, număr persoane)\n• Mesaj opțional și informații despre minori, dacă le furnizați\n\nDe ce le folosim\nPentru a răspunde la cererea de cazare, a confirma disponibilitatea și a gestiona rezervarea la pensiune.\n\nTemei legal\nExecutarea demersurilor precontractuale la cererea dumneavoastră și interesul legitim al operatorului (art. 6 GDPR).\n\nDurata păstrării\nPăstrăm datele pe durata necesară pentru gestionarea rezervării și îndeplinirea obligațiilor legale (contabilitate, fiscalitate).\n\nDrepturile tale\nAveți dreptul de acces, rectificare, ștergere, restricționare, opoziție și portabilitate. Pentru exercitarea drepturilor, scrieți la {email}.","en":"We comply with Regulation (EU) 2016/679 (GDPR). This page describes how we process data you send via the stay request form.\n\nData we collect\n• Name, email, phone (optional)\n• Stay details (check-in, check-out, number of guests)\n• Optional message and minor information, if provided\n\nWhy we use it\nTo respond to your stay request, confirm availability, and manage your booking.\n\nLegal basis\nSteps at your request before a contract and our legitimate interest (Art. 6 GDPR).\n\nRetention\nWe keep data as long as needed to manage the booking and meet legal obligations (accounting, tax).\n\nYour rights\nYou have rights of access, rectification, erasure, restriction, objection, and portability. Contact {email}.","bg":"Спазваме Регламент (ЕС) 2016/679 (GDPR). Тази страница описва как обработваме данните, които ни изпращате чрез формуляра за запитване за настаняване.\n\nКакви данни събираме\n• Име, имейл, телефон (по избор)\n• Данни за престоя (настаняване, напускане, брой гости)\n• Съобщение по избор и информация за непълнолетни, ако я предоставите\n\nЗа какво ги използваме\nЗа да отговорим на запитването ви, да потвърдим наличността и да управляваме резервацията.\n\nПравно основание\nПредприемане на стъпки по ваше искане преди сключване на договор и законният интерес на администратора (чл. 6 GDPR).\n\nСрок на съхранение\nСъхраняваме данните толкова, колкото е необходимо за управление на резервацията и за изпълнение на законовите задължения (счетоводство, данъци).\n\nВашите права\nИмате право на достъп, коригиране, изтриване, ограничаване, възражение и преносимост. За да ги упражните, пишете ни на {email}."},"termsTitle":{"ro":"Termeni și condiții","en":"Terms and conditions","bg":"Общи условия"},"termsLead":{"ro":"Reguli clare pentru cererea de cazare online — ce înseamnă confirmarea de la pensiune.","en":"Clear rules for online stay requests — what confirmation by the guesthouse means.","bg":"Ясни правила за онлайн запитванията за настаняване — какво означава потвърждението от къщата за гости."}}$json$::jsonb),
    pg_temp.default_triads()
  ),
  hero = pg_temp.fix_wrong_language(hero, pg_temp.default_triads());

update public.public_site_sections set
  payload = pg_temp.fix_wrong_language(payload, pg_temp.default_triads());
