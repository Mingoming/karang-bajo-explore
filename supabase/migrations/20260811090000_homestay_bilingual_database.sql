-- Phase 3G Homestay bilingual database layer.
-- English publication is fail-closed through database-owned fingerprints,
-- lifecycle RPCs, and security-barrier views.  No application route or UI is
-- created by this migration.

alter table public.homestays
  add column source_revision bigint not null default 1,
  add constraint homestays_source_revision_positive
    check (source_revision > 0);

alter table public.homestay_images
  add column binary_revision bigint not null default 1,
  add column updated_at timestamptz,
  add column updated_by uuid references auth.users (id) on delete restrict,
  add constraint homestay_images_binary_revision_positive
    check (binary_revision > 0);

update public.homestay_images
set updated_at = created_at
where updated_at is null;

alter table public.homestay_images
  alter column updated_at set default statement_timestamp();

create table public.homestay_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  homestay_id uuid not null
    constraint homestay_translations_homestay_fk
    references public.homestays (id) on delete restrict,
  locale text not null default 'en',
  name text,
  description text,
  address text,
  price_note text,
  facilities text[] not null default '{}'::text[],
  translation_status public.publication_status not null default 'draft',
  review_state text not null default 'pending',
  captured_source_revision bigint,
  captured_source_fingerprint text,
  captured_thumbnail_media_fingerprint text,
  translation_fingerprint text,
  contract_version text not null default 'homestay-v1',
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
  constraint homestay_translations_locale_check
    check (locale = 'en'),
  constraint homestay_translations_review_state_check
    check (review_state in ('pending', 'reviewed', 'rejected')),
  constraint homestay_translations_contract_version_check
    check (contract_version = 'homestay-v1'),
  constraint homestay_translations_facilities_valid
    check (private.fingerprint_text_array_is_valid(facilities)),
  constraint homestay_translations_review_metadata_check
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
  constraint homestay_translations_review_checkpoint_check
    check (
      (review_state = 'reviewed'
        and captured_source_revision is not null
        and captured_source_revision > 0
        and captured_source_fingerprint is not null
        and captured_thumbnail_media_fingerprint is not null
        and translation_fingerprint is not null)
      or (review_state <> 'reviewed'
        and captured_source_revision is null
        and captured_source_fingerprint is null
        and captured_thumbnail_media_fingerprint is null
        and translation_fingerprint is null)
    ),
  constraint homestay_translations_rejection_metadata_check
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
  constraint homestay_translations_publication_metadata_check
    check (
      translation_status <> 'published'::public.publication_status
      or (published_at is not null and published_by is not null)
    ),
  constraint homestay_translations_publication_state_check
    check (
      translation_status <> 'published'::public.publication_status
      or (review_state = 'reviewed' and archived_at is null)
    ),
  constraint homestay_translations_rejected_state_check
    check (
      review_state <> 'rejected'
      or translation_status = 'draft'::public.publication_status
    ),
  constraint homestay_translations_archived_state_check
    check (
      translation_status <> 'archived'::public.publication_status
      or review_state = 'pending'
    ),
  constraint homestay_translations_archive_metadata_check
    check (
      (translation_status = 'archived'::public.publication_status)
        = (archived_at is not null)
    ),
  constraint homestay_translations_edit_revision_check
    check (edit_revision > 0),
  constraint homestay_translations_source_locale_key
    unique (homestay_id, locale)
);

create table public.homestay_image_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  homestay_image_id uuid not null
    constraint homestay_image_translations_image_fk
    references public.homestay_images (id) on delete restrict,
  locale text not null default 'en',
  alt_text text,
  caption text,
  translation_status public.publication_status not null default 'draft',
  review_state text not null default 'pending',
  captured_media_fingerprint text,
  translation_fingerprint text,
  contract_version text not null default 'homestay-media-v1',
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
  constraint homestay_image_translations_locale_check
    check (locale = 'en'),
  constraint homestay_image_translations_review_state_check
    check (review_state in ('pending', 'reviewed', 'rejected')),
  constraint homestay_image_translations_contract_version_check
    check (contract_version = 'homestay-media-v1'),
  constraint homestay_image_translations_review_metadata_check
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
  constraint homestay_image_translations_review_checkpoint_check
    check (
      (review_state = 'reviewed'
        and captured_media_fingerprint is not null
        and translation_fingerprint is not null)
      or (review_state <> 'reviewed'
        and captured_media_fingerprint is null
        and translation_fingerprint is null)
    ),
  constraint homestay_image_translations_rejection_metadata_check
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
  constraint homestay_image_translations_publication_metadata_check
    check (
      translation_status <> 'published'::public.publication_status
      or (published_at is not null and published_by is not null)
    ),
  constraint homestay_image_translations_publication_state_check
    check (
      translation_status <> 'published'::public.publication_status
      or (review_state = 'reviewed' and archived_at is null)
    ),
  constraint homestay_image_translations_rejected_state_check
    check (
      review_state <> 'rejected'
      or translation_status = 'draft'::public.publication_status
    ),
  constraint homestay_image_translations_archived_state_check
    check (
      translation_status <> 'archived'::public.publication_status
      or review_state = 'pending'
    ),
  constraint homestay_image_translations_archive_metadata_check
    check (
      (translation_status = 'archived'::public.publication_status)
        = (archived_at is not null)
    ),
  constraint homestay_image_translations_edit_revision_check
    check (edit_revision > 0),
  constraint homestay_image_translations_source_locale_key
    unique (homestay_image_id, locale)
);

create table public.homestay_translation_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  homestay_translation_id uuid not null
    constraint homestay_translation_review_events_translation_fk
    references public.homestay_translations (id) on delete restrict,
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
  constraint homestay_translation_events_review_state_check
    check (
      previous_review_state in ('pending', 'reviewed', 'rejected')
      and new_review_state in ('pending', 'reviewed', 'rejected')
    ),
  constraint homestay_translation_events_reason_check
    check (
      (event_type in ('rejected', 'source_blocked')
        and pg_catalog.btrim(coalesce(reason, '')) <> '')
      or (event_type not in ('rejected', 'source_blocked') and reason is null)
    )
);

create table public.homestay_image_translation_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  homestay_image_translation_id uuid not null
    constraint homestay_image_translation_events_translation_fk
    references public.homestay_image_translations (id) on delete restrict,
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
  constraint homestay_image_translation_events_review_state_check
    check (
      previous_review_state in ('pending', 'reviewed', 'rejected')
      and new_review_state in ('pending', 'reviewed', 'rejected')
    ),
  constraint homestay_image_translation_events_reason_check
    check (
      (event_type = 'rejected'
        and pg_catalog.btrim(coalesce(reason, '')) <> '')
      or (event_type <> 'rejected' and reason is null)
    )
);

create index homestay_translations_public_lookup_idx
  on public.homestay_translations (homestay_id, locale)
  where translation_status = 'published'::public.publication_status
    and review_state = 'reviewed';
create index homestay_translations_admin_queue_idx
  on public.homestay_translations (review_state, translation_status, updated_at desc);
create index homestay_image_translations_public_lookup_idx
  on public.homestay_image_translations (homestay_image_id, locale)
  where translation_status = 'published'::public.publication_status
    and review_state = 'reviewed';
create index homestay_translation_events_history_idx
  on public.homestay_translation_review_events
    (homestay_translation_id, occurred_at desc, id desc);
create index homestay_image_translation_events_history_idx
  on public.homestay_image_translation_review_events
    (homestay_image_translation_id, occurred_at desc, id desc);

