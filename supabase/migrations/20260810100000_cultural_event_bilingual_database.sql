begin;

-- Cultural Events bilingual database layer.  Source content and generic media
-- remain owned by the existing public tables and media RPC family.  This
-- migration adds only the typed English translation boundary and its
-- database-owned freshness/lifecycle contract.

create or replace function private.cultural_event_bilingual_legacy_validation_report()
returns table (
  issue_code text,
  cultural_event_id uuid,
  cultural_event_image_id uuid,
  detail text
)
language sql
security definer
stable
set search_path = ''
as $$
  with source_issues as (
    select
      'invalid_source_precondition'::text as issue_code,
      source.id as cultural_event_id,
      null::uuid as cultural_event_image_id,
      concat_ws(
        ', ',
        case when pg_catalog.btrim(coalesce(source.title, '')) = '' then 'title' end,
        case when pg_catalog.btrim(coalesce(source.description, '')) = '' then 'description' end,
        case when source.start_at is null and source.status = 'published'::public.publication_status then 'published source requires start_at' end,
        case when source.end_at is not null and source.start_at is null then 'end_at without start_at' end,
        case when source.end_at is not null and source.start_at is not null and source.end_at < source.start_at then 'end_at before start_at' end,
        case when (source.latitude is null) <> (source.longitude is null) then 'coordinate pair' end,
        case when source.contact_phone is not null and source.status = 'published'::public.publication_status and not source.contact_consent_confirmed then 'contact consent' end,
        case when (source.thumbnail_bucket is null) <> (source.thumbnail_path is null) then 'thumbnail pair' end,
        case when source.status = 'published'::public.publication_status and (source.thumbnail_bucket is null or source.thumbnail_path is null) then 'published source requires thumbnail' end
      ) as detail
    from public.cultural_events as source
    where pg_catalog.btrim(coalesce(source.title, '')) = ''
       or pg_catalog.btrim(coalesce(source.description, '')) = ''
       or (source.start_at is null and source.status = 'published'::public.publication_status)
       or (source.end_at is not null and source.start_at is null)
       or (source.end_at is not null and source.start_at is not null and source.end_at < source.start_at)
       or ((source.latitude is null) <> (source.longitude is null))
       or (source.contact_phone is not null and source.status = 'published'::public.publication_status and not source.contact_consent_confirmed)
       or ((source.thumbnail_bucket is null) <> (source.thumbnail_path is null))
       or (source.status = 'published'::public.publication_status and (source.thumbnail_bucket is null or source.thumbnail_path is null))
  ), image_issues as (
    select
      case
        when pg_catalog.btrim(coalesce(image.storage_bucket, '')) = ''
          or image.storage_bucket <> 'tourism-media'
          or pg_catalog.btrim(coalesce(image.storage_path, '')) = ''
          or image.storage_path !~ ('^cultural-event/' || image.cultural_event_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
          or pg_catalog.btrim(coalesce(image.alt_text, '')) = ''
        then 'invalid_image_media_precondition'::text
        else 'missing_image_storage_object'::text
      end as issue_code,
      image.cultural_event_id,
      image.id as cultural_event_image_id,
      case
        when pg_catalog.btrim(coalesce(image.storage_bucket, '')) = ''
          or image.storage_bucket <> 'tourism-media' then 'storage bucket'
        when pg_catalog.btrim(coalesce(image.storage_path, '')) = ''
          or image.storage_path !~ ('^cultural-event/' || image.cultural_event_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$') then 'storage path'
        when pg_catalog.btrim(coalesce(image.alt_text, '')) = '' then 'source alt text'
        else 'storage object is missing'
      end as detail
    from public.cultural_event_images as image
    where pg_catalog.btrim(coalesce(image.storage_bucket, '')) = ''
       or image.storage_bucket <> 'tourism-media'
       or pg_catalog.btrim(coalesce(image.storage_path, '')) = ''
       or image.storage_path !~ ('^cultural-event/' || image.cultural_event_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
       or pg_catalog.btrim(coalesce(image.alt_text, '')) = ''
       or not exists (
         select 1
         from storage.objects as object
         where object.bucket_id = image.storage_bucket
           and object.name = image.storage_path
       )
  ), primary_counts as (
    select source.id as cultural_event_id, count(image.id)::bigint as primary_count
    from public.cultural_events as source
    left join public.cultural_event_images as image
      on image.cultural_event_id = source.id
     and image.is_primary
    where source.status = 'published'::public.publication_status
    group by source.id
  ), primary_issues as (
    select
      'invalid_primary_count'::text as issue_code,
      primary_counts.cultural_event_id,
      null::uuid as cultural_event_image_id,
      'expected exactly one primary image, found ' || primary_counts.primary_count::text as detail
    from primary_counts
    where primary_counts.primary_count <> 1
  ), thumbnail_issues as (
    select
      case
        when not exists (
          select 1
          from public.cultural_event_images as image
          where image.cultural_event_id = source.id
            and image.storage_bucket = source.thumbnail_bucket
            and image.storage_path = source.thumbnail_path
        ) then 'thumbnail_without_child'::text
        when exists (
          select 1
          from public.cultural_event_images as image
          where image.cultural_event_id = source.id
            and image.storage_bucket = source.thumbnail_bucket
            and image.storage_path = source.thumbnail_path
            and not image.is_primary
        ) then 'thumbnail_child_not_primary'::text
        when exists (
          select 1
          from storage.objects as object
          where object.bucket_id = source.thumbnail_bucket
            and object.name = source.thumbnail_path
        ) then 'thumbnail_reference_valid'::text
        else 'missing_thumbnail_storage_object'::text
      end as issue_code,
      source.id as cultural_event_id,
      null::uuid as cultural_event_image_id,
      source.thumbnail_bucket || '/' || source.thumbnail_path as detail
    from public.cultural_events as source
    where source.status = 'published'::public.publication_status
      and source.thumbnail_bucket is not null
      and source.thumbnail_path is not null
      and (
        not exists (
          select 1
          from public.cultural_event_images as image
          where image.cultural_event_id = source.id
            and image.storage_bucket = source.thumbnail_bucket
            and image.storage_path = source.thumbnail_path
        )
        or exists (
          select 1
          from public.cultural_event_images as image
          where image.cultural_event_id = source.id
            and image.storage_bucket = source.thumbnail_bucket
            and image.storage_path = source.thumbnail_path
            and not image.is_primary
        )
        or not exists (
          select 1
          from storage.objects as object
          where object.bucket_id = source.thumbnail_bucket
            and object.name = source.thumbnail_path
        )
      )
  ), other_event_thumbnail_issues as (
    select
      'thumbnail_points_to_other_event'::text as issue_code,
      source.id as cultural_event_id,
      null::uuid as cultural_event_image_id,
      source.thumbnail_bucket || '/' || source.thumbnail_path as detail
    from public.cultural_events as source
    where source.status = 'published'::public.publication_status
      and source.thumbnail_bucket is not null
      and source.thumbnail_path is not null
      and exists (
        select 1
        from public.cultural_event_images as image
        where image.cultural_event_id <> source.id
          and image.storage_bucket = source.thumbnail_bucket
          and image.storage_path = source.thumbnail_path
      )
  )
  select issue_code, cultural_event_id, cultural_event_image_id, detail
  from source_issues
  union all
  select issue_code, cultural_event_id, cultural_event_image_id, detail
  from image_issues
  union all
  select issue_code, cultural_event_id, cultural_event_image_id, detail
  from primary_issues
  union all
  select issue_code, cultural_event_id, cultural_event_image_id, detail
  from thumbnail_issues
  where issue_code <> 'thumbnail_reference_valid'
  union all
  select issue_code, cultural_event_id, cultural_event_image_id, detail
  from other_event_thumbnail_issues
  order by issue_code, cultural_event_id nulls first, cultural_event_image_id nulls first, detail;
$$;

do $$
declare
  l_issue record;
  l_count bigint := 0;
begin
  for l_issue in select * from private.cultural_event_bilingual_legacy_validation_report() loop
    l_count := l_count + 1;
    raise notice 'Cultural Event legacy validation: % / % / % / %',
      l_issue.issue_code, l_issue.cultural_event_id,
      l_issue.cultural_event_image_id, l_issue.detail;
  end loop;
  raise notice 'Cultural Event legacy validation complete: % issue(s)', l_count;
end;
$$;

alter table public.cultural_events
  add column source_revision bigint not null default 1,
  add column thumbnail_binary_revision bigint not null default 1;

alter table public.cultural_events
  add constraint cultural_events_source_revision_positive
    check (source_revision > 0),
  add constraint cultural_events_thumbnail_revision_positive
    check (thumbnail_binary_revision > 0);

alter table public.cultural_event_images
  add column binary_revision bigint not null default 1,
  add column updated_at timestamptz not null default statement_timestamp(),
  add column updated_by uuid references auth.users (id) on delete restrict;

update public.cultural_event_images
set updated_at = created_at,
    updated_by = created_by;

alter table public.cultural_event_images
  alter column updated_by set not null,
  add constraint cultural_event_images_binary_revision_positive
    check (binary_revision > 0);

create table public.cultural_event_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  cultural_event_id uuid not null
    constraint cultural_event_translations_event_fk
    references public.cultural_events (id) on delete restrict,
  locale text not null default 'en',
  title text,
  summary text,
  description text,
  event_type text,
  date_note text,
  location_name text,
  address text,
  organizer text,
  visitor_information text,
  translation_status public.publication_status not null default 'draft',
  review_state text not null default 'pending',
  captured_source_revision bigint,
  captured_source_fingerprint text,
  captured_thumbnail_media_fingerprint text,
  translation_fingerprint text,
  contract_version text not null default 'cultural-event-v1',
  terminology_review_confirmed boolean not null default false,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  rejected_at timestamptz,
  rejected_by uuid references auth.users (id) on delete restrict,
  review_reason text,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  archived_at timestamptz,
  edit_revision bigint not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint cultural_event_translations_locale_check
    check (locale = 'en'),
  constraint cultural_event_translations_review_state_check
    check (review_state in ('pending', 'reviewed', 'rejected')),
  constraint cultural_event_translations_contract_check
    check (contract_version = 'cultural-event-v1'),
  constraint cultural_event_translations_review_metadata_check
    check (
      (review_state = 'reviewed'
        and reviewed_at is not null
        and reviewed_by is not null
        and terminology_review_confirmed)
      or (review_state <> 'reviewed'
        and reviewed_at is null
        and reviewed_by is null
        and not terminology_review_confirmed)
    ),
  constraint cultural_event_translations_review_checkpoint_check
    check (
      (review_state = 'reviewed'
        and captured_source_revision is not null
        and captured_source_fingerprint is not null
        and captured_thumbnail_media_fingerprint is not null
        and translation_fingerprint is not null)
      or (review_state <> 'reviewed'
        and captured_source_revision is null
        and captured_source_fingerprint is null
        and captured_thumbnail_media_fingerprint is null
        and translation_fingerprint is null)
    ),
  constraint cultural_event_translations_rejection_metadata_check
    check (
      (review_state = 'rejected'
        and rejected_at is not null
        and rejected_by is not null
        and pg_catalog.btrim(coalesce(review_reason, '')) <> '')
      or (review_state <> 'rejected'
        and rejected_at is null
        and rejected_by is null
        and review_reason is null)
    ),
  constraint cultural_event_translations_publication_metadata_check
    check (
      translation_status <> 'published'::public.publication_status
      or (published_at is not null and published_by is not null)
    ),
  constraint cultural_event_translations_publication_state_check
    check (
      translation_status <> 'published'::public.publication_status
      or (review_state = 'reviewed' and archived_at is null)
    ),
  constraint cultural_event_translations_rejected_state_check
    check (
      review_state <> 'rejected'
      or translation_status = 'draft'::public.publication_status
    ),
  constraint cultural_event_translations_archived_state_check
    check (
      translation_status <> 'archived'::public.publication_status
      or review_state = 'pending'
    ),
  constraint cultural_event_translations_archive_metadata_check
    check ((translation_status = 'archived'::public.publication_status) = (archived_at is not null)),
  constraint cultural_event_translations_revision_check
    check (edit_revision > 0),
  constraint cultural_event_translations_source_locale_key
    unique (cultural_event_id, locale)
);

create table public.cultural_event_image_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  cultural_event_image_id uuid not null
    constraint cultural_event_image_translations_image_fk
    references public.cultural_event_images (id) on delete restrict,
  locale text not null default 'en',
  alt_text text,
  caption text,
  translation_status public.publication_status not null default 'draft',
  review_state text not null default 'pending',
  captured_binary_revision bigint,
  captured_media_fingerprint text,
  translation_fingerprint text,
  contract_version text not null default 'cultural-event-media-v1',
  terminology_review_confirmed boolean not null default false,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  rejected_at timestamptz,
  rejected_by uuid references auth.users (id) on delete restrict,
  review_reason text,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  archived_at timestamptz,
  edit_revision bigint not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint cultural_event_image_translations_locale_check
    check (locale = 'en'),
  constraint cultural_event_image_translations_review_state_check
    check (review_state in ('pending', 'reviewed', 'rejected')),
  constraint cultural_event_image_translations_contract_check
    check (contract_version = 'cultural-event-media-v1'),
  constraint cultural_event_image_translations_review_metadata_check
    check (
      (review_state = 'reviewed'
        and reviewed_at is not null
        and reviewed_by is not null
        and terminology_review_confirmed)
      or (review_state <> 'reviewed'
        and reviewed_at is null
        and reviewed_by is null
        and not terminology_review_confirmed)
    ),
  constraint cultural_event_image_translations_review_checkpoint_check
    check (
      (review_state = 'reviewed'
        and captured_binary_revision is not null
        and captured_media_fingerprint is not null
        and translation_fingerprint is not null)
      or (review_state <> 'reviewed'
        and captured_binary_revision is null
        and captured_media_fingerprint is null
        and translation_fingerprint is null)
    ),
  constraint cultural_event_image_translations_rejection_metadata_check
    check (
      (review_state = 'rejected'
        and rejected_at is not null
        and rejected_by is not null
        and pg_catalog.btrim(coalesce(review_reason, '')) <> '')
      or (review_state <> 'rejected'
        and rejected_at is null
        and rejected_by is null
        and review_reason is null)
    ),
  constraint cultural_event_image_translations_publication_metadata_check
    check (
      translation_status <> 'published'::public.publication_status
      or (published_at is not null and published_by is not null)
    ),
  constraint cultural_event_image_translations_publication_state_check
    check (
      translation_status <> 'published'::public.publication_status
      or (review_state = 'reviewed' and archived_at is null)
    ),
  constraint cultural_event_image_translations_rejected_state_check
    check (
      review_state <> 'rejected'
      or translation_status = 'draft'::public.publication_status
    ),
  constraint cultural_event_image_translations_archived_state_check
    check (
      translation_status <> 'archived'::public.publication_status
      or review_state = 'pending'
    ),
  constraint cultural_event_image_translations_archive_metadata_check
    check ((translation_status = 'archived'::public.publication_status) = (archived_at is not null)),
  constraint cultural_event_image_translations_revision_check
    check (edit_revision > 0),
  constraint cultural_event_image_translations_source_locale_key
    unique (cultural_event_image_id, locale)
);

create table public.cultural_event_translation_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  cultural_event_translation_id uuid not null
    constraint cultural_event_translation_events_translation_fk
    references public.cultural_event_translations (id) on delete restrict,
  event_type text not null check (event_type in (
    'draft_saved', 'reviewed', 'rejected', 'published', 'republished',
    'unpublished', 'archived', 'restored', 'source_changed', 'source_blocked'
  )),
  previous_translation_status public.publication_status not null,
  new_translation_status public.publication_status not null,
  previous_review_state text not null,
  new_review_state text not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default statement_timestamp(),
  source_revision bigint not null check (source_revision > 0),
  source_fingerprint text,
  thumbnail_media_fingerprint text,
  translation_fingerprint text,
  terminology_review_confirmed boolean not null default false,
  reason text,
  constraint cultural_event_translation_events_states_check
    check (
      previous_review_state in ('pending', 'reviewed', 'rejected')
      and new_review_state in ('pending', 'reviewed', 'rejected')
    ),
  constraint cultural_event_translation_events_reason_check
    check (
      (event_type in ('rejected', 'source_blocked')
        and pg_catalog.btrim(coalesce(reason, '')) <> '')
      or (event_type not in ('rejected', 'source_blocked') and reason is null)
    )
);

