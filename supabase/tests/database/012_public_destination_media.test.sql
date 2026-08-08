begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select is(
  (select public from storage.buckets where id = 'tourism-media'),
  false,
  'public destination delivery keeps the media bucket private'
);
select ok(
  (select routine.prosecdef
     and array_to_string(routine.proconfig, ',') like 'search_path=%'
   from pg_proc as routine
   join pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname = 'can_read_published_media'),
  'federated published media predicate is a fixed-search-path security definer'
);
select ok(
  has_function_privilege(
    'anon',
    'public.can_read_published_media(text)',
    'EXECUTE'
  ),
  'anonymous Storage requests may execute the narrow policy predicate'
);

insert into auth.users (id)
values ('b1000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);

insert into public.destinations (
  id, category_id, name, slug, summary, description, latitude, longitude,
  thumbnail_bucket, thumbnail_path, status, created_by, updated_by
)
values
  (
    'b1100000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Published Public Media',
    'published-public-media',
    'Ringkasan publik',
    'Deskripsi publik',
    -8.27,
    116.42,
    'tourism-media',
    'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg',
    'draft',
    'b1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001'
  ),
  (
    'b1100000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Draft Private Media',
    'draft-private-media',
    'Ringkasan draf',
    'Deskripsi draf',
    -8.28,
    116.43,
    null,
    null,
    'draft',
    'b1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001'
  ),
  (
    'b1100000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Archived Private Media',
    'archived-private-media',
    'Ringkasan arsip',
    'Deskripsi arsip',
    -8.29,
    116.44,
    null,
    null,
    'draft',
    'b1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001'
  );

insert into public.destination_images (
  id, destination_id, storage_bucket, storage_path, alt_text, display_order,
  is_primary, created_by
)
values
  (
    'b1200000-0000-4000-8000-000000000001',
    'b1100000-0000-4000-8000-000000000001',
    'tourism-media',
    'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg',
    'Gambar terbit',
    0,
    true,
    'b1000000-0000-4000-8000-000000000001'
  ),
  (
    'b1200000-0000-4000-8000-000000000002',
    'b1100000-0000-4000-8000-000000000002',
    'tourism-media',
    'destination/b1100000-0000-4000-8000-000000000002/b1200000-0000-4000-8000-000000000002.jpg',
    'Gambar draf',
    0,
    true,
    'b1000000-0000-4000-8000-000000000001'
  ),
  (
    'b1200000-0000-4000-8000-000000000003',
    'b1100000-0000-4000-8000-000000000003',
    'tourism-media',
    'destination/b1100000-0000-4000-8000-000000000003/b1200000-0000-4000-8000-000000000003.jpg',
    'Gambar arsip',
    0,
    true,
    'b1000000-0000-4000-8000-000000000001'
  );

update public.destinations
set status = 'published',
    updated_by = 'b1000000-0000-4000-8000-000000000001'
where id = 'b1100000-0000-4000-8000-000000000001';

update public.destinations
set status = 'archived',
    updated_by = 'b1000000-0000-4000-8000-000000000001'
where id = 'b1100000-0000-4000-8000-000000000003';

insert into storage.objects (id, bucket_id, name)
values
  (
    'b1300000-0000-4000-8000-000000000001',
    'tourism-media',
    'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg'
  ),
  (
    'b1300000-0000-4000-8000-000000000002',
    'tourism-media',
    'destination/b1100000-0000-4000-8000-000000000002/b1200000-0000-4000-8000-000000000002.jpg'
  ),
  (
    'b1300000-0000-4000-8000-000000000003',
    'tourism-media',
    'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000099.jpg'
  ),
  (
    'b1300000-0000-4000-8000-000000000004',
    'tourism-media',
    'destination/b1100000-0000-4000-8000-000000000003/b1200000-0000-4000-8000-000000000003.jpg'
  ),
  (
    'b1300000-0000-4000-8000-000000000005',
    'tourism-media',
    'homestay/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg'
  ),
  (
    'b1300000-0000-4000-8000-000000000006',
    'tourism-media',
    '/destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg'
  );

set local role anon;
select results_eq(
  $$select name from storage.objects where bucket_id = 'tourism-media' order by name$$,
  $$values ('destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg'::text)$$,
  'anonymous Storage selection exposes only database-referenced published destination media'
);
select is(
  (select count(*) from storage.objects where name like '%b1200000-0000-4000-8000-000000000002.jpg'),
  0::bigint,
  'draft destination media remains private'
);
select is(
  (select count(*) from storage.objects where name like '%b1200000-0000-4000-8000-000000000099.jpg'),
  0::bigint,
  'unreferenced objects remain private'
);
select is(
  (select count(*) from storage.objects where name like '%b1200000-0000-4000-8000-000000000003.jpg'),
  0::bigint,
  'archived destination media remains private'
);
select is(
  (select count(*) from storage.objects where name like 'homestay/%'),
  0::bigint,
  'objects from another media entity remain private'
);
select is(
  (select count(*) from storage.objects where name like '/destination/%'),
  0::bigint,
  'unexpected leading slash cannot match an eligible destination path'
);
select throws_ok(
  $$insert into storage.objects (id, bucket_id, name) values ('b1300000-0000-4000-8000-000000000007', 'tourism-media', 'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000007.jpg')$$,
  '42501'::char(5),
  null,
  'public signed-delivery policy grants no upload capability'
);
reset role;

update private.app_config
set administrator_user_id = 'b1000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (select count(*) from storage.objects where bucket_id = 'tourism-media'),
  6::bigint,
  'existing administrator Storage SELECT remains intact'
);
reset role;

update public.destinations
set status = 'archived',
    updated_by = 'b1000000-0000-4000-8000-000000000001'
where id = 'b1100000-0000-4000-8000-000000000001';
set local role anon;
select is(
  (select count(*) from storage.objects where name = 'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg'),
  0::bigint,
  'unpublishing the parent blocks future anonymous Storage selection'
);
reset role;

select * from finish();
rollback;
