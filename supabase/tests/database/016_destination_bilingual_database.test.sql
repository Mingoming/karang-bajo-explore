begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_catalog;
select no_plan();

select has_table('public', 'destination_translations', 'destination translation table exists');
select has_table('public', 'destination_image_translations', 'destination image translation table exists');
select has_table('public', 'destination_translation_review_events', 'destination translation review history exists');
select has_table('public', 'destination_image_translation_review_events', 'destination image review history exists');
select has_table('private', 'tourism_media_cleanup_claims', 'tourism media cleanup claims exist');
select has_column('public', 'destinations', 'source_revision', 'destination source revision exists');
select has_column('public', 'destinations', 'thumbnail_binary_revision', 'destination thumbnail revision exists');
select has_column('public', 'destination_images', 'binary_revision', 'destination image binary revision exists');
select has_column('public', 'destination_images', 'updated_at', 'destination image updated_at exists');
select has_column('public', 'destination_images', 'updated_by', 'destination image updated_by exists');
select ok(
  exists (select 1 from pg_catalog.pg_constraint where conname = 'destination_translations_source_locale_key')
  and exists (select 1 from pg_catalog.pg_constraint where conname = 'destination_image_translations_source_locale_key')
  and exists (select 1 from pg_catalog.pg_constraint where conname = 'destination_translations_review_checkpoint_check')
  and exists (select 1 from pg_catalog.pg_constraint where conname = 'destination_image_translations_review_checkpoint_check'),
  'translation uniqueness and review-checkpoint constraints exist'
);
select ok(
  (select count(*) = 1
   from pg_catalog.pg_constraint as constraint_row
   where constraint_row.conrelid = 'public.destination_translations'::regclass
     and constraint_row.contype = 'f'
     and constraint_row.confrelid = 'public.destinations'::regclass
     and constraint_row.conkey = array[(select attribute.attnum from pg_catalog.pg_attribute as attribute where attribute.attrelid = constraint_row.conrelid and attribute.attname = 'destination_id' and not attribute.attisdropped)]::smallint[]
     and constraint_row.confkey = array[(select attribute.attnum from pg_catalog.pg_attribute as attribute where attribute.attrelid = constraint_row.confrelid and attribute.attname = 'id' and not attribute.attisdropped)]::smallint[]
     and constraint_row.confdeltype = 'r')
  and (select count(*) = 1
       from pg_catalog.pg_constraint as constraint_row
       where constraint_row.conrelid = 'public.destination_image_translations'::regclass
         and constraint_row.contype = 'f'
         and constraint_row.confrelid = 'public.destination_images'::regclass
         and constraint_row.conkey = array[(select attribute.attnum from pg_catalog.pg_attribute as attribute where attribute.attrelid = constraint_row.conrelid and attribute.attname = 'destination_image_id' and not attribute.attisdropped)]::smallint[]
         and constraint_row.confkey = array[(select attribute.attnum from pg_catalog.pg_attribute as attribute where attribute.attrelid = constraint_row.confrelid and attribute.attname = 'id' and not attribute.attisdropped)]::smallint[]
         and constraint_row.confdeltype = 'r')
  and (select count(*) = 1
       from pg_catalog.pg_constraint as constraint_row
       where constraint_row.conrelid = 'public.destination_translation_review_events'::regclass
         and constraint_row.contype = 'f'
         and constraint_row.confrelid = 'public.destination_translations'::regclass
         and constraint_row.conkey = array[(select attribute.attnum from pg_catalog.pg_attribute as attribute where attribute.attrelid = constraint_row.conrelid and attribute.attname = 'destination_translation_id' and not attribute.attisdropped)]::smallint[]
         and constraint_row.confkey = array[(select attribute.attnum from pg_catalog.pg_attribute as attribute where attribute.attrelid = constraint_row.confrelid and attribute.attname = 'id' and not attribute.attisdropped)]::smallint[]
         and constraint_row.confdeltype = 'r')
  and (select count(*) = 1
       from pg_catalog.pg_constraint as constraint_row
       where constraint_row.conrelid = 'public.destination_image_translation_review_events'::regclass
         and constraint_row.contype = 'f'
         and constraint_row.confrelid = 'public.destination_image_translations'::regclass
         and constraint_row.conkey = array[(select attribute.attnum from pg_catalog.pg_attribute as attribute where attribute.attrelid = constraint_row.conrelid and attribute.attname = 'destination_image_translation_id' and not attribute.attisdropped)]::smallint[]
         and constraint_row.confkey = array[(select attribute.attnum from pg_catalog.pg_attribute as attribute where attribute.attrelid = constraint_row.confrelid and attribute.attname = 'id' and not attribute.attisdropped)]::smallint[]
         and constraint_row.confdeltype = 'r'),
  'translation and audit foreign keys use the required source columns, targets, and ON DELETE RESTRICT'
);
select ok(
  exists (select 1 from pg_catalog.pg_class where relname = 'destination_translations_public_lookup_idx')
  and exists (select 1 from pg_catalog.pg_class where relname = 'destination_translations_admin_queue_idx')
  and exists (select 1 from pg_catalog.pg_class where relname = 'destination_image_translations_public_lookup_idx')
  and exists (select 1 from pg_catalog.pg_class where relname = 'destination_translation_review_events_history_idx')
  and exists (select 1 from pg_catalog.pg_class where relname = 'destination_image_translation_review_events_history_idx'),
  'contract-critical translation indexes exist'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.destination_translations'::regclass),
  'destination translation RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.destination_image_translations'::regclass),
  'destination image translation RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.destination_translation_review_events'::regclass),
  'destination translation event RLS is enabled'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.destination_image_translation_review_events'::regclass),
  'destination image event RLS is enabled'
);
select is(
  (select count(*) from pg_catalog.pg_policies where schemaname = 'public' and tablename in (
    'destination_translations', 'destination_image_translations',
    'destination_translation_review_events', 'destination_image_translation_review_events'
  )),
  0::bigint,
  'new translation tables have no permissive RLS policies'
);
select ok(
  not has_table_privilege('authenticated', 'public.destination_translations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.destination_translations', 'INSERT')
  and not has_table_privilege('authenticated', 'public.destination_translations', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.destination_translations', 'DELETE'),
  'authenticated has no direct destination translation table privileges'
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
       'destination_translation_admin_read',
       'destination_image_translation_admin_read',
       'destination_translation_review_history',
       'destination_image_translation_review_history',
       'destination_translation_save_draft',
       'destination_translation_review',
       'destination_translation_reject',
       'destination_translation_publish',
       'destination_translation_republish',
       'destination_translation_archive',
       'destination_translation_unpublish',
       'destination_translation_restore',
       'destination_image_translation_save_draft',
       'destination_image_translation_review',
       'destination_image_translation_reject',
       'destination_image_translation_publish',
       'destination_image_translation_republish',
       'destination_image_translation_archive',
       'destination_image_translation_unpublish',
       'destination_image_translation_restore'
     )),
  'all destination translation RPCs are security-definer owner functions with an empty search path'
);
select ok(
  has_function_privilege('authenticated', 'public.destination_translation_save_draft(uuid,bigint,text,text,text,text,text,text,text[],text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.destination_translation_save_draft(uuid,bigint,text,text,text,text,text,text,text[],text)', 'EXECUTE'),
  'only authenticated callers receive the parent save RPC grant'
);
select ok(
  has_function_privilege('authenticated', 'public.destination_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.destination_image_translation_save_draft(uuid,bigint,text,text)', 'EXECUTE'),
  'only authenticated callers receive the image save RPC grant'
);

