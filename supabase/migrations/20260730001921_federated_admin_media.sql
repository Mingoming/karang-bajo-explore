-- Federated administrator media management for the six parent modules that
-- currently have complete administrator workflows. The bucket remains private;
-- future public pages must authorize a published parent before issuing a signed URL.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'tourism-media',
  'tourism-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy tourism_media_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'tourism-media'
  and (select public.is_admin())
);

create policy tourism_media_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tourism-media'
  and (select public.is_admin())
  and name ~ '^(destination|tourism-package|homestay|umkm|traditional-house|cultural-event)/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
);

create policy tourism_media_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'tourism-media'
  and (select public.is_admin())
)
with check (
  bucket_id = 'tourism-media'
  and (select public.is_admin())
  and name ~ '^(destination|tourism-package|homestay|umkm|traditional-house|cultural-event)/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
);

create policy tourism_media_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tourism-media'
  and (select public.is_admin())
);

-- The initial migration granted direct administrator mutations on every image
-- table. The federated media invariants require all mutations to pass through
-- the approved functions below, while administrator reads remain available.
revoke insert, update, delete on table
  public.destination_images,
  public.package_images,
  public.homestay_images,
  public.umkm_images,
  public.traditional_house_images,
  public.cultural_event_images
from authenticated;

drop policy if exists destination_images_admin_insert on public.destination_images;
drop policy if exists destination_images_admin_update on public.destination_images;
drop policy if exists destination_images_admin_delete on public.destination_images;
drop policy if exists package_images_admin_insert on public.package_images;
drop policy if exists package_images_admin_update on public.package_images;
drop policy if exists package_images_admin_delete on public.package_images;
drop policy if exists homestay_images_admin_insert on public.homestay_images;
drop policy if exists homestay_images_admin_update on public.homestay_images;
drop policy if exists homestay_images_admin_delete on public.homestay_images;
drop policy if exists umkm_images_admin_insert on public.umkm_images;
drop policy if exists umkm_images_admin_update on public.umkm_images;
drop policy if exists umkm_images_admin_delete on public.umkm_images;
drop policy if exists traditional_house_images_admin_insert on public.traditional_house_images;
drop policy if exists traditional_house_images_admin_update on public.traditional_house_images;
drop policy if exists traditional_house_images_admin_delete on public.traditional_house_images;
drop policy if exists cultural_event_images_admin_insert on public.cultural_event_images;
drop policy if exists cultural_event_images_admin_update on public.cultural_event_images;
drop policy if exists cultural_event_images_admin_delete on public.cultural_event_images;

