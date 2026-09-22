-- Public-site storage: guest-visible photos, tenant-prefixed paths.
-- Uploads go through the service-role admin action (no client insert policy).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-site-media',
  'public-site-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists public_site_media_public_read on storage.objects;
create policy public_site_media_public_read
  on storage.objects
  for select
  to public
  using (bucket_id = 'public-site-media');