create table public.cultural_event_image_translation_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  cultural_event_image_translation_id uuid not null
    constraint cultural_event_image_translation_events_translation_fk
    references public.cultural_event_image_translations (id) on delete restrict,
  event_type text not null check (event_type in (
    'draft_saved', 'reviewed', 'rejected', 'published', 'republished',
    'unpublished', 'archived', 'restored', 'media_changed'
  )),
  previous_translation_status public.publication_status not null,
  new_translation_status public.publication_status not null,
  previous_review_state text not null,
  new_review_state text not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default statement_timestamp(),
  binary_revision bigint not null check (binary_revision > 0),
  media_fingerprint text,
  translation_fingerprint text,
  terminology_review_confirmed boolean not null default false,
  reason text,
  constraint cultural_event_image_translation_events_states_check
    check (
      previous_review_state in ('pending', 'reviewed', 'rejected')
      and new_review_state in ('pending', 'reviewed', 'rejected')
    ),
  constraint cultural_event_image_translation_events_reason_check
    check (
      (event_type = 'rejected'
        and pg_catalog.btrim(coalesce(reason, '')) <> '')
      or (event_type <> 'rejected' and reason is null)
    )
);

create index cultural_event_translations_public_lookup_idx
  on public.cultural_event_translations (cultural_event_id, locale)
  where translation_status = 'published'::public.publication_status
    and review_state = 'reviewed';
create index cultural_event_translations_admin_queue_idx
  on public.cultural_event_translations (review_state, translation_status, updated_at desc);
create index cultural_event_image_translations_public_lookup_idx
  on public.cultural_event_image_translations (cultural_event_image_id, locale)
  where translation_status = 'published'::public.publication_status
    and review_state = 'reviewed';
create index cultural_event_translation_events_history_idx
  on public.cultural_event_translation_review_events
    (cultural_event_translation_id, occurred_at desc, id desc);
create index cultural_event_image_translation_events_history_idx
  on public.cultural_event_image_translation_review_events
    (cultural_event_image_translation_id, occurred_at desc, id desc);

create or replace function private.cultural_event_fingerprint_timestamp_value(
  p_value timestamptz
)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when $1 is null then 'null'
    else private.fingerprint_json_string(
      pg_catalog.to_char(
        $1 at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
      )
    )
  end;
$$;