select ok(
  exists (select 1 from pg_catalog.pg_trigger where tgname = 'destinations_source_revision_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'destination_images_revision_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'destinations_translation_source_cascade_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'destination_images_translation_media_cascade_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'destination_translation_review_events_append_only_trigger')
  and exists (select 1 from pg_catalog.pg_trigger where tgname = 'destination_image_translation_review_events_append_only_trigger'),
  'revision, cascade, and append-only triggers exist'
);
select ok(
  (select reloptions @> array['security_barrier=true'] from pg_catalog.pg_class where oid = 'public.published_english_destinations'::regclass)
  and (select reloptions @> array['security_invoker=false'] from pg_catalog.pg_class where oid = 'public.published_english_destinations'::regclass)
  and (select reloptions @> array['security_barrier=true'] from pg_catalog.pg_class where oid = 'public.published_english_destination_images'::regclass)
  and (select reloptions @> array['security_invoker=false'] from pg_catalog.pg_class where oid = 'public.published_english_destination_images'::regclass),
  'English projections are security-barrier, non-invoker views'
);
select ok(
  has_table_privilege('anon', 'public.published_english_destinations', 'SELECT')
  and has_table_privilege('authenticated', 'public.published_english_destinations', 'SELECT')
  and not has_table_privilege('anon', 'public.destinations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.destination_translations', 'SELECT'),
  'public access is limited to the safe English destination projection'
);
select ok(
  not exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'tourism_media_admin_update'),
  'tourism media direct Storage UPDATE has no administrator policy'
);
select ok(
  exists (select 1 from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'tourism_media_admin_delete')
  and has_function_privilege('authenticated', 'private.tourism_media_cleanup_claim_is_valid(text,text)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'private.tourism_media_cleanup_claims', 'SELECT'),
  'cleanup deletion uses the claim-validity policy boundary without table exposure'
);
select ok(
  exists (select 1 from pg_catalog.pg_proc where oid = 'private.fingerprint_sha256_v1(text,text[])'::regprocedure)
  and exists (select 1 from pg_catalog.pg_proc where oid = 'private.destination_source_fingerprint_v1(public.destinations)'::regprocedure)
  and exists (select 1 from pg_catalog.pg_proc where oid = 'private.destination_translation_fingerprint_v1(public.destination_translations)'::regprocedure)
  and exists (select 1 from pg_catalog.pg_proc where oid = 'private.destination_image_media_fingerprint_v1(public.destination_images)'::regprocedure),
  'versioned destination fingerprint functions exist'
);

select is(
  private.fingerprint_sha256_v1('test-v1', array['a', private.fingerprint_json_string('one'), 'b', private.fingerprint_json_string('two')]),
  private.fingerprint_sha256_v1('test-v1', array['a', private.fingerprint_json_string('one'), 'b', private.fingerprint_json_string('two')]),
  'fingerprint serialization is deterministic'
);
select isnt(
  private.fingerprint_sha256_v1('test-v1', array['a', private.fingerprint_json_string('one'), 'b', private.fingerprint_json_string('two')]),
  private.fingerprint_sha256_v1('test-v1', array['a', private.fingerprint_json_string('two'), 'b', private.fingerprint_json_string('one')]),
  'fingerprint preserves ordered field values'
);
select throws_ok(
  $$select private.fingerprint_json_text_value('   ', true)$$,
  '23514'::char(5),
  'required fingerprint text is empty',
  'required fingerprint values fail closed'
);

insert into auth.users (id) values ('b1000000-0000-4000-8000-000000000001');
update private.app_config set administrator_user_id = 'b1000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);

insert into public.destinations (
  id, category_id, name, slug, summary, description, history, latitude, longitude,
  facilities, thumbnail_bucket, thumbnail_path, created_by, updated_by
) values (
  'b1100000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Destination Bilingual',
  'destination-bilingual',
  'Ringkasan sumber',
  'Deskripsi sumber',
  'Sejarah sumber',
  -8.27,
  116.42,
  array['Jalur']::text[],
  'tourism-media',
  'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg',
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001'
);
insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'b1300000-0000-4000-8000-000000000001',
  'tourism-media',
  'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg',
  'b1000000-0000-4000-8000-000000000001'
);
insert into public.destination_images (
  id, destination_id, storage_bucket, storage_path, caption, alt_text,
  display_order, is_primary, created_by
) values (
  'b1200000-0000-4000-8000-000000000001',
  'b1100000-0000-4000-8000-000000000001',
  'tourism-media',
  'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg',
  'Keterangan sumber',
  'Alt sumber',
  0,
  true,
  'b1000000-0000-4000-8000-000000000001'
);
select is(
  left(
    private.destination_source_fingerprint_v1(
      (select source from public.destinations as source where source.id = 'b1100000-0000-4000-8000-000000000001')
    ),
    length('fingerprint-v1:')
  ),
  'fingerprint-v1:',
  'destination source fingerprint uses the approved version marker'
);
select is(
  left(
    private.destination_thumbnail_media_fingerprint_v1(
      (select source from public.destinations as source where source.id = 'b1100000-0000-4000-8000-000000000001')
    ),
    length('thumbnail-media-v1:')
  ),
  'thumbnail-media-v1:',
  'destination thumbnail fingerprint uses the approved version marker'
);
select is(
  left(
    private.destination_image_media_fingerprint_v1(
      (select image from public.destination_images as image where image.id = 'b1200000-0000-4000-8000-000000000001')
    ),
    length('media-v1:')
  ),
  'media-v1:',
  'destination image media fingerprint uses the approved version marker'
);

