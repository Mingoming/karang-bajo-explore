begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

-- The seed baseline must be checked before transaction-local fixtures are added.
select results_eq(
  $$select name from public.destination_categories order by display_order$$,
  $$values ('Alam'::text), ('Budaya'::text), ('Religi'::text)$$,
  'seed contains exactly the three approved destination categories in display order'
);

select is(
  (select count(*) from public.destination_categories),
  3::bigint,
  'seed contains no duplicate destination categories'
);

select is((select count(*) from public.destinations), 0::bigint, 'seed contains no dummy destinations');
select is((select count(*) from public.contacts), 0::bigint, 'seed contains no contacts');
select is((select count(*) from public.cultural_articles), 0::bigint, 'seed contains no cultural claims');
select is(
  (select administrator_user_id from private.app_config where singleton),
  null::uuid,
  'seed does not configure an administrator UUID'
);

insert into auth.users (id)
values
  ('a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002');

-- Authorization function: unset, anonymous, configured administrator, and outsider.
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select is(public.is_admin(), false, 'anonymous user is not the administrator');
reset role;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(public.is_admin(), false, 'authenticated user is not administrator while UUID is unset');
reset role;

update private.app_config
set administrator_user_id = 'a0000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(public.is_admin(), true, 'configured authenticated UUID is the administrator');
reset role;

select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is(public.is_admin(), false, 'another authenticated UUID is not the administrator');
reset role;

-- Establish draft, published, and archived fixtures as the database owner.
insert into public.destinations (
  id,
  category_id,
  name,
  slug,
  summary,
  description,
  latitude,
  longitude,
  thumbnail_bucket,
  thumbnail_path,
  created_by,
  updated_by
)
values
  (
    'd0000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Phase 2C Draft Destination',
    'phase-2c-draft-destination',
    'Test-only draft summary',
    'Test-only draft description',
    -8.35,
    116.42,
    'test-media',
    'phase-2c/draft.webp',
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Phase 2C Published Destination',
    'phase-2c-published-destination',
    'Test-only published summary',
    'Test-only published description',
    -8.36,
    116.43,
    'test-media',
    'phase-2c/published.webp',
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    'Phase 2C Archived Destination',
    'phase-2c-archived-destination',
    'Test-only archived summary',
    'Test-only archived description',
    -8.37,
    116.44,
    'test-media',
    'phase-2c/archived.webp',
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001'
  );

update public.destinations
set status = 'published', updated_by = 'a0000000-0000-4000-8000-000000000001'
where id in (
  'd0000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000003'
);

update public.destinations
set status = 'archived', updated_by = 'a0000000-0000-4000-8000-000000000001'
where id = 'd0000000-0000-4000-8000-000000000003';

-- Anonymous access is limited to approved public-safe projections.
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select throws_ok(
  $$select * from public.destinations$$,
  '42501'::char(5),
  null,
  'anonymous user cannot select managed base-table rows'
);

select throws_ok(
  $$insert into public.destinations (category_id, name, slug, summary, description, latitude, longitude, created_by, updated_by) values ('10000000-0000-4000-8000-000000000001', 'Denied', 'denied', 'Denied', 'Denied', 0, 0, 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5),
  null,
  'anonymous user cannot insert managed content'
);

select throws_ok(
  $$update public.destinations set summary = 'Denied' where id = 'd0000000-0000-4000-8000-000000000002'$$,
  '42501'::char(5),
  null,
  'anonymous user cannot update managed content'
);

select throws_ok(
  $$delete from public.destinations where id = 'd0000000-0000-4000-8000-000000000002'$$,
  '42501'::char(5),
  null,
  'anonymous user cannot delete managed content'
);

select throws_ok(
  $$select * from private.app_config$$,
  '42501'::char(5),
  null,
  'anonymous user cannot access private administrator configuration'
);

select results_eq(
  $$select id from public.published_destinations order by id$$,
  $$values ('d0000000-0000-4000-8000-000000000002'::uuid)$$,
  'anonymous public view returns only the published destination'
);

select is(
  (select count(*) from public.published_destinations where id = 'd0000000-0000-4000-8000-000000000001'),
  0::bigint,
  'anonymous public view does not expose draft rows'
);

select is(
  (select count(*) from public.published_destinations where id = 'd0000000-0000-4000-8000-000000000003'),
  0::bigint,
  'anonymous public view does not expose archived rows'
);

reset role;

-- The configured administrator can manage all lifecycle states but cannot delete parent content.
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select results_eq(
  $$select count(*) from public.destinations where id in ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003')$$,
  array[3::bigint],
  'administrator can read draft, published, and archived base rows'
);

select throws_ok(
  $$update public.destinations set status = 'published', updated_by = 'a0000000-0000-4000-8000-000000000001' where id = 'd0000000-0000-4000-8000-000000000003'$$,
  'P0001',
  'archived content must restore to draft before publication',
  'administrator cannot publish archived content without restoring it to draft first'
);

