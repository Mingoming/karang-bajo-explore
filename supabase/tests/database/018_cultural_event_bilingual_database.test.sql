begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

insert into auth.users (id)
values
  ('c8000000-0000-4000-8000-000000000001'),
  ('c8000000-0000-4000-8000-000000000002');

update private.app_config
set administrator_user_id = 'c8000000-0000-4000-8000-000000000001';

select has_table('public', 'cultural_event_translations', 'Cultural Event parent translation table exists');
select has_table('public', 'cultural_event_image_translations', 'Cultural Event image translation table exists');
select has_table('public', 'cultural_event_translation_review_events', 'Cultural Event parent review history exists');
select has_table('public', 'cultural_event_image_translation_review_events', 'Cultural Event image review history exists');
select has_column('public', 'cultural_events', 'source_revision', 'source revision is present');
select has_column('public', 'cultural_events', 'thumbnail_binary_revision', 'thumbnail media revision is present');
select has_column('public', 'cultural_event_images', 'binary_revision', 'image binary revision is present');
select has_column('public', 'cultural_event_images', 'updated_by', 'image update actor is present');

select ok(
  (select count(*) = 9 and bool_and(column_name in (
    'title', 'summary', 'description', 'event_type', 'date_note',
    'location_name', 'address', 'organizer', 'visitor_information'
  ))
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'cultural_event_translations'
    and column_name in (
      'title', 'summary', 'description', 'event_type', 'date_note',
      'location_name', 'address', 'organizer', 'visitor_information'
    )),
  'parent translation exposes exactly the frozen translated fields'
);
select ok(
  (select count(*) = 2 and bool_and(column_name in ('alt_text', 'caption'))
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'cultural_event_image_translations'
     and column_name in ('alt_text', 'caption')),
  'image translation exposes only alt text and caption as translated fields'
);