insert into public.destinations (
  id, category_id, name, slug, summary, description, latitude, longitude,
  facilities, created_by, updated_by
) values (
  'b1600000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Invalid Legacy Destination',
  'invalid-legacy-destination',
  'Legacy summary',
  'Legacy description',
  -8.28,
  116.43,
  array['   ']::text[],
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001'
);
insert into public.destinations (
  id, category_id, name, slug, summary, description, latitude, longitude,
  facilities, thumbnail_bucket, thumbnail_path, created_by, updated_by
) values (
  'b1700000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Legacy Parent Only',
  'legacy-parent-only',
  'Legacy summary',
  'Legacy description',
  -8.29,
  116.44,
  array['Trail']::text[],
  'tourism-media',
  'destination/b1700000-0000-4000-8000-000000000001/b1710000-0000-4000-8000-000000000001.jpg',
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001'
);
select is(
  (select detail
   from private.destination_bilingual_legacy_validation_report()
   where issue_code = 'invalid_source_fingerprint'
     and destination_id = 'b1600000-0000-4000-8000-000000000001'),
  'facilities',
  'legacy invalid fingerprint input is identified by the migration validation report'
);
select is(
  (select count(*)
   from private.destination_bilingual_legacy_validation_report()
   where issue_code = 'parent_only_thumbnail'
     and destination_id = 'b1700000-0000-4000-8000-000000000001'),
  1::bigint,
  'legacy parent-only thumbnail is reported without repair'
);
select is(
  (select count(*)
   from private.destination_bilingual_legacy_validation_report()
   where destination_id = 'b1100000-0000-4000-8000-000000000001'),
  0::bigint,
  'valid legacy-compatible destination is unaffected by validation reporting'
);

