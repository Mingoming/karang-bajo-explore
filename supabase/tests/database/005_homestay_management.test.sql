begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

insert into auth.users (id)
values
  ('f1000000-0000-4000-8000-000000000001'),
  ('f1000000-0000-4000-8000-000000000002');

update private.app_config
set administrator_user_id = 'f1000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select hasnt_column(
  'public',
  'homestays',
  'capacity',
  'homestay schema has no unsupported capacity field'
);

select lives_ok(
  $$insert into public.homestays (id, name, slug, owner_name, phone, description, created_by, updated_by) values ('f2000000-0000-4000-8000-000000000001', 'Homestay Management Fixture', 'homestay-management-fixture', 'PRIVATE_OWNER_HOMESTAY_TEST', 'PRIVATE_PHONE_HOMESTAY_TEST', 'Verified homestay management description', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001')$$,
  'administrator can insert a valid homestay draft'
);

select is(
  (select status::text from public.homestays where id = 'f2000000-0000-4000-8000-000000000001'),
  'draft',
  'new homestay defaults to draft'
);

select lives_ok(
  $$update public.homestays set address = 'Karang Bajo', latitude = -8.2, longitude = 116.4, price_per_night = 0, price_note = 'Test-only price note', facilities = array['Air minum', 'Kamar mandi']::text[], display_order = 2, updated_by = 'f1000000-0000-4000-8000-000000000001' where id = 'f2000000-0000-4000-8000-000000000001'$$,
  'administrator can update supported homestay fields'
);

select is(
  (select facilities from public.homestays where id = 'f2000000-0000-4000-8000-000000000001'),
  array['Air minum', 'Kamar mandi']::text[],
  'homestay facilities preserve the submitted text array order'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, price_per_night, created_by, updated_by) values ('Negative Price Homestay', 'negative-price-homestay', 'Negative price test', -1, 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'homestay rejects a negative nightly price'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, display_order, created_by, updated_by) values ('Negative Order Homestay', 'negative-order-homestay', 'Negative order test', -1, 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'homestay rejects a negative display order'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, created_by, updated_by) values ('homestay management fixture', 'duplicate-active-homestay-name', 'Duplicate active name test', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  null,
  'active homestay names are unique without regard to case'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, created_by, updated_by) values ('Duplicate Slug Homestay', 'homestay-management-fixture', 'Duplicate slug test', 'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  null,
  'homestay slugs are unique'
);

select throws_ok(
  $$update public.homestays set status = 'published', updated_by = 'f1000000-0000-4000-8000-000000000001' where id = 'f2000000-0000-4000-8000-000000000001'$$,
  '23514'::char(5),
  null,
  'homestay publication without required thumbnail metadata is rejected'
);

select throws_ok(
  $$update public.homestays set thumbnail_bucket = 'test-media', thumbnail_path = 'homestays/fixture.webp', status = 'published', updated_by = 'f1000000-0000-4000-8000-000000000001' where id = 'f2000000-0000-4000-8000-000000000001'$$,
  '23514'::char(5),
  null,
  'homestay contact publication without consent is rejected'
);

select lives_ok(
  $$update public.homestays set thumbnail_bucket = 'test-media', thumbnail_path = 'homestays/fixture.webp', contact_consent_confirmed = true, status = 'published', updated_by = 'f1000000-0000-4000-8000-000000000001' where id = 'f2000000-0000-4000-8000-000000000001'$$,
  'administrator can publish a valid homestay with contact consent and thumbnail metadata'
);

select is(
  (select owner_name from public.published_homestays where id = 'f2000000-0000-4000-8000-000000000001'),
  'PRIVATE_OWNER_HOMESTAY_TEST',
  'public-safe homestay view exposes consented owner data'
);

select hasnt_column(
  'public',
  'published_homestays',
  'contact_consent_confirmed',
  'public-safe homestay view omits consent metadata'
);

select hasnt_column(
  'public',
  'published_homestays',
  'created_by',
  'public-safe homestay view omits creator audit UUID'
);

select lives_ok(
  $$update public.homestays set status = 'archived', updated_by = 'f1000000-0000-4000-8000-000000000001' where id = 'f2000000-0000-4000-8000-000000000001'$$,
  'administrator can archive a published homestay'
);

select lives_ok(
  $$update public.homestays set status = 'draft', updated_by = 'f1000000-0000-4000-8000-000000000001' where id = 'f2000000-0000-4000-8000-000000000001'$$,
  'administrator can restore an archived homestay to draft'
);

select throws_ok(
  $$delete from public.homestays where id = 'f2000000-0000-4000-8000-000000000001'$$,
  '42501'::char(5),
  null,
  'administrator cannot permanently delete homestay parent content'
);

reset role;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select is(
  (select count(*) from public.homestays),
  0::bigint,
  'non-administrator cannot read homestay base-table data'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, created_by, updated_by) values ('Denied Homestay', 'denied-homestay', 'Denied insert test', 'f1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002')$$,
  '42501'::char(5),
  null,
  'non-administrator cannot insert homestay content'
);

select results_eq(
  $$update public.homestays set description = 'Denied update' where id = 'f2000000-0000-4000-8000-000000000001' returning 1$$,
  $$select 1 where false$$,
  'non-administrator cannot update homestay content'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select throws_ok(
  $$select * from public.homestays$$,
  '42501'::char(5),
  null,
  'anonymous user cannot select the homestay base table'
);

select is(
  (select count(*) from public.published_homestays where id = 'f2000000-0000-4000-8000-000000000001'),
  0::bigint,
  'restored draft homestay is absent from the public-safe view'
);

reset role;

select * from finish();
rollback;
