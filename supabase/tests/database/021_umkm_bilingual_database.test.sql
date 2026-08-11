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

select has_table('public', 'umkm_translations', 'UMKM parent translation table exists');
select has_table('public', 'umkm_image_translations', 'UMKM image translation table exists');
select has_table('public', 'umkm_translation_review_events', 'UMKM parent review history exists');
select has_table('public', 'umkm_image_translation_review_events', 'UMKM image review history exists');
select has_column('public', 'umkms', 'source_revision', 'UMKM source revision exists');
select has_column('public', 'umkm_images', 'binary_revision', 'UMKM image binary revision exists');
select has_column('public', 'umkm_images', 'updated_by', 'UMKM image update actor exists');

select ok(
  (select count(*) = 4
     and bool_and(column_name in ('business_name', 'category', 'description', 'address'))
   from information_schema.columns
  where table_schema = 'public'
    and table_name = 'umkm_translations'
    and column_name in ('business_name', 'category', 'description', 'address')),
  'parent translation exposes exactly the frozen translated fields'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'umkm_translations'
      and column_name in ('name', 'summary', 'history', 'owner_name', 'phone', 'contact_phone', 'contact_consent_confirmed')
  ),
  'parent translation does not duplicate shared or out-of-scope UMKM fields'
);
select ok(
  (select count(*) = 2
     and bool_and(column_name in ('alt_text', 'caption'))
   from information_schema.columns
  where table_schema = 'public'
    and table_name = 'umkm_image_translations'
    and column_name in ('alt_text', 'caption')),
  'image translation exposes only alt text and caption as translated fields'
);

