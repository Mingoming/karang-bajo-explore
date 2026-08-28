begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;

select no_plan();

select has_table('public', 'tourism_package_translations',
  'Tourism Package parent translation table exists');
select has_table('public', 'tourism_package_image_translations',
  'Tourism Package image translation table exists');
select has_table('public', 'tourism_package_translation_review_events',
  'Tourism Package parent review history exists');
select has_table('public', 'tourism_package_image_translation_review_events',
  'Tourism Package image review history exists');
select has_column('public', 'tourism_packages', 'aggregate_revision',
  'Tourism Package aggregate revision is present');
select has_column('public', 'package_images', 'binary_revision',
  'Tourism Package image binary revision is present');
select has_column('public', 'package_images', 'updated_at',
  'Tourism Package image updated timestamp is present');
select has_column('public', 'package_images', 'updated_by',
  'Tourism Package image update actor is present');
select ok(
  (select count(*) = 5
   from pg_catalog.pg_class as index_class
   join pg_catalog.pg_namespace as index_namespace
     on index_namespace.oid = index_class.relnamespace
   where index_namespace.nspname = 'public'
     and index_class.relkind = 'i'
     and index_class.relname in (
       'tourism_package_translations_public_lookup_idx',
       'tourism_package_translations_admin_queue_idx',
       'tourism_package_image_translations_public_lookup_idx',
       'tourism_package_translation_events_history_idx',
       'tourism_package_image_translation_events_history_idx'
     )),
  'Tourism Package translation and review history indexes exist'
);

select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'tourism_package_translations'
     and column_name in (
       'name', 'duration_unit', 'price_note', 'included_facilities',
       'souvenir', 'summary', 'description'
     )),
  'name,duration_unit,price_note,included_facilities,souvenir,summary,description',
  'parent translation exposes exactly the frozen translated fields'
);
select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'tourism_package_image_translations'
     and column_name in ('alt_text', 'caption')),
  'alt_text,caption',
  'image translation exposes exactly alt text and caption'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tourism_package_translations'
      and column_name in (
        'slug', 'package_type', 'duration_value', 'price',
        'latitude', 'longitude', 'google_maps_url', 'contact_phone',
        'exclusions', 'notes'
      )
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tourism_package_image_translations'
      and column_name in ('storage_bucket', 'storage_path', 'is_primary', 'display_order')
  ),
  'shared source values and storage references are not duplicated into translation tables'
);

select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'published_english_tourism_packages'),
  'id,translation_id,slug,name,package_type,duration_value,duration_unit,price,price_note,included_facilities,souvenir,summary,description,thumbnail_bucket,thumbnail_path,is_featured,display_order,published_at,translation_published_at',
  'English Tourism Package parent projection exposes only the frozen columns'
);
select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'published_english_tourism_package_images'),
  'id,package_id,translation_id,storage_bucket,storage_path,alt_text,caption,display_order,is_primary',
  'English Tourism Package image projection exposes only the frozen columns'
);
select is(
  (select string_agg(column_name::text, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'published_english_tourism_package_destinations'),
  'id,package_id,destination_id,display_order,destination_name,destination_slug',
  'English Tourism Package relationship projection omits source-only notes'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name like 'published_english_tourism_package%'
      and column_name = 'notes'
  ),
  'source-only relationship notes are not public'
);

select ok(
  has_table_privilege('anon', 'public.tourism_package_translations', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.tourism_package_translations', 'SELECT') = false
  and has_table_privilege('anon', 'public.tourism_package_translations', 'INSERT') = false
  and has_table_privilege('authenticated', 'public.tourism_package_translations', 'INSERT') = false
  and has_table_privilege('anon', 'public.tourism_package_image_translations', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.tourism_package_image_translations', 'SELECT') = false
  and has_table_privilege('anon', 'public.tourism_package_translation_review_events', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.tourism_package_translation_review_events', 'INSERT') = false
  and has_table_privilege('anon', 'public.tourism_package_image_translation_review_events', 'SELECT') = false
  and has_table_privilege('authenticated', 'public.tourism_package_image_translation_review_events', 'INSERT') = false,
  'translation and review tables have no direct application privileges'
);
select ok(
  has_table_privilege('anon', 'public.published_english_tourism_packages', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_tourism_packages', 'SELECT')
  and has_table_privilege('anon', 'public.published_english_tourism_package_images', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_tourism_package_images', 'SELECT')
  and has_table_privilege('anon', 'public.published_english_tourism_package_destinations', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_tourism_package_destinations', 'SELECT'),
  'only the three approved English Tourism Package projections are public'
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
       'tourism_package_translation_admin_read',
       'tourism_package_image_translation_admin_read',
       'tourism_package_translation_review_history',
       'tourism_package_image_translation_review_history',
       'tourism_package_translation_save_draft',
       'tourism_package_translation_review',
       'tourism_package_translation_reject',
       'tourism_package_translation_publish',
       'tourism_package_translation_republish',
       'tourism_package_translation_archive',
       'tourism_package_translation_unpublish',
       'tourism_package_translation_restore',
       'tourism_package_image_translation_save_draft',
       'tourism_package_image_translation_review',
       'tourism_package_image_translation_reject',
       'tourism_package_image_translation_publish',
       'tourism_package_image_translation_republish',
       'tourism_package_image_translation_archive',
       'tourism_package_image_translation_unpublish',
       'tourism_package_image_translation_restore'
     )),
  'all public Tourism Package workflow functions are owned security definers with empty search paths'
);
select ok(
  not has_function_privilege('anon', 'private.tourism_package_source_token_v1(public.tourism_packages)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.tourism_package_source_token_v1(public.tourism_packages)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.tourism_package_translation_is_eligible(public.tourism_packages,public.tourism_package_translations)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.tourism_package_translation_is_eligible(public.tourism_packages,public.tourism_package_translations)', 'EXECUTE')
  and not has_table_privilege('anon', 'private.published_english_tourism_package_rows_data', 'SELECT')
  and not has_table_privilege('authenticated', 'private.published_english_tourism_package_image_rows_data', 'SELECT'),
  'private tokens, eligibility helpers, and data views are unavailable to application roles'
);
select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'private'
      and routine.proname like '%tourism_package%'
      and (
        has_function_privilege('anon', routine.oid, 'EXECUTE')
        or has_function_privilege('authenticated', routine.oid, 'EXECUTE')
      )
  ),
  'all private Tourism Package helpers deny application EXECUTE'
);
select ok(
  (select count(*) = 20
     and bool_and(has_function_privilege('authenticated', routine.oid, 'EXECUTE'))
     and bool_and(not has_function_privilege('anon', routine.oid, 'EXECUTE'))
   from pg_catalog.pg_proc as routine
   join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
   where namespace.nspname = 'public'
     and routine.proname in (
       'tourism_package_translation_admin_read',
       'tourism_package_image_translation_admin_read',
       'tourism_package_translation_review_history',
       'tourism_package_image_translation_review_history',
       'tourism_package_translation_save_draft',
       'tourism_package_translation_review',
       'tourism_package_translation_reject',
       'tourism_package_translation_publish',
       'tourism_package_translation_republish',
       'tourism_package_translation_archive',
       'tourism_package_translation_unpublish',
       'tourism_package_translation_restore',
       'tourism_package_image_translation_save_draft',
       'tourism_package_image_translation_review',
       'tourism_package_image_translation_reject',
       'tourism_package_image_translation_publish',
       'tourism_package_image_translation_republish',
       'tourism_package_image_translation_archive',
       'tourism_package_image_translation_unpublish',
       'tourism_package_image_translation_restore'
     )),
  'public Tourism Package workflows are authenticated-only'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_class
    where oid = 'private.published_english_tourism_package_rows_data'::regclass
      and reloptions @> array['security_barrier=true']
      and reloptions @> array['security_invoker=false']
  )
  and exists (
    select 1
    from pg_catalog.pg_class
    where oid = 'private.published_english_tourism_package_image_rows_data'::regclass
      and reloptions @> array['security_barrier=true']
      and reloptions @> array['security_invoker=false']
  ),
  'private English Tourism Package data views use owner-controlled security barriers'
);

insert into auth.users (id)
values
  ('e8000000-0000-4000-8000-000000000001'),
  ('e8000000-0000-4000-8000-000000000002');
update private.app_config
set administrator_user_id = 'e8000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', 'e8000000-0000-4000-8000-000000000001', true);