select ok(
  has_table_privilege('anon', 'public.cultural_event_translations', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.cultural_event_translations', 'SELECT') = false
  and has_table_privilege('anon', 'public.cultural_event_translations', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.cultural_event_translations', 'INSERT') = false
  and has_table_privilege('anon', 'public.cultural_event_image_translations', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.cultural_event_image_translations', 'SELECT') = false
  and has_table_privilege('anon', 'public.cultural_event_image_translations', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.cultural_event_image_translations', 'INSERT') = false
  and has_table_privilege('anon', 'public.cultural_event_translation_review_events', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.cultural_event_translation_review_events', 'SELECT') = false
  and has_table_privilege('anon', 'public.cultural_event_translation_review_events', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.cultural_event_translation_review_events', 'INSERT') = false
  and has_table_privilege('anon', 'public.cultural_event_image_translation_review_events', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.cultural_event_image_translation_review_events', 'SELECT') = false
  and has_table_privilege('anon', 'public.cultural_event_image_translation_review_events', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.cultural_event_image_translation_review_events', 'INSERT') = false,
  'translation and review tables have no direct application privileges'
);
select ok(
  has_function_privilege('authenticated', 'public.cultural_event_translation_save_draft(uuid,bigint,text,text,text,text,text,text,text,text,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.cultural_event_translation_review(uuid,bigint,boolean)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.cultural_event_translation_republish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.cultural_event_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.cultural_event_image_translation_review(uuid,bigint,boolean)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.cultural_event_image_translation_republish(uuid,bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.cultural_event_translation_save_draft(uuid,bigint,text,text,text,text,text,text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.cultural_event_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE'),
  'typed workflow RPCs are executable only by authenticated callers'
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
       'cultural_event_translation_admin_read',
       'cultural_event_image_translation_admin_read',
       'cultural_event_translation_review_history',
       'cultural_event_image_translation_review_history',
       'cultural_event_translation_save_draft',
       'cultural_event_translation_review',
       'cultural_event_translation_reject',
       'cultural_event_translation_publish',
       'cultural_event_translation_republish',
       'cultural_event_translation_archive',
       'cultural_event_translation_unpublish',
       'cultural_event_translation_restore',
       'cultural_event_image_translation_save_draft',
       'cultural_event_image_translation_review',
       'cultural_event_image_translation_reject',
       'cultural_event_image_translation_publish',
       'cultural_event_image_translation_republish',
       'cultural_event_image_translation_archive',
       'cultural_event_image_translation_unpublish',
       'cultural_event_image_translation_restore'
     )),
  'all Cultural Event public RPCs are owned security-definer functions with empty search paths'
);
select ok(
  has_function_privilege('anon', 'private.cultural_event_current_primary_image(public.cultural_events)', 'EXECUTE') = false
  and has_function_privilege('authenticated', 'private.cultural_event_current_primary_image(public.cultural_events)', 'EXECUTE') = false
  and has_function_privilege('anon', 'private.cultural_event_bilingual_legacy_validation_report()', 'EXECUTE') = false
  and has_function_privilege('authenticated', 'private.cultural_event_bilingual_legacy_validation_report()', 'EXECUTE') = false
  and has_function_privilege('anon', 'private.lock_cultural_event_image(uuid)', 'EXECUTE') = false
  and has_function_privilege('authenticated', 'private.lock_cultural_event_image(uuid)', 'EXECUTE') = false
  and has_table_privilege('anon', 'private.published_english_cultural_event_rows_data', 'SELECT') = false
  and has_table_privilege('authenticated', 'private.published_english_cultural_event_rows_data', 'SELECT') = false,
  'private eligibility and projection helpers are unavailable to application callers'
);
select ok(
  has_table_privilege('anon', 'private.published_english_cultural_event_image_rows_data', 'SELECT') = false
  and has_table_privilege('authenticated', 'private.published_english_cultural_event_image_rows_data', 'SELECT') = false,
  'private Cultural Event image projection is unavailable to application callers'
);
select ok(
  has_table_privilege('anon', 'public.published_english_cultural_events', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_cultural_events', 'SELECT')
  and has_table_privilege('anon', 'public.published_english_cultural_event_images', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_cultural_event_images', 'SELECT'),
  'public English views grant only the approved public projection access'
);
select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public'
      and table_name = 'published_english_cultural_events'),
  'id,translation_id,slug,title,summary,description,event_type,start_at,end_at,all_day,date_note,location_name,address,latitude,longitude,google_maps_url,organizer,contact_phone,visitor_information,thumbnail_bucket,thumbnail_path,is_featured,published_at,translation_published_at',
  'English Cultural Event parent view exposes only the approved safe columns'
);
select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public'
      and table_name = 'published_english_cultural_event_images'),
  'id,cultural_event_id,translation_id,storage_bucket,storage_path,alt_text,caption,display_order,is_primary',
  'English Cultural Event image view exposes only the approved safe columns'
);
select ok(
  not has_function_privilege('anon', 'private.refresh_cultural_event_freshness()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.refresh_cultural_event_freshness()', 'EXECUTE')
  and not has_function_privilege('anon', 'private.cultural_event_source_fingerprint_v1(public.cultural_events)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.cultural_event_source_fingerprint_v1(public.cultural_events)', 'EXECUTE'),
  'freshness and fingerprint helpers are not executable by application roles'
);
select ok(
  (
    select
      (length(function_def) - length(replace(function_def, 'for update', ''))) / length('for update') = 3
      and position('where event.id = l_image.cultural_event_id' in function_def) > 0
      and position('order by image.id' in function_def) > position('where event.id = l_image.cultural_event_id' in function_def)
      and position('where image.id = p_image_id' in substring(function_def from position('order by image.id' in function_def))) > 0
    from (
      select replace(pg_get_functiondef('private.lock_cultural_event_image(uuid)'::regprocedure), chr(13), '') as function_def
    ) as normalized
  ),
  'Cultural Event image lock helper orders source, all images, and target image without ambiguity'
);
select ok(
  position('l_image := private.lock_cultural_event_image(p_cultural_event_image_id);' in replace(pg_get_functiondef('public.cultural_event_image_translation_save_draft(uuid,bigint,text,text)'::regprocedure), chr(13), '')) > 0,
  'Cultural Event image save-draft uses the global image lock helper before mutation'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.cultural_event_translation_review_events'::regclass
      and conname = 'cultural_event_translation_events_reason_check'
  ),
  'review history has a constrained source lifecycle event contract'
);

select set_config('request.jwt.claim.sub', 'c8000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$insert into public.cultural_event_translations (cultural_event_id, title, description, created_by, updated_by)
    values ('c8100000-0000-4000-8000-000000000001', 'Direct', 'Direct', 'c8000000-0000-4000-8000-000000000001', 'c8000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5), null,
  'administrator cannot directly write the parent translation table'
);
select throws_ok(
  $$select * from public.cultural_event_translations$$,
  '42501'::char(5), null,
  'administrator cannot directly read the parent translation table'
);
select throws_ok(
  $$insert into public.cultural_event_image_translations (cultural_event_image_id, alt_text, created_by, updated_by)
    values ('c8200000-0000-4000-8000-000000000001', 'Direct', 'c8000000-0000-4000-8000-000000000001', 'c8000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5), null,
  'administrator cannot directly write the image translation table'
);
select throws_ok(
  $$select * from public.cultural_event_image_translations$$,
  '42501'::char(5), null,
  'administrator cannot directly read the image translation table'
);
select throws_ok(
  $$insert into public.cultural_event_translation_review_events (cultural_event_translation_id, event_type, actor_id)
    values ('c8100000-0000-4000-8000-000000000001', 'draft_saved', 'c8000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5), null,
  'administrator cannot directly write parent translation review history'
);
select throws_ok(
  $$insert into public.cultural_event_image_translation_review_events (cultural_event_image_translation_id, event_type, actor_id)
    values ('c8200000-0000-4000-8000-000000000001', 'draft_saved', 'c8000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5), null,
  'administrator cannot directly write image translation review history'
);

insert into public.cultural_events (
  id, title, slug, summary, description, event_type, start_at, end_at,
  all_day, date_note, location_name, address, latitude, longitude,
  google_maps_url, organizer, contact_phone, contact_consent_confirmed,
  visitor_information, created_by, updated_by
) values (
  'c8100000-0000-4000-8000-000000000001',
  'Acara Utama', 'acara-utama', 'Ringkasan acara', 'Deskripsi acara',
  'Festival', '2038-08-17 09:00:00+08', '2038-08-17 11:00:00+08', false,
  'Jadwal terkonfirmasi', 'Lapangan Desa', 'Alamat acara', -8.5, 116.1,
  'https://maps.example.test/event', 'Panitia Acara', '081234567890', true,
  'Informasi pengunjung', 'c8000000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000001'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000001',
  'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000001.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
select lives_ok(
  $$select public.media_insert(
    'cultural-event',
    'c8100000-0000-4000-8000-000000000001',
    'c8200000-0000-4000-8000-000000000001',
    'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000001.jpg',
    'Gambar utama sumber', 'Keterangan sumber', 0, true,
    array['c8200000-0000-4000-8000-000000000001']::uuid[]
  )$$,
  'generic media_insert creates the Cultural Event primary image'
);
select lives_ok(
  $$update public.cultural_events
    set status = 'published', updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'source publication remains controlled by the existing Cultural Event contract'
);
select ok(
  (select source_revision > 1 and thumbnail_binary_revision > 1 from public.cultural_events where id = 'c8100000-0000-4000-8000-000000000001')
  and (select binary_revision = 1 and updated_by = 'c8000000-0000-4000-8000-000000000001' from public.cultural_event_images where id = 'c8200000-0000-4000-8000-000000000001'),
  'database-owned source and media revisions are initialized and actor-stamped'
);

set local role postgres;
select private.cultural_event_source_fingerprint_v1(source) as source_fp,
       private.cultural_event_thumbnail_media_fingerprint_v1(source, image) as thumbnail_fp
from public.cultural_events as source
join public.cultural_event_images as image
  on image.cultural_event_id = source.id and image.is_primary
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_before_
select ok(
  :'event_before_source_fp'::text = 'cultural-event-source-v1:4359026b432b2e7592e13b64cbc50fef371bbd77e55c5c18b87d1290f593d1c2'
  and :'event_before_thumbnail_fp'::text = 'cultural-event-thumbnail-media-v1:85ac3b29091c0f35bbfb185b5041a7b7f3bacf7f3059adea92cb6f4918502e96',
  'source and thumbnail fingerprints match independent exact Cultural Event fixtures'
);
select private.cultural_event_image_media_fingerprint_v1(image) as media_fp
from public.cultural_event_images as image
where image.id = 'c8200000-0000-4000-8000-000000000001' \gset event_media_before_
select ok(
  :'event_media_before_media_fp'::text = 'cultural-event-media-v1:31b590cee8df8748a582add0a484da608cda3d6be76899c17a83d670cc31886b',
  'media fingerprint matches the independent exact Cultural Event fixture'
);
update public.cultural_events
set summary = E'Ringkasan\r\nacara',
    start_at = '2038-08-17 01:00:00+00',
    end_at = '2038-08-17 03:00:00+00',
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000001';
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_crlf_
update public.cultural_events
set summary = E'Ringkasan\nacara',
    start_at = '2038-08-17 01:00:00+00',
    end_at = '2038-08-17 03:00:00+00',
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000001';
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_lf_
select is(
  :'event_crlf_source_fp'::text,
  :'event_lf_source_fp'::text,
  'source fingerprint normalizes CRLF and LF representations identically'
);
update public.cultural_events
set summary = null,
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000001';
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_null_summary_
update public.cultural_events
set summary = '',
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000001';
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_empty_summary_
select is(
  :'event_null_summary_source_fp'::text,
  :'event_empty_summary_source_fp'::text,
  'source fingerprint treats NULL and empty optional text identically'
);
update public.cultural_events
set summary = 'Ringkasan acara',
    event_type = 'Festival Ditambah',
    all_day = true,
    date_note = 'Jadwal berubah',
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000001';
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_changed_
select ok(
  :'event_changed_source_fp'::text <> :'event_before_source_fp'::text,
  'source fingerprint changes when a frozen schedule/content field changes'
);
update public.cultural_events
set event_type = 'Festival',
    all_day = false,
    date_note = 'Jadwal terkonfirmasi',
    latitude = -8.5,
    longitude = 116.1,
    slug = 'acara-utama',
    summary = 'Ringkasan acara',
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000001';
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_restored_
select is(
  :'event_restored_source_fp'::text,
  :'event_before_source_fp'::text,
  'source fingerprint excludes slug and coordinate changes and restores the exact fixture'
);

select is(
  (select count(*) from private.cultural_event_bilingual_legacy_validation_report()),
  0::bigint,
  'clean Cultural Event legacy fixture produces an empty deterministic report'
);
insert into public.cultural_events (
  id, title, slug, description, start_at, created_by, updated_by
) values (
  'c8100000-0000-4000-8000-000000000010', 'Legacy Report Event',
  'legacy-report-event', 'Legacy report fixture', '2038-09-01 01:00:00+00',
  'c8000000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000001'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000010',
  'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000010/c8200000-0000-4000-8000-000000000010.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
insert into public.cultural_event_images (
  id, cultural_event_id, storage_bucket, storage_path, alt_text,
  display_order, is_primary, created_by, updated_by
) values (
  'c8200000-0000-4000-8000-000000000010',
  'c8100000-0000-4000-8000-000000000010',
  'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000010/c8200000-0000-4000-8000-000000000010.jpg',
  'Legacy report image', 0, false,
  'c8000000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000001'
);
select source_revision, thumbnail_binary_revision
from public.cultural_events
where id = 'c8100000-0000-4000-8000-000000000001' \gset legacy_before_
select binary_revision
from public.cultural_event_images
where id = 'c8200000-0000-4000-8000-000000000010' \gset legacy_image_before_
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects
where id = 'c8200000-0000-4000-8000-000000000010';
select ok(
  exists (
    select 1 from private.cultural_event_bilingual_legacy_validation_report()
    where issue_code = 'missing_image_storage_object'
      and cultural_event_image_id = 'c8200000-0000-4000-8000-000000000010'
  ),
  'legacy report identifies a missing Cultural Event image storage object'
);
select ok(
  (select source_revision from public.cultural_events where id = 'c8100000-0000-4000-8000-000000000001') = :'legacy_before_source_revision'::bigint
  and (select thumbnail_binary_revision from public.cultural_events where id = 'c8100000-0000-4000-8000-000000000001') = :'legacy_before_thumbnail_binary_revision'::bigint
  and (select binary_revision from public.cultural_event_images where id = 'c8200000-0000-4000-8000-000000000010') = :'legacy_image_before_binary_revision'::bigint,
  'legacy validation is non-destructive for source and image revision state'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000010',
  'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000010/c8200000-0000-4000-8000-000000000010.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
update public.cultural_event_images
set is_primary = false
where id = 'c8200000-0000-4000-8000-000000000001';
select ok(
  exists (
    select 1 from private.cultural_event_bilingual_legacy_validation_report()
    where issue_code = 'invalid_primary_count'
      and cultural_event_id = 'c8100000-0000-4000-8000-000000000001'
  ),
  'legacy report identifies a published source with zero primary images'
);
update public.cultural_event_images
set is_primary = true
where id = 'c8200000-0000-4000-8000-000000000001';
update public.cultural_events
set thumbnail_bucket = 'tourism-media',
    thumbnail_path = 'cultural-event/c8100000-0000-4000-8000-000000000001/missing-legacy-thumbnail.jpg',
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000001';
select ok(
  exists (
    select 1 from private.cultural_event_bilingual_legacy_validation_report()
    where issue_code = 'thumbnail_without_child'
      and cultural_event_id = 'c8100000-0000-4000-8000-000000000001'
  ),
  'legacy report identifies a cached thumbnail without a matching child image'
);
update public.cultural_events
set thumbnail_bucket = 'tourism-media',
    thumbnail_path = 'cultural-event/c8100000-0000-4000-8000-000000000010/c8200000-0000-4000-8000-000000000010.jpg',
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000001';
select ok(
  exists (
    select 1 from private.cultural_event_bilingual_legacy_validation_report()
    where issue_code = 'thumbnail_points_to_other_event'
      and cultural_event_id = 'c8100000-0000-4000-8000-000000000001'
  ),
  'legacy report identifies a thumbnail path owned by another event'
);
update public.cultural_events
set thumbnail_bucket = 'tourism-media',
    thumbnail_path = 'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000001.jpg',
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000001';
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects
where id = 'c8200000-0000-4000-8000-000000000001';
select ok(
  exists (
    select 1 from private.cultural_event_bilingual_legacy_validation_report()
    where issue_code = 'missing_thumbnail_storage_object'
      and cultural_event_id = 'c8100000-0000-4000-8000-000000000001'
  ),
  'legacy report identifies a missing cached thumbnail storage object'
);
select coalesce((
  select jsonb_agg(to_jsonb(report) order by report.issue_code, report.cultural_event_id, report.cultural_event_image_id, report.detail)::text
  from private.cultural_event_bilingual_legacy_validation_report() as report
), '[]') \gset legacy_report_first_
select coalesce((
  select jsonb_agg(to_jsonb(report) order by report.issue_code, report.cultural_event_id, report.cultural_event_image_id, report.detail)::text
  from private.cultural_event_bilingual_legacy_validation_report() as report
), '[]') \gset legacy_report_second_
select is(
  :'legacy_report_first_coalesce'::text,
  :'legacy_report_second_coalesce'::text,
  'legacy validation report output is deterministic and stably ordered'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000001',
  'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000001.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
delete from public.cultural_event_images
where id = 'c8200000-0000-4000-8000-000000000010';
delete from public.cultural_events
where id = 'c8100000-0000-4000-8000-000000000010';

set local role authenticated;
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000001', null, 'English primary alt', 'English caption'
)).id \gset primary_draft_
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000001', null,
  'Main Event', 'Main Event Summary', 'Main Event Description', 'Festival',
  'Confirmed schedule', 'Village Field', 'Event Address', 'Event Committee',
  'Visitor information'
)).id \gset parent_draft_
set local role postgres;
select private.cultural_event_translation_fingerprint_v1(translation) as translation_fp
from public.cultural_event_translations as translation
where translation.id = :'parent_draft_id' \gset event_parent_translation_marker_
select ok(
  :'event_parent_translation_marker_translation_fp'::text = 'cultural-event-translation-v1:a47ecda579521c7f85c9cfb283f65953b5518fd58b7783584844e25027020d26',
  'parent translation fingerprint matches the independent exact Cultural Event fixture'
);
select private.cultural_event_image_translation_fingerprint_v1(translation) as translation_fp
from public.cultural_event_image_translations as translation
where translation.id = :'primary_draft_id' \gset event_translation_marker_
select ok(
  :'event_translation_marker_translation_fp'::text = 'cultural-event-media-translation-v1:df9f52d6b6dab7e9206a7fcdd3438c358909a09c34eb8dcfe318de7236910bea',
  'image translation fingerprint matches the independent exact Cultural Event fixture'
);
set local role authenticated;
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000001', 1,
  'Main Event Revised', 'Main Event Summary', 'Main Event Description', 'Festival',
  'Confirmed schedule', 'Village Field', 'Event Address', 'Event Committee',
  'Visitor information'
)).edit_revision \gset parent_fingerprint_mutated_
set local role postgres;
select private.cultural_event_translation_fingerprint_v1(translation) as translation_fp
from public.cultural_event_translations as translation
where translation.id = :'parent_draft_id' \gset event_parent_translation_mutated_
set local role authenticated;
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000001', :'parent_fingerprint_mutated_edit_revision',
  'Main Event', 'Main Event Summary', 'Main Event Description', 'Festival',
  'Confirmed schedule', 'Village Field', 'Event Address', 'Event Committee',
  'Visitor information'
)).edit_revision \gset parent_fingerprint_restored_
set local role postgres;
select private.cultural_event_translation_fingerprint_v1(translation) as translation_fp
from public.cultural_event_translations as translation
where translation.id = :'parent_draft_id' \gset event_parent_translation_restored_
select ok(
  :'event_parent_translation_mutated_translation_fp'::text <> :'event_parent_translation_marker_translation_fp'::text
  and :'event_parent_translation_restored_translation_fp'::text = :'event_parent_translation_marker_translation_fp'::text,
  'parent translation fingerprint changes for included content and restores exactly'
);
set local role authenticated;
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000001', 1, 'English primary alt revised', 'English caption'
)).edit_revision \gset image_fingerprint_mutated_
set local role postgres;
select private.cultural_event_image_translation_fingerprint_v1(translation) as translation_fp
from public.cultural_event_image_translations as translation
where translation.id = :'primary_draft_id' \gset event_image_translation_mutated_
set local role authenticated;
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000001', :'image_fingerprint_mutated_edit_revision',
  'English primary alt', 'English caption'
)).edit_revision \gset image_fingerprint_restored_
set local role postgres;
select private.cultural_event_image_translation_fingerprint_v1(translation) as translation_fp
from public.cultural_event_image_translations as translation
where translation.id = :'primary_draft_id' \gset event_image_translation_restored_
select ok(
  :'event_image_translation_mutated_translation_fp'::text <> :'event_translation_marker_translation_fp'::text
  and :'event_image_translation_restored_translation_fp'::text = :'event_translation_marker_translation_fp'::text,
  'image translation fingerprint changes for included content and restores exactly'
);
set local role authenticated;
select throws_ok(
  format(
    'select public.cultural_event_image_translation_review(%L::uuid, %s, false)',
    :'primary_draft_id', :'image_fingerprint_restored_edit_revision'
  ),
  '23514'::char(5), null,
  'image review rejects a missing cultural terminology confirmation at the database boundary'
);
select throws_ok(
  format(
    'select public.cultural_event_translation_review(%L::uuid, %s, false)',
    :'parent_draft_id', :'parent_fingerprint_restored_edit_revision'
  ),
  '23514'::char(5), null,
  'parent review rejects a missing cultural terminology confirmation at the database boundary'
);
select (public.cultural_event_image_translation_review(:'primary_draft_id', :'image_fingerprint_restored_edit_revision', true)).edit_revision \gset primary_reviewed_
select (public.cultural_event_image_translation_publish(:'primary_draft_id', :'primary_reviewed_edit_revision')).edit_revision \gset primary_published_
select (public.cultural_event_translation_review(:'parent_draft_id', :'parent_fingerprint_restored_edit_revision', true)).edit_revision \gset parent_reviewed_
select (public.cultural_event_translation_publish(:'parent_draft_id', :'parent_reviewed_edit_revision')).edit_revision \gset parent_published_