select ok(
  has_table_privilege('anon', 'public.umkm_translations', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.umkm_translations', 'SELECT') = false
  and has_table_privilege('anon', 'public.umkm_translations', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.umkm_translations', 'INSERT') = false
  and has_table_privilege('anon', 'public.umkm_image_translations', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.umkm_image_translations', 'SELECT') = false
  and has_table_privilege('anon', 'public.umkm_image_translations', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.umkm_image_translations', 'INSERT') = false
  and has_table_privilege('anon', 'public.umkm_translation_review_events', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.umkm_translation_review_events', 'SELECT') = false
  and has_table_privilege('anon', 'public.umkm_translation_review_events', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.umkm_translation_review_events', 'INSERT') = false
  and has_table_privilege('anon', 'public.umkm_image_translation_review_events', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.umkm_image_translation_review_events', 'SELECT') = false
  and has_table_privilege('anon', 'public.umkm_image_translation_review_events', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.umkm_image_translation_review_events', 'INSERT') = false,
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
      'umkm_translation_admin_read',
      'umkm_image_translation_admin_read',
      'umkm_translation_review_history',
      'umkm_image_translation_review_history',
      'umkm_translation_save_draft',
      'umkm_translation_review',
      'umkm_translation_reject',
      'umkm_translation_publish',
      'umkm_translation_republish',
      'umkm_translation_archive',
      'umkm_translation_unpublish',
      'umkm_translation_restore',
      'umkm_image_translation_save_draft',
      'umkm_image_translation_review',
      'umkm_image_translation_reject',
      'umkm_image_translation_publish',
      'umkm_image_translation_republish',
      'umkm_image_translation_archive',
      'umkm_image_translation_unpublish',
      'umkm_image_translation_restore'
    )),
  'all UMKM workflow RPCs are administrator-owned security-definer functions'
);

select ok(
  has_function_privilege('authenticated', 'public.umkm_translation_save_draft(uuid,bigint,text,text,text,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_translation_review(uuid,bigint,boolean)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_translation_reject(uuid,bigint,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_translation_publish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_translation_republish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_translation_archive(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_translation_unpublish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_translation_restore(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_image_translation_review(uuid,bigint,boolean)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_image_translation_reject(uuid,bigint,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_image_translation_publish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_image_translation_republish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_image_translation_archive(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_image_translation_unpublish(uuid,bigint)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.umkm_image_translation_restore(uuid,bigint)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.umkm_translation_save_draft(uuid,bigint,text,text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.umkm_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE'),
  'typed UMKM workflow RPCs are executable only by authenticated callers'
);

select ok(
  not has_function_privilege('anon', 'private.umkm_current_primary_image(public.umkms)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.umkm_current_primary_image(public.umkms)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.published_english_umkm_rows()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.published_english_umkm_rows()', 'EXECUTE')
  and not has_function_privilege('anon', 'private.published_english_umkm_image_rows()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.published_english_umkm_image_rows()', 'EXECUTE')
  and not has_table_privilege('anon', 'private.published_english_umkm_rows_data', 'SELECT')
  and not has_table_privilege('authenticated', 'private.published_english_umkm_image_rows_data', 'SELECT'),
  'private eligibility and projection helpers are unavailable to application callers'
);

select ok(
  has_table_privilege('anon', 'public.published_english_umkms', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_umkms', 'SELECT')
  and has_table_privilege('anon', 'public.published_english_umkm_images', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_umkm_images', 'SELECT'),
  'public English UMKM views grant only approved projection access'
);

select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public'
      and table_name = 'published_english_umkms'),
  'id,translation_id,slug,business_name,category,description,address,latitude,longitude,google_maps_url,owner_name,contact_name,contact_phone,contact_whatsapp,thumbnail_bucket,thumbnail_path,is_featured,display_order,published_at,translation_published_at',
  'English UMKM parent view exposes only approved safe columns'
);

select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public'
      and table_name = 'published_english_umkm_images'),
  'id,umkm_id,translation_id,storage_bucket,storage_path,alt_text,caption,display_order,is_primary',
  'English UMKM image view exposes only approved safe columns'
);

select ok(
  position('umkm-source-v1' in pg_get_functiondef('private.umkm_source_fingerprint_v1(public.umkms)'::regprocedure)) > 0
  and position('umkm-translation-v1' in pg_get_functiondef('private.umkm_translation_fingerprint_v1(public.umkm_translations)'::regprocedure)) > 0
  and position('umkm-media-translation-v1' in pg_get_functiondef('private.umkm_image_translation_fingerprint_v1(public.umkm_image_translations)'::regprocedure)) > 0
  and position('umkm-media-v1' in pg_get_functiondef('private.umkm_image_media_fingerprint_v1(public.umkm_images)'::regprocedure)) > 0
  and position('umkm-thumbnail-media-v1' in pg_get_functiondef('private.umkm_thumbnail_media_fingerprint_v1(public.umkms,public.umkm_images)'::regprocedure)) > 0,
  'all exact UMKM fingerprint markers are present'
);

select ok(
  position('''business_name''' in pg_get_functiondef('private.umkm_source_fingerprint_v1(public.umkms)'::regprocedure))
  < position('''category''' in pg_get_functiondef('private.umkm_source_fingerprint_v1(public.umkms)'::regprocedure))
  and position('''category''' in pg_get_functiondef('private.umkm_source_fingerprint_v1(public.umkms)'::regprocedure))
  < position('''description''' in pg_get_functiondef('private.umkm_source_fingerprint_v1(public.umkms)'::regprocedure))
  and position('''description''' in pg_get_functiondef('private.umkm_source_fingerprint_v1(public.umkms)'::regprocedure))
  < position('''address''' in pg_get_functiondef('private.umkm_source_fingerprint_v1(public.umkms)'::regprocedure)),
  'source fingerprint field order matches the frozen UMKM contract'
);

select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select throws_ok(
  $$select * from public.umkm_translations$$,
  '42501'::char(5), null,
  'administrator cannot directly read the parent translation table'
);
select throws_ok(
  $$insert into public.umkm_translations (
      umkm_id, business_name, category, description, address, created_by, updated_by
    ) values (
      'd2100000-0000-4000-8000-000000000001',
      'Direct', 'Direct category', 'Direct description', null,
      'd2000000-0000-4000-8000-000000000001',
      'd2000000-0000-4000-8000-000000000001'
    )$$,
  '42501'::char(5), null,
  'administrator cannot directly write the parent translation table'
);
select throws_ok(
  $$select * from public.umkm_image_translations$$,
  '42501'::char(5), null,
  'administrator cannot directly read the image translation table'
);
select throws_ok(
  $$insert into public.umkm_image_translations (
      umkm_image_id, alt_text, created_by, updated_by
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
  $$select * from public.umkm_translation_review_events$$,
  '42501'::char(5), null,
  'administrator cannot directly read parent review history'
);

select lives_ok(
  $$insert into public.umkms (
      id, business_name, slug, owner_name, category, description, address,
      latitude, longitude, google_maps_url, contact_name, contact_phone,
      contact_whatsapp, contact_consent_confirmed,
      created_by, updated_by
    ) values (
      'd2100000-0000-4000-8000-000000000001',
      'UMKM Sumber', 'umkm-sumber', 'PRIVATE_OWNER_UMKM_TEST', 'Kerajinan',
      'Deskripsi umkm sumber', 'Alamat umkm sumber',
      -8.2, 116.4, 'https://maps.example.test/umkm',
      'PRIVATE_CONTACT_UMKM_TEST', 'PRIVATE_PHONE_UMKM_TEST',
      'PRIVATE_WA_UMKM_TEST', true,
      'd2000000-0000-4000-8000-000000000001',
      'd2000000-0000-4000-8000-000000000001'
    )$$,
  'administrator can create a UMKM source fixture'
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'd2300000-0000-4000-8000-000000000001',
  'tourism-media',
  'umkm/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000001.jpg',
  'd2000000-0000-4000-8000-000000000001'
);

select lives_ok(
  $$select public.media_insert(
    'umkm',
    'd2100000-0000-4000-8000-000000000001',
    'd2200000-0000-4000-8000-000000000001',
    'umkm/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000001.jpg',
    'Foto utama umkm', 'Keterangan utama', 0, true,
    array['d2200000-0000-4000-8000-000000000001']::uuid[]
  )$$,
  'generic media_insert creates the UMKM primary image'
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'd2300000-0000-4000-8000-000000000002',
  'tourism-media',
  'umkm/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000002.jpg',
  'd2000000-0000-4000-8000-000000000001'
);

select lives_ok(
  $$select public.media_insert(
    'umkm',
    'd2100000-0000-4000-8000-000000000001',
    'd2200000-0000-4000-8000-000000000002',
    'umkm/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000002.jpg',
    'Foto galeri umkm', 'Keterangan galeri', 1, false,
    array[
      'd2200000-0000-4000-8000-000000000001',
      'd2200000-0000-4000-8000-000000000002'
    ]::uuid[]
  )$$,
  'generic media_insert creates an optional gallery image'
);

select lives_ok(
  $$update public.umkms
    set contact_consent_confirmed = true,
        status = 'published',
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'source publication remains controlled by the existing UMKM contract'
);

select ok(
  (select count(*) = 1 from public.umkm_images
    where umkm_id = 'd2100000-0000-4000-8000-000000000001' and is_primary)
  and (select thumbnail_bucket = 'tourism-media'
          and thumbnail_path = 'umkm/d2100000-0000-4000-8000-000000000001/d2200000-0000-4000-8000-000000000001.jpg'
        from public.umkms
        where id = 'd2100000-0000-4000-8000-000000000001'),
  'source has exactly one primary image and a matching cached thumbnail'
);

set local role postgres;
select private.umkm_source_fingerprint_v1(source) as source_fp
from public.umkms as source
where source.id = 'd2100000-0000-4000-8000-000000000001' \gset h_source_
select private.umkm_source_fingerprint_v1(source) as source_fp
from public.umkms as source
where source.id = 'd2100000-0000-4000-8000-000000000001' \gset h_source_repeat_
select is(:'h_source_source_fp'::text, :'h_source_repeat_source_fp'::text, 'source fingerprint is deterministic');
select ok(:'h_source_source_fp'::text like 'umkm-source-v1:%', 'source fingerprint has the exact UMKM marker');
select ok(private.umkm_image_media_fingerprint_v1(image)::text like 'umkm-media-v1:%', 'image media fingerprint has the exact marker')
from public.umkm_images as image
where image.id = 'd2200000-0000-4000-8000-000000000001';
select ok(private.umkm_thumbnail_media_fingerprint_v1(source, image)::text like 'umkm-thumbnail-media-v1:%', 'thumbnail fingerprint has the exact marker')
from public.umkms as source
join public.umkm_images as image
  on image.umkm_id = source.id and image.is_primary
where source.id = 'd2100000-0000-4000-8000-000000000001';
set local role authenticated;

select (public.umkm_image_translation_save_draft(
  'd2200000-0000-4000-8000-000000000001', null,
  'English primary alt', 'English primary caption'
)).id \gset h_primary_draft_
select (public.umkm_translation_save_draft(
  'd2100000-0000-4000-8000-000000000001', null,
  'English UMKM', 'Handicraft', 'English description', 'English address'
)).id \gset h_parent_draft_
select (public.umkm_translation_review(
  :'h_parent_draft_id', 1, true
)).edit_revision \gset h_parent_reviewed_
select throws_ok(
  format(
    'select public.umkm_translation_publish(%L::uuid, %s)',
    :'h_parent_draft_id', :'h_parent_reviewed_edit_revision'
  ),
  '55000'::char(5),
  'umkm primary image translation publication eligibility failed',
  'parent publication fails closed until the primary English image is eligible'
);
select (public.umkm_image_translation_review(
  :'h_primary_draft_id', 1, true
)).edit_revision \gset h_primary_reviewed_
select (public.umkm_image_translation_publish(
  :'h_primary_draft_id', :'h_primary_reviewed_edit_revision'
)).edit_revision \gset h_primary_published_
select (public.umkm_translation_publish(
  :'h_parent_draft_id', :'h_parent_reviewed_edit_revision'
)).edit_revision \gset h_parent_published_

select ok(
  (select count(*) = 1 from public.published_english_umkms
    where id = 'd2100000-0000-4000-8000-000000000001')
  and (select count(*) = 1 from public.published_english_umkm_images
    where umkm_id = 'd2100000-0000-4000-8000-000000000001'
      and is_primary),
  'eligible parent and translated primary image are publicly visible'
);
select is(
  (select owner_name from public.published_english_umkms
    where id = 'd2100000-0000-4000-8000-000000000001'),
  'PRIVATE_OWNER_UMKM_TEST',
  'consented owner data is shared without translation'
);
select hasnt_column(
  'public', 'published_english_umkms', 'contact_consent_confirmed',
  'public English view omits consent metadata'
);

select (public.umkm_image_translation_save_draft(
  'd2200000-0000-4000-8000-000000000002', null,
  'English gallery alt', 'English gallery caption'
)).id \gset h_gallery_draft_
select (public.umkm_image_translation_review(
  :'h_gallery_draft_id', 1, true
)).edit_revision \gset h_gallery_reviewed_
select (public.umkm_image_translation_publish(
  :'h_gallery_draft_id', :'h_gallery_reviewed_edit_revision'
)).edit_revision \gset h_gallery_published_
select is(
  (select count(*) from public.published_english_umkm_images
    where umkm_id = 'd2100000-0000-4000-8000-000000000001'),
  2::bigint,
  'optional translated gallery image is independently public'
);

select lives_ok(
  $$update public.umkms
    set latitude = -8.1, longitude = 116.5,
        google_maps_url = 'https://maps.example.test/umkm-updated',
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'neutral coordinate/map changes remain source-controlled'
);
select is(
  (select count(*) from public.published_english_umkms
    where id = 'd2100000-0000-4000-8000-000000000001'),
  1::bigint,
  'neutral coordinate/map changes do not stale translated prose'
);

select lives_ok(
  $$update public.umkms
    set category = 'Updated crafts',
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'source translated-field mutation is accepted by the source workflow'
);
select is(
  (select lifecycle_state from public.umkm_translation_admin_read(
    'd2100000-0000-4000-8000-000000000001') limit 1),
  'stale',
  'source freshness is database-derived and marks the published parent stale'
);
select is(
  (select count(*) from public.published_english_umkms
    where id = 'd2100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source mutation suppresses the stale English parent'
);
select throws_ok(
  format('select public.umkm_translation_republish(%L::uuid, %s)',
    :'h_parent_draft_id', :'h_parent_published_edit_revision'),
  '55000'::char(5),
  'fresh review required before umkm translation publication',
  'old reviewed checkpoint cannot republish after a source translation-field change'
);
select (public.umkm_translation_unpublish(
  :'h_parent_draft_id', :'h_parent_published_edit_revision'
)).edit_revision \gset h_parent_withdrawn_
select (public.umkm_translation_save_draft(
  'd2100000-0000-4000-8000-000000000001',
  :'h_parent_withdrawn_edit_revision',
  'English UMKM', 'Handicraft', 'English description', 'English address'
)).edit_revision \gset h_parent_price_draft_
select (public.umkm_translation_review(
  :'h_parent_draft_id', :'h_parent_price_draft_edit_revision', true
)).edit_revision \gset h_parent_price_reviewed_
select (public.umkm_translation_republish(
  :'h_parent_draft_id', :'h_parent_price_reviewed_edit_revision'
)).edit_revision \gset h_parent_price_republished_

select lives_ok(
  $$select public.media_update(
    'umkm',
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
  'generic media_update mutates UMKM gallery metadata'
);
select is(
  (select count(*) from public.published_english_umkm_images
    where id = 'd2200000-0000-4000-8000-000000000002'),
  0::bigint,
  'gallery media mutation suppresses only the affected stale image'
);
select is(
  (select count(*) from public.published_english_umkms
    where id = 'd2100000-0000-4000-8000-000000000001'),
  1::bigint,
  'non-primary media mutation does not suppress the parent'
);
select throws_ok(
    format('select public.umkm_image_translation_republish(%L::uuid, %s)',
    :'h_gallery_draft_id', :'h_gallery_published_edit_revision'),
  '55000'::char(5),
  'fresh review required before umkm image translation publication',
  'old gallery checkpoint cannot republish after media mutation'
);

select (public.umkm_image_translation_unpublish(
  :'h_gallery_draft_id', :'h_gallery_published_edit_revision'
)).edit_revision \gset h_gallery_withdrawn_
select (public.umkm_image_translation_save_draft(
  'd2200000-0000-4000-8000-000000000002',
  :'h_gallery_withdrawn_edit_revision',
  'English gallery alt changed', null
)).edit_revision \gset h_gallery_refreshed_draft_
select (public.umkm_image_translation_review(
  :'h_gallery_draft_id', :'h_gallery_refreshed_draft_edit_revision', true
)).edit_revision \gset h_gallery_refreshed_reviewed_
select (public.umkm_image_translation_republish(
  :'h_gallery_draft_id', :'h_gallery_refreshed_reviewed_edit_revision'
)).edit_revision \gset h_gallery_refreshed_published_
select is(
  (select count(*) from public.published_english_umkm_images
    where id = 'd2200000-0000-4000-8000-000000000002'),
  1::bigint,
  'fresh gallery review and republish restores the affected image'
);

select lives_ok(
  $$select public.media_reorder(
    'umkm',
    'd2100000-0000-4000-8000-000000000001',
    array[
      'd2200000-0000-4000-8000-000000000002',
      'd2200000-0000-4000-8000-000000000001'
    ]::uuid[]
  )$$,
  'generic media_reorder remains compatible with UMKM images'
);
select lives_ok(
  $$select public.media_set_primary(
    'umkm',
    'd2100000-0000-4000-8000-000000000001',
    'd2200000-0000-4000-8000-000000000002'
  )$$,
  'generic media_set_primary remains compatible with UMKM images'
);
select is(
  (select count(*) from public.umkm_images
    where umkm_id = 'd2100000-0000-4000-8000-000000000001' and is_primary),
  1::bigint,
  'generic media_set_primary preserves the single-primary invariant'
);

select throws_ok(
  $$select public.media_delete(
    'umkm',
    'd2100000-0000-4000-8000-000000000001',
    'd2200000-0000-4000-8000-000000000002'
  )$$,
  '23503'::char(5),
  null,
  'restrictive image foreign keys protect translated media history from deletion'
);

select (public.umkm_translation_archive(
  :'h_parent_draft_id', :'h_parent_price_republished_edit_revision'
)).edit_revision \gset h_parent_archived_
select is(
  (select count(*) from public.published_english_umkms
    where id = 'd2100000-0000-4000-8000-000000000001'),
  0::bigint,
  'archived parent translation is absent from the English view'
);
select (public.umkm_translation_restore(
  :'h_parent_draft_id', :'h_parent_archived_edit_revision'
)).edit_revision \gset h_parent_restored_
select is(
  (select translation_status::text from public.umkm_translation_admin_read(
    'd2100000-0000-4000-8000-000000000001') limit 1),
  'draft',
  'restoring a parent translation never republishes it'
);

select lives_ok(
  $$update public.umkms
    set status = 'archived',
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'source archive succeeds through existing source lifecycle'
);
select is(
  (select count(*) from public.published_english_umkms
    where id = 'd2100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source archive immediately suppresses English publication'
);
select lives_ok(
  $$update public.umkms
    set status = 'draft',
        updated_by = 'd2000000-0000-4000-8000-000000000001'
    where id = 'd2100000-0000-4000-8000-000000000001'$$,
  'source restore remains a non-public draft'
);
select is(
  (select count(*) from public.published_english_umkms
    where id = 'd2100000-0000-4000-8000-000000000001'),
  0::bigint,
  'source restore does not automatically republish English content'
);

select throws_ok(
  $$insert into public.umkm_translation_review_events (
      umkm_translation_id, event_type, previous_translation_status,
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
  (select count(*) from public.published_english_umkms),
  0::bigint,
  'non-administrator cannot see English UMKM rows when none are eligible'
);
select throws_ok(
  $$select public.umkm_translation_save_draft(
      'd2100000-0000-4000-8000-000000000001', null,
      'Denied', 'Denied', null, null
    )$$,
  '42501'::char(5), null,
  'non-administrator cannot execute UMKM translation workflow'
);

reset role;

select * from finish();
rollback;
