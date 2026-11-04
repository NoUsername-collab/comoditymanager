-- 109 — The "how to book" section's anchor is now #public-steps on every language
-- (it was the Romanian #cum-functioneaza, also on the English and Bulgarian site).
-- Buttons saved with the old link point to the new one.

update public.public_site_settings
set hero = jsonb_set(hero, '{ctaPrimaryHref}', '"#public-steps"')
where hero ->> 'ctaPrimaryHref' = '#cum-functioneaza';

update public.public_site_settings
set hero = jsonb_set(hero, '{ctaSecondaryHref}', '"#public-steps"')
where hero ->> 'ctaSecondaryHref' = '#cum-functioneaza';

update public.public_site_sections
set payload = jsonb_set(payload, '{ctaHref}', '"#public-steps"')
where payload ->> 'ctaHref' = '#cum-functioneaza';

update public.public_site_sections
set payload = jsonb_set(payload, '{ctaSecondaryHref}', '"#public-steps"')
where payload ->> 'ctaSecondaryHref' = '#cum-functioneaza';
