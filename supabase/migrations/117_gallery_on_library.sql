-- 117 — The site's gallery shows albums of the photo library instead of its own photos.
--
-- Each gallery's photos move into the library (album "other", in their order;
-- a caption becomes the description where there was none). The gallery then
-- keeps only what to show: its title and lead, the albums, how to lay them out
-- and how many to show before "see all".

insert into public.media_assets (tenant_id, url, album, alt, sort_order)
select s.tenant_id,
       item.value->>'url',
       'other',
       coalesce(
         nullif(item.value->'alt', '{}'::jsonb),
         nullif(item.value->'caption', '{}'::jsonb),
         '{}'::jsonb
       ),
       (coalesce((select max(m.sort_order) from public.media_assets m
                  where m.tenant_id = s.tenant_id and m.album = 'other'), -1)
        + item.position)::integer
from public.public_site_sections s
cross join lateral jsonb_array_elements(coalesce(s.payload->'items', '[]'::jsonb))
  with ordinality as item(value, position)
where s.section_type = 'gallery'
  and coalesce(item.value->>'url', '') <> ''
  and not exists (
    select 1 from public.media_assets m
    where m.tenant_id = s.tenant_id and m.url = item.value->>'url'
  );

-- A gallery that had photos shows the album they moved to; an empty one shows every album.
update public.public_site_sections s
set payload = (s.payload - 'items')
  || jsonb_build_object(
       'albums',
       case when jsonb_array_length(coalesce(s.payload->'items', '[]'::jsonb)) > 0
            then '["other"]'::jsonb
            else '[]'::jsonb end,
       'layout', 'auto',
       'limit', 9
     )
where s.section_type = 'gallery';