select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'eligible parent translation is published in the fail-closed English parent view'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'eligible primary image translation is published in the English image view'
);
select ok(
  (select title = 'Main Event' and start_at = '2038-08-17 01:00:00+00'::timestamptz and end_at = '2038-08-17 03:00:00+00'::timestamptz
   from public.published_english_cultural_events
   where id = 'c8100000-0000-4000-8000-000000000001'),
  'English projection preserves confirmed UTC schedule instants for WITA presentation'
);
select results_eq(
  format('select event_type from public.cultural_event_translation_review_history(%L::uuid)', :'parent_draft_id'),
  $$values ('draft_saved'), ('draft_saved'), ('draft_saved'), ('reviewed'), ('published')$$,
  'parent history records draft, review, and publication transitions'
);
select results_eq(
  format('select event_type from public.cultural_event_image_translation_review_history(%L::uuid)', :'primary_draft_id'),
  $$values ('draft_saved'), ('draft_saved'), ('draft_saved'), ('reviewed'), ('published')$$,
  'image history records draft, review, and publication transitions'
);

select lives_ok(
  $$update public.cultural_events
    set start_at = '2038-08-18 09:00:00+08',
        end_at = '2038-08-18 11:00:00+08',
        updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'confirmed schedule mutation is accepted through the source workflow'
);
select throws_ok(
  format('select public.cultural_event_translation_republish(%L::uuid, %s)', :'parent_draft_id', :'parent_published_edit_revision'),
  '55000'::char(5), null,
  'republish cannot bypass a stale source checkpoint'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source schedule change suppresses stale English parent publication'
);
select ok(
  (select event_type = 'source_changed' and previous_translation_status = 'published' and new_translation_status = 'published'
   from public.cultural_event_translation_review_history(:'parent_draft_id')
   order by occurred_at desc, id desc limit 1),
  'source mutation appends a stale source-change history event without fabricating a draft transition'
);
select (public.cultural_event_translation_unpublish(:'parent_draft_id', :'parent_published_edit_revision')).edit_revision \gset parent_stale_withdrawn_
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000001',
  :'parent_stale_withdrawn_edit_revision',
  'Main Event', 'Main Event Summary', 'Main Event Description', 'Festival',
  'Confirmed schedule', 'Village Field', 'Event Address', 'Event Committee',
  'Visitor information'
)).edit_revision \gset parent_stale_draft_
select (public.cultural_event_translation_review(:'parent_draft_id', :'parent_stale_draft_edit_revision', true)).edit_revision \gset parent_stale_reviewed_
select (public.cultural_event_translation_republish(:'parent_draft_id', :'parent_stale_reviewed_edit_revision')).edit_revision \gset parent_stale_republished_
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'fresh review and republish restore the eligible English parent'
);

