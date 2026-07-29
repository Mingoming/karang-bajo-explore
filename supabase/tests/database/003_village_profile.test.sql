begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

insert into auth.users (id)
values ('c0000000-0000-4000-8000-000000000001');

update private.app_config
set administrator_user_id = 'c0000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$insert into public.village_profiles (id, name, slug, latitude, longitude, created_by, updated_by) values ('c1000000-0000-4000-8000-000000000001', 'Profil Desa Uji', 'profil-desa-uji', null, null, 'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')$$,
  'administrator can create the singleton village profile with nullable coordinates'
);

select is(
  (select status::text from public.village_profiles where id = 'c1000000-0000-4000-8000-000000000001'),
  'draft',
  'new village profile defaults to draft'
);

select throws_ok(
  $$insert into public.village_profiles (name, slug, created_by, updated_by) values ('Profil Desa Kedua', 'profil-desa-kedua', 'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  null,
  'singleton constraint rejects a second village profile'
);

select throws_ok(
  $$update public.village_profiles set latitude = -8.2, longitude = null, updated_by = 'c0000000-0000-4000-8000-000000000001' where id = 'c1000000-0000-4000-8000-000000000001'$$,
  '23514'::char(5),
  null,
  'village profile rejects an incomplete nullable coordinate pair'
);

select lives_ok(
  $$update public.village_profiles set description = 'Deskripsi profil desa untuk pengujian.', status = 'published', updated_by = 'c0000000-0000-4000-8000-000000000001' where id = 'c1000000-0000-4000-8000-000000000001'$$,
  'administrator can publish a valid village profile'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select results_eq(
  $$select id from public.published_village_profiles$$,
  $$values ('c1000000-0000-4000-8000-000000000001'::uuid)$$,
  'anonymous visitor reads the published singleton only through the public-safe view'
);

select throws_ok(
  $$select * from public.village_profiles$$,
  '42501'::char(5),
  null,
  'anonymous visitor cannot read the village profile base table'
);

reset role;

select * from finish();
rollback;