create or replace function private.homestay_source_fingerprint_v1(
  p_source public.homestays
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('homestay-source-v1', array[
    'version', private.fingerprint_json_string('homestay-source-v1'),
    'name', private.fingerprint_json_text_value(p_source.name, true),
    'description', private.fingerprint_json_text_value(p_source.description, true),
    'address', private.fingerprint_json_text_value(p_source.address, false),
    'price_per_night', private.fingerprint_json_numeric_value(p_source.price_per_night, false),
    'price_note', private.fingerprint_json_text_value(p_source.price_note, false),
    'facilities', private.fingerprint_json_text_array_value(p_source.facilities)
  ]);
end;
$$;

create or replace function private.homestay_translation_fingerprint_v1(
  p_translation public.homestay_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('homestay-translation-v1', array[
    'version', private.fingerprint_json_string('homestay-translation-v1'),
    'name', private.fingerprint_json_text_value(p_translation.name, true),
    'description', private.fingerprint_json_text_value(p_translation.description, true),
    'address', private.fingerprint_json_text_value(p_translation.address, false),
    'price_note', private.fingerprint_json_text_value(p_translation.price_note, false),
    'facilities', private.fingerprint_json_text_array_value(p_translation.facilities)
  ]);
end;
$$;

-- The child translation marker-- The child translation marker is separate from the source-media marker.  The
-- former fingerprints English alt/caption; the latter fingerprints the source
-- image identity and revision.
create or replace function private.homestay_image_translation_fingerprint_v1(
  p_translation public.homestay_image_translations
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('homestay-media-translation-v1', array[
    'version', private.fingerprint_json_string('homestay-media-translation-v1'),
    'alt_text', private.fingerprint_json_text_value(p_translation.alt_text, true),
    'caption', private.fingerprint_json_text_value(p_translation.caption, false)
  ]);
end;
$$;

create or replace function private.homestay_image_media_fingerprint_v1(
  p_image public.homestay_images
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('homestay-media-v1', array[
    'version', private.fingerprint_json_string('homestay-media-v1'),
    'homestay_image_id', private.fingerprint_json_uuid_value(p_image.id, true),
    'storage_bucket', private.fingerprint_json_text_value(p_image.storage_bucket, true),
    'storage_path', private.fingerprint_json_text_value(p_image.storage_path, true),
    'caption', private.fingerprint_json_text_value(p_image.caption, false),
    'alt_text', private.fingerprint_json_text_value(p_image.alt_text, true),
    'binary_revision', private.fingerprint_json_bigint_value(p_image.binary_revision)
  ]);
end;
$$;

create or replace function private.homestay_thumbnail_media_fingerprint_v1(
  p_source public.homestays,
  p_primary_image public.homestay_images
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_primary_media_fingerprint text;
begin
  if p_primary_image.id is null then
    l_primary_media_fingerprint := null;
  else
    l_primary_media_fingerprint :=
      private.homestay_image_media_fingerprint_v1(p_primary_image);
  end if;
  return private.fingerprint_sha256_v1('homestay-thumbnail-media-v1', array[
    'version', private.fingerprint_json_string('homestay-thumbnail-media-v1'),
    'homestay_id', private.fingerprint_json_uuid_value(p_source.id, true),
    'thumbnail_bucket', private.fingerprint_json_text_value(p_source.thumbnail_bucket, false),
    'thumbnail_path', private.fingerprint_json_text_value(p_source.thumbnail_path, false),
    'primary_image_id', private.fingerprint_json_uuid_value(p_primary_image.id, false),
    'primary_image_media_fingerprint', private.fingerprint_json_text_value(l_primary_media_fingerprint, false)
  ]);
end;
$$;

alter function private.homestay_source_fingerprint_v1(public.homestays) owner to postgres;
alter function private.homestay_translation_fingerprint_v1(public.homestay_translations) owner to postgres;
alter function private.homestay_image_translation_fingerprint_v1(public.homestay_image_translations) owner to postgres;
alter function private.homestay_image_media_fingerprint_v1(public.homestay_images) owner to postgres;
alter function private.homestay_thumbnail_media_fingerprint_v1(public.homestays, public.homestay_images) owner to postgres;
revoke all on function private.homestay_source_fingerprint_v1(public.homestays) from public, anon, authenticated;
revoke all on function private.homestay_translation_fingerprint_v1(public.homestay_translations) from public, anon, authenticated;
revoke all on function private.homestay_image_translation_fingerprint_v1(public.homestay_image_translations) from public, anon, authenticated;
revoke all on function private.homestay_image_media_fingerprint_v1(public.homestay_images) from public, anon, authenticated;
revoke all on function private.homestay_thumbnail_media_fingerprint_v1(public.homestays, public.homestay_images) from public, anon, authenticated;

create or replace function private.homestay_optional_translation_matches_source(
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

alter function private.homestay_optional_translation_matches_source(text, text) owner to postgres;
revoke all on function private.homestay_optional_translation_matches_source(text, text) from public, anon, authenticated;

create or replace function private.enforce_homestay_source_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.source_revision <> 1 then
      raise exception using errcode = '42501', message = 'homestay source revision is database managed';
    end if;
    new.source_revision := 1;
    return new;
  end if;
  if new.source_revision is distinct from old.source_revision then
    raise exception using errcode = '42501', message = 'homestay source revision is database managed';
  end if;
  if old.source_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'homestay source revision overflow';
  end if;
  new.source_revision := old.source_revision + 1;
  return new;
end;
$$;

create trigger homestays_source_revision_trigger
before insert or update on public.homestays
for each row execute function private.enforce_homestay_source_revision();

create or replace function private.enforce_homestay_image_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
begin
  if l_actor is null then
    raise exception using errcode = '42501', message = 'homestay image actor is required';
  end if;
  if tg_op = 'INSERT' then
    new.binary_revision := 1;
    new.updated_by := l_actor;
    new.updated_at := pg_catalog.statement_timestamp();
  else
    if new.id is distinct from old.id
      or new.homestay_id is distinct from old.homestay_id
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
      or new.binary_revision is distinct from old.binary_revision then
      raise exception using errcode = '42501', message = 'homestay image revision is database managed';
    end if;
    if old.binary_revision = 9223372036854775807
      and (
        new.storage_bucket is distinct from old.storage_bucket
        or new.storage_path is distinct from old.storage_path
        or new.caption is distinct from old.caption
        or new.alt_text is distinct from old.alt_text
      ) then
      raise exception using errcode = '22003', message = 'homestay image revision overflow';
    end if;
    if new.storage_bucket is distinct from old.storage_bucket
      or new.storage_path is distinct from old.storage_path
      or new.caption is distinct from old.caption
      or new.alt_text is distinct from old.alt_text then
      new.binary_revision := old.binary_revision + 1;
    else
      new.binary_revision := old.binary_revision;
    end if;
    new.updated_by := l_actor;
    new.updated_at := pg_catalog.statement_timestamp();
  end if;
  return new;
end;
$$;

create trigger homestay_images_revision_trigger
before insert or update on public.homestay_images
for each row execute function private.enforce_homestay_image_revision();

create or replace function private.enforce_homestay_translation_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  l_actor uuid;
begin
  if pg_catalog.current_setting('homestay.workflow', true) <> 'on' then
    raise exception using errcode = '42501', message = 'homestay translations are writable only through workflow functions';
  end if;
  l_actor := auth.uid();
  if l_actor is null or new.updated_by is distinct from l_actor then
    raise exception using errcode = '42501', message = 'homestay translation actor is required';
  end if;
  if tg_op = 'INSERT' then
    if new.created_by is distinct from l_actor
      or new.edit_revision <> 1
      or new.translation_status <> 'draft'::public.publication_status
      or new.review_state <> 'pending'
      or new.terminology_review_confirmed then
      raise exception using errcode = '42501', message = 'homestay translation initial state is database managed';
    end if;
  else
    if new.id is distinct from old.id
      or new.locale is distinct from old.locale
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
      or new.edit_revision <> old.edit_revision + 1 then
      raise exception using errcode = '42501', message = 'homestay translation identity or revision is database managed';
    end if;
    if tg_table_name = 'homestay_translations'
      and (pg_catalog.to_jsonb(new)->>'homestay_id') is distinct from (pg_catalog.to_jsonb(old)->>'homestay_id') then
      raise exception using errcode = '42501', message = 'homestay translation identity is database managed';
    elsif tg_table_name = 'homestay_image_translations'
      and (pg_catalog.to_jsonb(new)->>'homestay_image_id') is distinct from (pg_catalog.to_jsonb(old)->>'homestay_image_id') then
      raise exception using errcode = '42501', message = 'homestay image translation identity is database managed';
    end if;
  end if;
  new.updated_at := pg_catalog.statement_timestamp();
  return new;
end;
$$;

create or replace function private.reject_homestay_translation_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception using errcode = '42501', message = 'homestay translation review history is append-only';
end;
$$;

create or replace function private.reject_homestay_image_translation_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception using errcode = '42501', message = 'homestay image translation review history is append-only';
end;
$$;

create trigger homestay_translations_write_guard_trigger
before insert or update on public.homestay_translations
for each row execute function private.enforce_homestay_translation_write();
create trigger homestay_image_translations_write_guard_trigger
before insert or update on public.homestay_image_translations
for each row execute function private.enforce_homestay_translation_write();
create trigger homestay_translation_events_append_only_trigger
before update or delete on public.homestay_translation_review_events
for each row execute function private.reject_homestay_translation_event_mutation();
create trigger homestay_image_translation_events_append_only_trigger
before update or delete on public.homestay_image_translation_review_events
for each row execute function private.reject_homestay_image_translation_event_mutation();

create or replace function private.record_homestay_translation_event(
  p_old public.homestay_translations,
  p_new public.homestay_translations,
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
security invoker
set search_path = pg_catalog
as $$
begin
  insert into public.homestay_translation_review_events (
    homestay_translation_id,
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
    p_new.id,
    p_event_type,
    case when p_old is null then p_new.translation_status else p_old.translation_status end,
    p_new.translation_status,
    case when p_old is null then p_new.review_state else p_old.review_state end,
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

create or replace function private.record_homestay_image_translation_event(
  p_old public.homestay_image_translations,
  p_new public.homestay_image_translations,
  p_event_type text,
  p_actor uuid,
  p_binary_revision bigint,
  p_media_fingerprint text,
  p_translation_fingerprint text,
  p_reason text default null
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  insert into public.homestay_image_translation_review_events (
    homestay_image_translation_id,
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
    case when p_old is null then p_new.translation_status else p_old.translation_status end,
    p_new.translation_status,
    case when p_old is null then p_new.review_state else p_old.review_state end,
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

alter function private.enforce_homestay_source_revision() owner to postgres;
alter function private.enforce_homestay_image_revision() owner to postgres;
alter function private.enforce_homestay_translation_write() owner to postgres;
alter function private.reject_homestay_translation_event_mutation() owner to postgres;
alter function private.reject_homestay_image_translation_event_mutation() owner to postgres;
alter function private.record_homestay_translation_event(public.homestay_translations, public.homestay_translations, text, uuid, bigint, text, text, text, text) owner to postgres;
alter function private.record_homestay_image_translation_event(public.homestay_image_translations, public.homestay_image_translations, text, uuid, bigint, text, text, text) owner to postgres;
revoke all on function private.enforce_homestay_source_revision() from public, anon, authenticated;
revoke all on function private.enforce_homestay_image_revision() from public, anon, authenticated;
revoke all on function private.enforce_homestay_translation_write() from public, anon, authenticated;
revoke all on function private.reject_homestay_translation_event_mutation() from public, anon, authenticated;
revoke all on function private.reject_homestay_image_translation_event_mutation() from public, anon, authenticated;
revoke all on function private.record_homestay_translation_event(public.homestay_translations, public.homestay_translations, text, uuid, bigint, text, text, text, text) from public, anon, authenticated;
revoke all on function private.record_homestay_image_translation_event(public.homestay_image_translations, public.homestay_image_translations, text, uuid, bigint, text, text, text) from public, anon, authenticated;

create or replace function private.homestay_current_primary_image(
  p_source public.homestays
)
returns public.homestay_images
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_primary_count bigint;
  l_image public.homestay_images;
begin
  select count(*)
    into l_primary_count
  from public.homestay_images as image
  where image.homestay_id = p_source.id
    and image.is_primary;

  if l_primary_count <> 1 then
    return null;
  end if;

  select image.*
    into l_image
  from public.homestay_images as image
  where image.homestay_id = p_source.id
    and image.is_primary;

  if not found
    or l_image.storage_bucket is distinct from p_source.thumbnail_bucket
    or l_image.storage_path is distinct from p_source.thumbnail_path then
    return null;
  end if;

  return l_image;
end;
$$;

create or replace function private.homestay_source_is_eligible(
  p_source public.homestays
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_primary public.homestay_images;
begin
  if p_source.id is null
    or p_source.status <> 'published'::public.publication_status
    or pg_catalog.btrim(p_source.name) = ''
    or pg_catalog.btrim(p_source.description) = ''
    or p_source.thumbnail_bucket is null
    or p_source.thumbnail_path is null
    or p_source.thumbnail_bucket <> 'tourism-media'
    or p_source.thumbnail_path !~ ('^homestay/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or p_source.source_revision <= 0
    or ((p_source.owner_name is not null or p_source.phone is not null)
      and not p_source.contact_consent_confirmed)
    or not private.fingerprint_text_array_is_valid(p_source.facilities) then
    return false;
  end if;
  l_primary := private.homestay_current_primary_image(p_source);
  if l_primary.id is null
    or l_primary.storage_bucket <> p_source.thumbnail_bucket
    or l_primary.storage_path <> p_source.thumbnail_path
    or l_primary.storage_path !~ ('^homestay/' || p_source.id::text || '/' || l_primary.id::text || '\.(jpg|png|webp)$')
    or l_primary.alt_text is null
    or pg_catalog.btrim(l_primary.alt_text) = '' then
    return false;
  end if;
  if not exists (
    select 1
    from storage.objects as object
    where object.bucket_id = l_primary.storage_bucket
      and object.name = l_primary.storage_path
  ) then
    return false;
  end if;
  perform private.homestay_source_fingerprint_v1(p_source);
  perform private.homestay_thumbnail_media_fingerprint_v1(p_source, l_primary);
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.homestay_translation_content_is_complete(
  p_source public.homestays,
  p_translation public.homestay_translations
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_index integer;
begin
  if p_translation.homestay_id <> p_source.id
    or p_translation.locale <> 'en'
    or pg_catalog.btrim(coalesce(p_translation.name, '')) = ''
    or pg_catalog.btrim(coalesce(p_translation.description, '')) = ''
    or not private.fingerprint_text_array_is_valid(p_source.facilities)
    or not private.fingerprint_text_array_is_valid(p_translation.facilities)
    or pg_catalog.cardinality(p_source.facilities) <> pg_catalog.cardinality(p_translation.facilities) then
    return false;
  end if;
  if not private.homestay_optional_translation_matches_source(p_source.address, p_translation.address)
    or not private.homestay_optional_translation_matches_source(p_source.price_note, p_translation.price_note) then
    return false;
  end if;
  if pg_catalog.cardinality(p_source.facilities) > 0 then
    for l_index in 1..pg_catalog.cardinality(p_source.facilities) loop
      if pg_catalog.btrim(coalesce(p_translation.facilities[l_index], '')) = '' then
        return false;
      end if;
    end loop;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.homestay_image_translation_content_is_complete(
  p_image public.homestay_images,
  p_translation public.homestay_image_translations
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_translation.homestay_image_id <> p_image.id
    or p_translation.locale <> 'en'
    or p_image.alt_text is null
    or pg_catalog.btrim(p_image.alt_text) = ''
    or pg_catalog.btrim(coalesce(p_translation.alt_text, '')) = '' then
    return false;
  end if;
  if private.fingerprint_normalize_text(p_image.caption) is null
    or private.fingerprint_normalize_text(p_image.caption) = '' then
    return p_translation.caption is null;
  end if;
  return p_translation.caption is null
    or pg_catalog.btrim(p_translation.caption) <> '';
exception when others then
  return false;
end;
$$;

create or replace function private.homestay_image_translation_is_eligible(
  p_source public.homestays,
  p_image public.homestay_images,
  p_translation public.homestay_image_translations
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
  if p_image.homestay_id <> p_source.id
    or p_translation.homestay_image_id <> p_image.id
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or p_source.status <> 'published'::public.publication_status
    or p_image.storage_bucket <> 'tourism-media'
    or p_image.storage_path !~ ('^homestay/' || p_source.id::text || '/' || p_image.id::text || '\.(jpg|png|webp)$')
    or not private.homestay_image_translation_content_is_complete(p_image, p_translation)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = p_image.storage_bucket
        and object.name = p_image.storage_path
    ) then
    return false;
  end if;
  l_media_fingerprint := private.homestay_image_media_fingerprint_v1(p_image);
  l_translation_fingerprint := private.homestay_image_translation_fingerprint_v1(p_translation);
  return p_translation.captured_media_fingerprint = l_media_fingerprint
    and p_translation.translation_fingerprint = l_translation_fingerprint;
exception when others then
  return false;
end;
$$;

create or replace function private.homestay_translation_is_eligible(
  p_source public.homestays,
  p_translation public.homestay_translations
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_primary public.homestay_images;
  l_primary_translation public.homestay_image_translations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if p_translation.homestay_id <> p_source.id
    or p_translation.locale <> 'en'
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or not p_source.status = 'published'::public.publication_status
    or not private.homestay_source_is_eligible(p_source)
    or not private.homestay_translation_content_is_complete(p_source, p_translation) then
    return false;
  end if;
  l_primary := private.homestay_current_primary_image(p_source);
  if l_primary.id is null then
    return false;
  end if;
  select translation.* into l_primary_translation
  from public.homestay_image_translations as translation
  where translation.homestay_image_id = l_primary.id
    and translation.locale = 'en';
  if not found
    or not private.homestay_image_translation_is_eligible(p_source, l_primary, l_primary_translation) then
    return false;
  end if;
  l_source_fingerprint := private.homestay_source_fingerprint_v1(p_source);
  l_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(p_source, l_primary);
  l_translation_fingerprint := private.homestay_translation_fingerprint_v1(p_translation);
  return p_translation.captured_source_fingerprint = l_source_fingerprint
    and p_translation.captured_thumbnail_media_fingerprint = l_thumbnail_fingerprint
    and p_translation.translation_fingerprint = l_translation_fingerprint;
exception when others then
  return false;
end;
$$;

create or replace function private.homestay_translation_admin_derived_state(
  p_source public.homestays,
  p_translation public.homestay_translations
)
returns table (
  lifecycle_state text,
  source_status public.publication_status,
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
stable
security definer
set search_path = ''
as $$
declare
  l_primary public.homestay_images;
  l_primary_translation public.homestay_image_translations;
  l_primary_eligible boolean := false;
  l_current_source_fingerprint text;
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
    l_current_source_fingerprint := private.homestay_source_fingerprint_v1(p_source);
  exception when others then
    l_current_source_fingerprint := null;
  end;
  begin
    l_primary := private.homestay_current_primary_image(p_source);
    l_current_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(p_source, l_primary);
  exception when others then
    l_primary := null;
    l_current_thumbnail_fingerprint := null;
  end;
  begin
    l_current_translation_fingerprint := private.homestay_translation_fingerprint_v1(p_translation);
  exception when others then
    l_current_translation_fingerprint := null;
  end;

  stale_source_fingerprint := p_translation.captured_source_fingerprint is not null
    and p_translation.captured_source_fingerprint is distinct from l_current_source_fingerprint;
  stale_thumbnail_media_fingerprint := p_translation.captured_thumbnail_media_fingerprint is not null
    and p_translation.captured_thumbnail_media_fingerprint is distinct from l_current_thumbnail_fingerprint;
  stale_translation_fingerprint := p_translation.translation_fingerprint is not null
    and p_translation.translation_fingerprint is distinct from l_current_translation_fingerprint;

  l_review_eligibility := not source_blocked
    and private.homestay_source_is_eligible(p_source)
    and private.homestay_translation_content_is_complete(p_source, p_translation);

  if l_primary.id is not null then
    select image_translation.*
      into l_primary_translation
    from public.homestay_image_translations as image_translation
    where image_translation.homestay_image_id = l_primary.id
      and image_translation.locale = 'en';
    if found then
      l_primary_eligible := private.homestay_image_translation_is_eligible(
        p_source, l_primary, l_primary_translation
      );
    end if;
  end if;

  l_publication_eligibility := l_review_eligibility
    and p_translation.translation_status <> 'archived'::public.publication_status
    and p_translation.review_state = 'reviewed'
    and p_translation.terminology_review_confirmed
    and not stale_source_fingerprint
    and not stale_thumbnail_media_fingerprint
    and not stale_translation_fingerprint
    and l_current_source_fingerprint is not null
    and l_current_thumbnail_fingerprint is not null
    and l_current_translation_fingerprint is not null
    and l_primary_eligible;

  l_public_eligibility := private.homestay_translation_is_eligible(p_source, p_translation);
  public_eligibility := l_public_eligibility;
  review_eligibility := l_review_eligibility;
  publication_eligibility := l_publication_eligibility;

  if p_translation.translation_status = 'archived'::public.publication_status then
    lifecycle_state := 'archived';
  elsif source_blocked then
    lifecycle_state := 'source-blocked';
  elsif p_translation.translation_status = 'published'::public.publication_status
    and p_translation.review_state = 'reviewed'
    and (stale_source_fingerprint or stale_thumbnail_media_fingerprint
      or stale_translation_fingerprint) then
    lifecycle_state := 'stale';
  elsif p_translation.translation_status = 'published'::public.publication_status then
    lifecycle_state := 'published';
  elsif p_translation.review_state = 'reviewed' then
    lifecycle_state := 'reviewed';
  else
    lifecycle_state := 'draft';
  end if;

  eligibility_reason := case
    when p_translation.translation_status = 'archived'::public.publication_status
      then 'translation is archived'
    when source_blocked then source_blocked_reason
    when stale_source_fingerprint then 'source fingerprint is stale'
    when stale_thumbnail_media_fingerprint then 'thumbnail media fingerprint is stale'
    when stale_translation_fingerprint then 'translation fingerprint is stale'
    when not l_review_eligibility then 'review eligibility failed'
    when p_translation.review_state <> 'reviewed' then 'review is required'
    when not p_translation.terminology_review_confirmed then 'terminology review confirmation is required'
    when l_current_source_fingerprint is null
      or l_current_thumbnail_fingerprint is null
      or l_current_translation_fingerprint is null then 'current fingerprint is unavailable'
    when not l_primary_eligible then 'primary image translation is not eligible'
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
  stale_source_fingerprint := true;
  stale_thumbnail_media_fingerprint := true;
  stale_translation_fingerprint := true;
  public_eligibility := false;
  review_eligibility := false;
  publication_eligibility := false;
  eligibility_reason := 'eligibility evaluation failed';
  return next;
end;
$$;

create or replace function private.homestay_image_translation_admin_derived_state(
  p_source public.homestays,
  p_image public.homestay_images,
  p_translation public.homestay_image_translations
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

  begin
    l_current_media_fingerprint := private.homestay_image_media_fingerprint_v1(p_image);
  exception when others then
    l_current_media_fingerprint := null;
  end;
  begin
    l_current_translation_fingerprint := private.homestay_image_translation_fingerprint_v1(p_translation);
  exception when others then
    l_current_translation_fingerprint := null;
  end;

  stale_media_fingerprint := p_translation.captured_media_fingerprint is not null
    and p_translation.captured_media_fingerprint is distinct from l_current_media_fingerprint;
  stale_translation_fingerprint := p_translation.translation_fingerprint is not null
    and p_translation.translation_fingerprint is distinct from l_current_translation_fingerprint;

  l_review_eligibility := not source_blocked
    and p_image.homestay_id = p_source.id
    and p_image.storage_bucket = 'tourism-media'
    and p_image.storage_path ~ ('^homestay/' || p_source.id::text || '/' || p_image.id::text || '\.(jpg|png|webp)$')
    and private.homestay_image_translation_content_is_complete(p_image, p_translation)
    and exists (
      select 1
      from storage.objects as object
      where object.bucket_id = p_image.storage_bucket
        and object.name = p_image.storage_path
    );

  l_publication_eligibility := l_review_eligibility
    and p_translation.translation_status <> 'archived'::public.publication_status
    and p_translation.review_state = 'reviewed'
    and p_translation.terminology_review_confirmed
    and not stale_media_fingerprint
    and not stale_translation_fingerprint
    and l_current_media_fingerprint is not null
    and l_current_translation_fingerprint is not null;

  l_public_eligibility := private.homestay_image_translation_is_eligible(
    p_source, p_image, p_translation
  );
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
    when l_current_media_fingerprint is null or l_current_translation_fingerprint is null
      then 'current fingerprint is unavailable'
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

create or replace function private.homestay_translation_source_cascade()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_translations;
  l_new public.homestay_translations;
  l_old_primary public.homestay_images;
  l_new_primary public.homestay_images;
  l_old_source_fingerprint text;
  l_new_source_fingerprint text;
  l_old_thumbnail_fingerprint text;
  l_new_thumbnail_fingerprint text;
  l_translation_fingerprint text;
  l_source_changed boolean;
  l_source_blocked boolean;
begin
  if l_actor is null then
    raise exception using errcode = '42501', message = 'homestay source cascade actor is required';
  end if;
  perform image.id
  from public.homestay_images as image
  where image.homestay_id = new.id
  order by image.id
  for update;

  l_old_primary := private.homestay_current_primary_image(old);
  l_new_primary := private.homestay_current_primary_image(new);
  l_old_source_fingerprint := private.homestay_source_fingerprint_v1(old);
  l_new_source_fingerprint := private.homestay_source_fingerprint_v1(new);
  l_old_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(old, l_old_primary);
  l_new_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(new, l_new_primary);
  l_source_changed := l_old_source_fingerprint is distinct from l_new_source_fingerprint
    or l_old_thumbnail_fingerprint is distinct from l_new_thumbnail_fingerprint;
  l_source_blocked := old.status = 'published'::public.publication_status
    and new.status <> 'published'::public.publication_status;

  if l_source_blocked then
    for l_old in
      select translation.*
      from public.homestay_translations as translation
      where translation.homestay_id = new.id
      order by translation.id
      for update
    loop
      perform pg_catalog.set_config('homestay.workflow', 'on', true);
      update public.homestay_translations as translation
      set translation_status = case
            when l_old.translation_status = 'archived'::public.publication_status
              then 'archived'::public.publication_status
            else 'draft'::public.publication_status
          end,
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
          archived_at = case
            when l_old.translation_status = 'archived'::public.publication_status
              then coalesce(l_old.archived_at, statement_timestamp())
            else null
          end,
          edit_revision = l_old.edit_revision + 1,
          updated_by = l_actor
      where translation.id = l_old.id
      returning translation.* into l_new;
      perform private.record_homestay_translation_event(
        l_old, l_new, 'source_blocked', l_actor, new.source_revision,
        l_new_source_fingerprint, l_new_thumbnail_fingerprint, null,
        'source is not publicly eligible'
      );
    end loop;
    return new;
  end if;

  if l_source_changed then
    for l_old in
      select translation.*
      from public.homestay_translations as translation
      where translation.homestay_id = new.id
      order by translation.id
      for update
    loop
      if l_old.review_state = 'reviewed'
        and l_old.translation_status <> 'published'::public.publication_status then
        perform pg_catalog.set_config('homestay.workflow', 'on', true);
        update public.homestay_translations as translation
        set translation_status = 'draft'::public.publication_status,
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
            edit_revision = l_old.edit_revision + 1,
            updated_by = l_actor
        where translation.id = l_old.id
        returning translation.* into l_new;
      else
        l_new := l_old;
      end if;
      begin
        l_translation_fingerprint := private.homestay_translation_fingerprint_v1(l_new);
      exception when others then
        l_translation_fingerprint := null;
      end;
      perform private.record_homestay_translation_event(
        l_old, l_new, 'source_changed', l_actor, new.source_revision,
        l_new_source_fingerprint, l_new_thumbnail_fingerprint, l_translation_fingerprint
      );
    end loop;
  end if;
  return new;
end;
$$;

create trigger homestays_translation_source_cascade_trigger
after update on public.homestays
for each row execute function private.homestay_translation_source_cascade();

create or replace function private.homestay_image_translation_media_cascade()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_image_translations;
  l_new public.homestay_image_translations;
  l_old_media_fingerprint text;
  l_new_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null then
    raise exception using errcode = '42501', message = 'homestay image media cascade actor is required';
  end if;
  l_old_media_fingerprint := private.homestay_image_media_fingerprint_v1(old);
  l_new_media_fingerprint := private.homestay_image_media_fingerprint_v1(new);
  if l_old_media_fingerprint is not distinct from l_new_media_fingerprint then
    return new;
  end if;
  for l_old in
    select translation.*
    from public.homestay_image_translations as translation
    where translation.homestay_image_id = new.id
    order by translation.id
    for update
  loop
    if l_old.review_state = 'reviewed'
      and l_old.translation_status <> 'published'::public.publication_status then
      perform pg_catalog.set_config('homestay.workflow', 'on', true);
      update public.homestay_image_translations as translation
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
          edit_revision = l_old.edit_revision + 1,
          updated_by = l_actor
      where translation.id = l_old.id
      returning translation.* into l_new;
    else
      l_new := l_old;
    end if;
    begin
      l_translation_fingerprint := private.homestay_image_translation_fingerprint_v1(l_new);
    exception when others then
      l_translation_fingerprint := null;
    end;
    perform private.record_homestay_image_translation_event(
      l_old, l_new, 'media_changed', l_actor, new.binary_revision,
      l_new_media_fingerprint, l_translation_fingerprint
    );
  end loop;
  return new;
end;
$$;

create trigger homestay_images_translation_media_cascade_trigger
after update on public.homestay_images
for each row execute function private.homestay_image_translation_media_cascade();

alter function private.homestay_current_primary_image(public.homestays) owner to postgres;
alter function private.homestay_source_is_eligible(public.homestays) owner to postgres;
alter function private.homestay_translation_content_is_complete(public.homestays, public.homestay_translations) owner to postgres;
alter function private.homestay_image_translation_content_is_complete(public.homestay_images, public.homestay_image_translations) owner to postgres;
alter function private.homestay_image_translation_is_eligible(public.homestays, public.homestay_images, public.homestay_image_translations) owner to postgres;
alter function private.homestay_translation_is_eligible(public.homestays, public.homestay_translations) owner to postgres;
alter function private.homestay_translation_admin_derived_state(public.homestays, public.homestay_translations) owner to postgres;
alter function private.homestay_image_translation_admin_derived_state(public.homestays, public.homestay_images, public.homestay_image_translations) owner to postgres;
alter function private.homestay_translation_source_cascade() owner to postgres;
alter function private.homestay_image_translation_media_cascade() owner to postgres;
revoke all on function private.homestay_current_primary_image(public.homestays) from public, anon, authenticated;
revoke all on function private.homestay_source_is_eligible(public.homestays) from public, anon, authenticated;
revoke all on function private.homestay_translation_content_is_complete(public.homestays, public.homestay_translations) from public, anon, authenticated;
revoke all on function private.homestay_image_translation_content_is_complete(public.homestay_images, public.homestay_image_translations) from public, anon, authenticated;
revoke all on function private.homestay_image_translation_is_eligible(public.homestays, public.homestay_images, public.homestay_image_translations) from public, anon, authenticated;
revoke all on function private.homestay_translation_is_eligible(public.homestays, public.homestay_translations) from public, anon, authenticated;
revoke all on function private.homestay_translation_admin_derived_state(public.homestays, public.homestay_translations) from public, anon, authenticated;
revoke all on function private.homestay_image_translation_admin_derived_state(public.homestays, public.homestay_images, public.homestay_image_translations) from public, anon, authenticated;
revoke all on function private.homestay_translation_source_cascade() from public, anon, authenticated;
revoke all on function private.homestay_image_translation_media_cascade() from public, anon, authenticated;

create or replace function private.lock_homestay_translation(p_translation_id uuid)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_translation public.homestay_translations;
begin
  select translation.* into l_translation
  from public.homestay_translations as translation
  where translation.id = p_translation_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'homestay translation not found';
  end if;
  perform source.id
  from public.homestays as source
  where source.id = l_translation.homestay_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'homestay source not found';
  end if;
  perform image.id
  from public.homestay_images as image
  where image.homestay_id = l_translation.homestay_id
  order by image.id
  for update;
  select translation.* into l_translation
  from public.homestay_translations as translation
  where translation.id = p_translation_id
  for update;
  return l_translation;
end;
$$;

create or replace function private.lock_homestay_image_translation(p_translation_id uuid)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_translation public.homestay_image_translations;
  l_image public.homestay_images;
begin
  select translation.* into l_translation
  from public.homestay_image_translations as translation
  where translation.id = p_translation_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'homestay image translation not found';
  end if;
  select image.* into l_image
  from public.homestay_images as image
  where image.id = l_translation.homestay_image_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'homestay source image not found';
  end if;
  perform source.id
  from public.homestays as source
  where source.id = l_image.homestay_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'homestay source not found';
  end if;
  perform image.id
  from public.homestay_images as image
  where image.homestay_id = l_image.homestay_id
  order by image.id
  for update;
  select image.* into l_image
  from public.homestay_images as image
  where image.id = l_translation.homestay_image_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'homestay source image not found';
  end if;
  select translation.* into l_translation
  from public.homestay_image_translations as translation
  where translation.id = p_translation_id
  for update;
  return l_translation;
end;
$$;

alter function private.lock_homestay_translation(uuid) owner to postgres;
alter function private.lock_homestay_image_translation(uuid) owner to postgres;
revoke all on function private.lock_homestay_translation(uuid) from public, anon, authenticated;
revoke all on function private.lock_homestay_image_translation(uuid) from public, anon, authenticated;

create or replace function public.homestay_translation_admin_read(
  p_homestay_id uuid
)
returns table (
  id uuid,
  homestay_id uuid,
  locale text,
  name text,
  description text,
  address text,
  price_note text,
  facilities text[],
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
    translation.homestay_id,
    translation.locale,
    translation.name,
    translation.description,
    translation.address,
    translation.price_note,
    translation.facilities,
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
  from public.homestay_translations as translation
  join public.homestays as source
    on source.id = translation.homestay_id
  cross join lateral private.homestay_translation_admin_derived_state(
    source, translation
  ) as derived
  where auth.uid() is not null
    and public.is_admin()
    and translation.homestay_id = p_homestay_id
  order by translation.id;
$$;

create or replace function public.homestay_image_translation_admin_read(
  p_homestay_image_id uuid
)
returns table (
  id uuid,
  homestay_image_id uuid,
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
  homestay_id uuid,
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
    translation.homestay_image_id,
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
    image.homestay_id,
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
  from public.homestay_image_translations as translation
  join public.homestay_images as image
    on image.id = translation.homestay_image_id
  join public.homestays as source
    on source.id = image.homestay_id
  cross join lateral private.homestay_image_translation_admin_derived_state(
    source, image, translation
  ) as derived
  where auth.uid() is not null
    and public.is_admin()
    and translation.homestay_image_id = p_homestay_image_id
  order by translation.id;
$$;

create or replace function public.homestay_translation_review_history(
  p_translation_id uuid
)
returns setof public.homestay_translation_review_events
language sql
security definer
set search_path = ''
as $$
  select event.*
  from public.homestay_translation_review_events as event
  where auth.uid() is not null
    and public.is_admin()
    and event.homestay_translation_id = p_translation_id
  order by event.occurred_at, event.id;
$$;

create or replace function public.homestay_image_translation_review_history(
  p_translation_id uuid
)
returns setof public.homestay_image_translation_review_events
language sql
security definer
set search_path = ''
as $$
  select event.*
  from public.homestay_image_translation_review_events as event
  where auth.uid() is not null
    and public.is_admin()
    and event.homestay_image_translation_id = p_translation_id
  order by event.occurred_at, event.id;
$$;

create or replace function public.homestay_translation_save_draft(
  p_homestay_id uuid,
  p_expected_edit_revision bigint,
  p_name text,
  p_description text,
  p_address text,
  p_price_note text,
  p_facilities text[]
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_source public.homestays;
  l_old public.homestay_translations;
  l_new public.homestay_translations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
  l_name text := nullif(pg_catalog.btrim(p_name), '');
  l_description text := nullif(pg_catalog.btrim(p_description), '');
  l_address text := nullif(pg_catalog.btrim(p_address), '');
  l_price_note text := nullif(pg_catalog.btrim(p_price_note), '');
  l_facilities text[] := coalesce(p_facilities, '{}'::text[]);
  l_index integer;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  select source.* into l_source
  from public.homestays as source
  where source.id = p_homestay_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'homestay source not found';
  end if;
  if (private.fingerprint_normalize_text(l_source.address) is null
      or private.fingerprint_normalize_text(l_source.address) = '')
      and l_address is not null
    or (private.fingerprint_normalize_text(l_source.price_note) is null
        or private.fingerprint_normalize_text(l_source.price_note) = '')
      and l_price_note is not null then
    raise exception using errcode = '23514', message = 'English content cannot be added without source content';
  end if;
  if not private.fingerprint_text_array_is_valid(l_source.facilities) then
    raise exception using errcode = '23514', message = 'source facilities are invalid';
  end if;
  if pg_catalog.cardinality(l_source.facilities) <> pg_catalog.cardinality(l_facilities) then
    raise exception using errcode = '23514', message = 'English facilities must preserve source cardinality';
  end if;
  if pg_catalog.cardinality(l_facilities) > 0 then
    for l_index in 1..pg_catalog.cardinality(l_facilities) loop
      l_facilities[l_index] := nullif(pg_catalog.btrim(l_facilities[l_index]), '');
      if l_facilities[l_index] is null then
        raise exception using errcode = '23514', message = 'English facilities entries are required';
      end if;
    end loop;
  end if;
  perform image.id
  from public.homestay_images as image
  where image.homestay_id = p_homestay_id
  order by image.id
  for update;
  select translation.* into l_old
  from public.homestay_translations as translation
  where translation.homestay_id = p_homestay_id
    and translation.locale = 'en'
  for update;

  if not found then
    if p_expected_edit_revision is not null then
      raise exception using errcode = 'P0002', message = 'homestay translation not found';
    end if;
    perform pg_catalog.set_config('homestay.workflow', 'on', true);
    insert into public.homestay_translations (
      homestay_id, name, description, address, price_note, facilities,
      created_by, updated_by
    ) values (
      p_homestay_id, l_name, l_description, l_address, l_price_note, l_facilities,
      l_actor, l_actor
    ) returning * into l_new;
    l_source_fingerprint := private.homestay_source_fingerprint_v1(l_source);
    l_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(
      l_source, private.homestay_current_primary_image(l_source)
    );
    begin
      l_translation_fingerprint := private.homestay_translation_fingerprint_v1(l_new);
    exception when others then
      l_translation_fingerprint := null;
    end;
    perform private.record_homestay_translation_event(
      null, l_new, 'draft_saved', l_actor, l_source.source_revision,
      l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
    );
    return l_new;
  end if;

  if p_expected_edit_revision is null
    or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay translation edit revision mismatch';
  end if;
  if l_old.translation_status = 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'published homestay translation must be unpublished or archived before editing';
  elsif l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'archived homestay translation must be restored first';
  end if;
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  update public.homestay_translations as translation
  set name = l_name,
      description = l_description,
      address = l_address,
      price_note = l_price_note,
      facilities = l_facilities,
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
  l_source_fingerprint := private.homestay_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(
    l_source, private.homestay_current_primary_image(l_source)
  );
  begin
    l_translation_fingerprint := private.homestay_translation_fingerprint_v1(l_new);
  exception when others then
    l_translation_fingerprint := null;
  end;
  perform private.record_homestay_translation_event(
    l_old, l_new, 'draft_saved', l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.homestay_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_terminology_review_confirmed boolean
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_translations;
  l_new public.homestay_translations;
  l_source public.homestays;
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
  l_old := private.lock_homestay_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'homestay translation is not pending review';
  end if;
  select source.* into l_source
  from public.homestays as source
  where source.id = l_old.homestay_id
  for update;
  if not private.homestay_source_is_eligible(l_source)
    or not private.homestay_translation_content_is_complete(l_source, l_old) then
    raise exception using errcode = '55000', message = 'homestay translation review eligibility failed';
  end if;
  l_source_fingerprint := private.homestay_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(
    l_source, private.homestay_current_primary_image(l_source)
  );
  l_translation_fingerprint := private.homestay_translation_fingerprint_v1(l_old);
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  update public.homestay_translations as translation
  set review_state = 'reviewed',
      terminology_review_confirmed = true,
      captured_source_revision = l_source.source_revision,
      captured_source_fingerprint = l_source_fingerprint,
      captured_thumbnail_media_fingerprint = l_thumbnail_fingerprint,
      translation_fingerprint = l_translation_fingerprint,
      reviewed_at = statement_timestamp(),
      reviewed_by = l_actor,
      review_reason = null,
      rejected_at = null,
      rejected_by = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_homestay_translation_event(
    l_old, l_new, 'reviewed', l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.homestay_translation_reject(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_reason text
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_translations;
  l_new public.homestay_translations;
  l_source public.homestays;
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
  l_old := private.lock_homestay_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state not in ('pending', 'reviewed') then
    raise exception using errcode = '55000', message = 'homestay translation cannot be rejected in its current state';
  end if;
  select source.* into l_source
  from public.homestays as source
  where source.id = l_old.homestay_id
  for update;
  l_source_fingerprint := private.homestay_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(
    l_source, private.homestay_current_primary_image(l_source)
  );
  begin
    l_translation_fingerprint := private.homestay_translation_fingerprint_v1(l_old);
  exception when others then
    l_translation_fingerprint := null;
  end;
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  update public.homestay_translations as translation
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
      rejected_at = statement_timestamp(),
      rejected_by = l_actor,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_homestay_translation_event(
    l_old, l_new, 'rejected', l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint,
    pg_catalog.btrim(p_reason)
  );
  return l_new;
end;
$$;

create or replace function private.homestay_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_translations;
  l_new public.homestay_translations;
  l_source public.homestays;
  l_primary public.homestay_images;
  l_primary_translation public.homestay_image_translations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_homestay_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not p_republish and (l_old.published_at is not null or l_old.translation_status <> 'draft'::public.publication_status))
    or (p_republish and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'homestay translation publication transition is invalid';
  end if;
  select source.* into l_source
  from public.homestays as source
  where source.id = l_old.homestay_id
  for update;
  if not private.homestay_source_is_eligible(l_source)
    or not private.homestay_translation_content_is_complete(l_source, l_old) then
    raise exception using errcode = '55000', message = 'homestay translation publication eligibility failed';
  end if;
  l_primary := private.homestay_current_primary_image(l_source);
  select translation.* into l_primary_translation
  from public.homestay_image_translations as translation
  where translation.homestay_image_id = l_primary.id
    and translation.locale = 'en';
  if not found
    or not private.homestay_image_translation_is_eligible(l_source, l_primary, l_primary_translation) then
    raise exception using errcode = '55000', message = 'homestay primary image translation publication eligibility failed';
  end if;
  l_source_fingerprint := private.homestay_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(
    l_source, private.homestay_current_primary_image(l_source)
  );
  l_translation_fingerprint := private.homestay_translation_fingerprint_v1(l_old);
  if l_old.terminology_review_confirmed is not true then
    raise exception using errcode = '55000', message = 'homestay terminology review is not confirmed';
  end if;
  if l_old.captured_source_fingerprint is distinct from l_source_fingerprint
    or l_old.captured_thumbnail_media_fingerprint is distinct from l_thumbnail_fingerprint
    or l_old.translation_fingerprint is distinct from l_translation_fingerprint then
    raise exception using errcode = '55000', message = 'fresh review required before homestay translation publication';
  end if;
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  update public.homestay_translations as translation
  set translation_status = 'published'::public.publication_status,
      published_at = statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_homestay_translation_event(
    l_old, l_new,
    case when p_republish then 'republished' else 'published' end,
    l_actor, l_source.source_revision, l_source_fingerprint,
    l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.homestay_translation_publish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, false
  );
end;
$$;

create or replace function public.homestay_translation_republish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, true
  );
end;
$$;

create or replace function private.homestay_translation_simple_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_action text
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_translations;
  l_new public.homestay_translations;
  l_source public.homestays;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
  l_event_type text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_action not in ('archive', 'unpublish', 'restore') then
    raise exception using errcode = '22023', message = 'unsupported homestay translation transition';
  end if;
  l_old := private.lock_homestay_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay translation edit revision mismatch';
  end if;
  if p_action = 'archive' and l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'homestay translation is already archived';
  elsif p_action = 'unpublish' and l_old.translation_status <> 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'homestay translation is not published';
  elsif p_action = 'restore' and l_old.translation_status <> 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'homestay translation is not archived';
  end if;
  select source.* into l_source
  from public.homestays as source
  where source.id = l_old.homestay_id
  for update;
  l_source_fingerprint := private.homestay_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.homestay_thumbnail_media_fingerprint_v1(
    l_source, private.homestay_current_primary_image(l_source)
  );
  begin
    l_translation_fingerprint := private.homestay_translation_fingerprint_v1(l_old);
  exception when others then
    l_translation_fingerprint := null;
  end;
  l_event_type := case p_action
    when 'archive' then 'archived'
    when 'unpublish' then 'unpublished'
    when 'restore' then 'restored'
    else p_action
  end;
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  if p_action = 'archive' then
    update public.homestay_translations as translation
    set translation_status = 'archived'::public.publication_status,
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
        archived_at = statement_timestamp(),
        edit_revision = l_old.edit_revision + 1,
        updated_by = l_actor
    where translation.id = l_old.id
    returning translation.* into l_new;
  elsif p_action = 'unpublish' then
    update public.homestay_translations as translation
    set translation_status = 'draft'::public.publication_status,
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
  else
    update public.homestay_translations as translation
    set translation_status = 'draft'::public.publication_status,
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
  end if;
  perform private.record_homestay_translation_event(
    l_old, l_new, l_event_type, l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.homestay_translation_archive(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'archive'
  );
end;
$$;

create or replace function public.homestay_translation_unpublish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'unpublish'
  );
end;
$$;

create or replace function public.homestay_translation_restore(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'restore'
  );
end;
$$;

create or replace function private.lock_homestay_image(p_image_id uuid)
returns public.homestay_images
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_image public.homestay_images;
begin
  select image.* into l_image
  from public.homestay_images as image
  where image.id = p_image_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'homestay source image not found';
  end if;
  perform source.id
  from public.homestays as source
  where source.id = l_image.homestay_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'homestay source not found';
  end if;
  perform image.id
  from public.homestay_images as image
  where image.homestay_id = l_image.homestay_id
  order by image.id
  for update;
  select image.* into l_image
  from public.homestay_images as image
  where image.id = p_image_id
  for update;
  return l_image;
end;
$$;

alter function private.lock_homestay_image(uuid) owner to postgres;
revoke all on function private.lock_homestay_image(uuid) from public, anon, authenticated;

create or replace function public.homestay_image_translation_save_draft(
  p_homestay_image_id uuid,
  p_expected_edit_revision bigint,
  p_alt_text text,
  p_caption text
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_image public.homestay_images;
  l_old public.homestay_image_translations;
  l_new public.homestay_image_translations;
  l_media_fingerprint text;
  l_translation_fingerprint text;
  l_alt_text text := nullif(pg_catalog.btrim(p_alt_text), '');
  l_caption text := nullif(pg_catalog.btrim(p_caption), '');
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_image := private.lock_homestay_image(p_homestay_image_id);
  if (private.fingerprint_normalize_text(l_image.caption) is null
      or private.fingerprint_normalize_text(l_image.caption) = '')
      and l_caption is not null then
    raise exception using errcode = '23514', message = 'English image caption cannot be added without source caption content';
  end if;
  select translation.* into l_old
  from public.homestay_image_translations as translation
  where translation.homestay_image_id = p_homestay_image_id
    and translation.locale = 'en'
  for update;

  if not found then
    if p_expected_edit_revision is not null then
      raise exception using errcode = 'P0002', message = 'homestay image translation not found';
    end if;
    perform pg_catalog.set_config('homestay.workflow', 'on', true);
    insert into public.homestay_image_translations (
      homestay_image_id, alt_text, caption, created_by, updated_by
    ) values (
      p_homestay_image_id, l_alt_text, l_caption, l_actor, l_actor
    ) returning * into l_new;
    l_media_fingerprint := private.homestay_image_media_fingerprint_v1(l_image);
    begin
      l_translation_fingerprint := private.homestay_image_translation_fingerprint_v1(l_new);
    exception when others then
      l_translation_fingerprint := null;
    end;
    perform private.record_homestay_image_translation_event(
      null, l_new, 'draft_saved', l_actor, l_image.binary_revision,
      l_media_fingerprint, l_translation_fingerprint
    );
    return l_new;
  end if;
  if p_expected_edit_revision is null
    or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay image translation edit revision mismatch';
  end if;
  if l_old.translation_status = 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'published homestay image translation must be unpublished or archived before editing';
  elsif l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'archived homestay image translation must be restored first';
  end if;
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  update public.homestay_image_translations as translation
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
  l_media_fingerprint := private.homestay_image_media_fingerprint_v1(l_image);
  begin
    l_translation_fingerprint := private.homestay_image_translation_fingerprint_v1(l_new);
  exception when others then
    l_translation_fingerprint := null;
  end;
  perform private.record_homestay_image_translation_event(
    l_old, l_new, 'draft_saved', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.homestay_image_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_terminology_review_confirmed boolean
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_image_translations;
  l_new public.homestay_image_translations;
  l_image public.homestay_images;
  l_source public.homestays;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if not coalesce(p_terminology_review_confirmed, false) then
    raise exception using errcode = '23514', message = 'cultural terminology review confirmation is required';
  end if;
  l_old := private.lock_homestay_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'homestay image translation is not pending review';
  end if;
  select image.* into l_image
  from public.homestay_images as image
  where image.id = l_old.homestay_image_id;
  select source.* into l_source
  from public.homestays as source
  where source.id = l_image.homestay_id;
  if l_source.status <> 'published'::public.publication_status
    or l_image.storage_bucket <> 'tourism-media'
    or l_image.storage_path !~ ('^homestay/' || l_source.id::text || '/' || l_image.id::text || '\.(jpg|png|webp)$')
    or not private.homestay_image_translation_content_is_complete(l_image, l_old)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = l_image.storage_bucket
        and object.name = l_image.storage_path
    ) then
    raise exception using errcode = '55000', message = 'homestay image translation review eligibility failed';
  end if;
  l_media_fingerprint := private.homestay_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.homestay_image_translation_fingerprint_v1(l_old);
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  update public.homestay_image_translations as translation
  set review_state = 'reviewed',
      terminology_review_confirmed = true,
      captured_media_fingerprint = l_media_fingerprint,
      translation_fingerprint = l_translation_fingerprint,
      reviewed_at = statement_timestamp(),
      reviewed_by = l_actor,
      review_reason = null,
      rejected_at = null,
      rejected_by = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_homestay_image_translation_event(
    l_old, l_new, 'reviewed', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.homestay_image_translation_reject(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_reason text
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_image_translations;
  l_new public.homestay_image_translations;
  l_image public.homestay_images;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '23514', message = 'rejection reason is required';
  end if;
  l_old := private.lock_homestay_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state not in ('pending', 'reviewed') then
    raise exception using errcode = '55000', message = 'homestay image translation cannot be rejected in its current state';
  end if;
  select image.* into l_image
  from public.homestay_images as image
  where image.id = l_old.homestay_image_id;
  l_media_fingerprint := private.homestay_image_media_fingerprint_v1(l_image);
  begin
    l_translation_fingerprint := private.homestay_image_translation_fingerprint_v1(l_old);
  exception when others then
    l_translation_fingerprint := null;
  end;
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  update public.homestay_image_translations as translation
  set translation_status = 'draft'::public.publication_status,
      review_state = 'rejected',
      captured_media_fingerprint = null,
      translation_fingerprint = null,
      terminology_review_confirmed = false,
      reviewed_at = null,
      reviewed_by = null,
      review_reason = pg_catalog.btrim(p_reason),
      rejected_at = statement_timestamp(),
      rejected_by = l_actor,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_homestay_image_translation_event(
    l_old, l_new, 'rejected', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint, pg_catalog.btrim(p_reason)
  );
  return l_new;
end;
$$;

create or replace function private.homestay_image_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_image_translations;
  l_new public.homestay_image_translations;
  l_image public.homestay_images;
  l_source public.homestays;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_homestay_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay image translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not p_republish and (l_old.published_at is not null or l_old.translation_status <> 'draft'::public.publication_status))
    or (p_republish and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'homestay image translation publication transition is invalid';
  end if;
  select image.* into l_image
  from public.homestay_images as image
  where image.id = l_old.homestay_image_id;
  select source.* into l_source
  from public.homestays as source
  where source.id = l_image.homestay_id
  for update;
  if l_source.status <> 'published'::public.publication_status
    or l_image.storage_bucket <> 'tourism-media'
    or l_image.storage_path !~ ('^homestay/' || l_source.id::text || '/' || l_image.id::text || '\.(jpg|png|webp)$')
    or not private.homestay_image_translation_content_is_complete(l_image, l_old)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = l_image.storage_bucket
        and object.name = l_image.storage_path
    ) then
    raise exception using errcode = '55000', message = 'homestay image translation publication eligibility failed';
  end if;
  l_media_fingerprint := private.homestay_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.homestay_image_translation_fingerprint_v1(l_old);
  if l_old.terminology_review_confirmed is not true
    or l_old.captured_media_fingerprint is distinct from l_media_fingerprint
    or l_old.translation_fingerprint is distinct from l_translation_fingerprint then
    raise exception using errcode = '55000', message = 'fresh review required before homestay image translation publication';
  end if;
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  update public.homestay_image_translations as translation
  set translation_status = 'published'::public.publication_status,
      published_at = statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_homestay_image_translation_event(
    l_old, l_new,
    case when p_republish then 'republished' else 'published' end,
    l_actor, l_image.binary_revision, l_media_fingerprint,
    l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.homestay_image_translation_publish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_image_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, false
  );
end;
$$;

create or replace function public.homestay_image_translation_republish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_image_translation_publish_transition(
    p_translation_id, p_expected_edit_revision, true
  );
end;
$$;

create or replace function private.homestay_image_translation_simple_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_action text
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.homestay_image_translations;
  l_new public.homestay_image_translations;
  l_image public.homestay_images;
  l_media_fingerprint text;
  l_translation_fingerprint text;
  l_event_type text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_action not in ('archive', 'unpublish', 'restore') then
    raise exception using errcode = '22023', message = 'unsupported homestay image translation transition';
  end if;
  l_old := private.lock_homestay_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'homestay image translation edit revision mismatch';
  end if;
  if p_action = 'archive' and l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'homestay image translation is already archived';
  elsif p_action = 'unpublish' and l_old.translation_status <> 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'homestay image translation is not published';
  elsif p_action = 'restore' and l_old.translation_status <> 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'homestay image translation is not archived';
  end if;
  select image.* into l_image
  from public.homestay_images as image
  where image.id = l_old.homestay_image_id;
  l_media_fingerprint := private.homestay_image_media_fingerprint_v1(l_image);
  begin
    l_translation_fingerprint := private.homestay_image_translation_fingerprint_v1(l_old);
  exception when others then
    l_translation_fingerprint := null;
  end;
  l_event_type := case p_action
    when 'archive' then 'archived'
    when 'unpublish' then 'unpublished'
    when 'restore' then 'restored'
    else p_action
  end;
  perform pg_catalog.set_config('homestay.workflow', 'on', true);
  if p_action = 'archive' then
    update public.homestay_image_translations as translation
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
        archived_at = statement_timestamp(),
        edit_revision = l_old.edit_revision + 1,
        updated_by = l_actor
    where translation.id = l_old.id
    returning translation.* into l_new;
  elsif p_action = 'unpublish' then
    update public.homestay_image_translations as translation
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
    update public.homestay_image_translations as translation
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
  perform private.record_homestay_image_translation_event(
    l_old, l_new, l_event_type, l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.homestay_image_translation_archive(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_image_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'archive'
  );
end;
$$;

create or replace function public.homestay_image_translation_unpublish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_image_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'unpublish'
  );
end;
$$;

create or replace function public.homestay_image_translation_restore(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.homestay_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.homestay_image_translation_simple_transition(
    p_translation_id, p_expected_edit_revision, 'restore'
  );
end;
$$;

create or replace function private.homestay_english_parent_eligibility(
  p_source public.homestays,
  p_translation public.homestay_translations
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.homestay_translation_is_eligible(p_source, p_translation);
$$;

create or replace function private.homestay_english_image_eligibility(
  p_source public.homestays,
  p_image public.homestay_images,
  p_translation public.homestay_image_translations
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.homestay_image_translation_is_eligible(p_source, p_image, p_translation);
$$;

create or replace function private.published_english_homestay_rows()
returns table (
  id uuid,
  translation_id uuid,
  slug text,
  name text,
  description text,
  address text,
  price_note text,
  facilities text[],
  latitude numeric,
  longitude numeric,
  google_maps_url text,
  owner_name text,
  phone text,
  thumbnail_bucket text,
  thumbnail_path text,
  is_featured boolean,
  display_order integer,
  published_at timestamptz,
  translation_published_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    source.id,
    translation.id,
    source.slug,
    translation.name,
    translation.description,
    translation.address,
    translation.price_note,
    translation.facilities,
    source.latitude,
    source.longitude,
    source.google_maps_url,
    case when source.contact_consent_confirmed then source.owner_name else null end,
    case when source.contact_consent_confirmed then source.phone else null end,
    source.thumbnail_bucket,
    source.thumbnail_path,
    source.is_featured,
    source.display_order,
    source.published_at,
    translation.published_at
  from public.homestays as source
  join public.homestay_translations as translation
    on translation.homestay_id = source.id
   and translation.locale = 'en'
  where private.homestay_english_parent_eligibility(source, translation);
$$;

create or replace function private.published_english_homestay_image_rows()
returns table (
  id uuid,
  homestay_id uuid,
  translation_id uuid,
  storage_bucket text,
  storage_path text,
  alt_text text,
  caption text,
  display_order integer,
  is_primary boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    image.id,
    image.homestay_id,
    translation.id,
    image.storage_bucket,
    image.storage_path,
    translation.alt_text,
    translation.caption,
    image.display_order,
    image.is_primary
  from public.homestay_images as image
  join public.homestays as source
    on source.id = image.homestay_id
  join public.homestay_translations as parent_translation
    on parent_translation.homestay_id = source.id
   and parent_translation.locale = 'en'
  join public.homestay_image_translations as translation
    on translation.homestay_image_id = image.id
   and translation.locale = 'en'
  where private.homestay_english_parent_eligibility(source, parent_translation)
    and private.homestay_english_image_eligibility(source, image, translation);
$$;

-- Public views cannot rely-- Public views cannot rely on EXECUTE privileges for private projection
-- functions: PostgreSQL checks function execution as the querying role even
-- when the function appears inside an owner-controlled view.  Keep the
-- callable projection wrappers private and expose equivalent safe projections
-- through owner-controlled views whose predicates are expressed directly in
-- the view definitions.  No private eligibility or fingerprint function is
-- callable by anon/authenticated through these views.
create view private.published_english_homestay_rows_data
with (security_barrier = true, security_invoker = false)
as
with primary_counts as (
  select image.homestay_id, count(*) as primary_count
  from public.homestay_images as image
  where image.is_primary
  group by image.homestay_id
), base as (
  select
    source.id as source_id,
    source.slug,
    source.status as source_status,
    source.name as source_name,
    source.description as source_description,
    source.address as source_address,
    source.price_per_night,
    source.price_note as source_price_note,
    source.facilities as source_facilities,
    source.owner_name,
    source.phone,
    source.contact_consent_confirmed,
    source.latitude,
    source.longitude,
    source.google_maps_url,
    source.thumbnail_bucket,
    source.thumbnail_path,
    source.is_featured,
    source.display_order,
    source.published_at as source_published_at,
    source.source_revision,
    image.id as primary_image_id,
    image.storage_bucket as primary_storage_bucket,
    image.storage_path as primary_storage_path,
    image.caption as primary_caption,
    image.alt_text as primary_alt_text,
    image.binary_revision as primary_binary_revision,
    translation.id as translation_id,
    translation.name as translation_name,
    translation.description as translation_description,
    translation.address as translation_address,
    translation.price_note as translation_price_note,
    translation.facilities as translation_facilities,
    translation.translation_status,
    translation.review_state,
    translation.terminology_review_confirmed,
    translation.captured_source_fingerprint,
    translation.captured_thumbnail_media_fingerprint,
    translation.translation_fingerprint,
    translation.published_at as translation_published_at,
    primary_translation.translation_status as primary_translation_status,
    primary_translation.review_state as primary_review_state,
    primary_translation.alt_text as primary_translation_alt_text,
    primary_translation.caption as primary_translation_caption,
    primary_translation.captured_media_fingerprint as primary_captured_media_fingerprint,
    primary_translation.translation_fingerprint as primary_translation_fingerprint
  from public.homestays as source
  join primary_counts
    on primary_counts.homestay_id = source.id
   and primary_counts.primary_count = 1
  join public.homestay_images as image
    on image.homestay_id = source.id
   and image.is_primary
  join public.homestay_translations as translation
    on translation.homestay_id = source.id
   and translation.locale = 'en'
  join public.homestay_image_translations as primary_translation
    on primary_translation.homestay_image_id = image.id
   and primary_translation.locale = 'en'
), normalized as (
  select
    base.*,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_name_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_description_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_address, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_address_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_price_note, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_price_note_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.primary_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_caption_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.primary_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.translation_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_name_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.translation_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_description_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.translation_address, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_address_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.translation_price_note, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_price_note_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.primary_translation_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_translation_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.primary_translation_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_translation_caption_normalized
  from base
), source_fingerprinted as (
  select
    normalized.*,
    'homestay-source-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('homestay-source-v1'::text)::text || ',"name":' || pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text || ',"description":' || pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text || ',"address":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_address, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null') || ',"price_per_night":' || coalesce(pg_catalog.trim_scale(price_per_night)::text, 'null') || ',"price_note":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_price_note, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null') || ',"facilities":' || coalesce((select '[' || pg_catalog.string_agg(pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text, ',' order by ordinal) || ']' from pg_catalog.unnest(source_facilities) with ordinality as item(value, ordinal)), '[]') || '}', 'UTF8'), 'sha256'), 'hex') as source_fingerprint,
    'homestay-media-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('homestay-media-v1'::text)::text || ',"homestay_image_id":' || pg_catalog.to_json(pg_catalog.lower(primary_image_id::text))::text || ',"storage_bucket":' || pg_catalog.to_json(primary_storage_bucket)::text || ',"storage_path":' || pg_catalog.to_json(primary_storage_path)::text || ',"caption":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null') || ',"alt_text":' || pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text || ',"binary_revision":' || primary_binary_revision::text || '}', 'UTF8'), 'sha256'), 'hex') as primary_media_fingerprint
  from normalized
), thumbnail_fingerprinted as (
  select
    source_fingerprinted.*,
    'homestay-thumbnail-media-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('homestay-thumbnail-media-v1'::text)::text || ',"homestay_id":' || pg_catalog.to_json(pg_catalog.lower(source_id::text))::text || ',"thumbnail_bucket":' || coalesce(pg_catalog.to_json(nullif(thumbnail_bucket, ''))::text, 'null') || ',"thumbnail_path":' || coalesce(pg_catalog.to_json(nullif(thumbnail_path, ''))::text, 'null') || ',"primary_image_id":' || coalesce(pg_catalog.to_json(pg_catalog.lower(primary_image_id::text))::text, 'null') || ',"primary_image_media_fingerprint":' || coalesce(pg_catalog.to_json(primary_media_fingerprint)::text, 'null') || '}', 'UTF8'), 'sha256'), 'hex') as thumbnail_fingerprint
  from source_fingerprinted
), parent_fingerprinted as (
  select
    thumbnail_fingerprinted.*,
    'homestay-translation-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('homestay-translation-v1'::text)::text || ',"name":' || pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text || ',"description":' || pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text || ',"address":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_address, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null') || ',"price_note":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_price_note, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null') || ',"facilities":' || coalesce((select '[' || pg_catalog.string_agg(pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text, ',' order by ordinal) || ']' from pg_catalog.unnest(translation_facilities) with ordinality as item(value, ordinal)), '[]') || '}', 'UTF8'), 'sha256'), 'hex') as current_translation_fingerprint,
    'homestay-media-translation-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('homestay-media-translation-v1'::text)::text || ',"alt_text":' || pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_translation_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text || ',"caption":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(primary_translation_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null') || '}', 'UTF8'), 'sha256'), 'hex') as primary_current_translation_fingerprint
  from thumbnail_fingerprinted
)
select
  parent_fingerprinted.source_id as id,
  parent_fingerprinted.translation_id,
  parent_fingerprinted.slug,
  parent_fingerprinted.translation_name as name,
  parent_fingerprinted.translation_description as description,
  parent_fingerprinted.price_per_night,
  parent_fingerprinted.translation_address as address,
  parent_fingerprinted.translation_price_note as price_note,
  parent_fingerprinted.translation_facilities as facilities,
  parent_fingerprinted.latitude,
  parent_fingerprinted.longitude,
  parent_fingerprinted.google_maps_url,
  case when parent_fingerprinted.contact_consent_confirmed then parent_fingerprinted.owner_name else null end as owner_name,
  case when parent_fingerprinted.contact_consent_confirmed then parent_fingerprinted.phone else null end as phone,
  parent_fingerprinted.thumbnail_bucket,
  parent_fingerprinted.thumbnail_path,
  parent_fingerprinted.is_featured,
  parent_fingerprinted.display_order,
  parent_fingerprinted.source_published_at as published_at,
  parent_fingerprinted.translation_published_at
from parent_fingerprinted
where parent_fingerprinted.source_status = 'published'::public.publication_status
  and (
    (parent_fingerprinted.owner_name is null and parent_fingerprinted.phone is null)
    or parent_fingerprinted.contact_consent_confirmed
  )
  and coalesce(parent_fingerprinted.source_name_normalized, '') <> ''
  and coalesce(parent_fingerprinted.source_description_normalized, '') <> ''
  and parent_fingerprinted.source_revision > 0
  and (parent_fingerprinted.price_per_night is null or parent_fingerprinted.price_per_night::text not in ('NaN', 'Infinity', '-Infinity'))
  and parent_fingerprinted.source_facilities is not null
  and not exists (
    select 1
    from pg_catalog.unnest(parent_fingerprinted.source_facilities) as facility(value)
    where facility.value is null or pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(facility.value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) = ''
  )
  and parent_fingerprinted.translation_status = 'published'::public.publication_status
  and parent_fingerprinted.review_state = 'reviewed'
  and parent_fingerprinted.terminology_review_confirmed
  and coalesce(parent_fingerprinted.translation_name_normalized, '') <> ''
  and coalesce(parent_fingerprinted.translation_description_normalized, '') <> ''
  and parent_fingerprinted.translation_facilities is not null
  and pg_catalog.cardinality(parent_fingerprinted.source_facilities) = pg_catalog.cardinality(parent_fingerprinted.translation_facilities)
  and not exists (
    select 1
    from pg_catalog.unnest(parent_fingerprinted.translation_facilities) as facility(value)
    where facility.value is null or pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(facility.value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) = ''
  )
  and (
    (coalesce(parent_fingerprinted.source_address_normalized, '') = ''
      and coalesce(parent_fingerprinted.translation_address_normalized, '') = '')
    or (coalesce(parent_fingerprinted.source_address_normalized, '') <> ''
      and coalesce(parent_fingerprinted.translation_address_normalized, '') <> '')
  )
  and (
    (coalesce(parent_fingerprinted.source_price_note_normalized, '') = ''
      and coalesce(parent_fingerprinted.translation_price_note_normalized, '') = '')
    or (coalesce(parent_fingerprinted.source_price_note_normalized, '') <> ''
      and coalesce(parent_fingerprinted.translation_price_note_normalized, '') <> '')
  )
  and parent_fingerprinted.thumbnail_bucket = 'tourism-media'
  and parent_fingerprinted.thumbnail_path ~ ('^homestay/' || parent_fingerprinted.source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
  and parent_fingerprinted.primary_storage_bucket = parent_fingerprinted.thumbnail_bucket
  and parent_fingerprinted.primary_storage_path = parent_fingerprinted.thumbnail_path
  and parent_fingerprinted.primary_storage_path ~ ('^homestay/' || parent_fingerprinted.source_id::text || '/' || parent_fingerprinted.primary_image_id::text || '\.(jpg|png|webp)$')
  and coalesce(parent_fingerprinted.primary_alt_text_normalized, '') <> ''
  and exists (
    select 1
    from storage.objects as object
    where object.bucket_id = parent_fingerprinted.primary_storage_bucket
      and object.name = parent_fingerprinted.primary_storage_path
  )
  and parent_fingerprinted.primary_translation_status = 'published'::public.publication_status
  and parent_fingerprinted.primary_review_state = 'reviewed'
  and coalesce(parent_fingerprinted.primary_translation_alt_text_normalized, '') <> ''
  and (
    (coalesce(parent_fingerprinted.primary_caption_normalized, '') = ''
      and parent_fingerprinted.primary_translation_caption is null)
    or (coalesce(parent_fingerprinted.primary_caption_normalized, '') <> ''
      and (
        parent_fingerprinted.primary_translation_caption is null
        or coalesce(parent_fingerprinted.primary_translation_caption_normalized, '') <> ''
      ))
  )
  and parent_fingerprinted.captured_source_fingerprint = parent_fingerprinted.source_fingerprint
  and parent_fingerprinted.captured_thumbnail_media_fingerprint = parent_fingerprinted.thumbnail_fingerprint
  and parent_fingerprinted.translation_fingerprint = parent_fingerprinted.current_translation_fingerprint
  and parent_fingerprinted.primary_captured_media_fingerprint = parent_fingerprinted.primary_media_fingerprint
  and parent_fingerprinted.primary_translation_fingerprint = parent_fingerprinted.primary_current_translation_fingerprint;

create view private.published_english_homestay_image_rows_data
with (security_barrier = true, security_invoker = false)
as
with base as (
  select
    parent.id as homestay_id,
    image.id,
    translation.id as translation_id,
    image.storage_bucket,
    image.storage_path,
    image.caption as source_caption,
    image.alt_text as source_alt_text,
    image.binary_revision,
    image.display_order,
    image.is_primary,
    translation.alt_text,
    translation.caption,
    translation.translation_status,
    translation.review_state,
    translation.captured_media_fingerprint,
    translation.translation_fingerprint
  from private.published_english_homestay_rows_data as parent
  join public.homestay_images as image
    on image.homestay_id = parent.id
  join public.homestay_image_translations as translation
    on translation.homestay_image_id = image.id
   and translation.locale = 'en'
), normalized as (
  select
    base.*,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_caption_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_caption_normalized
  from base
), fingerprinted as (
  select
    normalized.*,
    'homestay-media-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('homestay-media-v1'::text)::text || ',"homestay_image_id":' || pg_catalog.to_json(pg_catalog.lower(id::text))::text || ',"storage_bucket":' || pg_catalog.to_json(storage_bucket)::text || ',"storage_path":' || pg_catalog.to_json(storage_path)::text || ',"caption":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null') || ',"alt_text":' || pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text || ',"binary_revision":' || binary_revision::text || '}', 'UTF8'), 'sha256'), 'hex') as media_fingerprint,
    'homestay-media-translation-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('homestay-media-translation-v1'::text)::text || ',"alt_text":' || pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text || ',"caption":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null') || '}', 'UTF8'), 'sha256'), 'hex') as current_translation_fingerprint
  from normalized
)
select
  fingerprinted.id,
  fingerprinted.homestay_id,
  fingerprinted.translation_id,
  fingerprinted.storage_bucket,
  fingerprinted.storage_path,
  fingerprinted.alt_text,
  fingerprinted.caption,
  fingerprinted.display_order,
  fingerprinted.is_primary
from fingerprinted
where fingerprinted.storage_bucket = 'tourism-media'
  and fingerprinted.storage_path ~ ('^homestay/' || fingerprinted.homestay_id::text || '/' || fingerprinted.id::text || '\.(jpg|png|webp)$')
  and coalesce(fingerprinted.source_alt_text_normalized, '') <> ''
  and fingerprinted.translation_status = 'published'::public.publication_status
  and fingerprinted.review_state = 'reviewed'
  and coalesce(fingerprinted.translation_alt_text_normalized, '') <> ''
  and (
    (coalesce(fingerprinted.source_caption_normalized, '') = ''
      and fingerprinted.caption is null)
    or (coalesce(fingerprinted.source_caption_normalized, '') <> ''
      and (
        fingerprinted.caption is null
        or coalesce(fingerprinted.translation_caption_normalized, '') <> ''
      ))
  )
  and exists (
    select 1
    from storage.objects as object
    where object.bucket_id = fingerprinted.storage_bucket
      and object.name = fingerprinted.storage_path
  )
  and fingerprinted.captured_media_fingerprint = fingerprinted.media_fingerprint
  and fingerprinted.translation_fingerprint = fingerprinted.current_translation_fingerprint;

create view public.published_english_homestays
with (security_barrier = true, security_invoker = false)
as
select
  published.id,
  published.translation_id,
  published.slug,
  published.name,
  published.description,
  published.price_per_night,
  published.address,
  published.price_note,
  published.facilities,
  published.latitude,
  published.longitude,
  published.google_maps_url,
  published.owner_name,
  published.phone,
  published.thumbnail_bucket,
  published.thumbnail_path,
  published.is_featured,
  published.display_order,
  published.published_at,
  published.translation_published_at
from private.published_english_homestay_rows_data as published;

create view public.published_english_homestay_images
with (security_barrier = true, security_invoker = false)
as
select
  published.id,
  published.homestay_id,
  published.translation_id,
  published.storage_bucket,
  published.storage_path,
  published.alt_text,
  published.caption,
  published.display_order,
  published.is_primary
from private.published_english_homestay_image_rows_data as published;

alter table public.homestay_translations enable row level security;
alter table public.homestay_image_translations enable row level security;
alter table public.homestay_translation_review_events enable row level security;
alter table public.homestay_image_translation_review_events enable row level security;

alter table public.homestay_translations owner to postgres;
alter table public.homestay_image_translations owner to postgres;
alter table public.homestay_translation_review_events owner to postgres;
alter table public.homestay_image_translation_review_events owner to postgres;
alter view private.published_english_homestay_rows_data owner to postgres;
alter view private.published_english_homestay_image_rows_data owner to postgres;
alter view public.published_english_homestays owner to postgres;
alter view public.published_english_homestay_images owner to postgres;
alter function private.homestay_english_parent_eligibility(public.homestays, public.homestay_translations) owner to postgres;
alter function private.homestay_english_image_eligibility(public.homestays, public.homestay_images, public.homestay_image_translations) owner to postgres;
alter function private.published_english_homestay_rows() owner to postgres;
alter function private.published_english_homestay_image_rows() owner to postgres;

revoke all on table public.homestay_translations from public, anon, authenticated;
revoke all on table public.homestay_image_translations from public, anon, authenticated;
revoke all on table public.homestay_translation_review_events from public, anon, authenticated;
revoke all on table public.homestay_image_translation_review_events from public, anon, authenticated;
revoke all on private.published_english_homestay_rows_data from public, anon, authenticated;
revoke all on private.published_english_homestay_image_rows_data from public, anon, authenticated;
revoke all on public.published_english_homestays from public, anon, authenticated;
revoke all on public.published_english_homestay_images from public, anon, authenticated;
revoke all on function private.homestay_english_parent_eligibility(public.homestays, public.homestay_translations) from public, anon, authenticated;
revoke all on function private.homestay_english_image_eligibility(public.homestays, public.homestay_images, public.homestay_image_translations) from public, anon, authenticated;
revoke all on function private.published_english_homestay_rows() from public, anon, authenticated;
revoke all on function private.published_english_homestay_image_rows() from public, anon, authenticated;

revoke all on function public.homestay_translation_admin_read(uuid) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_admin_read(uuid) from public, anon, authenticated;
revoke all on function public.homestay_translation_review_history(uuid) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_review_history(uuid) from public, anon, authenticated;
revoke all on function public.homestay_translation_save_draft(uuid, bigint, text, text, text, text, text[]) from public, anon, authenticated;
revoke all on function public.homestay_translation_review(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function public.homestay_translation_reject(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.homestay_translation_publish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.homestay_translation_republish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.homestay_translation_archive(uuid, bigint) from public, anon, authenticated;
revoke all on function public.homestay_translation_unpublish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.homestay_translation_restore(uuid, bigint) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_save_draft(uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_review(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_reject(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_publish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_republish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_archive(uuid, bigint) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_unpublish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.homestay_image_translation_restore(uuid, bigint) from public, anon, authenticated;

alter function public.homestay_translation_admin_read(uuid) owner to postgres;
alter function public.homestay_image_translation_admin_read(uuid) owner to postgres;
alter function public.homestay_translation_review_history(uuid) owner to postgres;
alter function public.homestay_image_translation_review_history(uuid) owner to postgres;
alter function public.homestay_translation_save_draft(uuid, bigint, text, text, text, text, text[]) owner to postgres;
alter function public.homestay_translation_review(uuid, bigint, boolean) owner to postgres;
alter function public.homestay_translation_reject(uuid, bigint, text) owner to postgres;
alter function public.homestay_translation_publish(uuid, bigint) owner to postgres;
alter function public.homestay_translation_republish(uuid, bigint) owner to postgres;
alter function public.homestay_translation_archive(uuid, bigint) owner to postgres;
alter function public.homestay_translation_unpublish(uuid, bigint) owner to postgres;
alter function public.homestay_translation_restore(uuid, bigint) owner to postgres;
alter function public.homestay_image_translation_save_draft(uuid, bigint, text, text) owner to postgres;
alter function public.homestay_image_translation_review(uuid, bigint, boolean) owner to postgres;
alter function public.homestay_image_translation_reject(uuid, bigint, text) owner to postgres;
alter function public.homestay_image_translation_publish(uuid, bigint) owner to postgres;
alter function public.homestay_image_translation_republish(uuid, bigint) owner to postgres;
alter function public.homestay_image_translation_archive(uuid, bigint) owner to postgres;
alter function public.homestay_image_translation_unpublish(uuid, bigint) owner to postgres;
alter function public.homestay_image_translation_restore(uuid, bigint) owner to postgres;

grant select on public.published_english_homestays to anon, authenticated;
grant select on public.published_english_homestay_images to anon, authenticated;
grant execute on function public.homestay_translation_admin_read(uuid) to authenticated;
grant execute on function public.homestay_image_translation_admin_read(uuid) to authenticated;
grant execute on function public.homestay_translation_review_history(uuid) to authenticated;
grant execute on function public.homestay_image_translation_review_history(uuid) to authenticated;
grant execute on function public.homestay_translation_save_draft(uuid, bigint, text, text, text, text, text[]) to authenticated;
grant execute on function public.homestay_translation_review(uuid, bigint, boolean) to authenticated;
grant execute on function public.homestay_translation_reject(uuid, bigint, text) to authenticated;
grant execute on function public.homestay_translation_publish(uuid, bigint) to authenticated;
grant execute on function public.homestay_translation_republish(uuid, bigint) to authenticated;
grant execute on function public.homestay_translation_archive(uuid, bigint) to authenticated;
grant execute on function public.homestay_translation_unpublish(uuid, bigint) to authenticated;
grant execute on function public.homestay_translation_restore(uuid, bigint) to authenticated;
grant execute on function public.homestay_image_translation_save_draft(uuid, bigint, text, text) to authenticated;
grant execute on function public.homestay_image_translation_review(uuid, bigint, boolean) to authenticated;
grant execute on function public.homestay_image_translation_reject(uuid, bigint, text) to authenticated;
grant execute on function public.homestay_image_translation_publish(uuid, bigint) to authenticated;
grant execute on function public.homestay_image_translation_republish(uuid, bigint) to authenticated;
grant execute on function public.homestay_image_translation_archive(uuid, bigint) to authenticated;
grant execute on function public.homestay_image_translation_unpublish(uuid, bigint) to authenticated;
grant execute on function public.homestay_image_translation_restore(uuid, bigint) to authenticated;

alter function private.homestay_translation_publish_transition(uuid, bigint, boolean) owner to postgres;
alter function private.homestay_translation_simple_transition(uuid, bigint, text) owner to postgres;
alter function private.homestay_image_translation_publish_transition(uuid, bigint, boolean) owner to postgres;
alter function private.homestay_image_translation_simple_transition(uuid, bigint, text) owner to postgres;
revoke all on function private.homestay_translation_publish_transition(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function private.homestay_translation_simple_transition(uuid, bigint, text) from public, anon, authenticated;
revoke all on function private.homestay_image_translation_publish_transition(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function private.homestay_image_translation_simple_transition(uuid, bigint, text) from public, anon, authenticated;
