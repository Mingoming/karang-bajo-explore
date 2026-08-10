begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select has_table('public', 'traditional_house_translations', 'traditional house translation table exists');
select has_table('public', 'traditional_house_image_translations', 'traditional house image translation table exists');
select has_table('public', 'traditional_house_translation_review_events', 'traditional house parent review history exists');
select has_table('public', 'traditional_house_image_translation_review_events', 'traditional house image review history exists');
select has_column('public', 'traditional_houses', 'source_revision', 'traditional house source revision exists');
select has_column('public', 'traditional_house_images', 'binary_revision', 'traditional house image binary revision exists');
select has_column('public', 'traditional_house_images', 'updated_at', 'traditional house image updated_at exists');
select has_column('public', 'traditional_house_images', 'updated_by', 'traditional house image updated_by exists');
select ok(
  exists (select 1 from pg_catalog.pg_constraint where conname = 'traditional_house_translations_source_locale_key')
  and exists (select 1 from pg_catalog.pg_constraint where conname = 'traditional_house_image_translations_source_locale_key')
  and exists (select 1 from pg_catalog.pg_constraint where conname = 'traditional_house_translations_review_checkpoint_check')
  and exists (select 1 from pg_catalog.pg_constraint where conname = 'traditional_house_image_translations_review_checkpoint_check'),
  'translation uniqueness and review-checkpoint constraints exist'
);
select ok(
  (select count(*) = 1
   from pg_catalog.pg_constraint as constraint_row
   where constraint_row.conrelid = 'public.traditional_house_translations'::regclass
     and constraint_row.contype = 'f'
     and constraint_row.confrelid = 'public.traditional_houses'::regclass
     and constraint_row.confdeltype = 'r')
  and (select count(*) = 1
       from pg_catalog.pg_constraint as constraint_row
       where constraint_row.conrelid = 'public.traditional_house_image_translations'::regclass
         and constraint_row.contype = 'f'
         and constraint_row.confrelid = 'public.traditional_house_images'::regclass
         and constraint_row.confdeltype = 'r')
  and (select count(*) = 1
       from pg_catalog.pg_constraint as constraint_row
       where constraint_row.conrelid = 'public.traditional_house_translation_review_events'::regclass
         and constraint_row.contype = 'f'
         and constraint_row.confrelid = 'public.traditional_house_translations'::regclass
         and constraint_row.confdeltype = 'r')
  and (select count(*) = 1
       from pg_catalog.pg_constraint as constraint_row
       where constraint_row.conrelid = 'public.traditional_house_image_translation_review_events'::regclass
         and constraint_row.contype = 'f'
         and constraint_row.confrelid = 'public.traditional_house_image_translations'::regclass
         and constraint_row.confdeltype = 'r'),
  'translation and review history foreign keys are restrictive'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.traditional_house_translations'::regclass)
  and (select relrowsecurity from pg_catalog.pg_class where oid = 'public.traditional_house_image_translations'::regclass)
  and (select relrowsecurity from pg_catalog.pg_class where oid = 'public.traditional_house_translation_review_events'::regclass)
  and (select relrowsecurity from pg_catalog.pg_class where oid = 'public.traditional_house_image_translation_review_events'::regclass)
  and (select count(*) = 0
       from pg_catalog.pg_policies
       where schemaname = 'public'
         and tablename in (
           'traditional_house_translations',
           'traditional_house_image_translations',
           'traditional_house_translation_review_events',
           'traditional_house_image_translation_review_events'
         )),
  'translation tables and histories are RLS enabled with no permissive policies'
);
select ok(
  not has_table_privilege('authenticated', 'public.traditional_house_translations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.traditional_house_translations', 'INSERT')
  and not has_table_privilege('authenticated', 'public.traditional_house_translations', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.traditional_house_translations', 'DELETE')
  and not has_table_privilege('authenticated', 'public.traditional_house_image_translations', 'SELECT'),
  'authenticated has no direct translation table privileges'
);
select ok(
  not has_table_privilege('authenticated', 'public.traditional_house_translations', 'INSERT')
  and not has_table_privilege('authenticated', 'public.traditional_house_translations', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.traditional_house_translations', 'DELETE')
  and not has_table_privilege('authenticated', 'public.traditional_house_image_translations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.traditional_house_image_translations', 'INSERT')
  and not has_table_privilege('authenticated', 'public.traditional_house_image_translations', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.traditional_house_image_translations', 'DELETE')
  and not has_table_privilege('authenticated', 'public.traditional_house_translation_review_events', 'SELECT')
  and not has_table_privilege('authenticated', 'public.traditional_house_image_translation_review_events', 'SELECT'),
  'authenticated has no direct image or review-history table privileges'
);
select ok(
  to_regprocedure('public.traditional_house_english_parent_eligibility(public.traditional_houses,public.traditional_house_translations)') is null
  and to_regprocedure('public.traditional_house_english_image_eligibility(public.traditional_houses,public.traditional_house_images,public.traditional_house_image_translations)') is null
  and not has_function_privilege('anon', 'private.traditional_house_english_parent_eligibility(public.traditional_houses,public.traditional_house_translations)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.traditional_house_english_parent_eligibility(public.traditional_houses,public.traditional_house_translations)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.traditional_house_english_image_eligibility(public.traditional_houses,public.traditional_house_images,public.traditional_house_image_translations)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.traditional_house_english_image_eligibility(public.traditional_houses,public.traditional_house_images,public.traditional_house_image_translations)', 'EXECUTE'),
  'eligibility helpers are private and unavailable as caller-supplied composite-row oracles'
);
select ok(
  not has_function_privilege('anon', 'private.published_english_traditional_house_rows()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.published_english_traditional_house_rows()', 'EXECUTE')
  and not has_function_privilege('anon', 'private.published_english_traditional_house_image_rows()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.published_english_traditional_house_image_rows()', 'EXECUTE'),
  'private English projection wrappers are unavailable to anon and authenticated callers'
);
select ok(
  (select count(*) = 20
     and bool_and(routine.prosecdef)
     and bool_and(pg_get_userbyid(routine.proowner) = 'postgres')
     and bool_and(coalesce(array_to_string(routine.proconfig, ','), '') = 'search_path=""')
   from pg_catalog.pg_proc as routine
   join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in (
       'traditional_house_translation_admin_read',
       'traditional_house_image_translation_admin_read',
       'traditional_house_translation_review_history',
       'traditional_house_image_translation_review_history',
       'traditional_house_translation_save_draft',
       'traditional_house_translation_review',
       'traditional_house_translation_reject',
       'traditional_house_translation_publish',
       'traditional_house_translation_republish',
       'traditional_house_translation_archive',
       'traditional_house_translation_unpublish',
       'traditional_house_translation_restore',
       'traditional_house_image_translation_save_draft',
       'traditional_house_image_translation_review',
       'traditional_house_image_translation_reject',
       'traditional_house_image_translation_publish',
       'traditional_house_image_translation_republish',
       'traditional_house_image_translation_archive',
       'traditional_house_image_translation_unpublish',
       'traditional_house_image_translation_restore'
     )),
  'all traditional house workflow RPCs are administrator-bound security-definer functions'
);
select ok(
  has_function_privilege('authenticated', 'public.traditional_house_translation_save_draft(uuid,bigint,text,text,text,text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.traditional_house_translation_save_draft(uuid,bigint,text,text,text,text,text,text,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.traditional_house_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.traditional_house_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE'),
  'workflow RPC execution is granted only to authenticated callers'
);
select ok(
  exists (select 1 from pg_catalog.pg_trigger where tgname = 'traditional_houses_source_revision_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'traditional_house_images_revision_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'traditional_houses_translation_source_cascade_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'traditional_house_images_translation_media_cascade_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'traditional_house_translation_events_append_only_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'traditional_house_image_translation_events_append_only_trigger'),
  'revision, stale-cascade, and append-only triggers exist'
);
-- This suite has no dblink or pg_background harness, so it cannot execute a
-- true multi-session lock race.  It proves the deterministic lock contract
-- structurally and exercises the observable stale-review race outcomes below.
select ok(
  (select position(E'where source.id = l_translation.traditional_house_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_translation(uuid)'::regprocedure)) > 0)
  and (select position(E'where image.traditional_house_id = l_translation.traditional_house_id\n  order by image.id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_translation(uuid)'::regprocedure)) > 0)
  and (select position(E'where translation.id = p_translation_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_translation(uuid)'::regprocedure)) > 0)
  and (select position(E'where source.id = l_image.traditional_house_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image_translation(uuid)'::regprocedure)) > 0)
  and (select position(E'where image.traditional_house_id = l_image.traditional_house_id\n  order by image.id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image_translation(uuid)'::regprocedure)) > 0)
  and (select position(E'where translation.id = p_translation_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image_translation(uuid)'::regprocedure)) > 0)
  and (select position(E'where source.id = l_image.traditional_house_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image_translation(uuid)'::regprocedure))
       < position(E'where image.traditional_house_id = l_image.traditional_house_id\n  order by image.id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image_translation(uuid)'::regprocedure)))
  and (select position(E'where image.traditional_house_id = l_image.traditional_house_id\n  order by image.id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image_translation(uuid)'::regprocedure))
       < position(E'where translation.id = p_translation_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image_translation(uuid)'::regprocedure)))
  and (select position(E'where image.id = l_translation.traditional_house_image_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image_translation(uuid)'::regprocedure)) = 0),
  'parent and image translation helpers lock source, ordered images, then translation without an early target-image lock'
);
select ok(
  (select count(*) = 2 and bool_and(position('private.lock_traditional_house_translation' in pg_get_functiondef(routine.oid)) > 0)
   from pg_catalog.pg_proc as routine
   join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in (
       'traditional_house_translation_review',
       'traditional_house_translation_reject'
     ))
  and (select count(*) = 2
       and bool_and(position('private.traditional_house_translation_publish_transition' in pg_get_functiondef(routine.oid)) > 0)
   from pg_catalog.pg_proc as routine
   join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in (
       'traditional_house_translation_publish',
       'traditional_house_translation_republish'
     ))
  and (select count(*) = 3
       and bool_and(position('private.traditional_house_translation_simple_transition' in pg_get_functiondef(routine.oid)) > 0)
   from pg_catalog.pg_proc as routine
   join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in (
       'traditional_house_translation_archive',
       'traditional_house_translation_unpublish',
       'traditional_house_translation_restore'
     ))
  and position('private.lock_traditional_house_translation' in pg_get_functiondef('private.traditional_house_translation_publish_transition(uuid,bigint,boolean)'::regprocedure)) > 0
  and position('private.lock_traditional_house_translation' in pg_get_functiondef('private.traditional_house_translation_simple_transition(uuid,bigint,text)'::regprocedure)) > 0
  and (select count(*) = 2 and bool_and(position('private.lock_traditional_house_image_translation' in pg_get_functiondef(routine.oid)) > 0)
   from pg_catalog.pg_proc as routine
   join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in (
       'traditional_house_image_translation_review',
       'traditional_house_image_translation_reject'
     ))
  and (select count(*) = 2
       and bool_and(position('private.traditional_house_image_translation_publish_transition' in pg_get_functiondef(routine.oid)) > 0)
   from pg_catalog.pg_proc as routine
   join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in (
       'traditional_house_image_translation_publish',
       'traditional_house_image_translation_republish'
     ))
  and (select count(*) = 3
       and bool_and(position('private.traditional_house_image_translation_simple_transition' in pg_get_functiondef(routine.oid)) > 0)
   from pg_catalog.pg_proc as routine
   join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in (
       'traditional_house_image_translation_archive',
       'traditional_house_image_translation_unpublish',
       'traditional_house_image_translation_restore'
     ))
  and position('private.lock_traditional_house_image_translation' in pg_get_functiondef('private.traditional_house_image_translation_publish_transition(uuid,bigint,boolean)'::regprocedure)) > 0
  and position('private.lock_traditional_house_image_translation' in pg_get_functiondef('private.traditional_house_image_translation_simple_transition(uuid,bigint,text)'::regprocedure)) > 0
  and position(E'where source.id = p_traditional_house_id\n  for update;' in pg_get_functiondef('public.traditional_house_translation_save_draft(uuid,bigint,text,text,text,text,text,text,text)'::regprocedure)) > 0
  and position(E'where image.traditional_house_id = p_traditional_house_id\n  order by image.id\n  for update;' in pg_get_functiondef('public.traditional_house_translation_save_draft(uuid,bigint,text,text,text,text,text,text,text)'::regprocedure)) > 0
  and position(E'where translation.traditional_house_id = p_traditional_house_id\n    and translation.locale = ''en''\n  for update;' in pg_get_functiondef('public.traditional_house_translation_save_draft(uuid,bigint,text,text,text,text,text,text,text)'::regprocedure)) > 0
  and position('private.lock_traditional_house_image' in pg_get_functiondef('public.traditional_house_image_translation_save_draft(uuid,bigint,text,text)'::regprocedure)) > 0
  and (select position(E'where source.id = l_image.traditional_house_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image(uuid)'::regprocedure)) > 0)
  and (select position(E'where image.traditional_house_id = l_image.traditional_house_id\n  order by image.id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image(uuid)'::regprocedure)) > 0)
  and (select position(E'where image.id = p_image_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image(uuid)'::regprocedure)) > 0)
  and (select position(E'where source.id = l_image.traditional_house_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image(uuid)'::regprocedure))
       < position(E'where image.traditional_house_id = l_image.traditional_house_id\n  order by image.id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image(uuid)'::regprocedure)))
  and (select position(E'where image.traditional_house_id = l_image.traditional_house_id\n  order by image.id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image(uuid)'::regprocedure))
       < position(E'where image.id = p_image_id\n  for update;' in pg_get_functiondef('private.lock_traditional_house_image(uuid)'::regprocedure))),
  'all parent and image lifecycle RPCs use their ordered lock helper'
);
select ok(
  (select reloptions @> array['security_barrier=true'] from pg_catalog.pg_class where oid = 'public.published_english_traditional_houses'::regclass)
  and (select reloptions @> array['security_invoker=false'] from pg_catalog.pg_class where oid = 'public.published_english_traditional_houses'::regclass)
  and (select reloptions @> array['security_barrier=true'] from pg_catalog.pg_class where oid = 'public.published_english_traditional_house_images'::regclass)
  and (select reloptions @> array['security_invoker=false'] from pg_catalog.pg_class where oid = 'public.published_english_traditional_house_images'::regclass),
  'English Traditional House views are security-barrier, non-invoker projections'
);
select is(
  (select array_agg(attribute.attname::text order by attribute.attnum)
   from pg_catalog.pg_attribute as attribute
   where attribute.attrelid = 'public.published_english_traditional_houses'::regclass
     and attribute.attnum > 0
     and not attribute.attisdropped),
  array[
    'id', 'translation_id', 'slug', 'name', 'summary', 'description',
    'history', 'cultural_significance', 'location_name', 'visitor_information',
    'latitude', 'longitude', 'google_maps_url', 'thumbnail_bucket',
    'thumbnail_path', 'is_featured', 'display_order', 'published_at',
    'translation_published_at'
  ],
  'English parent view exposes only its documented public projection'
);
select is(
  (select array_agg(attribute.attname::text order by attribute.attnum)
   from pg_catalog.pg_attribute as attribute
   where attribute.attrelid = 'public.published_english_traditional_house_images'::regclass
     and attribute.attnum > 0
     and not attribute.attisdropped),
  array[
    'id', 'traditional_house_id', 'translation_id', 'storage_bucket',
    'storage_path', 'alt_text', 'caption', 'display_order', 'is_primary'
  ],
  'English image view exposes only its documented public projection'
);
select ok(
  has_table_privilege('anon', 'public.published_english_traditional_houses', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_traditional_houses', 'SELECT')
  and not has_table_privilege('anon', 'public.traditional_houses', 'SELECT')
  and not has_table_privilege('authenticated', 'public.traditional_house_translations', 'SELECT'),
  'public access is limited to the English Traditional House projections'
);
select ok(
  position('traditional-house-source-v1' in pg_get_functiondef('private.traditional_house_source_fingerprint_v1(public.traditional_houses)'::regprocedure)) > 0
  and position('traditional-house-translation-v1' in pg_get_functiondef('private.traditional_house_translation_fingerprint_v1(public.traditional_house_translations)'::regprocedure)) > 0
  and position('traditional-house-media-translation-v1' in pg_get_functiondef('private.traditional_house_image_translation_fingerprint_v1(public.traditional_house_image_translations)'::regprocedure)) > 0
  and position('traditional-house-media-v1' in pg_get_functiondef('private.traditional_house_image_media_fingerprint_v1(public.traditional_house_images)'::regprocedure)) > 0
  and position('traditional-house-thumbnail-media-v1' in pg_get_functiondef('private.traditional_house_thumbnail_media_fingerprint_v1(public.traditional_houses,public.traditional_house_images)'::regprocedure)) > 0,
  'all exact Traditional House fingerprint version markers are present'
);
select is(
  private.fingerprint_normalize_text(E' \t\r\n Foo\rBar \n '),
  E'Foo\nBar',
  'fingerprint normalization converts CRLF/CR and trims only documented edge whitespace'
);
select is(
  private.fingerprint_normalize_text(E' \t\r\n '),
  ''::text,
  'fingerprint normalization preserves an empty normalized string for JSON null handling'
);

insert into auth.users (id) values
  ('f3000000-0000-4000-8000-000000000001'),
  ('f3000000-0000-4000-8000-000000000002');
update private.app_config
set administrator_user_id = 'f3000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000001', true);

