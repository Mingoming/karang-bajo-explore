begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

insert into auth.users (id)
values
  ('d2000000-0000-4000-8000-000000000001'),
  ('d2000000-0000-4000-8000-000000000002');

update private.app_config
set administrator_user_id = 'd2000000-0000-4000-8000-000000000001';

select has_table('public', 'homestay_translations', 'Homestay parent translation table exists');
select has_table('public', 'homestay_image_translations', 'Homestay image translation table exists');
select has_table('public', 'homestay_translation_review_events', 'Homestay parent review history exists');
select has_table('public', 'homestay_image_translation_review_events', 'Homestay image review history exists');
select has_column('public', 'homestays', 'source_revision', 'Homestay source revision exists');
select has_column('public', 'homestay_images', 'binary_revision', 'Homestay image binary revision exists');
select has_column('public', 'homestay_images', 'updated_by', 'Homestay image update actor exists');

select ok(
  (select count(*) = 5
     and bool_and(column_name in ('name', 'description', 'address', 'price_note', 'facilities'))
   from information_schema.columns
  where table_schema = 'public'
    and table_name = 'homestay_translations'
    and column_name in ('name', 'description', 'address', 'price_note', 'facilities')),
  'parent translation exposes exactly the frozen translated fields'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'homestay_translations'
      and column_name in ('summary', 'history', 'owner_name', 'phone', 'price_per_night')
  ),
  'parent translation does not duplicate shared or out-of-scope Homestay fields'
);
select ok(
  (select count(*) = 2
     and bool_and(column_name in ('alt_text', 'caption'))
   from information_schema.columns
  where table_schema = 'public'
    and table_name = 'homestay_image_translations'
    and column_name in ('alt_text', 'caption')),
  'image translation exposes only alt text and caption as translated fields'
);

