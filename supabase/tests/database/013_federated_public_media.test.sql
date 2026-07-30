begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select is(
  (select public from storage.buckets where id = 'tourism-media'),
  false,
  'federated public Media keeps tourism-media private'
);
select is(
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'tourism_media_published_select'),
  1::bigint,
  'one federated published Media SELECT policy is active'
);
select is(
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'tourism_media_published_destination_select'),
  0::bigint,
  'the destination-only policy has been retired'
);

insert into auth.users (id)
values ('f0000000-0000-4000-8000-000000000001');

update private.app_config
set administrator_user_id = 'f0000000-0000-4000-8000-000000000001';

insert into public.destinations (
  id, category_id, name, slug, summary, description, latitude, longitude,
  thumbnail_bucket, thumbnail_path, created_by, updated_by
)
values
  ('f1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Federated Destination Published', 'federated-destination-published', 'Ringkasan destinasi terbit', 'Deskripsi destinasi terbit', -8.27, 116.42, 'tourism-media', 'destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000001.jpg', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f1000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Federated Destination Draft', 'federated-destination-draft', 'Ringkasan destinasi draft', 'Deskripsi destinasi draft', -8.27, 116.42, null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f1000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Federated Destination Archived', 'federated-destination-archived', 'Ringkasan destinasi arsip', 'Deskripsi destinasi arsip', -8.27, 116.42, null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001');

insert into public.tourism_packages (
  id, name, slug, package_type, duration_value, duration_unit, summary,
  description, thumbnail_bucket, thumbnail_path, created_by, updated_by
)
values
  ('f2000000-0000-4000-8000-000000000001', 'Federated Package Published', 'federated-package-published', 'standard', 1, 'hari', 'Ringkasan paket terbit', 'Deskripsi paket terbit', 'tourism-media', 'tourism-package/f2000000-0000-4000-8000-000000000001/f2100000-0000-4000-8000-000000000001.jpg', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f2000000-0000-4000-8000-000000000002', 'Federated Package Draft', 'federated-package-draft', 'standard', 1, 'hari', 'Ringkasan paket draft', 'Deskripsi paket draft', null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f2000000-0000-4000-8000-000000000003', 'Federated Package Archived', 'federated-package-archived', 'standard', 1, 'hari', 'Ringkasan paket arsip', 'Deskripsi paket arsip', null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001');

insert into public.homestays (
  id, name, slug, description, thumbnail_bucket, thumbnail_path, created_by, updated_by
)
values
  ('f3000000-0000-4000-8000-000000000001', 'Federated Homestay Published', 'federated-homestay-published', 'Deskripsi homestay terbit', 'tourism-media', 'homestay/f3000000-0000-4000-8000-000000000001/f3100000-0000-4000-8000-000000000001.jpg', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f3000000-0000-4000-8000-000000000002', 'Federated Homestay Draft', 'federated-homestay-draft', 'Deskripsi homestay draft', null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f3000000-0000-4000-8000-000000000003', 'Federated Homestay Archived', 'federated-homestay-archived', 'Deskripsi homestay arsip', null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001');

insert into public.umkms (
  id, business_name, slug, category, description, latitude, longitude,
  thumbnail_bucket, thumbnail_path, created_by, updated_by
)
values
  ('f4000000-0000-4000-8000-000000000001', 'Federated UMKM Published', 'federated-umkm-published', 'Kerajinan', 'Deskripsi UMKM terbit', -8.27, 116.42, 'tourism-media', 'umkm/f4000000-0000-4000-8000-000000000001/f4100000-0000-4000-8000-000000000001.jpg', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f4000000-0000-4000-8000-000000000002', 'Federated UMKM Draft', 'federated-umkm-draft', 'Kerajinan', 'Deskripsi UMKM draft', null, null, null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f4000000-0000-4000-8000-000000000003', 'Federated UMKM Archived', 'federated-umkm-archived', 'Kerajinan', 'Deskripsi UMKM arsip', null, null, null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001');

insert into public.traditional_houses (
  id, name, slug, description, thumbnail_bucket, thumbnail_path, created_by, updated_by
)
values
  ('f5000000-0000-4000-8000-000000000001', 'Federated House Published', 'federated-house-published', 'Deskripsi rumah adat terbit', 'tourism-media', 'traditional-house/f5000000-0000-4000-8000-000000000001/f5100000-0000-4000-8000-000000000001.jpg', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f5000000-0000-4000-8000-000000000002', 'Federated House Draft', 'federated-house-draft', 'Deskripsi rumah adat draft', null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f5000000-0000-4000-8000-000000000003', 'Federated House Archived', 'federated-house-archived', 'Deskripsi rumah adat arsip', null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001');

insert into public.cultural_events (
  id, title, slug, description, start_at, thumbnail_bucket, thumbnail_path,
  created_by, updated_by
)
values
  ('f6000000-0000-4000-8000-000000000001', 'Federated Event Published', 'federated-event-published', 'Deskripsi acara budaya terbit', '2027-01-01 01:00:00+00', 'tourism-media', 'cultural-event/f6000000-0000-4000-8000-000000000001/f6100000-0000-4000-8000-000000000001.jpg', 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f6000000-0000-4000-8000-000000000002', 'Federated Event Draft', 'federated-event-draft', 'Deskripsi acara budaya draft', null, null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001'),
  ('f6000000-0000-4000-8000-000000000003', 'Federated Event Archived', 'federated-event-archived', 'Deskripsi acara budaya arsip', null, null, null, 'f0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001');

insert into public.destination_images (id, destination_id, storage_bucket, storage_path, alt_text, is_primary, created_by)
values
  ('f1100000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'tourism-media', 'destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000001.jpg', 'Destinasi terbit', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f1100000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', 'tourism-media', 'destination/f1000000-0000-4000-8000-000000000002/f1100000-0000-4000-8000-000000000002.jpg', 'Destinasi draft', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f1100000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000003', 'tourism-media', 'destination/f1000000-0000-4000-8000-000000000003/f1100000-0000-4000-8000-000000000003.jpg', 'Destinasi arsip', true, 'f0000000-0000-4000-8000-000000000001');

insert into public.package_images (id, package_id, storage_bucket, storage_path, alt_text, is_primary, created_by)
values
  ('f2100000-0000-4000-8000-000000000001', 'f2000000-0000-4000-8000-000000000001', 'tourism-media', 'tourism-package/f2000000-0000-4000-8000-000000000001/f2100000-0000-4000-8000-000000000001.jpg', 'Paket terbit', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f2100000-0000-4000-8000-000000000002', 'f2000000-0000-4000-8000-000000000002', 'tourism-media', 'tourism-package/f2000000-0000-4000-8000-000000000002/f2100000-0000-4000-8000-000000000002.jpg', 'Paket draft', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f2100000-0000-4000-8000-000000000003', 'f2000000-0000-4000-8000-000000000003', 'tourism-media', 'tourism-package/f2000000-0000-4000-8000-000000000003/f2100000-0000-4000-8000-000000000003.jpg', 'Paket arsip', true, 'f0000000-0000-4000-8000-000000000001');

insert into public.homestay_images (id, homestay_id, storage_bucket, storage_path, alt_text, is_primary, created_by)
values
  ('f3100000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001', 'tourism-media', 'homestay/f3000000-0000-4000-8000-000000000001/f3100000-0000-4000-8000-000000000001.jpg', 'Homestay terbit', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f3100000-0000-4000-8000-000000000002', 'f3000000-0000-4000-8000-000000000002', 'tourism-media', 'homestay/f3000000-0000-4000-8000-000000000002/f3100000-0000-4000-8000-000000000002.jpg', 'Homestay draft', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f3100000-0000-4000-8000-000000000003', 'f3000000-0000-4000-8000-000000000003', 'tourism-media', 'homestay/f3000000-0000-4000-8000-000000000003/f3100000-0000-4000-8000-000000000003.jpg', 'Homestay arsip', true, 'f0000000-0000-4000-8000-000000000001');

insert into public.umkm_images (id, umkm_id, storage_bucket, storage_path, alt_text, is_primary, created_by)
values
  ('f4100000-0000-4000-8000-000000000001', 'f4000000-0000-4000-8000-000000000001', 'tourism-media', 'umkm/f4000000-0000-4000-8000-000000000001/f4100000-0000-4000-8000-000000000001.jpg', 'UMKM terbit', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f4100000-0000-4000-8000-000000000002', 'f4000000-0000-4000-8000-000000000002', 'tourism-media', 'umkm/f4000000-0000-4000-8000-000000000002/f4100000-0000-4000-8000-000000000002.jpg', 'UMKM draft', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f4100000-0000-4000-8000-000000000003', 'f4000000-0000-4000-8000-000000000003', 'tourism-media', 'umkm/f4000000-0000-4000-8000-000000000003/f4100000-0000-4000-8000-000000000003.jpg', 'UMKM arsip', true, 'f0000000-0000-4000-8000-000000000001');

insert into public.traditional_house_images (id, traditional_house_id, storage_bucket, storage_path, alt_text, is_primary, created_by)
values
  ('f5100000-0000-4000-8000-000000000001', 'f5000000-0000-4000-8000-000000000001', 'tourism-media', 'traditional-house/f5000000-0000-4000-8000-000000000001/f5100000-0000-4000-8000-000000000001.jpg', 'Rumah adat terbit', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f5100000-0000-4000-8000-000000000002', 'f5000000-0000-4000-8000-000000000002', 'tourism-media', 'traditional-house/f5000000-0000-4000-8000-000000000002/f5100000-0000-4000-8000-000000000002.jpg', 'Rumah adat draft', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f5100000-0000-4000-8000-000000000003', 'f5000000-0000-4000-8000-000000000003', 'tourism-media', 'traditional-house/f5000000-0000-4000-8000-000000000003/f5100000-0000-4000-8000-000000000003.jpg', 'Rumah adat arsip', true, 'f0000000-0000-4000-8000-000000000001');

insert into public.cultural_event_images (id, cultural_event_id, storage_bucket, storage_path, alt_text, is_primary, created_by)
values
  ('f6100000-0000-4000-8000-000000000001', 'f6000000-0000-4000-8000-000000000001', 'tourism-media', 'cultural-event/f6000000-0000-4000-8000-000000000001/f6100000-0000-4000-8000-000000000001.jpg', 'Acara terbit', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f6100000-0000-4000-8000-000000000002', 'f6000000-0000-4000-8000-000000000002', 'tourism-media', 'cultural-event/f6000000-0000-4000-8000-000000000002/f6100000-0000-4000-8000-000000000002.jpg', 'Acara draft', true, 'f0000000-0000-4000-8000-000000000001'),
  ('f6100000-0000-4000-8000-000000000003', 'f6000000-0000-4000-8000-000000000003', 'tourism-media', 'cultural-event/f6000000-0000-4000-8000-000000000003/f6100000-0000-4000-8000-000000000003.jpg', 'Acara arsip', true, 'f0000000-0000-4000-8000-000000000001');

insert into public.destination_images (id, destination_id, storage_bucket, storage_path, alt_text, created_by)
values ('f1100000-0000-4000-8000-000000000098', 'f1000000-0000-4000-8000-000000000001', 'tourism-media', 'destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000097.jpg', 'Filename tidak sesuai image id', 'f0000000-0000-4000-8000-000000000001');

insert into public.package_destinations (package_id, destination_id, created_by)
values ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001');

update public.destinations set status = 'published' where id = 'f1000000-0000-4000-8000-000000000001';
update public.tourism_packages set status = 'published' where id = 'f2000000-0000-4000-8000-000000000001';
update public.homestays set status = 'published' where id = 'f3000000-0000-4000-8000-000000000001';
update public.umkms set status = 'published' where id = 'f4000000-0000-4000-8000-000000000001';
update public.traditional_houses set status = 'published' where id = 'f5000000-0000-4000-8000-000000000001';
update public.cultural_events set status = 'published' where id = 'f6000000-0000-4000-8000-000000000001';
update public.destinations set status = 'archived' where id = 'f1000000-0000-4000-8000-000000000003';
update public.tourism_packages set status = 'archived' where id = 'f2000000-0000-4000-8000-000000000003';
update public.homestays set status = 'archived' where id = 'f3000000-0000-4000-8000-000000000003';
update public.umkms set status = 'archived' where id = 'f4000000-0000-4000-8000-000000000003';
update public.traditional_houses set status = 'archived' where id = 'f5000000-0000-4000-8000-000000000003';
update public.cultural_events set status = 'archived' where id = 'f6000000-0000-4000-8000-000000000003';

insert into storage.objects (id, bucket_id, name)
select extensions.gen_random_uuid(), 'tourism-media', path
from (values
  ('destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000001.jpg'),
  ('destination/f1000000-0000-4000-8000-000000000002/f1100000-0000-4000-8000-000000000002.jpg'),
  ('destination/f1000000-0000-4000-8000-000000000003/f1100000-0000-4000-8000-000000000003.jpg'),
  ('tourism-package/f2000000-0000-4000-8000-000000000001/f2100000-0000-4000-8000-000000000001.jpg'),
  ('tourism-package/f2000000-0000-4000-8000-000000000002/f2100000-0000-4000-8000-000000000002.jpg'),
  ('tourism-package/f2000000-0000-4000-8000-000000000003/f2100000-0000-4000-8000-000000000003.jpg'),
  ('homestay/f3000000-0000-4000-8000-000000000001/f3100000-0000-4000-8000-000000000001.jpg'),
  ('homestay/f3000000-0000-4000-8000-000000000002/f3100000-0000-4000-8000-000000000002.jpg'),
  ('homestay/f3000000-0000-4000-8000-000000000003/f3100000-0000-4000-8000-000000000003.jpg'),
  ('umkm/f4000000-0000-4000-8000-000000000001/f4100000-0000-4000-8000-000000000001.jpg'),
  ('umkm/f4000000-0000-4000-8000-000000000002/f4100000-0000-4000-8000-000000000002.jpg'),
  ('umkm/f4000000-0000-4000-8000-000000000003/f4100000-0000-4000-8000-000000000003.jpg'),
  ('traditional-house/f5000000-0000-4000-8000-000000000001/f5100000-0000-4000-8000-000000000001.jpg'),
  ('traditional-house/f5000000-0000-4000-8000-000000000002/f5100000-0000-4000-8000-000000000002.jpg'),
  ('traditional-house/f5000000-0000-4000-8000-000000000003/f5100000-0000-4000-8000-000000000003.jpg'),
  ('cultural-event/f6000000-0000-4000-8000-000000000001/f6100000-0000-4000-8000-000000000001.jpg'),
  ('cultural-event/f6000000-0000-4000-8000-000000000002/f6100000-0000-4000-8000-000000000002.jpg'),
  ('cultural-event/f6000000-0000-4000-8000-000000000003/f6100000-0000-4000-8000-000000000003.jpg'),
  ('destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000099.jpg'),
  ('tourism-package/f2000000-0000-4000-8000-000000000001/f2100000-0000-4000-8000-000000000099.jpg'),
  ('homestay/f3000000-0000-4000-8000-000000000001/f3100000-0000-4000-8000-000000000099.jpg'),
  ('umkm/f4000000-0000-4000-8000-000000000001/f4100000-0000-4000-8000-000000000099.jpg'),
  ('traditional-house/f5000000-0000-4000-8000-000000000001/f5100000-0000-4000-8000-000000000099.jpg'),
  ('cultural-event/f6000000-0000-4000-8000-000000000001/f6100000-0000-4000-8000-000000000099.jpg'),
  ('/destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000001.jpg'),
  ('destination/f1000000-0000-4000-8000-000000000009/f1100000-0000-4000-8000-000000000001.jpg'),
  ('homestay/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000001.jpg'),
  ('destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000001.jpg/'),
  ('destination//f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000001.jpg'),
  ('destination\\f1000000-0000-4000-8000-000000000001\\f1100000-0000-4000-8000-000000000001.jpg'),
  ('destination%2Ff1000000-0000-4000-8000-000000000001%2Ff1100000-0000-4000-8000-000000000001.jpg'),
  ('destination%5Cf1000000-0000-4000-8000-000000000001%5Cf1100000-0000-4000-8000-000000000001.jpg'),
  ('destination/f1000000-0000-4000-8000-000000000001/../f1100000-0000-4000-8000-000000000001.jpg'),
  ('destination/f1000000-0000-4000-8000-000000000001/extra/f1100000-0000-4000-8000-000000000001.jpg'),
  ('destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000001.JPG'),
  ('destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000097.jpg')
) as fixture(path);

set local role anon;
select is(
  (select count(*) from storage.objects where bucket_id = 'tourism-media'),
  6::bigint,
  'anonymous sees exactly one published referenced object for every Media entity'
);
select results_eq(
  $$select split_part(name, '/', 1) from storage.objects where bucket_id = 'tourism-media' order by 1$$,
  $$values ('cultural-event'::text), ('destination'), ('homestay'), ('tourism-package'), ('traditional-house'), ('umkm')$$,
  'all six exact published entity prefixes are anonymously selectable'
);
select is(
  (select count(*) from storage.objects where name ~ '/00000000[23]/'),
  0::bigint,
  'draft and archived Media for all six entities are rejected'
);
select is(
  (select count(*) from storage.objects where name like '%000000000099.jpg'),
  0::bigint,
  'orphan objects for all six entities are rejected'
);
select is(
  (select count(*) from storage.objects where name like '/%' or name like 'homestay/f100%' or name like '%2F%' or name like '%5C%' or name like '%..%' or name like '%//%' or name like '%\\%' or name like '%/extra/%' or name like '%.JPG' or name like '%jpg/' or name like '%000000000097.jpg'),
  0::bigint,
  'leading, trailing, duplicate, encoded, backslash, traversal, uppercase, extra-segment, wrong-prefix, and cross-entity paths are rejected'
);
select throws_ok(
  $$insert into storage.objects (id, bucket_id, name) values ('f9000000-0000-4000-8000-000000000001', 'tourism-media', 'destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000009.jpg')$$,
  '42501'::char(5), null, 'anonymous insert is rejected'
);
update storage.objects set name = name || '.moved' where bucket_id = 'tourism-media';
select throws_ok(
  $$delete from storage.objects where bucket_id = 'tourism-media'$$,
  '42501'::char(5),
  'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'anonymous direct SQL delete is rejected by the Storage protection boundary'
);
reset role;

select is(
  (select count(*) from storage.objects where bucket_id = 'tourism-media'),
  36::bigint,
  'anonymous update and delete affect no Media objects'
);

select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (select count(*) from storage.objects where bucket_id = 'tourism-media'),
  36::bigint,
  'administrator retains complete Storage SELECT access'
);
reset role;

update private.app_config set administrator_user_id = null;
set local role authenticated;
select is(
  (select count(*) from storage.objects where bucket_id = 'tourism-media'),
  6::bigint,
  'non-administrator authenticated callers receive the same six published objects'
);
reset role;

update public.tourism_packages set status = 'archived' where id = 'f2000000-0000-4000-8000-000000000001';
update public.destinations set status = 'archived' where id = 'f1000000-0000-4000-8000-000000000001';
update public.homestays set status = 'archived' where id = 'f3000000-0000-4000-8000-000000000001';
update public.umkms set status = 'archived' where id = 'f4000000-0000-4000-8000-000000000001';
update public.traditional_houses set status = 'archived' where id = 'f5000000-0000-4000-8000-000000000001';
update public.cultural_events set status = 'archived' where id = 'f6000000-0000-4000-8000-000000000001';

set local role anon;
select is(
  (select count(*) from storage.objects where bucket_id = 'tourism-media'),
  0::bigint,
  'archiving all six parents removes future public eligibility immediately'
);
reset role;

update public.destinations set status = 'draft' where id = 'f1000000-0000-4000-8000-000000000001';
update public.destinations set status = 'published' where id = 'f1000000-0000-4000-8000-000000000001';
delete from public.destination_images where id = 'f1100000-0000-4000-8000-000000000001';
set local role anon;
select is(
  (select count(*) from storage.objects where name = 'destination/f1000000-0000-4000-8000-000000000001/f1100000-0000-4000-8000-000000000001.jpg'),
  0::bigint,
  'deleting an image row removes future object eligibility'
);
reset role;

select throws_ok(
  $$insert into public.homestay_images (id, homestay_id, storage_bucket, storage_path, alt_text, created_by) values ('f7100000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000002', 'tourism-media', 'destination/f3000000-0000-4000-8000-000000000002/f7100000-0000-4000-8000-000000000001.jpg', 'Cross entity', 'f0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5), null, 'cross-entity image-row path collisions are rejected by constraints'
);

select * from finish();
rollback;