insert into public.destinations (
  id, category_id, name, slug, summary, description, history,
  latitude, longitude, facilities, thumbnail_bucket, thumbnail_path,
  created_by, updated_by
)
values
  (
    'e8100000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Destinasi Indonesia Satu', 'destination-package-one',
    'Ringkasan destinasi satu', 'Deskripsi destinasi satu', 'Sejarah destinasi satu',
    -8.2701, 116.4201, array['Jalur']::text[], 'tourism-media',
    'destination/e8100000-0000-4000-8000-000000000001/e8200000-0000-4000-8000-000000000001.jpg',
    'e8000000-0000-4000-8000-000000000001',
    'e8000000-0000-4000-8000-000000000001'
  ),
  (
    'e8100000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Destinasi Indonesia Dua', 'destination-package-two',
    'Ringkasan destinasi dua', 'Deskripsi destinasi dua', 'Sejarah destinasi dua',
    -8.2702, 116.4202, array['Jalur']::text[], 'tourism-media',
    'destination/e8100000-0000-4000-8000-000000000002/e8200000-0000-4000-8000-000000000002.jpg',
    'e8000000-0000-4000-8000-000000000001',
    'e8000000-0000-4000-8000-000000000001'
  ),
  (
    'e8100000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Destinasi Indonesia Tiga', 'destination-package-three',
    'Ringkasan destinasi tiga', 'Deskripsi destinasi tiga', 'Sejarah destinasi tiga',
    -8.2703, 116.4203, array['Jalur']::text[], null, null,
    'e8000000-0000-4000-8000-000000000001',
    'e8000000-0000-4000-8000-000000000001'
  );
insert into storage.objects (id, bucket_id, name, owner_id)
values
  (
    'e8300000-0000-4000-8000-000000000001', 'tourism-media',
    'destination/e8100000-0000-4000-8000-000000000001/e8200000-0000-4000-8000-000000000001.jpg',
    'e8000000-0000-4000-8000-000000000001'
  ),
  (
    'e8300000-0000-4000-8000-000000000002', 'tourism-media',
    'destination/e8100000-0000-4000-8000-000000000002/e8200000-0000-4000-8000-000000000002.jpg',
    'e8000000-0000-4000-8000-000000000001'
  );
insert into public.destination_images (
  id, destination_id, storage_bucket, storage_path, caption, alt_text,
  display_order, is_primary, created_by
)
values
  (
    'e8200000-0000-4000-8000-000000000001',
    'e8100000-0000-4000-8000-000000000001', 'tourism-media',
    'destination/e8100000-0000-4000-8000-000000000001/e8200000-0000-4000-8000-000000000001.jpg',
    'Keterangan sumber satu', 'Alt sumber satu', 0, true,
    'e8000000-0000-4000-8000-000000000001'
  ),
  (
    'e8200000-0000-4000-8000-000000000002',
    'e8100000-0000-4000-8000-000000000002', 'tourism-media',
    'destination/e8100000-0000-4000-8000-000000000002/e8200000-0000-4000-8000-000000000002.jpg',
    'Keterangan sumber dua', 'Alt sumber dua', 0, true,
    'e8000000-0000-4000-8000-000000000001'
  );
update public.destinations
set status = 'published', updated_by = 'e8000000-0000-4000-8000-000000000001'
where id in (
  'e8100000-0000-4000-8000-000000000001',
  'e8100000-0000-4000-8000-000000000002'
);