set local role postgres;
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_allday_before_
set local role authenticated;
select lives_ok(
  $$update public.cultural_events
    set all_day = true, updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'all-day schedule changes are accepted through the source workflow'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'all-day changes suppress the stale English parent'
);
set local role postgres;
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_allday_after_
select ok(
  :'event_allday_after_source_fp'::text <> :'event_allday_before_source_fp'::text,
  'all-day is included in the source fingerprint'
);
set local role authenticated;
select lives_ok(
  $$update public.cultural_events
    set all_day = false, updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'restoring the all-day flag is accepted'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'restoring the prior schedule fingerprint restores eligibility'
);
set local role postgres;
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_wita_before_
set local role authenticated;
select lives_ok(
  $$update public.cultural_events
    set start_at = '2038-08-18 01:00:00+00',
        end_at = '2038-08-18 03:00:00+00',
        updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'equivalent UTC schedule values are accepted'
);
set local role postgres;
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_wita_after_
select is(:'event_wita_after_source_fp'::text, :'event_wita_before_source_fp'::text, 'schedule fingerprints canonicalize equivalent UTC instants');
set local role authenticated;
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'equivalent UTC schedule values do not stale the English parent'
);

set local role postgres;
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_neutral_before_
set local role authenticated;
select lives_ok(
  $$update public.cultural_events
    set latitude = -8.6, longitude = 116.2, is_featured = true,
        updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'coordinate and featured changes remain source-neutral for translation freshness'
);
set local role postgres;
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_neutral_after_
select is(:'event_neutral_after_source_fp'::text, :'event_neutral_before_source_fp'::text, 'neutral source fields are excluded from text freshness');
set local role authenticated;
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'neutral source changes do not suppress an otherwise eligible parent'
);
select ok(
  (select public_eligibility
   from public.cultural_event_translation_admin_read('c8100000-0000-4000-8000-000000000001')
   limit 1),
  'neutral source changes do not make the database-derived English eligibility stale'
);

select lives_ok(
  $$update public.cultural_events
    set status = 'archived', updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'source archive/unpublish transition is accepted'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source unpublish immediately suppresses English publication'
);
select is(
  (select translation_status::text from public.cultural_event_translation_admin_read('c8100000-0000-4000-8000-000000000001') limit 1),
  'draft',
  'source unpublish resets a non-archived parent translation to draft'
);
select lives_ok(
  $$update public.cultural_events
    set status = 'draft', updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'source restore returns to draft before republish'
);
select lives_ok(
  $$update public.cultural_events
    set status = 'published', updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'source republish is accepted after returning through draft'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source restore/publication does not automatically republish English content'
);
select (public.cultural_event_translation_review(:'parent_draft_id', (select edit_revision from public.cultural_event_translation_admin_read('c8100000-0000-4000-8000-000000000001') limit 1), true)).edit_revision \gset parent_source_restore_reviewed_
select (public.cultural_event_translation_republish(:'parent_draft_id', :'parent_source_restore_reviewed_edit_revision')).edit_revision \gset parent_source_restore_republished_
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'fresh review is required after source unpublish before publication returns'
);

select lives_ok(
  $$update public.cultural_events
    set status = 'archived', updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'source archive is accepted'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source archive immediately suppresses English publication'
);
select lives_ok(
  $$update public.cultural_events
    set status = 'draft', updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'source restore returns the source to draft only'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source restore never automatically restores public English eligibility'
);
select lives_ok(
  $$update public.cultural_events
    set status = 'published', updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000001'$$,
  'restored source can be explicitly published again'
);
select (public.cultural_event_translation_review(:'parent_draft_id', (select edit_revision from public.cultural_event_translation_admin_read('c8100000-0000-4000-8000-000000000001') limit 1), true)).edit_revision \gset parent_archive_restore_reviewed_
select (public.cultural_event_translation_republish(:'parent_draft_id', :'parent_archive_restore_reviewed_edit_revision')).edit_revision \gset parent_archive_restore_republished_

insert into public.cultural_events (
  id, title, slug, description, start_at, all_day, created_by, updated_by
) values (
  'c8100000-0000-4000-8000-000000000004',
  'Acara Slug Draft', 'acara-slug-lama', 'Deskripsi slug draft',
  '2038-10-01 09:00:00+08', false,
  'c8000000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000001'
);
set local role postgres;
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000004' \gset event_slug_before_
set local role authenticated;
select lives_ok(
  $$update public.cultural_events
    set slug = 'acara-slug-baru',
        updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000004'$$,
  'unpublished source slug can change under the source route contract'
);
set local role postgres;
select private.cultural_event_source_fingerprint_v1(source) as source_fp
from public.cultural_events as source
where source.id = 'c8100000-0000-4000-8000-000000000004' \gset event_slug_after_
select is(:'event_slug_after_source_fp'::text, :'event_slug_before_source_fp'::text, 'source slug is excluded from the source text fingerprint');
set local role authenticated;
select is(
  (select slug from public.cultural_events where id = 'c8100000-0000-4000-8000-000000000004'),
  'acara-slug-baru',
  'source slug remains the route key without an English slug'
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000002',
  'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000002.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
select lives_ok(
  $$select public.media_insert(
    'cultural-event',
    'c8100000-0000-4000-8000-000000000001',
    'c8200000-0000-4000-8000-000000000002',
    'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000002.jpg',
    'Gambar galeri sumber', 'Keterangan galeri sumber', 1, false,
    array[
      'c8200000-0000-4000-8000-000000000001',
      'c8200000-0000-4000-8000-000000000002'
    ]::uuid[]
  )$$,
  'non-primary Cultural Event media can be added without staling the parent'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'non-primary media insertion does not suppress the eligible parent'
);
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000002', null, 'English gallery alt', 'English gallery caption'
)).id \gset gallery_draft_
select (public.cultural_event_image_translation_review(:'gallery_draft_id', 1, true)).edit_revision \gset gallery_reviewed_
select (public.cultural_event_image_translation_publish(:'gallery_draft_id', :'gallery_reviewed_edit_revision')).edit_revision \gset gallery_published_
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000001'),
  2::bigint,
  'published gallery translation is independently visible'
);
select lives_ok(
  $$select public.media_update(
    'cultural-event',
    'c8100000-0000-4000-8000-000000000001',
    'c8200000-0000-4000-8000-000000000002',
    'Gambar galeri diperbarui', 'Keterangan galeri diperbarui', 1, false,
    array[
      'c8200000-0000-4000-8000-000000000001',
      'c8200000-0000-4000-8000-000000000002'
    ]::uuid[]
  )$$,
  'generic media metadata update is accepted for the non-primary Cultural Event image'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'non-primary media mutation suppresses only the affected stale gallery image'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'non-primary media staleness does not suppress the parent'
);
select throws_ok(
  format('select public.cultural_event_image_translation_republish(%L::uuid, %s)', :'gallery_draft_id', :'gallery_published_edit_revision'),
  '55000'::char(5), null,
  'stale gallery translation cannot republish from an old media checkpoint'
);
select (public.cultural_event_image_translation_unpublish(:'gallery_draft_id', :'gallery_published_edit_revision')).edit_revision \gset gallery_withdrawn_
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000002', :'gallery_withdrawn_edit_revision', 'English gallery alt', null
)).edit_revision \gset gallery_refreshed_draft_
select (public.cultural_event_image_translation_review(:'gallery_draft_id', :'gallery_refreshed_draft_edit_revision', true)).edit_revision \gset gallery_refreshed_reviewed_
select (public.cultural_event_image_translation_republish(:'gallery_draft_id', :'gallery_refreshed_reviewed_edit_revision')).edit_revision \gset gallery_refreshed_published_
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000001'),
  2::bigint,
  'fresh gallery review and republish restores only the affected child'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000009', 'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000009.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
