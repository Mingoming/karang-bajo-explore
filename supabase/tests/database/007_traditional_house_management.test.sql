begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id)
values
  ('b1000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000002');

update private.app_config
set administrator_user_id = 'b1000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select hasnt_column(
  'public',
  'traditional_houses',
  'contact_phone',
  'traditional-house schema has no unsupported contact field'
);

select hasnt_column(
  'public',
  'traditional_houses',
  'entrance_fee',
  'traditional-house schema has no unsupported entrance-fee field'
);

select hasnt_column(
  'public',
  'traditional_houses',
  'source_note',
  'traditional-house schema has no source-note field'
);

select lives_ok(
  $$insert into public.traditional_houses (id, name, slug, description, history, cultural_significance, visitor_information, created_by, updated_by) values ('b2000000-0000-4000-8000-000000000001', 'Traditional House Management Fixture', 'traditional-house-management-fixture', 'Verified traditional-house description', 'PRIVATE_HISTORY_HOUSE_TEST', 'PRIVATE_CULTURAL_HOUSE_TEST', 'Verified visitor guidance', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001')$$,
  'administrator can insert a valid traditional-house draft'
);

select is(
  (select status::text from public.traditional_houses where id = 'b2000000-0000-4000-8000-000000000001'),
  'draft',
  'new traditional house defaults to draft'
);

select lives_ok(
  $$update public.traditional_houses set summary = 'Verified summary', location_name = 'Karang Bajo', latitude = -8.2, longitude = 116.4, google_maps_url = 'https://maps.google.com/example', is_featured = true, display_order = 2, updated_by = 'b1000000-0000-4000-8000-000000000001' where id = 'b2000000-0000-4000-8000-000000000001'$$,
  'administrator can update supported traditional-house fields'
);

select throws_ok(
  $$insert into public.traditional_houses (name, slug, description, latitude, created_by, updated_by) values ('Incomplete Coordinates House', 'incomplete-coordinates-house', 'Coordinate test', -8.2, 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'traditional house rejects an incomplete coordinate pair'
);

select throws_ok(
  $$insert into public.traditional_houses (name, slug, description, display_order, created_by, updated_by) values ('Negative Order House', 'negative-order-house', 'Order test', -1, 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'traditional house rejects a negative display order'
);

select throws_ok(
  $$insert into public.traditional_houses (name, slug, description, created_by, updated_by) values ('traditional house management fixture', 'duplicate-active-house-name', 'Name test', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  null,
  'active traditional-house names are case-insensitively unique'
);

select throws_ok(
  $$insert into public.traditional_houses (name, slug, description, created_by, updated_by) values ('Duplicate Slug House', 'traditional-house-management-fixture', 'Slug test', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  null,
  'traditional-house slugs are unique'
);

select throws_ok(
  $$update public.traditional_houses set status = 'published', updated_by = 'b1000000-0000-4000-8000-000000000001' where id = 'b2000000-0000-4000-8000-000000000001'$$,
  '23514'::char(5),
  null,
  'traditional-house publication without thumbnail is rejected'
);

select lives_ok(
  $$update public.traditional_houses set thumbnail_bucket = 'test-media', thumbnail_path = 'traditional-houses/fixture.webp', status = 'published', updated_by = 'b1000000-0000-4000-8000-000000000001' where id = 'b2000000-0000-4000-8000-000000000001'$$,
  'administrator can publish a traditional house with thumbnail metadata'
);

select is(
  (select history from public.published_traditional_houses where id = 'b2000000-0000-4000-8000-000000000001'),
  'PRIVATE_HISTORY_HOUSE_TEST',
  'public-safe view exposes published house history'
);

select hasnt_column(
  'public',
  'published_traditional_houses',
  'created_by',
  'public-safe traditional-house view omits creator audit UUID'
);

select hasnt_column(
  'public',
  'published_traditional_houses',
  'status',
  'public-safe traditional-house view omits administrative status'
);

select lives_ok(
  $$update public.traditional_houses set status = 'archived', updated_by = 'b1000000-0000-4000-8000-000000000001' where id = 'b2000000-0000-4000-8000-000000000001'$$,
  'administrator can archive a published traditional house'
);

select lives_ok(
  $$update public.traditional_houses set status = 'draft', updated_by = 'b1000000-0000-4000-8000-000000000001' where id = 'b2000000-0000-4000-8000-000000000001'$$,
  'administrator can restore archived traditional house to draft'
);

select throws_ok(
  $$delete from public.traditional_houses where id = 'b2000000-0000-4000-8000-000000000001'$$,
  '42501'::char(5),
  null,
  'administrator cannot permanently delete traditional-house parent content'
);

reset role;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select is(
  (select count(*) from public.traditional_houses),
  0::bigint,
  'non-administrator cannot read traditional-house base-table data'
);

select throws_ok(
  $$insert into public.traditional_houses (name, slug, description, created_by, updated_by) values ('Denied House', 'denied-house', 'Denied test', 'b1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002')$$,
  '42501'::char(5),
  null,
  'non-administrator cannot insert traditional-house content'
);

select results_eq(
  $$update public.traditional_houses set description = 'Denied' where id = 'b2000000-0000-4000-8000-000000000001' returning 1$$,
  $$select 1 where false$$,
  'non-administrator cannot update traditional-house content'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select throws_ok(
  $$select * from public.traditional_houses$$,
  '42501'::char(5),
  null,
  'anonymous user cannot select traditional-house base table'
);

select is(
  (select count(*) from public.published_traditional_houses where id = 'b2000000-0000-4000-8000-000000000001'),
  0::bigint,
  'restored traditional-house draft is absent from public-safe view'
);

reset role;
select * from finish();
rollback;