insert into public.traditional_houses (
  id, name, slug, summary, description, history, cultural_significance,
  location_name, visitor_information, created_by, updated_by
) values (
  'f3100000-0000-4000-8000-000000000001',
  'Rumah Adat Sumber',
  'rumah-adat-sumber-f3',
  'Ringkasan sumber',
  'Deskripsi sumber',
  'Sejarah sumber',
  'Makna budaya sumber',
  'Lokasi sumber',
  'Informasi pengunjung sumber',
  'f3000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values
  ('f3300000-0000-4000-8000-000000000001', 'tourism-media',
   'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000001.jpg',
   'f3000000-0000-4000-8000-000000000001'),
  ('f3300000-0000-4000-8000-000000000002', 'tourism-media',
   'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000002.jpg',
   'f3000000-0000-4000-8000-000000000001');
select lives_ok(
  $$select public.media_insert('traditional-house', 'f3100000-0000-4000-8000-000000000001', 'f3200000-0000-4000-8000-000000000001', 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000001.jpg', 'Alt sumber utama', 'Caption sumber utama', 0, true, array['f3200000-0000-4000-8000-000000000001']::uuid[])$$,
  'existing traditional-house media_insert creates the primary image through the unchanged RPC'
);
select lives_ok(
  $$select public.media_insert('traditional-house', 'f3100000-0000-4000-8000-000000000001', 'f3200000-0000-4000-8000-000000000002', 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000002.jpg', 'Alt sumber galeri', null, 1, false, array['f3200000-0000-4000-8000-000000000001','f3200000-0000-4000-8000-000000000002']::uuid[])$$,
  'existing traditional-house media_insert creates a non-primary gallery image'
);
insert into public.traditional_houses (
  id, name, slug, summary, description, history, cultural_significance,
  location_name, visitor_information, created_by, updated_by
) values (
  'f3100000-0000-4000-8000-000000000002',
  'Rumah Adat Optional Source',
  'rumah-adat-optional-source-f3',
  null,
  'Deskripsi optional source',
  '',
  null,
  '',
  null,
  'f3000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values
  (
    'f3300000-0000-4000-8000-000000000010',
    'tourism-media',
    'traditional-house/f3100000-0000-4000-8000-000000000002/f3200000-0000-4000-8000-000000000010.jpg',
    'f3000000-0000-4000-8000-000000000001'
  ),
  (
    'f3300000-0000-4000-8000-000000000011',
    'tourism-media',
    'traditional-house/f3100000-0000-4000-8000-000000000002/f3200000-0000-4000-8000-000000000011.jpg',
    'f3000000-0000-4000-8000-000000000001'
  );
select lives_ok(
  $$select public.media_insert('traditional-house', 'f3100000-0000-4000-8000-000000000002', 'f3200000-0000-4000-8000-000000000010', 'traditional-house/f3100000-0000-4000-8000-000000000002/f3200000-0000-4000-8000-000000000010.jpg', 'Alt optional source', null, 0, true, array['f3200000-0000-4000-8000-000000000010']::uuid[])$$,
  'optional-source media_insert creates a primary image with a null source caption'
);
select lives_ok(
  $$select public.media_insert('traditional-house', 'f3100000-0000-4000-8000-000000000002', 'f3200000-0000-4000-8000-000000000011', 'traditional-house/f3100000-0000-4000-8000-000000000002/f3200000-0000-4000-8000-000000000011.jpg', 'Alt optional gallery source', null, 1, false, array['f3200000-0000-4000-8000-000000000010','f3200000-0000-4000-8000-000000000011']::uuid[])$$,
  'optional-source media_insert creates a non-primary gallery image for independent stale coverage'
);
select private.traditional_house_source_fingerprint_v1(
  (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000002')
) as fingerprint \gset optional_slug_before_
update public.traditional_houses
set slug = 'rumah-adat-optional-source-renamed',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000002';
select is(
  private.traditional_house_source_fingerprint_v1(
    (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000002')
  ),
  :'optional_slug_before_fingerprint',
  'never-published source slug changes do not alter the translation-relevant fingerprint'
);
update public.traditional_houses
set status = 'published',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000002';
select throws_ok(
  $$update public.traditional_houses set source_revision = source_revision + 1, updated_by = 'f3000000-0000-4000-8000-000000000001' where id = 'f3100000-0000-4000-8000-000000000001'$$,
  '42501'::char(5),
  'traditional house source revision is database managed',
  'direct source revision tampering is rejected'
);
select throws_ok(
  $$update public.traditional_house_images set binary_revision = binary_revision + 1 where id = 'f3200000-0000-4000-8000-000000000001'$$,
  '42501'::char(5),
  'traditional house image revision is database managed',
  'direct image revision tampering is rejected'
);
alter table public.traditional_houses disable trigger traditional_houses_source_revision_trigger;
update public.traditional_houses
set source_revision = 9223372036854775807
where id = 'f3100000-0000-4000-8000-000000000002';
alter table public.traditional_houses enable trigger traditional_houses_source_revision_trigger;
select throws_ok(
  $$update public.traditional_houses set description = description, updated_by = 'f3000000-0000-4000-8000-000000000001' where id = 'f3100000-0000-4000-8000-000000000002'$$,
  '22003'::char(5),
  'traditional house source revision overflow',
  'source revision overflow is rejected at the database boundary'
);
alter table public.traditional_houses disable trigger traditional_houses_source_revision_trigger;
update public.traditional_houses
set source_revision = 1
where id = 'f3100000-0000-4000-8000-000000000002';
alter table public.traditional_houses enable trigger traditional_houses_source_revision_trigger;
alter table public.traditional_house_images disable trigger traditional_house_images_revision_trigger;
update public.traditional_house_images
set binary_revision = 9223372036854775807
where id = 'f3200000-0000-4000-8000-000000000010';
alter table public.traditional_house_images enable trigger traditional_house_images_revision_trigger;
select throws_ok(
  $$update public.traditional_house_images set caption = 'Overflow caption' where id = 'f3200000-0000-4000-8000-000000000010'$$,
  '22003'::char(5),
  'traditional house image revision overflow',
  'image binary revision overflow is rejected at the database boundary'
);
alter table public.traditional_house_images disable trigger traditional_house_images_revision_trigger;
update public.traditional_house_images
set binary_revision = 1
where id = 'f3200000-0000-4000-8000-000000000010';
alter table public.traditional_house_images enable trigger traditional_house_images_revision_trigger;
select is(
  (select binary_revision from public.traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'),
  1::bigint,
  'new source image starts with binary revision one'
);
select is(
  (select updated_by from public.traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'),
  'f3000000-0000-4000-8000-000000000001'::uuid,
  'source image audit actor is derived from auth.uid'
);
select ok(
  (select source_revision > 1 from public.traditional_houses where id = 'f3100000-0000-4000-8000-000000000001')
  and (select thumbnail_path like 'traditional-house/%/f3200000-0000-4000-8000-000000000001.jpg' from public.traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'),
  'source revision and cached primary thumbnail are database maintained'
);
update public.traditional_houses
set status = 'published',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000001';

select is(
  private.traditional_house_source_fingerprint_v1(
    (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000001')
  ),
  'traditional-house-source-v1:5f85c7c95ac28e6511188c5041dfa933af0132eccaef6db4b42424765fccbff5',
  'source fingerprint matches the exact runtime fixture digest'
);
select is(
  private.traditional_house_image_media_fingerprint_v1(
    (select image from public.traditional_house_images as image where image.id = 'f3200000-0000-4000-8000-000000000001')
  ),
  'traditional-house-media-v1:f5145a40833f2807dace1eff0c44de409ee56db92f40806c9c1c11dd17d21c66',
  'source media fingerprint matches the exact runtime fixture digest'
);
select is(
  private.traditional_house_thumbnail_media_fingerprint_v1(
    (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000001'),
    (select image from public.traditional_house_images as image where image.id = 'f3200000-0000-4000-8000-000000000001')
  ),
  'traditional-house-thumbnail-media-v1:7ddfd91d702f19762b9f69e0fa60af164f0364380822be733207a6127d2352da',
  'thumbnail media fingerprint matches the exact runtime fixture digest'
);
select is(
  private.traditional_house_source_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_houses,
      jsonb_build_object(
        'name', 'Rumah Adat Sumber',
        'summary', E' \r\nRingkasan sumber\r\n ',
        'description', 'Deskripsi sumber',
        'history', 'Sejarah sumber',
        'cultural_significance', 'Makna budaya sumber',
        'location_name', 'Lokasi sumber',
        'visitor_information', 'Informasi pengunjung sumber',
        'slug', 'different-slug',
        'latitude', 1,
        'longitude', 2,
        'status', 'archived',
        'source_revision', 999
      )
    )
  ),
  'traditional-house-source-v1:5f85c7c95ac28e6511188c5041dfa933af0132eccaef6db4b42424765fccbff5',
  'source fingerprint preserves canonical text while excluding slug, neutral fields, lifecycle, and revision'
);
select is(
  private.traditional_house_source_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_houses,
      jsonb_build_object(
        'name', 'Rumah Adat Sumber',
        'summary', null,
        'description', 'Deskripsi sumber',
        'history', 'Sejarah sumber',
        'cultural_significance', 'Makna budaya sumber',
        'location_name', 'Lokasi sumber',
        'visitor_information', 'Informasi pengunjung sumber'
      )
    )
  ),
  private.traditional_house_source_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_houses,
      jsonb_build_object(
        'name', 'Rumah Adat Sumber',
        'summary', '',
        'description', 'Deskripsi sumber',
        'history', 'Sejarah sumber',
        'cultural_significance', 'Makna budaya sumber',
        'location_name', 'Lokasi sumber',
        'visitor_information', 'Informasi pengunjung sumber'
      )
    )
  ),
  'source optional null and empty values have identical canonical fingerprints'
);
select isnt(
  private.traditional_house_source_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_houses,
      jsonb_build_object(
        'name', 'Rumah Adat Sumber',
        'summary', 'Ringkasan sumber',
        'description', 'Deskripsi sumber berubah',
        'history', 'Sejarah sumber',
        'cultural_significance', 'Makna budaya sumber',
        'location_name', 'Lokasi sumber',
        'visitor_information', 'Informasi pengunjung sumber'
      )
    )
  ),
  'traditional-house-source-v1:5f85c7c95ac28e6511188c5041dfa933af0132eccaef6db4b42424765fccbff5',
  'source fingerprint changes when an included source field changes'
);
select is(
  private.traditional_house_image_media_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_images,
      jsonb_build_object(
        'id', 'f3200000-0000-4000-8000-000000000001',
        'traditional_house_id', 'f3100000-0000-4000-8000-000000000001',
        'storage_bucket', 'tourism-media',
        'storage_path', 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000001.jpg',
        'caption', E' \r\nCaption sumber utama\r\n ',
        'alt_text', 'Alt sumber utama',
        'binary_revision', 1
      )
    )
  ),
  'traditional-house-media-v1:f5145a40833f2807dace1eff0c44de409ee56db92f40806c9c1c11dd17d21c66',
  'media fingerprint normalizes caption line endings and edges'
);
select is(
  private.traditional_house_image_media_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_images,
      jsonb_build_object(
        'id', 'f3200000-0000-4000-8000-000000000001',
        'traditional_house_id', 'f3100000-0000-4000-8000-000000000001',
        'storage_bucket', 'tourism-media',
        'storage_path', 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000001.jpg',
        'caption', null,
        'alt_text', 'Alt sumber utama',
        'binary_revision', 1
      )
    )
  ),
  private.traditional_house_image_media_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_images,
      jsonb_build_object(
        'id', 'f3200000-0000-4000-8000-000000000001',
        'traditional_house_id', 'f3100000-0000-4000-8000-000000000001',
        'storage_bucket', 'tourism-media',
        'storage_path', 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000001.jpg',
        'caption', '',
        'alt_text', 'Alt sumber utama',
        'binary_revision', 1
      )
    )
  ),
  'media optional null and empty captions have identical canonical fingerprints'
);
select isnt(
  private.traditional_house_thumbnail_media_fingerprint_v1(
    (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000001'),
    jsonb_populate_record(
      null::public.traditional_house_images,
      jsonb_build_object(
        'id', 'f3200000-0000-4000-8000-000000000001',
        'traditional_house_id', 'f3100000-0000-4000-8000-000000000001',
        'storage_bucket', 'tourism-media',
        'storage_path', 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000001.jpg',
        'caption', 'Caption sumber utama',
        'alt_text', 'Alt sumber utama',
        'binary_revision', 2
      )
    )
  ),
  'traditional-house-thumbnail-media-v1:7ddfd91d702f19762b9f69e0fa60af164f0364380822be733207a6127d2352da',
  'thumbnail fingerprint changes when the primary media token changes'
);

select is(
  private.traditional_house_source_fingerprint_v1(
    (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000001')
  ),
  private.traditional_house_source_fingerprint_v1(
    (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000001')
  ),
  'source fingerprint is deterministic'
);
select is(
  left(
    private.traditional_house_source_fingerprint_v1(
      (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000001')
    ),
    length('traditional-house-source-v1:')
  ),
  'traditional-house-source-v1:',
  'source fingerprint uses the exact source marker'
);

set local role authenticated;
select throws_ok(
  $$insert into public.traditional_house_translations (traditional_house_id, name, description, created_by, updated_by) values ('f3100000-0000-4000-8000-000000000001', 'Direct write', 'Direct write', 'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5),
  null,
  'direct parent translation writes are denied'
);
select throws_ok(
  $$insert into public.traditional_house_image_translations (traditional_house_image_id, alt_text, created_by, updated_by) values ('f3200000-0000-4000-8000-000000000001', 'Direct write', 'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5),
  null,
  'direct image translation writes are denied'
);
reset role;

select set_config('traditional_house.workflow', 'on', true);
select throws_ok(
  $$insert into public.traditional_house_translations (
    traditional_house_id, locale, name, description, created_by, updated_by
  ) values (
    'f3100000-0000-4000-8000-000000000001', 'id', 'Invalid locale', 'Invalid locale',
    'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001'
  )$$,
  '23514'::char(5),
  null,
  'translation locale allowlist rejects non-English rows'
);
select throws_ok(
  $$insert into public.traditional_house_translations (
    traditional_house_id, locale, name, description, contract_version, created_by, updated_by
  ) values (
    'f3100000-0000-4000-8000-000000000001', 'en', 'Invalid contract', 'Invalid contract', 'invalid',
    'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001'
  )$$,
  '23514'::char(5),
  null,
  'translation contract version allowlist rejects unknown versions'
);
select throws_ok(
  $$insert into public.traditional_house_translations (
    traditional_house_id, locale, name, description, translation_status, review_state,
    published_at, published_by, created_by, updated_by
  ) values (
    'f3100000-0000-4000-8000-000000000001', 'en', 'Impossible state', 'Impossible state',
    'published', 'pending', statement_timestamp(),
    'f3000000-0000-4000-8000-000000000001',
    'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001'
  )$$,
  '42501'::char(5),
  'traditional house translation initial state is database managed',
  'translation initial lifecycle state is database managed'
);
select throws_ok(
  $$insert into public.traditional_house_image_translations (
    traditional_house_image_id, locale, alt_text, created_by, updated_by
  ) values (
    'f3200000-0000-4000-8000-000000000001', 'id', 'Invalid locale',
    'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001'
  )$$,
  '23514'::char(5),
  null,
  'image translation locale allowlist rejects non-English rows'
);
select throws_ok(
  $$insert into public.traditional_house_image_translations (
    traditional_house_image_id, locale, alt_text, contract_version, created_by, updated_by
  ) values (
    'f3200000-0000-4000-8000-000000000001', 'en', 'Invalid contract', 'invalid',
    'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001'
  )$$,
  '23514'::char(5),
  null,
  'image translation contract version allowlist rejects unknown versions'
);
select throws_ok(
  $$insert into public.traditional_house_image_translations (
    traditional_house_image_id, locale, alt_text, translation_status, review_state,
    published_at, published_by, created_by, updated_by
  ) values (
    'f3200000-0000-4000-8000-000000000001', 'en', 'Impossible state', 'published', 'pending',
    statement_timestamp(), 'f3000000-0000-4000-8000-000000000001',
    'f3000000-0000-4000-8000-000000000001', 'f3000000-0000-4000-8000-000000000001'
  )$$,
  '42501'::char(5),
  'traditional house translation initial state is database managed',
  'image translation initial lifecycle state is database managed'
);
select set_config('traditional_house.workflow', 'off', true);

select throws_ok(
  $$select public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000002', null, 'Optional English', 'Invented summary', 'Optional description', null, null, null, null)$$,
  '23514'::char(5),
  'English content cannot be added without source content',
  'source-null summary cannot receive invented English content'
);
select throws_ok(
  $$select public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000002', null, 'Optional English', null, 'Optional description', 'Invented history', null, null, null)$$,
  '23514'::char(5),
  'English content cannot be added without source content',
  'source-empty history cannot receive invented English content'
);
select throws_ok(
  $$select public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000002', null, 'Optional English', null, 'Optional description', null, 'Invented significance', null, null)$$,
  '23514'::char(5),
  'English content cannot be added without source content',
  'source-null cultural significance cannot receive invented English content'
);
select throws_ok(
  $$select public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000002', null, 'Optional English', null, 'Optional description', null, null, 'Invented location', null)$$,
  '23514'::char(5),
  'English content cannot be added without source content',
  'source-empty location cannot receive invented English content'
);
select throws_ok(
  $$select public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000002', null, 'Optional English', null, 'Optional description', null, null, null, 'Invented visitor information')$$,
  '23514'::char(5),
  'English content cannot be added without source content',
  'source-null visitor information cannot receive invented English content'
);
select (public.traditional_house_translation_save_draft(
  'f3100000-0000-4000-8000-000000000002', null,
  'Optional English', null, 'Optional description', null, null, null, null
)).id \gset optional_parent_
select is(
  (select summary from public.traditional_house_translations where id = :'optional_parent_id'),
  null::text,
  'source-null optional parent fields remain null in English'
);
select is(
  (select history from public.traditional_house_translations where id = :'optional_parent_id'),
  null::text,
  'source-empty optional parent fields remain null in English'
);
select throws_ok(
  $$select public.traditional_house_image_translation_save_draft('f3200000-0000-4000-8000-000000000010', null, 'Optional English alt', 'Invented English caption')$$,
  '23514'::char(5),
  'English image caption cannot be added without source caption content',
  'source-null image caption cannot receive invented English caption content'
);
select (public.traditional_house_image_translation_save_draft(
  'f3200000-0000-4000-8000-000000000010', null, 'Optional English alt', null
)).id \gset optional_image_translation_
select (public.traditional_house_image_translation_review(:'optional_image_translation_id', 1, true)).edit_revision \gset optional_image_reviewed_
select (public.traditional_house_image_translation_publish(:'optional_image_translation_id', :'optional_image_reviewed_edit_revision')).edit_revision \gset optional_image_published_
select (public.traditional_house_translation_review(:'optional_parent_id', 1, true)).edit_revision \gset optional_parent_reviewed_
select (public.traditional_house_translation_publish(:'optional_parent_id', :'optional_parent_reviewed_edit_revision')).edit_revision \gset optional_parent_published_
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  1::bigint,
  'source-null optional fields with English nulls can publish safely'
);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  1::bigint,
  'source caption NULL with English caption NULL keeps the primary image public'
);
select is(
  (select caption from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  null::text,
  'source-null image caption remains null in the English projection'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  1::bigint,
  'source caption NULL with English caption NULL keeps the parent public'
);
update public.traditional_house_images
set caption = '',
    updated_by = auth.uid()
where id = 'f3200000-0000-4000-8000-000000000010';
select (public.traditional_house_image_translation_unpublish(:'optional_image_translation_id', :'optional_image_published_edit_revision')).edit_revision \gset optional_empty_image_withdrawn_
select (public.traditional_house_image_translation_save_draft('f3200000-0000-4000-8000-000000000010', :'optional_empty_image_withdrawn_edit_revision', 'Optional English alt', null)).edit_revision \gset optional_empty_image_draft_
select (public.traditional_house_image_translation_review(:'optional_image_translation_id', :'optional_empty_image_draft_edit_revision', true)).edit_revision \gset optional_empty_image_reviewed_
select (public.traditional_house_image_translation_republish(:'optional_image_translation_id', :'optional_empty_image_reviewed_edit_revision')).edit_revision \gset optional_image_published_
select (public.traditional_house_translation_unpublish(:'optional_parent_id', :'optional_parent_published_edit_revision')).edit_revision \gset optional_empty_parent_withdrawn_
select (public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000002', :'optional_empty_parent_withdrawn_edit_revision', 'Optional English', null, 'Optional description', null, null, null, null)).edit_revision \gset optional_empty_parent_draft_
select (public.traditional_house_translation_review(:'optional_parent_id', :'optional_empty_parent_draft_edit_revision', true)).edit_revision \gset optional_empty_parent_reviewed_
select (public.traditional_house_translation_republish(:'optional_parent_id', :'optional_empty_parent_reviewed_edit_revision')).edit_revision \gset optional_parent_published_
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  1::bigint,
  'source caption empty string normalized as empty with English caption NULL keeps the image public'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  1::bigint,
  'source caption empty string normalized as empty with English caption NULL keeps the parent public'
);
update public.traditional_house_images
set caption = null,
    updated_by = auth.uid()
where id = 'f3200000-0000-4000-8000-000000000010';
select (public.traditional_house_image_translation_unpublish(:'optional_image_translation_id', :'optional_image_published_edit_revision')).edit_revision \gset optional_null_image_withdrawn_
select (public.traditional_house_image_translation_save_draft('f3200000-0000-4000-8000-000000000010', :'optional_null_image_withdrawn_edit_revision', 'Optional English alt', null)).edit_revision \gset optional_null_image_draft_
select (public.traditional_house_image_translation_review(:'optional_image_translation_id', :'optional_null_image_draft_edit_revision', true)).edit_revision \gset optional_null_image_reviewed_
select (public.traditional_house_image_translation_republish(:'optional_image_translation_id', :'optional_null_image_reviewed_edit_revision')).edit_revision \gset optional_image_published_
select (public.traditional_house_translation_unpublish(:'optional_parent_id', :'optional_parent_published_edit_revision')).edit_revision \gset optional_null_parent_withdrawn_
select (public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000002', :'optional_null_parent_withdrawn_edit_revision', 'Optional English', null, 'Optional description', null, null, null, null)).edit_revision \gset optional_null_parent_draft_
select (public.traditional_house_translation_review(:'optional_parent_id', :'optional_null_parent_draft_edit_revision', true)).edit_revision \gset optional_null_parent_reviewed_
select (public.traditional_house_translation_republish(:'optional_parent_id', :'optional_null_parent_reviewed_edit_revision')).edit_revision \gset optional_parent_published_
select set_config('traditional_house.workflow', 'on', true);
update public.traditional_house_image_translations
set caption = 'Invented English caption',
    edit_revision = edit_revision + 1,
    updated_by = auth.uid()
where id = :'optional_image_translation_id';
select set_config('traditional_house.workflow', 'off', true);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  0::bigint,
  'source caption NULL with English caption non-null suppresses the image projection'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  0::bigint,
  'source caption NULL with English caption non-null suppresses the primary parent projection'
);
select set_config('traditional_house.workflow', 'on', true);
update public.traditional_house_image_translations
set caption = null,
    edit_revision = edit_revision + 1,
    updated_by = auth.uid()
where id = :'optional_image_translation_id';
select set_config('traditional_house.workflow', 'off', true);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  1::bigint,
  'restoring a source-null English NULL caption restores the image projection'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  1::bigint,
  'restoring a source-null English NULL caption restores the parent projection'
);
select edit_revision from public.traditional_house_image_translations where id = :'optional_image_translation_id' \gset optional_image_published_
update public.traditional_house_images
set caption = '',
    updated_by = auth.uid()
where id = 'f3200000-0000-4000-8000-000000000010';
select (public.traditional_house_image_translation_unpublish(:'optional_image_translation_id', :'optional_image_published_edit_revision')).edit_revision \gset optional_empty_again_image_withdrawn_
select (public.traditional_house_image_translation_save_draft('f3200000-0000-4000-8000-000000000010', :'optional_empty_again_image_withdrawn_edit_revision', 'Optional English alt', null)).edit_revision \gset optional_empty_again_image_draft_
select (public.traditional_house_image_translation_review(:'optional_image_translation_id', :'optional_empty_again_image_draft_edit_revision', true)).edit_revision \gset optional_empty_again_image_reviewed_
select (public.traditional_house_image_translation_republish(:'optional_image_translation_id', :'optional_empty_again_image_reviewed_edit_revision')).edit_revision \gset optional_image_published_
select (public.traditional_house_translation_unpublish(:'optional_parent_id', :'optional_parent_published_edit_revision')).edit_revision \gset optional_empty_again_parent_withdrawn_
select (public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000002', :'optional_empty_again_parent_withdrawn_edit_revision', 'Optional English', null, 'Optional description', null, null, null, null)).edit_revision \gset optional_empty_again_parent_draft_
select (public.traditional_house_translation_review(:'optional_parent_id', :'optional_empty_again_parent_draft_edit_revision', true)).edit_revision \gset optional_empty_again_parent_reviewed_
select (public.traditional_house_translation_republish(:'optional_parent_id', :'optional_empty_again_parent_reviewed_edit_revision')).edit_revision \gset optional_parent_published_
select set_config('traditional_house.workflow', 'on', true);
update public.traditional_house_image_translations
set caption = 'Invented English caption for empty source',
    edit_revision = edit_revision + 1,
    updated_by = auth.uid()
where id = :'optional_image_translation_id';
select set_config('traditional_house.workflow', 'off', true);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  0::bigint,
  'source caption empty with English caption non-null suppresses the image projection'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  0::bigint,
  'source caption empty with English caption non-null suppresses the primary parent projection'
);
select set_config('traditional_house.workflow', 'on', true);
update public.traditional_house_image_translations
set caption = null,
    edit_revision = edit_revision + 1,
    updated_by = auth.uid()
where id = :'optional_image_translation_id';
select set_config('traditional_house.workflow', 'off', true);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  1::bigint,
  'source-empty English NULL caption restores the image projection'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  1::bigint,
  'source-empty English NULL caption restores the parent projection'
);
select (public.traditional_house_image_translation_save_draft(
  'f3200000-0000-4000-8000-000000000011', null, 'Optional English gallery alt', null
)).id \gset optional_gallery_translation_
select (public.traditional_house_image_translation_review(:'optional_gallery_translation_id', 1, true)).edit_revision \gset optional_gallery_reviewed_
select (public.traditional_house_image_translation_publish(:'optional_gallery_translation_id', :'optional_gallery_reviewed_edit_revision')).edit_revision \gset optional_gallery_published_
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  1::bigint,
  'eligible parent is public before a non-primary media mutation'
);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  1::bigint,
  'primary English image is public before a non-primary media mutation'
);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000011'),
  1::bigint,
  'non-primary English image is public before its source media mutation'
);
select lives_ok(
  $$select public.media_update('traditional-house', 'f3100000-0000-4000-8000-000000000002', 'f3200000-0000-4000-8000-000000000011', 'Alt optional gallery source changed', null, 1, false, array['f3200000-0000-4000-8000-000000000010','f3200000-0000-4000-8000-000000000011']::uuid[])$$,
  'non-primary source media mutation uses the existing trusted generic media RPC'
);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000011'),
  0::bigint,
  'non-primary media mutation suppresses only the affected English gallery image'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  1::bigint,
  'non-primary media mutation does not suppress the English parent'
);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  1::bigint,
  'non-primary media mutation leaves the eligible primary English image public'
);
select is(
  (select lifecycle_state from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000011') where id = :'optional_gallery_translation_id'),
  'stale',
  'non-primary media mutation derives a stale image lifecycle state'
);
select is(
  (select stale_media_fingerprint from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000011') where id = :'optional_gallery_translation_id'),
  true,
  'non-primary media mutation marks the affected image media fingerprint stale'
);
select throws_ok(
  format('select public.traditional_house_image_translation_republish(%L, %s)', :'optional_gallery_translation_id', :'optional_gallery_published_edit_revision'),
  '55000'::char(5),
  null,
  'old non-primary image review checkpoint cannot republish after media mutation'
);
select (public.traditional_house_image_translation_unpublish(:'optional_gallery_translation_id', :'optional_gallery_published_edit_revision')).edit_revision \gset optional_gallery_withdrawn_
select (public.traditional_house_image_translation_review(:'optional_gallery_translation_id', :'optional_gallery_withdrawn_edit_revision', true)).edit_revision \gset optional_gallery_fresh_reviewed_
select (public.traditional_house_image_translation_republish(:'optional_gallery_translation_id', :'optional_gallery_fresh_reviewed_edit_revision')).edit_revision \gset optional_gallery_republished_
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000011'),
  1::bigint,
  'fresh non-primary image review and republish restores the gallery image'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  1::bigint,
  'fresh non-primary image review preserves parent publication'
);
select is(
  (select count(*) from public.traditional_house_images where traditional_house_id = 'f3100000-0000-4000-8000-000000000002' and is_primary),
  1::bigint,
  'exactly one source primary is present in the valid fixture'
);
select is(
  (select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000010'),
  1::bigint,
  'exactly one valid primary image keeps the parent projection eligible'
);

update public.traditional_house_images
set is_primary = false,
    updated_by = auth.uid()
where id = 'f3200000-0000-4000-8000-000000000010';
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  0::bigint,
  'zero source primary images fail closed in the parent English view'
);
update public.traditional_house_images
set is_primary = true,
    updated_by = auth.uid()
where id = 'f3200000-0000-4000-8000-000000000010';

update public.traditional_houses
set thumbnail_path = 'traditional-house/f3100000-0000-4000-8000-000000000002/f3200000-0000-4000-8000-000000000099.jpg',
    updated_by = auth.uid()
where id = 'f3100000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  0::bigint,
  'a cached thumbnail with no matching child image fails closed in the parent English view'
);
update public.traditional_houses
set thumbnail_path = 'traditional-house/f3100000-0000-4000-8000-000000000002/f3200000-0000-4000-8000-000000000010.jpg',
    updated_by = auth.uid()