create or replace function private.cultural_event_source_fingerprint_v1(
  p_source public.cultural_events
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('cultural-event-source-v1', array[
    'version', private.fingerprint_json_string('cultural-event-source-v1'),
    'title', private.fingerprint_json_text_value(p_source.title, true),
    'summary', private.fingerprint_json_text_value(p_source.summary, false),
    'description', private.fingerprint_json_text_value(p_source.description, true),
    'event_type', private.fingerprint_json_text_value(p_source.event_type, false),
    'start_at', private.cultural_event_fingerprint_timestamp_value(p_source.start_at),
    'end_at', private.cultural_event_fingerprint_timestamp_value(p_source.end_at),
    'all_day', case when p_source.all_day then 'true' else 'false' end,
    'date_note', private.fingerprint_json_text_value(p_source.date_note, false),
    'location_name', private.fingerprint_json_text_value(p_source.location_name, false),
    'address', private.fingerprint_json_text_value(p_source.address, false),
    'organizer', private.fingerprint_json_text_value(p_source.organizer, false),
    'visitor_information', private.fingerprint_json_text_value(p_source.visitor_information, false)
  ]);
end;
$$;

create or replace function private.cultural_event_translation_fingerprint_v1(
  p_translation public.cultural_event_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('cultural-event-translation-v1', array[
    'version', private.fingerprint_json_string('cultural-event-translation-v1'),
    'title', private.fingerprint_json_text_value(p_translation.title, true),
    'summary', private.fingerprint_json_text_value(p_translation.summary, false),
    'description', private.fingerprint_json_text_value(p_translation.description, true),
    'event_type', private.fingerprint_json_text_value(p_translation.event_type, false),
    'date_note', private.fingerprint_json_text_value(p_translation.date_note, false),
    'location_name', private.fingerprint_json_text_value(p_translation.location_name, false),
    'address', private.fingerprint_json_text_value(p_translation.address, false),
    'organizer', private.fingerprint_json_text_value(p_translation.organizer, false),
    'visitor_information', private.fingerprint_json_text_value(p_translation.visitor_information, false)
  ]);
end;
$$;

create or replace function private.cultural_event_image_translation_fingerprint_v1(
  p_translation public.cultural_event_image_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('cultural-event-media-translation-v1', array[
    'version', private.fingerprint_json_string('cultural-event-media-translation-v1'),
    'alt_text', private.fingerprint_json_text_value(p_translation.alt_text, true),
    'caption', private.fingerprint_json_text_value(p_translation.caption, false)
  ]);
end;
$$;

create or replace function private.cultural_event_image_media_fingerprint_v1(
  p_image public.cultural_event_images
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('cultural-event-media-v1', array[
    'version', private.fingerprint_json_string('cultural-event-media-v1'),
    'cultural_event_image_id', private.fingerprint_json_uuid_value(p_image.id, true),
    'storage_bucket', private.fingerprint_json_text_value(p_image.storage_bucket, true),
    'storage_path', private.fingerprint_json_text_value(p_image.storage_path, true),
    'caption', private.fingerprint_json_text_value(p_image.caption, false),
    'alt_text', private.fingerprint_json_text_value(p_image.alt_text, true),
    'binary_revision', private.fingerprint_json_bigint_value(p_image.binary_revision)
  ]);
end;
$$;

create or replace function private.cultural_event_thumbnail_media_fingerprint_v1(
  p_source public.cultural_events,
  p_primary_image public.cultural_event_images
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_primary_media_fingerprint text;
begin
  if p_primary_image.id is not null then
    l_primary_media_fingerprint :=
      private.cultural_event_image_media_fingerprint_v1(p_primary_image);
  end if;
  return private.fingerprint_sha256_v1('cultural-event-thumbnail-media-v1', array[
    'version', private.fingerprint_json_string('cultural-event-thumbnail-media-v1'),
    'cultural_event_id', private.fingerprint_json_uuid_value(p_source.id, true),
    'thumbnail_bucket', private.fingerprint_json_text_value(p_source.thumbnail_bucket, false),
    'thumbnail_path', private.fingerprint_json_text_value(p_source.thumbnail_path, false),
    'primary_image_id', private.fingerprint_json_uuid_value(p_primary_image.id, false),
    'primary_image_media_fingerprint', private.fingerprint_json_text_value(l_primary_media_fingerprint, false)
  ]);
end;
$$;

create or replace function private.cultural_event_optional_translation_matches_source(
  p_source_value text,
  p_translation_value text
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_source text := private.fingerprint_normalize_text(p_source_value);
  l_translation text := private.fingerprint_normalize_text(p_translation_value);
begin
  if l_source is null or l_source = '' then
    return l_translation is null or l_translation = '';
  end if;
  return l_translation is not null and l_translation <> '';
end;
$$;

create or replace function private.cultural_event_caption_matches_source(
  p_source_value text,
  p_translation_value text
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_source text := private.fingerprint_normalize_text(p_source_value);
  l_translation text := private.fingerprint_normalize_text(p_translation_value);
begin
  if l_source is null or l_source = '' then
    return l_translation is null or l_translation = '';
  end if;
  return l_translation is null or l_translation <> '';
end;
$$;

create or replace function private.cultural_event_translation_fingerprint_or_null(
  p_translation public.cultural_event_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.cultural_event_translation_fingerprint_v1(p_translation);
exception when others then
  return null;
end;
$$;

create or replace function private.cultural_event_image_translation_fingerprint_or_null(
  p_translation public.cultural_event_image_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.cultural_event_image_translation_fingerprint_v1(p_translation);
exception when others then
  return null;
end;
$$;

create or replace function private.enforce_cultural_event_source_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.source_revision <> 1 or new.thumbnail_binary_revision <> 1 then
      raise exception using errcode = '42501', message = 'cultural event revisions are database managed';
    end if;
    new.source_revision := 1;
    new.thumbnail_binary_revision := 1;
    return new;
  end if;

  if new.source_revision is distinct from old.source_revision
    or new.thumbnail_binary_revision is distinct from old.thumbnail_binary_revision then
    raise exception using errcode = '42501', message = 'cultural event revisions are database managed';
  end if;
  if old.source_revision = 9223372036854775807
    or (old.thumbnail_binary_revision = 9223372036854775807
      and (new.thumbnail_bucket is distinct from old.thumbnail_bucket
        or new.thumbnail_path is distinct from old.thumbnail_path)) then
    raise exception using errcode = '22003', message = 'cultural event revision overflow';
  end if;
  new.source_revision := old.source_revision + 1;
  if new.thumbnail_bucket is distinct from old.thumbnail_bucket
    or new.thumbnail_path is distinct from old.thumbnail_path then
    new.thumbnail_binary_revision := old.thumbnail_binary_revision + 1;
  else
    new.thumbnail_binary_revision := old.thumbnail_binary_revision;
  end if;
  return new;
end;
$$;

create or replace function private.enforce_cultural_event_image_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
begin
  if l_actor is null then
    raise exception using errcode = '42501', message = 'cultural event image actor is required';
  end if;
  if tg_op = 'INSERT' then
    new.binary_revision := 1;
    new.updated_at := pg_catalog.statement_timestamp();
    new.updated_by := l_actor;
    return new;
  end if;
  if new.id is distinct from old.id
    or new.cultural_event_id is distinct from old.cultural_event_id
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
    or new.binary_revision is distinct from old.binary_revision then
    raise exception using errcode = '42501', message = 'cultural event image revision is database managed';
  end if;
  if old.binary_revision = 9223372036854775807
    and (new.storage_bucket is distinct from old.storage_bucket
      or new.storage_path is distinct from old.storage_path
      or new.caption is distinct from old.caption
      or new.alt_text is distinct from old.alt_text) then
    raise exception using errcode = '22003', message = 'cultural event image revision overflow';
  end if;
  if new.storage_bucket is distinct from old.storage_bucket
    or new.storage_path is distinct from old.storage_path
    or new.caption is distinct from old.caption
    or new.alt_text is distinct from old.alt_text then
    new.binary_revision := old.binary_revision + 1;
  else
    new.binary_revision := old.binary_revision;
  end if;
  new.updated_at := pg_catalog.statement_timestamp();
  new.updated_by := l_actor;
  return new;
end;
$$;

create trigger cultural_events_source_revision_trigger
before insert or update on public.cultural_events
for each row execute function private.enforce_cultural_event_source_revision();

create trigger cultural_event_images_revision_trigger
before insert or update on public.cultural_event_images
for each row execute function private.enforce_cultural_event_image_revision();

create or replace function private.enforce_cultural_event_translation_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
begin
  if pg_catalog.current_setting('cultural_event.workflow', true) <> 'on' then
    raise exception using errcode = '42501', message = 'cultural event translations are writable only through workflow functions';
  end if;
  if l_actor is null or new.updated_by is distinct from l_actor then
    raise exception using errcode = '42501', message = 'cultural event translation actor is required';
  end if;
  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'cultural event translations cannot be deleted';
  end if;
  if tg_op = 'INSERT' then
    if new.created_by is distinct from l_actor
      or new.edit_revision <> 1
      or new.translation_status <> 'draft'::public.publication_status
      or new.review_state <> 'pending' then
      raise exception using errcode = '42501', message = 'invalid cultural event translation creation state';
    end if;
  else
    if new.id is distinct from old.id
      or new.locale is distinct from old.locale
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
      or new.edit_revision <= old.edit_revision then
      raise exception using errcode = '42501', message = 'invalid cultural event translation revision';
    end if;
    if tg_table_name = 'cultural_event_translations'
      and (pg_catalog.to_jsonb(new)->>'cultural_event_id') is distinct from (pg_catalog.to_jsonb(old)->>'cultural_event_id') then
      raise exception using errcode = '42501', message = 'invalid cultural event translation source';
    elsif tg_table_name = 'cultural_event_image_translations'
      and (pg_catalog.to_jsonb(new)->>'cultural_event_image_id') is distinct from (pg_catalog.to_jsonb(old)->>'cultural_event_image_id') then
      raise exception using errcode = '42501', message = 'invalid cultural event image translation source';
    end if;
  end if;
  new.updated_at := pg_catalog.statement_timestamp();
  return new;
end;
$$;

create or replace function private.reject_cultural_event_translation_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op <> 'INSERT'
    or pg_catalog.current_setting('cultural_event.workflow', true) <> 'on' then
    raise exception using errcode = '42501', message = 'cultural event review history is append-only';
  end if;
  return new;
end;
$$;

create trigger cultural_event_translations_write_guard_trigger
before insert or update or delete on public.cultural_event_translations
for each row execute function private.enforce_cultural_event_translation_write();

create trigger cultural_event_image_translations_write_guard_trigger
before insert or update or delete on public.cultural_event_image_translations
for each row execute function private.enforce_cultural_event_translation_write();

create trigger cultural_event_translation_events_append_only_trigger
before insert or update or delete on public.cultural_event_translation_review_events
for each row execute function private.reject_cultural_event_translation_event_mutation();

create trigger cultural_event_image_translation_events_append_only_trigger
before insert or update or delete on public.cultural_event_image_translation_review_events
for each row execute function private.reject_cultural_event_translation_event_mutation();

create or replace function private.cultural_event_current_primary_image(
  p_source public.cultural_events
)
returns public.cultural_event_images
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_primary_count bigint;
  l_image public.cultural_event_images;
begin
  select count(*) into l_primary_count
  from public.cultural_event_images as image
  where image.cultural_event_id = p_source.id
    and image.is_primary;
  if l_primary_count <> 1 then
    return null;
  end if;
  select image.* into l_image
  from public.cultural_event_images as image
  where image.cultural_event_id = p_source.id
    and image.is_primary;
  if p_source.thumbnail_bucket is null
    or p_source.thumbnail_path is null
    or l_image.storage_bucket is distinct from p_source.thumbnail_bucket
    or l_image.storage_path is distinct from p_source.thumbnail_path then
    return null;
  end if;
  return l_image;
end;
$$;

create or replace function private.cultural_event_source_is_eligible(
  p_source public.cultural_events
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_primary public.cultural_event_images;
begin
  if p_source.status <> 'published'::public.publication_status
    or p_source.start_at is null
    or pg_catalog.btrim(coalesce(p_source.title, '')) = ''
    or pg_catalog.btrim(coalesce(p_source.description, '')) = ''
    or (p_source.contact_phone is not null and not p_source.contact_consent_confirmed)
    or p_source.thumbnail_bucket is null
    or p_source.thumbnail_path is null
    or p_source.thumbnail_bucket <> 'tourism-media'
    or p_source.thumbnail_path !~ ('^cultural-event/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$') then
    return false;
  end if;
  l_primary := private.cultural_event_current_primary_image(p_source);
  if l_primary.id is null or pg_catalog.btrim(coalesce(l_primary.alt_text, '')) = '' then
    return false;
  end if;
  begin
    perform storage.objects.id
    from storage.objects
    where storage.objects.bucket_id = l_primary.storage_bucket
      and storage.objects.name = l_primary.storage_path;
  exception when others then
    return false;
  end;
  return found;
end;
$$;

create or replace function private.cultural_event_translation_content_is_complete(
  p_source public.cultural_events,
  p_translation public.cultural_event_translations
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if p_translation.cultural_event_id <> p_source.id
    or p_translation.locale <> 'en'
    or pg_catalog.btrim(coalesce(p_translation.title, '')) = ''
    or pg_catalog.btrim(coalesce(p_translation.description, '')) = '' then
    return false;
  end if;
  return private.cultural_event_optional_translation_matches_source(p_source.summary, p_translation.summary)
    and private.cultural_event_optional_translation_matches_source(p_source.event_type, p_translation.event_type)
    and private.cultural_event_optional_translation_matches_source(p_source.date_note, p_translation.date_note)
    and private.cultural_event_optional_translation_matches_source(p_source.location_name, p_translation.location_name)
    and private.cultural_event_optional_translation_matches_source(p_source.address, p_translation.address)
    and private.cultural_event_optional_translation_matches_source(p_source.organizer, p_translation.organizer)
    and private.cultural_event_optional_translation_matches_source(p_source.visitor_information, p_translation.visitor_information);
end;
$$;

create or replace function private.cultural_event_image_translation_content_is_complete(
  p_image public.cultural_event_images,
  p_translation public.cultural_event_image_translations
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if p_translation.cultural_event_image_id <> p_image.id
    or p_translation.locale <> 'en'
    or pg_catalog.btrim(coalesce(p_image.alt_text, '')) = ''
    or pg_catalog.btrim(coalesce(p_translation.alt_text, '')) = ''
    or not private.cultural_event_caption_matches_source(p_image.caption, p_translation.caption) then
    return false;
  end if;
  return true;
end;
$$;

create or replace function private.cultural_event_image_translation_is_eligible(
  p_source public.cultural_events,
  p_image public.cultural_event_images,
  p_translation public.cultural_event_image_translations
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if p_image.cultural_event_id <> p_source.id
    or p_source.status <> 'published'::public.publication_status
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or p_translation.archived_at is not null
    or not private.cultural_event_image_translation_content_is_complete(p_image, p_translation)
    or p_image.storage_bucket <> 'tourism-media'
    or p_image.storage_path !~ ('^cultural-event/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$') then
    return false;
  end if;
  begin
    perform storage.objects.id
    from storage.objects
    where storage.objects.bucket_id = p_image.storage_bucket
      and storage.objects.name = p_image.storage_path;
  exception when others then
    return false;
  end;
  if not found then
    return false;
  end if;
  l_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(p_image);
  l_translation_fingerprint := private.cultural_event_image_translation_fingerprint_v1(p_translation);
  return p_translation.captured_binary_revision = p_image.binary_revision
    and p_translation.captured_media_fingerprint = l_media_fingerprint
    and p_translation.translation_fingerprint = l_translation_fingerprint;
end;
$$;

create or replace function private.cultural_event_translation_is_eligible(
  p_source public.cultural_events,
  p_translation public.cultural_event_translations
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_primary public.cultural_event_images;
  l_primary_translation public.cultural_event_image_translations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if p_translation.cultural_event_id <> p_source.id
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or p_translation.archived_at is not null
    or not private.cultural_event_source_is_eligible(p_source)
    or not private.cultural_event_translation_content_is_complete(p_source, p_translation) then
    return false;
  end if;
  l_primary := private.cultural_event_current_primary_image(p_source);
  if l_primary.id is null then
    return false;
  end if;
  select translation.* into l_primary_translation
  from public.cultural_event_image_translations as translation
  where translation.cultural_event_image_id = l_primary.id
    and translation.locale = 'en';
  if l_primary_translation.id is null
    or not private.cultural_event_image_translation_is_eligible(p_source, l_primary, l_primary_translation) then
    return false;
  end if;
  l_source_fingerprint := private.cultural_event_source_fingerprint_v1(p_source);
  l_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(p_source, l_primary);
  l_translation_fingerprint := private.cultural_event_translation_fingerprint_v1(p_translation);
  return p_translation.captured_source_fingerprint = l_source_fingerprint
    and p_translation.captured_thumbnail_media_fingerprint = l_thumbnail_fingerprint
    and p_translation.translation_fingerprint = l_translation_fingerprint;
end;
$$;

create or replace function private.record_cultural_event_translation_event(
  p_old public.cultural_event_translations,
  p_new public.cultural_event_translations,
  p_event_type text,
  p_actor uuid,
  p_source_revision bigint,
  p_source_fingerprint text,
  p_thumbnail_media_fingerprint text,
  p_translation_fingerprint text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  insert into public.cultural_event_translation_review_events (
    cultural_event_translation_id,
    event_type,
    previous_translation_status,
    new_translation_status,
    previous_review_state,
    new_review_state,
    actor_id,
    source_revision,
    source_fingerprint,
    thumbnail_media_fingerprint,
    translation_fingerprint,
    terminology_review_confirmed,
    reason
  ) values (
    coalesce(p_old.id, p_new.id),
    p_event_type,
    coalesce(p_old.translation_status, 'draft'::public.publication_status),
    p_new.translation_status,
    coalesce(p_old.review_state, 'pending'),
    p_new.review_state,
    p_actor,
    p_source_revision,
    p_source_fingerprint,
    p_thumbnail_media_fingerprint,
    p_translation_fingerprint,
    p_new.terminology_review_confirmed,
    p_reason
  );
end;
$$;

create or replace function private.record_cultural_event_image_translation_event(
  p_old public.cultural_event_image_translations,
  p_new public.cultural_event_image_translations,
  p_event_type text,
  p_actor uuid,
  p_binary_revision bigint,
  p_media_fingerprint text,
  p_translation_fingerprint text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  insert into public.cultural_event_image_translation_review_events (
    cultural_event_image_translation_id,
    event_type,
    previous_translation_status,
    new_translation_status,
    previous_review_state,
    new_review_state,
    actor_id,
    binary_revision,
    media_fingerprint,
    translation_fingerprint,
    terminology_review_confirmed,
    reason
  ) values (
    coalesce(p_old.id, p_new.id),
    p_event_type,
    coalesce(p_old.translation_status, 'draft'::public.publication_status),
    p_new.translation_status,
    coalesce(p_old.review_state, 'pending'),
    p_new.review_state,
    p_actor,
    p_binary_revision,
    p_media_fingerprint,
    p_translation_fingerprint,
    p_new.terminology_review_confirmed,
    p_reason
  );
end;
$$;

create or replace function private.cultural_event_mark_parent_thumbnail_stale(
  p_cultural_event_id uuid,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_source public.cultural_events;
  l_primary public.cultural_event_images;
  l_translation public.cultural_event_translations;
  l_new_translation public.cultural_event_translations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  select event.* into l_source
  from public.cultural_events as event
  where event.id = p_cultural_event_id;
  if l_source.id is null then
    return;
  end if;
  l_primary := private.cultural_event_current_primary_image(l_source);
  l_source_fingerprint := private.cultural_event_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(l_source, l_primary);
  for l_translation in
    select translation.*
    from public.cultural_event_translations as translation
    where translation.cultural_event_id = l_source.id
      and translation.locale = 'en'
    order by translation.id
    for update
  loop
    if l_translation.translation_status = 'archived'::public.publication_status then
      continue;
    end if;
    l_new_translation := l_translation;
    if l_translation.translation_status <> 'published'::public.publication_status
      and l_translation.review_state <> 'pending' then
      if l_translation.edit_revision = 9223372036854775807 then
        raise exception using errcode = '22003', message = 'cultural event translation revision overflow';
      end if;
      l_new_translation.translation_status := 'draft'::public.publication_status;
      l_new_translation.review_state := 'pending';
      l_new_translation.captured_source_revision := null;
      l_new_translation.captured_source_fingerprint := null;
      l_new_translation.captured_thumbnail_media_fingerprint := null;
      l_new_translation.translation_fingerprint := null;
      l_new_translation.reviewed_at := null;
      l_new_translation.reviewed_by := null;
      l_new_translation.terminology_review_confirmed := false;
      l_new_translation.rejected_at := null;
      l_new_translation.rejected_by := null;
      l_new_translation.review_reason := null;
      l_new_translation.edit_revision := l_translation.edit_revision + 1;
      l_new_translation.updated_by := p_actor;
      perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
      update public.cultural_event_translations
      set translation_status = l_new_translation.translation_status,
          review_state = l_new_translation.review_state,
          captured_source_revision = l_new_translation.captured_source_revision,
          captured_source_fingerprint = l_new_translation.captured_source_fingerprint,
          captured_thumbnail_media_fingerprint = l_new_translation.captured_thumbnail_media_fingerprint,
          translation_fingerprint = l_new_translation.translation_fingerprint,
          reviewed_at = l_new_translation.reviewed_at,
          reviewed_by = l_new_translation.reviewed_by,
          terminology_review_confirmed = l_new_translation.terminology_review_confirmed,
          rejected_at = l_new_translation.rejected_at,
          rejected_by = l_new_translation.rejected_by,
          review_reason = l_new_translation.review_reason,
          edit_revision = l_new_translation.edit_revision,
          updated_by = l_new_translation.updated_by
      where id = l_translation.id
      returning * into l_new_translation;
    end if;
    l_translation_fingerprint := private.cultural_event_translation_fingerprint_or_null(l_translation);
    perform private.record_cultural_event_translation_event(
      l_translation,
      l_new_translation,
      'source_changed',
      p_actor,
      l_source.source_revision,
      l_source_fingerprint,
      l_thumbnail_fingerprint,
      l_translation_fingerprint
    );
  end loop;
end;
$$;

create or replace function private.cultural_event_source_cascade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old_primary public.cultural_event_images;
  l_new_primary public.cultural_event_images;
  l_old_translation public.cultural_event_translations;
  l_new_translation public.cultural_event_translations;
  l_old_source_fingerprint text;
  l_new_source_fingerprint text;
  l_old_thumbnail_fingerprint text;
  l_new_thumbnail_fingerprint text;
  l_source_changed boolean;
  l_source_blocked boolean;
begin
  if l_actor is null then
    raise exception using errcode = '42501', message = 'cultural event source actor is required';
  end if;
  l_old_primary := private.cultural_event_current_primary_image(old);
  l_new_primary := private.cultural_event_current_primary_image(new);
  l_old_source_fingerprint := private.cultural_event_source_fingerprint_v1(old);
  l_new_source_fingerprint := private.cultural_event_source_fingerprint_v1(new);
  l_old_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(old, l_old_primary);
  l_new_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(new, l_new_primary);
  l_source_changed := l_old_source_fingerprint is distinct from l_new_source_fingerprint
    or l_old_thumbnail_fingerprint is distinct from l_new_thumbnail_fingerprint;
  l_source_blocked := new.status = 'archived'::public.publication_status
    or (old.status = 'published'::public.publication_status
      and new.status <> 'published'::public.publication_status);

  if not l_source_changed and not l_source_blocked then
    return new;
  end if;

  for l_old_translation in
    select translation.*
    from public.cultural_event_translations as translation
    where translation.cultural_event_id = new.id
      and translation.locale = 'en'
    order by translation.id
    for update
  loop
    l_new_translation := l_old_translation;
    if l_source_blocked then
      if l_old_translation.translation_status <> 'archived'::public.publication_status then
        if l_old_translation.edit_revision = 9223372036854775807 then
          raise exception using errcode = '22003', message = 'cultural event translation revision overflow';
        end if;
        l_new_translation.translation_status := 'draft'::public.publication_status;
        l_new_translation.review_state := 'pending';
        l_new_translation.captured_source_revision := null;
        l_new_translation.captured_source_fingerprint := null;
        l_new_translation.captured_thumbnail_media_fingerprint := null;
        l_new_translation.translation_fingerprint := null;
        l_new_translation.reviewed_at := null;
        l_new_translation.reviewed_by := null;
        l_new_translation.terminology_review_confirmed := false;
        l_new_translation.rejected_at := null;
        l_new_translation.rejected_by := null;
        l_new_translation.review_reason := null;
        l_new_translation.edit_revision := l_old_translation.edit_revision + 1;
        l_new_translation.updated_by := l_actor;
        perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
        update public.cultural_event_translations
        set translation_status = l_new_translation.translation_status,
            review_state = l_new_translation.review_state,
            captured_source_revision = l_new_translation.captured_source_revision,
            captured_source_fingerprint = l_new_translation.captured_source_fingerprint,
            captured_thumbnail_media_fingerprint = l_new_translation.captured_thumbnail_media_fingerprint,
            translation_fingerprint = l_new_translation.translation_fingerprint,
            reviewed_at = l_new_translation.reviewed_at,
            reviewed_by = l_new_translation.reviewed_by,
            terminology_review_confirmed = l_new_translation.terminology_review_confirmed,
            rejected_at = l_new_translation.rejected_at,
            rejected_by = l_new_translation.rejected_by,
            review_reason = l_new_translation.review_reason,
            edit_revision = l_new_translation.edit_revision,
            updated_by = l_new_translation.updated_by
        where id = l_old_translation.id
        returning * into l_new_translation;
      end if;
      perform private.record_cultural_event_translation_event(
        l_old_translation,
        l_new_translation,
        'source_blocked',
        l_actor,
        new.source_revision,
        l_new_source_fingerprint,
        l_new_thumbnail_fingerprint,
        null,
        'source lifecycle is not publicly eligible'
      );
    elsif l_source_changed then
      if l_old_translation.translation_status <> 'published'::public.publication_status
        and l_old_translation.translation_status <> 'archived'::public.publication_status
        and (l_old_translation.review_state <> 'pending'
          or l_old_translation.captured_source_revision is not null) then
        if l_old_translation.edit_revision = 9223372036854775807 then
          raise exception using errcode = '22003', message = 'cultural event translation revision overflow';
        end if;
        l_new_translation.translation_status := 'draft'::public.publication_status;
        l_new_translation.review_state := 'pending';
        l_new_translation.captured_source_revision := null;
        l_new_translation.captured_source_fingerprint := null;
        l_new_translation.captured_thumbnail_media_fingerprint := null;
        l_new_translation.translation_fingerprint := null;
        l_new_translation.reviewed_at := null;
        l_new_translation.reviewed_by := null;
        l_new_translation.terminology_review_confirmed := false;
        l_new_translation.rejected_at := null;
        l_new_translation.rejected_by := null;
        l_new_translation.review_reason := null;
        l_new_translation.edit_revision := l_old_translation.edit_revision + 1;
        l_new_translation.updated_by := l_actor;
        perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
        update public.cultural_event_translations
        set translation_status = l_new_translation.translation_status,
            review_state = l_new_translation.review_state,
            captured_source_revision = l_new_translation.captured_source_revision,
            captured_source_fingerprint = l_new_translation.captured_source_fingerprint,
            captured_thumbnail_media_fingerprint = l_new_translation.captured_thumbnail_media_fingerprint,
            translation_fingerprint = l_new_translation.translation_fingerprint,
            reviewed_at = l_new_translation.reviewed_at,
            reviewed_by = l_new_translation.reviewed_by,
            terminology_review_confirmed = l_new_translation.terminology_review_confirmed,
            rejected_at = l_new_translation.rejected_at,
            rejected_by = l_new_translation.rejected_by,
            review_reason = l_new_translation.review_reason,
            edit_revision = l_new_translation.edit_revision,
            updated_by = l_new_translation.updated_by
        where id = l_old_translation.id
        returning * into l_new_translation;
      end if;
      perform private.record_cultural_event_translation_event(
        l_old_translation,
        l_new_translation,
        'source_changed',
        l_actor,
        new.source_revision,
        l_new_source_fingerprint,
        l_new_thumbnail_fingerprint,
        null
      );
    end if;
  end loop;
  return new;
end;
$$;

create or replace function private.cultural_event_image_media_cascade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_source public.cultural_events;
  l_old_media_fingerprint text;
  l_new_media_fingerprint text;
  l_old_translation public.cultural_event_image_translations;
  l_new_translation public.cultural_event_image_translations;
  l_parent_thumbnail_affected boolean;
begin
  if l_actor is null then
    raise exception using errcode = '42501', message = 'cultural event image actor is required';
  end if;
  l_old_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(old);
  l_new_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(new);
  if l_old_media_fingerprint is not distinct from l_new_media_fingerprint then
    return new;
  end if;
  select event.* into l_source
  from public.cultural_events as event
  where event.id = new.cultural_event_id;
  if l_source.id is null then
    return new;
  end if;
  for l_old_translation in
    select translation.*
    from public.cultural_event_image_translations as translation
    where translation.cultural_event_image_id = new.id
      and translation.locale = 'en'
    order by translation.id
    for update
  loop
    l_new_translation := l_old_translation;
    if l_old_translation.translation_status <> 'published'::public.publication_status
      and l_old_translation.translation_status <> 'archived'::public.publication_status
      and (l_old_translation.review_state <> 'pending'
        or l_old_translation.captured_binary_revision is not null) then
      if l_old_translation.edit_revision = 9223372036854775807 then
        raise exception using errcode = '22003', message = 'cultural event image translation revision overflow';
      end if;
      l_new_translation.translation_status := 'draft'::public.publication_status;
      l_new_translation.review_state := 'pending';
      l_new_translation.captured_binary_revision := null;
      l_new_translation.captured_media_fingerprint := null;
      l_new_translation.translation_fingerprint := null;
      l_new_translation.reviewed_at := null;
      l_new_translation.reviewed_by := null;
      l_new_translation.terminology_review_confirmed := false;
      l_new_translation.rejected_at := null;
      l_new_translation.rejected_by := null;
      l_new_translation.review_reason := null;
      l_new_translation.edit_revision := l_old_translation.edit_revision + 1;
      l_new_translation.updated_by := l_actor;
      perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
      update public.cultural_event_image_translations
      set translation_status = l_new_translation.translation_status,
          review_state = l_new_translation.review_state,
          captured_binary_revision = l_new_translation.captured_binary_revision,
          captured_media_fingerprint = l_new_translation.captured_media_fingerprint,
          translation_fingerprint = l_new_translation.translation_fingerprint,
          reviewed_at = l_new_translation.reviewed_at,
          reviewed_by = l_new_translation.reviewed_by,
          terminology_review_confirmed = l_new_translation.terminology_review_confirmed,
          rejected_at = l_new_translation.rejected_at,
          rejected_by = l_new_translation.rejected_by,
          review_reason = l_new_translation.review_reason,
          edit_revision = l_new_translation.edit_revision,
          updated_by = l_new_translation.updated_by
      where id = l_old_translation.id
      returning * into l_new_translation;
    end if;
    perform private.record_cultural_event_image_translation_event(
      l_old_translation,
      l_new_translation,
      'media_changed',
      l_actor,
      new.binary_revision,
      l_new_media_fingerprint,
      null
    );
  end loop;
  l_parent_thumbnail_affected := old.is_primary or new.is_primary
    or (l_source.thumbnail_bucket is not distinct from old.storage_bucket
      and l_source.thumbnail_path is not distinct from old.storage_path)
    or (l_source.thumbnail_bucket is not distinct from new.storage_bucket
      and l_source.thumbnail_path is not distinct from new.storage_path);
  if l_parent_thumbnail_affected then
    perform private.cultural_event_mark_parent_thumbnail_stale(l_source.id, l_actor);
  end if;
  return new;
end;
$$;

create trigger cultural_events_translation_source_cascade_trigger
after update on public.cultural_events
for each row execute function private.cultural_event_source_cascade();

create trigger cultural_event_images_translation_media_cascade_trigger
after update on public.cultural_event_images
for each row execute function private.cultural_event_image_media_cascade();

create or replace function private.cultural_event_translation_admin_derived_state(
  p_source public.cultural_events,
  p_translation public.cultural_event_translations
)
returns table (
  lifecycle_state text,
  source_blocked boolean,
  source_blocked_reason text,
  stale_source_fingerprint boolean,
  stale_thumbnail_media_fingerprint boolean,
  stale_translation_fingerprint boolean,
  public_eligibility boolean,
  review_eligibility boolean,
  publication_eligibility boolean,
  eligibility_reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
  l_source_eligible boolean;
  l_content_complete boolean;
  l_stale_source boolean := false;
  l_stale_thumbnail boolean := false;
  l_stale_translation boolean := false;
  l_public boolean := false;
  l_review boolean := false;
  l_publication boolean := false;
  l_reason text := 'not eligible';
begin
  begin
    l_source_fingerprint := private.cultural_event_source_fingerprint_v1(p_source);
    l_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(
      p_source, private.cultural_event_current_primary_image(p_source)
    );
    l_translation_fingerprint := private.cultural_event_translation_fingerprint_v1(p_translation);
  exception when others then
    l_source_fingerprint := null;
    l_thumbnail_fingerprint := null;
    l_translation_fingerprint := null;
  end;
  l_source_eligible := private.cultural_event_source_is_eligible(p_source);
  l_content_complete := private.cultural_event_translation_content_is_complete(p_source, p_translation);
  l_stale_source := p_translation.review_state = 'reviewed'
    and (p_translation.captured_source_fingerprint is distinct from l_source_fingerprint);
  l_stale_thumbnail := p_translation.review_state = 'reviewed'
    and (p_translation.captured_thumbnail_media_fingerprint is distinct from l_thumbnail_fingerprint);
  l_stale_translation := p_translation.review_state = 'reviewed'
    and (p_translation.translation_fingerprint is distinct from l_translation_fingerprint);
  l_review := p_source.status = 'published'::public.publication_status
    and l_source_eligible
    and p_translation.translation_status = 'draft'::public.publication_status
    and p_translation.review_state = 'pending'
    and p_translation.terminology_review_confirmed = false
    and l_content_complete;
  l_publication := p_source.status = 'published'::public.publication_status
    and l_source_eligible
    and p_translation.translation_status in ('draft'::public.publication_status, 'published'::public.publication_status)
    and p_translation.review_state = 'reviewed'
    and p_translation.terminology_review_confirmed
    and l_content_complete
    and not l_stale_source
    and not l_stale_thumbnail
    and not l_stale_translation;
  l_public := private.cultural_event_translation_is_eligible(p_source, p_translation);
  if p_source.status <> 'published'::public.publication_status then
    l_reason := 'source is not published';
  elsif not l_source_eligible then
    l_reason := 'source eligibility failed';
  elsif not l_content_complete then
    l_reason := 'English content is incomplete';
  elsif l_stale_source or l_stale_thumbnail or l_stale_translation then
    l_reason := 'fresh review is required';
  elsif not p_translation.terminology_review_confirmed then
    l_reason := 'terminology review confirmation is required';
  elsif not l_public then
    l_reason := 'primary image translation is not eligible';
  else
    l_reason := 'eligible';
  end if;
  return query select
    case
      when p_translation.translation_status = 'archived'::public.publication_status then 'archived'
      when p_translation.translation_status = 'published'::public.publication_status and (l_stale_source or l_stale_thumbnail or l_stale_translation) then 'stale'
      when p_translation.review_state = 'rejected' then 'rejected'
      when p_translation.review_state = 'reviewed' then 'reviewed'
      else 'draft'
    end,
    p_source.status <> 'published'::public.publication_status,
    case when p_source.status <> 'published'::public.publication_status then 'source is not publicly published' else null end,
    l_stale_source,
    l_stale_thumbnail,
    l_stale_translation,
    l_public,
    l_review,
    l_publication,
    l_reason;
end;
$$;

create or replace function private.cultural_event_image_translation_admin_derived_state(
  p_source public.cultural_events,
  p_image public.cultural_event_images,
  p_translation public.cultural_event_image_translations
)
returns table (
  lifecycle_state text,
  source_blocked boolean,
  source_blocked_reason text,
  stale_media_fingerprint boolean,
  stale_translation_fingerprint boolean,
  public_eligibility boolean,
  review_eligibility boolean,
  publication_eligibility boolean,
  eligibility_reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_media_fingerprint text;
  l_translation_fingerprint text;
  l_source_valid boolean;
  l_content_complete boolean;
  l_stale_media boolean := false;
  l_stale_translation boolean := false;
  l_public boolean := false;
  l_review boolean := false;
  l_publication boolean := false;
  l_reason text := 'not eligible';
begin
  begin
    l_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(p_image);
    l_translation_fingerprint := private.cultural_event_image_translation_fingerprint_v1(p_translation);
  exception when others then
    l_media_fingerprint := null;
    l_translation_fingerprint := null;
  end;
  l_source_valid := p_source.status = 'published'::public.publication_status
    and p_image.cultural_event_id = p_source.id;
  l_content_complete := private.cultural_event_image_translation_content_is_complete(p_image, p_translation);
  l_stale_media := p_translation.review_state = 'reviewed'
    and (p_translation.captured_media_fingerprint is distinct from l_media_fingerprint);
  l_stale_translation := p_translation.review_state = 'reviewed'
    and (p_translation.translation_fingerprint is distinct from l_translation_fingerprint);
  l_review := l_source_valid
    and p_translation.translation_status = 'draft'::public.publication_status
    and p_translation.review_state = 'pending'
    and p_translation.terminology_review_confirmed = false
    and l_content_complete;
  l_publication := l_source_valid
    and p_translation.translation_status in ('draft'::public.publication_status, 'published'::public.publication_status)
    and p_translation.review_state = 'reviewed'
    and p_translation.terminology_review_confirmed
    and l_content_complete
    and not l_stale_media
    and not l_stale_translation;
  l_public := private.cultural_event_image_translation_is_eligible(p_source, p_image, p_translation);
  if not l_source_valid then
    l_reason := 'source is not publicly published';
  elsif not l_content_complete then
    l_reason := 'English image content is incomplete';
  elsif l_stale_media or l_stale_translation then
    l_reason := 'fresh image review is required';
  elsif not l_public then
    l_reason := 'image is not eligible';
  else
    l_reason := 'eligible';
  end if;
  return query select
    case
      when p_translation.translation_status = 'archived'::public.publication_status then 'archived'
      when p_translation.translation_status = 'published'::public.publication_status and (l_stale_media or l_stale_translation) then 'stale'
      when p_translation.review_state = 'rejected' then 'rejected'
      when p_translation.review_state = 'reviewed' then 'reviewed'
      else 'draft'
    end,
    not l_source_valid,
    case when not l_source_valid then 'source is not publicly published' else null end,
    l_stale_media,
    l_stale_translation,
    l_public,
    l_review,
    l_publication,
    l_reason;
end;
$$;

create or replace function private.lock_cultural_event_translation(
  p_translation_id uuid
)
returns public.cultural_event_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_translation public.cultural_event_translations;
  l_image_id uuid;
begin
  select translation.* into l_translation
  from public.cultural_event_translations as translation
  where translation.id = p_translation_id
  ;
  if l_translation.id is null then
    raise exception using errcode = 'P0002', message = 'cultural event translation not found';
  end if;
  perform event.id
  from public.cultural_events as event
  where event.id = l_translation.cultural_event_id
  for update;
  for l_image_id in
    select image.id
    from public.cultural_event_images as image
    where image.cultural_event_id = l_translation.cultural_event_id
    order by image.id
    for update
  loop
    null;
  end loop;
  select translation.* into l_translation
  from public.cultural_event_translations as translation
  where translation.id = p_translation_id
  for update;
  return l_translation;
end;
$$;

create or replace function private.lock_cultural_event_image_translation(
  p_translation_id uuid
)
returns public.cultural_event_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_translation public.cultural_event_image_translations;
  l_image public.cultural_event_images;
  l_image_id uuid;
begin
  select translation.* into l_translation
  from public.cultural_event_image_translations as translation
  where translation.id = p_translation_id
  ;
  if l_translation.id is null then
    raise exception using errcode = 'P0002', message = 'cultural event image translation not found';
  end if;
  select image.* into l_image
  from public.cultural_event_images as image
  where image.id = l_translation.cultural_event_image_id;
  if l_image.id is null then
    raise exception using errcode = 'P0002', message = 'cultural event image not found';
  end if;
  perform event.id
  from public.cultural_events as event
  where event.id = l_image.cultural_event_id
  for update;
  for l_image_id in
    select image.id
    from public.cultural_event_images as image
    where image.cultural_event_id = l_image.cultural_event_id
    order by image.id
    for update
  loop
    null;
  end loop;
  select translation.* into l_translation
  from public.cultural_event_image_translations as translation
  where translation.id = p_translation_id
  for update;
  return l_translation;
end;
$$;

create or replace function private.lock_cultural_event_image(
  p_image_id uuid
)
returns public.cultural_event_images
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_image public.cultural_event_images;
  l_image_id uuid;
begin
  select image.* into l_image
  from public.cultural_event_images as image
  where image.id = p_image_id;
  if l_image.id is null then
    raise exception using errcode = 'P0002', message = 'cultural event image not found';
  end if;
  perform event.id
  from public.cultural_events as event
  where event.id = l_image.cultural_event_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'cultural event source not found';
  end if;
  for l_image_id in
    select image.id
    from public.cultural_event_images as image
    where image.cultural_event_id = l_image.cultural_event_id
    order by image.id
    for update
  loop
    null;
  end loop;
  select image.* into l_image
  from public.cultural_event_images as image
  where image.id = p_image_id
  for update;
  return l_image;
end;
$$;

create or replace function public.cultural_event_translation_admin_read(
  p_cultural_event_id uuid
)
returns table (
  id uuid,
  cultural_event_id uuid,
  locale text,
  title text,
  summary text,
  description text,
  event_type text,
  date_note text,
  location_name text,
  address text,
  organizer text,
  visitor_information text,
  translation_status public.publication_status,
  review_state text,
  captured_source_revision bigint,
  captured_source_fingerprint text,
  captured_thumbnail_media_fingerprint text,
  translation_fingerprint text,
  contract_version text,
  terminology_review_confirmed boolean,
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  review_reason text,
  published_at timestamptz,
  published_by uuid,
  archived_at timestamptz,
  edit_revision bigint,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  updated_by uuid,
  source_slug text,
  source_revision bigint,
  source_updated_at timestamptz,
  source_status public.publication_status,
  lifecycle_state text,
  source_blocked boolean,
  source_blocked_reason text,
  stale_source_fingerprint boolean,
  stale_thumbnail_media_fingerprint boolean,
  stale_translation_fingerprint boolean,
  public_eligibility boolean,
  review_eligibility boolean,
  publication_eligibility boolean,
  eligibility_reason text
)
language sql
security definer
set search_path = ''
as $$
  select
    translation.id,
    translation.cultural_event_id,
    translation.locale,
    translation.title,
    translation.summary,
    translation.description,
    translation.event_type,
    translation.date_note,
    translation.location_name,
    translation.address,
    translation.organizer,
    translation.visitor_information,
    translation.translation_status,
    translation.review_state,
    translation.captured_source_revision,
    translation.captured_source_fingerprint,
    translation.captured_thumbnail_media_fingerprint,
    translation.translation_fingerprint,
    translation.contract_version,
    translation.terminology_review_confirmed,
    translation.reviewed_at,
    translation.reviewed_by,
    translation.rejected_at,
    translation.rejected_by,
    translation.review_reason,
    translation.published_at,
    translation.published_by,
    translation.archived_at,
    translation.edit_revision,
    translation.created_at,
    translation.updated_at,
    translation.created_by,
    translation.updated_by,
    source.slug,
    source.source_revision,
    source.updated_at,
    source.status,
    derived.lifecycle_state,
    derived.source_blocked,
    derived.source_blocked_reason,
    derived.stale_source_fingerprint,
    derived.stale_thumbnail_media_fingerprint,
    derived.stale_translation_fingerprint,
    derived.public_eligibility,
    derived.review_eligibility,
    derived.publication_eligibility,
    derived.eligibility_reason
  from public.cultural_event_translations as translation
  join public.cultural_events as source
    on source.id = translation.cultural_event_id
  cross join lateral private.cultural_event_translation_admin_derived_state(source, translation) as derived
  where auth.uid() is not null
    and public.is_admin()
    and translation.cultural_event_id = p_cultural_event_id
  order by translation.id;
$$;

create or replace function public.cultural_event_image_translation_admin_read(
  p_cultural_event_image_id uuid
)
returns table (
  id uuid,
  cultural_event_image_id uuid,
  locale text,
  alt_text text,
  caption text,
  translation_status public.publication_status,
  review_state text,
  captured_binary_revision bigint,
  captured_media_fingerprint text,
  translation_fingerprint text,
  contract_version text,
  terminology_review_confirmed boolean,
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  review_reason text,
  published_at timestamptz,
  published_by uuid,
  archived_at timestamptz,
  edit_revision bigint,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  updated_by uuid,
  cultural_event_id uuid,
  source_slug text,
  source_revision bigint,
  source_updated_at timestamptz,
  source_status public.publication_status,
  lifecycle_state text,
  source_blocked boolean,
  source_blocked_reason text,
  stale_media_fingerprint boolean,
  stale_translation_fingerprint boolean,
  public_eligibility boolean,
  review_eligibility boolean,
  publication_eligibility boolean,
  eligibility_reason text
)
language sql
security definer
set search_path = ''
as $$
  select
    translation.id,
    translation.cultural_event_image_id,
    translation.locale,
    translation.alt_text,
    translation.caption,
    translation.translation_status,
    translation.review_state,
    translation.captured_binary_revision,
    translation.captured_media_fingerprint,
    translation.translation_fingerprint,
    translation.contract_version,
    translation.terminology_review_confirmed,
    translation.reviewed_at,
    translation.reviewed_by,
    translation.rejected_at,
    translation.rejected_by,
    translation.review_reason,
    translation.published_at,
    translation.published_by,
    translation.archived_at,
    translation.edit_revision,
    translation.created_at,
    translation.updated_at,
    translation.created_by,
    translation.updated_by,
    image.cultural_event_id,
    source.slug,
    source.source_revision,
    source.updated_at,
    source.status,
    derived.lifecycle_state,
    derived.source_blocked,
    derived.source_blocked_reason,
    derived.stale_media_fingerprint,
    derived.stale_translation_fingerprint,
    derived.public_eligibility,
    derived.review_eligibility,
    derived.publication_eligibility,
    derived.eligibility_reason
  from public.cultural_event_image_translations as translation
  join public.cultural_event_images as image
    on image.id = translation.cultural_event_image_id
  join public.cultural_events as source
    on source.id = image.cultural_event_id
  cross join lateral private.cultural_event_image_translation_admin_derived_state(source, image, translation) as derived
  where auth.uid() is not null
    and public.is_admin()
    and translation.cultural_event_image_id = p_cultural_event_image_id
  order by translation.id;
$$;

create or replace function public.cultural_event_translation_review_history(
  p_translation_id uuid
)
returns setof public.cultural_event_translation_review_events
language sql
security definer
set search_path = ''
as $$
  select event.*
  from public.cultural_event_translation_review_events as event
  where auth.uid() is not null
    and public.is_admin()
    and event.cultural_event_translation_id = p_translation_id
  order by event.occurred_at, event.id;
$$;

create or replace function public.cultural_event_image_translation_review_history(
  p_translation_id uuid
)
returns setof public.cultural_event_image_translation_review_events
language sql
security definer
set search_path = ''
as $$
  select event.*
  from public.cultural_event_image_translation_review_events as event
  where auth.uid() is not null
    and public.is_admin()
    and event.cultural_event_image_translation_id = p_translation_id
  order by event.occurred_at, event.id;
$$;

create or replace function public.cultural_event_translation_save_draft(
  p_cultural_event_id uuid,
  p_expected_edit_revision bigint,
  p_title text,
  p_summary text,
  p_description text,
  p_event_type text,
  p_date_note text,
  p_location_name text,
  p_address text,
  p_organizer text,
  p_visitor_information text
)
returns public.cultural_event_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_source public.cultural_events;
  l_old public.cultural_event_translations;
  l_new public.cultural_event_translations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
  l_title text := nullif(pg_catalog.btrim(p_title), '');
  l_summary text := nullif(pg_catalog.btrim(p_summary), '');
  l_description text := nullif(pg_catalog.btrim(p_description), '');
  l_event_type text := nullif(pg_catalog.btrim(p_event_type), '');
  l_date_note text := nullif(pg_catalog.btrim(p_date_note), '');
  l_location_name text := nullif(pg_catalog.btrim(p_location_name), '');
  l_address text := nullif(pg_catalog.btrim(p_address), '');
  l_organizer text := nullif(pg_catalog.btrim(p_organizer), '');
  l_visitor_information text := nullif(pg_catalog.btrim(p_visitor_information), '');
  l_image_id uuid;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  select source.* into l_source
  from public.cultural_events as source
  where source.id = p_cultural_event_id
  for update;
  if l_source.id is null then
    raise exception using errcode = 'P0002', message = 'cultural event source not found';
  end if;
  if ((private.fingerprint_normalize_text(l_source.summary) is null
      or private.fingerprint_normalize_text(l_source.summary) = '') and l_summary is not null)
    or ((private.fingerprint_normalize_text(l_source.event_type) is null
      or private.fingerprint_normalize_text(l_source.event_type) = '') and l_event_type is not null)
    or ((private.fingerprint_normalize_text(l_source.date_note) is null
      or private.fingerprint_normalize_text(l_source.date_note) = '') and l_date_note is not null)
    or ((private.fingerprint_normalize_text(l_source.location_name) is null
      or private.fingerprint_normalize_text(l_source.location_name) = '') and l_location_name is not null)
    or ((private.fingerprint_normalize_text(l_source.address) is null
      or private.fingerprint_normalize_text(l_source.address) = '') and l_address is not null)
    or ((private.fingerprint_normalize_text(l_source.organizer) is null
      or private.fingerprint_normalize_text(l_source.organizer) = '') and l_organizer is not null)
    or ((private.fingerprint_normalize_text(l_source.visitor_information) is null
      or private.fingerprint_normalize_text(l_source.visitor_information) = '') and l_visitor_information is not null) then
    raise exception using errcode = '23514', message = 'English content cannot be added without source content';
  end if;
  for l_image_id in
    select image.id
    from public.cultural_event_images as image
    where image.cultural_event_id = p_cultural_event_id
    order by image.id
    for update
  loop
    null;
  end loop;
  select translation.* into l_old
  from public.cultural_event_translations as translation
  where translation.cultural_event_id = p_cultural_event_id
    and translation.locale = 'en'
  for update;

  if l_old.id is null then
    if p_expected_edit_revision is not null then
      raise exception using errcode = 'P0002', message = 'cultural event translation not found';
    end if;
    perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
    insert into public.cultural_event_translations (
      cultural_event_id, title, summary, description, event_type, date_note,
      location_name, address, organizer, visitor_information, created_by, updated_by
    ) values (
      p_cultural_event_id, l_title, l_summary, l_description, l_event_type, l_date_note,
      l_location_name, l_address, l_organizer, l_visitor_information, l_actor, l_actor
    ) returning * into l_new;
    l_source_fingerprint := private.cultural_event_source_fingerprint_v1(l_source);
    l_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(
      l_source, private.cultural_event_current_primary_image(l_source)
    );
    l_translation_fingerprint := private.cultural_event_translation_fingerprint_or_null(l_new);
    perform private.record_cultural_event_translation_event(
      null, l_new, 'draft_saved', l_actor, l_source.source_revision,
      l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
    );
    return l_new;
  end if;

  if p_expected_edit_revision is null
    or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event translation edit revision mismatch';
  end if;
  if l_old.translation_status = 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'published cultural event translation must be unpublished before editing';
  elsif l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'archived cultural event translation must be restored first';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'cultural event translation revision overflow';
  end if;
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  update public.cultural_event_translations as translation
  set title = l_title,
      summary = l_summary,
      description = l_description,
      event_type = l_event_type,
      date_note = l_date_note,
      location_name = l_location_name,
      address = l_address,
      organizer = l_organizer,
      visitor_information = l_visitor_information,
      translation_status = 'draft'::public.publication_status,
      review_state = 'pending',
      captured_source_revision = null,
      captured_source_fingerprint = null,
      captured_thumbnail_media_fingerprint = null,
      translation_fingerprint = null,
      terminology_review_confirmed = false,
      reviewed_at = null,
      reviewed_by = null,
      review_reason = null,
      rejected_at = null,
      rejected_by = null,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  l_source_fingerprint := private.cultural_event_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(
    l_source, private.cultural_event_current_primary_image(l_source)
  );
  l_translation_fingerprint := private.cultural_event_translation_fingerprint_or_null(l_new);
  perform private.record_cultural_event_translation_event(
    l_old, l_new, 'draft_saved', l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.cultural_event_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_terminology_review_confirmed boolean
)
returns public.cultural_event_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.cultural_event_translations;
  l_new public.cultural_event_translations;
  l_source public.cultural_events;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if not coalesce(p_terminology_review_confirmed, false) then
    raise exception using errcode = '23514', message = 'cultural terminology review confirmation is required';
  end if;
  l_old := private.lock_cultural_event_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'cultural event translation is not pending review';
  end if;
  select source.* into l_source
  from public.cultural_events as source
  where source.id = l_old.cultural_event_id
  for update;
  if not private.cultural_event_source_is_eligible(l_source)
    or not private.cultural_event_translation_content_is_complete(l_source, l_old) then
    raise exception using errcode = '55000', message = 'cultural event translation review eligibility failed';
  end if;
  l_source_fingerprint := private.cultural_event_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(
    l_source, private.cultural_event_current_primary_image(l_source)
  );
  l_translation_fingerprint := private.cultural_event_translation_fingerprint_v1(l_old);
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  update public.cultural_event_translations as translation
  set review_state = 'reviewed',
      terminology_review_confirmed = true,
      captured_source_revision = l_source.source_revision,
      captured_source_fingerprint = l_source_fingerprint,
      captured_thumbnail_media_fingerprint = l_thumbnail_fingerprint,
      translation_fingerprint = l_translation_fingerprint,
      reviewed_at = pg_catalog.statement_timestamp(),
      reviewed_by = l_actor,
      review_reason = null,
      rejected_at = null,
      rejected_by = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_cultural_event_translation_event(
    l_old, l_new, 'reviewed', l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.cultural_event_translation_reject(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_reason text
)
returns public.cultural_event_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.cultural_event_translations;
  l_new public.cultural_event_translations;
  l_source public.cultural_events;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '23514', message = 'rejection reason is required';
  end if;
  l_old := private.lock_cultural_event_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state not in ('pending', 'reviewed') then
    raise exception using errcode = '55000', message = 'cultural event translation cannot be rejected in its current state';
  end if;
  select source.* into l_source
  from public.cultural_events as source
  where source.id = l_old.cultural_event_id;
  l_source_fingerprint := private.cultural_event_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(
    l_source, private.cultural_event_current_primary_image(l_source)
  );
  l_translation_fingerprint := private.cultural_event_translation_fingerprint_or_null(l_old);
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  update public.cultural_event_translations as translation
  set translation_status = 'draft'::public.publication_status,
      review_state = 'rejected',
      captured_source_revision = null,
      captured_source_fingerprint = null,
      captured_thumbnail_media_fingerprint = null,
      translation_fingerprint = null,
      terminology_review_confirmed = false,
      reviewed_at = null,
      reviewed_by = null,
      review_reason = pg_catalog.btrim(p_reason),
      rejected_at = pg_catalog.statement_timestamp(),
      rejected_by = l_actor,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_cultural_event_translation_event(
    l_old, l_new, 'rejected', l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint,
    pg_catalog.btrim(p_reason)
  );
  return l_new;
end;
$$;

create or replace function private.cultural_event_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.cultural_event_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.cultural_event_translations;
  l_new public.cultural_event_translations;
  l_source public.cultural_events;
  l_primary public.cultural_event_images;
  l_primary_translation public.cultural_event_image_translations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_cultural_event_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not p_republish and (l_old.published_at is not null or l_old.translation_status <> 'draft'::public.publication_status))
    or (p_republish and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'cultural event translation publication transition is invalid';
  end if;
  select source.* into l_source
  from public.cultural_events as source
  where source.id = l_old.cultural_event_id
  for update;
  if not private.cultural_event_source_is_eligible(l_source)
    or not private.cultural_event_translation_content_is_complete(l_source, l_old) then
    raise exception using errcode = '55000', message = 'cultural event translation publication eligibility failed';
  end if;
  l_primary := private.cultural_event_current_primary_image(l_source);
  select translation.* into l_primary_translation
  from public.cultural_event_image_translations as translation
  where translation.cultural_event_image_id = l_primary.id
    and translation.locale = 'en';
  if l_primary.id is null
    or l_primary_translation.id is null
    or not private.cultural_event_image_translation_is_eligible(l_source, l_primary, l_primary_translation) then
    raise exception using errcode = '55000', message = 'cultural event primary image translation publication eligibility failed';
  end if;
  l_source_fingerprint := private.cultural_event_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(l_source, l_primary);
  l_translation_fingerprint := private.cultural_event_translation_fingerprint_v1(l_old);
  if l_old.terminology_review_confirmed is not true then
    raise exception using errcode = '55000', message = 'cultural event terminology review is not confirmed';
  end if;
  if l_old.captured_source_fingerprint is distinct from l_source_fingerprint
    or l_old.captured_thumbnail_media_fingerprint is distinct from l_thumbnail_fingerprint
    or l_old.translation_fingerprint is distinct from l_translation_fingerprint then
    raise exception using errcode = '55000', message = 'fresh review required before cultural event translation publication';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'cultural event translation revision overflow';
  end if;
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  update public.cultural_event_translations as translation
  set translation_status = 'published'::public.publication_status,
      published_at = pg_catalog.statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_cultural_event_translation_event(
    l_old, l_new,
    case when p_republish then 'republished' else 'published' end,
    l_actor, l_source.source_revision, l_source_fingerprint,
    l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.cultural_event_translation_publish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.cultural_event_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, false
  );
end;
$$;

create or replace function public.cultural_event_translation_republish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.cultural_event_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, true
  );
end;
$$;

create or replace function private.cultural_event_translation_simple_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_action text
)
returns public.cultural_event_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.cultural_event_translations;
  l_new public.cultural_event_translations;
  l_source public.cultural_events;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
  l_event_type text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_action not in ('archive', 'unpublish', 'restore') then
    raise exception using errcode = '22023', message = 'unsupported cultural event translation transition';
  end if;
  l_old := private.lock_cultural_event_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event translation edit revision mismatch';
  end if;
  if p_action = 'archive' and l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'cultural event translation is already archived';
  elsif p_action = 'unpublish' and l_old.translation_status <> 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'cultural event translation is not published';
  elsif p_action = 'restore' and l_old.translation_status <> 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'cultural event translation is not archived';
  end if;
  select source.* into l_source
  from public.cultural_events as source
  where source.id = l_old.cultural_event_id
  for update;
  l_source_fingerprint := private.cultural_event_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.cultural_event_thumbnail_media_fingerprint_v1(
    l_source, private.cultural_event_current_primary_image(l_source)
  );
  l_translation_fingerprint := private.cultural_event_translation_fingerprint_or_null(l_old);
  l_event_type := case p_action
    when 'archive' then 'archived'
    when 'unpublish' then 'unpublished'
    when 'restore' then 'restored'
  end;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'cultural event translation revision overflow';
  end if;
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  if p_action = 'archive' then
    update public.cultural_event_translations as translation
    set translation_status = 'archived'::public.publication_status,
        review_state = 'pending',
        captured_source_revision = null,
        captured_source_fingerprint = null,
        captured_thumbnail_media_fingerprint = null,
        translation_fingerprint = null,
        terminology_review_confirmed = false,
        reviewed_at = null,
        reviewed_by = null,
        rejected_at = null,
        rejected_by = null,
        review_reason = null,
        archived_at = pg_catalog.statement_timestamp(),
        edit_revision = l_old.edit_revision + 1,
        updated_by = l_actor
    where translation.id = l_old.id
    returning translation.* into l_new;
  elsif p_action = 'unpublish' then
    update public.cultural_event_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
        captured_source_revision = null,
        captured_source_fingerprint = null,
        captured_thumbnail_media_fingerprint = null,
        translation_fingerprint = null,
        terminology_review_confirmed = false,
        reviewed_at = null,
        reviewed_by = null,
        rejected_at = null,
        rejected_by = null,
        review_reason = null,
        archived_at = null,
        edit_revision = l_old.edit_revision + 1,
        updated_by = l_actor
    where translation.id = l_old.id
    returning translation.* into l_new;
  else
    update public.cultural_event_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
        captured_source_revision = null,
        captured_source_fingerprint = null,
        captured_thumbnail_media_fingerprint = null,
        translation_fingerprint = null,
        terminology_review_confirmed = false,
        reviewed_at = null,
        reviewed_by = null,
        rejected_at = null,
        rejected_by = null,
        review_reason = null,
        archived_at = null,
        edit_revision = l_old.edit_revision + 1,
        updated_by = l_actor
    where translation.id = l_old.id
    returning translation.* into l_new;
  end if;
  perform private.record_cultural_event_translation_event(
    l_old, l_new, l_event_type, l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.cultural_event_translation_archive(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_translations
language plpgsql security definer set search_path = ''
as $$ begin return private.cultural_event_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'archive'); end; $$;

create or replace function public.cultural_event_translation_unpublish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_translations
language plpgsql security definer set search_path = ''
as $$ begin return private.cultural_event_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'unpublish'); end; $$;

create or replace function public.cultural_event_translation_restore(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_translations
language plpgsql security definer set search_path = ''
as $$ begin return private.cultural_event_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'restore'); end; $$;

create or replace function private.cultural_event_image_source_is_eligible(
  p_source public.cultural_events,
  p_image public.cultural_event_images
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_source.status <> 'published'::public.publication_status
    or p_image.cultural_event_id <> p_source.id
    or pg_catalog.btrim(coalesce(p_image.alt_text, '')) = ''
    or p_image.storage_bucket <> 'tourism-media'
    or p_image.storage_path !~ ('^cultural-event/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$') then
    return false;
  end if;
  begin
    perform storage.objects.id
    from storage.objects
    where storage.objects.bucket_id = p_image.storage_bucket
      and storage.objects.name = p_image.storage_path;
  exception when others then
    return false;
  end;
  return found;
end;
$$;

create or replace function public.cultural_event_image_translation_save_draft(
  p_cultural_event_image_id uuid,
  p_expected_edit_revision bigint,
  p_alt_text text,
  p_caption text
)
returns public.cultural_event_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_image public.cultural_event_images;
  l_source public.cultural_events;
  l_old public.cultural_event_image_translations;
  l_new public.cultural_event_image_translations;
  l_media_fingerprint text;
  l_translation_fingerprint text;
  l_alt_text text := nullif(pg_catalog.btrim(p_alt_text), '');
  l_caption text := nullif(pg_catalog.btrim(p_caption), '');
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_image := private.lock_cultural_event_image(p_cultural_event_image_id);
  select source.* into l_source
  from public.cultural_events as source
  where source.id = l_image.cultural_event_id
  for update;
  if l_source.id is null then
    raise exception using errcode = 'P0002', message = 'cultural event source not found';
  end if;
  if (private.fingerprint_normalize_text(l_image.caption) is null
      or private.fingerprint_normalize_text(l_image.caption) = '')
      and l_caption is not null then
    raise exception using errcode = '23514', message = 'English image caption cannot be added without source caption content';
  end if;
  select translation.* into l_old
  from public.cultural_event_image_translations as translation
  where translation.cultural_event_image_id = p_cultural_event_image_id
    and translation.locale = 'en'
  for update;
  if l_old.id is null then
    if p_expected_edit_revision is not null then
      raise exception using errcode = 'P0002', message = 'cultural event image translation not found';
    end if;
    perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
    insert into public.cultural_event_image_translations (
      cultural_event_image_id, alt_text, caption, created_by, updated_by
    ) values (
      p_cultural_event_image_id, l_alt_text, l_caption, l_actor, l_actor
    ) returning * into l_new;
    l_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(l_image);
    l_translation_fingerprint := private.cultural_event_image_translation_fingerprint_or_null(l_new);
    perform private.record_cultural_event_image_translation_event(
      null, l_new, 'draft_saved', l_actor, l_image.binary_revision,
      l_media_fingerprint, l_translation_fingerprint
    );
    return l_new;
  end if;
  if p_expected_edit_revision is null
    or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event image translation edit revision mismatch';
  end if;
  if l_old.translation_status = 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'published cultural event image translation must be unpublished before editing';
  elsif l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'archived cultural event image translation must be restored first';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'cultural event image translation revision overflow';
  end if;
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  update public.cultural_event_image_translations as translation
  set alt_text = l_alt_text,
      caption = l_caption,
      translation_status = 'draft'::public.publication_status,
      review_state = 'pending',
      captured_binary_revision = null,
      captured_media_fingerprint = null,
      translation_fingerprint = null,
      terminology_review_confirmed = false,
      reviewed_at = null,
      reviewed_by = null,
      review_reason = null,
      rejected_at = null,
      rejected_by = null,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  l_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.cultural_event_image_translation_fingerprint_or_null(l_new);
  perform private.record_cultural_event_image_translation_event(
    l_old, l_new, 'draft_saved', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.cultural_event_image_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_terminology_review_confirmed boolean
)
returns public.cultural_event_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.cultural_event_image_translations;
  l_new public.cultural_event_image_translations;
  l_image public.cultural_event_images;
  l_source public.cultural_events;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if not coalesce(p_terminology_review_confirmed, false) then
    raise exception using errcode = '23514', message = 'cultural terminology review confirmation is required';
  end if;
  l_old := private.lock_cultural_event_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'cultural event image translation is not pending review';
  end if;
  select image.* into l_image
  from public.cultural_event_images as image
  where image.id = l_old.cultural_event_image_id;
  select source.* into l_source
  from public.cultural_events as source
  where source.id = l_image.cultural_event_id
  for update;
  if not private.cultural_event_image_source_is_eligible(l_source, l_image)
    or not private.cultural_event_image_translation_content_is_complete(l_image, l_old) then
    raise exception using errcode = '55000', message = 'cultural event image translation review eligibility failed';
  end if;
  l_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.cultural_event_image_translation_fingerprint_v1(l_old);
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  update public.cultural_event_image_translations as translation
  set review_state = 'reviewed',
      terminology_review_confirmed = true,
      captured_binary_revision = l_image.binary_revision,
      captured_media_fingerprint = l_media_fingerprint,
      translation_fingerprint = l_translation_fingerprint,
      reviewed_at = pg_catalog.statement_timestamp(),
      reviewed_by = l_actor,
      review_reason = null,
      rejected_at = null,
      rejected_by = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_cultural_event_image_translation_event(
    l_old, l_new, 'reviewed', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.cultural_event_image_translation_reject(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_reason text
)
returns public.cultural_event_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.cultural_event_image_translations;
  l_new public.cultural_event_image_translations;
  l_image public.cultural_event_images;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '23514', message = 'rejection reason is required';
  end if;
  l_old := private.lock_cultural_event_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state not in ('pending', 'reviewed') then
    raise exception using errcode = '55000', message = 'cultural event image translation cannot be rejected in its current state';
  end if;
  select image.* into l_image
  from public.cultural_event_images as image
  where image.id = l_old.cultural_event_image_id;
  l_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.cultural_event_image_translation_fingerprint_or_null(l_old);
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  update public.cultural_event_image_translations as translation
  set translation_status = 'draft'::public.publication_status,
      review_state = 'rejected',
      captured_binary_revision = null,
      captured_media_fingerprint = null,
      translation_fingerprint = null,
      terminology_review_confirmed = false,
      reviewed_at = null,
      reviewed_by = null,
      review_reason = pg_catalog.btrim(p_reason),
      rejected_at = pg_catalog.statement_timestamp(),
      rejected_by = l_actor,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_cultural_event_image_translation_event(
    l_old, l_new, 'rejected', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint, pg_catalog.btrim(p_reason)
  );
  return l_new;
end;
$$;

create or replace function private.cultural_event_image_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.cultural_event_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.cultural_event_image_translations;
  l_new public.cultural_event_image_translations;
  l_image public.cultural_event_images;
  l_source public.cultural_events;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_cultural_event_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event image translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not p_republish and (l_old.published_at is not null or l_old.translation_status <> 'draft'::public.publication_status))
    or (p_republish and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'cultural event image translation publication transition is invalid';
  end if;
  select image.* into l_image
  from public.cultural_event_images as image
  where image.id = l_old.cultural_event_image_id;
  select source.* into l_source
  from public.cultural_events as source
  where source.id = l_image.cultural_event_id
  for update;
  if not private.cultural_event_image_source_is_eligible(l_source, l_image)
    or not private.cultural_event_image_translation_content_is_complete(l_image, l_old) then
    raise exception using errcode = '55000', message = 'cultural event image translation publication eligibility failed';
  end if;
  l_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.cultural_event_image_translation_fingerprint_v1(l_old);
  if l_old.terminology_review_confirmed is not true then
    raise exception using errcode = '55000', message = 'cultural event terminology review is not confirmed';
  end if;
  if l_old.captured_binary_revision is distinct from l_image.binary_revision
    or l_old.captured_media_fingerprint is distinct from l_media_fingerprint
    or l_old.translation_fingerprint is distinct from l_translation_fingerprint then
    raise exception using errcode = '55000', message = 'fresh review required before cultural event image publication';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'cultural event image translation revision overflow';
  end if;
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  update public.cultural_event_image_translations as translation
  set translation_status = 'published'::public.publication_status,
      published_at = pg_catalog.statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_cultural_event_image_translation_event(
    l_old, l_new,
    case when p_republish then 'republished' else 'published' end,
    l_actor, l_image.binary_revision, l_media_fingerprint,
    l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.cultural_event_image_translation_publish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_image_translations
language plpgsql security definer set search_path = ''
as $$ begin return private.cultural_event_image_translation_publish_transition(p_translation_id, p_expected_edit_revision, false); end; $$;

create or replace function public.cultural_event_image_translation_republish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_image_translations
language plpgsql security definer set search_path = ''
as $$ begin return private.cultural_event_image_translation_publish_transition(p_translation_id, p_expected_edit_revision, true); end; $$;

create or replace function private.cultural_event_image_translation_simple_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_action text
)
returns public.cultural_event_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.cultural_event_image_translations;
  l_new public.cultural_event_image_translations;
  l_image public.cultural_event_images;
  l_source public.cultural_events;
  l_media_fingerprint text;
  l_translation_fingerprint text;
  l_event_type text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_action not in ('archive', 'unpublish', 'restore') then
    raise exception using errcode = '22023', message = 'unsupported cultural event image translation transition';
  end if;
  l_old := private.lock_cultural_event_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'cultural event image translation edit revision mismatch';
  end if;
  if p_action = 'archive' and l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'cultural event image translation is already archived';
  elsif p_action = 'unpublish' and l_old.translation_status <> 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'cultural event image translation is not published';
  elsif p_action = 'restore' and l_old.translation_status <> 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'cultural event image translation is not archived';
  end if;
  select image.* into l_image
  from public.cultural_event_images as image
  where image.id = l_old.cultural_event_image_id;
  select source.* into l_source
  from public.cultural_events as source
  where source.id = l_image.cultural_event_id;
  l_media_fingerprint := private.cultural_event_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.cultural_event_image_translation_fingerprint_or_null(l_old);
  l_event_type := case p_action
    when 'archive' then 'archived'
    when 'unpublish' then 'unpublished'
    when 'restore' then 'restored'
  end;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'cultural event image translation revision overflow';
  end if;
  perform pg_catalog.set_config('cultural_event.workflow', 'on', true);
  if p_action = 'archive' then
    update public.cultural_event_image_translations as translation
    set translation_status = 'archived'::public.publication_status,
        review_state = 'pending',
        captured_binary_revision = null,
        captured_media_fingerprint = null,
        translation_fingerprint = null,
        terminology_review_confirmed = false,
        reviewed_at = null,
        reviewed_by = null,
        rejected_at = null,
        rejected_by = null,
        review_reason = null,
        archived_at = pg_catalog.statement_timestamp(),
        edit_revision = l_old.edit_revision + 1,
        updated_by = l_actor
    where translation.id = l_old.id
    returning translation.* into l_new;
  else
    update public.cultural_event_image_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
        captured_binary_revision = null,
        captured_media_fingerprint = null,
        translation_fingerprint = null,
        terminology_review_confirmed = false,
        reviewed_at = null,
        reviewed_by = null,
        rejected_at = null,
        rejected_by = null,
        review_reason = null,
        archived_at = null,
        edit_revision = l_old.edit_revision + 1,
        updated_by = l_actor
    where translation.id = l_old.id
    returning translation.* into l_new;
  end if;
  perform private.record_cultural_event_image_translation_event(
    l_old, l_new, l_event_type, l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.cultural_event_image_translation_archive(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_image_translations
language plpgsql security definer set search_path = ''
as $$ begin return private.cultural_event_image_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'archive'); end; $$;

create or replace function public.cultural_event_image_translation_unpublish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_image_translations
language plpgsql security definer set search_path = ''
as $$ begin return private.cultural_event_image_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'unpublish'); end; $$;

create or replace function public.cultural_event_image_translation_restore(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.cultural_event_image_translations
language plpgsql security definer set search_path = ''
as $$ begin return private.cultural_event_image_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'restore'); end; $$;

-- Public views cannot invoke revoked private functions as the querying role.
-- These private snapshots are maintained by database-owned triggers and are
-- used only by the owner-controlled projection views for exact checkpoint
-- comparison.  They are not an application read model or a second source of
-- truth: the source/image/translation rows remain authoritative.
create table private.cultural_event_freshness (
  cultural_event_id uuid primary key
    references public.cultural_events (id) on delete cascade,
  source_fingerprint text not null,
  thumbnail_media_fingerprint text not null,
  source_revision bigint not null check (source_revision > 0),
  updated_at timestamptz not null default statement_timestamp()
);

create table private.cultural_event_image_freshness (
  cultural_event_image_id uuid primary key
    references public.cultural_event_images (id) on delete cascade,
  media_fingerprint text not null,
  binary_revision bigint not null check (binary_revision > 0),
  updated_at timestamptz not null default statement_timestamp()
);

create table private.cultural_event_translation_freshness (
  cultural_event_translation_id uuid primary key
    references public.cultural_event_translations (id) on delete cascade,
  translation_fingerprint text,
  updated_at timestamptz not null default statement_timestamp()
);

create table private.cultural_event_image_translation_freshness (
  cultural_event_image_translation_id uuid primary key
    references public.cultural_event_image_translations (id) on delete cascade,
  translation_fingerprint text,
  updated_at timestamptz not null default statement_timestamp()
);

create or replace function private.refresh_cultural_event_freshness()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_event_id uuid;
  l_image_id uuid;
  l_translation_id uuid;
  l_source public.cultural_events;
  l_image public.cultural_event_images;
  l_primary public.cultural_event_images;
  l_parent_translation public.cultural_event_translations;
  l_image_translation public.cultural_event_image_translations;
begin
  if tg_table_name = 'cultural_events' then
    if tg_op = 'DELETE' then
      delete from private.cultural_event_freshness
      where cultural_event_id = old.id;
      return old;
    end if;
    select source.* into l_source
    from public.cultural_events as source
    where source.id = new.id;
    l_primary := private.cultural_event_current_primary_image(l_source);
    insert into private.cultural_event_freshness (
      cultural_event_id, source_fingerprint, thumbnail_media_fingerprint,
      source_revision, updated_at
    ) values (
      l_source.id,
      private.cultural_event_source_fingerprint_v1(l_source),
      private.cultural_event_thumbnail_media_fingerprint_v1(l_source, l_primary),
      l_source.source_revision,
      pg_catalog.statement_timestamp()
    )
    on conflict (cultural_event_id) do update
      set source_fingerprint = excluded.source_fingerprint,
          thumbnail_media_fingerprint = excluded.thumbnail_media_fingerprint,
          source_revision = excluded.source_revision,
          updated_at = excluded.updated_at;
    return new;
  elsif tg_table_name = 'cultural_event_images' then
    l_image_id := case when tg_op = 'DELETE' then old.id else new.id end;
    l_event_id := case when tg_op = 'DELETE' then old.cultural_event_id else new.cultural_event_id end;
    if tg_op = 'DELETE' then
      delete from private.cultural_event_image_freshness
      where cultural_event_image_id = l_image_id;
    else
      select image.* into l_image
      from public.cultural_event_images as image
      where image.id = l_image_id;
      insert into private.cultural_event_image_freshness (
        cultural_event_image_id, media_fingerprint, binary_revision, updated_at
      ) values (
        l_image.id,
        private.cultural_event_image_media_fingerprint_v1(l_image),
        l_image.binary_revision,
        pg_catalog.statement_timestamp()
      )
      on conflict (cultural_event_image_id) do update
        set media_fingerprint = excluded.media_fingerprint,
            binary_revision = excluded.binary_revision,
            updated_at = excluded.updated_at;
    end if;
    select source.* into l_source
    from public.cultural_events as source
    where source.id = l_event_id;
    if l_source.id is not null then
      l_primary := private.cultural_event_current_primary_image(l_source);
      insert into private.cultural_event_freshness (
        cultural_event_id, source_fingerprint, thumbnail_media_fingerprint,
        source_revision, updated_at
      ) values (
        l_source.id,
        private.cultural_event_source_fingerprint_v1(l_source),
        private.cultural_event_thumbnail_media_fingerprint_v1(l_source, l_primary),
        l_source.source_revision,
        pg_catalog.statement_timestamp()
      )
      on conflict (cultural_event_id) do update
        set source_fingerprint = excluded.source_fingerprint,
            thumbnail_media_fingerprint = excluded.thumbnail_media_fingerprint,
            source_revision = excluded.source_revision,
            updated_at = excluded.updated_at;
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  elsif tg_table_name = 'cultural_event_translations' then
    l_translation_id := case when tg_op = 'DELETE' then old.id else new.id end;
    if tg_op = 'DELETE' then
      delete from private.cultural_event_translation_freshness
      where cultural_event_translation_id = l_translation_id;
    else
      select translation.* into l_parent_translation
      from public.cultural_event_translations as translation
      where translation.id = l_translation_id;
      insert into private.cultural_event_translation_freshness (
        cultural_event_translation_id, translation_fingerprint, updated_at
      ) values (
        l_parent_translation.id,
        private.cultural_event_translation_fingerprint_or_null(l_parent_translation),
        pg_catalog.statement_timestamp()
      )
      on conflict (cultural_event_translation_id) do update
        set translation_fingerprint = excluded.translation_fingerprint,
            updated_at = excluded.updated_at;
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  elsif tg_table_name = 'cultural_event_image_translations' then
    l_translation_id := case when tg_op = 'DELETE' then old.id else new.id end;
    if tg_op = 'DELETE' then
      delete from private.cultural_event_image_translation_freshness
      where cultural_event_image_translation_id = l_translation_id;
    else
      select translation.* into l_image_translation
      from public.cultural_event_image_translations as translation
      where translation.id = l_translation_id;
      insert into private.cultural_event_image_translation_freshness (
        cultural_event_image_translation_id, translation_fingerprint, updated_at
      ) values (
        l_image_translation.id,
        private.cultural_event_image_translation_fingerprint_or_null(l_image_translation),
        pg_catalog.statement_timestamp()
      )
      on conflict (cultural_event_image_translation_id) do update
        set translation_fingerprint = excluded.translation_fingerprint,
            updated_at = excluded.updated_at;
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger cultural_events_freshness_trigger
after insert or update or delete on public.cultural_events
for each row execute function private.refresh_cultural_event_freshness();
create trigger cultural_event_images_freshness_trigger
after insert or update or delete on public.cultural_event_images
for each row execute function private.refresh_cultural_event_freshness();
create trigger cultural_event_translations_freshness_trigger
after insert or update or delete on public.cultural_event_translations
for each row execute function private.refresh_cultural_event_freshness();
create trigger cultural_event_image_translations_freshness_trigger
after insert or update or delete on public.cultural_event_image_translations
for each row execute function private.refresh_cultural_event_freshness();

insert into private.cultural_event_freshness (
  cultural_event_id, source_fingerprint, thumbnail_media_fingerprint, source_revision
)
select source.id,
       private.cultural_event_source_fingerprint_v1(source),
       private.cultural_event_thumbnail_media_fingerprint_v1(
         source, private.cultural_event_current_primary_image(source)
       ),
       source.source_revision
from public.cultural_events as source;
insert into private.cultural_event_image_freshness (
  cultural_event_image_id, media_fingerprint, binary_revision
)
select image.id,
       private.cultural_event_image_media_fingerprint_v1(image),
       image.binary_revision
from public.cultural_event_images as image;
insert into private.cultural_event_translation_freshness (
  cultural_event_translation_id, translation_fingerprint
)
select translation.id,
       private.cultural_event_translation_fingerprint_or_null(translation)
from public.cultural_event_translations as translation;
insert into private.cultural_event_image_translation_freshness (
  cultural_event_image_translation_id, translation_fingerprint
)
select translation.id,
       private.cultural_event_image_translation_fingerprint_or_null(translation)
from public.cultural_event_image_translations as translation;


create view private.published_english_cultural_event_rows_data
with (security_barrier = true, security_invoker = false)
as
with primary_counts as (
  select image.cultural_event_id, count(*) as primary_count
  from public.cultural_event_images as image
  where image.is_primary
  group by image.cultural_event_id
), current_primary as (
  select image.*
  from public.cultural_event_images as image
  join primary_counts as counts
    on counts.cultural_event_id = image.cultural_event_id
   and counts.primary_count = 1
  join public.cultural_events as source
    on source.id = image.cultural_event_id
  where image.is_primary
    and image.storage_bucket = source.thumbnail_bucket
    and image.storage_path = source.thumbnail_path
), eligible_parent_rows as (
  select
    source.id,
    translation.id as translation_id,
    source.slug,
    translation.title,
    translation.summary,
    translation.description,
    translation.event_type,
    source.start_at,
    source.end_at,
    source.all_day,
    translation.date_note,
    translation.location_name,
    translation.address,
    source.latitude,
    source.longitude,
    source.google_maps_url,
    translation.organizer,
    case when source.contact_consent_confirmed then source.contact_phone end as contact_phone,
    translation.visitor_information,
    source.thumbnail_bucket,
    source.thumbnail_path,
    source.is_featured,
    source.published_at,
    translation.published_at as translation_published_at
  from public.cultural_events as source
  join public.cultural_event_translations as translation
    on translation.cultural_event_id = source.id
   and translation.locale = 'en'
  join current_primary as primary_image
    on primary_image.cultural_event_id = source.id
  join public.cultural_event_image_translations as primary_translation
    on primary_translation.cultural_event_image_id = primary_image.id
   and primary_translation.locale = 'en'
  join private.cultural_event_freshness as source_freshness
    on source_freshness.cultural_event_id = source.id
  join private.cultural_event_image_freshness as primary_media_freshness
    on primary_media_freshness.cultural_event_image_id = primary_image.id
  join private.cultural_event_translation_freshness as translation_freshness
    on translation_freshness.cultural_event_translation_id = translation.id
  join private.cultural_event_image_translation_freshness as primary_translation_freshness
    on primary_translation_freshness.cultural_event_image_translation_id = primary_translation.id
  where source.status = 'published'::public.publication_status
    and source.start_at is not null
    and pg_catalog.btrim(coalesce(source.title, '')) <> ''
    and pg_catalog.btrim(coalesce(source.description, '')) <> ''
    and (source.contact_phone is null or source.contact_consent_confirmed)
    and source.thumbnail_bucket = 'tourism-media'
    and source.thumbnail_path ~ ('^cultural-event/' || source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    and primary_image.storage_bucket = 'tourism-media'
    and primary_image.storage_path ~ ('^cultural-event/' || source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    and pg_catalog.btrim(coalesce(primary_image.alt_text, '')) <> ''
    and exists (
      select 1 from storage.objects as object
      where object.bucket_id = primary_image.storage_bucket
        and object.name = primary_image.storage_path
    )
    and primary_translation.translation_status = 'published'::public.publication_status
    and primary_translation.review_state = 'reviewed'
    and primary_translation.archived_at is null
    and pg_catalog.btrim(coalesce(primary_translation.alt_text, '')) <> ''
    and (
      (pg_catalog.btrim(coalesce(primary_image.caption, '')) = '' and primary_translation.caption is null)
      or (pg_catalog.btrim(coalesce(primary_image.caption, '')) <> ''
        and (primary_translation.caption is null or pg_catalog.btrim(primary_translation.caption) <> ''))
    )
    and primary_translation.captured_binary_revision = primary_image.binary_revision
    and primary_translation.captured_media_fingerprint = primary_media_freshness.media_fingerprint
    and primary_translation.translation_fingerprint = primary_translation_freshness.translation_fingerprint
    and translation.translation_status = 'published'::public.publication_status
    and translation.review_state = 'reviewed'
    and translation.archived_at is null
    and pg_catalog.btrim(coalesce(translation.title, '')) <> ''
    and pg_catalog.btrim(coalesce(translation.description, '')) <> ''
    and ((pg_catalog.btrim(coalesce(source.summary, '')) = '' and translation.summary is null)
      or (pg_catalog.btrim(coalesce(source.summary, '')) <> '' and pg_catalog.btrim(coalesce(translation.summary, '')) <> ''))
    and ((pg_catalog.btrim(coalesce(source.event_type, '')) = '' and translation.event_type is null)
      or (pg_catalog.btrim(coalesce(source.event_type, '')) <> '' and pg_catalog.btrim(coalesce(translation.event_type, '')) <> ''))
    and ((pg_catalog.btrim(coalesce(source.date_note, '')) = '' and translation.date_note is null)
      or (pg_catalog.btrim(coalesce(source.date_note, '')) <> '' and pg_catalog.btrim(coalesce(translation.date_note, '')) <> ''))
    and ((pg_catalog.btrim(coalesce(source.location_name, '')) = '' and translation.location_name is null)
      or (pg_catalog.btrim(coalesce(source.location_name, '')) <> '' and pg_catalog.btrim(coalesce(translation.location_name, '')) <> ''))
    and ((pg_catalog.btrim(coalesce(source.address, '')) = '' and translation.address is null)
      or (pg_catalog.btrim(coalesce(source.address, '')) <> '' and pg_catalog.btrim(coalesce(translation.address, '')) <> ''))
    and ((pg_catalog.btrim(coalesce(source.organizer, '')) = '' and translation.organizer is null)
      or (pg_catalog.btrim(coalesce(source.organizer, '')) <> '' and pg_catalog.btrim(coalesce(translation.organizer, '')) <> ''))
    and ((pg_catalog.btrim(coalesce(source.visitor_information, '')) = '' and translation.visitor_information is null)
      or (pg_catalog.btrim(coalesce(source.visitor_information, '')) <> '' and pg_catalog.btrim(coalesce(translation.visitor_information, '')) <> ''))
    and translation.captured_source_fingerprint = source_freshness.source_fingerprint
    and translation.captured_thumbnail_media_fingerprint = source_freshness.thumbnail_media_fingerprint
    and translation.translation_fingerprint = translation_freshness.translation_fingerprint
)
select * from eligible_parent_rows;

create view private.published_english_cultural_event_image_rows_data
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.cultural_event_id,
  translation.id as translation_id,
  image.storage_bucket,
  image.storage_path,
  translation.alt_text,
  translation.caption,
  image.display_order,
  image.is_primary
from public.cultural_event_images as image
join public.cultural_events as source
  on source.id = image.cultural_event_id
join private.published_english_cultural_event_rows_data as parent
  on parent.id = source.id
join public.cultural_event_image_translations as translation
  on translation.cultural_event_image_id = image.id
 and translation.locale = 'en'
join private.cultural_event_image_freshness as media_freshness
  on media_freshness.cultural_event_image_id = image.id
join private.cultural_event_image_translation_freshness as translation_freshness
  on translation_freshness.cultural_event_image_translation_id = translation.id
where source.status = 'published'::public.publication_status
  and image.storage_bucket = 'tourism-media'
  and image.storage_path ~ ('^cultural-event/' || source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
  and pg_catalog.btrim(coalesce(image.alt_text, '')) <> ''
  and exists (
    select 1 from storage.objects as object
    where object.bucket_id = image.storage_bucket
      and object.name = image.storage_path
  )
  and translation.translation_status = 'published'::public.publication_status
  and translation.review_state = 'reviewed'
  and translation.archived_at is null
  and pg_catalog.btrim(coalesce(translation.alt_text, '')) <> ''
  and (
    (pg_catalog.btrim(coalesce(image.caption, '')) = '' and translation.caption is null)
    or (pg_catalog.btrim(coalesce(image.caption, '')) <> ''
      and (translation.caption is null or pg_catalog.btrim(translation.caption) <> ''))
  )
  and translation.captured_binary_revision = image.binary_revision
  and translation.captured_media_fingerprint = media_freshness.media_fingerprint
  and translation.translation_fingerprint = translation_freshness.translation_fingerprint;

create view public.published_english_cultural_events
with (security_barrier = true, security_invoker = false)
as
select
  id,
  translation_id,
  slug,
  title,
  summary,
  description,
  event_type,
  start_at,
  end_at,
  all_day,
  date_note,
  location_name,
  address,
  latitude,
  longitude,
  google_maps_url,
  organizer,
  contact_phone,
  visitor_information,
  thumbnail_bucket,
  thumbnail_path,
  is_featured,
  published_at,
  translation_published_at
from private.published_english_cultural_event_rows_data;

create view public.published_english_cultural_event_images
with (security_barrier = true, security_invoker = false)
as
select
  id,
  cultural_event_id,
  translation_id,
  storage_bucket,
  storage_path,
  alt_text,
  caption,
  display_order,
  is_primary
from private.published_english_cultural_event_image_rows_data;

alter table public.cultural_event_translations enable row level security;
alter table public.cultural_event_image_translations enable row level security;
alter table public.cultural_event_translation_review_events enable row level security;
alter table public.cultural_event_image_translation_review_events enable row level security;

alter table public.cultural_event_translations owner to postgres;
alter table public.cultural_event_image_translations owner to postgres;
alter table public.cultural_event_translation_review_events owner to postgres;
alter table public.cultural_event_image_translation_review_events owner to postgres;
alter table private.cultural_event_freshness owner to postgres;
alter view private.published_english_cultural_event_rows_data owner to postgres;
alter view private.published_english_cultural_event_image_rows_data owner to postgres;
alter view public.published_english_cultural_events owner to postgres;
alter view public.published_english_cultural_event_images owner to postgres;

revoke all on table public.cultural_event_translations from public, anon, authenticated;
revoke all on table public.cultural_event_image_translations from public, anon, authenticated;
revoke all on table public.cultural_event_translation_review_events from public, anon, authenticated;
revoke all on table public.cultural_event_image_translation_review_events from public, anon, authenticated;
revoke all on table private.cultural_event_freshness from public, anon, authenticated;
revoke all on private.published_english_cultural_event_rows_data from public, anon, authenticated;
revoke all on private.published_english_cultural_event_image_rows_data from public, anon, authenticated;
revoke all on public.published_english_cultural_events from public, anon, authenticated;
revoke all on public.published_english_cultural_event_images from public, anon, authenticated;
grant select on public.published_english_cultural_events to anon, authenticated;
grant select on public.published_english_cultural_event_images to anon, authenticated;

do $$
declare
  l_function record;
begin
  for l_function in
    select * from (values
      ('private.cultural_event_fingerprint_timestamp_value(timestamptz)'::text),
      ('private.cultural_event_bilingual_legacy_validation_report()'::text),
      ('private.cultural_event_source_fingerprint_v1(public.cultural_events)'::text),
      ('private.cultural_event_translation_fingerprint_v1(public.cultural_event_translations)'::text),
      ('private.cultural_event_image_translation_fingerprint_v1(public.cultural_event_image_translations)'::text),
      ('private.cultural_event_image_media_fingerprint_v1(public.cultural_event_images)'::text),
      ('private.cultural_event_thumbnail_media_fingerprint_v1(public.cultural_events, public.cultural_event_images)'::text),
      ('private.cultural_event_optional_translation_matches_source(text, text)'::text),
      ('private.cultural_event_caption_matches_source(text, text)'::text),
      ('private.cultural_event_translation_fingerprint_or_null(public.cultural_event_translations)'::text),
      ('private.cultural_event_image_translation_fingerprint_or_null(public.cultural_event_image_translations)'::text),
      ('private.enforce_cultural_event_source_revision()'::text),
      ('private.enforce_cultural_event_image_revision()'::text),
      ('private.enforce_cultural_event_translation_write()'::text),
      ('private.reject_cultural_event_translation_event_mutation()'::text),
      ('private.cultural_event_current_primary_image(public.cultural_events)'::text),
      ('private.cultural_event_source_is_eligible(public.cultural_events)'::text),
      ('private.cultural_event_translation_content_is_complete(public.cultural_events, public.cultural_event_translations)'::text),
      ('private.cultural_event_image_translation_content_is_complete(public.cultural_event_images, public.cultural_event_image_translations)'::text),
      ('private.cultural_event_image_translation_is_eligible(public.cultural_events, public.cultural_event_images, public.cultural_event_image_translations)'::text),
      ('private.cultural_event_translation_is_eligible(public.cultural_events, public.cultural_event_translations)'::text),
      ('private.record_cultural_event_translation_event(public.cultural_event_translations, public.cultural_event_translations, text, uuid, bigint, text, text, text, text)'::text),
      ('private.record_cultural_event_image_translation_event(public.cultural_event_image_translations, public.cultural_event_image_translations, text, uuid, bigint, text, text, text)'::text),
      ('private.cultural_event_mark_parent_thumbnail_stale(uuid, uuid)'::text),
      ('private.cultural_event_source_cascade()'::text),
      ('private.cultural_event_image_media_cascade()'::text),
      ('private.cultural_event_translation_admin_derived_state(public.cultural_events, public.cultural_event_translations)'::text),
      ('private.cultural_event_image_translation_admin_derived_state(public.cultural_events, public.cultural_event_images, public.cultural_event_image_translations)'::text),
      ('private.lock_cultural_event_translation(uuid)'::text),
      ('private.lock_cultural_event_image_translation(uuid)'::text),
      ('private.lock_cultural_event_image(uuid)'::text),
      ('private.cultural_event_translation_publish_transition(uuid, bigint, boolean)'::text),
      ('private.cultural_event_translation_simple_transition(uuid, bigint, text)'::text),
      ('private.cultural_event_image_source_is_eligible(public.cultural_events, public.cultural_event_images)'::text),
      ('private.cultural_event_image_translation_publish_transition(uuid, bigint, boolean)'::text),
      ('private.cultural_event_image_translation_simple_transition(uuid, bigint, text)'::text),
      ('private.refresh_cultural_event_freshness()'::text)
    ) as functions(signature)
  loop
    execute format('revoke all on function %s from public, anon, authenticated', l_function.signature);
  end loop;
end;
$$;

do $$
declare
  l_signature text;
begin
  foreach l_signature in array array[
    'public.cultural_event_translation_admin_read(uuid)',
    'public.cultural_event_image_translation_admin_read(uuid)',
    'public.cultural_event_translation_review_history(uuid)',
    'public.cultural_event_image_translation_review_history(uuid)',
    'public.cultural_event_translation_save_draft(uuid, bigint, text, text, text, text, text, text, text, text, text)',
    'public.cultural_event_translation_review(uuid, bigint, boolean)',
    'public.cultural_event_translation_reject(uuid, bigint, text)',
    'public.cultural_event_translation_publish(uuid, bigint)',
    'public.cultural_event_translation_republish(uuid, bigint)',
    'public.cultural_event_translation_archive(uuid, bigint)',
    'public.cultural_event_translation_unpublish(uuid, bigint)',
    'public.cultural_event_translation_restore(uuid, bigint)',
    'public.cultural_event_image_translation_save_draft(uuid, bigint, text, text)',
    'public.cultural_event_image_translation_review(uuid, bigint, boolean)',
    'public.cultural_event_image_translation_reject(uuid, bigint, text)',
    'public.cultural_event_image_translation_publish(uuid, bigint)',
    'public.cultural_event_image_translation_republish(uuid, bigint)',
    'public.cultural_event_image_translation_archive(uuid, bigint)',
    'public.cultural_event_image_translation_unpublish(uuid, bigint)',
    'public.cultural_event_image_translation_restore(uuid, bigint)'
  ] loop
    execute format('alter function %s owner to postgres', l_signature);
    execute format('revoke all on function %s from public, anon, authenticated', l_signature);
    execute format('grant execute on function %s to authenticated', l_signature);
  end loop;
end;
$$;

commit;