insert into public.tourism_packages (
  id, name, slug, package_type, duration_value, duration_unit, description,
  created_by, updated_by
) values (
  'b1400000-0000-4000-8000-000000000001',
  'Bilingual Media Package',
  'bilingual-media-package',
  'standard',
  1,
  'hari',
  'Package used to verify the legacy generic media contract',
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001'
);
select lives_ok(
  $$select public.media_insert('tourism-package', 'b1400000-0000-4000-8000-000000000001', 'b1500000-0000-4000-8000-000000000001', 'tourism-package/b1400000-0000-4000-8000-000000000001/b1500000-0000-4000-8000-000000000001.jpg', 'Package image', null, 0, true, array['b1500000-0000-4000-8000-000000000001']::uuid[])$$,
  'matching non-destination media_insert path succeeds'
);
select throws_ok(
  $$select public.media_insert('tourism-package', 'b1400000-0000-4000-8000-000000000001', 'b1500000-0000-4000-8000-000000000002', 'tourism-package/b1400000-0000-4000-8000-000000000001/b1500000-0000-4000-8000-000000000003.jpg', 'Package image', null, 1, false, array['b1500000-0000-4000-8000-000000000002']::uuid[])$$,
  '22023'::char(5),
  'invalid media storage path',
  'mismatched non-destination media_insert image UUID is rejected'
);
select throws_ok(
  $$select public.media_insert('tourism-package', 'b1400000-0000-4000-8000-000000000001', 'b1500000-0000-4000-8000-000000000004', 'not-a-valid-media-path', 'Package image', null, 1, false, array['b1500000-0000-4000-8000-000000000004']::uuid[])$$,
  '22023'::char(5),
  'invalid media storage path',
  'malformed non-destination media_insert path keeps the legacy error contract'
);
select is(
  private.tourism_media_object_is_unreferenced('tourism-media', 'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000001.jpg'),
  false,
  'referenced Storage objects are not unreferenced'
);
update public.destinations
set status = 'published', updated_by = 'b1000000-0000-4000-8000-000000000001'
where id = 'b1100000-0000-4000-8000-000000000001';
update public.destinations
set status = 'published', updated_by = 'b1000000-0000-4000-8000-000000000001'
where id = 'b1700000-0000-4000-8000-000000000001';
select is(
  (select count(*) from public.published_english_destinations where id = 'b1700000-0000-4000-8000-000000000001'),
  0::bigint,
  'parent-only legacy thumbnail remains absent from the English projection'
);
select is(
  (select name from public.destinations where id = 'b1700000-0000-4000-8000-000000000001'),
  'Legacy Parent Only',
  'Indonesian source data remains present without English fallback'
);

