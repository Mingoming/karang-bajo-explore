begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id) values
  ('d9000000-0000-4000-8000-000000000001'),
  ('d9000000-0000-4000-8000-000000000002');
update private.app_config set administrator_user_id = 'd9000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', 'd9000000-0000-4000-8000-000000000001', true);
set local role authenticated;

insert into public.destinations (id, category_id, name, slug, summary, description, latitude, longitude, thumbnail_bucket, thumbnail_path, created_by, updated_by)
select 'd9100000-0000-4000-8000-000000000001', id, 'Destination Package Test', 'destination-package-test', 'Ringkasan terverifikasi', 'Deskripsi terverifikasi', -8.27, 116.42, 'test-media', 'destinations/package-test.webp', 'd9000000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000001'
from public.destination_categories where name = 'Alam';
update public.destinations set status = 'published', updated_by = 'd9000000-0000-4000-8000-000000000001' where id = 'd9100000-0000-4000-8000-000000000001';

select lives_ok(
  $$insert into public.tourism_packages (id, name, slug, package_type, duration_value, duration_unit, price, included_facilities, description, created_by, updated_by) values ('d9200000-0000-4000-8000-000000000001', 'Admin Package Draft', 'admin-package-draft', 'standard', 2, 'hari', 0, array['Pemandu'], 'Deskripsi paket terverifikasi', 'd9000000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000001')$$,
  'administrator can insert a tourism package draft'
);
select is((select status::text from public.tourism_packages where id = 'd9200000-0000-4000-8000-000000000001'), 'draft', 'new tourism package defaults to draft');
select lives_ok(
  $$update public.tourism_packages set summary = 'Updated package', updated_by = 'd9000000-0000-4000-8000-000000000001' where id = 'd9200000-0000-4000-8000-000000000001'$$,
  'administrator can update a tourism package'
);
select throws_ok(
  $$insert into public.tourism_packages (name, slug, package_type, duration_value, duration_unit, description, created_by, updated_by) values ('Invalid Duration', 'invalid-duration', 'budget', 0, 'hari', 'Invalid duration package', 'd9000000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5), null, 'tourism package rejects non-positive duration'
);
select throws_ok(
  $$insert into public.tourism_packages (name, slug, package_type, duration_value, duration_unit, price, description, created_by, updated_by) values ('Invalid Price', 'invalid-price-package', 'budget', 1, 'hari', -1, 'Invalid price package', 'd9000000-0000-4000-8000-000000000001', 'd9000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5), null, 'tourism package rejects negative price'
);
select lives_ok(
  $$insert into public.package_destinations (package_id, destination_id, display_order, notes, created_by) values ('d9200000-0000-4000-8000-000000000001', 'd9100000-0000-4000-8000-000000000001', 0, 'Destinasi pertama', 'd9000000-0000-4000-8000-000000000001')$$,
  'administrator can associate an ordered destination'
);
select throws_ok(
  $$update public.tourism_packages set status = 'published', updated_by = 'd9000000-0000-4000-8000-000000000001' where id = 'd9200000-0000-4000-8000-000000000001'$$,
  '23514'::char(5), null, 'tourism package publication without thumbnail is rejected'
);
select lives_ok(
  $$update public.tourism_packages set thumbnail_bucket = 'test-media', thumbnail_path = 'packages/admin.webp', status = 'published', updated_by = 'd9000000-0000-4000-8000-000000000001' where id = 'd9200000-0000-4000-8000-000000000001'$$,
  'administrator can publish a complete tourism package'
);
select ok((select published_at is not null from public.tourism_packages where id = 'd9200000-0000-4000-8000-000000000001'), 'first package publication records publication history');
select is((select count(*)::integer from public.published_tourism_packages where id = 'd9200000-0000-4000-8000-000000000001'), 1, 'published package appears in the public-safe view');
select is((select count(*)::integer from public.published_package_destinations where package_id = 'd9200000-0000-4000-8000-000000000001'), 1, 'published package destination appears in its public-safe view');
select throws_ok(
  $$delete from public.tourism_packages where id = 'd9200000-0000-4000-8000-000000000001'$$,
  '42501'::char(5), null, 'administrator cannot permanently delete a tourism package'
);
select lives_ok(
  $$update public.package_destinations set notes = 'Changed while published' where package_id = 'd9200000-0000-4000-8000-000000000001'$$,
  'notes for an existing published-destination relation may be updated'
);
select lives_ok(
  $$update public.tourism_packages set status = 'archived', updated_by = 'd9000000-0000-4000-8000-000000000001' where id = 'd9200000-0000-4000-8000-000000000001'$$,
  'administrator can archive a published tourism package'
);
select lives_ok(
  $$update public.tourism_packages set status = 'draft', updated_by = 'd9000000-0000-4000-8000-000000000001' where id = 'd9200000-0000-4000-8000-000000000001'$$,
  'administrator can restore an archived package to draft'
);
select is((select count(*)::integer from public.published_tourism_packages where id = 'd9200000-0000-4000-8000-000000000001'), 0, 'restored draft package is hidden from public-safe view');

select set_config('request.jwt.claim.sub', 'd9000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.tourism_packages), 0, 'non-administrator cannot read tourism package base rows');
select throws_ok(
  $$insert into public.tourism_packages (name, slug, package_type, duration_value, duration_unit, description, created_by, updated_by) values ('Denied Package', 'denied-package', 'budget', 1, 'hari', 'Denied', 'd9000000-0000-4000-8000-000000000002', 'd9000000-0000-4000-8000-000000000002')$$,
  '42501'::char(5), null, 'non-administrator cannot insert tourism packages'
);
select is_empty(
  $$with changed as (update public.tourism_packages set summary = 'Denied' returning id) select id from changed$$,
  'non-administrator cannot update tourism packages'
);

reset role;
set local role anon;
select is((select count(*)::integer from public.published_tourism_packages), 0, 'anonymous visitor cannot read draft packages through public-safe view');
select throws_ok($$select * from public.tourism_packages$$, '42501'::char(5), null, 'anonymous visitor cannot select the package base table');

select * from finish();
rollback;
