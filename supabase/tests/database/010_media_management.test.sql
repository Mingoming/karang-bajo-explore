begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select is((select public from storage.buckets where id = 'tourism-media'), false, 'tourism media bucket is private');
select is((select file_size_limit from storage.buckets where id = 'tourism-media'), 5242880::bigint, 'tourism media bucket enforces five MiB');
select results_eq(
  $$select unnest(allowed_mime_types) from storage.buckets where id = 'tourism-media' order by 1$$,
  $$values ('image/jpeg'::text), ('image/png'::text), ('image/webp'::text)$$,
  'bucket allows only JPEG, PNG, and WebP'
);

select ok(
  (select bool_and(has_table_privilege('authenticated', 'public.' || table_name, 'SELECT')) from unnest(array[
    'destination_images', 'package_images', 'homestay_images', 'umkm_images', 'traditional_house_images', 'cultural_event_images'
  ]) as tables(table_name)),
  'authenticated retains SELECT on all six supported image tables'
);
select ok(
  (select bool_and(not has_table_privilege('authenticated', 'public.' || table_name, 'INSERT')) from unnest(array[
    'destination_images', 'package_images', 'homestay_images', 'umkm_images', 'traditional_house_images', 'cultural_event_images'
  ]) as tables(table_name)),
  'authenticated has no direct INSERT on all six image tables'
);
select ok(
  (select bool_and(not has_table_privilege('authenticated', 'public.' || table_name, 'UPDATE')) from unnest(array[
    'destination_images', 'package_images', 'homestay_images', 'umkm_images', 'traditional_house_images', 'cultural_event_images'
  ]) as tables(table_name)),
  'authenticated has no direct UPDATE on all six image tables'
);
select ok(
  (select bool_and(not has_table_privilege('authenticated', 'public.' || table_name, 'DELETE')) from unnest(array[
    'destination_images', 'package_images', 'homestay_images', 'umkm_images', 'traditional_house_images', 'cultural_event_images'
  ]) as tables(table_name)),
  'authenticated has no direct DELETE on all six image tables'
);
select results_eq(
  $$select tablename, cmd from pg_policies where schemaname = 'public' and tablename in ('destination_images','package_images','homestay_images','umkm_images','traditional_house_images','cultural_event_images') order by tablename, cmd$$,
  $$values
    ('cultural_event_images'::name, 'SELECT'::text),
    ('destination_images'::name, 'SELECT'::text),
    ('homestay_images'::name, 'SELECT'::text),
    ('package_images'::name, 'SELECT'::text),
    ('traditional_house_images'::name, 'SELECT'::text),
    ('umkm_images'::name, 'SELECT'::text)$$,
  'supported image tables retain only administrator SELECT policies'
);
select ok(
  (select bool_and(not has_function_privilege('anon', routine.oid, 'EXECUTE'))
   from pg_proc as routine
   join pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in ('media_insert', 'media_update', 'media_set_primary', 'media_replace', 'media_reorder', 'media_delete')),
  'anonymous role cannot execute any approved media mutation function'
);
select ok(
  (select bool_and(has_function_privilege('authenticated', routine.oid, 'EXECUTE'))
   from pg_proc as routine
   join pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in ('media_insert', 'media_update', 'media_set_primary', 'media_replace', 'media_reorder', 'media_delete')),
  'authenticated may invoke all approved media functions subject to is_admin'
);
select ok(
  (select count(*) = 6
     and bool_and(routine.prosecdef)
     and bool_and(pg_get_userbyid(routine.proowner) = 'postgres')
     and bool_and(array_to_string(routine.proconfig, ',') like 'search_path=%')
   from pg_proc as routine
   join pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in ('media_insert', 'media_update', 'media_set_primary', 'media_replace', 'media_reorder', 'media_delete')),
  'all six media functions are owner-controlled security definers with a fixed search path'
);
select ok(
  (select count(*) = 6 and bool_and(pg_get_functiondef(routine.oid) like '%public.is_admin()%')
   from pg_proc as routine
   join pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in ('media_insert', 'media_update', 'media_set_primary', 'media_replace', 'media_reorder', 'media_delete')),
  'every approved media mutation function explicitly enforces public.is_admin'
);