where id = 'f3100000-0000-4000-8000-000000000002';

drop index public.traditional_house_images_primary_idx;
update public.traditional_house_images
set is_primary = true,
    updated_by = auth.uid()
where id = 'f3200000-0000-4000-8000-000000000011';
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  0::bigint,
  'duplicate source primaries with only one matching the cached thumbnail fail closed'
);
update public.traditional_house_images
set is_primary = false,
    updated_by = auth.uid()
where id = 'f3200000-0000-4000-8000-000000000011';
create unique index traditional_house_images_primary_idx
  on public.traditional_house_images (traditional_house_id)
  where is_primary;

update public.traditional_houses
set thumbnail_path = 'traditional-house/f3100000-0000-4000-8000-000000000002/f3200000-0000-4000-8000-000000000011.jpg',
    updated_by = auth.uid()
where id = 'f3100000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'),
  0::bigint,
  'exactly one primary with a cached thumbnail pointing to another child fails closed'
);
update public.traditional_houses
set thumbnail_path = 'traditional-house/f3100000-0000-4000-8000-000000000002/f3200000-0000-4000-8000-000000000010.jpg',
    updated_by = auth.uid()
where id = 'f3100000-0000-4000-8000-000000000002';
select (public.traditional_house_translation_archive(:'optional_parent_id', :'optional_parent_published_edit_revision')).edit_revision \gset optional_parent_archived_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000002'), 0::bigint, 'optional fixture is archived after null-handling coverage');