set local role authenticated;
select (public.destination_translation_save_draft(
  'e8100000-0000-4000-8000-000000000001', null,
  'English Destination One', 'English summary one', 'English description one',
  'English history one', null, null, array['Trail']::text[], 'English alt one'
)).id as id \gset destination_one_translation_
select (public.destination_translation_review(:'destination_one_translation_id', 1)).edit_revision as edit_revision \gset destination_one_reviewed_
select (public.destination_translation_publish(:'destination_one_translation_id', :'destination_one_reviewed_edit_revision')).edit_revision as edit_revision \gset destination_one_published_
select is(
  (select name from public.published_english_destinations where id = 'e8100000-0000-4000-8000-000000000001'),
  'English Destination One',
  'the first approved English Destination projection supplies the relationship dependency'
);
select is(
  (select count(*) from public.published_english_destinations where id = 'e8100000-0000-4000-8000-000000000002'),
  0::bigint,
  'the second published source Destination is intentionally untranslated'
);

select public.tourism_package_create(
  'Paket Indonesia', 'tourism-package-bilingual-test', 'standard', 2, 'hari',
  100, 'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'draft',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":0,"notes":"Catatan satu"},
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":1,"notes":"Catatan dua"}
  ]'::jsonb
) as id \gset package_
select is(
  (select aggregate_revision from public.tourism_packages where id = :'package_id'),
  1::bigint,
  'new Tourism Package starts with aggregate revision one'
);

reset role;
insert into storage.objects (id, bucket_id, name, owner_id)
values
  (
    'e2300000-0000-4000-8000-000000000001', 'tourism-media',
    'tourism-package/' || :'package_id' || '/e2200000-0000-4000-8000-000000000001.jpg',
    'e8000000-0000-4000-8000-000000000001'
  ),
  (
    'e2300000-0000-4000-8000-000000000002', 'tourism-media',
    'tourism-package/' || :'package_id' || '/e2200000-0000-4000-8000-000000000002.jpg',
    'e8000000-0000-4000-8000-000000000001'
  );
set local role authenticated;
select lives_ok(
  format($sql$select public.media_insert(
    'tourism-package', %L::uuid, %L::uuid,
    'tourism-package/' || %L || '/e2200000-0000-4000-8000-000000000001.jpg',
    'Alt paket utama', 'Keterangan paket utama', 0, true, %L::uuid[]
  )$sql$,
    :'package_id',
    'e2200000-0000-4000-8000-000000000001',
    :'package_id',
    '{e2200000-0000-4000-8000-000000000001}'
  ),
  'the generic media RPC creates the trusted Tourism Package primary image'
);
select lives_ok(
  format($sql$select public.media_insert(
    'tourism-package', %L::uuid, %L::uuid,
    'tourism-package/' || %L || '/e2200000-0000-4000-8000-000000000002.jpg',
    'Alt galeri paket', 'Keterangan galeri paket', 1, false, %L::uuid[]
  )$sql$,
    :'package_id',
    'e2200000-0000-4000-8000-000000000002',
    :'package_id',
    '{e2200000-0000-4000-8000-000000000001,e2200000-0000-4000-8000-000000000002}'
  ),
  'the generic media RPC creates the optional Tourism Package gallery image'
);
select is(
  (select aggregate_revision from public.tourism_packages where id = :'package_id'),
  2::bigint,
  'primary thumbnail synchronization advances the package aggregate exactly once'
);
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 100,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'published',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":0,"notes":"Catatan satu"},
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":1,"notes":"Catatan dua"}
  ]'::jsonb
);
select ok(
  (select status = 'published'::public.publication_status
      and aggregate_revision = 2
   from public.tourism_packages where id = :'package_id'),
  'source package publication preserves the aggregate revision when only status changes'
);

reset role;
select left(
  private.tourism_package_source_token_v1(source),
  length('tourism-package-source-v1:')
) as source_marker,
private.tourism_package_source_token_v1(source) as source_token,
private.tourism_package_relationship_token_v1(source) as relationship_token,
private.tourism_package_translation_fingerprint_or_null(translation) as translation_fingerprint
from public.tourism_packages as source
left join public.tourism_package_translations as translation
  on translation.tourism_package_id = source.id and translation.locale = 'en'
where source.id = :'package_id' \gset package_contract_
select is(:'package_contract_source_marker'::text, 'tourism-package-source-v1:'::text,
  'source token uses the exact Tourism Package marker');
select is(
  :'package_contract_source_token'::text,
  format('tourism-package-source-v1:%s:2', lower(:'package_id')),
  'source token uses lowercase package UUID and aggregate revision'
);
select is(
  :'package_contract_relationship_token'::text,
  format('tourism-package-relationship-v1:%s:2', lower(:'package_id')),
  'relationship token shares the package aggregate revision'
);

set local role authenticated;
select (public.tourism_package_image_translation_save_draft(
  'e2200000-0000-4000-8000-000000000001', null,
  'English primary alt', 'English primary caption'
)).id as id \gset primary_image_translation_
select throws_ok(
  format(
    'select public.tourism_package_image_translation_review(%L::uuid, 0, true)',
    :'primary_image_translation_id'
  ),
  '55000'::char(5), null,
  'stale image translation edit revisions are rejected'
);
select (public.tourism_package_image_translation_review(
  :'primary_image_translation_id', 1, true
)).edit_revision as edit_revision \gset primary_image_reviewed_
select (public.tourism_package_image_translation_publish(
  :'primary_image_translation_id', :'primary_image_reviewed_edit_revision'
)).edit_revision as edit_revision \gset primary_image_published_
select (public.tourism_package_image_translation_save_draft(
  'e2200000-0000-4000-8000-000000000002', null,
  'English gallery alt', 'English gallery caption'
)).id as id \gset gallery_image_translation_
select (public.tourism_package_image_translation_review(
  :'gallery_image_translation_id', 1, true
)).edit_revision as edit_revision \gset gallery_image_reviewed_
select (public.tourism_package_image_translation_publish(
  :'gallery_image_translation_id', :'gallery_image_reviewed_edit_revision'
)).edit_revision as edit_revision \gset gallery_image_published_
reset role;
select is(
  (select count(*) from public.tourism_package_image_translations
   where package_image_id = 'e2200000-0000-4000-8000-000000000001'
     and translation_status = 'published'::public.publication_status),
  1::bigint,
  'primary image translation is published through its typed workflow'
);