select is(
  public.media_replace(
    'cultural-event', 'c8100000-0000-4000-8000-000000000001',
    'c8200000-0000-4000-8000-000000000002',
    'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000009.jpg',
    'Gambar galeri diganti', 'Keterangan galeri diganti', 1, false,
    array[
      'c8200000-0000-4000-8000-000000000001',
      'c8200000-0000-4000-8000-000000000002'
    ]::uuid[]
  ),
  'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000002.jpg',
  'generic media_replace returns the former translated gallery path'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'Cultural Event media_replace suppresses only the replaced translated gallery image'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'Cultural Event media_replace leaves the parent eligible when the gallery image is optional'
);
select throws_ok(
  format('select public.cultural_event_image_translation_republish(%L::uuid, %s)', :'gallery_draft_id', :'gallery_refreshed_published_edit_revision'),
  '55000'::char(5), null,
  'stale Cultural Event gallery cannot republish after binary replacement'
);
select (public.cultural_event_image_translation_unpublish(:'gallery_draft_id', :'gallery_refreshed_published_edit_revision')).edit_revision \gset gallery_replace_withdrawn_
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000002', :'gallery_replace_withdrawn_edit_revision',
  'English gallery alt', null
)).edit_revision \gset gallery_replace_draft_
select (public.cultural_event_image_translation_review(:'gallery_draft_id', :'gallery_replace_draft_edit_revision', true)).edit_revision \gset gallery_replace_reviewed_
select (public.cultural_event_image_translation_republish(:'gallery_draft_id', :'gallery_replace_reviewed_edit_revision')).edit_revision \gset gallery_refreshed_published_
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000001'),
  2::bigint,
  'fresh review and republish restores a replaced Cultural Event gallery image'
);
select lives_ok(
  $$select public.media_set_primary(
    'cultural-event', 'c8100000-0000-4000-8000-000000000001',
    'c8200000-0000-4000-8000-000000000002'
  )$$,
  'generic media_set_primary switches the Cultural Event primary image'
);
select is(
  (select thumbnail_path from public.cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  'cultural-event/c8100000-0000-4000-8000-000000000001/c8200000-0000-4000-8000-000000000009.jpg',
  'media_set_primary updates the Cultural Event cached thumbnail to the trusted image path'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'primary-image selection stales the Cultural Event parent thumbnail checkpoint'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'primary-image selection suppresses the child projection through the stale parent'
);
select lives_ok(
  $$select public.media_set_primary(
    'cultural-event', 'c8100000-0000-4000-8000-000000000001',
    'c8200000-0000-4000-8000-000000000001'
  )$$,
  'generic media_set_primary restores the original Cultural Event primary image'
);
select (public.cultural_event_translation_unpublish(:'parent_draft_id', :'parent_archive_restore_republished_edit_revision')).edit_revision \gset parent_set_primary_withdrawn_
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000001', :'parent_set_primary_withdrawn_edit_revision',
  'Main Event', 'Main Event Summary', 'Main Event Description', 'Festival',
  'Confirmed schedule', 'Village Field', 'Event Address', 'Event Committee',
  'Visitor information'
)).edit_revision \gset parent_set_primary_draft_
select (public.cultural_event_translation_review(:'parent_draft_id', :'parent_set_primary_draft_edit_revision', true)).edit_revision \gset parent_set_primary_reviewed_
select (public.cultural_event_translation_republish(:'parent_draft_id', :'parent_set_primary_reviewed_edit_revision')).edit_revision \gset parent_media_republished_
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'fresh parent review and republish restores eligibility after primary selection changes'
);
select lives_ok(
  $$select public.media_reorder(
    'cultural-event',
    'c8100000-0000-4000-8000-000000000001',
    array[
      'c8200000-0000-4000-8000-000000000002',
      'c8200000-0000-4000-8000-000000000001'
    ]::uuid[]
  )$$,
  'display reorder uses the existing generic media RPC'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'display reorder does not stale translated content'
);

select lives_ok(
  $$select public.media_update(
    'cultural-event',
    'c8100000-0000-4000-8000-000000000001',
    'c8200000-0000-4000-8000-000000000001',
    'Gambar utama baru', 'Keterangan utama baru', 0, true,
    array[
      'c8200000-0000-4000-8000-000000000001',
      'c8200000-0000-4000-8000-000000000002'
    ]::uuid[]
  )$$,
  'primary media metadata mutation is accepted through generic media RPC'
);
set local role postgres;
select private.cultural_event_image_media_fingerprint_v1(image) as media_fp,
       private.cultural_event_thumbnail_media_fingerprint_v1(source, image) as thumbnail_fp
from public.cultural_events as source
join public.cultural_event_images as image
  on image.cultural_event_id = source.id and image.is_primary
where source.id = 'c8100000-0000-4000-8000-000000000001' \gset event_primary_media_after_
select ok(
  :'event_primary_media_after_media_fp'::text <> :'event_media_before_media_fp'::text
  and :'event_primary_media_after_thumbnail_fp'::text <> :'event_before_thumbnail_fp'::text,
  'media and thumbnail fingerprints change after an included primary media mutation'
);
set local role authenticated;
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'primary media mutation stales the required parent thumbnail checkpoint'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'primary media staleness fail-closes the public image projection with the parent'
);
select (public.cultural_event_image_translation_unpublish(:'primary_draft_id', :'primary_published_edit_revision')).edit_revision \gset primary_media_withdrawn_
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000001', :'primary_media_withdrawn_edit_revision', 'English primary alt refreshed', null
)).edit_revision \gset primary_media_draft_
select (public.cultural_event_image_translation_review(:'primary_draft_id', :'primary_media_draft_edit_revision', true)).edit_revision \gset primary_media_reviewed_
select (public.cultural_event_image_translation_republish(:'primary_draft_id', :'primary_media_reviewed_edit_revision')).edit_revision \gset primary_media_republished_
select (public.cultural_event_translation_unpublish(:'parent_draft_id', :'parent_media_republished_edit_revision')).edit_revision \gset parent_media_withdrawn_
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000001', :'parent_media_withdrawn_edit_revision',
  'Main Event', 'Main Event Summary', 'Main Event Description', 'Festival',
  'Confirmed schedule', 'Village Field', 'Event Address', 'Event Committee',
  'Visitor information'
)).edit_revision \gset parent_media_draft_
select (public.cultural_event_translation_review(:'parent_draft_id', :'parent_media_draft_edit_revision', true)).edit_revision \gset parent_media_reviewed_
select (public.cultural_event_translation_republish(:'parent_draft_id', :'parent_media_reviewed_edit_revision')).edit_revision \gset parent_media_republished_
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'fresh primary image and parent checkpoints restore the public parent'
);