select ok(
  (select source_revision > 1 from public.destinations where id = 'b1100000-0000-4000-8000-000000000001')
  and (select thumbnail_binary_revision = 1 from public.destinations where id = 'b1100000-0000-4000-8000-000000000001')
  and (select binary_revision = 1 and updated_by = 'b1000000-0000-4000-8000-000000000001' from public.destination_images where id = 'b1200000-0000-4000-8000-000000000001'),
  'source and image revisions are database-owned'
);
select throws_ok(
  $$update public.destinations set source_revision = source_revision + 1 where id = 'b1100000-0000-4000-8000-000000000001'$$,
  '42501'::char(5),
  'destination revisions are database managed',
  'source revision cannot be supplied by a caller'
);
select throws_ok(
  $$update public.destination_images set binary_revision = binary_revision + 1 where id = 'b1200000-0000-4000-8000-000000000001'$$,
  '42501'::char(5),
  'destination image audit fields are database managed',
  'image revision cannot be supplied by a caller'
);

select (public.destination_translation_save_draft(
  'b1100000-0000-4000-8000-000000000001', null,
  'Bilingual Destination', 'Source summary in English', 'Source description in English',
  'Source history in English', null, null, array['Trail']::text[], 'Destination thumbnail'
)).id \gset translation_
select ok(:'translation_id' is not null, 'save draft creates one parent translation');
select is((select review_state from public.destination_translations where id = :'translation_id'), 'pending', 'new parent translation starts pending');
select is((select translation_status from public.destination_translations where id = :'translation_id'), 'draft', 'new parent translation starts draft');
select is((select count(*) from public.destination_translation_review_events where destination_translation_id = :'translation_id'), 1::bigint, 'draft creation appends one parent event');
select is(
  left(
    private.destination_translation_fingerprint_v1(
      (select translation from public.destination_translations as translation where translation.id = :'translation_id')
    ),
    length('translation-v1:')
  ),
  'translation-v1:',
  'destination translation fingerprint uses the approved version marker'
);

select (public.destination_translation_review(:'translation_id', 1)).edit_revision \gset reviewed_
select is((select review_state from public.destination_translations where id = :'translation_id'), 'reviewed', 'review transitions a pending translation');
select is((select count(*) from public.destination_translation_review_events where destination_translation_id = :'translation_id'), 2::bigint, 'review appends one parent event');
select (public.destination_translation_publish(:'translation_id', 2)).edit_revision \gset published_
select is((select translation_status from public.destination_translations where id = :'translation_id'), 'published', 'publish transitions a reviewed translation');
select is((select count(*) from public.published_english_destinations where id = 'b1100000-0000-4000-8000-000000000001'), 1::bigint, 'eligible destination appears in the English projection');
select is((select name from public.published_english_destinations where id = 'b1100000-0000-4000-8000-000000000001'), 'Bilingual Destination', 'English projection uses translated name');

update public.destinations
set updated_by = 'b1000000-0000-4000-8000-000000000001'
where id = 'b1100000-0000-4000-8000-000000000001';
select is((select count(*) from public.published_english_destinations where id = 'b1100000-0000-4000-8000-000000000001'), 1::bigint, 'neutral source updates do not force retranslation');