set local role authenticated;
select (public.tourism_package_translation_save_draft(
  :'package_id'::uuid, null,
  'English Tourism Package', 'days', 'Per person',
   array['Guide', 'Meals']::text[], 'Local craft',
   'English package summary', 'English package description'
 )).id as id \gset package_translation_
select throws_ok(
  format(
    'select public.tourism_package_translation_review(%L::uuid, 0, true)',
    :'package_translation_id'
  ),
  '55000'::char(5), null,
  'stale parent translation edit revisions are rejected'
);
select (public.tourism_package_translation_review(
  :'package_translation_id', 1, true
)).edit_revision as edit_revision \gset package_reviewed_
select (public.tourism_package_translation_reject(
  :'package_translation_id', :'package_reviewed_edit_revision', 'Needs terminology review'
)).edit_revision as edit_revision \gset package_rejected_
select review_state
from public.tourism_package_translation_admin_read(:'package_id'::uuid)
where id = :'package_translation_id'::uuid \gset package_rejected_state_
select is(
  :'package_rejected_state_review_state'::text,
  'rejected'::text,
  'parent rejection moves the translation into the rejected review state'
);
select (public.tourism_package_translation_save_draft(
  :'package_id'::uuid, :'package_rejected_edit_revision'::bigint,
  'English Tourism Package', 'days', 'Per person',
  array['Guide', 'Meals']::text[], 'Local craft',
  'English package summary', 'English package description'
)).edit_revision as edit_revision \gset package_after_rejection_
select (public.tourism_package_translation_review(
  :'package_translation_id', :'package_after_rejection_edit_revision', true
)).edit_revision as edit_revision \gset package_reviewed_
select throws_ok(
  format(
    'select public.tourism_package_translation_publish(%L::uuid, %s)',
    :'package_translation_id', :'package_reviewed_edit_revision'
  ),
  '55000'::char(5), null,
  'parent publication fails closed while one current destination lacks English projection'
);
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'package parent is absent before all relationship dependencies are English eligible'
);
select is(
  (select count(*) from public.published_english_tourism_package_destinations where package_id = :'package_id'),
  0::bigint,
  'package relationship projection is all-or-nothing'
);

select (public.destination_translation_save_draft(
  'e8100000-0000-4000-8000-000000000002', null,
  'English Destination Two', 'English summary two', 'English description two',
  'English history two', null, null, array['Trail']::text[], 'English alt two'
)).id as id \gset destination_two_translation_
select (public.destination_translation_review(:'destination_two_translation_id', 1)).edit_revision as edit_revision \gset destination_two_reviewed_
select (public.destination_translation_publish(:'destination_two_translation_id', :'destination_two_reviewed_edit_revision')).edit_revision as edit_revision \gset destination_two_published_
select (public.tourism_package_translation_publish(
  :'package_translation_id'::uuid, :'package_reviewed_edit_revision'::bigint
)).edit_revision as edit_revision \gset package_parent_published_
select is(
  (select name from public.published_english_tourism_packages where id = :'package_id'),
  'English Tourism Package',
  'parent projection uses the English translated name after all dependencies are approved'
);
select ok(
  (select name = 'English Tourism Package'
      and description = 'English package description'
      and slug = 'tourism-package-bilingual-test'
      and package_type = 'standard'::public.package_type
      and duration_value = 2
      and duration_unit = 'days'
      and price = 100
      and price_note = 'Per person'
      and included_facilities = array['Guide', 'Meals']::text[]
      and souvenir = 'Local craft'
      and summary = 'English package summary'
      and thumbnail_bucket = 'tourism-media'
      and thumbnail_path like 'tourism-package/%/e2200000-0000-4000-8000-000000000001.jpg'
      and is_featured
      and display_order = 4
   from public.published_english_tourism_packages where id = :'package_id'),
  'parent projection keeps shared source values and exposes only English content fields'
);
select is(
  (select count(*) from public.published_english_tourism_package_images where package_id = :'package_id'),
  2::bigint,
  'published parent exposes eligible primary and gallery media'
);
select (public.tourism_package_translation_republish(
  :'package_translation_id'::uuid, :'package_parent_published_edit_revision'::bigint
)).edit_revision as edit_revision \gset package_parent_republished_
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  1::bigint,
  'fresh published parent can be republished through the explicit republish RPC'
);
select is(
  (select alt_text from public.published_english_tourism_package_images
   where id = 'e2200000-0000-4000-8000-000000000001'),
  'English primary alt',
  'media projection uses translated alt text'
);
select is(
  (select count(*) from public.published_english_tourism_package_destinations where package_id = :'package_id'),
  2::bigint,
  'all current package relationships appear only after all English destinations are eligible'
);
select ok(
  (select bool_and(destination_name in ('English Destination One', 'English Destination Two'))
   from public.published_english_tourism_package_destinations as destination
   where destination.package_id = :'package_id'),
  'relationship projection reads destination names from the approved English Destination projection'
);
set local role anon;
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  1::bigint,
  'anonymous callers can read the approved English Tourism Package projection'
);
reset role;
select throws_ok(
  $$update public.destinations
    set status = 'archived'::public.publication_status,
        updated_by = 'e8000000-0000-4000-8000-000000000001'
    where id = 'e8100000-0000-4000-8000-000000000001'$$,
  'P0001'::char(5), null,
  'the existing source guard prevents archiving a Destination used by a published package'
);
update public.destinations
set summary = 'Ringkasan destinasi satu stale mutation',
    updated_by = 'e8000000-0000-4000-8000-000000000001'
