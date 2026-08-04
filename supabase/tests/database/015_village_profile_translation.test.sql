begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

select has_table('public', 'village_profile_translations', 'village profile translation table exists');
select columns_are(
  'public',
  'village_profile_translations',
  array[
    'id',
    'village_profile_id',
    'locale',
    'name',
    'summary',
    'description',
    'history',
    'vision',
    'mission',
    'address',
    'status',
    'source_updated_at_at_publish',
    'published_at',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by'
  ],
  'translation table exposes the approved columns only'
);
select col_type_is('public', 'village_profile_translations', 'id', 'uuid', 'translation identifier uses uuid');
select col_type_is('public', 'village_profile_translations', 'village_profile_id', 'uuid', 'source identifier uses uuid');
select col_type_is('public', 'village_profile_translations', 'locale', 'text', 'locale uses text');
select col_type_is('public', 'village_profile_translations', 'status', 'publication_status', 'translation reuses publication status enum');
select col_type_is('public', 'village_profile_translations', 'source_updated_at_at_publish', 'timestamp with time zone', 'source review marker uses timestamptz');
select col_type_is('public', 'village_profile_translations', 'created_by', 'uuid', 'created audit identity uses uuid');
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.village_profile_translations'::regclass),
  'RLS is enabled on the translation base table'
);
select is(
  (select count(*)::integer from pg_catalog.pg_constraint where conrelid = 'public.village_profile_translations'::regclass and contype = 'f' and confrelid = 'public.village_profiles'::regclass),
  1,
  'translation has a strong foreign key to village profile'
);
select is(
  (
    select confdeltype::text
    from pg_catalog.pg_constraint
    where conrelid = 'public.village_profile_translations'::regclass
      and contype = 'f'
      and confrelid = 'public.village_profiles'::regclass
  ),
  'r',
  'source foreign key uses ON DELETE RESTRICT'
);
select is(
  (select count(*)::integer from pg_catalog.pg_constraint where conrelid = 'public.village_profile_translations'::regclass and contype = 'u'),
  1,
  'one translation per source and locale is enforced'
);

insert into auth.users (id)
values
  ('e0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000002');

update private.app_config
set administrator_user_id = 'e0000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
set local role authenticated;

insert into public.village_profiles (
  id,
  name,
  slug,
  summary,
  description,
  history,
  vision,
  mission,
  address,
  latitude,
  longitude,
  google_maps_url,
  created_by,
  updated_by
)
values (
  'e1000000-0000-4000-8000-000000000001',
  'NAMA_INDONESIA_RAHASIA_DARI_VIEW_EN',
  'profil-desa-terjemahan',
  'RINGKASAN_INDONESIA_RAHASIA_DARI_VIEW_EN',
  'DESKRIPSI_INDONESIA_RAHASIA_DARI_VIEW_EN',
  'SEJARAH_INDONESIA_RAHASIA_DARI_VIEW_EN',
  'VISI_INDONESIA_RAHASIA_DARI_VIEW_EN',
  'MISI_INDONESIA_RAHASIA_DARI_VIEW_EN',
  'ALAMAT_INDONESIA_RAHASIA_DARI_VIEW_EN',
  -8.35,
  116.17,
  'https://maps.google.com/?q=-8.35,116.17',
  'e0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001'
);

select is(
  (select count(*)::integer from public.published_english_village_profiles),
  0,
  'missing translation is absent from the English public view'
);

