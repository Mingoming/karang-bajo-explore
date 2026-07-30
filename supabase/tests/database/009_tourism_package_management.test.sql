begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id) values
  ('d9000000-0000-4000-8000-000000000001'),
  ('d9000000-0000-4000-8000-000000000002');
update private.app_config set administrator_user_id = 'd9000000-0000-4000-8000-000000000001';

insert into public.destinations (id, category_id, name, slug, summary, description, latitude, longitude, thumbnail_bucket, thumbnail_path, created_by, updated_by)
select 'd9100000-0000-4000-8000-000000000001', id, 'Destination Package Test', 'destination-package-test', 'Ringkasan terverifikasi', 'Deskripsi terverifikasi', -8.27, 116.42, 'test-media', 'destinations/package-test.webp', 'd9000000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000001'
from public.destination_categories where name = 'Alam';
update public.destinations set status = 'published', updated_by = 'd9000000-0000-4000-8000-000000000001' where id = 'd9100000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'd9000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$select public.tourism_package_create('Admin Package Draft', 'admin-package-draft', 'standard', 2, 'hari', 0, null, array['Pemandu'], null, null, 'Deskripsi paket terverifikasi', false, 0, 'draft', '[{"destination_id":"d9100000-0000-4000-8000-000000000001","display_order":0,"notes":"Destinasi pertama"}]'::jsonb)$$,
  'administrator can create a tourism package and ordered destination atomically'
);
select is((select status::text from public.tourism_packages where slug = 'admin-package-draft'), 'draft', 'new tourism package defaults to draft');
select is((select count(*)::integer from public.package_destinations where package_id = (select id from public.tourism_packages where slug = 'admin-package-draft')), 1, 'transactional create persists the submitted destination');

select lives_ok(
  $$select public.tourism_package_update((select id from public.tourism_packages where slug = 'admin-package-draft'), 'Admin Package Draft', 'standard', 2, 'hari', 0, null, array['Pemandu'], null, 'Updated package', 'Deskripsi paket terverifikasi', false, 0, 'draft', '[{"destination_id":"d9100000-0000-4000-8000-000000000001","display_order":0,"notes":"Destinasi pertama"}]'::jsonb)$$,
  'administrator can update package metadata through the transactional RPC'
);
select is((select summary from public.tourism_packages where slug = 'admin-package-draft'), 'Updated package', 'transactional update persists package metadata');

select throws_ok(
  $$select public.tourism_package_create('Invalid Duration', 'invalid-duration', 'budget', 0, 'hari', null, null, '{}', null, null, 'Invalid duration package', false, 0, 'draft', '[]'::jsonb)$$,
  '23514'::char(5), null, 'tourism package RPC rejects non-positive duration'
);
select throws_ok(
  $$select public.tourism_package_create('Invalid Price', 'invalid-price-package', 'budget', 1, 'hari', -1, null, '{}', null, null, 'Invalid price package', false, 0, 'draft', '[]'::jsonb)$$,
  '23514'::char(5), null, 'tourism package RPC rejects negative price'
);

select throws_ok(
  $$select public.tourism_package_update((select id from public.tourism_packages where slug = 'admin-package-draft'), 'Admin Package Draft', 'standard', 2, 'hari', 0, null, array['Pemandu'], null, 'Updated package', 'Deskripsi paket terverifikasi', false, 0, 'published', '[{"destination_id":"d9100000-0000-4000-8000-000000000001","display_order":0,"notes":"Destinasi pertama"}]'::jsonb)$$,
  '23514'::char(5), null, 'tourism package publication without thumbnail is rejected'
);