select ok(
  has_table_privilege('anon', 'public.homestay_translations', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.homestay_translations', 'SELECT') = false
  and has_table_privilege('anon', 'public.homestay_translations', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.homestay_translations', 'INSERT') = false
  and has_table_privilege('anon', 'public.homestay_image_translations', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.homestay_image_translations', 'SELECT') = false
  and has_table_privilege('anon', 'public.homestay_image_translations', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.homestay_image_translations', 'INSERT') = false
  and has_table_privilege('anon', 'public.homestay_translation_review_events', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.homestay_translation_review_events', 'SELECT') = false
  and has_table_privilege('anon', 'public.homestay_translation_review_events', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.homestay_translation_review_events', 'INSERT') = false
  and has_table_privilege('anon', 'public.homestay_image_translation_review_events', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.homestay_image_translation_review_events', 'SELECT') = false
  and has_table_privilege('anon', 'public.homestay_image_translation_review_events', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.homestay_image_translation_review_events', 'INSERT') = false,
  'translation and review tables have no direct application privileges'
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
      'homestay_translation_admin_read',
      'homestay_image_translation_admin_read',
      'homestay_translation_review_history',
      'homestay_image_translation_review_history',
      'homestay_translation_save_draft',
      'homestay_translation_review',
      'homestay_translation_reject',
      'homestay_translation_publish',
      'homestay_translation_republish',
      'homestay_translation_archive',
      'homestay_translation_unpublish',
      'homestay_translation_restore',
      'homestay_image_translation_save_draft',
      'homestay_image_translation_review',
      'homestay_image_translation_reject',
      'homestay_image_translation_publish',
      'homestay_image_translation_republish',
      'homestay_image_translation_archive',
      'homestay_image_translation_unpublish',
      'homestay_image_translation_restore'
    )),
  'all Homestay workflow RPCs are administrator-owned security-definer functions'
);

select ok(
  has_function_privilege('authenticated', 'public.homestay_translation_save_draft(uuid,bigint,text,text,text,text,text[])', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_translation_review(uuid,bigint,boolean)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_translation_reject(uuid,bigint,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_translation_publish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_translation_republish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_translation_archive(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_translation_unpublish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_translation_restore(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_image_translation_review(uuid,bigint,boolean)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_image_translation_reject(uuid,bigint,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_image_translation_publish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_image_translation_republish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_image_translation_archive(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_image_translation_unpublish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.homestay_image_translation_restore(uuid,bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.homestay_translation_save_draft(uuid,bigint,text,text,text,text,text[])', 'EXECUTE')
  and not has_function_privilege('anon', 'public.homestay_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE'),
  'typed Homestay workflow RPCs are executable only by authenticated callers'
);

select ok(
  not has_function_privilege('anon', 'private.homestay_current_primary_image(public.homestays)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.homestay_current_primary_image(public.homestays)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.published_english_homestay_rows()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.published_english_homestay_rows()', 'EXECUTE')
  and not has_function_privilege('anon', 'private.published_english_homestay_image_rows()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.published_english_homestay_image_rows()', 'EXECUTE')
  and not has_table_privilege('anon', 'private.published_english_homestay_rows_data', 'SELECT')
  and not has_table_privilege('authenticated', 'private.published_english_homestay_image_rows_data', 'SELECT'),
  'private eligibility and projection helpers are unavailable to application callers'
);

select ok(
  has_table_privilege('anon', 'public.published_english_homestays', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_homestays', 'SELECT')
  and has_table_privilege('anon', 'public.published_english_homestay_images', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_homestay_images', 'SELECT'),
  'public English Homestay views grant only approved projection access'
);

select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public'
      and table_name = 'published_english_homestays'),
  'id,translation_id,slug,name,description,price_per_night,address,price_note,facilities,latitude,longitude,google_maps_url,owner_name,phone,thumbnail_bucket,thumbnail_path,is_featured,display_order,published_at,translation_published_at',
  'English Homestay parent view exposes only approved safe columns'
);

select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public'
      and table_name = 'published_english_homestay_images'),
  'id,homestay_id,translation_id,storage_bucket,storage_path,alt_text,caption,display_order,is_primary',
  'English Homestay image view exposes only approved safe columns'
);

select ok(
  position('homestay-source-v1' in pg_get_functiondef('private.homestay_source_fingerprint_v1(public.homestays)'::regprocedure)) > 0
  and position('homestay-translation-v1' in pg_get_functiondef('private.homestay_translation_fingerprint_v1(public.homestay_translations)'::regprocedure)) > 0
  and position('homestay-media-translation-v1' in pg_get_functiondef('private.homestay_image_translation_fingerprint_v1(public.homestay_image_translations)'::regprocedure)) > 0
  and position('homestay-media-v1' in pg_get_functiondef('private.homestay_image_media_fingerprint_v1(public.homestay_images)'::regprocedure)) > 0
  and position('homestay-thumbnail-media-v1' in pg_get_functiondef('private.homestay_thumbnail_media_fingerprint_v1(public.homestays,public.homestay_images)'::regprocedure)) > 0,
  'all exact Homestay fingerprint markers are present'
);

select ok(
  position('''name''' in pg_get_functiondef('private.homestay_source_fingerprint_v1(public.homestays)'::regprocedure))
  < position('''description''' in pg_get_functiondef('private.homestay_source_fingerprint_v1(public.homestays)'::regprocedure))
  and position('''address''' in pg_get_functiondef('private.homestay_source_fingerprint_v1(public.homestays)'::regprocedure))
  < position('''price_per_night''' in pg_get_functiondef('private.homestay_source_fingerprint_v1(public.homestays)'::regprocedure))
  and position('''price_per_night''' in pg_get_functiondef('private.homestay_source_fingerprint_v1(public.homestays)'::regprocedure))
  < position('''price_note''' in pg_get_functiondef('private.homestay_source_fingerprint_v1(public.homestays)'::regprocedure))
  and position('''price_note''' in pg_get_functiondef('private.homestay_source_fingerprint_v1(public.homestays)'::regprocedure))
  < position('''facilities''' in pg_get_functiondef('private.homestay_source_fingerprint_v1(public.homestays)'::regprocedure)),
  'source fingerprint field order matches the frozen Homestay contract'
);

select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$select * from public.homestay_translations$$,
  '42501'::char(5), null,
  'administrator cannot directly read the parent translation table'
);
select throws_ok(
  $$insert into public.homestay_translations (
      homestay_id, name, description, facilities, created_by, updated_by
    ) values (
      'd2100000-0000-4000-8000-000000000001',
      'Direct', 'Direct', '{}'::text[],
      'd2000000-0000-4000-8000-000000000001',
      'd2000000-0000-4000-8000-000000000001'
    )$$,
  '42501'::char(5), null,
  'administrator cannot directly write the parent translation table'
);
select throws_ok(
  $$select * from public.homestay_image_translations$$,
  '42501'::char(5), null,
  'administrator cannot directly read the image translation table'
);
select throws_ok(
  $$insert into public.homestay_image_translations (
      homestay_image_id, alt_text, created_by, updated_by
    ) values (
      'd2200000-0000-4000-8000-000000000001',
      'Direct',
      'd2000000-0000-4000-8000-000000000001',
      'd2000000-0000-4000-8000-000000000001'
    )$$,
  '42501'::char(5), null,
  'administrator cannot directly write the image translation table'
);
select throws_ok(
  $$select * from public.homestay_translation_review_events$$,
  '42501'::char(5), null,
  'administrator cannot directly read parent review history'
);

select lives_ok(
  $$insert into public.homestays (
      id, name, slug, owner_name, phone, description, address,
      latitude, longitude, google_maps_url, price_per_night, price_note,
      facilities, created_by, updated_by
    ) values (
      'd2100000-0000-4000-8000-000000000001',
      'Homestay Sumber', 'homestay-sumber',
      'PRIVATE_OWNER_HOMESTAY_TEST', 'PRIVATE_PHONE_HOMESTAY_TEST',
      'Deskripsi homestay sumber', 'Alamat homestay sumber',
      -8.2, 116.4, 'https://maps.example.test/homestay',
      125000, 'Termasuk sarapan',
      array['Air minum', 'Wi-Fi', 'Air minum']::text[],
      'd2000000-0000-4000-8000-000000000001',
      'd2000000-0000-4000-8000-000000000001'
    )$$,
  'administrator can create a Homestay source fixture'
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'd2300000-0000-4000-8000-000000000001',
  'tourism-media',
  'homestay/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000001.jpg',
  'd2000000-0000-4000-8000-000000000001'
);

select lives_ok(
  $$select public.media_insert(
    'homestay',
    'd2100000-0000-4000-8000-000000000001',
    'd2200000-0000-4000-8000-000000000001',
    'homestay/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000001.jpg',
    'Foto utama homestay', 'Keterangan utama', 0, true,
    array['d2200000-0000-4000-8000-000000000001']::uuid[]
  )$$,
  'generic media_insert creates the Homestay primary image'
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'd2300000-0000-4000-8000-000000000002',
  'tourism-media',
  'homestay/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000002.jpg',
  'd2000000-0000-4000-8000-000000000001'
);

select lives_ok(
  $$select public.media_insert(
    'homestay',
    'd2100000-0000-4000-8000-000000000001',
    'd2200000-0000-4000-8000-000000000002',
    'homestay/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000002.jpg',
    'Foto galeri homestay', 'Keterangan galeri', 1, false,
    array[
      'd2200000-0000-4000-8000-000000000001',
      'd2200000-0000-4000-8000-000000000002'
    ]::uuid[]
  )$$,
  'generic media_insert creates an optional gallery image'
);

select lives_ok(
  $$update public.homestays
    set contact_consent_confirmed = true,
        status = 'published',
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'source publication remains controlled by the existing Homestay contract'
);

select ok(
  (select count(*) = 1 from public.homestay_images
    where homestay_id = 'd2100000-0000-4000-8000-000000000001' and is_primary)
  and (select thumbnail_bucket = 'tourism-media'
          and thumbnail_path = 'homestay/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000001.jpg'
        from public.homestays
        where id = 'd2100000-0000-4000-8000-000000000001'),
  'source has exactly one primary image and a matching cached thumbnail'
);

set local role postgres;
select private.homestay_source_fingerprint_v1(source) as source_fp
from public.homestays as source
where source.id = 'd2100000-0000-4000-8000-000000000001' \gset h_source_
select private.homestay_source_fingerprint_v1(source) as source_fp
from public.homestays as source
where source.id = 'd2100000-0000-4000-8000-000000000001' \gset h_source_repeat_
select is(:'h_source_source_fp'::text, :'h_source_repeat_source_fp'::text, 'source fingerprint is deterministic');
select ok(:'h_source_source_fp'::text like 'homestay-source-v1:%', 'source fingerprint has the exact Homestay marker');
select ok(private.homestay_image_media_fingerprint_v1(image)::text like 'homestay-media-v1:%', 'image media fingerprint has the exact marker')
from public.homestay_images as image
where image.id = 'd2200000-0000-4000-8000-000000000001';
select ok(private.homestay_thumbnail_media_fingerprint_v1(source, image)::text like 'homestay-thumbnail-media-v1:%', 'thumbnail fingerprint has the exact marker')
from public.homestays as source
join public.homestay_images as image
  on image.homestay_id = source.id and image.is_primary
where source.id = 'd2100000-0000-4000-8000-000000000001';
set local role authenticated;

select (public.homestay_image_translation_save_draft(
  'd2200000-0000-4000-8000-000000000001', null,
  'English primary alt', 'English primary caption'
)).id \gset h_primary_draft_
select (public.homestay_translation_save_draft(
  'd2100000-0000-4000-8000-000000000001', null,
  'English Homestay', 'English description', 'English address',
  'English price note',
  array['Drinking water', 'Wi-Fi', 'Drinking water']::text[]
)).id \gset h_parent_draft_
select (public.homestay_translation_review(
  :'h_parent_draft_id', 1, true
)).edit_revision \gset h_parent_reviewed_
select throws_ok(
  format(
    'select public.homestay_translation_publish(%L::uuid, %s)',
    :'h_parent_draft_id', :'h_parent_reviewed_edit_revision'
  ),
  '55000'::char(5),
  'homestay primary image translation publication eligibility failed',
  'parent publication fails closed until the primary English image is eligible'
);
select (public.homestay_image_translation_review(
  :'h_primary_draft_id', 1, true
)).edit_revision \gset h_primary_reviewed_
select (public.homestay_image_translation_publish(
  :'h_primary_draft_id', :'h_primary_reviewed_edit_revision'
)).edit_revision \gset h_primary_published_
select (public.homestay_translation_publish(
  :'h_parent_draft_id', :'h_parent_reviewed_edit_revision'
)).edit_revision \gset h_parent_published_

select ok(
  (select count(*) = 1 from public.published_english_homestays
    where id = 'd2100000-0000-4000-8000-000000000001')
  and (select count(*) = 1 from public.published_english_homestay_images
    where homestay_id = 'd2100000-0000-4000-8000-000000000001'
      and is_primary),
  'eligible parent and translated primary image are publicly visible'
);
select is(
  (select facilities from public.published_english_homestays
    where id = 'd2100000-0000-4000-8000-000000000001'),
  array['Drinking water', 'Wi-Fi', 'Drinking water']::text[],
  'English facilities preserve source cardinality, order, and duplicates'
);
select is(
  (select owner_name from public.published_english_homestays
    where id = 'd2100000-0000-4000-8000-000000000001'),
  'PRIVATE_OWNER_HOMESTAY_TEST',
  'consented owner data is shared without translation'
);
select hasnt_column(
  'public', 'published_english_homestays', 'contact_consent_confirmed',
  'public English view omits consent metadata'
);

select (public.homestay_image_translation_save_draft(
  'd2200000-0000-4000-8000-000000000002', null,
  'English gallery alt', 'English gallery caption'
)).id \gset h_gallery_draft_
select (public.homestay_image_translation_review(
  :'h_gallery_draft_id', 1, true
)).edit_revision \gset h_gallery_reviewed_
select (public.homestay_image_translation_publish(
  :'h_gallery_draft_id', :'h_gallery_reviewed_edit_revision'
)).edit_revision \gset h_gallery_published_
select is(
  (select count(*) from public.published_english_homestay_images
    where homestay_id = 'd2100000-0000-4000-8000-000000000001'),
  2::bigint,
  'optional translated gallery image is independently public'
);

select lives_ok(
  $$update public.homestays
    set latitude = -8.1, longitude = 116.5,
        google_maps_url = 'https://maps.example.test/homestay-updated',
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'neutral coordinate/map changes remain source-controlled'
);
select is(
  (select count(*) from public.published_english_homestays
    where id = 'd2100000-0000-4000-8000-000000000001'),
  1::bigint,
  'neutral coordinate/map changes do not stale translated prose'
);

select lives_ok(
  $$update public.homestays
    set price_per_night = 150000,
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'source price mutation is accepted by the source workflow'
);
select is(
  (select lifecycle_state from public.homestay_translation_admin_read(
    'd2100000-0000-4000-8000-000000000001') limit 1),
  'stale',
  'price freshness is database-derived and marks the published parent stale'
);
select is(
  (select count(*) from public.published_english_homestays
    where id = 'd2100000-0000-4000-8000-000000000001'),
  0::bigint,
  'price mutation suppresses the stale English parent'
);
select throws_ok(
  format('select public.homestay_translation_republish(%L::uuid, %s)',
    :'h_parent_draft_id', :'h_parent_published_edit_revision'),
  '55000'::char(5),
  'fresh review required before homestay translation publication',
  'old reviewed checkpoint cannot republish after a source price change'
);
select (public.homestay_translation_unpublish(
  :'h_parent_draft_id', :'h_parent_published_edit_revision'
)).edit_revision \gset h_parent_withdrawn_
select (public.homestay_translation_save_draft(
  'd2100000-0000-4000-8000-000000000001',
  :'h_parent_withdrawn_edit_revision',
  'English Homestay', 'English description', 'English address',
  'English price note',
  array['Drinking water', 'Wi-Fi', 'Drinking water']::text[]
)).edit_revision \gset h_parent_price_draft_
select (public.homestay_translation_review(
  :'h_parent_draft_id', :'h_parent_price_draft_edit_revision', true
)).edit_revision \gset h_parent_price_reviewed_
select (public.homestay_translation_republish(
  :'h_parent_draft_id', :'h_parent_price_reviewed_edit_revision'
)).edit_revision \gset h_parent_price_republished_

select lives_ok(
  $$select public.media_update(
    'homestay',
    'd2100000-0000-4000-8000-000000000001',
    'd2200000-0000-4000-8000-000000000002',
    'English gallery alt changed',
    'Keterangan galeri berubah',
    1, false,
    array[
      'd2200000-0000-4000-8000-000000000001',
      'd2200000-0000-4000-8000-000000000002'
    ]::uuid[]
  )$$,
  'generic media_update mutates Homestay gallery metadata'
);
select is(
  (select count(*) from public.published_english_homestay_images
    where id = 'd2200000-0000-4000-8000-000000000002'),
  0::bigint,
  'gallery media mutation suppresses only the affected stale image'
);
select is(
  (select count(*) from public.published_english_homestays
    where id = 'd2100000-0000-4000-8000-000000000001'),
  1::bigint,
  'non-primary media mutation does not suppress the parent'
);
select throws_ok(
    format('select public.homestay_image_translation_republish(%L::uuid, %s)',
    :'h_gallery_draft_id', :'h_gallery_published_edit_revision'),
  '55000'::char(5),
  'fresh review required before homestay image translation publication',
  'old gallery checkpoint cannot republish after media mutation'
);

select (public.homestay_image_translation_unpublish(
  :'h_gallery_draft_id', :'h_gallery_published_edit_revision'
)).edit_revision \gset h_gallery_withdrawn_
select (public.homestay_image_translation_save_draft(
  'd2200000-0000-4000-8000-000000000002',
  :'h_gallery_withdrawn_edit_revision',
  'English gallery alt changed', null
)).edit_revision \gset h_gallery_refreshed_draft_
select (public.homestay_image_translation_review(
  :'h_gallery_draft_id', :'h_gallery_refreshed_draft_edit_revision', true
)).edit_revision \gset h_gallery_refreshed_reviewed_
select (public.homestay_image_translation_republish(
  :'h_gallery_draft_id', :'h_gallery_refreshed_reviewed_edit_revision'
)).edit_revision \gset h_gallery_refreshed_published_
select is(
  (select count(*) from public.published_english_homestay_images
    where id = 'd2200000-0000-4000-8000-000000000002'),
  1::bigint,
  'fresh gallery review and republish restores the affected image'
);

select lives_ok(
  $$select public.media_reorder(
    'homestay',
    'd2100000-0000-4000-8000-000000000001',
    array[
      'd2200000-0000-4000-8000-000000000002',
      'd2200000-0000-4000-8000-000000000001'
    ]::uuid[]
  )$$,
  'generic media_reorder remains compatible with Homestay images'
);
select lives_ok(
  $$select public.media_set_primary(
    'homestay',
    'd2100000-0000-4000-8000-000000000001',
    'd2200000-0000-4000-8000-000000000002'
  )$$,
  'generic media_set_primary remains compatible with Homestay images'
);
select is(
  (select count(*) from public.homestay_images
    where homestay_id = 'd2100000-0000-4000-8000-000000000001' and is_primary),
  1::bigint,
  'generic media_set_primary preserves the single-primary invariant'
);

select throws_ok(
  $$select public.media_delete(
    'homestay',
    'd2100000-0000-4000-8000-000000000001',
    'd2200000-0000-4000-8000-000000000002'
  )$$,
  '23503'::char(5),
  null,
  'restrictive image foreign keys protect translated media history from deletion'
);

select (public.homestay_translation_archive(
  :'h_parent_draft_id', :'h_parent_price_republished_edit_revision'
)).edit_revision \gset h_parent_archived_
select is(
  (select count(*) from public.published_english_homestays
    where id = 'd2100000-0000-4000-8000-000000000001'),
  0::bigint,
  'archived parent translation is absent from the English view'
);
select (public.homestay_translation_restore(
  :'h_parent_draft_id', :'h_parent_archived_edit_revision'
)).edit_revision \gset h_parent_restored_
select is(
  (select translation_status::text from public.homestay_translation_admin_read(
    'd2100000-0000-4000-8000-000000000001') limit 1),
  'draft',
  'restoring a parent translation never republishes it'
);

select lives_ok(
  $$update public.homestays
    set status = 'archived',
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'source archive succeeds through existing source lifecycle'
);
select is(
  (select count(*) from public.published_english_homestays
    where id = 'd2100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source archive immediately suppresses English publication'
);
select lives_ok(
  $$update public.homestays
    set status = 'draft',
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'source restore remains a non-public draft'
);
select is(
  (select count(*) from public.published_english_homestays
    where id = 'd2100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source restore does not automatically republish English content'
);

select throws_ok(
  $$insert into public.homestay_translation_review_events (
      homestay_translation_id, event_type, previous_translation_status,
      new_translation_status, previous_review_state, new_review_state,
      actor_id, source_revision
    ) values (
      'd2100000-0000-4000-8000-000000000001', 'draft_saved', 'draft', 'draft',
      'pending', 'pending', 'd2000000-0000-4000-8000-000000000001', 1
    )$$,
  '42501'::char(5), null,
  'parent review history is append-only and not directly writable'
);

reset role;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is(
  (select count(*) from public.published_english_homestays),
  0::bigint,
  'non-administrator cannot see English Homestay rows when none are eligible'
);
select throws_ok(
  $$select public.homestay_translation_save_draft(
      'd2100000-0000-4000-8000-000000000001', null,
      'Denied', 'Denied', null, null, '{}'::text[]
    )$$,
  '42501'::char(5), null,
  'non-administrator cannot execute Homestay translation workflow'
);

reset role;

select * from finish();
rollback;