select lives_ok(
  $$insert into public.destinations (id, category_id, name, slug, summary, description, latitude, longitude, created_by, updated_by) values ('d0000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'Phase 2C Admin Lifecycle', 'phase-2c-admin-lifecycle', 'Test-only lifecycle summary', 'Test-only lifecycle description', -8.38, 116.45, 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001')$$,
  'administrator can insert a draft record'
);

select is(
  (select status::text from public.destinations where id = 'd0000000-0000-4000-8000-000000000010'),
  'draft',
  'new managed content defaults to draft'
);

select lives_ok(
  $$update public.destinations set slug = 'phase-2c-admin-lifecycle-renamed', updated_by = 'a0000000-0000-4000-8000-000000000001' where id = 'd0000000-0000-4000-8000-000000000010'$$,
  'slug may change before first publication'
);

select throws_ok(
  $$update public.destinations set status = 'published', updated_by = 'a0000000-0000-4000-8000-000000000001' where id = 'd0000000-0000-4000-8000-000000000010'$$,
  '23514'::char(5),
  null,
  'publication without the required thumbnail is rejected'
);

select lives_ok(
  $$update public.destinations set thumbnail_bucket = 'test-media', thumbnail_path = 'phase-2c/lifecycle.webp', status = 'published', updated_by = 'a0000000-0000-4000-8000-000000000001' where id = 'd0000000-0000-4000-8000-000000000010'$$,
  'administrator can publish a valid draft'
);

select ok(
  (select published_at is not null from public.destinations where id = 'd0000000-0000-4000-8000-000000000010'),
  'first publication records the publication timestamp'
);

select throws_ok(
  $$update public.destinations set status = 'draft', updated_by = 'a0000000-0000-4000-8000-000000000001' where id = 'd0000000-0000-4000-8000-000000000010'$$,
  'P0001',
  'published content may only remain published or be archived',
  'administrator cannot bypass the published lifecycle transition'
);

select lives_ok(
  $$update public.destinations set status = 'archived', updated_by = 'a0000000-0000-4000-8000-000000000001' where id = 'd0000000-0000-4000-8000-000000000010'$$,
  'administrator can archive published content'
);

select lives_ok(
  $$update public.destinations set status = 'draft', updated_by = 'a0000000-0000-4000-8000-000000000001' where id = 'd0000000-0000-4000-8000-000000000010'$$,
  'administrator can restore archived content to draft'
);

select is(
  (select status::text from public.destinations where id = 'd0000000-0000-4000-8000-000000000010'),
  'draft',
  'restore always returns archived content to draft'
);

select ok(
  (select published_at is not null from public.destinations where id = 'd0000000-0000-4000-8000-000000000010'),
  'archive and restore preserve first-publication history'
);

select throws_ok(
  $$update public.destinations set slug = 'phase-2c-unlocked-slug', updated_by = 'a0000000-0000-4000-8000-000000000001' where id = 'd0000000-0000-4000-8000-000000000010'$$,
  'P0001',
  'slug is immutable after first publication',
  'archive and restore do not unlock a published slug'
);

select throws_ok(
  $$insert into public.destinations (category_id, name, slug, summary, description, latitude, longitude, created_by, updated_by) values ('10000000-0000-4000-8000-000000000001', 'Duplicate Slug', 'phase-2c-published-destination', 'Duplicate slug summary', 'Duplicate slug description', -8.39, 116.46, 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  null,
  'duplicate slugs are rejected'
);

select throws_ok(
  $$delete from public.destinations where id = 'd0000000-0000-4000-8000-000000000010'$$,
  '42501'::char(5),
  null,
  'administrator cannot permanently delete managed parent content'
);

reset role;

-- Another authenticated identity has visitor-equivalent public access only.
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select results_eq(
  $$select count(*) from public.destinations$$,
  array[0::bigint],
  'non-administrator reads no administrative base-table rows'
);

select throws_ok(
  $$insert into public.destinations (category_id, name, slug, summary, description, latitude, longitude, created_by, updated_by) values ('10000000-0000-4000-8000-000000000001', 'Denied Other User', 'denied-other-user', 'Denied', 'Denied', 0, 0, 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002')$$,
  '42501'::char(5),
  null,
  'non-administrator cannot insert managed content'
);

select results_eq(
  $$update public.destinations set summary = 'Denied' where id = 'd0000000-0000-4000-8000-000000000002' returning 1$$,
  $$select 1 where false$$,
  'non-administrator cannot update any managed row'
);

select throws_ok(
  $$delete from public.destinations where id = 'd0000000-0000-4000-8000-000000000002'$$,
  '42501'::char(5),
  null,
  'non-administrator cannot delete managed content'
);

select results_eq(
  $$select id from public.published_destinations order by id$$,
  $$values ('d0000000-0000-4000-8000-000000000002'::uuid)$$,
  'non-administrator sees the same approved public destination as an anonymous visitor'
);

reset role;

select * from finish();
rollback;