select lives_ok(
  $$select public.media_insert('tourism-package', (select id from public.tourism_packages where slug = 'admin-package-draft'), 'd9300000-0000-4000-8000-000000000001', 'tourism-package/' || (select id::text from public.tourism_packages where slug = 'admin-package-draft') || '/d9300000-0000-4000-8000-000000000001.webp', 'Test package thumbnail', null, 0, true, array['d9300000-0000-4000-8000-000000000001'::uuid])$$,
  'administrator can attach the required package thumbnail through the unchanged Media RPC'
);
select lives_ok(
  $$select public.tourism_package_update((select id from public.tourism_packages where slug = 'admin-package-draft'), 'Admin Package Draft', 'standard', 2, 'hari', 0, null, array['Pemandu'], null, 'Updated package', 'Deskripsi paket terverifikasi', false, 0, 'published', '[{"destination_id":"d9100000-0000-4000-8000-000000000001","display_order":0,"notes":"Destinasi pertama"}]'::jsonb)$$,
  'administrator can publish a complete tourism package transactionally'
);
select ok((select published_at is not null from public.tourism_packages where slug = 'admin-package-draft'), 'first package publication records publication history');
select is((select count(*)::integer from public.published_tourism_packages where slug = 'admin-package-draft'), 1, 'published package appears in the public-safe view');
select is((select count(*)::integer from public.published_package_destinations where package_id = (select id from public.tourism_packages where slug = 'admin-package-draft')), 1, 'published package destination appears in its public-safe view');

select throws_ok(
  $$delete from public.tourism_packages where slug = 'admin-package-draft'$$,
  '42501'::char(5), null, 'administrator cannot permanently delete a tourism package'
);
select throws_ok(
  $$update public.package_destinations set notes = 'Direct change' where package_id = (select id from public.tourism_packages where slug = 'admin-package-draft')$$,
  '42501'::char(5), null, 'administrator cannot bypass the RPC with a direct relationship update'
);

select lives_ok(
  $$select public.tourism_package_update((select id from public.tourism_packages where slug = 'admin-package-draft'), 'Admin Package Draft', 'standard', 2, 'hari', 0, null, array['Pemandu'], null, 'Updated package', 'Deskripsi paket terverifikasi', false, 0, 'archived', '[{"destination_id":"d9100000-0000-4000-8000-000000000001","display_order":0,"notes":"Destinasi pertama"}]'::jsonb)$$,
  'administrator can archive a published tourism package'
);
select lives_ok(
  $$select public.tourism_package_update((select id from public.tourism_packages where slug = 'admin-package-draft'), 'Admin Package Draft', 'standard', 2, 'hari', 0, null, array['Pemandu'], null, 'Updated package', 'Deskripsi paket terverifikasi', false, 0, 'draft', '[{"destination_id":"d9100000-0000-4000-8000-000000000001","display_order":0,"notes":"Destinasi pertama"}]'::jsonb)$$,
  'administrator can restore an archived package to draft'
);
select is((select count(*)::integer from public.published_tourism_packages where slug = 'admin-package-draft'), 0, 'restored draft package is hidden from public-safe view');

select set_config('request.jwt.claim.sub', 'd9000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.tourism_packages), 0, 'non-administrator cannot read tourism package base rows');
select throws_ok(
  $$select public.tourism_package_create('Denied Package', 'denied-package', 'budget', 1, 'hari', null, null, '{}', null, null, 'Denied', false, 0, 'draft', '[]'::jsonb)$$,
  '42501'::char(5), null, 'non-administrator cannot execute a tourism package mutation'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::integer from public.published_tourism_packages), 0, 'anonymous visitor cannot read draft packages through public-safe view');
select throws_ok($$select * from public.tourism_packages$$, '42501'::char(5), null, 'anonymous visitor cannot select the package base table');
select throws_ok(
  $$select public.tourism_package_create('Anonymous Package', 'anonymous-package', 'budget', 1, 'hari', null, null, '{}', null, null, 'Denied', false, 0, 'draft', '[]'::jsonb)$$,
  '42501'::char(5), null, 'anonymous visitor cannot execute the create RPC'
);

select * from finish();
rollback;