select (public.destination_image_translation_save_draft(
  'b1200000-0000-4000-8000-000000000001', null, 'English image alt', 'English image caption'
)).id \gset image_translation_
select is(
  left(
    private.destination_image_translation_fingerprint_v1(
      (select translation from public.destination_image_translations as translation where translation.id = :'image_translation_id')
    ),
    length('destination-media-translation-v1:')
  ),
  'destination-media-translation-v1:',
  'destination image translation fingerprint uses the approved version marker'
);
select (public.destination_image_translation_review(:'image_translation_id', 1)).edit_revision \gset image_reviewed_
select (public.destination_image_translation_publish(:'image_translation_id', 2)).edit_revision \gset image_published_
select is((select count(*) from public.published_english_destination_images where id = 'b1200000-0000-4000-8000-000000000001'), 1::bigint, 'eligible English image appears in the child projection');
select lives_ok(
  $$select public.media_update('destination', 'b1100000-0000-4000-8000-000000000001', 'b1200000-0000-4000-8000-000000000001', 'Alt source changed', 'Source caption changed', 0, true, array['b1200000-0000-4000-8000-000000000001']::uuid[])$$,
  'source media metadata update remains an atomic generic media RPC'
);
select is((select binary_revision from public.destination_images where id = 'b1200000-0000-4000-8000-000000000001'), 2::bigint, 'source alt or caption increments binary revision once');
select is((select count(*) from public.published_english_destination_images where id = 'b1200000-0000-4000-8000-000000000001'), 0::bigint, 'changed source media suppresses the English child projection');
select is((select count(*) from public.destination_image_translation_review_events where destination_image_translation_id = :'image_translation_id' and event_type = 'media_changed'), 1::bigint, 'source media change appends one child media event');
select throws_ok(
  format('select public.destination_image_translation_republish(%L, %s)', :'image_translation_id', :'image_published_edit_revision'),
  '55000'::char(5),
  'fresh review required before destination image translation republish',
  'stale image translation cannot republish with its previous review checkpoint'
);
select (public.destination_image_translation_unpublish(:'image_translation_id', :'image_published_edit_revision')).edit_revision \gset image_unpublished_
select (public.destination_image_translation_review(:'image_translation_id', :'image_unpublished_edit_revision')).edit_revision \gset image_re_reviewed_
select (public.destination_image_translation_republish(:'image_translation_id', :'image_re_reviewed_edit_revision')).edit_revision \gset image_republished_
select is((select count(*) from public.published_english_destination_images where id = 'b1200000-0000-4000-8000-000000000001'), 1::bigint, 'freshly reviewed image translation can republish and restore eligibility');

select (public.destination_translation_save_draft(
  'b1100000-0000-4000-8000-000000000001', :'published_edit_revision',
  'Bilingual Destination', 'Source summary in English', 'Source description in English',
  'Source history in English', null, null, array['Trail']::text[], 'Destination thumbnail'
)).edit_revision \gset saved_
select is((select translation_status from public.destination_translations where id = :'translation_id'), 'draft', 'editing a published translation withdraws publication');
select is((select count(*) from public.published_english_destinations where id = 'b1100000-0000-4000-8000-000000000001'), 0::bigint, 'edited translation is immediately absent from the public projection');

-- Recreate the review checkpoint, then change a translation-relevant source
-- field. The source cascade leaves the stored row published but stale.
select (public.destination_translation_review(:'translation_id', :'saved_edit_revision')).edit_revision \gset re_reviewed_
select (public.destination_translation_republish(:'translation_id', :'re_reviewed_edit_revision')).edit_revision \gset re_published_
update public.destinations
set description = 'Changed source description', updated_by = 'b1000000-0000-4000-8000-000000000001'
where id = 'b1100000-0000-4000-8000-000000000001';
select is((select translation_status from public.destination_translations where id = :'translation_id'), 'published', 'source change leaves publication stored');
select is((select count(*) from public.published_english_destinations where id = 'b1100000-0000-4000-8000-000000000001'), 0::bigint, 'source change fail-closes the English projection');
select ok(
  (select captured_source_fingerprint <> private.destination_source_fingerprint_v1(source)
   from public.destination_translations as translation
   join public.destinations as source on source.id = translation.destination_id
   where translation.id = :'translation_id'),
  'source fingerprint mismatch is derived stale state'
);
select throws_ok(
  format('select public.destination_translation_republish(%L, %s)', :'translation_id', :'re_published_edit_revision'),
  '55000'::char(5),
  'fresh review required before destination translation republish',
  'stale parent translation cannot republish with its previous review checkpoint'
);

select (public.destination_translation_unpublish(:'translation_id', :'re_published_edit_revision')).edit_revision \gset unpublished_
select is((select translation_status from public.destination_translations where id = :'translation_id'), 'draft', 'unpublish returns a translation to draft');
select (public.destination_translation_archive(:'translation_id', :'unpublished_edit_revision')).edit_revision \gset archived_
select is((select translation_status from public.destination_translations where id = :'translation_id'), 'archived', 'archive stores an archived translation state');
select (public.destination_translation_restore(:'translation_id', :'archived_edit_revision')).edit_revision \gset restored_
select is((select translation_status from public.destination_translations where id = :'translation_id'), 'draft', 'restore returns an archived translation to draft');
select is((select review_state from public.destination_translations where id = :'translation_id'), 'pending', 'restore never republishes automatically');