select lives_ok(
  $$select * from public.village_profile_translation_save_draft(
    'e1000000-0000-4000-8000-000000000001',
    null,
    'English summary',
    'English description',
    'English history',
    'English vision',
    'English mission',
    'English address'
  )$$,
  'administrator can create an incomplete draft through the trusted RPC'
);
select is(
  (select status::text from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'),
  'draft',
  'new translation defaults to draft'
);
select ok(
  (
    select name is null
      and description = 'English description'
    from public.village_profile_translations
    where village_profile_id = 'e1000000-0000-4000-8000-000000000001'
  ),
  'draft translation may be incomplete'
);
select is(
  (select count(*)::integer from public.published_english_village_profiles),
  0,
  'draft translation is absent from the English public view'
);

reset role;

update public.village_profiles
set status = 'published',
    updated_by = 'e0000000-0000-4000-8000-000000000001'
where id = 'e1000000-0000-4000-8000-000000000001';

select throws_ok(
  $$insert into public.village_profile_translations (village_profile_id, locale, created_by, updated_by) values ('e1000000-0000-4000-8000-000000000001', 'id', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001')$$,
  '23514'::char(5),
  'unsupported translation locale',
  'locale constraint rejects values other than en'
);
select throws_ok(
  $$insert into public.village_profile_translations (village_profile_id, locale, created_by, updated_by) values ('e1000000-0000-4000-8000-000000000001', 'en', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001')$$,
  '23505'::char(5),
  'duplicate key value violates unique constraint "village_profile_translations_source_locale_key"',
  'duplicate source and locale is rejected'
);
select throws_ok(
  $$insert into public.village_profile_translations (village_profile_id, locale, created_by, updated_by) values ('e1999999-0000-4000-8000-000000000001', 'en', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001')$$,
  '23503'::char(5),
  'insert or update on table "village_profile_translations" violates foreign key constraint "village_profile_translations_village_profile_id_fkey"',
  'foreign key prevents attachment to a missing source profile'
);

select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  '23514'::char(5),
  'required English translation fields are incomplete',
  'publication rejects blank English name'
);

select lives_ok(
  $$select * from public.village_profile_translation_save_draft(
    'e1000000-0000-4000-8000-000000000001',
    'Karang Bajo Village',
    'English summary',
    ' ',
    'English history',
    'English vision',
    'English mission',
    'English address'
  )$$,
  'administrator can retain a draft with a blank-normalized description'
);
select throws_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  '23514'::char(5),
  'required English translation fields are incomplete',
  'publication rejects blank English description'
);

select lives_ok(
  $$select * from public.village_profile_translation_save_draft('e1000000-0000-4000-8000-000000000001', 'Karang Bajo Village', null, 'English description', 'English history', 'English vision', 'English mission', 'English address')$$,
  'draft may omit English summary'
);
select throws_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  '23514'::char(5),
  'English summary is required for this source',
  'publication requires English summary when Indonesian summary is populated'
);

select lives_ok(
  $$select * from public.village_profile_translation_save_draft('e1000000-0000-4000-8000-000000000001', 'Karang Bajo Village', 'English summary', 'English description', null, 'English vision', 'English mission', 'English address')$$,
  'draft may omit English history'
);
select throws_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  '23514'::char(5),
  'English history is required for this source',
  'publication requires English history when Indonesian history is populated'
);

select lives_ok(
  $$select * from public.village_profile_translation_save_draft('e1000000-0000-4000-8000-000000000001', 'Karang Bajo Village', 'English summary', 'English description', 'English history', null, 'English mission', 'English address')$$,
  'draft may omit English vision'
);
select throws_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  '23514'::char(5),
  'English vision is required for this source',
  'publication requires English vision when Indonesian vision is populated'
);

select lives_ok(
  $$select * from public.village_profile_translation_save_draft('e1000000-0000-4000-8000-000000000001', 'Karang Bajo Village', 'English summary', 'English description', 'English history', 'English vision', null, 'English address')$$,
  'draft may omit English mission'
);
select throws_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  '23514'::char(5),
  'English mission is required for this source',
  'publication requires English mission when Indonesian mission is populated'
);

select lives_ok(
  $$select * from public.village_profile_translation_save_draft('e1000000-0000-4000-8000-000000000001', 'Karang Bajo Village', 'English summary', 'English description', 'English history', 'English vision', 'English mission', null)$$,
  'draft may omit English address'
);
select throws_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  '23514'::char(5),
  'English address is required for this source',
  'publication requires English address when Indonesian address is populated'
);

select lives_ok(
  $$select * from public.village_profile_translation_save_draft(
    'e1000000-0000-4000-8000-000000000001',
    'Karang Bajo Village',
    'English summary',
    'English description',
    'English history',
    'English vision',
    'English mission',
    'English address'
  )$$,
  'administrator can save a complete English draft'
);