where id = 'e8100000-0000-4000-8000-000000000001';
select is(
  (select count(*) from public.published_english_destinations
   where id = 'e8100000-0000-4000-8000-000000000001'),
  0::bigint,
  'a stale linked Destination is absent from the approved English projection'
);
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'a stale linked Destination removes the whole English package'
);
set local role authenticated;
select (public.destination_translation_unpublish(
  :'destination_one_translation_id'::uuid, :'destination_one_published_edit_revision'::bigint
)).edit_revision as edit_revision \gset destination_dependency_unpublished_
select (public.destination_translation_review(
  :'destination_one_translation_id'::uuid, :'destination_dependency_unpublished_edit_revision'::bigint
)).edit_revision as edit_revision \gset destination_dependency_reviewed_
select (public.destination_translation_republish(
  :'destination_one_translation_id'::uuid, :'destination_dependency_reviewed_edit_revision'::bigint
)).edit_revision as edit_revision \gset destination_dependency_republished_
reset role;
select is(
  (select count(*) from public.published_english_destinations
   where id = 'e8100000-0000-4000-8000-000000000001'),
  1::bigint,
  'freshly reviewed linked Destination restores the approved dependency'
);
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  1::bigint,
  'the English package projection resumes only after the Destination is fresh'
);
set local role authenticated;
select (public.tourism_package_image_translation_unpublish(
  :'primary_image_translation_id'::uuid, :'primary_image_published_edit_revision'::bigint
)).edit_revision as edit_revision \gset primary_required_unpublished_
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'an unpublished primary image translation removes the English package'
);
select (public.tourism_package_image_translation_review(
  :'primary_image_translation_id'::uuid, :'primary_required_unpublished_edit_revision'::bigint, true
)).edit_revision as edit_revision \gset primary_required_reviewed_
select (public.tourism_package_image_translation_republish(
  :'primary_image_translation_id'::uuid, :'primary_required_reviewed_edit_revision'::bigint
)).edit_revision as edit_revision \gset primary_required_republished_
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  1::bigint,
  'the English package returns after its primary image translation is republished'
);
reset role;

