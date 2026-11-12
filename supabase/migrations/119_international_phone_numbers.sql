-- 119 — Phone and WhatsApp numbers in international form.
--
-- A WhatsApp link (wa.me/…) and a call link work only with the country code;
-- numbers were kept as typed ("0730 127 427"). They are now saved as
-- "+40730127427", with the property's country for numbers written without one
-- (the app does the same on every save: src/domain/settings/phone.ts). This
-- turns the numbers already saved into that form: the property's own contact
-- and the site's override of it.

create or replace function public.international_phone_119(raw text, country text)
returns text
language plpgsql
immutable
as $$
declare
  v_text text := btrim(coalesce(raw, ''));
  v_compact text;
  v_code text := case country when 'MD' then '373' when 'BG' then '359' else '40' end;
begin
  if v_text = '' then
    return null;
  end if;
  v_compact := regexp_replace(v_text, '[[:space:]()./-]', '', 'g');
  -- Not a number (a note, a link): kept as written.
  if v_compact !~ '^\+?\d+$' then
    return v_text;
  end if;
  if left(v_compact, 1) = '+' then
    return v_compact;
  end if;
  if left(v_compact, 2) = '00' then
    return '+' || substr(v_compact, 3);
  end if;
  if left(v_compact, 1) = '0' then
    return '+' || v_code || substr(v_compact, 2);
  end if;
  if (v_compact like '40%' or v_compact like '373%' or v_compact like '359%') and length(v_compact) >= 10 then
    return '+' || v_compact;
  end if;
  return v_compact;
end;
$$;

update public.pension_settings p
set contact_phone = public.international_phone_119(p.contact_phone, t.country),
    contact_whatsapp = public.international_phone_119(p.contact_whatsapp, t.country)
from public.tenants t
where t.id = p.tenant_id
  and (p.contact_phone is not null or p.contact_whatsapp is not null);

update public.public_site_settings s
set contact = s.contact
  || case when coalesce(s.contact->>'phone', '') <> ''
          then jsonb_build_object('phone', public.international_phone_119(s.contact->>'phone', t.country))
          else '{}'::jsonb end
  || case when coalesce(s.contact->>'whatsapp', '') <> ''
          then jsonb_build_object('whatsapp', public.international_phone_119(s.contact->>'whatsapp', t.country))
          else '{}'::jsonb end
from public.tenants t
where t.id = s.tenant_id
  and (coalesce(s.contact->>'phone', '') <> '' or coalesce(s.contact->>'whatsapp', '') <> '');

-- Only needed for this change.
drop function public.international_phone_119(text, text);
