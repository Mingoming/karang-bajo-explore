-- Milestone 2 keeps tourism-media private while permitting signed delivery
-- only for objects referenced by published destination image records.

create or replace function public.can_read_published_destination_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.destination_images as image
    join public.destinations as destination
      on destination.id = image.destination_id
    where destination.status = 'published'
      and image.storage_bucket = 'tourism-media'
      and image.storage_path = object_name
  );
$$;

revoke all on function public.can_read_published_destination_media(text)
from public, anon, authenticated;
grant execute on function public.can_read_published_destination_media(text)
to anon, authenticated;

create policy tourism_media_published_destination_select
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'tourism-media'
  and public.can_read_published_destination_media(name)
);

comment on function public.can_read_published_destination_media(text) is
  'Storage policy predicate for database-referenced images owned by published destinations.';