reset role;
select ok(
  not private.tourism_package_translation_content_is_complete(
    (select source from public.tourism_packages as source where source.id = :'package_id'),
    jsonb_populate_record(
      null::public.tourism_package_translations,
      jsonb_build_object(
        'id', 'e3100000-0000-4000-8000-000000000001'::uuid,
        'tourism_package_id', :'package_id'::uuid,
        'locale', 'en',
        'duration_unit', 'days',
        'included_facilities', to_jsonb(array['Guide', 'Meals']::text[]),
        'description', 'English package description'
      )
    )
  ),
  'undefined required English name is invalid'
);
select ok(
  not private.tourism_package_translation_content_is_complete(
    (select source from public.tourism_packages as source where source.id = :'package_id'),
    jsonb_populate_record(
      null::public.tourism_package_translations,
      jsonb_build_object(
        'id', 'e3100000-0000-4000-8000-000000000002'::uuid,
        'tourism_package_id', :'package_id'::uuid,
        'locale', 'en', 'name', null::text, 'duration_unit', 'days',
        'included_facilities', to_jsonb(array['Guide', 'Meals']::text[]),
        'description', 'English package description'
      )
    )
  ),
  'null required English name is invalid'
);
select ok(
  not private.tourism_package_translation_content_is_complete(
    (select source from public.tourism_packages as source where source.id = :'package_id'),
    jsonb_populate_record(
      null::public.tourism_package_translations,
      jsonb_build_object(
        'id', 'e3100000-0000-4000-8000-000000000003'::uuid,
        'tourism_package_id', :'package_id'::uuid,
        'locale', 'en', 'name', '', 'duration_unit', 'days',
        'included_facilities', to_jsonb(array['Guide', 'Meals']::text[]),
        'description', 'English package description'
      )
    )
  ),
  'empty required English name is invalid'
);
select ok(
  not private.tourism_package_translation_content_is_complete(
    (select source from public.tourism_packages as source where source.id = :'package_id'),
    jsonb_populate_record(
      null::public.tourism_package_translations,
      jsonb_build_object(
        'id', 'e3100000-0000-4000-8000-000000000008'::uuid,
        'tourism_package_id', :'package_id'::uuid,
        'locale', 'en', 'name', '   ', 'duration_unit', 'days',
        'included_facilities', to_jsonb(array['Guide', 'Meals']::text[]),
        'description', 'English package description'
      )
    )
  ),
  'whitespace-only required English name is invalid'
);
select ok(
  not private.tourism_package_translation_content_is_complete(
    (select source from public.tourism_packages as source where source.id = :'package_id'),
    jsonb_populate_record(
      null::public.tourism_package_translations,
      jsonb_build_object(
        'id', 'e3100000-0000-4000-8000-000000000004'::uuid,
        'tourism_package_id', :'package_id'::uuid,
        'locale', 'en', 'name', 'English package', 'duration_unit', 'days',
        'included_facilities', to_jsonb(array['Guide', 'Meals']::text[]),
        'description', '   '
      )
    )
  ),
  'whitespace-only required English description is invalid'
);
select ok(
  not private.tourism_package_translation_content_is_complete(
    (select source from public.tourism_packages as source where source.id = :'package_id'),
    jsonb_populate_record(
      null::public.tourism_package_translations,
      jsonb_build_object(
        'id', 'e3100000-0000-4000-8000-000000000005'::uuid,
        'tourism_package_id', :'package_id'::uuid,
        'locale', 'en', 'name', 'English package', 'duration_unit', 'days',
        'included_facilities', to_jsonb(array['Guide', 'Meals']::text[]),
        'description', ''
      )
    )
  ),
  'empty required English description is invalid'
);
select ok(
  not private.tourism_package_translation_content_is_complete(
    (select source from public.tourism_packages as source where source.id = :'package_id'),
    jsonb_populate_record(
      null::public.tourism_package_translations,
      jsonb_build_object(
        'id', 'e3100000-0000-4000-8000-000000000006'::uuid,
        'tourism_package_id', :'package_id'::uuid,
        'locale', 'en', 'name', 'English package', 'duration_unit', 'days',
        'included_facilities', to_jsonb(array['Guide', 'Meals']::text[]),
        'description', null::text
      )
    )
  ),
  'null required English description is invalid'
);
select ok(
  not private.tourism_package_translation_content_is_complete(
    (select source from public.tourism_packages as source where source.id = :'package_id'),
    jsonb_populate_record(
      null::public.tourism_package_translations,
      jsonb_build_object(
        'id', 'e3100000-0000-4000-8000-000000000007'::uuid,
        'tourism_package_id', :'package_id'::uuid,
        'locale', 'id', 'name', 'English package', 'duration_unit', 'days',
        'included_facilities', to_jsonb(array['Guide', 'Meals']::text[]),
        'description', 'English package description'
      )
    )
  ),
  'non-English locale is invalid at the helper boundary'
);
select ok(
  not private.tourism_package_source_is_eligible(
    jsonb_populate_record(
      (select source from public.tourism_packages as source where source.id = :'package_id'),
      '{"slug":"not a valid slug"}'::jsonb
    )
  ),
  'malformed source slug is not eligible'
);
select ok(
  not private.tourism_package_source_is_eligible(
    jsonb_populate_record(
      (select source from public.tourism_packages as source where source.id = :'package_id'),
      '{"thumbnail_bucket":null,"thumbnail_path":null}'::jsonb
    )
  ),
  'missing primary thumbnail is not eligible'
);
select ok(
  not private.tourism_package_image_translation_is_eligible(
    (select source from public.tourism_packages as source where source.id = :'package_id'),
    jsonb_populate_record(
      (select image from public.package_images as image where image.id = 'e2200000-0000-4000-8000-000000000001'),
      '{"storage_path":"not-managed"}'::jsonb
    ),
    (select translation from public.tourism_package_image_translations as translation
     where translation.id = :'primary_image_translation_id'::uuid)
  ),
  'malformed media projection is not eligible'
);
select is(
  (select count(*) from public.published_english_tourism_packages
   where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'),
  0::bigint,
  'missing package detail rows fail closed'
);

set local role authenticated;
select throws_ok(
  $$select * from public.tourism_package_translations$$,
  '42501'::char(5), null,
  'authenticated callers cannot directly read parent translation rows'
);
select throws_ok(
  $$insert into public.tourism_package_translations (tourism_package_id, created_by, updated_by)
    values ('e9000000-0000-4000-8000-000000000001',
      'e8000000-0000-4000-8000-000000000001',
      'e8000000-0000-4000-8000-000000000001')$$,
  '42501'::char(5), null,
  'authenticated callers cannot directly write parent translation rows'
);
select throws_ok(
  $$select * from public.tourism_package_image_translation_review_events$$,
  '42501'::char(5), null,
  'authenticated callers cannot directly read image review history'
);
select throws_ok(
  format(
    'update public.tourism_packages set aggregate_revision = aggregate_revision + 1 where id = %L::uuid',
    :'package_id'
  ),
  '42501'::char(5), null,
  'aggregate revision cannot be supplied by an application caller'
);
select throws_ok(
  format(
    'update public.package_images set binary_revision = binary_revision + 1 where id = %L::uuid',
    'e2200000-0000-4000-8000-000000000001'
  ),
  '42501'::char(5), null,
  'image binary revision cannot be supplied by an application caller'
);

select (public.tourism_package_image_translation_unpublish(
  :'gallery_image_translation_id'::uuid, :'gallery_image_published_edit_revision'::bigint
)).edit_revision as edit_revision \gset gallery_image_unpublished_
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  1::bigint,
  'optional gallery translation failure does not remove the eligible parent'
);
select is(
  (select count(*) from public.published_english_tourism_package_images where package_id = :'package_id'),
  1::bigint,
  'optional gallery failure removes only the gallery media projection'
);
select (public.tourism_package_image_translation_review(
  :'gallery_image_translation_id'::uuid, :'gallery_image_unpublished_edit_revision'::bigint, true
)).edit_revision as edit_revision \gset gallery_image_re_reviewed_
select (public.tourism_package_image_translation_reject(
  :'gallery_image_translation_id'::uuid, :'gallery_image_re_reviewed_edit_revision'::bigint,
  'Gallery terminology review required'
)).edit_revision as edit_revision \gset gallery_image_rejected_
select (public.tourism_package_image_translation_archive(
  :'gallery_image_translation_id'::uuid, :'gallery_image_rejected_edit_revision'::bigint
)).edit_revision as edit_revision \gset gallery_image_archived_
select (public.tourism_package_image_translation_restore(
  :'gallery_image_translation_id'::uuid, :'gallery_image_archived_edit_revision'::bigint
)).edit_revision as edit_revision \gset gallery_image_restored_
select review_state
from public.tourism_package_image_translation_admin_read(
  'e2200000-0000-4000-8000-000000000002'::uuid
)
where id = :'gallery_image_translation_id'::uuid \gset gallery_image_restored_state_
select is(
  :'gallery_image_restored_state_review_state'::text,
  'pending'::text,
  'restoring an archived gallery translation returns a non-public pending draft'
);

reset role;
select aggregate_revision as aggregate_revision,
       (select binary_revision from public.package_images where id = 'e2200000-0000-4000-8000-000000000001') as binary_revision
