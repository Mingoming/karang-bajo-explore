-- Federated public Media delivery for the six approved Version 1 parent types.
-- The private bucket remains private; this SELECT boundary authorizes only
-- exact objects referenced by image rows whose current parent is published.

drop policy if exists tourism_media_published_destination_select
on storage.objects;

revoke all on function public.can_read_published_destination_media(text)
from public, anon, authenticated;
drop function public.can_read_published_destination_media(text);

create function public.can_read_published_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.destination_images as image
      join public.destinations as parent on parent.id = image.destination_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^destination/' || image.destination_id::text || '/' || image.id::text || '\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.package_images as image
      join public.tourism_packages as parent on parent.id = image.package_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^tourism-package/' || image.package_id::text || '/' || image.id::text || '\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.homestay_images as image
      join public.homestays as parent on parent.id = image.homestay_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^homestay/' || image.homestay_id::text || '/' || image.id::text || '\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.umkm_images as image
      join public.umkms as parent on parent.id = image.umkm_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^umkm/' || image.umkm_id::text || '/' || image.id::text || '\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.traditional_house_images as image
      join public.traditional_houses as parent on parent.id = image.traditional_house_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^traditional-house/' || image.traditional_house_id::text || '/' || image.id::text || '\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.cultural_event_images as image
      join public.cultural_events as parent on parent.id = image.cultural_event_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^cultural-event/' || image.cultural_event_id::text || '/' || image.id::text || '\.(jpg|png|webp)$')
    );
$$;

revoke all on function public.can_read_published_media(text)
from public, anon, authenticated;
grant execute on function public.can_read_published_media(text)
to anon, authenticated;

create policy tourism_media_published_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'tourism-media'
  and public.can_read_published_media(name)
);

comment on function public.can_read_published_media(text) is
  'Exact Storage policy predicate for Media referenced by any approved published parent.';