reset role;

update public.village_profiles
set status = 'archived',
    updated_by = 'e0000000-0000-4000-8000-000000000001'
where id = 'e1000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claim.sub',
  'e0000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  '23514'::char(5),
  'source village profile must be published',
  'publication rejects an unpublished Indonesian source'
);

reset role;

update public.village_profiles
set status = 'draft',
    updated_by = 'e0000000-0000-4000-8000-000000000001'
where id = 'e1000000-0000-4000-8000-000000000001';

update public.village_profiles
set status = 'published',
    updated_by = 'e0000000-0000-4000-8000-000000000001'
where id = 'e1000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claim.sub',
  'e0000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  'administrator can publish a complete translation for a published source'
);
select is(
  (
    select translation.source_updated_at_at_publish
    from public.village_profile_translations as translation
    where translation.village_profile_id = 'e1000000-0000-4000-8000-000000000001'
  ),
  (select source.updated_at from public.village_profiles as source where source.id = 'e1000000-0000-4000-8000-000000000001'),
  'publication captures the current source updated_at server-side'
);
select ok(
  (select published_at is not null from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'),
  'first publication records published_at'
);
select is(
  (select count(*)::integer from public.published_english_village_profiles),
  1,
  'current published English translation is publicly visible'
);

create temporary table first_publication_time as
select published_at
from public.village_profile_translations
where village_profile_id = 'e1000000-0000-4000-8000-000000000001';

select throws_ok(
  $$update public.village_profile_translations set source_updated_at_at_publish = clock_timestamp() where village_profile_id = 'e1000000-0000-4000-8000-000000000001'$$,
  '42501'::char(5),
  'permission denied for table village_profile_translations',
  'administrator cannot inject a source review timestamp through direct table update'
);
select throws_ok(
  $$delete from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'$$,
  '42501'::char(5),
  'permission denied for table village_profile_translations',
  'application deletion is denied to the administrator'
);

reset role;

select throws_ok(
  $$update public.village_profile_translations set name = 'Unreviewed edit' where village_profile_id = 'e1000000-0000-4000-8000-000000000001'$$,
  '55000'::char(5),
  'only draft translations may be edited',
  'published translatable fields cannot be edited even by a table owner path'
);
select throws_ok(
  $$update public.village_profile_translations set status = 'draft' where village_profile_id = 'e1000000-0000-4000-8000-000000000001'$$,
  '23514'::char(5),
  'invalid translation lifecycle transition',
  'published translation cannot bypass the archive-before-draft transition'
);

select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
set local role authenticated;

update public.village_profiles
set name = 'Nama Indonesia yang diperbarui',
    updated_by = 'e0000000-0000-4000-8000-000000000001'
where id = 'e1000000-0000-4000-8000-000000000001';

select is(
  (select count(*)::integer from public.published_english_village_profiles),
  0,
  'editing the Indonesian source immediately hides stale English content'
);

update public.village_profiles
set status = 'archived',
    updated_by = 'e0000000-0000-4000-8000-000000000001'
where id = 'e1000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::integer from public.published_english_village_profiles),
  0,
  'archiving the Indonesian source keeps English content hidden'
);

update public.village_profiles
set status = 'draft',
    updated_by = 'e0000000-0000-4000-8000-000000000001'
where id = 'e1000000-0000-4000-8000-000000000001';
update public.village_profiles
set status = 'published',
    updated_by = 'e0000000-0000-4000-8000-000000000001'
where id = 'e1000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::integer from public.published_english_village_profiles),
  0,
  'source restoration and republication do not expose a stale translation'
);