update public.destinations
set status = 'archived', updated_by = 'b1000000-0000-4000-8000-000000000001'
where id = 'b1100000-0000-4000-8000-000000000001';
select is((select status from public.destinations where id = 'b1100000-0000-4000-8000-000000000001'), 'archived', 'source unpublish stores the archived source state');
select is((select translation_status from public.destination_translations where id = :'translation_id'), 'draft', 'source unpublish keeps the parent translation non-public');
select is((select review_state from public.destination_translations where id = :'translation_id'), 'pending', 'source unpublish clears the parent review checkpoint');
select is((select count(*) from public.destination_translation_review_events where destination_translation_id = :'translation_id' and event_type = 'source_blocked'), 1::bigint, 'source unpublish appends one source-blocked event');
select is((select count(*) from public.published_english_destinations where id = 'b1100000-0000-4000-8000-000000000001'), 0::bigint, 'archived source is absent from the English projection');
select is((select count(*) from public.published_english_destination_images where id = 'b1200000-0000-4000-8000-000000000001'), 0::bigint, 'archived source blocks its English image projection');
select is((select translation_status from public.destination_image_translations where id = :'image_translation_id'), 'published', 'source archive does not mutate child image translation state');

update public.destinations
set status = 'draft', updated_by = 'b1000000-0000-4000-8000-000000000001'
where id = 'b1100000-0000-4000-8000-000000000001';
select is((select status from public.destinations where id = 'b1100000-0000-4000-8000-000000000001'), 'draft', 'source restore returns the source to draft');
select is((select translation_status from public.destination_translations where id = :'translation_id'), 'draft', 'source restore does not promote the parent translation');
select is((select count(*) from public.published_english_destinations where id = 'b1100000-0000-4000-8000-000000000001'), 0::bigint, 'source restore never republishes English automatically');

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'b1300000-0000-4000-8000-000000000002',
  'tourism-media',
  'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000098.jpg',
  'b1000000-0000-4000-8000-000000000001'
);
select lives_ok(
  $$select public.media_insert('destination', 'b1100000-0000-4000-8000-000000000001', 'b1200000-0000-4000-8000-000000000002', 'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000098.jpg', 'Second destination image', null, 1, false, array['b1200000-0000-4000-8000-000000000001','b1200000-0000-4000-8000-000000000002']::uuid[])$$,
  'destination media_insert retains its approved destination path semantics'
);

select throws_ok(
  $$delete from public.destination_images where id = 'b1200000-0000-4000-8000-000000000001'$$,
  '23503'::char(5),
  null,
  'image deletion is restricted while translation history exists'
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'b1300000-0000-4000-8000-000000000099',
  'tourism-media',
  'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000099.jpg',
  'b1000000-0000-4000-8000-000000000001'
);
select ok(
  private.tourism_media_object_is_unreferenced('tourism-media', 'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000099.jpg'),
  'unreferenced Storage helper identifies an orphan object'
);
set local role authenticated;
select public.tourism_media_cleanup_claim(
  'tourism-media',
  'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000099.jpg'
) \gset cleanup_
select public.tourism_media_cleanup_begin_delete(
  'tourism-media',
  'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000099.jpg',
  :'cleanup_tourism_media_cleanup_claim'
);
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects
where id = 'b1300000-0000-4000-8000-000000000099';
select public.tourism_media_cleanup_finish(
  'tourism-media',
  'destination/b1100000-0000-4000-8000-000000000001/b1200000-0000-4000-8000-000000000099.jpg',
  :'cleanup_tourism_media_cleanup_claim',
  true,
  null
);
reset role;
select is((select count(*) from storage.objects where id = 'b1300000-0000-4000-8000-000000000099'), 0::bigint, 'claim-aware Storage deletion removes only the claimed orphan');

select throws_ok(
  $$update public.destination_translation_review_events set reason = 'tampered' where destination_translation_id = (select id from public.destination_translations where destination_id = 'b1100000-0000-4000-8000-000000000001')$$,
  '42501'::char(5),
  'destination translation review history is append-only',
  'parent review history rejects UPDATE'
);
select throws_ok(
  $$delete from public.destination_image_translation_review_events where destination_image_translation_id = (select id from public.destination_image_translations where destination_image_id = 'b1200000-0000-4000-8000-000000000001')$$,
  '42501'::char(5),
  'destination image translation review history is append-only',
  'image review history rejects DELETE'
);

select * from finish();
rollback;