select (public.traditional_house_translation_save_draft(
  'f3100000-0000-4000-8000-000000000001', null,
  'Source House English', 'Source summary English', 'Source description English',
  'Source history English', 'Cultural significance English', 'Source location English',
  'Visitor information English'
)).id \gset parent_
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'draft', 'parent draft starts draft');
select is((select review_state from public.traditional_house_translations where id = :'parent_id'), 'pending', 'parent draft starts pending');
select is(
  private.traditional_house_translation_fingerprint_v1(
    (select translation from public.traditional_house_translations as translation where translation.id = :'parent_id')
  ),
  'traditional-house-translation-v1:dfc7d487d2c2d17e5d651edbaa1d6349a68a737804c1f2aa7c87f9c68393b5ee',
  'parent translation fingerprint matches the exact runtime fixture digest'
);
select is(
  private.traditional_house_translation_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_translations,
      jsonb_build_object(
        'name', E' \r\nSource House English\r\n ',
        'summary', 'Source summary English',
        'description', 'Source description English',
        'history', 'Source history English',
        'cultural_significance', 'Cultural significance English',
        'location_name', 'Source location English',
        'visitor_information', 'Visitor information English'
      )
    )
  ),
  'traditional-house-translation-v1:dfc7d487d2c2d17e5d651edbaa1d6349a68a737804c1f2aa7c87f9c68393b5ee',
  'translation fingerprint normalizes required-field line endings and edges'
);
select is(
  private.traditional_house_translation_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_translations,
      jsonb_build_object(
        'name', 'Source House English',
        'summary', null,
        'description', 'Source description English',
        'history', 'Source history English',
        'cultural_significance', 'Cultural significance English',
        'location_name', 'Source location English',
        'visitor_information', 'Visitor information English'
      )
    )
  ),
  private.traditional_house_translation_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_translations,
      jsonb_build_object(
        'name', 'Source House English',
        'summary', '',
        'description', 'Source description English',
        'history', 'Source history English',
        'cultural_significance', 'Cultural significance English',
        'location_name', 'Source location English',
        'visitor_information', 'Visitor information English'
      )
    )
  ),
  'translation optional null and empty values have identical canonical fingerprints'
);
select isnt(
  private.traditional_house_translation_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_translations,
      jsonb_build_object(
        'name', 'Source House English',
        'summary', 'Source summary English',
        'description', 'Changed English description',
        'history', 'Source history English',
        'cultural_significance', 'Cultural significance English',
        'location_name', 'Source location English',
        'visitor_information', 'Visitor information English'
      )
    )
  ),
  'traditional-house-translation-v1:dfc7d487d2c2d17e5d651edbaa1d6349a68a737804c1f2aa7c87f9c68393b5ee',
  'translation fingerprint changes when an included English field changes'
);
select ok(
  left(
    private.traditional_house_translation_fingerprint_v1(
      (select translation from public.traditional_house_translations as translation where translation.id = :'parent_id')
    ),
    length('traditional-house-translation-v1:')
  ) = 'traditional-house-translation-v1:',
  'parent translation fingerprint uses the exact marker'
);
select is(
  (select count(*) from public.traditional_house_translation_review_events where traditional_house_translation_id = :'parent_id'),
  1::bigint,
  'parent draft save appends immutable history'
);
select throws_ok(
  format('select public.traditional_house_translation_review(%L, 1, false)', :'parent_id'),
  '23514'::char(5),
  null,
  'parent review requires the terminology attestation'
);
select (public.traditional_house_translation_review(:'parent_id', 1, true)).edit_revision \gset parent_reviewed_
select is((select review_state from public.traditional_house_translations where id = :'parent_id'), 'reviewed', 'parent review records a reviewed checkpoint');
select is((select reviewed_by from public.traditional_house_translations where id = :'parent_id'), 'f3000000-0000-4000-8000-000000000001'::uuid, 'parent reviewer is auth.uid');
select is(
  (select lifecycle_state from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  'reviewed',
  'admin read derives the reviewed lifecycle state'
);
select is(
  (select public_eligibility from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  false,
  'reviewed parent is not public before publication'
);
select is(
  (select review_eligibility from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  true,
  'admin read exposes database-derived review eligibility'
);
select is(
  (select publication_eligibility from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  false,
  'parent publication remains ineligible without a primary image translation'
);
select throws_ok(
  format('select public.traditional_house_translation_publish(%L, %s)', :'parent_id', :'parent_reviewed_edit_revision'),
  '55000'::char(5),
  null,
  'parent publication remains fail closed until the primary image translation exists'
);

select (public.traditional_house_image_translation_save_draft(
  'f3200000-0000-4000-8000-000000000001', null, 'English primary alt', 'English primary caption'
)).id \gset primary_image_translation_
select is(
  private.traditional_house_image_translation_fingerprint_v1(
    (select translation from public.traditional_house_image_translations as translation where translation.id = :'primary_image_translation_id')
  ),
  'traditional-house-media-translation-v1:a8f8017d00c126beda04a4b58002a5fb95d5d87fea1ca33a822571561e095c1d',
  'image translation fingerprint matches the exact runtime fixture digest'
);
select is(
  private.traditional_house_image_translation_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_image_translations,
      jsonb_build_object(
        'alt_text', E' \r\nEnglish primary alt\r\n ',
        'caption', E' \r\nEnglish primary caption\r\n '
      )
    )
  ),
  'traditional-house-media-translation-v1:a8f8017d00c126beda04a4b58002a5fb95d5d87fea1ca33a822571561e095c1d',
  'image translation fingerprint normalizes caption line endings and edges'
);
select is(
  private.traditional_house_image_translation_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_image_translations,
      jsonb_build_object('alt_text', 'English primary alt', 'caption', null)
    )
  ),
  private.traditional_house_image_translation_fingerprint_v1(
    jsonb_populate_record(
      null::public.traditional_house_image_translations,
      jsonb_build_object('alt_text', 'English primary alt', 'caption', '')
    )
  ),
  'image translation optional null and empty captions have identical canonical fingerprints'
);
select ok(
  left(
    private.traditional_house_image_translation_fingerprint_v1(
      (select translation from public.traditional_house_image_translations as translation where translation.id = :'primary_image_translation_id')
    ),
    length('traditional-house-media-translation-v1:')
  ) = 'traditional-house-media-translation-v1:',
  'image translation fingerprint uses the exact marker'
);
select (public.traditional_house_image_translation_review(:'primary_image_translation_id', 1, true)).edit_revision \gset primary_image_reviewed_
select (public.traditional_house_image_translation_publish(:'primary_image_translation_id', 2)).edit_revision \gset primary_image_published_
select is((select edit_revision from public.traditional_house_translations where id = :'parent_id'), 2::bigint, 'parent review advances the expected edit revision once');
select (public.traditional_house_translation_publish(:'parent_id', (select edit_revision from public.traditional_house_translations where id = :'parent_id'))).edit_revision \gset parent_published_
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'published', 'parent publishes after image eligibility is available');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'eligible English parent appears in the fail-closed view');
select is((select name from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 'Source House English', 'parent view uses English text');
select is((select count(*) from public.published_english_traditional_house_images where traditional_house_id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'only the eligible translated primary image appears initially');
select is((select alt_text from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 'English primary alt', 'image view uses English alt text');
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 1::bigint, 'populated source caption with valid English caption keeps the primary image public');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'populated source caption with valid English caption keeps the parent public');
select is((select count(*) from public.published_english_traditional_houses where name = 'Rumah Adat Sumber'), 0::bigint, 'English parent view has no Indonesian fallback');
select (public.traditional_house_image_translation_unpublish(:'primary_image_translation_id', :'primary_image_published_edit_revision')).edit_revision \gset primary_caption_null_withdrawn_
select (public.traditional_house_image_translation_save_draft('f3200000-0000-4000-8000-000000000001', :'primary_caption_null_withdrawn_edit_revision', 'English primary alt', null)).edit_revision \gset primary_caption_null_draft_
select (public.traditional_house_image_translation_review(:'primary_image_translation_id', :'primary_caption_null_draft_edit_revision', true)).edit_revision \gset primary_caption_null_reviewed_
select (public.traditional_house_image_translation_republish(:'primary_image_translation_id', :'primary_caption_null_reviewed_edit_revision')).edit_revision \gset primary_image_published_
select is((select caption from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), null::text, 'populated source caption permits an English NULL caption after review and publish');
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 1::bigint, 'populated source caption with English NULL remains image-eligible after review and publish');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'populated source caption with English NULL keeps the parent eligible after review and publish');
set local role anon;
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'anonymous can read the fail-closed English parent view through private evaluation');
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 1::bigint, 'anonymous can read the fail-closed English image view through private evaluation');
reset role;
select (public.traditional_house_image_translation_unpublish(:'primary_image_translation_id', :'primary_image_published_edit_revision')).edit_revision \gset primary_blank_withdrawn_
select (public.traditional_house_image_translation_save_draft(
  'f3200000-0000-4000-8000-000000000001', :'primary_blank_withdrawn_edit_revision', '   ', 'English primary caption'
)).edit_revision \gset primary_blank_draft_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'blank primary English alt suppresses the parent projection');
select throws_ok(
  format('select public.traditional_house_image_translation_review(%L, %s, true)', :'primary_image_translation_id', :'primary_blank_draft_edit_revision'),
  '55000'::char(5),
  'traditional house image translation review eligibility failed',
  'blank primary English alt is rejected at the image review boundary'
);
select (public.traditional_house_image_translation_save_draft(
  'f3200000-0000-4000-8000-000000000001', :'primary_blank_draft_edit_revision', 'English primary alt restored', 'English primary caption'
)).edit_revision \gset primary_alt_restored_draft_
select (public.traditional_house_image_translation_review(:'primary_image_translation_id', :'primary_alt_restored_draft_edit_revision', true)).edit_revision \gset primary_alt_restored_reviewed_
select (public.traditional_house_image_translation_republish(:'primary_image_translation_id', :'primary_alt_restored_reviewed_edit_revision')).edit_revision \gset primary_image_published_
select is((select alt_text from public.traditional_house_image_translations where id = :'primary_image_translation_id'), 'English primary alt restored', 'valid primary English alt restores image content');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'valid primary alt restores parent eligibility only through review and publish');
select is((select published_by from public.traditional_house_translations where id = :'parent_id'), 'f3000000-0000-4000-8000-000000000001'::uuid, 'publication actor is database-derived auth.uid');
select is(
  (select lifecycle_state from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  'published',
  'admin read derives the published lifecycle state'
);
select is(
  (select public_eligibility from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  true,
  'admin read reports parent public eligibility'
);
select is(
  (select publication_eligibility from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  true,
  'admin read reports parent publication eligibility'
);
select is(
  (select lifecycle_state from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'),
  'published',
  'image admin read derives the published lifecycle state'
);
select is(
  (select public_eligibility from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'),
  true,
  'image admin read reports image public eligibility'
);
select is(
  (select publication_eligibility from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'),
  true,
  'image admin read reports image publication eligibility'
);
select set_config('traditional_house.workflow', 'on', true);
update public.traditional_house_translations
set name = 'Trusted fingerprint mutation',
    edit_revision = edit_revision + 1,
    updated_by = auth.uid()
where id = :'parent_id';
select edit_revision as revision
from public.traditional_house_translations
where id = :'parent_id' \gset parent_fingerprint_mutated_
select throws_ok(
  format($$update public.traditional_house_translations set edit_revision = edit_revision + 2, updated_by = auth.uid() where id = %L$$, :'parent_id'),
  '42501'::char(5),
  'traditional house translation identity or revision is database managed',
  'direct parent translation revision tampering is rejected'
);
select set_config('traditional_house.workflow', 'off', true);
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'translation fingerprint mutation suppresses the English parent projection');
select is((select stale_translation_fingerprint from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'), true, 'admin read detects a trusted translation fingerprint mutation');
select is((select lifecycle_state from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'), 'stale', 'translation fingerprint mutation derives a stale parent state');
select (public.traditional_house_translation_unpublish(:'parent_id', :'parent_fingerprint_mutated_revision')).edit_revision \gset parent_fingerprint_withdrawn_
select (public.traditional_house_translation_save_draft(
  'f3100000-0000-4000-8000-000000000001', :'parent_fingerprint_withdrawn_edit_revision',
  'Source House English', 'Source summary English', 'Source description English',
  'Source history English', 'Cultural significance English', 'Source location English',
  'Visitor information English'
)).edit_revision \gset parent_fingerprint_draft_
select (public.traditional_house_translation_review(:'parent_id', :'parent_fingerprint_draft_edit_revision', true)).edit_revision \gset parent_fingerprint_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_fingerprint_reviewed_edit_revision')).edit_revision \gset parent_published_
select is((select name from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 'Source House English', 'fresh translation review restores the approved English content');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'fresh translation review and republish restore English visibility');
select set_config('traditional_house.workflow', 'on', true);
update public.traditional_house_image_translations
set alt_text = 'Trusted image fingerprint mutation',
    edit_revision = edit_revision + 1,
    updated_by = auth.uid()
where id = :'primary_image_translation_id';
select edit_revision as revision
from public.traditional_house_image_translations
where id = :'primary_image_translation_id' \gset primary_translation_mutated_
select throws_ok(
  format($$update public.traditional_house_image_translations set edit_revision = edit_revision + 2, updated_by = auth.uid() where id = %L$$, :'primary_image_translation_id'),
  '42501'::char(5),
  'traditional house translation identity or revision is database managed',
  'direct image translation revision tampering is rejected'
);
select set_config('traditional_house.workflow', 'off', true);
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 0::bigint, 'image translation fingerprint mutation suppresses the English image projection');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'primary image translation mutation suppresses the parent projection');
select is((select stale_translation_fingerprint from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'), true, 'image admin read detects a trusted translation fingerprint mutation');
select throws_ok(
  format('select public.traditional_house_image_translation_republish(%L, %s)', :'primary_image_translation_id', :'primary_translation_mutated_revision'),
  '55000'::char(5),
  'fresh review required before traditional house image translation publication',
  'old image review checkpoint cannot republish after translation mutation'
);
select (public.traditional_house_image_translation_unpublish(:'primary_image_translation_id', :'primary_translation_mutated_revision')).edit_revision \gset primary_translation_withdrawn_
select (public.traditional_house_image_translation_save_draft(
  'f3200000-0000-4000-8000-000000000001', :'primary_translation_withdrawn_edit_revision', 'English primary alt restored', 'English primary caption'
)).edit_revision \gset primary_translation_draft_
select (public.traditional_house_image_translation_review(:'primary_image_translation_id', :'primary_translation_draft_edit_revision', true)).edit_revision \gset primary_translation_reviewed_
select (public.traditional_house_image_translation_republish(:'primary_image_translation_id', :'primary_translation_reviewed_edit_revision')).edit_revision \gset primary_image_published_
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 1::bigint, 'fresh image review and republish restore the translated image');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'fresh image review and republish restore the parent projection');
alter table public.traditional_house_images
  drop constraint traditional_house_images_storage_bucket_storage_path_key;
drop index public.traditional_house_images_primary_idx;
update public.traditional_house_images
set is_primary = true,
    updated_by = auth.uid()
where id = 'f3200000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.traditional_house_images where traditional_house_id = 'f3100000-0000-4000-8000-000000000001' and is_primary),
  2::bigint,
  'fixture can expose two primary images with different storage paths'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'),
  0::bigint,
  'duplicate primaries with only one matching the cached thumbnail fail closed'
);
update public.traditional_house_images
set is_primary = false,
    updated_by = auth.uid()
where id = 'f3200000-0000-4000-8000-000000000002';
select lives_ok(
  $$insert into public.traditional_house_images (
    id, traditional_house_id, storage_bucket, storage_path, caption, alt_text,
    display_order, is_primary, created_by
  ) values (
    'f3200000-0000-4000-8000-000000000004',
    'f3100000-0000-4000-8000-000000000001',
    'tourism-media',
    'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000001.jpg',
    'Duplicate primary', 'Duplicate primary alt', 4, true,
    'f3000000-0000-4000-8000-000000000001'
  )$$,
  'test fixture can create a duplicate primary only after disabling the invariants'
);
select is(
  (select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'),
  0::bigint,
  'English parent view fails closed when two primaries both match the cached thumbnail'
);
select is(
  (select count(*) from public.traditional_house_images where traditional_house_id = 'f3100000-0000-4000-8000-000000000001' and is_primary),
  2::bigint,
  'two compatible primary rows remain ambiguous rather than being resolved by ordering'
);
delete from public.traditional_house_images
where id = 'f3200000-0000-4000-8000-000000000004';
alter table public.traditional_house_images
  add constraint traditional_house_images_storage_bucket_storage_path_key unique (storage_bucket, storage_path);
create unique index traditional_house_images_primary_idx
  on public.traditional_house_images (traditional_house_id)
  where is_primary;
select throws_ok(
  format($$select public.traditional_house_translation_save_draft(%L, %s, 'Edited while published', 'Source summary English', 'Source description English', 'Source history English', 'Cultural significance English', 'Source location English', 'Visitor information English')$$, 'f3100000-0000-4000-8000-000000000001', :'parent_published_edit_revision'),
  '55000'::char(5),
  null,
  'published parent cannot be edited through save_draft'
);
select throws_ok(
  format($$select public.traditional_house_image_translation_save_draft('f3200000-0000-4000-8000-000000000001', %s, 'Edited while published', 'English primary caption')$$, :'primary_image_published_edit_revision'),
  '55000'::char(5),
  null,
  'published image translation cannot be edited through save_draft'
);

select throws_ok(
  format('select public.traditional_house_translation_unpublish(%L, %s)', :'parent_id', :'parent_published_edit_revision'::bigint + 1),
  '55000'::char(5),
  null,
  'parent expected edit revision prevents lost updates'
);
select (public.traditional_house_translation_unpublish(:'parent_id', :'parent_published_edit_revision')).edit_revision \gset parent_withdrawn_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'unpublish withdraws the parent projection');
select (public.traditional_house_translation_review(:'parent_id', :'parent_withdrawn_edit_revision', true)).edit_revision \gset parent_re_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_re_reviewed_edit_revision')).edit_revision \gset parent_republished_
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'published', 'normal parent republish works after fresh review');

update public.traditional_houses
set status = 'archived',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000001';
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'draft', 'source archive/unpublish blocks the parent to draft');
select is((select review_state from public.traditional_house_translations where id = :'parent_id'), 'pending', 'source archive/unpublish clears the parent review checkpoint');
select is((select translation_status from public.traditional_house_image_translations where id = :'primary_image_translation_id'), 'published', 'source archive/unpublish preserves child publication state');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'source archive/unpublish suppresses the English parent');
update public.traditional_houses
set status = 'draft',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000001';
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'draft', 'source restore does not promote the parent');
select throws_ok(
  $$update public.traditional_houses set slug = 'rumah-adat-sumber-f3-renamed', updated_by = 'f3000000-0000-4000-8000-000000000001' where id = 'f3100000-0000-4000-8000-000000000001'$$,
  'P0001'::char(5),
  'slug is immutable after first publication',
  'source slug remains immutable after first publication'
);
update public.traditional_houses
set status = 'published',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000001';
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'draft', 'source publish from draft does not auto-promote the parent');
select is((select review_state from public.traditional_house_translations where id = :'parent_id'), 'pending', 'source publish from draft leaves review pending');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'source publish from draft does not auto-publish English');
select (public.traditional_house_translation_review(:'parent_id', (select edit_revision from public.traditional_house_translations where id = :'parent_id'), true)).edit_revision \gset parent_source_unpublish_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_source_unpublish_reviewed_edit_revision')).edit_revision \gset parent_source_unpublish_republished_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'source publication after unpublish still requires and accepts fresh parent review');

