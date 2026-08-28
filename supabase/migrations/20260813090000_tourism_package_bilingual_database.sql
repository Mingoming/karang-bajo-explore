-- Phase 3F Tourism Package bilingual database contract.
-- English package publication is fail-closed at the database boundary.  This
-- migration deliberately adds no route, loader, admin UI, map, or SEO work.

alter table public.tourism_packages
  add column aggregate_revision bigint not null default 1,
  add constraint tourism_packages_aggregate_revision_positive
    check (aggregate_revision > 0);

alter table public.package_images
  add column binary_revision bigint not null default 1,
  add column updated_at timestamptz,
  add column updated_by uuid references auth.users (id) on delete restrict,
  add constraint package_images_binary_revision_positive
    check (binary_revision > 0);

update public.package_images
set updated_at = created_at,
    updated_by = created_by
where updated_at is null
   or updated_by is null;

alter table public.package_images
  alter column updated_at set default statement_timestamp(),
  alter column updated_at set not null,
  alter column updated_by set not null;

comment on column public.tourism_packages.aggregate_revision is
  'Database-owned positive revision for the package semantic aggregate, including ordered destination relationships.';
comment on column public.package_images.binary_revision is
  'Database-owned revision for package image storage and source metadata changes.';

create table public.tourism_package_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  tourism_package_id uuid not null
    constraint tourism_package_translations_package_fk
    references public.tourism_packages (id) on delete restrict,
  locale text not null default 'en',
  name text,
  duration_unit text,
  price_note text,
  included_facilities text[] not null default '{}'::text[],
  souvenir text,
  summary text,
  description text,
  translation_status public.publication_status not null default 'draft',
  review_state text not null default 'pending',
  captured_source_revision bigint,
  captured_source_token text,
  captured_relationship_revision bigint,
  captured_relationship_token text,
  captured_thumbnail_media_fingerprint text,
  translation_fingerprint text,
  contract_version text not null default 'tourism-package-v1',
  terminology_review_confirmed boolean not null default false,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  review_reason text,
  rejected_at timestamptz,
  rejected_by uuid references auth.users (id) on delete restrict,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  archived_at timestamptz,
  edit_revision bigint not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint tourism_package_translations_locale_check
    check (locale = 'en'),
  constraint tourism_package_translations_review_state_check
    check (review_state in ('pending', 'reviewed', 'rejected')),
  constraint tourism_package_translations_contract_check
    check (contract_version = 'tourism-package-v1'),
  constraint tourism_package_translations_facilities_valid
    check (private.fingerprint_text_array_is_valid(included_facilities)),
  constraint tourism_package_translations_review_metadata_check
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
  constraint tourism_package_translations_review_checkpoint_check
    check (
      (review_state = 'reviewed'
        and captured_source_revision is not null
        and captured_source_revision > 0
        and captured_source_token is not null
        and captured_relationship_revision is not null
        and captured_relationship_revision > 0
        and captured_relationship_token is not null
        and captured_thumbnail_media_fingerprint is not null
        and translation_fingerprint is not null)
      or (review_state <> 'reviewed'
        and captured_source_revision is null
        and captured_source_token is null
        and captured_relationship_revision is null
        and captured_relationship_token is null
        and captured_thumbnail_media_fingerprint is null
        and translation_fingerprint is null)
    ),
  constraint tourism_package_translations_rejection_metadata_check
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
  constraint tourism_package_translations_publication_metadata_check
    check (
      translation_status <> 'published'::public.publication_status
      or (published_at is not null and published_by is not null)
    ),
  constraint tourism_package_translations_publication_state_check
    check (
      translation_status <> 'published'::public.publication_status
      or (review_state = 'reviewed' and archived_at is null)
    ),
  constraint tourism_package_translations_rejected_state_check
    check (
      review_state <> 'rejected'
      or translation_status = 'draft'::public.publication_status
    ),
  constraint tourism_package_translations_archived_state_check
    check (
      translation_status <> 'archived'::public.publication_status
      or review_state = 'pending'
    ),
  constraint tourism_package_translations_archive_metadata_check
    check (
      (translation_status = 'archived'::public.publication_status)
        = (archived_at is not null)
    ),
  constraint tourism_package_translations_edit_revision_check
    check (edit_revision > 0),
  constraint tourism_package_translations_source_locale_key
    unique (tourism_package_id, locale)
);

create table public.tourism_package_image_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  package_image_id uuid not null
    constraint tourism_package_image_translations_image_fk
    references public.package_images (id) on delete restrict,
  locale text not null default 'en',
  alt_text text,
  caption text,
  translation_status public.publication_status not null default 'draft',
  review_state text not null default 'pending',
  captured_media_fingerprint text,
  translation_fingerprint text,
  contract_version text not null default 'tourism-package-media-v1',
  terminology_review_confirmed boolean not null default false,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete restrict,
  review_reason text,
  rejected_at timestamptz,
  rejected_by uuid references auth.users (id) on delete restrict,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete restrict,
  archived_at timestamptz,
  edit_revision bigint not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint tourism_package_image_translations_locale_check
    check (locale = 'en'),
  constraint tourism_package_image_translations_review_state_check
    check (review_state in ('pending', 'reviewed', 'rejected')),
  constraint tourism_package_image_translations_contract_check
    check (contract_version = 'tourism-package-media-v1'),
  constraint tourism_package_image_translations_review_metadata_check
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
  constraint tourism_package_image_translations_review_checkpoint_check
    check (
      (review_state = 'reviewed'
        and captured_media_fingerprint is not null
        and translation_fingerprint is not null)
      or (review_state <> 'reviewed'
        and captured_media_fingerprint is null
        and translation_fingerprint is null)
    ),
  constraint tourism_package_image_translations_rejection_metadata_check
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
  constraint tourism_package_image_translations_publication_metadata_check
    check (
      translation_status <> 'published'::public.publication_status
      or (published_at is not null and published_by is not null)
    ),
  constraint tourism_package_image_translations_publication_state_check
    check (
      translation_status <> 'published'::public.publication_status
      or (review_state = 'reviewed' and archived_at is null)
    ),
  constraint tourism_package_image_translations_rejected_state_check
    check (
      review_state <> 'rejected'
      or translation_status = 'draft'::public.publication_status
    ),
  constraint tourism_package_image_translations_archived_state_check
    check (
      translation_status <> 'archived'::public.publication_status
      or review_state = 'pending'
    ),
  constraint tourism_package_image_translations_archive_metadata_check
    check (
      (translation_status = 'archived'::public.publication_status)
        = (archived_at is not null)
    ),
  constraint tourism_package_image_translations_edit_revision_check
    check (edit_revision > 0),
  constraint tourism_package_image_translations_source_locale_key
    unique (package_image_id, locale)
);

create table public.tourism_package_translation_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  tourism_package_translation_id uuid not null
    constraint tourism_package_translation_events_translation_fk
    references public.tourism_package_translations (id) on delete restrict,
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
  source_token text not null,
  relationship_revision bigint not null check (relationship_revision > 0),
  relationship_token text not null,
  thumbnail_media_fingerprint text,
  translation_fingerprint text,
  terminology_review_confirmed boolean not null default false,
  reason text,
  constraint tourism_package_translation_events_states_check
    check (
      previous_review_state in ('pending', 'reviewed', 'rejected')
      and new_review_state in ('pending', 'reviewed', 'rejected')
    ),
  constraint tourism_package_translation_events_reason_check
    check (
      (event_type in ('rejected', 'source_blocked')
        and pg_catalog.btrim(coalesce(reason, '')) <> '')
      or (event_type not in ('rejected', 'source_blocked') and reason is null)
    )
);

create table public.tourism_package_image_translation_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  tourism_package_image_translation_id uuid not null
    constraint tourism_package_image_translation_events_translation_fk
    references public.tourism_package_image_translations (id) on delete restrict,
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
  constraint tourism_package_image_translation_events_states_check
    check (
      previous_review_state in ('pending', 'reviewed', 'rejected')
      and new_review_state in ('pending', 'reviewed', 'rejected')
    ),
  constraint tourism_package_image_translation_events_reason_check
    check (
      (event_type = 'rejected'
        and pg_catalog.btrim(coalesce(reason, '')) <> '')
      or (event_type <> 'rejected' and reason is null)
    )
);

create index tourism_package_translations_public_lookup_idx
  on public.tourism_package_translations (tourism_package_id, locale)
  where translation_status = 'published'::public.publication_status
    and review_state = 'reviewed';
create index tourism_package_translations_admin_queue_idx
  on public.tourism_package_translations (review_state, translation_status, updated_at desc);
create index tourism_package_image_translations_public_lookup_idx
  on public.tourism_package_image_translations (package_image_id, locale)
  where translation_status = 'published'::public.publication_status
    and review_state = 'reviewed';
create index tourism_package_translation_events_history_idx
  on public.tourism_package_translation_review_events
    (tourism_package_translation_id, occurred_at desc, id desc);
create index tourism_package_image_translation_events_history_idx
  on public.tourism_package_image_translation_review_events
    (tourism_package_image_translation_id, occurred_at desc, id desc);

