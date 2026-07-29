begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

insert into auth.users (id)
values
  ('a1000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002');

update private.app_config
set administrator_user_id = 'a1000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select hasnt_column('public', 'umkms', 'price', 'UMKM schema has no unsupported price field');
select hasnt_column('public', 'umkms', 'products', 'UMKM schema has no structured products field');

select lives_ok(
  $$insert into public.umkms (id, business_name, slug, category, description, owner_name, contact_phone, created_by, updated_by) values ('a2000000-0000-4000-8000-000000000001', 'UMKM Management Fixture', 'umkm-management-fixture', 'Kerajinan', 'Verified UMKM description', 'PRIVATE_UMKM_OWNER', 'PRIVATE_UMKM_PHONE', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001')$$,
  'administrator can insert a valid UMKM draft'
);
select is((select status::text from public.umkms where id = 'a2000000-0000-4000-8000-000000000001'), 'draft', 'new UMKM defaults to draft');
select lives_ok(
  $$update public.umkms set address = 'Karang Bajo', latitude = -8.2, longitude = 116.4, display_order = 2, updated_by = 'a1000000-0000-4000-8000-000000000001' where id = 'a2000000-0000-4000-8000-000000000001'$$,
  'administrator can update supported UMKM fields'
);
select throws_ok(
  $$insert into public.umkms (business_name, slug, category, description, latitude, created_by, updated_by) values ('Incomplete Coordinates', 'incomplete-coordinates-umkm', 'Kerajinan', 'Coordinate test', -8.2, 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5), null, 'UMKM rejects an incomplete coordinate pair'
);
select throws_ok(
  $$insert into public.umkms (business_name, slug, category, description, display_order, created_by, updated_by) values ('Negative Order UMKM', 'negative-order-umkm', 'Kerajinan', 'Order test', -1, 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5), null, 'UMKM rejects a negative display order'
);
select throws_ok(
  $$insert into public.umkms (business_name, slug, category, description, created_by, updated_by) values ('umkm management fixture', 'duplicate-active-umkm-name', 'Kerajinan', 'Name test', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5), null, 'active UMKM names are case-insensitively unique'
);
select throws_ok(
  $$insert into public.umkms (business_name, slug, category, description, created_by, updated_by) values ('Duplicate Slug UMKM', 'umkm-management-fixture', 'Kerajinan', 'Slug test', 'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5), null, 'UMKM slugs are unique'
);
select throws_ok(
  $$update public.umkms set status = 'published', updated_by = 'a1000000-0000-4000-8000-000000000001' where id = 'a2000000-0000-4000-8000-000000000001'$$,
  '23514'::char(5), null, 'UMKM publication without thumbnail is rejected'
);

insert into public.umkms (
  business_name,
  slug,
  category,
  description,
  thumbnail_bucket,
  thumbnail_path,
  created_by,
  updated_by
)
values (
  'Unreachable UMKM',
  'unreachable-umkm',
  'Kerajinan',
  'Publication reachability test',
  'test-media',
  'umkms/unreachable.webp',
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$update public.umkms set status = 'published', updated_by = 'a1000000-0000-4000-8000-000000000001' where slug = 'unreachable-umkm'$$,
  '23514'::char(5), null, 'UMKM publication requires coordinates, phone, or WhatsApp'
);

select throws_ok(
  $$update public.umkms set thumbnail_bucket = 'test-media', thumbnail_path = 'umkms/fixture.webp', status = 'published', updated_by = 'a1000000-0000-4000-8000-000000000001' where id = 'a2000000-0000-4000-8000-000000000001'$$,
  '23514'::char(5), null, 'UMKM contact publication without consent is rejected'
);
select lives_ok(
  $$update public.umkms set thumbnail_bucket = 'test-media', thumbnail_path = 'umkms/fixture.webp', contact_consent_confirmed = true, status = 'published', updated_by = 'a1000000-0000-4000-8000-000000000001' where id = 'a2000000-0000-4000-8000-000000000001'$$,
  'administrator can publish reachable UMKM with thumbnail and consent'
);
select is((select owner_name from public.published_umkms where id = 'a2000000-0000-4000-8000-000000000001'), 'PRIVATE_UMKM_OWNER', 'public-safe view exposes consented owner data');
select hasnt_column('public', 'published_umkms', 'contact_consent_confirmed', 'public-safe UMKM view omits consent metadata');
select hasnt_column('public', 'published_umkms', 'created_by', 'public-safe UMKM view omits audit UUIDs');
select lives_ok(
  $$update public.umkms set status = 'archived', updated_by = 'a1000000-0000-4000-8000-000000000001' where id = 'a2000000-0000-4000-8000-000000000001'$$,
  'administrator can archive a published UMKM'
);
select lives_ok(
  $$update public.umkms set status = 'draft', updated_by = 'a1000000-0000-4000-8000-000000000001' where id = 'a2000000-0000-4000-8000-000000000001'$$,
  'administrator can restore archived UMKM to draft'
);
select throws_ok(
  $$delete from public.umkms where id = 'a2000000-0000-4000-8000-000000000001'$$,
  '42501'::char(5), null, 'administrator cannot permanently delete UMKM parent content'
);

reset role;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((select count(*) from public.umkms), 0::bigint, 'non-administrator cannot read UMKM base-table data');
select throws_ok(
  $$insert into public.umkms (business_name, slug, category, description, created_by, updated_by) values ('Denied UMKM', 'denied-umkm', 'Kerajinan', 'Denied test', 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002')$$,
  '42501'::char(5), null, 'non-administrator cannot insert UMKM content'
);
select results_eq(
  $$update public.umkms set description = 'Denied' where id = 'a2000000-0000-4000-8000-000000000001' returning 1$$,
  $$select 1 where false$$,
  'non-administrator cannot update UMKM content'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select throws_ok($$select * from public.umkms$$, '42501'::char(5), null, 'anonymous user cannot select the UMKM base table');
select is((select count(*) from public.published_umkms where id = 'a2000000-0000-4000-8000-000000000001'), 0::bigint, 'restored draft UMKM is absent from public-safe view');

reset role;
select * from finish();
rollback;