insert into public.cultural_events (
  id, title, slug, description, start_at, all_day, created_by, updated_by
) values (
  'c8100000-0000-4000-8000-000000000005',
  'Media Compatibility Event', 'media-compatibility-event',
  'Generic media compatibility fixture', '2038-11-01 09:00:00+08', false,
  'c8000000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000001'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values
  (
    'c8200000-0000-4000-8000-000000000006', 'tourism-media',
    'cultural-event/c8100000-0000-4000-8000-000000000005/c8200000-0000-4000-8000-000000000006.jpg',
    'c8000000-0000-4000-8000-000000000001'
  ),
  (
    'c8200000-0000-4000-8000-000000000007', 'tourism-media',
    'cultural-event/c8100000-0000-4000-8000-000000000005/c8200000-0000-4000-8000-000000000007.jpg',
    'c8000000-0000-4000-8000-000000000001'
  );
select lives_ok(
  $$select public.media_insert(
    'cultural-event', 'c8100000-0000-4000-8000-000000000005',
    'c8200000-0000-4000-8000-000000000006',
    'cultural-event/c8100000-0000-4000-8000-000000000005/c8200000-0000-4000-8000-000000000006.jpg',
    'Compatibility primary', 'Compatibility primary caption', 0, true,
    array['c8200000-0000-4000-8000-000000000006']::uuid[]
  )$$,
  'generic media_insert remains compatible for a Cultural Event primary image'
);
select lives_ok(
  $$select public.media_insert(
    'cultural-event', 'c8100000-0000-4000-8000-000000000005',
    'c8200000-0000-4000-8000-000000000007',
    'cultural-event/c8100000-0000-4000-8000-000000000005/c8200000-0000-4000-8000-000000000007.jpg',
    'Compatibility gallery', 'Compatibility gallery caption', 1, false,
    array[
      'c8200000-0000-4000-8000-000000000006',
      'c8200000-0000-4000-8000-000000000007'
    ]::uuid[]
  )$$,
  'generic media_insert remains compatible for a Cultural Event gallery image'
);
select binary_revision
from public.cultural_event_images
where id = 'c8200000-0000-4000-8000-000000000007' \gset compatibility_media_before_
set local role postgres;
select private.cultural_event_image_media_fingerprint_v1(image) as media_fp
from public.cultural_event_images as image
where image.id = 'c8200000-0000-4000-8000-000000000007' \gset compatibility_media_before_fp_
set local role authenticated;
select lives_ok(
  $$select public.media_update(
    'cultural-event', 'c8100000-0000-4000-8000-000000000005',
    'c8200000-0000-4000-8000-000000000007',
    'Compatibility gallery updated', 'Compatibility caption updated', 1, false,
    array[
      'c8200000-0000-4000-8000-000000000006',
      'c8200000-0000-4000-8000-000000000007'
    ]::uuid[]
  )$$,
  'generic media_update remains compatible for Cultural Event media'
);
select ok(
  (select binary_revision > :'compatibility_media_before_binary_revision'::bigint
   from public.cultural_event_images
   where id = 'c8200000-0000-4000-8000-000000000007'),
  'Cultural Event media_update advances the binary revision'
);
set local role postgres;
select private.cultural_event_image_media_fingerprint_v1(image) as media_fp
from public.cultural_event_images as image
where image.id = 'c8200000-0000-4000-8000-000000000007' \gset compatibility_media_after_fp_
select ok(
  :'compatibility_media_after_fp_media_fp'::text <> :'compatibility_media_before_fp_media_fp'::text,
  'Cultural Event media fingerprint changes after a generic media mutation'
);
set local role authenticated;
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000008', 'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000005/c8200000-0000-4000-8000-000000000008.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
select is(
  public.media_replace(
    'cultural-event', 'c8100000-0000-4000-8000-000000000005',
    'c8200000-0000-4000-8000-000000000007',
    'cultural-event/c8100000-0000-4000-8000-000000000005/c8200000-0000-4000-8000-000000000008.jpg',
    'Compatibility gallery replaced', 'Compatibility replacement caption', 1, false,
    array[
      'c8200000-0000-4000-8000-000000000006',
      'c8200000-0000-4000-8000-000000000007'
    ]::uuid[]
  ),
  'cultural-event/c8100000-0000-4000-8000-000000000005/c8200000-0000-4000-8000-000000000007.jpg',
  'generic media_replace returns the trusted former Cultural Event path'
);
select is(
  (select storage_path from public.cultural_event_images where id = 'c8200000-0000-4000-8000-000000000007'),
  'cultural-event/c8100000-0000-4000-8000-000000000005/c8200000-0000-4000-8000-000000000008.jpg',
  'generic media_replace updates the Cultural Event storage path'
);
select lives_ok(
  $$select public.media_set_primary(
    'cultural-event', 'c8100000-0000-4000-8000-000000000005',
    'c8200000-0000-4000-8000-000000000007'
  )$$,
  'generic media_set_primary remains compatible for Cultural Events'
);
select ok(
  (select is_primary from public.cultural_event_images where id = 'c8200000-0000-4000-8000-000000000007')
  and not (select is_primary from public.cultural_event_images where id = 'c8200000-0000-4000-8000-000000000006')
  and (select thumbnail_path from public.cultural_events where id = 'c8100000-0000-4000-8000-000000000005') like '%c8200000-0000-4000-8000-000000000008.jpg',
  'generic media_set_primary maintains one primary and the cached thumbnail'
);
select lives_ok(
  $$select public.media_reorder(
    'cultural-event', 'c8100000-0000-4000-8000-000000000005',
    array[
      'c8200000-0000-4000-8000-000000000007',
      'c8200000-0000-4000-8000-000000000006'
    ]::uuid[]
  )$$,
  'generic media_reorder remains compatible after Cultural Event replacement and primary selection'
);
select is(
  (select display_order from public.cultural_event_images where id = 'c8200000-0000-4000-8000-000000000007'),
  0,
  'generic media_reorder updates Cultural Event display order'
);
select lives_ok(
  $$select public.media_delete(
    'cultural-event', 'c8100000-0000-4000-8000-000000000005',
    'c8200000-0000-4000-8000-000000000006'
  )$$,
  'generic media_delete remains compatible for a non-primary Cultural Event image'
);
select is(
  (select count(*) from public.cultural_event_images where id = 'c8200000-0000-4000-8000-000000000006'),
  0::bigint,
  'generic media_delete removes the requested Cultural Event image'
);
select throws_ok(
  $$select public.media_delete(
    'cultural-event', 'c8100000-0000-4000-8000-000000000001',
    'c8200000-0000-4000-8000-000000000001'
  )$$,
  '23503'::char(5), null,
  'restrictive Cultural Event image foreign keys preserve translation history'
);

insert into public.cultural_events (
  id, title, slug, description, start_at, all_day, created_by, updated_by
) values (
  'c8100000-0000-4000-8000-000000000002',
  'Acara Tanpa Keterangan',
  'acara-tanpa-keterangan',
  'Deskripsi acara tanpa caption',
  '2038-09-01 09:00:00+08',
  false,
  'c8000000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000001'
);
update public.cultural_events
set summary = '', updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000002';
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000003',
  'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000002/c8200000-0000-4000-8000-000000000003.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
select public.media_insert(
  'cultural-event',
  'c8100000-0000-4000-8000-000000000002',
  'c8200000-0000-4000-8000-000000000003',
  'cultural-event/c8100000-0000-4000-8000-000000000002/c8200000-0000-4000-8000-000000000003.jpg',
  'Gambar tanpa caption', null, 0, true,
  array['c8200000-0000-4000-8000-000000000003']::uuid[]
);
update public.cultural_events
set status = 'published', updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.cultural_event_translation_admin_read('c8100000-0000-4000-8000-000000000002')),
  0::bigint,
  'no parent translation exists before a valid draft save'
);
select throws_ok(
  $$select public.cultural_event_translation_save_draft(
    'c8100000-0000-4000-8000-000000000002', null,
    'No Caption Event', 'Invented summary', 'English description', null, null, null, null, null, null
  )$$,
  '23514'::char(5), null,
  'source-empty optional parent field rejects invented English content'
);
select throws_ok(
  $$select public.cultural_event_translation_save_draft(
    'c8100000-0000-4000-8000-000000000002', null,
    'No Caption Event', null, 'English description', 'Invented event type', null, null, null, null, null
  )$$,
  '23514'::char(5), null,
  'source-empty event type rejects invented English content'
);
select throws_ok(
  $$select public.cultural_event_translation_save_draft(
    'c8100000-0000-4000-8000-000000000002', null,
    'No Caption Event', null, 'English description', null, 'Invented date note', null, null, null, null
  )$$,
  '23514'::char(5), null,
  'source-empty date note rejects invented English content'
);
select throws_ok(
  $$select public.cultural_event_translation_save_draft(
    'c8100000-0000-4000-8000-000000000002', null,
    'No Caption Event', null, 'English description', null, null, 'Invented location', null, null, null
  )$$,
  '23514'::char(5), null,
  'source-empty location rejects invented English content'
);
select throws_ok(
  $$select public.cultural_event_translation_save_draft(
    'c8100000-0000-4000-8000-000000000002', null,
    'No Caption Event', null, 'English description', null, null, null, 'Invented address', null, null
  )$$,
  '23514'::char(5), null,
  'source-empty address rejects invented English content'
);
select throws_ok(
  $$select public.cultural_event_translation_save_draft(
    'c8100000-0000-4000-8000-000000000002', null,
    'No Caption Event', null, 'English description', null, null, null, null, 'Invented organizer', null
  )$$,
  '23514'::char(5), null,
  'source-empty organizer rejects invented English content'
);
select throws_ok(
  $$select public.cultural_event_translation_save_draft(
    'c8100000-0000-4000-8000-000000000002', null,
    'No Caption Event', null, 'English description', null, null, null, null, null, 'Invented visitor information'
  )$$,
  '23514'::char(5), null,
  'source-empty visitor information rejects invented English content'
);
select is(
  (select count(*) from public.cultural_event_translation_admin_read('c8100000-0000-4000-8000-000000000002')),
  0::bigint,
  'rejected source-empty parent save performs zero translation mutation'
);
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000002', null,
  'No Caption Event', null, 'English description', null, null, null, null, null, null
)).id \gset empty_parent_
select throws_ok(
  $$select public.cultural_event_image_translation_save_draft(
    'c8200000-0000-4000-8000-000000000003', null, 'English alt', 'Invented caption'
  )$$,
  '23514'::char(5), null,
  'source-empty image caption rejects invented English caption'
);
select is(
  (select count(*) from public.cultural_event_image_translation_admin_read('c8200000-0000-4000-8000-000000000003')),
  0::bigint,
  'rejected source-empty image save performs zero translation mutation'
);
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000003', null, 'English alt', null
)).id \gset empty_image_
select (public.cultural_event_image_translation_review(:'empty_image_id', 1, true)).edit_revision \gset empty_image_reviewed_
select (public.cultural_event_image_translation_publish(:'empty_image_id', :'empty_image_reviewed_edit_revision')).edit_revision \gset empty_image_published_
select (public.cultural_event_translation_review(:'empty_parent_id', 1, true)).edit_revision \gset empty_parent_reviewed_
select (public.cultural_event_translation_publish(:'empty_parent_id', :'empty_parent_reviewed_edit_revision')).edit_revision \gset empty_parent_published_
select ok(
  (select summary is null and event_type is null and date_note is null
          and location_name is null and address is null and organizer is null
          and visitor_information is null
   from public.published_english_cultural_events
   where id = 'c8100000-0000-4000-8000-000000000002'),
  'source-empty optional parent fields remain NULL without Indonesian fallback'
);
select ok(
  (select caption is null from public.published_english_cultural_event_images
   where id = 'c8200000-0000-4000-8000-000000000003'),
  'source-empty caption is projected as NULL rather than invented English'
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000004',
  'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000002/c8200000-0000-4000-8000-000000000004.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
select public.media_insert(
  'cultural-event',
  'c8100000-0000-4000-8000-000000000002',
  'c8200000-0000-4000-8000-000000000004',
  'cultural-event/c8100000-0000-4000-8000-000000000002/c8200000-0000-4000-8000-000000000004.jpg',
  'Galeri sumber', 'Caption sumber', 1, false,
  array[
    'c8200000-0000-4000-8000-000000000003',
    'c8200000-0000-4000-8000-000000000004'
  ]::uuid[]
);
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000004', null, 'English gallery alt', null
)).id \gset populated_caption_image_
select (public.cultural_event_image_translation_review(:'populated_caption_image_id', 1, true)).edit_revision \gset populated_caption_reviewed_
select (public.cultural_event_image_translation_publish(:'populated_caption_image_id', :'populated_caption_reviewed_edit_revision')).edit_revision \gset populated_caption_published_
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000002'),
  2::bigint,
  'populated source caption may be omitted in English while the image remains eligible'
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c8200000-0000-4000-8000-000000000005',
  'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000002/c8200000-0000-4000-8000-000000000005.jpg',
  'c8000000-0000-4000-8000-000000000001'
);
select public.media_insert(
  'cultural-event',
  'c8100000-0000-4000-8000-000000000002',
  'c8200000-0000-4000-8000-000000000005',
  'cultural-event/c8100000-0000-4000-8000-000000000002/c8200000-0000-4000-8000-000000000005.jpg',
  'Galeri caption kosong', '', 2, false,
  array[
    'c8200000-0000-4000-8000-000000000003',
    'c8200000-0000-4000-8000-000000000004',
    'c8200000-0000-4000-8000-000000000005'
  ]::uuid[]
);
select throws_ok(
  $$select public.cultural_event_image_translation_save_draft(
    'c8200000-0000-4000-8000-000000000005', null, 'English empty-caption alt', 'Invented empty-caption text'
  )$$,
  '23514'::char(5), null,
  'empty source caption rejects invented English caption'
);
select is(
  (select count(*) from public.cultural_event_image_translation_admin_read('c8200000-0000-4000-8000-000000000005')),
  0::bigint,
  'rejected empty-caption save performs zero translation mutation'
);
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000005', null, 'English empty-caption alt', null
)).id \gset empty_caption_image_
select (public.cultural_event_image_translation_review(:'empty_caption_image_id', 1, true)).edit_revision \gset empty_caption_reviewed_
select (public.cultural_event_image_translation_publish(:'empty_caption_image_id', :'empty_caption_reviewed_edit_revision')).edit_revision \gset empty_caption_published_
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000002'),
  3::bigint,
  'empty source caption with English NULL remains an eligible independent gallery image'
);