update public.traditional_houses
set description = 'Deskripsi sumber berubah',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000001';
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'source text mutation suppresses the stale parent');
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'published', 'source text staleness preserves published audit state');
select is(
  (select lifecycle_state from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  'stale',
  'admin read derives stale after source mutation'
);
select is(
  (select stale_source_fingerprint from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  true,
  'admin read exposes the stale source fingerprint flag'
);
select is(
  (select stale_thumbnail_media_fingerprint from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  false,
  'source text mutation does not mark the thumbnail token stale'
);
select is(
  (select stale_translation_fingerprint from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  false,
  'source text mutation does not mark the English translation token stale'
);
select is(
  (select public_eligibility from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  false,
  'admin read suppresses stale parent public eligibility'
);
select throws_ok(
  format('select public.traditional_house_translation_republish(%L, %s)', :'parent_id', :'parent_source_unpublish_republished_edit_revision'),
  '55000'::char(5),
  null,
  'old parent review checkpoint cannot republish after source mutation'
);
select (public.traditional_house_translation_unpublish(:'parent_id', :'parent_source_unpublish_republished_edit_revision')).edit_revision \gset parent_stale_withdrawn_
select (public.traditional_house_translation_review(:'parent_id', :'parent_stale_withdrawn_edit_revision', true)).edit_revision \gset parent_stale_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_stale_reviewed_edit_revision')).edit_revision \gset parent_stale_republished_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'fresh parent review and republish restore English publication');

update public.traditional_houses
set status = 'archived',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000001';
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'draft', 'source archive blocks the parent to draft');
select is((select review_state from public.traditional_house_translations where id = :'parent_id'), 'pending', 'source archive clears the parent review state');
select is((select translation_status from public.traditional_house_image_translations where id = :'primary_image_translation_id'), 'published', 'source archive preserves independent primary image lifecycle state');
select is((select review_state from public.traditional_house_image_translations where id = :'primary_image_translation_id'), 'reviewed', 'source archive preserves independent primary image review state');
select is(
  (select lifecycle_state from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  'source-blocked',
  'admin read derives source-blocked state after source archive'
);
select is(
  (select source_blocked from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  true,
  'admin read exposes source-blocked flag'
);
select is(
  (select source_blocked_reason from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'),
  'source is archived',
  'admin read exposes deterministic archive reason'
);
select is(
  (select lifecycle_state from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'),
  'source-blocked',
  'image admin read derives source-blocked state after source archive'
);
select is(
  (select source_blocked from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'),
  true,
  'image admin read exposes source-blocked flag'
);
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'source archive suppresses English publication');
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 0::bigint, 'source archive suppresses English images');
update public.traditional_houses
set status = 'draft',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000001';
select is((select review_state from public.traditional_house_translations where id = :'parent_id'), 'pending', 'source restore does not restore the old checkpoint');
update public.traditional_houses
set status = 'published',
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000001';
select (public.traditional_house_translation_review(:'parent_id', (select edit_revision from public.traditional_house_translations where id = :'parent_id'), true)).edit_revision \gset parent_source_restored_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_source_restored_reviewed_edit_revision')).edit_revision \gset parent_source_restored_republished_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'source republish requires and accepts a fresh parent review');
select private.traditional_house_source_fingerprint_v1(
  (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000001')
) as fingerprint \gset source_neutral_before_
select source_revision as revision
from public.traditional_houses
where id = 'f3100000-0000-4000-8000-000000000001' \gset source_neutral_before_
update public.traditional_houses
set latitude = -8.35,
    longitude = 116.45,
    is_featured = not is_featured,
    updated_by = 'f3000000-0000-4000-8000-000000000001'
where id = 'f3100000-0000-4000-8000-000000000001';
select is(
  private.traditional_house_source_fingerprint_v1(
    (select source from public.traditional_houses as source where source.id = 'f3100000-0000-4000-8000-000000000001')
  ),
  :'source_neutral_before_fingerprint',
  'locale-neutral coordinate and featured edits do not change the translation fingerprint'
);
select is((select source_revision from public.traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), :'source_neutral_before_revision'::bigint + 1, 'normal source mutation increments the database-owned revision exactly once');
select is((select lifecycle_state from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'), 'published', 'locale-neutral source edits preserve the published translation lifecycle');
select is((select stale_source_fingerprint from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'), false, 'locale-neutral source edits do not stale the parent');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'locale-neutral source edits preserve English eligibility');

select lives_ok(
  $$select public.media_update('traditional-house', 'f3100000-0000-4000-8000-000000000001', 'f3200000-0000-4000-8000-000000000001', 'Alt sumber utama berubah', 'Caption sumber utama berubah', 0, true, array['f3200000-0000-4000-8000-000000000001','f3200000-0000-4000-8000-000000000002']::uuid[])$$,
  'source media update remains the existing generic RPC'
);
select is((select binary_revision from public.traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 2::bigint, 'source media mutation increments binary revision');
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 0::bigint, 'source media mutation suppresses the stale English image');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'primary media mutation suppresses the parent');
select is(
  (select lifecycle_state from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'),
  'stale',
  'image admin read derives stale after media mutation'
);
select is(
  (select stale_media_fingerprint from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'),
  true,
  'image admin read exposes the stale media fingerprint flag'
);
select is(
  (select stale_translation_fingerprint from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'),
  false,
  'media mutation does not mark the English image token stale'
);
select is(
  (select public_eligibility from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001') where id = :'primary_image_translation_id'),
  false,
  'admin read suppresses stale image public eligibility'
);
select throws_ok(
  format('select public.traditional_house_image_translation_republish(%L, %s)', :'primary_image_translation_id', :'primary_image_published_edit_revision'),
  '55000'::char(5),
  null,
  'old image review checkpoint cannot republish after media mutation'
);
select (public.traditional_house_image_translation_unpublish(:'primary_image_translation_id', :'primary_image_published_edit_revision')).edit_revision \gset primary_media_withdrawn_
select (public.traditional_house_image_translation_review(:'primary_image_translation_id', :'primary_media_withdrawn_edit_revision', true)).edit_revision \gset primary_media_reviewed_
select (public.traditional_house_image_translation_republish(:'primary_image_translation_id', :'primary_media_reviewed_edit_revision')).edit_revision \gset primary_media_republished_
select (public.traditional_house_translation_unpublish(:'parent_id', :'parent_source_restored_republished_edit_revision')).edit_revision \gset parent_media_withdrawn_
select (public.traditional_house_translation_review(:'parent_id', :'parent_media_withdrawn_edit_revision', true)).edit_revision \gset parent_media_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_media_reviewed_edit_revision')).edit_revision \gset parent_media_republished_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'fresh media and parent checkpoints restore publication');

select lives_ok(
  $$select public.media_reorder('traditional-house', 'f3100000-0000-4000-8000-000000000001', array['f3200000-0000-4000-8000-000000000002','f3200000-0000-4000-8000-000000000001']::uuid[])$$,
  'display reorder remains supported by the generic media RPC'
);
select is((select binary_revision from public.traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'), 2::bigint, 'display reorder does not increment binary revision');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'display reorder does not make the parent stale');

select (public.traditional_house_image_translation_save_draft(
  'f3200000-0000-4000-8000-000000000002', null, 'English gallery alt', null
)).id \gset gallery_image_translation_
select (public.traditional_house_image_translation_review(:'gallery_image_translation_id', 1, true)).edit_revision \gset gallery_image_reviewed_
select (public.traditional_house_image_translation_publish(:'gallery_image_translation_id', 2)).edit_revision \gset gallery_image_published_
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000002'), 1::bigint, 'eligible non-primary gallery translation appears independently');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'non-primary gallery eligibility does not block the parent');
select throws_ok(
  format('select public.traditional_house_image_translation_unpublish(%L, %s)', :'gallery_image_translation_id', :'gallery_image_published_edit_revision'::bigint + 1),
  '55000'::char(5),
  'traditional house image translation edit revision mismatch',
  'image expected edit revision prevents lost updates'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'f3300000-0000-4000-8000-000000000005',
  'tourism-media',
  'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000005.jpg',
  'f3000000-0000-4000-8000-000000000001'
);
select lives_ok(
  $$select public.media_insert('traditional-house', 'f3100000-0000-4000-8000-000000000001', 'f3200000-0000-4000-8000-000000000005', 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000005.jpg', 'Alt temporary primary', null, 2, true, array['f3200000-0000-4000-8000-000000000002','f3200000-0000-4000-8000-000000000001','f3200000-0000-4000-8000-000000000005']::uuid[])$$,
  'new source primary can be selected without fabricating an English image translation'
);
select is((select thumbnail_path from public.traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000005.jpg', 'new source primary updates the cached thumbnail');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'untranslated new primary suppresses the English parent');
select lives_ok(
  $$select public.media_delete('traditional-house', 'f3100000-0000-4000-8000-000000000001', 'f3200000-0000-4000-8000-000000000005')$$,
  'deleting the current primary uses the deterministic source-image fallback'
);
select is((select is_primary from public.traditional_house_images where id = 'f3200000-0000-4000-8000-000000000002'), true, 'fallback image becomes the new source primary');
select is((select thumbnail_path from public.traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000002.jpg', 'fallback primary refreshes the cached thumbnail path');
select is((select stale_thumbnail_media_fingerprint from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'), true, 'primary deletion and fallback make the old parent thumbnail checkpoint stale');
select is((select lifecycle_state from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001') where id = :'parent_id'), 'stale', 'primary deletion and fallback derive a stale parent state');
select is((select public_eligibility from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000002') where id = :'gallery_image_translation_id'), true, 'eligible fallback child remains independently eligible');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'stale parent remains suppressed even when fallback child is eligible');
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000002'), 0::bigint, 'English image projection remains suppressed while its parent thumbnail checkpoint is stale');
select (public.traditional_house_translation_unpublish(:'parent_id', :'parent_media_republished_edit_revision')).edit_revision \gset parent_fallback_withdrawn_
select (public.traditional_house_translation_review(:'parent_id', :'parent_fallback_withdrawn_edit_revision', true)).edit_revision \gset parent_fallback_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_fallback_reviewed_edit_revision')).edit_revision \gset parent_fallback_republished_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'fresh parent review restores publication after primary deletion fallback');
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'f3300000-0000-0000-8000-000000000003',
  'tourism-media',
  'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000002.png',
  'f3000000-0000-4000-8000-000000000001'
);
select lives_ok(
  $$select public.media_replace('traditional-house', 'f3100000-0000-4000-8000-000000000001', 'f3200000-0000-4000-8000-000000000002', 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000002.png', 'Alt sumber galeri diganti', null, 0, true, array['f3200000-0000-4000-8000-000000000002','f3200000-0000-4000-8000-000000000001']::uuid[])$$,
  'binary media replacement remains supported by the existing generic media RPC'
);
select is((select binary_revision from public.traditional_house_images where id = 'f3200000-0000-4000-8000-000000000002'), 2::bigint, 'supported binary replacement increments the non-primary image revision');
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000002'), 0::bigint, 'binary replacement suppresses the stale non-primary English image');
select (public.traditional_house_image_translation_unpublish(:'gallery_image_translation_id', :'gallery_image_published_edit_revision')).edit_revision \gset gallery_replace_withdrawn_
select (public.traditional_house_image_translation_review(:'gallery_image_translation_id', :'gallery_replace_withdrawn_edit_revision', true)).edit_revision \gset gallery_replace_reviewed_
select (public.traditional_house_image_translation_republish(:'gallery_image_translation_id', :'gallery_replace_reviewed_edit_revision')).edit_revision \gset gallery_replace_republished_
select (public.traditional_house_translation_unpublish(:'parent_id', :'parent_fallback_republished_edit_revision')).edit_revision \gset parent_gallery_replace_withdrawn_
select (public.traditional_house_translation_review(:'parent_id', :'parent_gallery_replace_withdrawn_edit_revision', true)).edit_revision \gset parent_gallery_replace_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_gallery_replace_reviewed_edit_revision')).edit_revision \gset parent_gallery_replace_republished_
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000002'), 1::bigint, 'fresh child review and republish restores replaced gallery media');
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'fresh parent review restores publication after replacing the current primary gallery media');
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'f3300000-0000-0000-8000-000000000004',
  'tourism-media',
  'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000003.jpg',
  'f3000000-0000-4000-8000-000000000001'
);
select lives_ok(
  $$select public.media_insert('traditional-house', 'f3100000-0000-4000-8000-000000000001', 'f3200000-0000-4000-8000-000000000003', 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000003.jpg', 'Alt temporary', null, 2, false, array['f3200000-0000-4000-8000-000000000002','f3200000-0000-4000-8000-000000000001','f3200000-0000-4000-8000-000000000003']::uuid[])$$,
  'generic media insert supports an untranslated temporary gallery image'
);
select lives_ok(
  $$select public.media_delete('traditional-house', 'f3100000-0000-4000-8000-000000000001', 'f3200000-0000-4000-8000-000000000003')$$,
  'generic media delete supports an image without translation history'
);
select is((select count(*) from public.traditional_house_images where traditional_house_id = 'f3100000-0000-4000-8000-000000000001'), 2::bigint, 'untranslated temporary media delete leaves the translated gallery intact');

select lives_ok(
  $$select public.media_set_primary('traditional-house', 'f3100000-0000-4000-8000-000000000001', 'f3200000-0000-4000-8000-000000000001')$$,
  'primary selection remains supported by the generic media RPC'
);
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'changing the primary image changes the thumbnail checkpoint and suppresses the parent');
select (public.traditional_house_translation_unpublish(:'parent_id', :'parent_gallery_replace_republished_edit_revision')).edit_revision \gset parent_primary_withdrawn_
select (public.traditional_house_translation_review(:'parent_id', :'parent_primary_withdrawn_edit_revision', true)).edit_revision \gset parent_primary_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_primary_reviewed_edit_revision')).edit_revision \gset parent_primary_republished_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 1::bigint, 'parent can republish when the newly selected primary has current English alt');

select (public.traditional_house_image_translation_archive(:'gallery_image_translation_id', :'gallery_replace_republished_edit_revision')).edit_revision \gset gallery_archived_
select is((select count(*) from public.published_english_traditional_house_images where id = 'f3200000-0000-4000-8000-000000000002'), 0::bigint, 'image archive removes the child projection');
select (public.traditional_house_image_translation_restore(:'gallery_image_translation_id', :'gallery_archived_edit_revision')).edit_revision \gset gallery_restored_
select is((select translation_status from public.traditional_house_image_translations where id = :'gallery_image_translation_id'), 'draft', 'image restore returns to draft');
select throws_ok(
  format('select public.traditional_house_image_translation_publish(%L, %s)', :'gallery_image_translation_id', :'gallery_restored_edit_revision'),
  '55000'::char(5),
  null,
  'restored image requires a new review before publication'
);
select (public.traditional_house_image_translation_reject(:'gallery_image_translation_id', :'gallery_restored_edit_revision', 'Caption requires cultural review')).edit_revision \gset gallery_rejected_
select is((select review_state from public.traditional_house_image_translations where id = :'gallery_image_translation_id'), 'rejected', 'image rejection records the rejected review state');
select is((select reason from public.traditional_house_image_translation_review_events where traditional_house_image_translation_id = :'gallery_image_translation_id' and event_type = 'rejected' order by occurred_at desc, id desc limit 1), 'Caption requires cultural review', 'image rejection records a human reason');
select throws_ok(
  format('select public.traditional_house_image_translation_review(%L, %s, true)', :'gallery_image_translation_id', :'gallery_rejected_edit_revision'),
  '55000'::char(5),
  null,
  'rejected image must be saved as a fresh draft before review'
);
select (public.traditional_house_image_translation_save_draft('f3200000-0000-4000-8000-000000000002', :'gallery_rejected_edit_revision', 'English gallery alt', null)).edit_revision \gset gallery_rejection_cleared_
select is((select review_state from public.traditional_house_image_translations where id = :'gallery_image_translation_id'), 'pending', 'image draft save clears rejection state');

select (public.traditional_house_translation_archive(:'parent_id', :'parent_primary_republished_edit_revision')).edit_revision \gset parent_archived_
select is((select count(*) from public.published_english_traditional_houses where id = 'f3100000-0000-4000-8000-000000000001'), 0::bigint, 'parent archive removes the parent projection');
select (public.traditional_house_translation_restore(:'parent_id', :'parent_archived_edit_revision')).edit_revision \gset parent_restored_
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'draft', 'parent restore returns to draft');
select (public.traditional_house_translation_reject(:'parent_id', :'parent_restored_edit_revision', 'History requires cultural review')).edit_revision \gset parent_rejected_
select is((select review_state from public.traditional_house_translations where id = :'parent_id'), 'rejected', 'parent rejection records the rejected review state');
select is((select reason from public.traditional_house_translation_review_events where traditional_house_translation_id = :'parent_id' and event_type = 'rejected' order by occurred_at desc, id desc limit 1), 'History requires cultural review', 'parent rejection records a human reason');
select throws_ok(
  format('select public.traditional_house_translation_review(%L, %s, true)', :'parent_id', :'parent_rejected_edit_revision'),
  '55000'::char(5),
  null,
  'rejected parent must be saved as a fresh draft before review'
);
select (public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000001', :'parent_rejected_edit_revision', 'Source House English', 'Source summary English', 'Source description English', 'Source history English', 'Cultural significance English', 'Source location English', 'Visitor information English')).edit_revision \gset parent_rejection_cleared_
select is((select review_state from public.traditional_house_translations where id = :'parent_id'), 'pending', 'parent draft save clears rejection state');
select (public.traditional_house_translation_review(:'parent_id', :'parent_rejection_cleared_edit_revision', true)).edit_revision \gset parent_invalid_reviewed_
select (public.traditional_house_translation_republish(:'parent_id', :'parent_invalid_reviewed_edit_revision')).edit_revision \gset parent_invalid_published_
select throws_ok(
  $$update public.traditional_house_images set storage_path = 'traditional-house/f3100000-0000-4000-8000-000000000001/f3200000-0000-4000-8000-000000000001.svg' where id = 'f3200000-0000-4000-8000-000000000001'$$,
  '23514'::char(5),
  null,
  'invalid primary source media path is rejected by the database allowlist'
);
select (public.traditional_house_translation_archive(:'parent_id', :'parent_invalid_published_edit_revision')).edit_revision \gset parent_invalid_archived_
select is((select translation_status from public.traditional_house_translations where id = :'parent_id'), 'archived', 'invalid-media fixture is archived after fail-closed coverage');

select throws_ok(
  $$delete from public.traditional_house_images where id = 'f3200000-0000-4000-8000-000000000001'$$,
  '23503'::char(5),
  null,
  'source image deletion is restricted by translation history'
);
select throws_ok(
  format($$update public.traditional_house_translation_review_events set reason = 'tampered' where traditional_house_translation_id = %L$$, :'parent_id'),
  '42501'::char(5),
  null,
  'parent review history is append-only'
);
select throws_ok(
  format($$delete from public.traditional_house_image_translation_review_events where traditional_house_image_translation_id = %L$$, :'gallery_image_translation_id'),
  '42501'::char(5),
  null,
  'image review history is append-only'
);

select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*) from public.traditional_house_translation_admin_read('f3100000-0000-4000-8000-000000000001')),
  0::bigint,
  'non-administrator cannot read derived parent translation state'
);
select is(
  (select count(*) from public.traditional_house_image_translation_admin_read('f3200000-0000-4000-8000-000000000001')),
  0::bigint,
  'non-administrator cannot read derived image translation state'
);
select throws_ok(
  $$select public.traditional_house_translation_save_draft('f3100000-0000-4000-8000-000000000001', null, 'No', null, 'No', null, null, null, null)$$,
  '42501'::char(5),
  null,
  'non-administrator cannot use the workflow RPC'
);
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select is((select count(*) from public.published_english_traditional_houses), 0::bigint, 'anonymous English projection remains fail closed after archive');
select throws_ok(
  $$select count(*) from public.traditional_house_translations$$,
  '42501'::char(5),
  null,
  'anonymous cannot read translation base tables'
);
reset role;

select * from finish();
rollback;
