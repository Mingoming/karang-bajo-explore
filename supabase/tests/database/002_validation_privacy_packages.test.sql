begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

insert into auth.users (id)
values
  ('b0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002');

update private.app_config
set administrator_user_id = 'b0000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
set local role authenticated;

-- Coordinate validation, including required and nullable coordinate pairs.
select lives_ok(
  $$insert into public.homestays (id, name, slug, description, latitude, longitude, created_by, updated_by) values ('e1000000-0000-4000-8000-000000000001', 'Null Coordinate Homestay', 'phase-2c-null-coordinate-homestay', 'Test-only homestay', null, null, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001'), ('e1000000-0000-4000-8000-000000000002', 'Valid Coordinate Homestay', 'phase-2c-valid-coordinate-homestay', 'Test-only homestay', -90, 180, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  'nullable coordinate table accepts both-null and complete valid coordinate pairs'
);

select throws_ok(
  $$insert into public.destinations (category_id, name, slug, summary, description, latitude, created_by, updated_by) values ('10000000-0000-4000-8000-000000000001', 'Incomplete Required Coordinates', 'phase-2c-incomplete-required', 'Coordinate test', 'Coordinate test', -8, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '23502'::char(5),
  null,
  'incomplete required destination coordinate pair is rejected'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, latitude, created_by, updated_by) values ('Latitude Only Homestay', 'phase-2c-latitude-only-homestay', 'Test-only homestay', -8, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'nullable coordinate table rejects latitude without longitude'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, longitude, created_by, updated_by) values ('Longitude Only Homestay', 'phase-2c-longitude-only-homestay', 'Test-only homestay', 116, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'nullable coordinate table rejects longitude without latitude'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, latitude, longitude, created_by, updated_by) values ('Low Latitude Homestay', 'phase-2c-low-latitude-homestay', 'Test-only homestay', -90.01, 116, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'nullable coordinate table rejects latitude below -90'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, latitude, longitude, created_by, updated_by) values ('High Latitude Homestay', 'phase-2c-high-latitude-homestay', 'Test-only homestay', 90.01, 116, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'nullable coordinate table rejects latitude above 90'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, latitude, longitude, created_by, updated_by) values ('Low Longitude Homestay', 'phase-2c-low-longitude-homestay', 'Test-only homestay', -8, -180.01, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'nullable coordinate table rejects longitude below -180'
);

select throws_ok(
  $$insert into public.homestays (name, slug, description, latitude, longitude, created_by, updated_by) values ('High Longitude Homestay', 'phase-2c-high-longitude-homestay', 'Test-only homestay', -8, 180.01, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'nullable coordinate table rejects longitude above 180'
);

-- Draft parent fixture used later to verify child-image visibility.
insert into public.destinations (
  id,
  category_id,
  name,
  slug,
  summary,
  description,
  latitude,
  longitude,
  created_by,
  updated_by
)
values (
  'e0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Draft Coordinate Fixture',
  'phase-2c-draft-coordinate-fixture',
  'Test-only draft summary',
  'Test-only draft description',
  -8,
  116,
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001'
);

-- Numeric price semantics and optional price_note.
select throws_ok(
  $$insert into public.destinations (category_id, name, slug, summary, description, latitude, longitude, entrance_fee, created_by, updated_by) values ('10000000-0000-4000-8000-000000000001', 'Negative Price', 'phase-2c-negative-price', 'Price test', 'Price test', -8, 116, -1, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'negative price is rejected'
);

select lives_ok(
  $$insert into public.destinations (id, category_id, name, slug, summary, description, latitude, longitude, entrance_fee, price_note, created_by, updated_by) values ('e0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Free Destination', 'phase-2c-free-destination', 'Price test', 'Price test', -8, 116, 0, null, 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  'zero price is accepted as free and price_note may be null'
);

select lives_ok(
  $$insert into public.destinations (id, category_id, name, slug, summary, description, latitude, longitude, entrance_fee, price_note, created_by, updated_by) values ('e0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Positive Price Destination', 'phase-2c-positive-price', 'Price test', 'Price test', -8, 116, 25000, 'Harga uji per kunjungan', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  'positive rupiah price and optional price_note are accepted'
);

select lives_ok(
  $$insert into public.destinations (id, category_id, name, slug, summary, description, latitude, longitude, entrance_fee, price_note, created_by, updated_by) values ('e0000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Unavailable Price Destination', 'phase-2c-null-price', 'Price test', 'Price test', -8, 116, null, 'Hubungi pengelola', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  'nullable unavailable price with an explanatory price_note is accepted'
);

-- Event chronology, all-day behavior, uncertainty, and occurrence structure.
select lives_ok(
  $$insert into public.cultural_events (id, title, slug, description, start_at, end_at, thumbnail_bucket, thumbnail_path, created_by, updated_by) values ('e2000000-0000-4000-8000-000000000001', 'Phase 2C Dated Event', 'phase-2c-dated-event', 'Test-only dated occurrence', '2030-01-10 09:00:00+08', '2030-01-10 11:00:00+08', 'test-media', 'phase-2c/event.webp', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  'valid dated event is accepted'
);

select throws_ok(
  $$insert into public.cultural_events (title, slug, description, start_at, end_at, created_by, updated_by) values ('Invalid Event Range', 'phase-2c-invalid-event-range', 'Test-only invalid occurrence', '2030-01-10 11:00:00+08', '2030-01-10 09:00:00+08', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'event end before start is rejected'
);

select lives_ok(
  $$insert into public.cultural_events (id, title, slug, description, start_at, all_day, thumbnail_bucket, thumbnail_path, created_by, updated_by) values ('e2000000-0000-4000-8000-000000000002', 'Phase 2C All-Day Event', 'phase-2c-all-day-event', 'Test-only all-day occurrence', '2030-02-01 00:00:00+08', true, 'test-media', 'phase-2c/all-day.webp', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  'all-day event is accepted'
);

insert into public.cultural_events (
  id, title, slug, description, date_note, thumbnail_bucket, thumbnail_path, created_by, updated_by
)
values (
  'e2000000-0000-4000-8000-000000000003',
  'Phase 2C Uncertain Event',
  'phase-2c-uncertain-event',
  'Test-only uncertain occurrence',
  'Tanggal belum dikonfirmasi untuk pengujian',
  'test-media',
  'phase-2c/uncertain.webp',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$update public.cultural_events set status = 'published', updated_by = 'b0000000-0000-4000-8000-000000000001' where id = 'e2000000-0000-4000-8000-000000000003'$$,
  '23514'::char(5),
  null,
  'uncertain-date event cannot be published'
);

select hasnt_column('public', 'cultural_events', 'recurrence_rule', 'event schema has no recurrence rule');
select hasnt_column('public', 'cultural_events', 'recurrence_pattern', 'event schema has no recurrence pattern');

select lives_ok(
  $$insert into public.cultural_events (title, slug, description, start_at, created_by, updated_by) values ('Repeated Occurrence Title', 'phase-2c-occurrence-one', 'First test occurrence', '2030-03-01 09:00:00+08', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001'), ('Repeated Occurrence Title', 'phase-2c-occurrence-two', 'Second test occurrence', '2030-04-01 09:00:00+08', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$$,
  'separate event occurrences may share a title while retaining separate records and slugs'
);

select is(
  (select count(*) from public.cultural_events where title = 'Repeated Occurrence Title'),
  2::bigint,
  'each event occurrence is stored as a separate record'
);

-- Representative publication media rules and optional child galleries.
select lives_ok(
  $$update public.cultural_events set status = 'published', updated_by = 'b0000000-0000-4000-8000-000000000001' where id = 'e2000000-0000-4000-8000-000000000001'$$,
  'valid event with a thumbnail can be published'
);

insert into public.cultural_articles (
  id,
  title,
  slug,
  summary,
  content,
  source_note,
  thumbnail_bucket,
  thumbnail_path,
  created_by,
  updated_by
)
values (
  'e3000000-0000-4000-8000-000000000001',
  'Phase 2C Privacy Article',
  'phase-2c-privacy-article',
  'Test-only public summary',
  'Test-only public content',
  'PRIVATE_SOURCE_NOTE_PHASE_2C',
  'test-media',
  'phase-2c/article.webp',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001'
);

select lives_ok(
  $$update public.cultural_articles set status = 'published', updated_by = 'b0000000-0000-4000-8000-000000000001' where id = 'e3000000-0000-4000-8000-000000000001'$$,
  'image-dependent article can publish with a thumbnail and no optional child gallery rows'
);

select is(
  (select count(*) from public.cultural_article_images where cultural_article_id = 'e3000000-0000-4000-8000-000000000001'),
  0::bigint,
  'additional gallery images remain optional'
);

-- Child-image public visibility follows its parent publication status.
select lives_ok(
  $$select public.media_insert('destination', 'e0000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000001', 'destination/e0000000-0000-4000-8000-000000000001/e4000000-0000-4000-8000-000000000001.webp', 'Test-only draft child image', null, 0, true, array['e4000000-0000-4000-8000-000000000001'::uuid])$$,
  'administrator adds the draft child image through the approved media RPC'
);

select lives_ok(
  $$select public.media_insert('destination', 'e0000000-0000-4000-8000-000000000002', 'e4000000-0000-4000-8000-000000000002', 'destination/e0000000-0000-4000-8000-000000000002/e4000000-0000-4000-8000-000000000002.webp', 'Test-only published child image', null, 0, true, array['e4000000-0000-4000-8000-000000000002'::uuid])$$,
  'administrator adds the published child image through the approved media RPC'
);

update public.destinations
set thumbnail_bucket = 'test-media',
    thumbnail_path = 'phase-2c/free-thumbnail.webp',
    status = 'published',
    updated_by = 'b0000000-0000-4000-8000-000000000001'
where id = 'e0000000-0000-4000-8000-000000000002';

select set_config('request.jwt.claim.sub', '', true);
reset role;
set local role anon;

select results_eq(
  $$select id from public.published_destination_images where id in ('e4000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000002') order by id$$,
  $$values ('e4000000-0000-4000-8000-000000000002'::uuid)$$,
  'public child-image view exposes only children of published parents'
);

select hasnt_column('public', 'published_cultural_articles', 'source_note', 'public article view omits source_note');
select hasnt_column('public', 'published_cultural_articles', 'created_by', 'public article view omits creator audit UUID');
select hasnt_column('public', 'published_cultural_articles', 'updated_by', 'public article view omits updater audit UUID');
select hasnt_column('public', 'published_destinations', 'contact_consent_confirmed', 'public destination view omits consent metadata');

select ok(
  position(
    'PRIVATE_SOURCE_NOTE_PHASE_2C'
    in (select row_to_json(article)::text from public.published_cultural_articles as article where id = 'e3000000-0000-4000-8000-000000000001')
  ) = 0,
  'recognizable private source note does not leak through the public article projection'
);

select ok(
  position(
    'PRIVATE_SOURCE_NOTE_PHASE_2C'
    in coalesce((select string_agg(row_to_json(image)::text, '') from public.published_cultural_article_images as image), '')
  ) = 0,
  'recognizable private source note does not leak through public child joins'
);

reset role;

-- Consent is required before optional entity contact details can be published.
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
set local role authenticated;

insert into public.destinations (
  id,
  category_id,
  name,
  slug,
  summary,
  description,
  latitude,
  longitude,
  contact_name,
  contact_phone,
  thumbnail_bucket,
  thumbnail_path,
  created_by,
  updated_by
)
values (
  'e0000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000001',
  'Consent Destination',
  'phase-2c-consent-destination',
  'Consent test summary',
  'Consent test description',
  -8,
  116,
  'PRIVATE_CONTACT_NAME_PHASE_2C',
  'PRIVATE_CONTACT_PHONE_PHASE_2C',
  'test-media',
  'phase-2c/consent.webp',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$update public.destinations set status = 'published', updated_by = 'b0000000-0000-4000-8000-000000000001' where id = 'e0000000-0000-4000-8000-000000000005'$$,
  '23514'::char(5),
  null,
  'entity contact details cannot be published without recorded consent'
);

select lives_ok(
  $$update public.destinations set contact_consent_confirmed = true, status = 'published', updated_by = 'b0000000-0000-4000-8000-000000000001' where id = 'e0000000-0000-4000-8000-000000000005'$$,
  'entity contact details can be published after consent is recorded'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select is(
  (select contact_name from public.published_destinations where id = 'e0000000-0000-4000-8000-000000000005'),
  'PRIVATE_CONTACT_NAME_PHASE_2C',
  'consented contact name appears in the approved public projection'
);

select is(
  (select contact_phone from public.published_destinations where id = 'e0000000-0000-4000-8000-000000000005'),
  'PRIVATE_CONTACT_PHONE_PHASE_2C',
  'consented contact phone appears in the approved public projection'
);

reset role;

-- Package relationship integrity and explicitly omitted Version 1 structures.
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
-- These assertions describe underlying table constraints. Application clients
-- cannot use these direct writes after the transactional package RPC migration.
reset role;

insert into public.tourism_packages (
  id,
  name,
  slug,
  package_type,
  duration_value,
  duration_unit,
  description,
  created_by,
  updated_by
)
values (
  'e5000000-0000-4000-8000-000000000001',
  'Phase 2C Package',
  'phase-2c-package',
  'standard',
  1,
  'hari',
  'Test-only package description',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001'
);

select lives_ok(
  $$insert into public.package_destinations (id, package_id, destination_id, display_order, notes, created_by) values ('e6000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 1, 'Test-only package context', 'b0000000-0000-4000-8000-000000000001')$$,
  'valid package-destination relation is accepted'
);

select throws_ok(
  $$insert into public.package_destinations (package_id, destination_id, display_order, created_by) values ('e5000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 2, 'b0000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  null,
  'duplicate destination relation in one package is rejected'
);

select lives_ok(
  $$insert into public.package_destinations (package_id, destination_id, display_order, created_by) values ('e5000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', 1, 'b0000000-0000-4000-8000-000000000001')$$,
  'duplicate package display order is accepted because the documented schema does not constrain it as unique'
);

select throws_ok(
  $$insert into public.package_destinations (package_id, destination_id, display_order, created_by) values ('e5000000-0000-4000-8000-000000000099', 'e0000000-0000-4000-8000-000000000003', 3, 'b0000000-0000-4000-8000-000000000001')$$,
  '23503'::char(5),
  null,
  'invalid package foreign key is rejected'
);

select throws_ok(
  $$insert into public.package_destinations (package_id, destination_id, display_order, created_by) values ('e5000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000099', 3, 'b0000000-0000-4000-8000-000000000001')$$,
  '23503'::char(5),
  null,
  'invalid destination foreign key is rejected'
);

select hasnt_column('public', 'tourism_packages', 'participant_limit', 'package has no participant-limit field');
select hasnt_column('public', 'tourism_packages', 'minimum_participants', 'package has no minimum-participant field');
select hasnt_column('public', 'package_destinations', 'activity', 'package stop has no structured activity field');
select hasnt_column('public', 'package_destinations', 'duration', 'package stop has no duration-per-stop field');
select hasnt_column('public', 'package_destinations', 'duration_minutes', 'package stop has no structured stop-duration field');

reset role;

-- The logical schema has no separate internal_note field; source_note is the approved private note field.
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'internal_note'
  ),
  0::bigint,
  'no undocumented internal_note column exists in the public application schema'
);

select * from finish();
rollback;