select lives_ok(
  $$select * from public.village_profile_translation_archive((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  'administrator can archive a published translation'
);
select is(
  (select count(*)::integer from public.published_english_village_profiles),
  0,
  'archived translation is absent from the English public view'
);
select lives_ok(
  $$select * from public.village_profile_translation_restore((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  'administrator can restore an archived translation to draft'
);
select ok(
  (
    select status = 'draft'::public.publication_status
      and source_updated_at_at_publish is null
      and published_at = (select published_at from first_publication_time)
    from public.village_profile_translations
    where village_profile_id = 'e1000000-0000-4000-8000-000000000001'
  ),
  'restore returns to draft, clears review marker, and preserves first publication time'
);
select is(
  (select count(*)::integer from public.published_english_village_profiles),
  0,
  'restoring a translation does not republish it'
);
select lives_ok(
  $$select * from public.village_profile_translation_save_draft('e1000000-0000-4000-8000-000000000001', 'Karang Bajo Village', 'English summary', 'English description', 'English history', 'English vision', 'English mission', 'English address')$$,
  'explicit review can save the restored draft'
);
select lives_ok(
  $$select * from public.village_profile_translation_publish((select id from public.village_profile_translations where village_profile_id = 'e1000000-0000-4000-8000-000000000001'))$$,
  'explicit review can republish the current translation'
);
select ok(
  (
    select published_at = (select published_at from first_publication_time)
      and source_updated_at_at_publish = (select updated_at from public.village_profiles where id = 'e1000000-0000-4000-8000-000000000001')
    from public.village_profile_translations
    where village_profile_id = 'e1000000-0000-4000-8000-000000000001'
  ),
  'republication preserves first published_at and refreshes the source marker'
);
select is(
  (select count(*)::integer from public.published_english_village_profiles),
  1,
  'explicit review and republication restore English visibility'
);
select results_eq(
  $$select name, summary, description, history, vision, mission, address from public.published_english_village_profiles$$,
  $$values ('Karang Bajo Village'::text, 'English summary'::text, 'English description'::text, 'English history'::text, 'English vision'::text, 'English mission'::text, 'English address'::text)$$,
  'public view exposes approved English fields without Indonesian descriptive fallback'
);

reset role;

select is(
  (
    select array_agg(column_name::name order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'published_english_village_profiles'
  ),
  array['id', 'name', 'summary', 'description', 'history', 'vision', 'mission', 'address', 'latitude', 'longitude', 'google_maps_url', 'published_at']::name[],
  'English public view has the approved column allowlist only'
);
select ok(
  (
    select bool_and(coalesce(array_to_string(proconfig, ','), '') in ('search_path=""', 'search_path=pg_catalog'))
    from pg_catalog.pg_proc
    where oid in (
      'private.enforce_village_profile_translation_lifecycle()'::regprocedure,
      'public.village_profile_translation_save_draft(uuid,text,text,text,text,text,text,text)'::regprocedure,
      'public.village_profile_translation_publish(uuid)'::regprocedure,
      'public.village_profile_translation_archive(uuid)'::regprocedure,
      'public.village_profile_translation_restore(uuid)'::regprocedure
    )
  ),
  'all translation security functions use an explicit safe search_path'
);
select ok(
  (
    select bool_and(pg_get_functiondef(oid) !~* '\mexecute\M')
    from pg_catalog.pg_proc
    where oid in (
      'private.enforce_village_profile_translation_lifecycle()'::regprocedure,
      'public.village_profile_translation_save_draft(uuid,text,text,text,text,text,text,text)'::regprocedure,
      'public.village_profile_translation_publish(uuid)'::regprocedure,
      'public.village_profile_translation_archive(uuid)'::regprocedure,
      'public.village_profile_translation_restore(uuid)'::regprocedure
    )
  ),
  'translation security functions contain no dynamic SQL'
);
select ok(has_table_privilege('authenticated', 'public.village_profile_translations', 'SELECT'), 'authenticated role receives base-table select for RLS-filtered administration');
select ok(not has_table_privilege('authenticated', 'public.village_profile_translations', 'INSERT'), 'authenticated role has no direct translation insert privilege');
select ok(not has_table_privilege('authenticated', 'public.village_profile_translations', 'UPDATE'), 'authenticated role has no direct translation update privilege');
select ok(not has_table_privilege('authenticated', 'public.village_profile_translations', 'DELETE'), 'authenticated role has no translation delete privilege');
select ok(not has_table_privilege('anon', 'public.village_profile_translations', 'SELECT'), 'anonymous role has no base-table select privilege');
select ok(has_table_privilege('anon', 'public.published_english_village_profiles', 'SELECT'), 'anonymous role may select the English public-safe view');
select ok(has_table_privilege('authenticated', 'public.published_english_village_profiles', 'SELECT'), 'authenticated role may select the English public-safe view');
select ok(not has_table_privilege('anon', 'public.published_english_village_profiles', 'INSERT'), 'anonymous role has no insert privilege on the English public-safe view');
select ok(not has_table_privilege('anon', 'public.published_english_village_profiles', 'UPDATE'), 'anonymous role has no update privilege on the English public-safe view');
select ok(not has_table_privilege('anon', 'public.published_english_village_profiles', 'DELETE'), 'anonymous role has no delete privilege on the English public-safe view');
select ok(not has_table_privilege('authenticated', 'public.published_english_village_profiles', 'INSERT'), 'authenticated role has no insert privilege on the English public-safe view');
select ok(not has_table_privilege('authenticated', 'public.published_english_village_profiles', 'UPDATE'), 'authenticated role has no update privilege on the English public-safe view');
select ok(not has_table_privilege('authenticated', 'public.published_english_village_profiles', 'DELETE'), 'authenticated role has no delete privilege on the English public-safe view');
select ok(has_function_privilege('authenticated', 'public.village_profile_translation_save_draft(uuid,text,text,text,text,text,text,text)', 'EXECUTE'), 'authenticated role may call the draft RPC subject to administrator authorization');
select ok(has_function_privilege('authenticated', 'public.village_profile_translation_publish(uuid)', 'EXECUTE'), 'authenticated role may call the publish RPC subject to administrator authorization');
select ok(has_function_privilege('authenticated', 'public.village_profile_translation_archive(uuid)', 'EXECUTE'), 'authenticated role may call the archive RPC subject to administrator authorization');
select ok(has_function_privilege('authenticated', 'public.village_profile_translation_restore(uuid)', 'EXECUTE'), 'authenticated role may call the restore RPC subject to administrator authorization');
select ok(not has_function_privilege('anon', 'public.village_profile_translation_save_draft(uuid,text,text,text,text,text,text,text)', 'EXECUTE'), 'anonymous role cannot execute the draft RPC');
select ok(not has_function_privilege('anon', 'public.village_profile_translation_publish(uuid)', 'EXECUTE'), 'anonymous role cannot execute the publish RPC');
select ok(not has_function_privilege('anon', 'public.village_profile_translation_archive(uuid)', 'EXECUTE'), 'anonymous role cannot execute the archive RPC');
select ok(not has_function_privilege('anon', 'public.village_profile_translation_restore(uuid)', 'EXECUTE'), 'anonymous role cannot execute the restore RPC');

select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is(
  (select count(*)::integer from public.village_profile_translations),
  0,
  'authenticated non-administrator cannot read translation base rows'
);
select throws_ok(
  $$select * from public.village_profile_translation_save_draft('e1000000-0000-4000-8000-000000000001', 'Injected', null, 'Injected', null, null, null, null)$$,
  '42501'::char(5),
  'administrator authorization required',
  'authenticated non-administrator cannot mutate through the trusted RPC'
);
select is(
  (select count(*)::integer from public.published_english_village_profiles),
  1,
  'non-administrator receives only current published English data through the safe view'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select throws_ok(
  $$select * from public.village_profile_translations$$,
  '42501'::char(5),
  'permission denied for table village_profile_translations',
  'anonymous base-table read is denied'
);
select throws_ok(
  $$insert into public.village_profile_translations (village_profile_id, locale, created_by, updated_by) values ('e1000000-0000-4000-8000-000000000001', 'en', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5),
  'permission denied for table village_profile_translations',
  'anonymous base-table write is denied'
);
select is(
  (select count(*)::integer from public.published_english_village_profiles),
  1,
  'anonymous visitor reads current English data through the safe view'
);

reset role;

select is(
  (select count(*)::integer from public.published_village_profiles where id = 'e1000000-0000-4000-8000-000000000001'),
  1,
  'existing Indonesian published Village Profile behavior remains intact'
);

select * from finish();
rollback;