insert into auth.users (id) values
  ('a1000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002');
update private.app_config set administrator_user_id = 'a1000000-0000-4000-8000-000000000001';

insert into public.destinations (id, category_id, name, slug, summary, description, latitude, longitude, created_by, updated_by) values
  ('a1100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Media Destination', 'media-destination', 'Ringkasan media', 'Deskripsi media', -8.27, 116.42, 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a1100000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Empty Destination', 'empty-media-destination', 'Ringkasan kosong', 'Deskripsi kosong', -8.28, 116.43, 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001');
insert into public.tourism_packages (id, name, slug, package_type, duration_value, duration_unit, description, created_by, updated_by)
values ('a1500000-0000-4000-8000-000000000001', 'Media Package', 'media-package', 'standard', 1, 'hari', 'Paket media', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001');
insert into public.homestays (id, name, slug, description, created_by, updated_by)
values ('a1400000-0000-4000-8000-000000000001', 'Media Homestay', 'media-homestay', 'Homestay media', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001');
insert into public.umkms (id, business_name, slug, category, description, created_by, updated_by)
values ('a1600000-0000-4000-8000-000000000001', 'Media UMKM', 'media-umkm', 'Tenun', 'UMKM media', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001');
insert into public.traditional_houses (id, name, slug, description, created_by, updated_by)
values ('a1700000-0000-4000-8000-000000000001', 'Media House', 'media-house', 'Rumah media', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001');
insert into public.cultural_events (id, title, slug, description, created_by, updated_by)
values ('a1800000-0000-4000-8000-000000000001', 'Media Event', 'media-event', 'Acara media', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select throws_ok(
  $$insert into storage.objects (id, bucket_id, name) values ('a1300000-0000-4000-8000-000000000001', 'tourism-media', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000001.jpg')$$,
  '42501'::char(5), null, 'anonymous cannot upload private media'
);
select is((select count(*) from storage.objects where bucket_id = 'tourism-media'), 0::bigint, 'anonymous cannot read private media objects');
select throws_ok(
  $$select public.media_insert('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000001.jpg', 'Alt', null, 0, true, array['a1200000-0000-4000-8000-000000000001']::uuid[])$$,
  '42501'::char(5), null, 'anonymous cannot execute media RPC'
);
reset role;

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_ok(
  $$insert into public.destination_images (id, destination_id, storage_bucket, storage_path, alt_text, created_by) values ('a1200000-0000-4000-8000-000000000090', 'a1100000-0000-4000-8000-000000000001', 'tourism-media', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000090.jpg', 'Denied', 'a1000000-0000-4000-8000-000000000002')$$,
  '42501'::char(5), null, 'non-admin direct image insertion is denied'
);
select throws_ok(
  $$select public.media_insert('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000090', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000090.jpg', 'Denied', null, 0, true, array['a1200000-0000-4000-8000-000000000090']::uuid[])$$,
  '42501'::char(5), null, 'non-admin media RPC is denied by is_admin'
);
reset role;

-- Table constraints protect owner-level maintenance and migration mistakes.
select throws_ok(
  $$insert into public.destination_images (id, destination_id, storage_bucket, storage_path, alt_text, created_by) values ('a1200000-0000-4000-8000-000000000091', 'a1100000-0000-4000-8000-000000000001', 'tourism-media', 'limit/0.jpg', 'Malformed', 'a1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5), null, 'malformed direct metadata path is rejected'
);
select throws_ok(
  $$insert into public.destination_images (id, destination_id, storage_bucket, storage_path, alt_text, created_by) values ('a1200000-0000-4000-8000-000000000092', 'a1100000-0000-4000-8000-000000000001', 'tourism-media', 'destination/a1100000-0000-4000-8000-000000000002/a1200000-0000-4000-8000-000000000092.jpg', 'Wrong parent', 'a1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5), null, 'path for another parent is rejected'
);
select throws_ok(
  $$insert into public.destination_images (id, destination_id, storage_bucket, storage_path, alt_text, created_by) values ('a1200000-0000-4000-8000-000000000093', 'a1100000-0000-4000-8000-000000000001', 'tourism-media', 'homestay/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000093.jpg', 'Wrong entity', 'a1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5), null, 'path for another entity is rejected'
);
select throws_ok(
  $$insert into public.destination_images (id, destination_id, storage_bucket, storage_path, alt_text, created_by) values ('a1200000-0000-4000-8000-000000000094', 'a1100000-0000-4000-8000-000000000001', 'another-bucket', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000094.jpg', 'Wrong bucket', 'a1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5), null, 'image metadata is restricted to tourism-media'
);

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id) values ('a1300000-0000-4000-8000-000000000003', 'tourism-media', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000001.jpg', 'a1000000-0000-4000-8000-000000000001')$$,
  'administrator Storage upload remains allowed for a valid path'
);
select throws_ok(
  $$insert into storage.objects (id, bucket_id, name, owner_id) values ('a1300000-0000-4000-8000-000000000004', 'tourism-media', '../escape.svg', 'a1000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5), null, 'Storage policy rejects an invalid path'
);

select throws_ok(
  $$select public.media_insert('unknown', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'unknown/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000001.jpg', 'Alt', null, 0, true, array['a1200000-0000-4000-8000-000000000001']::uuid[])$$,
  '22023'::char(5), null, 'RPC rejects unknown entity types'
);
select throws_ok(
  $$select public.media_insert('destination', 'a1100000-0000-4000-8000-000000000099', 'a1200000-0000-4000-8000-000000000001', 'destination/a1100000-0000-4000-8000-000000000099/a1200000-0000-4000-8000-000000000001.jpg', 'Alt', null, 0, true, array['a1200000-0000-4000-8000-000000000001']::uuid[])$$,
  'P0002', 'media parent not found', 'RPC validates parent ownership'
);
select throws_ok(
  $$select public.media_insert('destination', 'a1100000-0000-4000-8000-000000000002', 'a1200000-0000-4000-8000-000000000099', 'destination/a1100000-0000-4000-8000-000000000002/a1200000-0000-4000-8000-000000000099.jpg', 'Missing order', null, 0, true, '{}'::uuid[])$$,
  '22023'::char(5), 'inserted media must appear exactly once in ordering', 'inserted image must appear exactly once in ordering'
);
select lives_ok(
  $$select public.media_reorder('destination', 'a1100000-0000-4000-8000-000000000002', '{}'::uuid[])$$,
  'empty ordering is accepted only for an empty gallery'
);

select lives_ok(
  $$select public.media_insert('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000001.jpg', 'Gambar utama', null, 0, false, array['a1200000-0000-4000-8000-000000000001']::uuid[])$$,
  'administrator RPC inserts after direct grants are revoked'
);
select lives_ok(
  $$select public.media_insert('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000002', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000002.webp', 'Gambar kedua', 'Caption', 1, false, array['a1200000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000002']::uuid[])$$,
  'second destination image RPC succeeds'
);
select throws_ok(
  $$insert into public.destination_images (id, destination_id, storage_bucket, storage_path, alt_text, created_by) values ('a1200000-0000-4000-8000-000000000095', 'a1100000-0000-4000-8000-000000000001', 'tourism-media', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000095.jpg', 'Direct denied', 'a1000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5), null, 'administrator direct INSERT is denied'
);
select throws_ok(
  $$update public.destination_images set caption = 'Direct denied' where id = 'a1200000-0000-4000-8000-000000000001'$$,
  '42501'::char(5), null, 'administrator direct UPDATE is denied'
);
select throws_ok(
  $$delete from public.destination_images where id = 'a1200000-0000-4000-8000-000000000001'$$,
  '42501'::char(5), null, 'administrator direct DELETE is denied'
);
select is((select count(*) from public.destination_images where destination_id = 'a1100000-0000-4000-8000-000000000001'), 2::bigint, 'administrator SELECT remains available for federated reads');

select lives_ok(
  $$select public.media_update('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000002', 'Gambar kedua diperbarui', null, 0, true, array['a1200000-0000-4000-8000-000000000002','a1200000-0000-4000-8000-000000000001']::uuid[])$$,
  'update atomically changes metadata, order, and primary'
);
select is((select count(*) from public.destination_images where destination_id = 'a1100000-0000-4000-8000-000000000001' and is_primary), 1::bigint, 'update leaves exactly one primary');
select is((select thumbnail_path from public.destinations where id = 'a1100000-0000-4000-8000-000000000001'), 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000002.webp', 'update synchronizes parent thumbnail');
select results_eq(
  $$select id, display_order from public.destination_images where destination_id = 'a1100000-0000-4000-8000-000000000001' order by display_order$$,
  $$values ('a1200000-0000-4000-8000-000000000002'::uuid, 0), ('a1200000-0000-4000-8000-000000000001'::uuid, 1)$$,
  'update normalizes submitted order from zero'
);
select throws_ok(
  $$select public.media_update('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001', 'Alt', null, 0, false, '{}'::uuid[])$$,
  '22023'::char(5), 'incomplete media ordering', 'non-empty gallery rejects an empty ordering array'
);
select throws_ok(
  $$select public.media_replace('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000002', 'destination/a1100000-0000-4000-8000-000000000002/a1200000-0000-4000-8000-000000000004.jpg', 'Wrong parent', null, 0, true, array['a1200000-0000-4000-8000-000000000002','a1200000-0000-4000-8000-000000000001']::uuid[])$$,
  '22023'::char(5), 'invalid media storage path', 'replacement path cannot belong to another parent'
);
select throws_ok(
  $$select public.media_replace('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000002', 'homestay/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000004.jpg', 'Wrong entity', null, 0, true, array['a1200000-0000-4000-8000-000000000002','a1200000-0000-4000-8000-000000000001']::uuid[])$$,
  '22023'::char(5), 'invalid media storage path', 'replacement path cannot belong to another entity'
);
select throws_ok(
  $$select public.media_replace('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000002', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000001.jpg', 'Another image path', null, 0, true, array['a1200000-0000-4000-8000-000000000002','a1200000-0000-4000-8000-000000000001']::uuid[])$$,
  '23505'::char(5), null, 'replacement cannot reuse the storage path owned by another image'
);
select throws_ok(
  $$select public.media_replace('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000002', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000004.jpg', 'Negative', null, -1, true, array['a1200000-0000-4000-8000-000000000002','a1200000-0000-4000-8000-000000000001']::uuid[])$$,
  '23514'::char(5), 'invalid media metadata', 'replacement rejects negative display order'
);
select is(
  public.media_replace('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000002', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000004.jpg', 'Pengganti', 'Baru', 0, true, array['a1200000-0000-4000-8000-000000000002','a1200000-0000-4000-8000-000000000001']::uuid[]),
  'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000002.webp',
  'replace returns the old owned path'
);
select is((select thumbnail_path from public.destinations where id = 'a1100000-0000-4000-8000-000000000001'), 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000004.jpg', 'replace synchronizes primary thumbnail');
select lives_ok(
  $$select public.media_reorder('destination', 'a1100000-0000-4000-8000-000000000001', array['a1200000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000002']::uuid[])$$,
  'reorder succeeds with the complete owned set'
);
select is((select thumbnail_path from public.destinations where id = 'a1100000-0000-4000-8000-000000000001'), 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000004.jpg', 'reorder preserves the selected primary thumbnail');
select lives_ok(
  $$select public.media_set_primary('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001')$$,
  'set-primary selects one owned image'
);
select is((select thumbnail_path from public.destinations where id = 'a1100000-0000-4000-8000-000000000001'), 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000001.jpg', 'set-primary synchronizes thumbnail');
select is(
  public.media_delete('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000002'),
  'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000004.jpg',
  'deleting non-primary returns its storage path'
);
select is((select thumbnail_path from public.destinations where id = 'a1100000-0000-4000-8000-000000000001'), 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000001.jpg', 'deleting non-primary preserves thumbnail');
select lives_ok(
  $$select public.media_insert('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000003', 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000003.png', 'Ketiga', null, 1, true, array['a1200000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000003']::uuid[])$$,
  'another primary image can be inserted transactionally'
);
select lives_ok(
  $$select public.media_delete('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000003')$$,
  'deleting primary succeeds when a fallback exists'
);
select is((select is_primary from public.destination_images where id = 'a1200000-0000-4000-8000-000000000001'), true, 'deleting primary selects lowest-order fallback');
select is((select thumbnail_path from public.destinations where id = 'a1100000-0000-4000-8000-000000000001'), 'destination/a1100000-0000-4000-8000-000000000001/a1200000-0000-4000-8000-000000000001.jpg', 'fallback image updates thumbnail');
select lives_ok(
  $$select public.media_delete('destination', 'a1100000-0000-4000-8000-000000000001', 'a1200000-0000-4000-8000-000000000001')$$,
  'last image metadata can be deleted from draft parent'
);
select ok((select thumbnail_path is null and thumbnail_bucket is null from public.destinations where id = 'a1100000-0000-4000-8000-000000000001'), 'empty gallery clears both thumbnail fields');

-- Every static table mapping receives an administrator RPC smoke test.
select lives_ok(
  $$select public.media_insert('tourism-package', 'a1500000-0000-4000-8000-000000000001', 'a1510000-0000-4000-8000-000000000001', 'tourism-package/a1500000-0000-4000-8000-000000000001/a1510000-0000-4000-8000-000000000001.jpg', 'Paket', null, 0, true, array['a1510000-0000-4000-8000-000000000001']::uuid[])$$,
  'tourism-package mapping works'
);
select lives_ok(
  $$select public.media_insert('homestay', 'a1400000-0000-4000-8000-000000000001', 'a1410000-0000-4000-8000-000000000001', 'homestay/a1400000-0000-4000-8000-000000000001/a1410000-0000-4000-8000-000000000001.jpg', 'Homestay', null, 0, true, array['a1410000-0000-4000-8000-000000000001']::uuid[])$$,
  'homestay mapping works'
);
select lives_ok(
  $$select public.media_insert('umkm', 'a1600000-0000-4000-8000-000000000001', 'a1610000-0000-4000-8000-000000000001', 'umkm/a1600000-0000-4000-8000-000000000001/a1610000-0000-4000-8000-000000000001.jpg', 'UMKM', null, 0, true, array['a1610000-0000-4000-8000-000000000001']::uuid[])$$,
  'umkm mapping works'
);
select lives_ok(
  $$select public.media_insert('traditional-house', 'a1700000-0000-4000-8000-000000000001', 'a1710000-0000-4000-8000-000000000001', 'traditional-house/a1700000-0000-4000-8000-000000000001/a1710000-0000-4000-8000-000000000001.jpg', 'Rumah', null, 0, true, array['a1710000-0000-4000-8000-000000000001']::uuid[])$$,
  'traditional-house mapping works'
);
select lives_ok(
  $$select public.media_insert('cultural-event', 'a1800000-0000-4000-8000-000000000001', 'a1810000-0000-4000-8000-000000000001', 'cultural-event/a1800000-0000-4000-8000-000000000001/a1810000-0000-4000-8000-000000000001.jpg', 'Acara', null, 0, true, array['a1810000-0000-4000-8000-000000000001']::uuid[])$$,
  'cultural-event mapping works'
);

reset role;
-- Owner-level maintenance still cannot bypass path, primary, or count constraints.
with ids as (
  select extensions.gen_random_uuid() as id, value
  from generate_series(1, 9) as value
)
insert into public.homestay_images (id, homestay_id, storage_bucket, storage_path, alt_text, display_order, created_by)
select id, 'a1400000-0000-4000-8000-000000000001', 'tourism-media', 'homestay/a1400000-0000-4000-8000-000000000001/' || id::text || '.jpg', 'Limit ' || value, value, 'a1000000-0000-4000-8000-000000000001'
from ids;
select throws_ok(
  $$with image as (select extensions.gen_random_uuid() as id) insert into public.homestay_images (id, homestay_id, storage_bucket, storage_path, alt_text, display_order, created_by) select id, 'a1400000-0000-4000-8000-000000000001', 'tourism-media', 'homestay/a1400000-0000-4000-8000-000000000001/' || id::text || '.jpg', 'Eleventh', 10, 'a1000000-0000-4000-8000-000000000001' from image$$,
  '23514'::char(5), 'media image limit exceeded', 'database enforces ten images per parent'
);
select throws_ok(
  $$update public.homestay_images set is_primary = true where homestay_id = 'a1400000-0000-4000-8000-000000000001'$$,
  '23505'::char(5), null, 'partial unique index enforces one primary per parent'
);

select * from finish();
rollback;