from public.tourism_packages where id = :'package_id' \gset before_primary_media_
set local role authenticated;
select lives_ok(
  format($sql$select public.media_update(
    'tourism-package', %L::uuid, %L::uuid,
    'Changed primary source alt', 'Changed primary source caption', 0, true,
    %L::uuid[]
  )$sql$,
    :'package_id',
    'e2200000-0000-4000-8000-000000000001',
    '{e2200000-0000-4000-8000-000000000001,e2200000-0000-4000-8000-000000000002}'
  ),
  'primary media mutation remains behind the generic media RPC'
);
select ok(
  (select binary_revision = :'before_primary_media_binary_revision'::bigint + 1
      and updated_by = 'e8000000-0000-4000-8000-000000000001'
   from public.package_images where id = 'e2200000-0000-4000-8000-000000000001'),
  'primary media mutation advances its database-owned binary revision'
);
select is(
  (select aggregate_revision from public.tourism_packages where id = :'package_id'),
  :'before_primary_media_aggregate_revision'::bigint + 1,
  'primary media mutation advances the package aggregate exactly once'
);
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'changed primary media fail-closes the parent projection'
);
reset role;
select is(
  (select translation_status from public.tourism_package_image_translations
   where id = :'primary_image_translation_id'),
  'published',
  'source media mutation does not silently rewrite a published image translation'
);
select is(
  (select count(*) from public.tourism_package_image_translation_review_events
   where tourism_package_image_translation_id = :'primary_image_translation_id'::uuid
     and event_type = 'media_changed'),
  1::bigint,
  'source media mutation appends an image media-changed event'
);
set local role authenticated;
select throws_ok(
  format(
    'select public.tourism_package_image_translation_republish(%L::uuid, %s)',
     :'primary_image_translation_id', :'primary_required_republished_edit_revision'
  ),
  '55000'::char(5), null,
  'stale primary image translation cannot republish with its old checkpoint'
);
select (public.tourism_package_image_translation_unpublish(
  :'primary_image_translation_id'::uuid, :'primary_required_republished_edit_revision'::bigint
)).edit_revision as edit_revision \gset primary_image_unpublished_
select (public.tourism_package_image_translation_review(
  :'primary_image_translation_id'::uuid, :'primary_image_unpublished_edit_revision'::bigint, true
)).edit_revision as edit_revision \gset primary_image_re_reviewed_
select (public.tourism_package_image_translation_republish(
  :'primary_image_translation_id'::uuid, :'primary_image_re_reviewed_edit_revision'::bigint
)).edit_revision as edit_revision \gset primary_image_republished_

reset role;
select aggregate_revision as aggregate_revision
from public.tourism_packages where id = :'package_id' \gset before_source_price_
set local role authenticated;
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 125,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'published',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":0,"notes":"Catatan satu"},
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":1,"notes":"Catatan dua"}
  ]'::jsonb
);
select is(
  (select aggregate_revision from public.tourism_packages where id = :'package_id'),
  :'before_source_price_aggregate_revision'::bigint + 1,
  'source semantic mutation advances the package aggregate once'
);
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'source semantic mutation invalidates the English parent without Indonesian fallback'
);
reset role;
select ok(
  (select translation_status = 'published'::public.publication_status
      and captured_source_token <> private.tourism_package_source_token_v1(source)
   from public.tourism_package_translations as translation
   join public.tourism_packages as source on source.id = translation.tourism_package_id
   where translation.id = :'package_translation_id'::uuid),
  'source mutation leaves publication stored but makes its source checkpoint stale'
);

set local role authenticated;
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 125,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'archived',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":0,"notes":"Catatan satu"},
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":1,"notes":"Catatan dua"}
  ]'::jsonb
);
select is(
  (select status from public.tourism_packages where id = :'package_id'),
  'archived',
  'source archive is controlled by the preserved package source RPC'
);
reset role;
select ok(
  (select translation_status = 'draft'::public.publication_status
      and review_state = 'pending'
   from public.tourism_package_translations where id = :'package_translation_id'::uuid),
  'source archive clears the parent English publication checkpoint'
);
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'archived source is absent from the English parent projection'
);
set local role authenticated;
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 125,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'draft',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":0,"notes":"Catatan satu"},
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":1,"notes":"Catatan dua"}
  ]'::jsonb
);
reset role;
select ok(
  (select translation_status = 'draft'::public.publication_status
      and review_state = 'pending'
   from public.tourism_package_translations where id = :'package_translation_id'::uuid),
  'source restore returns the source to draft without republishing English'
);

select aggregate_revision as aggregate_revision
from public.tourism_packages where id = :'package_id' \gset before_relationship_add_
set local role authenticated;
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 125,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'draft',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":0,"notes":"Catatan itinerary baru"},
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":1,"notes":null},
    {"destination_id":"e8100000-0000-4000-8000-000000000003","display_order":2,"notes":"Destination added"}
  ]'::jsonb
);
select is(
  (select aggregate_revision from public.tourism_packages where id = :'package_id'),
  :'before_relationship_add_aggregate_revision'::bigint + 1,
  'adding an itinerary destination advances the aggregate once'
);
select is(
  (select count(*) from public.package_destinations where package_id = :'package_id'),
  3::bigint,
  'the source itinerary retains the added destination'
);
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'an added untranslated itinerary destination keeps the package closed'
);

reset role;
select aggregate_revision as aggregate_revision
from public.tourism_packages where id = :'package_id' \gset before_relationship_remove_
set local role authenticated;
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 125,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'draft',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":0,"notes":"Catatan satu"},
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":1,"notes":"Catatan dua"}
  ]'::jsonb
);
select is(
  (select aggregate_revision from public.tourism_packages where id = :'package_id'),
  :'before_relationship_remove_aggregate_revision'::bigint + 1,
  'removing an itinerary destination advances the aggregate once'
);
select is(
  (select count(*) from public.package_destinations where package_id = :'package_id'),
  2::bigint,
  'the source itinerary retains the removal'
);
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'an itinerary removal keeps the package closed until fresh review'
);

