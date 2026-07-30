begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id) values
  ('fa000000-0000-4000-8000-000000000001'),
  ('fa000000-0000-4000-8000-000000000002');
update private.app_config set administrator_user_id = 'fa000000-0000-4000-8000-000000000001';

insert into public.destinations (id, category_id, name, slug, summary, description, latitude, longitude, created_by, updated_by)
select fixture.id, category.id, fixture.name, fixture.slug, 'Ringkasan uji', 'Deskripsi uji', -8.25, 116.4, 'fa000000-0000-4000-8000-000000000001', 'fa000000-0000-4000-8000-000000000001'
from public.destination_categories as category
cross join (values
  ('fa100000-0000-4000-8000-000000000001'::uuid, 'Transactional Destination A', 'transactional-destination-a'),
  ('fa100000-0000-4000-8000-000000000002'::uuid, 'Transactional Destination B', 'transactional-destination-b')
) as fixture(id, name, slug)
where category.name = 'Alam';

select set_config('request.jwt.claim.sub', 'fa000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select ok(not has_table_privilege('authenticated', 'public.tourism_packages', 'INSERT'), 'authenticated role has no direct package insert privilege');
select ok(not has_table_privilege('authenticated', 'public.tourism_packages', 'UPDATE'), 'authenticated role has no direct package update privilege');
select ok(not has_table_privilege('authenticated', 'public.package_destinations', 'INSERT'), 'authenticated role has no direct package-destination insert privilege');
select ok(not has_table_privilege('authenticated', 'public.package_destinations', 'UPDATE'), 'authenticated role has no direct package-destination update privilege');
select ok(not has_table_privilege('authenticated', 'public.package_destinations', 'DELETE'), 'authenticated role has no direct package-destination delete privilege');
select ok(has_function_privilege('authenticated', 'public.tourism_package_create(text,text,public.package_type,integer,text,numeric,text,text[],text,text,text,boolean,integer,public.publication_status,jsonb)', 'EXECUTE'), 'authenticated role may execute the package create RPC');
select ok(has_function_privilege('authenticated', 'public.tourism_package_update(uuid,text,public.package_type,integer,text,numeric,text,text[],text,text,text,boolean,integer,public.publication_status,jsonb)', 'EXECUTE'), 'authenticated role may execute the package update RPC');

select lives_ok(
  $$select public.tourism_package_create('Transactional Package', 'transactional-package', 'standard', 2, 'hari', 0, 'Gratis untuk pengujian', array['Pemandu'], null, 'Ringkasan paket', 'Deskripsi paket', false, 0, 'draft', '[{"destination_id":"fa100000-0000-4000-8000-000000000001","display_order":0,"notes":"Pertama"},{"destination_id":"fa100000-0000-4000-8000-000000000002","display_order":1,"notes":"Kedua"}]'::jsonb)$$,
  'administrator creates a package and complete ordered item set transactionally'
);
select is((select count(*)::integer from public.tourism_packages where slug = 'transactional-package'), 1, 'valid transactional create writes one parent');
select is((select count(*)::integer from public.package_destinations where package_id = (select id from public.tourism_packages where slug = 'transactional-package')), 2, 'valid transactional create writes all children');

select throws_ok(
  $$select public.tourism_package_create('Missing Child Package', 'missing-child-package', 'standard', 1, 'hari', null, null, '{}', null, null, 'Deskripsi paket', false, 0, 'draft', '[{"destination_id":"fa100000-0000-4000-8000-000000000099","display_order":0,"notes":null}]'::jsonb)$$,
  '23503'::char(5), null, 'invalid child rejects the entire create operation'
);
select is((select count(*)::integer from public.tourism_packages where slug = 'missing-child-package'), 0, 'invalid child leaves no created parent');

select throws_ok(
  $$select public.tourism_package_create('Duplicate Child Package', 'duplicate-child-package', 'standard', 1, 'hari', null, null, '{}', null, null, 'Deskripsi paket', false, 0, 'draft', '[{"destination_id":"fa100000-0000-4000-8000-000000000001","display_order":0,"notes":null},{"destination_id":"fa100000-0000-4000-8000-000000000001","display_order":1,"notes":null}]'::jsonb)$$,
  '23505'::char(5), null, 'duplicate destination references are rejected'
);
select is((select count(*)::integer from public.tourism_packages where slug = 'duplicate-child-package'), 0, 'duplicate child rejection leaves no parent');

select throws_ok(
  $$select public.tourism_package_create('Invalid Order Package', 'invalid-order-package', 'standard', 1, 'hari', null, null, '{}', null, null, 'Deskripsi paket', false, 0, 'draft', '[{"destination_id":"fa100000-0000-4000-8000-000000000001","display_order":1,"notes":null}]'::jsonb)$$,
  '23514'::char(5), null, 'non-contiguous destination ordering is rejected'
);
select is((select count(*)::integer from public.tourism_packages where slug = 'invalid-order-package'), 0, 'invalid ordering leaves no parent');

select throws_ok(
  $$select public.tourism_package_update((select id from public.tourism_packages where slug = 'transactional-package'), 'Partially Updated Name', 'standard', 2, 'hari', 0, null, array['Pemandu'], null, 'Changed summary', 'Deskripsi paket', false, 0, 'draft', '[{"destination_id":"fa100000-0000-4000-8000-000000000099","display_order":0,"notes":null}]'::jsonb)$$,
  '23503'::char(5), null, 'invalid update child rejects the entire update operation'
);
select is((select name from public.tourism_packages where slug = 'transactional-package'), 'Transactional Package', 'failed update rolls back parent metadata');
select results_eq(
  $$select destination_id, display_order from public.package_destinations where package_id = (select id from public.tourism_packages where slug = 'transactional-package') order by display_order$$,
  $$values ('fa100000-0000-4000-8000-000000000001'::uuid, 0), ('fa100000-0000-4000-8000-000000000002'::uuid, 1)$$,
  'failed update preserves the complete original relationship set'
);

select lives_ok(
  $$select public.tourism_package_create('Conflicting Package Name', 'conflicting-package-name', 'budget', 1, 'hari', null, null, '{}', null, null, 'Deskripsi paket konflik', false, 2, 'draft', '[]'::jsonb)$$,
  'a second valid package provides a parent-write conflict fixture'
);
select throws_ok(
  $$select public.tourism_package_update((select id from public.tourism_packages where slug = 'transactional-package'), 'Conflicting Package Name', 'standard', 2, 'hari', 0, null, array['Pemandu'], null, 'Changed summary', 'Deskripsi paket', false, 0, 'draft', '[{"destination_id":"fa100000-0000-4000-8000-000000000002","display_order":0,"notes":"Replacement"}]'::jsonb)$$,
  '23505'::char(5), null, 'parent failure after relationship replacement aborts the update'
);
select is((select name from public.tourism_packages where slug = 'transactional-package'), 'Transactional Package', 'late parent failure preserves original metadata');
select results_eq(
  $$select destination_id, display_order from public.package_destinations where package_id = (select id from public.tourism_packages where slug = 'transactional-package') order by display_order$$,
  $$values ('fa100000-0000-4000-8000-000000000001'::uuid, 0), ('fa100000-0000-4000-8000-000000000002'::uuid, 1)$$,
  'late parent failure rolls back the destructive relationship replacement'
);

select lives_ok(
  $$select public.tourism_package_update((select id from public.tourism_packages where slug = 'transactional-package'), 'Transactional Package Updated', 'premium', 3, 'hari', 150000, null, array['Pemandu'], null, 'Updated summary', 'Deskripsi paket diperbarui', true, 1, 'draft', '[{"destination_id":"fa100000-0000-4000-8000-000000000002","display_order":0,"notes":"Sekarang pertama"},{"destination_id":"fa100000-0000-4000-8000-000000000001","display_order":1,"notes":null}]'::jsonb)$$,
  'administrator atomically updates parent metadata and reorders destinations'
);
select is((select name from public.tourism_packages where slug = 'transactional-package'), 'Transactional Package Updated', 'successful update persists parent metadata');
select results_eq(
  $$select destination_id, display_order from public.package_destinations where package_id = (select id from public.tourism_packages where slug = 'transactional-package') order by display_order$$,
  $$values ('fa100000-0000-4000-8000-000000000002'::uuid, 0), ('fa100000-0000-4000-8000-000000000001'::uuid, 1)$$,
  'successful reorder replaces the full ordered relationship set deterministically'
);

select throws_ok(
  $$select public.tourism_package_update('fa200000-0000-4000-8000-000000000099', 'Missing Package', 'standard', 1, 'hari', null, null, '{}', null, null, 'Deskripsi paket', false, 0, 'draft', '[]'::jsonb)$$,
  'P0002'::char(5), null, 'updating a missing package is rejected'
);

select set_config('request.jwt.claim.sub', 'fa000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.tourism_package_create('Non-admin Package', 'non-admin-package', 'standard', 1, 'hari', null, null, '{}', null, null, 'Deskripsi paket', false, 0, 'draft', '[]'::jsonb)$$,
  '42501'::char(5), null, 'authenticated non-administrator is rejected inside the RPC'
);
select is((select count(*)::integer from public.tourism_packages where slug = 'non-admin-package'), 0, 'non-administrator rejection writes nothing');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select public.tourism_package_create('Anonymous Package', 'anonymous-package-rpc', 'standard', 1, 'hari', null, null, '{}', null, null, 'Deskripsi paket', false, 0, 'draft', '[]'::jsonb)$$,
  '42501'::char(5), null, 'unauthenticated caller is rejected');

select * from finish();
rollback;