create or replace function private.tourism_package_source_token_v1(
  p_source public.tourism_packages
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if p_source.id is null or p_source.aggregate_revision is null
    or p_source.aggregate_revision <= 0 then
    raise exception using errcode = '23514', message = 'tourism package source token is invalid';
  end if;
  return 'tourism-package-source-v1:'
    || pg_catalog.lower(p_source.id::text)
    || ':' || p_source.aggregate_revision::text;
end;
$$;

create or replace function private.tourism_package_relationship_token_v1(
  p_source public.tourism_packages
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if p_source.id is null or p_source.aggregate_revision is null
    or p_source.aggregate_revision <= 0 then
    raise exception using errcode = '23514', message = 'tourism package relationship token is invalid';
  end if;
  return 'tourism-package-relationship-v1:'
    || pg_catalog.lower(p_source.id::text)
    || ':' || p_source.aggregate_revision::text;
end;
$$;

create or replace function private.tourism_package_translation_fingerprint_v1(
  p_translation public.tourism_package_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('tourism-package-translation-v1', array[
    'version', private.fingerprint_json_string('tourism-package-translation-v1'),
    'name', private.fingerprint_json_text_value(p_translation.name, true),
    'duration_unit', private.fingerprint_json_text_value(p_translation.duration_unit, true),
    'price_note', private.fingerprint_json_text_value(p_translation.price_note, false),
    'included_facilities', private.fingerprint_json_text_array_value(p_translation.included_facilities),
    'souvenir', private.fingerprint_json_text_value(p_translation.souvenir, false),
    'summary', private.fingerprint_json_text_value(p_translation.summary, false),
    'description', private.fingerprint_json_text_value(p_translation.description, true)
  ]);
end;
$$;

create or replace function private.tourism_package_image_translation_fingerprint_v1(
  p_translation public.tourism_package_image_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('tourism-package-media-translation-v1', array[
    'version', private.fingerprint_json_string('tourism-package-media-translation-v1'),
    'alt_text', private.fingerprint_json_text_value(p_translation.alt_text, true),
    'caption', private.fingerprint_json_text_value(p_translation.caption, false)
  ]);
end;
$$;

create or replace function private.tourism_package_image_media_fingerprint_v1(
  p_image public.package_images
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('tourism-package-media-v1', array[
    'version', private.fingerprint_json_string('tourism-package-media-v1'),
    'package_image_id', private.fingerprint_json_uuid_value(p_image.id, true),
    'storage_bucket', private.fingerprint_json_text_value(p_image.storage_bucket, true),
    'storage_path', private.fingerprint_json_text_value(p_image.storage_path, true),
    'caption', private.fingerprint_json_text_value(p_image.caption, false),
    'alt_text', private.fingerprint_json_text_value(p_image.alt_text, true),
    'binary_revision', private.fingerprint_json_bigint_value(p_image.binary_revision)
  ]);
end;
$$;

create or replace function private.tourism_package_thumbnail_media_fingerprint_v1(
  p_source public.tourism_packages,
  p_primary_image public.package_images
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
      private.tourism_package_image_media_fingerprint_v1(p_primary_image);
  end if;
  return private.fingerprint_sha256_v1('tourism-package-thumbnail-media-v1', array[
    'version', private.fingerprint_json_string('tourism-package-thumbnail-media-v1'),
    'tourism_package_id', private.fingerprint_json_uuid_value(p_source.id, true),
    'thumbnail_bucket', private.fingerprint_json_text_value(p_source.thumbnail_bucket, false),
    'thumbnail_path', private.fingerprint_json_text_value(p_source.thumbnail_path, false),
    'primary_image_id', private.fingerprint_json_uuid_value(p_primary_image.id, false),
    'primary_image_media_fingerprint', private.fingerprint_json_text_value(l_primary_media_fingerprint, false)
  ]);
end;
$$;

alter function private.tourism_package_source_token_v1(public.tourism_packages) owner to postgres;
alter function private.tourism_package_relationship_token_v1(public.tourism_packages) owner to postgres;
alter function private.tourism_package_translation_fingerprint_v1(public.tourism_package_translations) owner to postgres;
alter function private.tourism_package_image_translation_fingerprint_v1(public.tourism_package_image_translations) owner to postgres;
alter function private.tourism_package_image_media_fingerprint_v1(public.package_images) owner to postgres;
alter function private.tourism_package_thumbnail_media_fingerprint_v1(public.tourism_packages, public.package_images) owner to postgres;
revoke all on function private.tourism_package_source_token_v1(public.tourism_packages) from public, anon, authenticated;
revoke all on function private.tourism_package_relationship_token_v1(public.tourism_packages) from public, anon, authenticated;
revoke all on function private.tourism_package_translation_fingerprint_v1(public.tourism_package_translations) from public, anon, authenticated;
revoke all on function private.tourism_package_image_translation_fingerprint_v1(public.tourism_package_image_translations) from public, anon, authenticated;
revoke all on function private.tourism_package_image_media_fingerprint_v1(public.package_images) from public, anon, authenticated;
revoke all on function private.tourism_package_thumbnail_media_fingerprint_v1(public.tourism_packages, public.package_images) from public, anon, authenticated;

create or replace function private.enforce_tourism_package_aggregate_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_internal boolean := pg_catalog.current_setting('tourism_package.aggregate_revision_workflow', true) = 'on';
  l_deferred boolean := pg_catalog.current_setting('tourism_package.aggregate_revision_deferred', true) = 'on';
  l_semantic_change boolean;
begin
  if tg_op = 'INSERT' then
    if new.aggregate_revision is distinct from 1 then
      raise exception using errcode = '42501', message = 'tourism package aggregate revision is database managed';
    end if;
    new.aggregate_revision := 1;
    return new;
  end if;

  if new.aggregate_revision is distinct from old.aggregate_revision then
    if not l_internal
      or old.aggregate_revision = 9223372036854775807
      or new.aggregate_revision <> old.aggregate_revision + 1 then
      raise exception using errcode = '42501', message = 'tourism package aggregate revision is database managed';
    end if;
    return new;
  end if;

  l_semantic_change := new.name is distinct from old.name
    or new.package_type is distinct from old.package_type
    or new.duration_value is distinct from old.duration_value
    or new.duration_unit is distinct from old.duration_unit
    or new.price is distinct from old.price
    or new.price_note is distinct from old.price_note
    or new.included_facilities is distinct from old.included_facilities
    or new.souvenir is distinct from old.souvenir
    or new.summary is distinct from old.summary
    or new.description is distinct from old.description
    or new.thumbnail_path is distinct from old.thumbnail_path
    or new.thumbnail_bucket is distinct from old.thumbnail_bucket
    or new.is_featured is distinct from old.is_featured
    or new.display_order is distinct from old.display_order;

  if l_deferred then
    return new;
  end if;
  if l_semantic_change then
    if old.aggregate_revision = 9223372036854775807 then
      raise exception using errcode = '22003', message = 'tourism package aggregate revision overflow';
    end if;
    new.aggregate_revision := old.aggregate_revision + 1;
  end if;
  return new;
end;
$$;

create trigger tourism_packages_aggregate_revision_trigger
before insert or update on public.tourism_packages
for each row execute function private.enforce_tourism_package_aggregate_revision();

create or replace function private.bump_tourism_package_aggregate_revision(
  p_package_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_revision bigint;
begin
  select package.aggregate_revision
    into l_revision
  from public.tourism_packages as package
  where package.id = p_package_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'tourism package not found';
  end if;
  if l_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package aggregate revision overflow';
  end if;
  perform pg_catalog.set_config('tourism_package.aggregate_revision_workflow', 'on', true);
  update public.tourism_packages
  set aggregate_revision = l_revision + 1
  where id = p_package_id;
  perform pg_catalog.set_config('tourism_package.aggregate_revision_workflow', 'off', true);
  return l_revision + 1;
end;
$$;

alter function private.enforce_tourism_package_aggregate_revision() owner to postgres;
alter function private.bump_tourism_package_aggregate_revision(uuid) owner to postgres;
revoke all on function private.enforce_tourism_package_aggregate_revision() from public, anon, authenticated;
revoke all on function private.bump_tourism_package_aggregate_revision(uuid) from public, anon, authenticated;

create or replace function private.enforce_tourism_package_image_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
begin
  if l_actor is null then
    raise exception using errcode = '42501', message = 'tourism package image actor is required';
  end if;
  if tg_op = 'INSERT' then
    if new.binary_revision is distinct from 1 then
      raise exception using errcode = '42501', message = 'tourism package image revision is database managed';
    end if;
    new.binary_revision := 1;
    new.updated_at := pg_catalog.statement_timestamp();
    new.updated_by := l_actor;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.package_id is distinct from old.package_id
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
    or new.binary_revision is distinct from old.binary_revision then
    raise exception using errcode = '42501', message = 'tourism package image revision is database managed';
  end if;
  if old.binary_revision = 9223372036854775807
    and (new.storage_bucket is distinct from old.storage_bucket
      or new.storage_path is distinct from old.storage_path
      or new.caption is distinct from old.caption
      or new.alt_text is distinct from old.alt_text) then
    raise exception using errcode = '22003', message = 'tourism package image revision overflow';
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

create trigger package_images_revision_trigger
before insert or update on public.package_images
for each row execute function private.enforce_tourism_package_image_revision();

alter function private.enforce_tourism_package_image_revision() owner to postgres;
revoke all on function private.enforce_tourism_package_image_revision() from public, anon, authenticated;

-- Source package writes remain behind the existing transactional RPCs.  The
-- two deferral settings make a complete relationship replacement one logical
-- aggregate mutation; direct trusted relationship DML still uses the trigger.
create or replace function public.tourism_package_create(
  p_name text,
  p_slug text,
  p_package_type public.package_type,
  p_duration_value integer,
  p_duration_unit text,
  p_price numeric,
  p_price_note text,
  p_included_facilities text[],
  p_souvenir text,
  p_summary text,
  p_description text,
  p_is_featured boolean,
  p_display_order integer,
  p_status public.publication_status,
  p_destinations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  created_package_id uuid;
begin
  if caller_id is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'administrator authorization required';
  end if;
  if btrim(coalesce(p_name, '')) = ''
    or btrim(coalesce(p_slug, '')) = ''
    or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_package_type is null
    or p_duration_value is null
    or p_duration_value <= 0
    or btrim(coalesce(p_duration_unit, '')) = ''
    or p_price < 0
    or btrim(coalesce(p_description, '')) = ''
    or p_display_order is null
    or p_display_order < 0
    or p_status <> 'draft'::public.publication_status then
    raise exception using
      errcode = '23514',
      message = 'invalid tourism package data';
  end if;

  perform pg_catalog.set_config('tourism_package.aggregate_revision_deferred', 'on', true);
  perform pg_catalog.set_config('tourism_package.relationship_revision_deferred', 'on', true);
  perform pg_catalog.set_config('tourism_package.cascade_deferred', 'on', true);

  perform *
  from private.validate_tourism_package_destinations(p_destinations, false);

  insert into public.tourism_packages (
    name,
    slug,
    package_type,
    duration_value,
    duration_unit,
    price,
    price_note,
    included_facilities,
    souvenir,
    summary,
    description,
    is_featured,
    display_order,
    status,
    created_by,
    updated_by
  )
  values (
    btrim(p_name),
    p_slug,
    p_package_type,
    p_duration_value,
    btrim(p_duration_unit),
    p_price,
    nullif(btrim(coalesce(p_price_note, '')), ''),
    coalesce(p_included_facilities, '{}'::text[]),
    nullif(btrim(coalesce(p_souvenir, '')), ''),
    nullif(btrim(coalesce(p_summary, '')), ''),
    btrim(p_description),
    coalesce(p_is_featured, false),
    p_display_order,
    p_status,
    caller_id,
    caller_id
  )
  returning id into created_package_id;

  insert into public.package_destinations (
    package_id,
    destination_id,
    display_order,
    notes,
    created_by
  )
  select
    created_package_id,
    item.destination_id,
    item.display_order,
    item.notes,
    caller_id
  from private.validate_tourism_package_destinations(p_destinations, false) as item;

  perform pg_catalog.set_config('tourism_package.aggregate_revision_deferred', 'off', true);
  perform pg_catalog.set_config('tourism_package.relationship_revision_deferred', 'off', true);
  perform pg_catalog.set_config('tourism_package.cascade_deferred', 'off', true);
  return created_package_id;
end;
$$;

create or replace function public.tourism_package_update(
  p_package_id uuid,
  p_name text,
  p_package_type public.package_type,
  p_duration_value integer,
  p_duration_unit text,
  p_price numeric,
  p_price_note text,
  p_included_facilities text[],
  p_souvenir text,
  p_summary text,
  p_description text,
  p_is_featured boolean,
  p_display_order integer,
  p_status public.publication_status,
  p_destinations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  existing_package public.tourism_packages%rowtype;
  current_destinations jsonb;
  submitted_destinations jsonb := coalesce(p_destinations, '[]'::jsonb);
  relations_changed boolean;
  parent_changed boolean;
  cascade_needed boolean;
begin
  if caller_id is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'administrator authorization required';
  end if;
  if p_package_id is null
    or btrim(coalesce(p_name, '')) = ''
    or p_package_type is null
    or p_duration_value is null
    or p_duration_value <= 0
    or btrim(coalesce(p_duration_unit, '')) = ''
    or p_price < 0
    or btrim(coalesce(p_description, '')) = ''
    or p_display_order is null
    or p_display_order < 0
    or p_status is null then
    raise exception using
      errcode = '23514',
      message = 'invalid tourism package data';
  end if;

  select package.*
  into existing_package
  from public.tourism_packages as package
  where package.id = p_package_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'tourism package not found';
  end if;

  perform *
  from private.validate_tourism_package_destinations(
    submitted_destinations,
    p_status = 'published'::public.publication_status
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'destination_id', item.destination_id::text,
        'display_order', item.display_order,
        'notes', item.notes
      )
      order by item.display_order, item.destination_id
    ),
    '[]'::jsonb
  )
  into submitted_destinations
  from private.validate_tourism_package_destinations(
    submitted_destinations,
    p_status = 'published'::public.publication_status
  ) as item;

  if p_status = 'published'::public.publication_status
    and jsonb_array_length(submitted_destinations) = 0 then
    raise exception using
      errcode = '23514',
      message = 'published tourism package requires a destination';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'destination_id', relation.destination_id::text,
        'display_order', relation.display_order,
        'notes', relation.notes
      )
      order by relation.display_order, relation.destination_id
    ),
    '[]'::jsonb
  )
  into current_destinations
  from public.package_destinations as relation
  where relation.package_id = p_package_id;

  perform relation.id
  from public.package_destinations as relation
  where relation.package_id = p_package_id
  for update;

  relations_changed := current_destinations is distinct from submitted_destinations;
  if existing_package.status <> 'draft'::public.publication_status and relations_changed then
    raise exception using
      errcode = '23514',
      message = 'tourism package destinations are editable only in draft';
  end if;

  parent_changed := existing_package.name is distinct from btrim(p_name)
    or existing_package.package_type is distinct from p_package_type
    or existing_package.duration_value is distinct from p_duration_value
    or existing_package.duration_unit is distinct from btrim(p_duration_unit)
    or existing_package.price is distinct from p_price
    or existing_package.price_note is distinct from nullif(btrim(coalesce(p_price_note, '')), '')
    or existing_package.included_facilities is distinct from coalesce(p_included_facilities, '{}'::text[])
    or existing_package.souvenir is distinct from nullif(btrim(coalesce(p_souvenir, '')), '')
    or existing_package.summary is distinct from nullif(btrim(coalesce(p_summary, '')), '')
    or existing_package.description is distinct from btrim(p_description)
    or existing_package.is_featured is distinct from coalesce(p_is_featured, false)
    or existing_package.display_order is distinct from p_display_order;
  cascade_needed := parent_changed
    or relations_changed
    or existing_package.status is distinct from p_status;

  perform pg_catalog.set_config('tourism_package.aggregate_revision_deferred', 'on', true);
  perform pg_catalog.set_config('tourism_package.relationship_revision_deferred', 'on', true);
  perform pg_catalog.set_config('tourism_package.cascade_deferred', 'on', true);

  if relations_changed then
    delete from public.package_destinations
    where package_id = p_package_id;

    insert into public.package_destinations (
      package_id,
      destination_id,
      display_order,
      notes,
      created_by
    )
    select
      p_package_id,
      item.destination_id,
      item.display_order,
      item.notes,
      caller_id
    from private.validate_tourism_package_destinations(
      submitted_destinations,
      p_status = 'published'::public.publication_status
    ) as item;
  end if;

  update public.tourism_packages
  set name = btrim(p_name),
      package_type = p_package_type,
      duration_value = p_duration_value,
      duration_unit = btrim(p_duration_unit),
      price = p_price,
      price_note = nullif(btrim(coalesce(p_price_note, '')), ''),
      included_facilities = coalesce(p_included_facilities, '{}'::text[]),
      souvenir = nullif(btrim(coalesce(p_souvenir, '')), ''),
      summary = nullif(btrim(coalesce(p_summary, '')), ''),
      description = btrim(p_description),
      is_featured = coalesce(p_is_featured, false),
      display_order = p_display_order,
      status = p_status,
      updated_by = caller_id
  where id = p_package_id;

  if parent_changed or relations_changed then
    perform private.bump_tourism_package_aggregate_revision(p_package_id);
  end if;
  if cascade_needed then
    perform private.tourism_package_translation_source_cascade(p_package_id);
  end if;
  perform pg_catalog.set_config('tourism_package.aggregate_revision_deferred', 'off', true);
  perform pg_catalog.set_config('tourism_package.relationship_revision_deferred', 'off', true);
  perform pg_catalog.set_config('tourism_package.cascade_deferred', 'off', true);
  return p_package_id;
end;
$$;

alter function public.tourism_package_create(text, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) owner to postgres;
alter function public.tourism_package_update(uuid, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) owner to postgres;
revoke all on function public.tourism_package_create(text, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) from public, anon, authenticated;
revoke all on function public.tourism_package_update(uuid, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) from public, anon, authenticated;
grant execute on function public.tourism_package_create(text, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) to authenticated;
grant execute on function public.tourism_package_update(uuid, text, public.package_type, integer, text, numeric, text, text[], text, text, text, boolean, integer, public.publication_status, jsonb) to authenticated;

create or replace function private.tourism_package_translation_fingerprint_or_null(
  p_translation public.tourism_package_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.tourism_package_translation_fingerprint_v1(p_translation);
exception when others then
  return null;
end;
$$;

create or replace function private.tourism_package_image_translation_fingerprint_or_null(
  p_translation public.tourism_package_image_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.tourism_package_image_translation_fingerprint_v1(p_translation);
exception when others then
  return null;
end;
$$;

create or replace function private.tourism_package_image_media_fingerprint_or_null(
  p_image public.package_images
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.tourism_package_image_media_fingerprint_v1(p_image);
exception when others then
  return null;
end;
$$;

create or replace function private.tourism_package_thumbnail_media_fingerprint_or_null(
  p_source public.tourism_packages,
  p_primary_image public.package_images
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.tourism_package_thumbnail_media_fingerprint_v1(p_source, p_primary_image);
exception when others then
  return null;
end;
$$;

alter function private.tourism_package_translation_fingerprint_or_null(public.tourism_package_translations) owner to postgres;
alter function private.tourism_package_image_translation_fingerprint_or_null(public.tourism_package_image_translations) owner to postgres;
alter function private.tourism_package_image_media_fingerprint_or_null(public.package_images) owner to postgres;
alter function private.tourism_package_thumbnail_media_fingerprint_or_null(public.tourism_packages, public.package_images) owner to postgres;
revoke all on function private.tourism_package_translation_fingerprint_or_null(public.tourism_package_translations) from public, anon, authenticated;
revoke all on function private.tourism_package_image_translation_fingerprint_or_null(public.tourism_package_image_translations) from public, anon, authenticated;
revoke all on function private.tourism_package_image_media_fingerprint_or_null(public.package_images) from public, anon, authenticated;
revoke all on function private.tourism_package_thumbnail_media_fingerprint_or_null(public.tourism_packages, public.package_images) from public, anon, authenticated;

create or replace function private.tourism_package_current_primary_image(
  p_source public.tourism_packages
)
returns public.package_images
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_primary public.package_images;
  l_primary_count bigint;
begin
  if p_source.id is null then
    return null;
  end if;
  select count(*)
    into l_primary_count
  from public.package_images as image
  where image.package_id = p_source.id
    and image.is_primary;
  if l_primary_count <> 1 then
    return null;
  end if;
  select image.*
    into l_primary
  from public.package_images as image
  where image.package_id = p_source.id
    and image.is_primary;
  if not found
    or l_primary.storage_bucket is distinct from p_source.thumbnail_bucket
    or l_primary.storage_path is distinct from p_source.thumbnail_path then
    return null;
  end if;
  return l_primary;
end;
$$;

create or replace function private.tourism_package_source_is_eligible(
  p_source public.tourism_packages
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_primary public.package_images;
  l_relation_count bigint;
  l_published_relation_count bigint;
begin
  if p_source.id is null
    or p_source.status <> 'published'::public.publication_status
    or p_source.published_at is null
    or pg_catalog.btrim(coalesce(p_source.name, '')) = ''
    or pg_catalog.btrim(coalesce(p_source.slug, '')) = ''
    or p_source.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_source.package_type is null
    or p_source.duration_value is null
    or p_source.duration_value <= 0
    or pg_catalog.btrim(coalesce(p_source.duration_unit, '')) = ''
    or (p_source.price is not null and p_source.price::text in ('NaN', 'Infinity', '-Infinity'))
    or not private.fingerprint_text_array_is_valid(p_source.included_facilities)
    or p_source.thumbnail_bucket <> 'tourism-media'
    or p_source.thumbnail_path !~ ('^tourism-package/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$') then
    return false;
  end if;

  l_primary := private.tourism_package_current_primary_image(p_source);
  if l_primary.id is null
    or l_primary.storage_bucket <> 'tourism-media'
    or l_primary.storage_path !~ ('^tourism-package/' || p_source.id::text || '/' || l_primary.id::text || '\.(jpg|png|webp)$')
    or pg_catalog.btrim(coalesce(l_primary.alt_text, '')) = ''
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = l_primary.storage_bucket
        and object.name = l_primary.storage_path
    ) then
    return false;
  end if;

  select count(*)
    into l_relation_count
  from public.package_destinations as relation
  where relation.package_id = p_source.id;
  select count(*)
    into l_published_relation_count
  from public.package_destinations as relation
  join public.destinations as destination
    on destination.id = relation.destination_id
  where relation.package_id = p_source.id
    and destination.status = 'published'::public.publication_status;
  return l_relation_count > 0 and l_relation_count = l_published_relation_count;
exception when others then
  return false;
end;
$$;

create or replace function private.tourism_package_translation_content_is_complete(
  p_source public.tourism_packages,
  p_translation public.tourism_package_translations
)
returns boolean
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  l_index integer;
  l_source_value text;
  l_translation_value text;
begin
  if p_source.id is null
    or p_translation.id is null
    or p_translation.tourism_package_id <> p_source.id
    or p_translation.locale is distinct from 'en'
    or pg_catalog.btrim(coalesce(p_translation.name, '')) = ''
    or pg_catalog.btrim(coalesce(p_translation.duration_unit, '')) = ''
    or pg_catalog.btrim(coalesce(p_translation.description, '')) = ''
    or not private.fingerprint_text_array_is_valid(p_source.included_facilities)
    or not private.fingerprint_text_array_is_valid(p_translation.included_facilities)
    or pg_catalog.cardinality(p_source.included_facilities) <> pg_catalog.cardinality(p_translation.included_facilities) then
    return false;
  end if;

  foreach l_source_value in array p_source.included_facilities loop
    l_index := coalesce(l_index, 0) + 1;
    l_translation_value := p_translation.included_facilities[l_index];
    if l_source_value is null
      or l_translation_value is null
      or private.fingerprint_normalize_text(l_translation_value) = '' then
      return false;
    end if;
  end loop;

  if (private.fingerprint_normalize_text(p_source.price_note) is null
      or private.fingerprint_normalize_text(p_source.price_note) = '')
     <> (private.fingerprint_normalize_text(p_translation.price_note) is null
      or private.fingerprint_normalize_text(p_translation.price_note) = '') then
    return false;
  end if;
  if (private.fingerprint_normalize_text(p_source.souvenir) is null
      or private.fingerprint_normalize_text(p_source.souvenir) = '')
     <> (private.fingerprint_normalize_text(p_translation.souvenir) is null
      or private.fingerprint_normalize_text(p_translation.souvenir) = '') then
    return false;
  end if;
  if (private.fingerprint_normalize_text(p_source.summary) is null
      or private.fingerprint_normalize_text(p_source.summary) = '')
     <> (private.fingerprint_normalize_text(p_translation.summary) is null
      or private.fingerprint_normalize_text(p_translation.summary) = '') then
    return false;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.tourism_package_image_translation_content_is_complete(
  p_image public.package_images,
  p_translation public.tourism_package_image_translations
)
returns boolean
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  l_source_caption text := private.fingerprint_normalize_text(p_image.caption);
  l_translation_caption text := private.fingerprint_normalize_text(p_translation.caption);
begin
  return p_image.id is not null
    and p_translation.id is not null
    and p_translation.package_image_id = p_image.id
    and p_translation.locale = 'en'
    and pg_catalog.btrim(coalesce(p_image.alt_text, '')) <> ''
    and pg_catalog.btrim(coalesce(p_translation.alt_text, '')) <> ''
    and (
      (l_source_caption is null or l_source_caption = '')
        and (l_translation_caption is null or l_translation_caption = '')
      or (l_source_caption is not null and l_source_caption <> '')
        and (l_translation_caption is null or l_translation_caption <> '')
    );
exception when others then
  return false;
end;
$$;

create or replace function private.tourism_package_image_translation_is_eligible(
  p_source public.tourism_packages,
  p_image public.package_images,
  p_translation public.tourism_package_image_translations
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if p_source.id is null
    or p_source.status <> 'published'::public.publication_status
    or p_image.package_id <> p_source.id
    or p_image.storage_bucket <> 'tourism-media'
    or p_image.storage_path !~ ('^tourism-package/' || p_source.id::text || '/' || p_image.id::text || '\.(jpg|png|webp)$')
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = p_image.storage_bucket
        and object.name = p_image.storage_path
    )
    or not private.tourism_package_image_translation_content_is_complete(p_image, p_translation)
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or p_translation.archived_at is not null
    or not p_translation.terminology_review_confirmed then
    return false;
  end if;
  l_media_fingerprint := private.tourism_package_image_media_fingerprint_or_null(p_image);
  l_translation_fingerprint := private.tourism_package_image_translation_fingerprint_or_null(p_translation);
  return l_media_fingerprint is not null
    and l_translation_fingerprint is not null
    and p_translation.captured_media_fingerprint = l_media_fingerprint
    and p_translation.translation_fingerprint = l_translation_fingerprint;
exception when others then
  return false;
end;
$$;

create or replace function private.tourism_package_translation_is_eligible(
  p_source public.tourism_packages,
  p_translation public.tourism_package_translations
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_primary public.package_images;
  l_primary_translation public.tourism_package_image_translations;
  l_total_relations bigint;
  l_eligible_relations bigint;
  l_source_token text;
  l_relationship_token text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if not private.tourism_package_source_is_eligible(p_source)
    or p_translation.tourism_package_id <> p_source.id
    or p_translation.locale is distinct from 'en'
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or p_translation.archived_at is not null
    or not p_translation.terminology_review_confirmed
    or not private.tourism_package_translation_content_is_complete(p_source, p_translation)
    or p_translation.captured_source_revision <> p_source.aggregate_revision
    or p_translation.captured_relationship_revision <> p_source.aggregate_revision then
    return false;
  end if;

  l_source_token := private.tourism_package_source_token_v1(p_source);
  l_relationship_token := private.tourism_package_relationship_token_v1(p_source);
  l_primary := private.tourism_package_current_primary_image(p_source);
  if l_primary.id is null then
    return false;
  end if;
  select image_translation.*
    into l_primary_translation
  from public.tourism_package_image_translations as image_translation
  where image_translation.package_image_id = l_primary.id
    and image_translation.locale = 'en';
  if not found
    or not private.tourism_package_image_translation_is_eligible(
      p_source, l_primary, l_primary_translation
    ) then
    return false;
  end if;

  l_thumbnail_fingerprint := private.tourism_package_thumbnail_media_fingerprint_or_null(
    p_source, l_primary
  );
  l_translation_fingerprint := private.tourism_package_translation_fingerprint_or_null(p_translation);
  if l_thumbnail_fingerprint is null
    or l_translation_fingerprint is null
    or p_translation.captured_source_token is distinct from l_source_token
    or p_translation.captured_relationship_token is distinct from l_relationship_token
    or p_translation.captured_thumbnail_media_fingerprint is distinct from l_thumbnail_fingerprint
    or p_translation.translation_fingerprint is distinct from l_translation_fingerprint then
    return false;
  end if;

  select count(*)
    into l_total_relations
  from public.package_destinations as relation
  where relation.package_id = p_source.id;
  select count(*)
    into l_eligible_relations
  from public.package_destinations as relation
    join public.published_english_destinations as destination
    on destination.id = relation.destination_id
  where relation.package_id = p_source.id;
  return l_total_relations > 0 and l_total_relations = l_eligible_relations;
exception when others then
  return false;
end;
$$;

alter function private.tourism_package_current_primary_image(public.tourism_packages) owner to postgres;
alter function private.tourism_package_source_is_eligible(public.tourism_packages) owner to postgres;
alter function private.tourism_package_translation_content_is_complete(public.tourism_packages, public.tourism_package_translations) owner to postgres;
alter function private.tourism_package_image_translation_content_is_complete(public.package_images, public.tourism_package_image_translations) owner to postgres;
alter function private.tourism_package_image_translation_is_eligible(public.tourism_packages, public.package_images, public.tourism_package_image_translations) owner to postgres;
alter function private.tourism_package_translation_is_eligible(public.tourism_packages, public.tourism_package_translations) owner to postgres;
revoke all on function private.tourism_package_current_primary_image(public.tourism_packages) from public, anon, authenticated;
revoke all on function private.tourism_package_source_is_eligible(public.tourism_packages) from public, anon, authenticated;
revoke all on function private.tourism_package_translation_content_is_complete(public.tourism_packages, public.tourism_package_translations) from public, anon, authenticated;
revoke all on function private.tourism_package_image_translation_content_is_complete(public.package_images, public.tourism_package_image_translations) from public, anon, authenticated;
revoke all on function private.tourism_package_image_translation_is_eligible(public.tourism_packages, public.package_images, public.tourism_package_image_translations) from public, anon, authenticated;
revoke all on function private.tourism_package_translation_is_eligible(public.tourism_packages, public.tourism_package_translations) from public, anon, authenticated;

create or replace function private.enforce_tourism_package_translation_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
begin
  if pg_catalog.current_setting('tourism_package.workflow', true) <> 'on' then
    raise exception using errcode = '42501', message = 'tourism package translations are writable only through workflow functions';
  end if;
  if l_actor is null or new.updated_by is distinct from l_actor then
    raise exception using errcode = '42501', message = 'tourism package translation actor is required';
  end if;
  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'tourism package translations cannot be deleted';
  elsif tg_op = 'INSERT' then
    if new.created_by is distinct from l_actor
      or new.edit_revision <> 1
      or new.translation_status <> 'draft'::public.publication_status
      or new.review_state <> 'pending'
      or new.terminology_review_confirmed
      or new.captured_source_revision is not null
      or new.captured_source_token is not null
      or new.captured_relationship_revision is not null
      or new.captured_relationship_token is not null
      or new.captured_thumbnail_media_fingerprint is not null
      or new.translation_fingerprint is not null then
      raise exception using errcode = '42501', message = 'invalid tourism package translation creation state';
    end if;
  else
    if new.id is distinct from old.id
      or new.tourism_package_id is distinct from old.tourism_package_id
      or new.locale is distinct from old.locale
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
      or new.edit_revision <> old.edit_revision + 1 then
      raise exception using errcode = '42501', message = 'invalid tourism package translation revision';
    end if;
  end if;
  new.updated_at := pg_catalog.statement_timestamp();
  return new;
end;
$$;

create or replace function private.enforce_tourism_package_image_translation_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
begin
  if pg_catalog.current_setting('tourism_package.workflow', true) <> 'on' then
    raise exception using errcode = '42501', message = 'tourism package image translations are writable only through workflow functions';
  end if;
  if l_actor is null or new.updated_by is distinct from l_actor then
    raise exception using errcode = '42501', message = 'tourism package image translation actor is required';
  end if;
  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'tourism package image translations cannot be deleted';
  elsif tg_op = 'INSERT' then
    if new.created_by is distinct from l_actor
      or new.edit_revision <> 1
      or new.translation_status <> 'draft'::public.publication_status
      or new.review_state <> 'pending'
      or new.terminology_review_confirmed
      or new.captured_media_fingerprint is not null
      or new.translation_fingerprint is not null then
      raise exception using errcode = '42501', message = 'invalid tourism package image translation creation state';
    end if;
  else
    if new.id is distinct from old.id
      or new.package_image_id is distinct from old.package_image_id
      or new.locale is distinct from old.locale
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
      or new.edit_revision <> old.edit_revision + 1 then
      raise exception using errcode = '42501', message = 'invalid tourism package image translation revision';
    end if;
  end if;
  new.updated_at := pg_catalog.statement_timestamp();
  return new;
end;
$$;

create or replace function private.reject_tourism_package_translation_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op <> 'INSERT'
    or pg_catalog.current_setting('tourism_package.workflow', true) <> 'on' then
    raise exception using errcode = '42501', message = 'tourism package review history is append only';
  end if;
  return new;
end;
$$;

create or replace function private.reject_tourism_package_image_translation_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op <> 'INSERT'
    or pg_catalog.current_setting('tourism_package.workflow', true) <> 'on' then
    raise exception using errcode = '42501', message = 'tourism package image review history is append only';
  end if;
  return new;
end;
$$;

create trigger tourism_package_translations_write_guard_trigger
before insert or update or delete on public.tourism_package_translations
for each row execute function private.enforce_tourism_package_translation_write();
create trigger tourism_package_image_translations_write_guard_trigger
before insert or update or delete on public.tourism_package_image_translations
for each row execute function private.enforce_tourism_package_image_translation_write();
create trigger tourism_package_translation_events_append_only_trigger
before insert or update or delete on public.tourism_package_translation_review_events
for each row execute function private.reject_tourism_package_translation_event_mutation();
create trigger tourism_package_image_translation_events_append_only_trigger
before insert or update or delete on public.tourism_package_image_translation_review_events
for each row execute function private.reject_tourism_package_image_translation_event_mutation();

alter function private.enforce_tourism_package_translation_write() owner to postgres;
alter function private.enforce_tourism_package_image_translation_write() owner to postgres;
alter function private.reject_tourism_package_translation_event_mutation() owner to postgres;
alter function private.reject_tourism_package_image_translation_event_mutation() owner to postgres;
revoke all on function private.enforce_tourism_package_translation_write() from public, anon, authenticated;
revoke all on function private.enforce_tourism_package_image_translation_write() from public, anon, authenticated;
revoke all on function private.reject_tourism_package_translation_event_mutation() from public, anon, authenticated;
revoke all on function private.reject_tourism_package_image_translation_event_mutation() from public, anon, authenticated;

create or replace function private.record_tourism_package_translation_event(
  p_old public.tourism_package_translations,
  p_new public.tourism_package_translations,
  p_event_type text,
  p_actor uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_source public.tourism_packages;
  l_primary public.package_images;
  l_source_token text;
  l_relationship_token text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  select source.*
    into l_source
  from public.tourism_packages as source
  where source.id = p_new.tourism_package_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'tourism package source not found';
  end if;
  l_source_token := private.tourism_package_source_token_v1(l_source);
  l_relationship_token := private.tourism_package_relationship_token_v1(l_source);
  l_primary := private.tourism_package_current_primary_image(l_source);
  l_thumbnail_fingerprint := private.tourism_package_thumbnail_media_fingerprint_or_null(
    l_source, l_primary
  );
  l_translation_fingerprint := private.tourism_package_translation_fingerprint_or_null(p_new);
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  insert into public.tourism_package_translation_review_events (
    tourism_package_translation_id,
    event_type,
    previous_translation_status,
    new_translation_status,
    previous_review_state,
    new_review_state,
    actor_id,
    source_revision,
    source_token,
    relationship_revision,
    relationship_token,
    thumbnail_media_fingerprint,
    translation_fingerprint,
    terminology_review_confirmed,
    reason
  ) values (
    p_new.id,
    p_event_type,
    coalesce(p_old.translation_status, 'draft'::public.publication_status),
    p_new.translation_status,
    coalesce(p_old.review_state, 'pending'),
    p_new.review_state,
    p_actor,
    l_source.aggregate_revision,
    l_source_token,
    l_source.aggregate_revision,
    l_relationship_token,
    l_thumbnail_fingerprint,
    l_translation_fingerprint,
    p_new.terminology_review_confirmed,
    p_reason
  );
end;
$$;

create or replace function private.record_tourism_package_image_translation_event(
  p_old public.tourism_package_image_translations,
  p_new public.tourism_package_image_translations,
  p_event_type text,
  p_actor uuid,
  p_media_fingerprint text default null,
  p_translation_fingerprint text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_image public.package_images;
begin
  select image.*
    into l_image
  from public.package_images as image
  where image.id = p_new.package_image_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'tourism package source image not found';
  end if;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  insert into public.tourism_package_image_translation_review_events (
    tourism_package_image_translation_id,
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
    p_new.id,
    p_event_type,
    coalesce(p_old.translation_status, 'draft'::public.publication_status),
    p_new.translation_status,
    coalesce(p_old.review_state, 'pending'),
    p_new.review_state,
    p_actor,
    l_image.binary_revision,
    coalesce(p_media_fingerprint, private.tourism_package_image_media_fingerprint_or_null(l_image)),
    coalesce(p_translation_fingerprint, private.tourism_package_image_translation_fingerprint_or_null(p_new)),
    p_new.terminology_review_confirmed,
    p_reason
  );
end;
$$;

alter function private.record_tourism_package_translation_event(public.tourism_package_translations, public.tourism_package_translations, text, uuid, text) owner to postgres;
alter function private.record_tourism_package_image_translation_event(public.tourism_package_image_translations, public.tourism_package_image_translations, text, uuid, text, text, text) owner to postgres;
revoke all on function private.record_tourism_package_translation_event(public.tourism_package_translations, public.tourism_package_translations, text, uuid, text) from public, anon, authenticated;
revoke all on function private.record_tourism_package_image_translation_event(public.tourism_package_image_translations, public.tourism_package_image_translations, text, uuid, text, text, text) from public, anon, authenticated;

create or replace function private.tourism_package_translation_source_cascade(
  p_package_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid;
  l_source public.tourism_packages;
  l_old public.tourism_package_translations;
  l_new public.tourism_package_translations;
begin
  select source.*
    into l_source
  from public.tourism_packages as source
  where source.id = p_package_id
  for update;
  if not found then
    return;
  end if;
  l_actor := auth.uid();
  if l_actor is null then
    l_actor := l_source.updated_by;
  end if;
  if l_actor is null then
    raise exception using errcode = '42501', message = 'tourism package source cascade actor is required';
  end if;

  for l_old in
    select translation.*
    from public.tourism_package_translations as translation
    where translation.tourism_package_id = p_package_id
    order by translation.id
    for update
  loop
    if l_source.status <> 'published'::public.publication_status then
      if l_old.translation_status <> 'archived'::public.publication_status then
        perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
        update public.tourism_package_translations as translation
        set translation_status = 'draft'::public.publication_status,
            review_state = 'pending',
            captured_source_revision = null,
            captured_source_token = null,
            captured_relationship_revision = null,
            captured_relationship_token = null,
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
        where id = l_old.id
        returning translation.* into l_new;
      else
        l_new := l_old;
      end if;
      perform private.record_tourism_package_translation_event(
        l_old, l_new, 'source_blocked', l_actor, 'source is not publicly eligible'
      );
    elsif l_old.review_state = 'reviewed'
      or l_old.translation_status = 'published'::public.publication_status then
      if l_old.review_state = 'reviewed'
        and l_old.translation_status <> 'published'::public.publication_status then
        perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
        update public.tourism_package_translations as translation
        set translation_status = 'draft'::public.publication_status,
            review_state = 'pending',
            captured_source_revision = null,
            captured_source_token = null,
            captured_relationship_revision = null,
            captured_relationship_token = null,
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
        where id = l_old.id
        returning translation.* into l_new;
      else
        l_new := l_old;
      end if;
      perform private.record_tourism_package_translation_event(
        l_old, l_new, 'source_changed', l_actor
      );
    end if;
  end loop;
end;
$$;

create or replace function private.tourism_package_source_cascade_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if pg_catalog.current_setting('tourism_package.cascade_deferred', true) = 'on' then
    return new;
  end if;
  if old.status is distinct from new.status
    or old.aggregate_revision is distinct from new.aggregate_revision then
    perform private.tourism_package_translation_source_cascade(new.id);
  end if;
  return new;
end;
$$;

create trigger tourism_packages_translation_source_cascade_trigger
after update on public.tourism_packages
for each row execute function private.tourism_package_source_cascade_trigger();

alter function private.tourism_package_translation_source_cascade(uuid) owner to postgres;
alter function private.tourism_package_source_cascade_trigger() owner to postgres;
revoke all on function private.tourism_package_translation_source_cascade(uuid) from public, anon, authenticated;
revoke all on function private.tourism_package_source_cascade_trigger() from public, anon, authenticated;

create or replace function private.tourism_package_relationship_revision_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_package_id uuid;
begin
  if pg_catalog.current_setting('tourism_package.relationship_revision_deferred', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    l_package_id := old.package_id;
  elsif tg_op = 'UPDATE' and old.package_id is distinct from new.package_id then
    perform pg_catalog.set_config('tourism_package.cascade_deferred', 'on', true);
    perform private.bump_tourism_package_aggregate_revision(old.package_id);
    perform private.bump_tourism_package_aggregate_revision(new.package_id);
    perform pg_catalog.set_config('tourism_package.cascade_deferred', 'off', true);
    perform private.tourism_package_translation_source_cascade(old.package_id);
    perform private.tourism_package_translation_source_cascade(new.package_id);
    return new;
  else
    l_package_id := new.package_id;
  end if;
  perform pg_catalog.set_config('tourism_package.cascade_deferred', 'on', true);
  perform private.bump_tourism_package_aggregate_revision(l_package_id);
  perform pg_catalog.set_config('tourism_package.cascade_deferred', 'off', true);
  perform private.tourism_package_translation_source_cascade(l_package_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger package_destinations_relationship_revision_trigger
after insert or update or delete on public.package_destinations
for each row execute function private.tourism_package_relationship_revision_trigger();

alter function private.tourism_package_relationship_revision_trigger() owner to postgres;
revoke all on function private.tourism_package_relationship_revision_trigger() from public, anon, authenticated;

create or replace function private.tourism_package_primary_media_revision_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_parent public.tourism_packages;
begin
  -- Generic media RPCs synchronize the package thumbnail after changing the
  -- image row.  Path/primary changes therefore bump through the parent update;
  -- only metadata-only changes on an already-primary image bump here.  Gallery
  -- metadata and order remain independent from the package aggregate.
  if tg_op <> 'UPDATE'
    or not (old.is_primary and new.is_primary)
    or new.storage_bucket is distinct from old.storage_bucket
    or new.storage_path is distinct from old.storage_path
    or (new.storage_bucket is not distinct from old.storage_bucket
      and new.storage_path is not distinct from old.storage_path
      and new.caption is not distinct from old.caption
      and new.alt_text is not distinct from old.alt_text) then
    return new;
  end if;
  select source.*
    into l_parent
  from public.tourism_packages as source
  where source.id = new.package_id;
  if found
    and l_parent.thumbnail_bucket = new.storage_bucket
    and l_parent.thumbnail_path = new.storage_path then
    perform pg_catalog.set_config('tourism_package.cascade_deferred', 'on', true);
    perform private.bump_tourism_package_aggregate_revision(new.package_id);
    perform pg_catalog.set_config('tourism_package.cascade_deferred', 'off', true);
    perform private.tourism_package_translation_source_cascade(new.package_id);
  end if;
  return new;
end;
$$;

create trigger package_images_primary_media_revision_trigger
after update on public.package_images
for each row execute function private.tourism_package_primary_media_revision_trigger();

alter function private.tourism_package_primary_media_revision_trigger() owner to postgres;
revoke all on function private.tourism_package_primary_media_revision_trigger() from public, anon, authenticated;

create or replace function private.tourism_package_image_translation_media_cascade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.tourism_package_image_translations;
  l_new public.tourism_package_image_translations;
  l_old_media_fingerprint text;
  l_new_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null then
    l_actor := new.updated_by;
  end if;
  l_old_media_fingerprint := private.tourism_package_image_media_fingerprint_or_null(old);
  l_new_media_fingerprint := private.tourism_package_image_media_fingerprint_or_null(new);
  if l_old_media_fingerprint is not distinct from l_new_media_fingerprint then
    return new;
  end if;
  for l_old in
    select translation.*
    from public.tourism_package_image_translations as translation
    where translation.package_image_id = new.id
    order by translation.id
    for update
  loop
    if l_old.review_state = 'reviewed'
      or l_old.translation_status = 'published'::public.publication_status then
      if l_old.review_state = 'reviewed'
        and l_old.translation_status <> 'published'::public.publication_status then
        perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
        update public.tourism_package_image_translations as translation
        set translation_status = 'draft'::public.publication_status,
            review_state = 'pending',
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
        where id = l_old.id
        returning translation.* into l_new;
      else
        l_new := l_old;
      end if;
      l_translation_fingerprint := private.tourism_package_image_translation_fingerprint_or_null(l_new);
      perform private.record_tourism_package_image_translation_event(
        l_old, l_new, 'media_changed', l_actor, l_new_media_fingerprint,
        l_translation_fingerprint
      );
    end if;
  end loop;
  return new;
end;
$$;

create trigger package_images_translation_media_cascade_trigger
after update on public.package_images
for each row execute function private.tourism_package_image_translation_media_cascade();

alter function private.tourism_package_image_translation_media_cascade() owner to postgres;
revoke all on function private.tourism_package_image_translation_media_cascade() from public, anon, authenticated;

create or replace function private.tourism_package_translation_admin_derived_state(
  p_source public.tourism_packages,
  p_translation public.tourism_package_translations
)
returns table (
  lifecycle_state text,
  source_status public.publication_status,
  source_blocked boolean,
  source_blocked_reason text,
  stale_source_token boolean,
  stale_relationship_token boolean,
  stale_thumbnail_media_fingerprint boolean,
  stale_translation_fingerprint boolean,
  public_eligibility boolean,
  review_eligibility boolean,
  publication_eligibility boolean,
  eligibility_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_current_source_token text;
  l_current_relationship_token text;
  l_current_thumbnail_fingerprint text;
  l_current_translation_fingerprint text;
  l_review_eligibility boolean := false;
  l_publication_eligibility boolean := false;
  l_public_eligibility boolean := false;
begin
  source_status := p_source.status;
  source_blocked := p_source.status is distinct from 'published'::public.publication_status;
  source_blocked_reason := case p_source.status
    when 'archived'::public.publication_status then 'source is archived'
    when 'published'::public.publication_status then null
    else 'source is unpublished'
  end;

  begin
    l_current_source_token := private.tourism_package_source_token_v1(p_source);
    l_current_relationship_token := private.tourism_package_relationship_token_v1(p_source);
  exception when others then
    l_current_source_token := null;
    l_current_relationship_token := null;
  end;
  begin
    l_current_thumbnail_fingerprint := private.tourism_package_thumbnail_media_fingerprint_or_null(
      p_source, private.tourism_package_current_primary_image(p_source)
    );
  exception when others then
    l_current_thumbnail_fingerprint := null;
  end;
  l_current_translation_fingerprint := private.tourism_package_translation_fingerprint_or_null(p_translation);

  stale_source_token := p_translation.captured_source_token is not null
    and p_translation.captured_source_token is distinct from l_current_source_token;
  stale_relationship_token := p_translation.captured_relationship_token is not null
    and p_translation.captured_relationship_token is distinct from l_current_relationship_token;
  stale_thumbnail_media_fingerprint := p_translation.captured_thumbnail_media_fingerprint is not null
    and p_translation.captured_thumbnail_media_fingerprint is distinct from l_current_thumbnail_fingerprint;
  stale_translation_fingerprint := p_translation.translation_fingerprint is not null
    and p_translation.translation_fingerprint is distinct from l_current_translation_fingerprint;

  l_review_eligibility := private.tourism_package_source_is_eligible(p_source)
    and private.tourism_package_translation_content_is_complete(p_source, p_translation);
  l_public_eligibility := private.tourism_package_translation_is_eligible(p_source, p_translation);
  l_publication_eligibility := l_public_eligibility;
  public_eligibility := l_public_eligibility;
  review_eligibility := l_review_eligibility;
  publication_eligibility := l_publication_eligibility;

  if p_translation.translation_status = 'archived'::public.publication_status then
    lifecycle_state := 'archived';
  elsif source_blocked then
    lifecycle_state := 'source-blocked';
  elsif p_translation.translation_status = 'published'::public.publication_status
    and p_translation.review_state = 'reviewed'
    and (stale_source_token or stale_relationship_token
      or stale_thumbnail_media_fingerprint or stale_translation_fingerprint) then
    lifecycle_state := 'stale';
  elsif p_translation.translation_status = 'published'::public.publication_status then
    lifecycle_state := 'published';
  elsif p_translation.review_state = 'reviewed' then
    lifecycle_state := 'reviewed';
  elsif p_translation.review_state = 'rejected' then
    lifecycle_state := 'rejected';
  else
    lifecycle_state := 'draft';
  end if;

  eligibility_reason := case
    when p_translation.translation_status = 'archived'::public.publication_status
      then 'translation is archived'
    when source_blocked then source_blocked_reason
    when stale_source_token then 'source token is stale'
    when stale_relationship_token then 'relationship token is stale'
    when stale_thumbnail_media_fingerprint then 'thumbnail media fingerprint is stale'
    when stale_translation_fingerprint then 'translation fingerprint is stale'
    when not l_review_eligibility then 'review eligibility failed'
    when p_translation.review_state <> 'reviewed' then 'review is required'
    when not p_translation.terminology_review_confirmed then 'terminology review confirmation is required'
    when not l_publication_eligibility then 'publication eligibility failed'
    else 'eligible'
  end;
  return next;
exception when others then
  lifecycle_state := case
    when p_translation.translation_status = 'archived'::public.publication_status then 'archived'
    when p_source.status is distinct from 'published'::public.publication_status then 'source-blocked'
    else 'stale'
  end;
  source_status := p_source.status;
  source_blocked := p_source.status is distinct from 'published'::public.publication_status;
  source_blocked_reason := case p_source.status
    when 'archived'::public.publication_status then 'source is archived'
    when 'published'::public.publication_status then null
    else 'source is unpublished'
  end;
  stale_source_token := true;
  stale_relationship_token := true;
  stale_thumbnail_media_fingerprint := true;
  stale_translation_fingerprint := true;
  public_eligibility := false;
  review_eligibility := false;
  publication_eligibility := false;
  eligibility_reason := 'eligibility evaluation failed';
  return next;
end;
$$;

create or replace function private.tourism_package_image_translation_admin_derived_state(
  p_source public.tourism_packages,
  p_image public.package_images,
  p_translation public.tourism_package_image_translations
)
returns table (
  lifecycle_state text,
  source_status public.publication_status,
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
stable
security definer
set search_path = ''
as $$
declare
  l_current_media_fingerprint text;
  l_current_translation_fingerprint text;
  l_review_eligibility boolean := false;
  l_publication_eligibility boolean := false;
  l_public_eligibility boolean := false;
begin
  source_status := p_source.status;
  source_blocked := p_source.status is distinct from 'published'::public.publication_status;
  source_blocked_reason := case p_source.status
    when 'archived'::public.publication_status then 'source is archived'
    when 'published'::public.publication_status then null
    else 'source is unpublished'
  end;
  l_current_media_fingerprint := private.tourism_package_image_media_fingerprint_or_null(p_image);
  l_current_translation_fingerprint := private.tourism_package_image_translation_fingerprint_or_null(p_translation);
  stale_media_fingerprint := p_translation.captured_media_fingerprint is not null
    and p_translation.captured_media_fingerprint is distinct from l_current_media_fingerprint;
  stale_translation_fingerprint := p_translation.translation_fingerprint is not null
    and p_translation.translation_fingerprint is distinct from l_current_translation_fingerprint;
  l_review_eligibility := not source_blocked
    and p_image.package_id = p_source.id
    and p_image.storage_bucket = 'tourism-media'
    and p_image.storage_path ~ ('^tourism-package/' || p_source.id::text || '/' || p_image.id::text || '\.(jpg|png|webp)$')
    and private.tourism_package_image_translation_content_is_complete(p_image, p_translation)
    and exists (
      select 1
      from storage.objects as object
      where object.bucket_id = p_image.storage_bucket
        and object.name = p_image.storage_path
    );
  l_publication_eligibility := private.tourism_package_image_translation_is_eligible(
    p_source, p_image, p_translation
  );
  l_public_eligibility := l_publication_eligibility;
  public_eligibility := l_public_eligibility;
  review_eligibility := l_review_eligibility;
  publication_eligibility := l_publication_eligibility;
  if p_translation.translation_status = 'archived'::public.publication_status then
    lifecycle_state := 'archived';
  elsif source_blocked then
    lifecycle_state := 'source-blocked';
  elsif p_translation.translation_status = 'published'::public.publication_status
    and p_translation.review_state = 'reviewed'
    and (stale_media_fingerprint or stale_translation_fingerprint) then
    lifecycle_state := 'stale';
  elsif p_translation.translation_status = 'published'::public.publication_status then
    lifecycle_state := 'published';
  elsif p_translation.review_state = 'reviewed' then
    lifecycle_state := 'reviewed';
  elsif p_translation.review_state = 'rejected' then
    lifecycle_state := 'rejected';
  else
    lifecycle_state := 'draft';
  end if;
  eligibility_reason := case
    when p_translation.translation_status = 'archived'::public.publication_status
      then 'translation is archived'
    when source_blocked then source_blocked_reason
    when stale_media_fingerprint then 'media fingerprint is stale'
    when stale_translation_fingerprint then 'translation fingerprint is stale'
    when not l_review_eligibility then 'review eligibility failed'
    when p_translation.review_state <> 'reviewed' then 'review is required'
    when not p_translation.terminology_review_confirmed then 'terminology review confirmation is required'
    when not l_publication_eligibility then 'publication eligibility failed'
    else 'eligible'
  end;
  return next;
exception when others then
  lifecycle_state := case
    when p_translation.translation_status = 'archived'::public.publication_status then 'archived'
    when p_source.status is distinct from 'published'::public.publication_status then 'source-blocked'
    else 'stale'
  end;
  source_status := p_source.status;
  source_blocked := p_source.status is distinct from 'published'::public.publication_status;
  source_blocked_reason := case p_source.status
    when 'archived'::public.publication_status then 'source is archived'
    when 'published'::public.publication_status then null
    else 'source is unpublished'
  end;
  stale_media_fingerprint := true;
  stale_translation_fingerprint := true;
  public_eligibility := false;
  review_eligibility := false;
  publication_eligibility := false;
  eligibility_reason := 'eligibility evaluation failed';
  return next;
end;
$$;

create or replace function private.lock_tourism_package_translation(
  p_translation_id uuid
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_translation public.tourism_package_translations;
begin
  select translation.*
    into l_translation
  from public.tourism_package_translations as translation
  where translation.id = p_translation_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'tourism package translation not found';
  end if;
  return l_translation;
end;
$$;

create or replace function private.lock_tourism_package_image_translation(
  p_translation_id uuid
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_translation public.tourism_package_image_translations;
begin
  select translation.*
    into l_translation
  from public.tourism_package_image_translations as translation
  where translation.id = p_translation_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'tourism package image translation not found';
  end if;
  return l_translation;
end;
$$;

alter function private.tourism_package_translation_admin_derived_state(public.tourism_packages, public.tourism_package_translations) owner to postgres;
alter function private.tourism_package_image_translation_admin_derived_state(public.tourism_packages, public.package_images, public.tourism_package_image_translations) owner to postgres;
alter function private.lock_tourism_package_translation(uuid) owner to postgres;
alter function private.lock_tourism_package_image_translation(uuid) owner to postgres;
revoke all on function private.tourism_package_translation_admin_derived_state(public.tourism_packages, public.tourism_package_translations) from public, anon, authenticated;
revoke all on function private.tourism_package_image_translation_admin_derived_state(public.tourism_packages, public.package_images, public.tourism_package_image_translations) from public, anon, authenticated;
revoke all on function private.lock_tourism_package_translation(uuid) from public, anon, authenticated;
revoke all on function private.lock_tourism_package_image_translation(uuid) from public, anon, authenticated;

create or replace function public.tourism_package_translation_admin_read(
  p_tourism_package_id uuid
)
returns table (
  id uuid,
  tourism_package_id uuid,
  locale text,
  name text,
  duration_unit text,
  price_note text,
  included_facilities text[],
  souvenir text,
  summary text,
  description text,
  translation_status public.publication_status,
  review_state text,
  captured_source_revision bigint,
  captured_source_token text,
  captured_relationship_revision bigint,
  captured_relationship_token text,
  captured_thumbnail_media_fingerprint text,
  translation_fingerprint text,
  contract_version text,
  terminology_review_confirmed boolean,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text,
  rejected_at timestamptz,
  rejected_by uuid,
  published_at timestamptz,
  published_by uuid,
  archived_at timestamptz,
  edit_revision bigint,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  updated_by uuid,
  source_slug text,
  aggregate_revision bigint,
  source_updated_at timestamptz,
  source_status public.publication_status,
  lifecycle_state text,
  source_blocked boolean,
  source_blocked_reason text,
  stale_source_token boolean,
  stale_relationship_token boolean,
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
    translation.tourism_package_id,
    translation.locale,
    translation.name,
    translation.duration_unit,
    translation.price_note,
    translation.included_facilities,
    translation.souvenir,
    translation.summary,
    translation.description,
    translation.translation_status,
    translation.review_state,
    translation.captured_source_revision,
    translation.captured_source_token,
    translation.captured_relationship_revision,
    translation.captured_relationship_token,
    translation.captured_thumbnail_media_fingerprint,
    translation.translation_fingerprint,
    translation.contract_version,
    translation.terminology_review_confirmed,
    translation.reviewed_at,
    translation.reviewed_by,
    translation.review_reason,
    translation.rejected_at,
    translation.rejected_by,
    translation.published_at,
    translation.published_by,
    translation.archived_at,
    translation.edit_revision,
    translation.created_at,
    translation.updated_at,
    translation.created_by,
    translation.updated_by,
    source.slug,
    source.aggregate_revision,
    source.updated_at,
    source.status,
    derived.lifecycle_state,
    derived.source_blocked,
    derived.source_blocked_reason,
    derived.stale_source_token,
    derived.stale_relationship_token,
    derived.stale_thumbnail_media_fingerprint,
    derived.stale_translation_fingerprint,
    derived.public_eligibility,
    derived.review_eligibility,
    derived.publication_eligibility,
    derived.eligibility_reason
  from public.tourism_package_translations as translation
  join public.tourism_packages as source
    on source.id = translation.tourism_package_id
  cross join lateral private.tourism_package_translation_admin_derived_state(source, translation) as derived
  where auth.uid() is not null
    and public.is_admin()
    and translation.tourism_package_id = p_tourism_package_id
  order by translation.id;
$$;

create or replace function public.tourism_package_image_translation_admin_read(
  p_package_image_id uuid
)
returns table (
  id uuid,
  package_image_id uuid,
  locale text,
  alt_text text,
  caption text,
  translation_status public.publication_status,
  review_state text,
  captured_media_fingerprint text,
  translation_fingerprint text,
  contract_version text,
  terminology_review_confirmed boolean,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_reason text,
  rejected_at timestamptz,
  rejected_by uuid,
  published_at timestamptz,
  published_by uuid,
  archived_at timestamptz,
  edit_revision bigint,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid,
  updated_by uuid,
  tourism_package_id uuid,
  source_slug text,
  aggregate_revision bigint,
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
    translation.package_image_id,
    translation.locale,
    translation.alt_text,
    translation.caption,
    translation.translation_status,
    translation.review_state,
    translation.captured_media_fingerprint,
    translation.translation_fingerprint,
    translation.contract_version,
    translation.terminology_review_confirmed,
    translation.reviewed_at,
    translation.reviewed_by,
    translation.review_reason,
    translation.rejected_at,
    translation.rejected_by,
    translation.published_at,
    translation.published_by,
    translation.archived_at,
    translation.edit_revision,
    translation.created_at,
    translation.updated_at,
    translation.created_by,
    translation.updated_by,
    source.id,
    source.slug,
    source.aggregate_revision,
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
  from public.tourism_package_image_translations as translation
  join public.package_images as image
    on image.id = translation.package_image_id
  join public.tourism_packages as source
    on source.id = image.package_id
  cross join lateral private.tourism_package_image_translation_admin_derived_state(source, image, translation) as derived
  where auth.uid() is not null
    and public.is_admin()
    and translation.package_image_id = p_package_image_id
  order by translation.id;
$$;

create or replace function public.tourism_package_translation_review_history(
  p_translation_id uuid
)
returns setof public.tourism_package_translation_review_events
language sql
security definer
set search_path = ''
as $$
  select event.*
  from public.tourism_package_translation_review_events as event
  where auth.uid() is not null
    and public.is_admin()
    and event.tourism_package_translation_id = p_translation_id
  order by event.occurred_at, event.id;
$$;

create or replace function public.tourism_package_image_translation_review_history(
  p_translation_id uuid
)
returns setof public.tourism_package_image_translation_review_events
language sql
security definer
set search_path = ''
as $$
  select event.*
  from public.tourism_package_image_translation_review_events as event
  where auth.uid() is not null
    and public.is_admin()
    and event.tourism_package_image_translation_id = p_translation_id
  order by event.occurred_at, event.id;
$$;

create or replace function public.tourism_package_translation_save_draft(
  p_tourism_package_id uuid,
  p_expected_edit_revision bigint,
  p_name text,
  p_duration_unit text,
  p_price_note text,
  p_included_facilities text[],
  p_souvenir text,
  p_summary text,
  p_description text
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_source public.tourism_packages;
  l_old public.tourism_package_translations;
  l_new public.tourism_package_translations;
  l_name text := nullif(private.fingerprint_normalize_text(p_name), '');
  l_duration_unit text := nullif(private.fingerprint_normalize_text(p_duration_unit), '');
  l_price_note text := nullif(private.fingerprint_normalize_text(p_price_note), '');
  l_facilities text[] := coalesce(p_included_facilities, '{}'::text[]);
  l_souvenir text := nullif(private.fingerprint_normalize_text(p_souvenir), '');
  l_summary text := nullif(private.fingerprint_normalize_text(p_summary), '');
  l_description text := nullif(private.fingerprint_normalize_text(p_description), '');
  l_index integer;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  select source.*
    into l_source
  from public.tourism_packages as source
  where source.id = p_tourism_package_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'tourism package source not found';
  end if;
  if (private.fingerprint_normalize_text(l_source.price_note) is null
      or private.fingerprint_normalize_text(l_source.price_note) = '')
     and l_price_note is not null
    or (private.fingerprint_normalize_text(l_source.souvenir) is null
      or private.fingerprint_normalize_text(l_source.souvenir) = '')
     and l_souvenir is not null
    or (private.fingerprint_normalize_text(l_source.summary) is null
      or private.fingerprint_normalize_text(l_source.summary) = '')
     and l_summary is not null then
    raise exception using errcode = '23514', message = 'English content cannot be added without source content';
  end if;
  if not private.fingerprint_text_array_is_valid(l_source.included_facilities)
    or pg_catalog.cardinality(l_source.included_facilities) <> pg_catalog.cardinality(l_facilities) then
    raise exception using errcode = '23514', message = 'English facilities must preserve source cardinality';
  end if;
  if pg_catalog.cardinality(l_facilities) > 0 then
    l_index := 1;
    while l_index <= pg_catalog.cardinality(l_facilities) loop
      l_facilities[l_index] := nullif(private.fingerprint_normalize_text(l_facilities[l_index]), '');
      if l_facilities[l_index] is null then
        raise exception using errcode = '23514', message = 'English facilities entries are required';
      end if;
      l_index := l_index + 1;
    end loop;
  end if;
  perform image.id
  from public.package_images as image
  where image.package_id = p_tourism_package_id
  order by image.id
  for update;
  select translation.*
    into l_old
  from public.tourism_package_translations as translation
  where translation.tourism_package_id = p_tourism_package_id
    and translation.locale = 'en'
  for update;

  if not found then
    if p_expected_edit_revision is not null then
      raise exception using errcode = 'P0002', message = 'tourism package translation not found';
    end if;
    perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
    insert into public.tourism_package_translations (
      tourism_package_id,
      name,
      duration_unit,
      price_note,
      included_facilities,
      souvenir,
      summary,
      description,
      created_by,
      updated_by
    ) values (
      p_tourism_package_id,
      l_name,
      l_duration_unit,
      l_price_note,
      l_facilities,
      l_souvenir,
      l_summary,
      l_description,
      l_actor,
      l_actor
    ) returning * into l_new;
    perform private.record_tourism_package_translation_event(
      null, l_new, 'draft_saved', l_actor
    );
    return l_new;
  end if;

  if p_expected_edit_revision is null
    or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package translation edit revision mismatch';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package translation revision overflow';
  end if;
  if l_old.translation_status = 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'published tourism package translation must be unpublished or archived before editing';
  elsif l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'archived tourism package translation must be restored first';
  end if;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  update public.tourism_package_translations as translation
  set name = l_name,
      duration_unit = l_duration_unit,
      price_note = l_price_note,
      included_facilities = l_facilities,
      souvenir = l_souvenir,
      summary = l_summary,
      description = l_description,
      translation_status = 'draft'::public.publication_status,
      review_state = 'pending',
      captured_source_revision = null,
      captured_source_token = null,
      captured_relationship_revision = null,
      captured_relationship_token = null,
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
  perform private.record_tourism_package_translation_event(
    l_old, l_new, 'draft_saved', l_actor
  );
  return l_new;
end;
$$;

create or replace function public.tourism_package_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_terminology_review_confirmed boolean
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.tourism_package_translations;
  l_new public.tourism_package_translations;
  l_source public.tourism_packages;
  l_source_token text;
  l_relationship_token text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if not coalesce(p_terminology_review_confirmed, false) then
    raise exception using errcode = '23514', message = 'tourism package terminology review confirmation is required';
  end if;
  l_old := private.lock_tourism_package_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'tourism package translation is not pending review';
  end if;
  select source.*
    into l_source
  from public.tourism_packages as source
  where source.id = l_old.tourism_package_id
  for update;
  if not found or not private.tourism_package_source_is_eligible(l_source)
    or not private.tourism_package_translation_content_is_complete(l_source, l_old) then
    raise exception using errcode = '55000', message = 'tourism package translation review eligibility failed';
  end if;
  l_source_token := private.tourism_package_source_token_v1(l_source);
  l_relationship_token := private.tourism_package_relationship_token_v1(l_source);
  l_thumbnail_fingerprint := private.tourism_package_thumbnail_media_fingerprint_or_null(
    l_source, private.tourism_package_current_primary_image(l_source)
  );
  l_translation_fingerprint := private.tourism_package_translation_fingerprint_v1(l_old);
  if l_thumbnail_fingerprint is null then
    raise exception using errcode = '55000', message = 'tourism package thumbnail fingerprint is unavailable';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package translation revision overflow';
  end if;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  update public.tourism_package_translations as translation
  set review_state = 'reviewed',
      terminology_review_confirmed = true,
      captured_source_revision = l_source.aggregate_revision,
      captured_source_token = l_source_token,
      captured_relationship_revision = l_source.aggregate_revision,
      captured_relationship_token = l_relationship_token,
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
  perform private.record_tourism_package_translation_event(
    l_old, l_new, 'reviewed', l_actor
  );
  return l_new;
end;
$$;

create or replace function public.tourism_package_translation_reject(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_reason text
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.tourism_package_translations;
  l_new public.tourism_package_translations;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '23514', message = 'rejection reason is required';
  end if;
  l_old := private.lock_tourism_package_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state not in ('pending', 'reviewed') then
    raise exception using errcode = '55000', message = 'tourism package translation cannot be rejected in its current state';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package translation revision overflow';
  end if;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  update public.tourism_package_translations as translation
  set translation_status = 'draft'::public.publication_status,
      review_state = 'rejected',
      captured_source_revision = null,
      captured_source_token = null,
      captured_relationship_revision = null,
      captured_relationship_token = null,
      captured_thumbnail_media_fingerprint = null,
      translation_fingerprint = null,
      terminology_review_confirmed = false,
      reviewed_at = null,
      reviewed_by = null,
      review_reason = pg_catalog.btrim(p_reason),
      rejected_at = pg_catalog.statement_timestamp(),
      rejected_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_tourism_package_translation_event(
    l_old, l_new, 'rejected', l_actor, pg_catalog.btrim(p_reason)
  );
  return l_new;
end;
$$;

create or replace function private.tourism_package_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.tourism_package_translations;
  l_new public.tourism_package_translations;
  l_candidate public.tourism_package_translations;
  l_source public.tourism_packages;
  l_source_token text;
  l_relationship_token text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_tourism_package_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not coalesce(p_republish, false)
      and (l_old.published_at is not null
        or l_old.translation_status <> 'draft'::public.publication_status))
    or (coalesce(p_republish, false) and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'tourism package translation publication transition is invalid';
  end if;
  select source.*
    into l_source
  from public.tourism_packages as source
  where source.id = l_old.tourism_package_id
  for update;
  if not found
    or not private.tourism_package_source_is_eligible(l_source)
    or not private.tourism_package_translation_content_is_complete(l_source, l_old) then
    raise exception using errcode = '55000', message = 'tourism package translation publication eligibility failed';
  end if;
  l_source_token := private.tourism_package_source_token_v1(l_source);
  l_relationship_token := private.tourism_package_relationship_token_v1(l_source);
  l_thumbnail_fingerprint := private.tourism_package_thumbnail_media_fingerprint_or_null(
    l_source, private.tourism_package_current_primary_image(l_source)
  );
  l_translation_fingerprint := private.tourism_package_translation_fingerprint_v1(l_old);
  if l_thumbnail_fingerprint is null
    or l_old.captured_source_revision <> l_source.aggregate_revision
    or l_old.captured_source_token is distinct from l_source_token
    or l_old.captured_relationship_revision <> l_source.aggregate_revision
    or l_old.captured_relationship_token is distinct from l_relationship_token
    or l_old.captured_thumbnail_media_fingerprint is distinct from l_thumbnail_fingerprint
    or l_old.translation_fingerprint is distinct from l_translation_fingerprint then
    raise exception using errcode = '55000', message = 'fresh review required before tourism package translation publication';
  end if;

  l_candidate := l_old;
  l_candidate.translation_status := 'published'::public.publication_status;
  l_candidate.archived_at := null;
  if not private.tourism_package_translation_is_eligible(l_source, l_candidate) then
    raise exception using errcode = '55000', message = 'all tourism package destinations and primary media must be English eligible';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package translation revision overflow';
  end if;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  update public.tourism_package_translations as translation
  set translation_status = 'published'::public.publication_status,
      published_at = pg_catalog.statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_tourism_package_translation_event(
    l_old,
    l_new,
    case when coalesce(p_republish, false) then 'republished' else 'published' end,
    l_actor
  );
  return l_new;
end;
$$;

create or replace function public.tourism_package_translation_publish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, false
  );
end;
$$;

create or replace function public.tourism_package_translation_republish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, true
  );
end;
$$;

create or replace function private.tourism_package_translation_simple_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_action text
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.tourism_package_translations;
  l_new public.tourism_package_translations;
  l_event_type text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_action not in ('archive', 'unpublish', 'restore') then
    raise exception using errcode = '22023', message = 'unsupported tourism package translation transition';
  end if;
  l_old := private.lock_tourism_package_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package translation edit revision mismatch';
  end if;
  if p_action = 'archive' and l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'tourism package translation is already archived';
  elsif p_action = 'unpublish' and l_old.translation_status <> 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'tourism package translation is not published';
  elsif p_action = 'restore' and l_old.translation_status <> 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'tourism package translation is not archived';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package translation revision overflow';
  end if;
  l_event_type := case p_action
    when 'archive' then 'archived'
    when 'unpublish' then 'unpublished'
    else 'restored'
  end;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  if p_action = 'archive' then
    update public.tourism_package_translations as translation
    set translation_status = 'archived'::public.publication_status,
        review_state = 'pending',
        captured_source_revision = null,
        captured_source_token = null,
        captured_relationship_revision = null,
        captured_relationship_token = null,
        captured_thumbnail_media_fingerprint = null,
        translation_fingerprint = null,
        terminology_review_confirmed = false,
        reviewed_at = null,
        reviewed_by = null,
        review_reason = null,
        rejected_at = null,
        rejected_by = null,
        archived_at = pg_catalog.statement_timestamp(),
        edit_revision = l_old.edit_revision + 1,
        updated_by = l_actor
    where translation.id = l_old.id
    returning translation.* into l_new;
  elsif p_action = 'unpublish' then
    update public.tourism_package_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
        captured_source_revision = null,
        captured_source_token = null,
        captured_relationship_revision = null,
        captured_relationship_token = null,
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
  else
    update public.tourism_package_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
        captured_source_revision = null,
        captured_source_token = null,
        captured_relationship_revision = null,
        captured_relationship_token = null,
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
  end if;
  perform private.record_tourism_package_translation_event(
    l_old, l_new, l_event_type, l_actor
  );
  return l_new;
end;
$$;

create or replace function public.tourism_package_translation_archive(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'archive'
  );
end;
$$;

create or replace function public.tourism_package_translation_unpublish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'unpublish'
  );
end;
$$;

create or replace function public.tourism_package_translation_restore(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'restore'
  );
end;
$$;

create or replace function public.tourism_package_image_translation_save_draft(
  p_package_image_id uuid,
  p_expected_edit_revision bigint,
  p_alt_text text,
  p_caption text
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_image public.package_images;
  l_old public.tourism_package_image_translations;
  l_new public.tourism_package_image_translations;
  l_alt_text text := nullif(private.fingerprint_normalize_text(p_alt_text), '');
  l_caption text := nullif(private.fingerprint_normalize_text(p_caption), '');
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  select image.*
    into l_image
  from public.package_images as image
  where image.id = p_package_image_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'tourism package source image not found';
  end if;
  if (private.fingerprint_normalize_text(l_image.caption) is null
      or private.fingerprint_normalize_text(l_image.caption) = '')
     and l_caption is not null then
    raise exception using errcode = '23514', message = 'English image caption cannot be added without source caption';
  end if;
  select translation.*
    into l_old
  from public.tourism_package_image_translations as translation
  where translation.package_image_id = p_package_image_id
    and translation.locale = 'en'
  for update;
  if not found then
    if p_expected_edit_revision is not null then
      raise exception using errcode = 'P0002', message = 'tourism package image translation not found';
    end if;
    perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
    insert into public.tourism_package_image_translations (
      package_image_id, alt_text, caption, created_by, updated_by
    ) values (
      p_package_image_id, l_alt_text, l_caption, l_actor, l_actor
    ) returning * into l_new;
    perform private.record_tourism_package_image_translation_event(
      null, l_new, 'draft_saved', l_actor
    );
    return l_new;
  end if;
  if p_expected_edit_revision is null
    or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package image translation edit revision mismatch';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package image translation revision overflow';
  end if;
  if l_old.translation_status = 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'published tourism package image translation must be unpublished or archived before editing';
  elsif l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'archived tourism package image translation must be restored first';
  end if;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  update public.tourism_package_image_translations as translation
  set alt_text = l_alt_text,
      caption = l_caption,
      translation_status = 'draft'::public.publication_status,
      review_state = 'pending',
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
  perform private.record_tourism_package_image_translation_event(
    l_old, l_new, 'draft_saved', l_actor
  );
  return l_new;
end;
$$;

create or replace function public.tourism_package_image_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_terminology_review_confirmed boolean
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.tourism_package_image_translations;
  l_new public.tourism_package_image_translations;
  l_image public.package_images;
  l_source public.tourism_packages;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if not coalesce(p_terminology_review_confirmed, false) then
    raise exception using errcode = '23514', message = 'tourism package media terminology review confirmation is required';
  end if;
  l_old := private.lock_tourism_package_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'tourism package image translation is not pending review';
  end if;
  select image.* into l_image
  from public.package_images as image
  where image.id = l_old.package_image_id;
  select source.* into l_source
  from public.tourism_packages as source
  where source.id = l_image.package_id
  for update;
  if not found
    or l_source.status <> 'published'::public.publication_status
    or l_image.storage_bucket <> 'tourism-media'
    or l_image.storage_path !~ ('^tourism-package/' || l_source.id::text || '/' || l_image.id::text || '\.(jpg|png|webp)$')
    or not private.tourism_package_image_translation_content_is_complete(l_image, l_old)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = l_image.storage_bucket
        and object.name = l_image.storage_path
    ) then
    raise exception using errcode = '55000', message = 'tourism package image translation review eligibility failed';
  end if;
  l_media_fingerprint := private.tourism_package_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.tourism_package_image_translation_fingerprint_v1(l_old);
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package image translation revision overflow';
  end if;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  update public.tourism_package_image_translations as translation
  set review_state = 'reviewed',
      terminology_review_confirmed = true,
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
  perform private.record_tourism_package_image_translation_event(
    l_old, l_new, 'reviewed', l_actor, l_media_fingerprint,
    l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.tourism_package_image_translation_reject(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_reason text
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.tourism_package_image_translations;
  l_new public.tourism_package_image_translations;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '23514', message = 'rejection reason is required';
  end if;
  l_old := private.lock_tourism_package_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state not in ('pending', 'reviewed') then
    raise exception using errcode = '55000', message = 'tourism package image translation cannot be rejected in its current state';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package image translation revision overflow';
  end if;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  update public.tourism_package_image_translations as translation
  set translation_status = 'draft'::public.publication_status,
      review_state = 'rejected',
      captured_media_fingerprint = null,
      translation_fingerprint = null,
      terminology_review_confirmed = false,
      reviewed_at = null,
      reviewed_by = null,
      review_reason = pg_catalog.btrim(p_reason),
      rejected_at = pg_catalog.statement_timestamp(),
      rejected_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_tourism_package_image_translation_event(
    l_old, l_new, 'rejected', l_actor, null, null, pg_catalog.btrim(p_reason)
  );
  return l_new;
end;
$$;

create or replace function private.tourism_package_image_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.tourism_package_image_translations;
  l_new public.tourism_package_image_translations;
  l_image public.package_images;
  l_source public.tourism_packages;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_tourism_package_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package image translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not coalesce(p_republish, false)
      and (l_old.published_at is not null
        or l_old.translation_status <> 'draft'::public.publication_status))
    or (coalesce(p_republish, false) and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'tourism package image translation publication transition is invalid';
  end if;
  select image.* into l_image
  from public.package_images as image
  where image.id = l_old.package_image_id;
  select source.* into l_source
  from public.tourism_packages as source
  where source.id = l_image.package_id
  for update;
  if not found
    or l_source.status <> 'published'::public.publication_status
    or l_image.storage_bucket <> 'tourism-media'
    or l_image.storage_path !~ ('^tourism-package/' || l_source.id::text || '/' || l_image.id::text || '\.(jpg|png|webp)$')
    or not private.tourism_package_image_translation_content_is_complete(l_image, l_old)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = l_image.storage_bucket
        and object.name = l_image.storage_path
    ) then
    raise exception using errcode = '55000', message = 'tourism package image translation publication eligibility failed';
  end if;
  l_media_fingerprint := private.tourism_package_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.tourism_package_image_translation_fingerprint_v1(l_old);
  if l_old.terminology_review_confirmed is not true
    or l_old.captured_media_fingerprint is distinct from l_media_fingerprint
    or l_old.translation_fingerprint is distinct from l_translation_fingerprint then
    raise exception using errcode = '55000', message = 'fresh review required before tourism package image translation publication';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package image translation revision overflow';
  end if;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  update public.tourism_package_image_translations as translation
  set translation_status = 'published'::public.publication_status,
      published_at = pg_catalog.statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_tourism_package_image_translation_event(
    l_old,
    l_new,
    case when coalesce(p_republish, false) then 'republished' else 'published' end,
    l_actor,
    l_media_fingerprint,
    l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.tourism_package_image_translation_publish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_image_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, false
  );
end;
$$;

create or replace function public.tourism_package_image_translation_republish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_image_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, true
  );
end;
$$;

create or replace function private.tourism_package_image_translation_simple_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_action text
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.tourism_package_image_translations;
  l_new public.tourism_package_image_translations;
  l_event_type text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_action not in ('archive', 'unpublish', 'restore') then
    raise exception using errcode = '22023', message = 'unsupported tourism package image translation transition';
  end if;
  l_old := private.lock_tourism_package_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'tourism package image translation edit revision mismatch';
  end if;
  if p_action = 'archive' and l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'tourism package image translation is already archived';
  elsif p_action = 'unpublish' and l_old.translation_status <> 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'tourism package image translation is not published';
  elsif p_action = 'restore' and l_old.translation_status <> 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'tourism package image translation is not archived';
  end if;
  if l_old.edit_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'tourism package image translation revision overflow';
  end if;
  l_event_type := case p_action
    when 'archive' then 'archived'
    when 'unpublish' then 'unpublished'
    else 'restored'
  end;
  perform pg_catalog.set_config('tourism_package.workflow', 'on', true);
  if p_action = 'archive' then
    update public.tourism_package_image_translations as translation
    set translation_status = 'archived'::public.publication_status,
        review_state = 'pending',
        captured_media_fingerprint = null,
        translation_fingerprint = null,
        terminology_review_confirmed = false,
        reviewed_at = null,
        reviewed_by = null,
        review_reason = null,
      rejected_at = null,
      rejected_by = null,
      archived_at = pg_catalog.statement_timestamp(),
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
    where translation.id = l_old.id
    returning translation.* into l_new;
  elsif p_action = 'unpublish' then
    update public.tourism_package_image_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
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
  else
    update public.tourism_package_image_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
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
  end if;
  perform private.record_tourism_package_image_translation_event(
    l_old, l_new, l_event_type, l_actor
  );
  return l_new;
end;
$$;

create or replace function public.tourism_package_image_translation_archive(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_image_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'archive'
  );
end;
$$;

create or replace function public.tourism_package_image_translation_unpublish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_image_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'unpublish'
  );
end;
$$;

create or replace function public.tourism_package_image_translation_restore(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.tourism_package_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.tourism_package_image_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'restore'
  );
end;
$$;

-- Public views cannot rely on EXECUTE privileges for private projection
-- functions: PostgreSQL checks function execution as the querying role even
-- when the function appears inside an owner-controlled view.  Keep the
-- callable eligibility/fingerprint helpers private and express the equivalent
-- safe projection predicates directly here.
create view private.published_english_tourism_package_rows_data
with (security_barrier = true, security_invoker = false)
as
with primary_counts as (
  select image.package_id, count(*) as primary_count
  from public.package_images as image
  where image.is_primary
  group by image.package_id
), relation_counts as (
  select
    relation.package_id,
    count(*) as total_relations,
    count(destination.id) as eligible_relations
  from public.package_destinations as relation
  left join public.published_english_destinations as destination
    on destination.id = relation.destination_id
  group by relation.package_id
), base as (
  select
    source.id as source_id,
    source.slug as source_slug,
    source.status as source_status,
    source.name as source_name,
    source.duration_unit as source_duration_unit,
    source.price_note as source_price_note,
    source.souvenir as source_souvenir,
    source.summary as source_summary,
    source.description as source_description,
    source.package_type,
    source.duration_value,
    source.price,
    source.included_facilities as source_included_facilities,
    source.thumbnail_bucket,
    source.thumbnail_path,
    source.is_featured,
    source.display_order,
    source.published_at as source_published_at,
    source.aggregate_revision,
    image.id as primary_image_id,
    image.storage_bucket as primary_storage_bucket,
    image.storage_path as primary_storage_path,
    image.caption as primary_caption,
    image.alt_text as primary_alt_text,
    image.binary_revision as primary_binary_revision,
    translation.id as translation_id,
    translation.name as translation_name,
    translation.duration_unit as translation_duration_unit,
    translation.price_note as translation_price_note,
    translation.included_facilities as translation_included_facilities,
    translation.souvenir as translation_souvenir,
    translation.summary as translation_summary,
    translation.description as translation_description,
    translation.translation_status,
    translation.review_state,
    translation.archived_at,
    translation.terminology_review_confirmed,
    translation.captured_source_revision,
    translation.captured_source_token,
    translation.captured_relationship_revision,
    translation.captured_relationship_token,
    translation.captured_thumbnail_media_fingerprint,
    translation.translation_fingerprint,
    translation.published_at as translation_published_at,
    primary_translation.alt_text as primary_translation_alt_text,
    primary_translation.caption as primary_translation_caption,
    primary_translation.translation_status as primary_translation_status,
    primary_translation.review_state as primary_review_state,
    primary_translation.archived_at as primary_archived_at,
    primary_translation.terminology_review_confirmed as primary_terminology_review_confirmed,
    primary_translation.captured_media_fingerprint as primary_captured_media_fingerprint,
    primary_translation.translation_fingerprint as primary_translation_fingerprint
  from public.tourism_packages as source
  join primary_counts as counts
    on counts.package_id = source.id
   and counts.primary_count = 1
  join public.package_images as image
    on image.package_id = source.id
   and image.is_primary
   and image.storage_bucket = source.thumbnail_bucket
   and image.storage_path = source.thumbnail_path
  join public.tourism_package_translations as translation
    on translation.tourism_package_id = source.id
   and translation.locale = 'en'
  join public.tourism_package_image_translations as primary_translation
    on primary_translation.package_image_id = image.id
   and primary_translation.locale = 'en'
), normalized as (
  select
    base.*,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_name_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_duration_unit, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_duration_unit_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_price_note, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_price_note_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_souvenir, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_souvenir_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_summary, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_summary_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_description_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(thumbnail_bucket, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as thumbnail_bucket_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(thumbnail_path, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as thumbnail_path_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_storage_bucket, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_storage_bucket_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_storage_path, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_storage_path_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_caption_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_name_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_duration_unit, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_duration_unit_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_price_note, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_price_note_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_souvenir, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_souvenir_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_summary, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_summary_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_description_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_translation_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_translation_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_translation_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_translation_caption_normalized
  from base
), fingerprinted as (
  select
    normalized.*,
    'tourism-package-source-v1:' || pg_catalog.lower(source_id::text) || ':' || aggregate_revision::text as current_source_token,
    'tourism-package-relationship-v1:' || pg_catalog.lower(source_id::text) || ':' || aggregate_revision::text as current_relationship_token,
    'tourism-package-translation-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('tourism-package-translation-v1'::text)::text
          || ',"name":' || pg_catalog.to_json(translation_name_normalized)::text
          || ',"duration_unit":' || pg_catalog.to_json(translation_duration_unit_normalized)::text
          || ',"price_note":' || coalesce(pg_catalog.to_json(nullif(translation_price_note_normalized, ''))::text, 'null')
          || ',"included_facilities":' || coalesce((
            select '[' || pg_catalog.string_agg(
              pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(item.value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text,
              ',' order by item.ordinal
            ) || ']'
            from pg_catalog.unnest(translation_included_facilities) with ordinality as item(value, ordinal)
          ), '[]')
          || ',"souvenir":' || coalesce(pg_catalog.to_json(nullif(translation_souvenir_normalized, ''))::text, 'null')
          || ',"summary":' || coalesce(pg_catalog.to_json(nullif(translation_summary_normalized, ''))::text, 'null')
          || ',"description":' || pg_catalog.to_json(translation_description_normalized)::text
          || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as current_translation_fingerprint,
    'tourism-package-media-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('tourism-package-media-v1'::text)::text
          || ',"package_image_id":' || pg_catalog.to_json(pg_catalog.lower(primary_image_id::text))::text
          || ',"storage_bucket":' || pg_catalog.to_json(primary_storage_bucket_normalized)::text
          || ',"storage_path":' || pg_catalog.to_json(primary_storage_path_normalized)::text
          || ',"caption":' || coalesce(pg_catalog.to_json(nullif(primary_caption_normalized, ''))::text, 'null')
          || ',"alt_text":' || pg_catalog.to_json(primary_alt_text_normalized)::text
          || ',"binary_revision":' || primary_binary_revision::text
          || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as current_primary_media_fingerprint,
    'tourism-package-thumbnail-media-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('tourism-package-thumbnail-media-v1'::text)::text
          || ',"tourism_package_id":' || pg_catalog.to_json(pg_catalog.lower(source_id::text))::text
          || ',"thumbnail_bucket":' || coalesce(pg_catalog.to_json(nullif(thumbnail_bucket_normalized, ''))::text, 'null')
          || ',"thumbnail_path":' || coalesce(pg_catalog.to_json(nullif(thumbnail_path_normalized, ''))::text, 'null')
          || ',"primary_image_id":' || coalesce(pg_catalog.to_json(pg_catalog.lower(primary_image_id::text))::text, 'null')
          || ',"primary_image_media_fingerprint":' || coalesce(
            pg_catalog.to_json(
              'tourism-package-media-v1:' || pg_catalog.encode(
                extensions.digest(
                  pg_catalog.convert_to(
                    '{"version":' || pg_catalog.to_json('tourism-package-media-v1'::text)::text
                    || ',"package_image_id":' || pg_catalog.to_json(pg_catalog.lower(primary_image_id::text))::text
                    || ',"storage_bucket":' || pg_catalog.to_json(primary_storage_bucket_normalized)::text
                    || ',"storage_path":' || pg_catalog.to_json(primary_storage_path_normalized)::text
                    || ',"caption":' || coalesce(pg_catalog.to_json(nullif(primary_caption_normalized, ''))::text, 'null')
                    || ',"alt_text":' || pg_catalog.to_json(primary_alt_text_normalized)::text
                    || ',"binary_revision":' || primary_binary_revision::text
                    || '}',
                    'UTF8'
                  ),
                  'sha256'
                ),
                'hex'
              )
            )::text,
            'null'
          )
          || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as current_thumbnail_media_fingerprint,
    'tourism-package-media-translation-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('tourism-package-media-translation-v1'::text)::text
          || ',"alt_text":' || pg_catalog.to_json(primary_translation_alt_text_normalized)::text
          || ',"caption":' || coalesce(pg_catalog.to_json(nullif(primary_translation_caption_normalized, ''))::text, 'null')
          || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as current_primary_translation_fingerprint
  from normalized
)
select
  source_id as id,
  translation_id,
  source_slug as slug,
  translation_name as name,
  package_type,
  duration_value,
  translation_duration_unit as duration_unit,
  price,
  translation_price_note as price_note,
  translation_included_facilities as included_facilities,
  translation_souvenir as souvenir,
  translation_summary as summary,
  translation_description as description,
  thumbnail_bucket,
  thumbnail_path,
  is_featured,
  display_order,
  source_published_at as published_at,
  translation_published_at
from fingerprinted
join relation_counts
  on relation_counts.package_id = fingerprinted.source_id
where source_status = 'published'::public.publication_status
  and source_published_at is not null
  and coalesce(source_name_normalized, '') <> ''
  and coalesce(source_duration_unit_normalized, '') <> ''
  and coalesce(source_description_normalized, '') <> ''
  and source_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  and package_type is not null
  and duration_value > 0
  and (price is null or price::text not in ('NaN', 'Infinity', '-Infinity'))
  and source_included_facilities is not null
  and not exists (
    select 1
    from pg_catalog.unnest(source_included_facilities) as item(value)
    where item.value is null
      or pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(item.value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) = ''
  )
  and thumbnail_bucket = 'tourism-media'
  and thumbnail_path ~ ('^tourism-package/' || source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
  and primary_storage_bucket = thumbnail_bucket
  and primary_storage_path = thumbnail_path
  and primary_storage_bucket_normalized = 'tourism-media'
  and primary_storage_path ~ ('^tourism-package/' || source_id::text || '/' || primary_image_id::text || '\.(jpg|png|webp)$')
  and coalesce(primary_alt_text_normalized, '') <> ''
  and exists (
    select 1
    from storage.objects as object
    where object.bucket_id = primary_storage_bucket
      and object.name = primary_storage_path
  )
  and translation_status = 'published'::public.publication_status
  and review_state = 'reviewed'
  and archived_at is null
  and terminology_review_confirmed
  and coalesce(translation_name_normalized, '') <> ''
  and coalesce(translation_duration_unit_normalized, '') <> ''
  and coalesce(translation_description_normalized, '') <> ''
  and translation_included_facilities is not null
  and pg_catalog.cardinality(source_included_facilities) = pg_catalog.cardinality(translation_included_facilities)
  and not exists (
    select 1
    from pg_catalog.unnest(translation_included_facilities) as item(value)
    where item.value is null
      or pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(item.value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) = ''
  )
  and (
    (coalesce(source_price_note_normalized, '') = '')
      = (coalesce(translation_price_note_normalized, '') = '')
  )
  and (
    (coalesce(source_souvenir_normalized, '') = '')
      = (coalesce(translation_souvenir_normalized, '') = '')
  )
  and (
    (coalesce(source_summary_normalized, '') = '')
      = (coalesce(translation_summary_normalized, '') = '')
  )
  and captured_source_revision = aggregate_revision
  and captured_relationship_revision = aggregate_revision
  and captured_source_token = current_source_token
  and captured_relationship_token = current_relationship_token
  and captured_thumbnail_media_fingerprint = current_thumbnail_media_fingerprint
  and translation_fingerprint = current_translation_fingerprint
  and primary_translation_status = 'published'::public.publication_status
  and primary_review_state = 'reviewed'
  and primary_archived_at is null
  and primary_terminology_review_confirmed
  and coalesce(primary_translation_alt_text_normalized, '') <> ''
  and (
    (coalesce(primary_caption_normalized, '') = '' and primary_translation_caption is null)
    or (coalesce(primary_caption_normalized, '') <> ''
      and (primary_translation_caption is null or coalesce(primary_translation_caption_normalized, '') <> ''))
  )
  and primary_captured_media_fingerprint = current_primary_media_fingerprint
  and primary_translation_fingerprint = current_primary_translation_fingerprint
  and relation_counts.total_relations > 0
  and relation_counts.total_relations = relation_counts.eligible_relations;

create view private.published_english_tourism_package_image_rows_data
with (security_barrier = true, security_invoker = false)
as
with base as (
  select
    source.id as source_id,
    source.status as source_status,
    image.id,
    image.package_id,
    image.storage_bucket,
    image.storage_path,
    image.caption as source_caption,
    image.alt_text as source_alt_text,
    image.binary_revision,
    image.display_order,
    image.is_primary,
    translation.id as translation_id,
    translation.alt_text,
    translation.caption,
    translation.translation_status,
    translation.review_state,
    translation.archived_at,
    translation.terminology_review_confirmed,
    translation.captured_media_fingerprint,
    translation.translation_fingerprint
  from public.package_images as image
  join public.tourism_packages as source
    on source.id = image.package_id
  join private.published_english_tourism_package_rows_data as parent
    on parent.id = source.id
  join public.tourism_package_image_translations as translation
    on translation.package_image_id = image.id
   and translation.locale = 'en'
), normalized as (
  select
    base.*,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(storage_bucket, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as storage_bucket_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(storage_path, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as storage_path_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_caption_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_caption_normalized
  from base
), fingerprinted as (
  select
    normalized.*,
    'tourism-package-media-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('tourism-package-media-v1'::text)::text
          || ',"package_image_id":' || pg_catalog.to_json(pg_catalog.lower(id::text))::text
          || ',"storage_bucket":' || pg_catalog.to_json(storage_bucket_normalized)::text
          || ',"storage_path":' || pg_catalog.to_json(storage_path_normalized)::text
          || ',"caption":' || coalesce(pg_catalog.to_json(nullif(source_caption_normalized, ''))::text, 'null')
          || ',"alt_text":' || pg_catalog.to_json(source_alt_text_normalized)::text
          || ',"binary_revision":' || binary_revision::text
          || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as current_media_fingerprint,
    'tourism-package-media-translation-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('tourism-package-media-translation-v1'::text)::text
          || ',"alt_text":' || pg_catalog.to_json(translation_alt_text_normalized)::text
          || ',"caption":' || coalesce(pg_catalog.to_json(nullif(translation_caption_normalized, ''))::text, 'null')
          || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as current_translation_fingerprint
  from normalized
)
select
  id,
  package_id,
  translation_id,
  storage_bucket,
  storage_path,
  alt_text,
  caption,
  display_order,
  is_primary
from fingerprinted
where source_status = 'published'::public.publication_status
  and storage_bucket = 'tourism-media'
  and storage_path ~ ('^tourism-package/' || source_id::text || '/' || id::text || '\.(jpg|png|webp)$')
  and coalesce(source_alt_text_normalized, '') <> ''
  and exists (
    select 1
    from storage.objects as object
    where object.bucket_id = storage_bucket
      and object.name = storage_path
  )
  and translation_status = 'published'::public.publication_status
  and review_state = 'reviewed'
  and archived_at is null
  and terminology_review_confirmed
  and coalesce(translation_alt_text_normalized, '') <> ''
  and (
    (coalesce(source_caption_normalized, '') = '' and caption is null)
    or (coalesce(source_caption_normalized, '') <> ''
      and (caption is null or coalesce(translation_caption_normalized, '') <> ''))
  )
  and captured_media_fingerprint = current_media_fingerprint
  and translation_fingerprint = current_translation_fingerprint;

create view public.published_english_tourism_packages
with (security_barrier = true, security_invoker = false)
as
select
  id,
  translation_id,
  slug,
  name,
  package_type,
  duration_value,
  duration_unit,
  price,
  price_note,
  included_facilities,
  souvenir,
  summary,
  description,
  thumbnail_bucket,
  thumbnail_path,
  is_featured,
  display_order,
  published_at,
  translation_published_at
from private.published_english_tourism_package_rows_data;

create view public.published_english_tourism_package_images
with (security_barrier = true, security_invoker = false)
as
select
  id,
  package_id,
  translation_id,
  storage_bucket,
  storage_path,
  alt_text,
  caption,
  display_order,
  is_primary
from private.published_english_tourism_package_image_rows_data;

create view public.published_english_tourism_package_destinations
with (security_barrier = true, security_invoker = false)
as
select
  relation.id,
  relation.package_id,
  relation.destination_id,
  relation.display_order,
  destination.name as destination_name,
  destination.slug as destination_slug
from public.package_destinations as relation
join private.published_english_tourism_package_rows_data as package
  on package.id = relation.package_id
join public.published_english_destinations as destination
  on destination.id = relation.destination_id;

create or replace function private.tourism_package_english_parent_eligibility(
  p_source public.tourism_packages,
  p_translation public.tourism_package_translations
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.tourism_package_translation_is_eligible(p_source, p_translation);
$$;

create or replace function private.tourism_package_english_image_eligibility(
  p_source public.tourism_packages,
  p_image public.package_images,
  p_translation public.tourism_package_image_translations
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.tourism_package_image_translation_is_eligible(p_source, p_image, p_translation);
$$;

alter function private.tourism_package_english_parent_eligibility(public.tourism_packages, public.tourism_package_translations) owner to postgres;
alter function private.tourism_package_english_image_eligibility(public.tourism_packages, public.package_images, public.tourism_package_image_translations) owner to postgres;
revoke all on function private.tourism_package_english_parent_eligibility(public.tourism_packages, public.tourism_package_translations) from public, anon, authenticated;
revoke all on function private.tourism_package_english_image_eligibility(public.tourism_packages, public.package_images, public.tourism_package_image_translations) from public, anon, authenticated;

alter table public.tourism_package_translations enable row level security;
alter table public.tourism_package_image_translations enable row level security;
alter table public.tourism_package_translation_review_events enable row level security;
alter table public.tourism_package_image_translation_review_events enable row level security;

alter table public.tourism_package_translations owner to postgres;
alter table public.tourism_package_image_translations owner to postgres;
alter table public.tourism_package_translation_review_events owner to postgres;
alter table public.tourism_package_image_translation_review_events owner to postgres;
alter view private.published_english_tourism_package_rows_data owner to postgres;
alter view private.published_english_tourism_package_image_rows_data owner to postgres;
alter view public.published_english_tourism_packages owner to postgres;
alter view public.published_english_tourism_package_images owner to postgres;
alter view public.published_english_tourism_package_destinations owner to postgres;

revoke all on table public.tourism_package_translations from public, anon, authenticated;
revoke all on table public.tourism_package_image_translations from public, anon, authenticated;
revoke all on table public.tourism_package_translation_review_events from public, anon, authenticated;
revoke all on table public.tourism_package_image_translation_review_events from public, anon, authenticated;
revoke all on private.published_english_tourism_package_rows_data from public, anon, authenticated;
revoke all on private.published_english_tourism_package_image_rows_data from public, anon, authenticated;
revoke all on public.published_english_tourism_packages from public, anon, authenticated;
revoke all on public.published_english_tourism_package_images from public, anon, authenticated;
revoke all on public.published_english_tourism_package_destinations from public, anon, authenticated;

revoke all on function public.tourism_package_translation_admin_read(uuid) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_admin_read(uuid) from public, anon, authenticated;
revoke all on function public.tourism_package_translation_review_history(uuid) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_review_history(uuid) from public, anon, authenticated;
revoke all on function public.tourism_package_translation_save_draft(uuid, bigint, text, text, text, text[], text, text, text) from public, anon, authenticated;
revoke all on function public.tourism_package_translation_review(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function public.tourism_package_translation_reject(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.tourism_package_translation_publish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tourism_package_translation_republish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tourism_package_translation_archive(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tourism_package_translation_unpublish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tourism_package_translation_restore(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_save_draft(uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_review(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_reject(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_publish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_republish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_archive(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_unpublish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.tourism_package_image_translation_restore(uuid, bigint) from public, anon, authenticated;

alter function private.tourism_package_translation_publish_transition(uuid, bigint, boolean) owner to postgres;
alter function private.tourism_package_translation_simple_transition(uuid, bigint, text) owner to postgres;
alter function private.tourism_package_image_translation_publish_transition(uuid, bigint, boolean) owner to postgres;
alter function private.tourism_package_image_translation_simple_transition(uuid, bigint, text) owner to postgres;
alter function public.tourism_package_translation_admin_read(uuid) owner to postgres;
alter function public.tourism_package_image_translation_admin_read(uuid) owner to postgres;
alter function public.tourism_package_translation_review_history(uuid) owner to postgres;
alter function public.tourism_package_image_translation_review_history(uuid) owner to postgres;
alter function public.tourism_package_translation_save_draft(uuid, bigint, text, text, text, text[], text, text, text) owner to postgres;
alter function public.tourism_package_translation_review(uuid, bigint, boolean) owner to postgres;
alter function public.tourism_package_translation_reject(uuid, bigint, text) owner to postgres;
alter function public.tourism_package_translation_publish(uuid, bigint) owner to postgres;
alter function public.tourism_package_translation_republish(uuid, bigint) owner to postgres;
alter function public.tourism_package_translation_archive(uuid, bigint) owner to postgres;
alter function public.tourism_package_translation_unpublish(uuid, bigint) owner to postgres;
alter function public.tourism_package_translation_restore(uuid, bigint) owner to postgres;
alter function public.tourism_package_image_translation_save_draft(uuid, bigint, text, text) owner to postgres;
alter function public.tourism_package_image_translation_review(uuid, bigint, boolean) owner to postgres;
alter function public.tourism_package_image_translation_reject(uuid, bigint, text) owner to postgres;
alter function public.tourism_package_image_translation_publish(uuid, bigint) owner to postgres;
alter function public.tourism_package_image_translation_republish(uuid, bigint) owner to postgres;
alter function public.tourism_package_image_translation_archive(uuid, bigint) owner to postgres;
alter function public.tourism_package_image_translation_unpublish(uuid, bigint) owner to postgres;
alter function public.tourism_package_image_translation_restore(uuid, bigint) owner to postgres;

revoke all on function private.tourism_package_translation_publish_transition(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function private.tourism_package_translation_simple_transition(uuid, bigint, text) from public, anon, authenticated;
revoke all on function private.tourism_package_image_translation_publish_transition(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function private.tourism_package_image_translation_simple_transition(uuid, bigint, text) from public, anon, authenticated;

grant select on public.published_english_tourism_packages to anon, authenticated;
grant select on public.published_english_tourism_package_images to anon, authenticated;
grant select on public.published_english_tourism_package_destinations to anon, authenticated;
grant execute on function public.tourism_package_translation_admin_read(uuid) to authenticated;
grant execute on function public.tourism_package_image_translation_admin_read(uuid) to authenticated;
grant execute on function public.tourism_package_translation_review_history(uuid) to authenticated;
grant execute on function public.tourism_package_image_translation_review_history(uuid) to authenticated;
grant execute on function public.tourism_package_translation_save_draft(uuid, bigint, text, text, text, text[], text, text, text) to authenticated;
grant execute on function public.tourism_package_translation_review(uuid, bigint, boolean) to authenticated;
grant execute on function public.tourism_package_translation_reject(uuid, bigint, text) to authenticated;
grant execute on function public.tourism_package_translation_publish(uuid, bigint) to authenticated;
grant execute on function public.tourism_package_translation_republish(uuid, bigint) to authenticated;
grant execute on function public.tourism_package_translation_archive(uuid, bigint) to authenticated;
grant execute on function public.tourism_package_translation_unpublish(uuid, bigint) to authenticated;
grant execute on function public.tourism_package_translation_restore(uuid, bigint) to authenticated;
grant execute on function public.tourism_package_image_translation_save_draft(uuid, bigint, text, text) to authenticated;
grant execute on function public.tourism_package_image_translation_review(uuid, bigint, boolean) to authenticated;
grant execute on function public.tourism_package_image_translation_reject(uuid, bigint, text) to authenticated;
grant execute on function public.tourism_package_image_translation_publish(uuid, bigint) to authenticated;
grant execute on function public.tourism_package_image_translation_republish(uuid, bigint) to authenticated;
grant execute on function public.tourism_package_image_translation_archive(uuid, bigint) to authenticated;
grant execute on function public.tourism_package_image_translation_unpublish(uuid, bigint) to authenticated;
grant execute on function public.tourism_package_image_translation_restore(uuid, bigint) to authenticated;

comment on view public.published_english_tourism_packages is
  'Fail-closed English Tourism Package parent projection; only approved translated fields and shared source values are public.';
comment on view public.published_english_tourism_package_images is
  'Fail-closed English Tourism Package media projection; source storage references are exposed only with eligible English metadata.';
comment on view public.published_english_tourism_package_destinations is
  'Fail-closed all-or-nothing English Tourism Package itinerary projection; relation notes are source-only and omitted.';