reset role;
select aggregate_revision as aggregate_revision
from public.tourism_packages where id = :'package_id' \gset before_relationship_
set local role authenticated;
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 125,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'draft',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":0,"notes":"Catatan itinerary baru"},
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":1,"notes":null}
  ]'::jsonb
);
select is(
  (select aggregate_revision from public.tourism_packages where id = :'package_id'),
  :'before_relationship_aggregate_revision'::bigint + 1,
  'ordered relationship and notes mutation advances the aggregate once'
);
select is(
  (select notes from public.package_destinations
   where package_id = :'package_id'::uuid
     and destination_id = 'e8100000-0000-4000-8000-000000000002'),
  'Catatan itinerary baru',
  'source-only relationship notes remain stored at the source boundary'
);
select is(
  (select count(*) from public.published_english_tourism_package_destinations where package_id = :'package_id'),
  0::bigint,
  'relationship mutation keeps the parent projection closed until fresh review'
);
set local role authenticated;
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 125,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'published',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":0,"notes":"Catatan itinerary baru"},
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":1,"notes":null}
  ]'::jsonb
);
select aggregate_revision as aggregate_revision
from public.tourism_packages where id = :'package_id' \gset after_relationship_
reset role;
select (edit_revision) as edit_revision
from public.tourism_package_translations where id = :'package_translation_id' \gset package_pending_
set local role authenticated;
select (public.tourism_package_translation_review(
  :'package_translation_id'::uuid, :'package_pending_edit_revision'::bigint, true
)).edit_revision as edit_revision \gset package_relationship_reviewed_
select (public.tourism_package_translation_republish(
  :'package_translation_id'::uuid, :'package_relationship_reviewed_edit_revision'::bigint
)).edit_revision as edit_revision \gset package_relationship_published_
select ok(
  (select price = 125
      and name = 'English Tourism Package'
   from public.published_english_tourism_packages where id = :'package_id'),
  'fresh review republishes the parent with the current shared source price'
);
select is(
  (select destination_id from public.published_english_tourism_package_destinations
   where package_id = :'package_id' order by display_order limit 1),
  'e8100000-0000-4000-8000-000000000002'::uuid,
  'relationship projection preserves the server-derived ordered itinerary'
);
select (public.tourism_package_translation_unpublish(
  :'package_translation_id'::uuid, :'package_relationship_published_edit_revision'::bigint
)).edit_revision as edit_revision \gset package_unpublished_
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'parent unpublish removes the English package projection'
);
select (public.tourism_package_translation_archive(
  :'package_translation_id'::uuid, :'package_unpublished_edit_revision'::bigint
)).edit_revision as edit_revision \gset package_archived_
select (public.tourism_package_translation_restore(
  :'package_translation_id'::uuid, :'package_archived_edit_revision'::bigint
)).edit_revision as edit_revision \gset package_restored_
select review_state
from public.tourism_package_translation_admin_read(:'package_id'::uuid)
where id = :'package_translation_id'::uuid \gset package_restored_state_
select is(
  :'package_restored_state_review_state'::text,
  'pending'::text,
  'restoring an archived parent returns a non-public pending draft'
);
reset role;
select is(
  (select count(*) from public.tourism_package_translation_review_events
   where tourism_package_translation_id = :'package_translation_id'::uuid
     and event_type = 'source_blocked'),
  5::bigint,
  'source archive, restore, and every relationship freshness change are recorded in review history'
);

set local role authenticated;
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 125,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'archived',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":0,"notes":"Catatan itinerary baru"},
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":1,"notes":null}
  ]'::jsonb
);
select is(
  (select count(*) from public.published_english_tourism_packages where id = :'package_id'),
  0::bigint,
  'source archive removes the package from the public English projection'
);
set local role authenticated;
select public.tourism_package_update(
  :'package_id'::uuid, 'Paket Indonesia', 'standard', 2, 'hari', 125,
  'Per orang', array['Pemandu', 'Makan']::text[], 'Kerajinan lokal',
  'Ringkasan paket Indonesia', 'Deskripsi paket Indonesia', true, 4, 'draft',
  '[
    {"destination_id":"e8100000-0000-4000-8000-000000000002","display_order":0,"notes":"Catatan itinerary baru"},
    {"destination_id":"e8100000-0000-4000-8000-000000000001","display_order":1,"notes":null}
  ]'::jsonb
);
reset role;
select ok(
  (select translation_status = 'draft'::public.publication_status
      and review_state = 'pending'
   from public.tourism_package_translations where id = :'package_translation_id'::uuid),
  'source restore never auto-publishes the previously approved English parent'
);

reset role;
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'e2300000-0000-4000-8000-000000000003',
  'tourism-media',
  'tourism-package/' || :'package_id' || '/e2200000-0000-4000-8000-000000000001.png',
  'e8000000-0000-4000-8000-000000000001'
);
select aggregate_revision as aggregate_revision,
       (select binary_revision from public.package_images
        where id = 'e2200000-0000-4000-8000-000000000001') as binary_revision
from public.tourism_packages where id = :'package_id' \gset before_primary_replacement_
set local role authenticated;
select is(
  public.media_replace(
    'tourism-package',
    :'package_id'::uuid,
    'e2200000-0000-4000-8000-000000000001'::uuid,
    'tourism-package/' || :'package_id' || '/e2200000-0000-4000-8000-000000000001.png',
    'Replacement primary alt', 'Replacement primary caption', 0, true,
    array[
      'e2200000-0000-4000-8000-000000000001'::uuid,
      'e2200000-0000-4000-8000-000000000002'::uuid
    ]
  ),
  'tourism-package/' || :'package_id' || '/e2200000-0000-4000-8000-000000000001.jpg',
  'primary media replacement stays behind the generic media RPC'
);
select is(
  (select binary_revision from public.package_images
   where id = 'e2200000-0000-4000-8000-000000000001'),
  :'before_primary_replacement_binary_revision'::bigint + 1,
  'primary media replacement advances binary revision once'
);
select is(
  (select aggregate_revision from public.tourism_packages where id = :'package_id'),
  :'before_primary_replacement_aggregate_revision'::bigint + 1,
  'primary media replacement advances the package aggregate exactly once'
);
select is(
  (select thumbnail_path from public.tourism_packages where id = :'package_id'),
  'tourism-package/' || :'package_id' || '/e2200000-0000-4000-8000-000000000001.png',
  'primary media replacement synchronizes the source thumbnail path'
);
reset role;

reset role;
select throws_ok(
  $$update public.tourism_package_translation_review_events
    set reason = 'tampered'$$,
  '42501'::char(5), null,
  'Tourism Package review history is append-only'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e8000000-0000-4000-8000-000000000002', true);
select throws_ok(
  format(
    'select public.tourism_package_translation_restore(%L::uuid, 1)',
    :'package_translation_id'
  ),
  '42501'::char(5), null,
  'non-administrator cannot execute the Tourism Package translation workflow'
);
select set_config('request.jwt.claim.sub', 'e8000000-0000-4000-8000-000000000001', true);

select * from finish();
rollback;