insert into public.cultural_events (
  id, title, slug, description, date_note, thumbnail_bucket, thumbnail_path,
  created_by, updated_by
) values (
  'c8100000-0000-4000-8000-000000000003',
  'Acara Belum Pasti', 'acara-belum-pasti', 'Deskripsi tanggal belum pasti',
  'Tanggal belum dikonfirmasi', 'tourism-media',
  'cultural-event/c8100000-0000-4000-8000-000000000003/missing.jpg',
  'c8000000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000001'
);
select throws_ok(
  $$update public.cultural_events
    set status = 'published', updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000003'$$,
  '23514'::char(5), null,
  'date-note-only source cannot be published without a confirmed start instant'
);
update public.cultural_events
set start_at = '2038-09-05 11:00:00+08',
    end_at = '2038-09-05 12:00:00+08',
    updated_by = 'c8000000-0000-4000-8000-000000000001'
where id = 'c8100000-0000-4000-8000-000000000003';
select throws_ok(
  $$update public.cultural_events
    set end_at = '2038-09-05 10:00:00+08',
        updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000003'$$,
  '23514'::char(5), null,
  'Cultural Event source rejects an end instant before the start instant'
);

select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000002'),
  3::bigint,
  'optional gallery image remains independent of the required primary image'
);

set local role postgres;
select lives_ok(
  $$update public.cultural_event_images
    set is_primary = false
    where id = 'c8200000-0000-4000-8000-000000000003'$$,
  'fixture can remove the only primary flag for fail-closed verification'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'zero primary images suppress the English parent'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'zero primary images suppress the English image projection through the parent gate'
);
select lives_ok(
  $$update public.cultural_event_images
    set is_primary = true
    where id = 'c8200000-0000-4000-8000-000000000003'$$,
  'fixture restores the valid single primary image'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  1::bigint,
  'exactly one primary whose bucket/path matches the cache is accepted'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000002'),
  3::bigint,
  'exactly one valid primary permits the eligible optional gallery image rows'
);
drop index public.cultural_event_images_primary_idx;
alter table public.cultural_event_images
  drop constraint cultural_event_images_storage_bucket_storage_path_key;
select lives_ok(
  $$update public.cultural_event_images
    set storage_bucket = 'tourism-media',
        storage_path = 'cultural-event/c8100000-0000-4000-8000-000000000002/c8200000-0000-4000-8000-000000000003.jpg',
        is_primary = true
    where id = 'c8200000-0000-4000-8000-000000000004'$$,
  'transaction fixture permits duplicate primary rows that both match the cached pair'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'duplicate primary rows fail closed even when both rows match the cached pair'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'duplicate compatible primaries suppress the English image projection too'
);
select lives_ok(
  $$update public.cultural_event_images
    set storage_path = 'cultural-event/c8100000-0000-4000-8000-000000000002/c8200000-0000-4000-8000-000000000004.jpg'
    where id = 'c8200000-0000-4000-8000-000000000004'$$,
  'transaction fixture restores a duplicate primary whose path matches only one cached row'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'duplicate primary rows fail closed when only one row matches the cached pair'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'duplicate one-match primaries suppress the English image projection too'
);
select lives_ok(
  $$update public.cultural_event_images
    set is_primary = false
    where id = 'c8200000-0000-4000-8000-000000000004'$$,
  'transaction fixture clears duplicate primary rows before restoring constraints'
);
create unique index cultural_event_images_primary_idx
  on public.cultural_event_images (cultural_event_id)
  where is_primary;
alter table public.cultural_event_images
  add constraint cultural_event_images_storage_bucket_storage_path_key
  unique (storage_bucket, storage_path);