alter table public.destination_images
  add constraint destination_images_managed_bucket check (storage_bucket = 'tourism-media'),
  add constraint destination_images_managed_path check (
    storage_path ~ (
      '^destination/' || destination_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );
alter table public.package_images
  add constraint package_images_managed_bucket check (storage_bucket = 'tourism-media'),
  add constraint package_images_managed_path check (
    storage_path ~ (
      '^tourism-package/' || package_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );
alter table public.homestay_images
  add constraint homestay_images_managed_bucket check (storage_bucket = 'tourism-media'),
  add constraint homestay_images_managed_path check (
    storage_path ~ (
      '^homestay/' || homestay_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );
alter table public.umkm_images
  add constraint umkm_images_managed_bucket check (storage_bucket = 'tourism-media'),
  add constraint umkm_images_managed_path check (
    storage_path ~ (
      '^umkm/' || umkm_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );
alter table public.traditional_house_images
  add constraint traditional_house_images_managed_bucket check (storage_bucket = 'tourism-media'),
  add constraint traditional_house_images_managed_path check (
    storage_path ~ (
      '^traditional-house/' || traditional_house_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );
alter table public.cultural_event_images
  add constraint cultural_event_images_managed_bucket check (storage_bucket = 'tourism-media'),
  add constraint cultural_event_images_managed_path check (
    storage_path ~ (
      '^cultural-event/' || cultural_event_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  );

create or replace function private.enforce_media_image_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  parent_column text;
  parent_id uuid;
  image_count integer;
begin
  parent_column := case tg_table_name
    when 'destination_images' then 'destination_id'
    when 'package_images' then 'package_id'
    when 'homestay_images' then 'homestay_id'
    when 'umkm_images' then 'umkm_id'
    when 'traditional_house_images' then 'traditional_house_id'
    when 'cultural_event_images' then 'cultural_event_id'
    else null
  end;

  if parent_column is null then
    raise exception using errcode = '22023', message = 'unsupported media image table';
  end if;

  parent_id := (to_jsonb(new) ->> parent_column)::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(parent_id::text, 0));
  execute format(
    'select count(*) from %s where %I = $1',
    tg_relid::regclass,
    parent_column
  ) into image_count using parent_id;

  if image_count >= 10 then
    raise exception using errcode = '23514', message = 'media image limit exceeded';
  end if;

  return new;
end;
$$;

create trigger destination_images_limit_trigger
before insert on public.destination_images
for each row execute function private.enforce_media_image_limit();
create trigger package_images_limit_trigger
before insert on public.package_images
for each row execute function private.enforce_media_image_limit();
create trigger homestay_images_limit_trigger
before insert on public.homestay_images
for each row execute function private.enforce_media_image_limit();
create trigger umkm_images_limit_trigger
before insert on public.umkm_images
for each row execute function private.enforce_media_image_limit();
create trigger traditional_house_images_limit_trigger
before insert on public.traditional_house_images
for each row execute function private.enforce_media_image_limit();
create trigger cultural_event_images_limit_trigger
before insert on public.cultural_event_images
for each row execute function private.enforce_media_image_limit();

create or replace function public.media_insert(
  p_entity_type text,
  p_parent_id uuid,
  p_image_id uuid,
  p_storage_path text,
  p_alt_text text,
  p_caption text default null,
  p_display_order integer default 0,
  p_is_primary boolean default false,
  p_image_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_table regclass;
  image_table regclass;
  parent_fk text;
  locked_parent_id uuid;
  image_count integer;
  submitted_image_count integer;
  make_primary boolean;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_image_id is null or p_parent_id is null then
    raise exception using errcode = '22023', message = 'invalid media identifier';
  end if;
  if btrim(coalesce(p_alt_text, '')) = '' then
    raise exception using errcode = '23514', message = 'alt text is required';
  end if;
  if p_display_order < 0 then
    raise exception using errcode = '23514', message = 'invalid display order';
  end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk
  into parent_table, image_table, parent_fk
  from (values
    ('destination', 'public.destinations'::regclass, 'public.destination_images'::regclass, 'destination_id'),
    ('tourism-package', 'public.tourism_packages'::regclass, 'public.package_images'::regclass, 'package_id'),
    ('homestay', 'public.homestays'::regclass, 'public.homestay_images'::regclass, 'homestay_id'),
    ('umkm', 'public.umkms'::regclass, 'public.umkm_images'::regclass, 'umkm_id'),
    ('traditional-house', 'public.traditional_houses'::regclass, 'public.traditional_house_images'::regclass, 'traditional_house_id'),
    ('cultural-event', 'public.cultural_events'::regclass, 'public.cultural_event_images'::regclass, 'cultural_event_id')
  ) as mapping(entity_type, parent_table, image_table, parent_fk)
  where mapping.entity_type = p_entity_type;
  if parent_table is null then
    raise exception using errcode = '22023', message = 'unsupported media entity type';
  end if;
  if p_storage_path !~ ('^' || p_entity_type || '/' || p_parent_id::text || '/' || p_image_id::text || '\.(jpg|png|webp)$') then
    raise exception using errcode = '22023', message = 'invalid media storage path';
  end if;
  select count(*) into submitted_image_count
  from unnest(coalesce(p_image_ids, '{}'::uuid[])) as submitted(image_id)
  where submitted.image_id = p_image_id;
  if submitted_image_count <> 1 then
    raise exception using errcode = '22023', message = 'inserted media must appear exactly once in ordering';
  end if;

  execute format('select id from %s where id = $1 for update', parent_table)
  into locked_parent_id using p_parent_id;
  if locked_parent_id is null then
    raise exception using errcode = 'P0002', message = 'media parent not found';
  end if;
  execute format('select count(*) from %s where %I = $1', image_table, parent_fk)
  into image_count using p_parent_id;
  if image_count >= 10 then
    raise exception using errcode = '23514', message = 'media image limit exceeded';
  end if;

  make_primary := p_is_primary or image_count = 0;
  if make_primary then
    execute format('update %s set is_primary = false where %I = $1 and is_primary', image_table, parent_fk)
    using p_parent_id;
  end if;
  execute format(
    'insert into %s (id, %I, storage_bucket, storage_path, caption, alt_text, display_order, is_primary, created_by) values ($1, $2, ''tourism-media'', $3, $4, $5, $6, $7, auth.uid())',
    image_table,
    parent_fk
  ) using p_image_id, p_parent_id, p_storage_path, nullif(btrim(p_caption), ''), btrim(p_alt_text), p_display_order, make_primary;

  if make_primary then
    execute format('update %s set thumbnail_bucket = ''tourism-media'', thumbnail_path = $1, updated_by = auth.uid() where id = $2', parent_table)
    using p_storage_path, p_parent_id;
  else
    execute format('update %s set updated_by = auth.uid() where id = $1', parent_table)
    using p_parent_id;
  end if;
  perform public.media_reorder(p_entity_type, p_parent_id, p_image_ids);
  return p_image_id;
end;
$$;

create or replace function public.media_update(
  p_entity_type text,
  p_parent_id uuid,
  p_image_id uuid,
  p_alt_text text,
  p_caption text,
  p_display_order integer,
  p_is_primary boolean,
  p_image_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_table regclass;
  image_table regclass;
  parent_fk text;
  locked_parent_id uuid;
  image_path text;
  affected integer;
begin
  if not public.is_admin() then raise exception using errcode = '42501', message = 'administrator authorization required'; end if;
  if btrim(coalesce(p_alt_text, '')) = '' or p_display_order < 0 then
    raise exception using errcode = '23514', message = 'invalid media metadata';
  end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk into parent_table, image_table, parent_fk
  from (values
    ('destination', 'public.destinations'::regclass, 'public.destination_images'::regclass, 'destination_id'),
    ('tourism-package', 'public.tourism_packages'::regclass, 'public.package_images'::regclass, 'package_id'),
    ('homestay', 'public.homestays'::regclass, 'public.homestay_images'::regclass, 'homestay_id'),
    ('umkm', 'public.umkms'::regclass, 'public.umkm_images'::regclass, 'umkm_id'),
    ('traditional-house', 'public.traditional_houses'::regclass, 'public.traditional_house_images'::regclass, 'traditional_house_id'),
    ('cultural-event', 'public.cultural_events'::regclass, 'public.cultural_event_images'::regclass, 'cultural_event_id')
  ) as mapping(entity_type, parent_table, image_table, parent_fk) where mapping.entity_type = p_entity_type;
  if parent_table is null then raise exception using errcode = '22023', message = 'unsupported media entity type'; end if;

  execute format('select id from %s where id = $1 for update', parent_table)
  into locked_parent_id using p_parent_id;
  if locked_parent_id is null then raise exception using errcode = 'P0002', message = 'media parent not found'; end if;

  execute format('select storage_path from %s where id = $1 and %I = $2 for update', image_table, parent_fk)
  into image_path using p_image_id, p_parent_id;
  if image_path is null then raise exception using errcode = 'P0002', message = 'media image not found'; end if;
  if p_is_primary then
    execute format('update %s set is_primary = false where %I = $1 and id <> $2 and is_primary', image_table, parent_fk)
    using p_parent_id, p_image_id;
  end if;
  execute format('update %s set alt_text = $1, caption = $2, display_order = $3, is_primary = $4 where id = $5 and %I = $6', image_table, parent_fk)
  using btrim(p_alt_text), nullif(btrim(p_caption), ''), p_display_order, p_is_primary, p_image_id, p_parent_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception using errcode = 'P0002', message = 'media image not found'; end if;

  if p_is_primary then
    execute format('update %s set thumbnail_bucket = ''tourism-media'', thumbnail_path = $1, updated_by = auth.uid() where id = $2', parent_table)
    using image_path, p_parent_id;
  else
    execute format('select storage_path from %s where %I = $1 and is_primary limit 1', image_table, parent_fk)
    into image_path using p_parent_id;
    if image_path is null then
      execute format('update %s set is_primary = true where id = (select id from %s where %I = $1 order by display_order, id limit 1) returning storage_path', image_table, image_table, parent_fk)
      into image_path using p_parent_id;
    end if;
    execute format('update %s set thumbnail_bucket = case when $1 is null then null else ''tourism-media'' end, thumbnail_path = $1, updated_by = auth.uid() where id = $2', parent_table)
    using image_path, p_parent_id;
  end if;
  perform public.media_reorder(p_entity_type, p_parent_id, p_image_ids);
end;
$$;

create or replace function public.media_set_primary(p_entity_type text, p_parent_id uuid, p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_table regclass;
  image_table regclass;
  parent_fk text;
  locked_parent_id uuid;
  image_path text;
begin
  if not public.is_admin() then raise exception using errcode = '42501', message = 'administrator authorization required'; end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk into parent_table, image_table, parent_fk
  from (values
    ('destination', 'public.destinations'::regclass, 'public.destination_images'::regclass, 'destination_id'),
    ('tourism-package', 'public.tourism_packages'::regclass, 'public.package_images'::regclass, 'package_id'),
    ('homestay', 'public.homestays'::regclass, 'public.homestay_images'::regclass, 'homestay_id'),
    ('umkm', 'public.umkms'::regclass, 'public.umkm_images'::regclass, 'umkm_id'),
    ('traditional-house', 'public.traditional_houses'::regclass, 'public.traditional_house_images'::regclass, 'traditional_house_id'),
    ('cultural-event', 'public.cultural_events'::regclass, 'public.cultural_event_images'::regclass, 'cultural_event_id')
  ) as mapping(entity_type, parent_table, image_table, parent_fk) where mapping.entity_type = p_entity_type;
  if parent_table is null then raise exception using errcode = '22023', message = 'unsupported media entity type'; end if;
  execute format('select id from %s where id = $1 for update', parent_table)
  into locked_parent_id using p_parent_id;
  if locked_parent_id is null then raise exception using errcode = 'P0002', message = 'media parent not found'; end if;
  execute format('select storage_path from %s where id = $1 and %I = $2 for update', image_table, parent_fk)
  into image_path using p_image_id, p_parent_id;
  if image_path is null then raise exception using errcode = 'P0002', message = 'media image not found'; end if;
  execute format('update %s set is_primary = false where %I = $1 and is_primary', image_table, parent_fk)
  using p_parent_id;
  execute format('update %s set is_primary = true where id = $1 and %I = $2', image_table, parent_fk)
  using p_image_id, p_parent_id;
  execute format('update %s set thumbnail_bucket = ''tourism-media'', thumbnail_path = $1, updated_by = auth.uid() where id = $2', parent_table)
  using image_path, p_parent_id;
end;
$$;

create or replace function public.media_replace(
  p_entity_type text,
  p_parent_id uuid,
  p_image_id uuid,
  p_storage_path text,
  p_alt_text text,
  p_caption text,
  p_display_order integer,
  p_is_primary boolean,
  p_image_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_table regclass;
  image_table regclass;
  parent_fk text;
  locked_parent_id uuid;
  old_path text;
  primary_path text;
  was_primary boolean;
begin
  if not public.is_admin() then raise exception using errcode = '42501', message = 'administrator authorization required'; end if;
  if btrim(coalesce(p_alt_text, '')) = '' or p_display_order < 0 then raise exception using errcode = '23514', message = 'invalid media metadata'; end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk into parent_table, image_table, parent_fk
  from (values
    ('destination', 'public.destinations'::regclass, 'public.destination_images'::regclass, 'destination_id'),
    ('tourism-package', 'public.tourism_packages'::regclass, 'public.package_images'::regclass, 'package_id'),
    ('homestay', 'public.homestays'::regclass, 'public.homestay_images'::regclass, 'homestay_id'),
    ('umkm', 'public.umkms'::regclass, 'public.umkm_images'::regclass, 'umkm_id'),
    ('traditional-house', 'public.traditional_houses'::regclass, 'public.traditional_house_images'::regclass, 'traditional_house_id'),
    ('cultural-event', 'public.cultural_events'::regclass, 'public.cultural_event_images'::regclass, 'cultural_event_id')
  ) as mapping(entity_type, parent_table, image_table, parent_fk) where mapping.entity_type = p_entity_type;
  if parent_table is null then raise exception using errcode = '22023', message = 'unsupported media entity type'; end if;
  if p_storage_path !~ ('^' || p_entity_type || '/' || p_parent_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$') then
    raise exception using errcode = '22023', message = 'invalid media storage path';
  end if;
  execute format('select id from %s where id = $1 for update', parent_table)
  into locked_parent_id using p_parent_id;
  if locked_parent_id is null then raise exception using errcode = 'P0002', message = 'media parent not found'; end if;
  execute format('select storage_path, is_primary from %s where id = $1 and %I = $2 for update', image_table, parent_fk)
  into old_path, was_primary using p_image_id, p_parent_id;
  if old_path is null then raise exception using errcode = 'P0002', message = 'media image not found'; end if;
  if p_is_primary then
    execute format('update %s set is_primary = false where %I = $1 and id <> $2 and is_primary', image_table, parent_fk)
    using p_parent_id, p_image_id;
  end if;
  execute format('update %s set storage_bucket = ''tourism-media'', storage_path = $1, alt_text = $2, caption = $3, display_order = $4, is_primary = $5 where id = $6 and %I = $7', image_table, parent_fk)
  using p_storage_path, btrim(p_alt_text), nullif(btrim(p_caption), ''), p_display_order, p_is_primary, p_image_id, p_parent_id;
  if p_is_primary then
    execute format('update %s set thumbnail_bucket = ''tourism-media'', thumbnail_path = $1, updated_by = auth.uid() where id = $2', parent_table)
    using p_storage_path, p_parent_id;
  elsif was_primary then
    execute format('select storage_path from %s where %I = $1 and is_primary limit 1', image_table, parent_fk)
    into primary_path using p_parent_id;
    if primary_path is null then
      execute format('update %s set is_primary = true where id = (select id from %s where %I = $1 order by display_order, id limit 1) returning storage_path', image_table, image_table, parent_fk)
      into primary_path using p_parent_id;
      execute format('update %s set thumbnail_bucket = ''tourism-media'', thumbnail_path = $1, updated_by = auth.uid() where id = $2', parent_table)
      using primary_path, p_parent_id;
    end if;
  else
    execute format('update %s set updated_by = auth.uid() where id = $1', parent_table)
    using p_parent_id;
  end if;
  perform public.media_reorder(p_entity_type, p_parent_id, p_image_ids);
  return old_path;
end;
$$;

create or replace function public.media_reorder(p_entity_type text, p_parent_id uuid, p_image_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_table regclass;
  image_table regclass;
  parent_fk text;
  locked_parent_id uuid;
  existing_count integer;
  submitted_count integer;
begin
  if not public.is_admin() then raise exception using errcode = '42501', message = 'administrator authorization required'; end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk into parent_table, image_table, parent_fk
  from (values
    ('destination', 'public.destinations'::regclass, 'public.destination_images'::regclass, 'destination_id'),
    ('tourism-package', 'public.tourism_packages'::regclass, 'public.package_images'::regclass, 'package_id'),
    ('homestay', 'public.homestays'::regclass, 'public.homestay_images'::regclass, 'homestay_id'),
    ('umkm', 'public.umkms'::regclass, 'public.umkm_images'::regclass, 'umkm_id'),
    ('traditional-house', 'public.traditional_houses'::regclass, 'public.traditional_house_images'::regclass, 'traditional_house_id'),
    ('cultural-event', 'public.cultural_events'::regclass, 'public.cultural_event_images'::regclass, 'cultural_event_id')
  ) as mapping(entity_type, parent_table, image_table, parent_fk) where mapping.entity_type = p_entity_type;
  if image_table is null then raise exception using errcode = '22023', message = 'unsupported media entity type'; end if;
  execute format('select id from %s where id = $1 for update', parent_table)
  into locked_parent_id using p_parent_id;
  if locked_parent_id is null then raise exception using errcode = 'P0002', message = 'media parent not found'; end if;
  submitted_count := coalesce(array_length(p_image_ids, 1), 0);
  if submitted_count <> (select count(distinct image_id) from unnest(coalesce(p_image_ids, '{}'::uuid[])) as submitted(image_id)) then
    raise exception using errcode = '22023', message = 'duplicate media image identifier';
  end if;
  execute format('select count(*) from %s where %I = $1', image_table, parent_fk) into existing_count using p_parent_id;
  if existing_count <> submitted_count then raise exception using errcode = '22023', message = 'incomplete media ordering'; end if;
  execute format('select count(*) from %s where %I = $1 and id = any($2)', image_table, parent_fk) into existing_count using p_parent_id, p_image_ids;
  if existing_count <> submitted_count then raise exception using errcode = '22023', message = 'media ownership mismatch'; end if;
  execute format('update %s as image set display_order = ordering.position from (select image_id as id, position::integer - 1 as position from unnest($1) with ordinality as submitted(image_id, position)) as ordering where image.id = ordering.id and image.%I = $2', image_table, parent_fk)
  using p_image_ids, p_parent_id;
  execute format('update %s set updated_by = auth.uid() where id = $1', parent_table) using p_parent_id;
end;
$$;

create or replace function public.media_delete(p_entity_type text, p_parent_id uuid, p_image_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_table regclass;
  image_table regclass;
  parent_fk text;
  locked_parent_id uuid;
  old_path text;
  was_primary boolean;
  fallback_id uuid;
  fallback_path text;
begin
  if not public.is_admin() then raise exception using errcode = '42501', message = 'administrator authorization required'; end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk into parent_table, image_table, parent_fk
  from (values
    ('destination', 'public.destinations'::regclass, 'public.destination_images'::regclass, 'destination_id'),
    ('tourism-package', 'public.tourism_packages'::regclass, 'public.package_images'::regclass, 'package_id'),
    ('homestay', 'public.homestays'::regclass, 'public.homestay_images'::regclass, 'homestay_id'),
    ('umkm', 'public.umkms'::regclass, 'public.umkm_images'::regclass, 'umkm_id'),
    ('traditional-house', 'public.traditional_houses'::regclass, 'public.traditional_house_images'::regclass, 'traditional_house_id'),
    ('cultural-event', 'public.cultural_events'::regclass, 'public.cultural_event_images'::regclass, 'cultural_event_id')
  ) as mapping(entity_type, parent_table, image_table, parent_fk) where mapping.entity_type = p_entity_type;
  if parent_table is null then raise exception using errcode = '22023', message = 'unsupported media entity type'; end if;
  execute format('select id from %s where id = $1 for update', parent_table)
  into locked_parent_id using p_parent_id;
  if locked_parent_id is null then raise exception using errcode = 'P0002', message = 'media parent not found'; end if;
  execute format('select storage_path, is_primary from %s where id = $1 and %I = $2 for update', image_table, parent_fk)
  into old_path, was_primary using p_image_id, p_parent_id;
  if old_path is null then raise exception using errcode = 'P0002', message = 'media image not found'; end if;
  execute format('delete from %s where id = $1 and %I = $2', image_table, parent_fk) using p_image_id, p_parent_id;
  execute format('with ordered as (select id, row_number() over (order by display_order, id)::integer - 1 as new_order from %s where %I = $1) update %s as image set display_order = ordered.new_order from ordered where image.id = ordered.id', image_table, parent_fk, image_table)
  using p_parent_id;
  if was_primary then
    execute format('select id, storage_path from %s where %I = $1 order by display_order, id limit 1', image_table, parent_fk)
    into fallback_id, fallback_path using p_parent_id;
    if fallback_id is not null then
      execute format('update %s set is_primary = (id = $2) where %I = $1', image_table, parent_fk) using p_parent_id, fallback_id;
    end if;
    execute format('update %s set thumbnail_bucket = case when $1 is null then null else ''tourism-media'' end, thumbnail_path = $1, updated_by = auth.uid() where id = $2', parent_table)
    using fallback_path, p_parent_id;
  else
    execute format('update %s set updated_by = auth.uid() where id = $1', parent_table) using p_parent_id;
  end if;
  return old_path;
end;
$$;

alter function public.media_insert(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) owner to postgres;
alter function public.media_update(text, uuid, uuid, text, text, integer, boolean, uuid[]) owner to postgres;
alter function public.media_set_primary(text, uuid, uuid) owner to postgres;
alter function public.media_replace(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) owner to postgres;
alter function public.media_reorder(text, uuid, uuid[]) owner to postgres;
alter function public.media_delete(text, uuid, uuid) owner to postgres;

revoke all on function public.media_insert(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) from public, anon;
revoke all on function public.media_update(text, uuid, uuid, text, text, integer, boolean, uuid[]) from public, anon;
revoke all on function public.media_set_primary(text, uuid, uuid) from public, anon;
revoke all on function public.media_replace(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) from public, anon;
revoke all on function public.media_reorder(text, uuid, uuid[]) from public, anon;
revoke all on function public.media_delete(text, uuid, uuid) from public, anon;
grant execute on function public.media_insert(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) to authenticated;
grant execute on function public.media_update(text, uuid, uuid, text, text, integer, boolean, uuid[]) to authenticated;
grant execute on function public.media_set_primary(text, uuid, uuid) to authenticated;
grant execute on function public.media_replace(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) to authenticated;
grant execute on function public.media_reorder(text, uuid, uuid[]) to authenticated;
grant execute on function public.media_delete(text, uuid, uuid) to authenticated;
