begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

insert into auth.users (id)
values
  ('c7000000-0000-4000-8000-000000000001'),
  ('c7000000-0000-4000-8000-000000000002');

update private.app_config
set administrator_user_id = 'c7000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$insert into public.cultural_events (id, title, slug, description, start_at, end_at, all_day, latitude, longitude, created_by, updated_by) values ('c7100000-0000-4000-8000-000000000001', 'Admin Event Draft', 'admin-event-draft', 'Verified event description', '2032-08-17 09:00:00+08', '2032-08-17 11:00:00+08', false, -8.27, 116.42, 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000001')$$,
  'administrator can insert a cultural event draft'
);

select is(
  (select status::text from public.cultural_events where id = 'c7100000-0000-4000-8000-000000000001'),
  'draft',
  'new cultural event defaults to draft'
);

select lives_ok(
  $$update public.cultural_events set summary = 'Updated by administrator', updated_by = 'c7000000-0000-4000-8000-000000000001' where id = 'c7100000-0000-4000-8000-000000000001'$$,
  'administrator can update a cultural event'
);

select throws_ok(
  $$insert into public.cultural_events (title, slug, description, latitude, created_by, updated_by) values ('Half Coordinate Event', 'half-coordinate-event', 'Coordinate test', -8.2, 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  null,
  'cultural event rejects an incomplete coordinate pair'
);

select throws_ok(
  $$insert into public.cultural_events (title, slug, description, created_by, updated_by) values ('Duplicate Event Slug', 'admin-event-draft', 'Duplicate slug test', 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  null,
  'cultural event slug remains unique'
);

select throws_ok(
  $$update public.cultural_events set status = 'published', updated_by = 'c7000000-0000-4000-8000-000000000001' where id = 'c7100000-0000-4000-8000-000000000001'$$,
  '23514'::char(5),
  null,
  'cultural event publication without thumbnail metadata is rejected'
);

insert into public.cultural_events (
  id, title, slug, description, date_note, thumbnail_bucket, thumbnail_path, created_by, updated_by
)
values (
  'c7100000-0000-4000-8000-000000000002',
  'Uncertain Date Event',
  'uncertain-date-event-admin',
  'Verified uncertain-date description',
  'Jadwal belum dikonfirmasi',
  'test-media',
  'events/uncertain.webp',
  'c7000000-0000-4000-8000-000000000001',
  'c7000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$update public.cultural_events set status = 'published', updated_by = 'c7000000-0000-4000-8000-000000000001' where id = 'c7100000-0000-4000-8000-000000000002'$$,
  '23514'::char(5),
  null,
  'date-note-only cultural event cannot be published'
);

select throws_ok(
  $$update public.cultural_events set thumbnail_bucket = 'test-media', thumbnail_path = 'events/admin.webp', contact_phone = '08123456789', status = 'published', updated_by = 'c7000000-0000-4000-8000-000000000001' where id = 'c7100000-0000-4000-8000-000000000001'$$,
  '23514'::char(5),
  null,
  'published cultural event contact requires recorded consent'
);

select lives_ok(
  $$update public.cultural_events set thumbnail_bucket = 'test-media', thumbnail_path = 'events/admin.webp', contact_phone = '08123456789', contact_consent_confirmed = true, status = 'published', updated_by = 'c7000000-0000-4000-8000-000000000001' where id = 'c7100000-0000-4000-8000-000000000001'$$,
  'administrator can publish a complete cultural event with consent'
);

select ok(
  (select published_at is not null from public.cultural_events where id = 'c7100000-0000-4000-8000-000000000001'),
  'first cultural event publication records publication history'
);

select lives_ok(
  $$insert into public.cultural_events (id, title, slug, description, start_at, thumbnail_bucket, thumbnail_path, created_by, updated_by) values ('c7100000-0000-4000-8000-000000000003', 'Lifecycle Event', 'lifecycle-event-admin', 'Verified lifecycle event', '2033-01-01 08:00:00+08', 'test-media', 'events/lifecycle.webp', 'c7000000-0000-4000-8000-000000000001', 'c7000000-0000-4000-8000-000000000001')$$,
  'administrator can create a second occurrence as a separate record'
);

select lives_ok(
  $$update public.cultural_events set status = 'archived', updated_by = 'c7000000-0000-4000-8000-000000000001' where id = 'c7100000-0000-4000-8000-000000000003'$$,
  'administrator can archive a draft cultural event'
);

select lives_ok(
  $$update public.cultural_events set status = 'draft', updated_by = 'c7000000-0000-4000-8000-000000000001' where id = 'c7100000-0000-4000-8000-000000000003'$$,
  'administrator can restore an archived cultural event to draft'
);

select throws_ok(
  $$delete from public.cultural_events where id = 'c7100000-0000-4000-8000-000000000003'$$,
  '42501'::char(5),
  null,
  'administrator cannot permanently delete cultural event parent content'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select throws_ok(
  $$select * from public.cultural_events$$,
  '42501'::char(5),
  null,
  'anonymous user cannot read cultural event base-table data'
);

select results_eq(
  $$select id from public.published_cultural_events order by id$$,
  $$values ('c7100000-0000-4000-8000-000000000001'::uuid)$$,
  'anonymous user sees only the confirmed published cultural event'
);

select hasnt_column(
  'public',
  'published_cultural_events',
  'contact_consent_confirmed',
  'public cultural event view omits contact consent metadata'
);

select hasnt_column(
  'public',
  'published_cultural_events',
  'created_by',
  'public cultural event view omits audit UUIDs'
);

reset role;
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select results_eq(
  $$select count(*) from public.cultural_events$$,
  array[0::bigint],
  'authenticated non-administrator cannot read cultural event admin rows'
);

select throws_ok(
  $$insert into public.cultural_events (title, slug, description, created_by, updated_by) values ('Denied Event', 'denied-event', 'Denied', 'c7000000-0000-4000-8000-000000000002', 'c7000000-0000-4000-8000-000000000002')$$,
  '42501'::char(5),
  null,
  'authenticated non-administrator cannot insert cultural events'
);

select results_eq(
  $$update public.cultural_events set summary = 'Denied' where id = 'c7100000-0000-4000-8000-000000000001' returning 1$$,
  $$select 1 where false$$,
  'authenticated non-administrator cannot update cultural events'
);

select results_eq(
  $$select id from public.published_cultural_events order by id$$,
  $$values ('c7100000-0000-4000-8000-000000000001'::uuid)$$,
  'authenticated non-administrator has the same public event access as a visitor'
);

reset role;
select * from finish();
rollback;