set local role authenticated;
select (public.cultural_event_image_translation_unpublish(:'populated_caption_image_id', :'populated_caption_published_edit_revision')).edit_revision \gset duplicate_image_withdrawn_
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000004', :'duplicate_image_withdrawn_edit_revision', 'English gallery alt', null
)).edit_revision \gset duplicate_image_draft_
select (public.cultural_event_image_translation_review(:'populated_caption_image_id', :'duplicate_image_draft_edit_revision', true)).edit_revision \gset duplicate_image_reviewed_
select (public.cultural_event_image_translation_republish(:'populated_caption_image_id', :'duplicate_image_reviewed_edit_revision')).edit_revision \gset populated_caption_published_
select (public.cultural_event_translation_unpublish(:'empty_parent_id', :'empty_parent_published_edit_revision')).edit_revision \gset duplicate_parent_withdrawn_
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000002', :'duplicate_parent_withdrawn_edit_revision',
  'No Caption Event', null, 'English description', null, null, null, null, null, null
)).edit_revision \gset duplicate_parent_draft_
select (public.cultural_event_translation_review(:'empty_parent_id', :'duplicate_parent_draft_edit_revision', true)).edit_revision \gset duplicate_parent_reviewed_
select (public.cultural_event_translation_republish(:'empty_parent_id', :'duplicate_parent_reviewed_edit_revision')).edit_revision \gset empty_parent_published_
set local role postgres;
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  1::bigint,
  'fresh image and parent checkpoints restore eligibility after duplicate-primary fixture teardown'
);
select lives_ok(
  $$update public.cultural_events
    set thumbnail_path = 'cultural-event/c8100000-0000-4000-8000-000000000002/missing-thumbnail.jpg',
        thumbnail_bucket = 'tourism-media',
        updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000002'$$,
  'fixture can point the cached thumbnail at a path without a matching child image'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'thumbnail without a matching child image suppresses the English parent'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'thumbnail without a matching child image suppresses the English image projection'
);
select lives_ok(
  $$update public.cultural_events
    set thumbnail_path = 'cultural-event/c8100000-0000-4000-8000-000000000002/c8200000-0000-4000-8000-000000000003.jpg',
        thumbnail_bucket = 'tourism-media',
        updated_by = 'c8000000-0000-4000-8000-000000000001'
    where id = 'c8100000-0000-4000-8000-000000000002'$$,
  'fixture restores the cached primary pair'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  1::bigint,
  'restoring the unique matching primary restores eligibility without fallback content'
);
select lives_ok(
  $$update public.cultural_event_images
    set is_primary = false
    where id = 'c8200000-0000-4000-8000-000000000003'$$,
  'fixture can select a different single primary'
);
select lives_ok(
  $$update public.cultural_event_images
    set is_primary = true
    where id = 'c8200000-0000-4000-8000-000000000004'$$,
  'fixture selects the gallery image as the only primary'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'a unique primary with a cached-thumbnail mismatch fails closed'
);
select is(
  (select count(*) from public.published_english_cultural_event_images where cultural_event_id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'a unique primary with a cached-thumbnail mismatch suppresses the English image projection'
);
select lives_ok(
  $$update public.cultural_event_images
    set is_primary = false
    where id = 'c8200000-0000-4000-8000-000000000004'$$,
  'fixture clears the mismatched primary'
);
select lives_ok(
  $$update public.cultural_event_images
    set is_primary = true
    where id = 'c8200000-0000-4000-8000-000000000003'$$,
  'fixture restores the cached primary selection'
);
select ok(
  position('order by' in pg_get_functiondef('private.cultural_event_current_primary_image(public.cultural_events)'::regprocedure)) = 0
  and position('limit' in pg_get_functiondef('private.cultural_event_current_primary_image(public.cultural_events)'::regprocedure)) = 0,
  'primary-image helper never resolves ambiguity with ORDER BY or LIMIT'
);
set local role authenticated;

select (public.cultural_event_translation_archive(:'empty_parent_id', :'empty_parent_published_edit_revision')).edit_revision \gset empty_parent_archived_
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'translation archive suppresses the English parent'
);
select (public.cultural_event_translation_restore(:'empty_parent_id', :'empty_parent_archived_edit_revision')).edit_revision \gset empty_parent_restored_
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'translation restore does not automatically republish'
);
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000002', :'empty_parent_restored_edit_revision',
  'No Caption Event', null, 'English description', null, null, null, null, null, null
)).edit_revision \gset empty_parent_after_restore_draft_
select (public.cultural_event_translation_reject(:'empty_parent_id', :'empty_parent_after_restore_draft_edit_revision', 'Terminology needs review')).edit_revision \gset empty_parent_rejected_
select is(
  (select review_state from public.cultural_event_translation_admin_read('c8100000-0000-4000-8000-000000000002') limit 1),
  'rejected',
  'review rejection is represented in the database-derived lifecycle state'
);
select (public.cultural_event_translation_save_draft(
  'c8100000-0000-4000-8000-000000000002', :'empty_parent_rejected_edit_revision',
  'No Caption Event', null, 'English description', null, null, null, null, null, null
)).edit_revision \gset empty_parent_after_rejection_draft_
select (public.cultural_event_translation_review(:'empty_parent_id', :'empty_parent_after_rejection_draft_edit_revision', true)).edit_revision \gset empty_parent_after_rejection_reviewed_
select (public.cultural_event_translation_republish(:'empty_parent_id', :'empty_parent_after_rejection_reviewed_edit_revision')).edit_revision \gset empty_parent_after_rejection_republished_
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  1::bigint,
  'rejected translation requires a fresh draft, review, and republish'
);

select (public.cultural_event_image_translation_archive(:'populated_caption_image_id', :'populated_caption_published_edit_revision')).edit_revision \gset populated_caption_archived_
select (public.cultural_event_image_translation_restore(:'populated_caption_image_id', :'populated_caption_archived_edit_revision')).edit_revision \gset populated_caption_restored_
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000004', :'populated_caption_restored_edit_revision', 'English gallery alt', null
)).edit_revision \gset populated_caption_after_restore_draft_
select (public.cultural_event_image_translation_reject(:'populated_caption_image_id', :'populated_caption_after_restore_draft_edit_revision', 'Image wording needs review')).edit_revision \gset populated_caption_rejected_
select (public.cultural_event_image_translation_save_draft(
  'c8200000-0000-4000-8000-000000000004', :'populated_caption_rejected_edit_revision', 'English gallery alt', null
)).edit_revision \gset populated_caption_after_rejection_draft_
select (public.cultural_event_image_translation_review(:'populated_caption_image_id', :'populated_caption_after_rejection_draft_edit_revision', true)).edit_revision \gset populated_caption_after_rejection_reviewed_
select (public.cultural_event_image_translation_republish(:'populated_caption_image_id', :'populated_caption_after_rejection_reviewed_edit_revision')).edit_revision \gset populated_caption_after_rejection_republished_
select ok(
  (select public_eligibility from public.cultural_event_image_translation_admin_read('c8200000-0000-4000-8000-000000000004') limit 1),
  'image archive, restore, rejection, and fresh republish preserve image lifecycle authority'
);

select throws_ok(
  $$select public.cultural_event_translation_save_draft(
    'c8100000-0000-4000-8000-000000000002', 1,
    'Wrong revision', null, 'English description', null, null, null, null, null, null
  )$$,
  '55000'::char(5), null,
  'stale expected edit revision is rejected'
);

select set_config('request.jwt.claim.sub', 'c8000000-0000-4000-8000-000000000002', true);
select throws_ok(
  format(
    'select public.cultural_event_translation_save_draft(%L::uuid, %s, %L, null, %L, null, null, null, null, null, null)',
    'c8100000-0000-4000-8000-000000000002',
    :'empty_parent_after_rejection_republished_edit_revision',
    'Unauthorized',
    'English description'
  ),
  '42501'::char(5), null,
  'non-administrator cannot invoke Cultural Event translation mutation'
);
select is(
  (select count(*) from public.cultural_event_translation_admin_read('c8100000-0000-4000-8000-000000000002')),
  0::bigint,
  'non-administrator cannot read Cultural Event translation admin state'
);
select is(
  (select count(*) from public.cultural_event_translation_review_history(:'empty_parent_id')),
  0::bigint,
  'non-administrator cannot read Cultural Event parent review history'
);
select is(
  (select count(*) from public.published_english_cultural_events where id = 'c8100000-0000-4000-8000-000000000002'),
  1::bigint,
  'failed non-administrator mutation leaves public data unchanged'
);
select set_config('request.jwt.claim.sub', 'c8000000-0000-4000-8000-000000000001', true);

select ok(
  (select reviewed_by = 'c8000000-0000-4000-8000-000000000001'
   from public.cultural_event_translation_admin_read('c8100000-0000-4000-8000-000000000002')
   limit 1),
  'review actor is derived from auth.uid and recorded by the database'
);

select * from finish();
rollback;
