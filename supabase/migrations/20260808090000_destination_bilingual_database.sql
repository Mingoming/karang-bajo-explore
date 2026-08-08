-- Phase 3B.2 destination bilingual database implementation.
-- This migration contains database objects only.  Public English delivery is
-- fail-closed through the eligibility functions and security-barrier views.

alter table public.destinations
  add column source_revision bigint not null default 1,
  add column thumbnail_binary_revision bigint not null default 1,
  add constraint destinations_source_revision_positive check (source_revision > 0),
  add constraint destinations_thumbnail_binary_revision_positive check (thumbnail_binary_revision > 0);

alter table public.destination_images
  add column binary_revision bigint not null default 1,
  add column updated_at timestamptz,
  add column updated_by uuid references auth.users (id) on delete restrict,
  add constraint destination_images_binary_revision_positive check (binary_revision > 0);

update public.destination_images
set updated_at = created_at
where updated_at is null;

alter table public.destination_images
  alter column updated_at set default statement_timestamp();

-- The fingerprint contract is intentionally small and explicit.  It is kep
-- in private so clients cannot manufacture publication evidence.
create or replace function private.fingerprint_normalize_text(p_value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select pg_catalog.btrim(
    pg_catalog.replace(
      pg_catalog.replace($1, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
      pg_catalog.chr(13),
      pg_catalog.chr(10)
    ),
    pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
      || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
  );
$$;

create or replace function private.fingerprint_json_string(p_value text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_result text := '"';
  l_index integer := 1;
  l_length integer;
  l_char text;
  l_code integer;
begin
  if p_value is null then
    return 'null';
  end if;

  l_length := pg_catalog.char_length(p_value);
  while l_index <= l_length loop
    l_char := pg_catalog.substr(p_value, l_index, 1);
    l_code := pg_catalog.ascii(l_char);
    if l_char = '"' then
      l_result := l_result || pg_catalog.chr(92) || pg_catalog.chr(34);
    elsif l_char = pg_catalog.chr(92) then
      l_result := l_result || pg_catalog.chr(92) || pg_catalog.chr(92);
    elsif l_char = pg_catalog.chr(8) then
      l_result := l_result || pg_catalog.chr(92) || 'b';
    elsif l_char = pg_catalog.chr(9) then
      l_result := l_result || pg_catalog.chr(92) || 't';
    elsif l_char = pg_catalog.chr(10) then
      l_result := l_result || pg_catalog.chr(92) || 'n';
    elsif l_char = pg_catalog.chr(12) then
      l_result := l_result || pg_catalog.chr(92) || 'f';
    elsif l_char = pg_catalog.chr(13) then
      l_result := l_result || pg_catalog.chr(92) || 'r';
    elsif l_code between 0 and 31 then
      l_result := l_result || pg_catalog.chr(92) || 'u00'
        || pg_catalog.lpad(pg_catalog.lower(pg_catalog.to_hex(l_code)), 2, '0');
    else
      l_result := l_result || l_char;
    end if;
    l_index := l_index + 1;
  end loop;

  return l_result || '"';
end;
$$;

create or replace function private.fingerprint_json_text_value(
  p_value text,
  p_required boolean
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_value text;
begin
  if p_value is null then
    if p_required then
      raise exception using errcode = '23514', message = 'required fingerprint text is null';
    end if;
    return 'null';
  end if;

  l_value := private.fingerprint_normalize_text(p_value);
  if l_value = '' then
    if p_required then
      raise exception using errcode = '23514', message = 'required fingerprint text is empty';
    end if;
    return 'null';
  end if;
  return private.fingerprint_json_string(l_value);
end;
$$;

create or replace function private.fingerprint_json_text_array_value(p_values text[])
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_value text;
  l_result text := '[';
  l_first boolean := true;
begin
  if p_values is null then
    raise exception using errcode = '23514', message = 'fingerprint text array is null';
  end if;

  foreach l_value in array p_values loop
    l_value := private.fingerprint_normalize_text(l_value);
    if l_value is null or l_value = '' then
      raise exception using errcode = '23514', message = 'fingerprint text array contains an empty value';
    end if;
    if not l_first then
      l_result := l_result || ',';
    end if;
    l_result := l_result || private.fingerprint_json_string(l_value);
    l_first := false;
  end loop;
  return l_result || ']';
end;
$$;

create or replace function private.fingerprint_json_numeric_value(
  p_value numeric,
  p_required boolean
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_value text;
begin
  if p_value is null then
    if p_required then
      raise exception using errcode = '23514', message = 'required fingerprint number is null';
    end if;
    return 'null';
  end if;
  l_value := p_value::text;
  if l_value in ('NaN', 'Infinity', '-Infinity') then
    raise exception using errcode = '23514', message = 'non-finite fingerprint number';
  end if;
  l_value := pg_catalog.trim_scale(p_value)::text;
  if l_value !~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$' then
    raise exception using errcode = '23514', message = 'non-canonical fingerprint number';
  end if;
  return l_value;
end;
$$;

create or replace function private.fingerprint_json_uuid_value(p_value uuid, p_required boolean)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if p_value is null then
    if p_required then
      raise exception using errcode = '23514', message = 'required fingerprint uuid is null';
    end if;
    return 'null';
  end if;
  return private.fingerprint_json_string(pg_catalog.lower(p_value::text));
end;
$$;

create or replace function private.fingerprint_json_bigint_value(p_value bigint)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if p_value is null or p_value <= 0 then
    raise exception using errcode = '23514', message = 'fingerprint bigint must be positive';
  end if;
  if p_value::text like '0%' and p_value <> 0 then
    raise exception using errcode = '23514', message = 'fingerprint bigint has a leading zero';
  end if;
  return p_value::text;
end;
$$;

create or replace function private.fingerprint_text_array_is_valid(p_values text[])
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_value text;
begin
  if p_values is null then
    return false;
  end if;
  foreach l_value in array p_values loop
    if l_value is null or private.fingerprint_normalize_text(l_value) = '' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function private.fingerprint_sha256_v1(
  p_version text,
  p_ordered_key_values text[]
)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  l_payload text := '{';
  l_index integer;
  l_key text;
  l_value text;
begin
  if pg_catalog.current_setting('server_encoding') <> 'UTF8' then
    raise exception using errcode = '22023', message = 'UTF8 server encoding is required';
  end if;
  if p_version is null or private.fingerprint_normalize_text(p_version) = '' then
    raise exception using errcode = '23514', message = 'fingerprint version is required';
  end if;
  if p_ordered_key_values is null
    or pg_catalog.cardinality(p_ordered_key_values) = 0
    or pg_catalog.cardinality(p_ordered_key_values) % 2 <> 0 then
    raise exception using errcode = '23514', message = 'fingerprint key-value sequence is invalid';
  end if;

  l_index := 1;
  while l_index <= pg_catalog.cardinality(p_ordered_key_values) loop
    l_key := p_ordered_key_values[l_index];
    l_value := p_ordered_key_values[l_index + 1];
    if l_key is null or private.fingerprint_normalize_text(l_key) = '' or l_value is null then
      raise exception using errcode = '23514', message = 'fingerprint key-value entry is invalid';
    end if;
    if l_index > 1 then
      l_payload := l_payload || ',';
    end if;
    l_payload := l_payload || private.fingerprint_json_string(l_key) || ':' || l_value;
    l_index := l_index + 2;
  end loop;
  l_payload := l_payload || '}';

  return private.fingerprint_normalize_text(p_version) || ':'
    || pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(l_payload, 'UTF8'), 'sha256'),
      'hex'
    );
end;
$$;

create or replace function private.destination_source_fingerprint_v1(p_source public.destinations)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('fingerprint-v1', array[
    'version', private.fingerprint_json_string('fingerprint-v1'),
    'name', private.fingerprint_json_text_value(p_source.name, true),
    'summary', private.fingerprint_json_text_value(p_source.summary, true),
    'description', private.fingerprint_json_text_value(p_source.description, true),
    'history', private.fingerprint_json_text_value(p_source.history, false),
    'opening_hours', private.fingerprint_json_text_value(p_source.opening_hours, false),
    'entrance_fee', private.fingerprint_json_numeric_value(p_source.entrance_fee, false),
    'price_note', private.fingerprint_json_text_value(p_source.price_note, false),
    'facilities', private.fingerprint_json_text_array_value(p_source.facilities),
    'latitude', private.fingerprint_json_numeric_value(p_source.latitude, true),
    'longitude', private.fingerprint_json_numeric_value(p_source.longitude, true),
    'google_maps_url', private.fingerprint_json_text_value(p_source.google_maps_url, false),
    'contact_name', private.fingerprint_json_text_value(p_source.contact_name, false)
  ]);
end;
$$;

alter function private.fingerprint_normalize_text(text) owner to postgres;
alter function private.fingerprint_json_string(text) owner to postgres;
alter function private.fingerprint_json_text_value(text, boolean) owner to postgres;
alter function private.fingerprint_json_text_array_value(text[]) owner to postgres;
alter function private.fingerprint_json_numeric_value(numeric, boolean) owner to postgres;
alter function private.fingerprint_json_uuid_value(uuid, boolean) owner to postgres;
alter function private.fingerprint_json_bigint_value(bigint) owner to postgres;
alter function private.fingerprint_text_array_is_valid(text[]) owner to postgres;
alter function private.fingerprint_sha256_v1(text, text[]) owner to postgres;
alter function private.destination_source_fingerprint_v1(public.destinations) owner to postgres;

revoke all on function private.fingerprint_normalize_text(text) from public, anon, authenticated;
revoke all on function private.fingerprint_json_string(text) from public, anon, authenticated;
revoke all on function private.fingerprint_json_text_value(text, boolean) from public, anon, authenticated;
revoke all on function private.fingerprint_json_text_array_value(text[]) from public, anon, authenticated;
revoke all on function private.fingerprint_json_numeric_value(numeric, boolean) from public, anon, authenticated;
revoke all on function private.fingerprint_json_uuid_value(uuid, boolean) from public, anon, authenticated;
revoke all on function private.fingerprint_json_bigint_value(bigint) from public, anon, authenticated;
revoke all on function private.fingerprint_text_array_is_valid(text[]) from public, anon, authenticated;
revoke all on function private.fingerprint_sha256_v1(text, text[]) from public, anon, authenticated;
revoke all on function private.destination_source_fingerprint_v1(public.destinations) from public, anon, authenticated;

create table public.destination_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  destination_id uuid not null constraint destination_translations_destination_fk references public.destinations (id) on delete restrict,
  locale text not null default 'en',
  name text not null,
  summary text not null,
  description text not null,
  history text,
  opening_hours text,
  price_note text,
  facilities text[] not null default '{}'::text[],
  thumbnail_alt_text text not null,
  translation_status public.publication_status not null default 'draft',
  review_state text not null default 'pending',
  captured_source_revision bigint,
  captured_source_fingerprint text,
  captured_thumbnail_media_fingerprint text,
  translation_fingerprint text,
  contract_version text not null default 'destination-v1',
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
  constraint destination_translations_locale_check check (locale = 'en'),
  constraint destination_translations_review_state_check check (review_state in ('pending', 'reviewed', 'rejected')),
  constraint destination_translations_contract_version_check check (contract_version = 'destination-v1'),
  constraint destination_translations_content_check check (
    btrim(name) <> '' and btrim(summary) <> '' and btrim(description) <> ''
    and btrim(thumbnail_alt_text) <> ''
    and private.fingerprint_text_array_is_valid(facilities)
  ),
  constraint destination_translations_review_metadata_check check (
    (review_state = 'reviewed' and reviewed_at is not null and reviewed_by is not null)
    or (review_state <> 'reviewed' and reviewed_at is null and reviewed_by is null)
  ),
  constraint destination_translations_review_checkpoint_check check (
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
  constraint destination_translations_rejection_metadata_check check (
    (review_state = 'rejected' and rejected_at is not null and rejected_by is not null and btrim(coalesce(review_reason, '')) <> '')
    or (review_state <> 'rejected' and rejected_at is null and rejected_by is null and review_reason is null)
  ),
  constraint destination_translations_publication_metadata_check check (
    translation_status <> 'published' or published_at is not null and published_by is not null
  ),
  constraint destination_translations_publication_state_check check (
    translation_status <> 'published' or (review_state = 'reviewed' and archived_at is null)
  ),
  constraint destination_translations_rejected_state_check check (
    review_state <> 'rejected' or translation_status = 'draft'::public.publication_status
  ),
  constraint destination_translations_archived_state_check check (
    translation_status <> 'archived'::public.publication_status or review_state = 'pending'
  ),
  constraint destination_translations_archive_metadata_check check (
    translation_status <> 'archived' or archived_at is not null
  ),
  constraint destination_translations_edit_revision_check check (edit_revision > 0),
  constraint destination_translations_source_locale_key unique (destination_id, locale)
);

create table public.destination_image_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  destination_image_id uuid not null constraint destination_image_translations_image_fk references public.destination_images (id) on delete restrict,
  locale text not null default 'en',
  alt_text text not null,
  caption text,
  translation_status public.publication_status not null default 'draft',
  review_state text not null default 'pending',
  captured_media_fingerprint text,
  translation_fingerprint text,
  contract_version text not null default 'destination-media-v1',
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
  constraint destination_image_translations_locale_check check (locale = 'en'),
  constraint destination_image_translations_review_state_check check (review_state in ('pending', 'reviewed', 'rejected')),
  constraint destination_image_translations_contract_version_check check (contract_version = 'destination-media-v1'),
  constraint destination_image_translations_content_check check (btrim(alt_text) <> ''),
  constraint destination_image_translations_review_metadata_check check (
    (review_state = 'reviewed' and reviewed_at is not null and reviewed_by is not null)
    or (review_state <> 'reviewed' and reviewed_at is null and reviewed_by is null)
  ),
  constraint destination_image_translations_review_checkpoint_check check (
    (review_state = 'reviewed'
      and captured_media_fingerprint is not null
      and translation_fingerprint is not null)
    or (review_state <> 'reviewed'
      and captured_media_fingerprint is null
      and translation_fingerprint is null)
  ),
  constraint destination_image_translations_rejection_metadata_check check (
    (review_state = 'rejected' and rejected_at is not null and rejected_by is not null and btrim(coalesce(review_reason, '')) <> '')
    or (review_state <> 'rejected' and rejected_at is null and rejected_by is null and review_reason is null)
  ),
  constraint destination_image_translations_publication_metadata_check check (
    translation_status <> 'published' or published_at is not null and published_by is not null
  ),
  constraint destination_image_translations_publication_state_check check (
    translation_status <> 'published' or (review_state = 'reviewed' and archived_at is null)
  ),
  constraint destination_image_translations_rejected_state_check check (
    review_state <> 'rejected' or translation_status = 'draft'::public.publication_status
  ),
  constraint destination_image_translations_archived_state_check check (
    translation_status <> 'archived'::public.publication_status or review_state = 'pending'
  ),
  constraint destination_image_translations_archive_metadata_check check (
    translation_status <> 'archived' or archived_at is not null
  ),
  constraint destination_image_translations_edit_revision_check check (edit_revision > 0),
  constraint destination_image_translations_source_locale_key unique (destination_image_id, locale)
);

create table public.destination_translation_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  destination_translation_id uuid not null constraint destination_translation_review_events_translation_fk references public.destination_translations (id) on delete restrict,
  event_type text not null check (event_type in ('draft_saved', 'reviewed', 'rejected', 'published', 'republished', 'unpublished', 'archived', 'restored', 'source_changed', 'source_blocked')),
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
  reason text,
  constraint destination_translation_review_events_review_state_check check (
    new_review_state in ('pending', 'reviewed', 'rejected')
    and previous_review_state in ('pending', 'reviewed', 'rejected')
  ),
  constraint destination_translation_review_events_reason_check check (
    (event_type in ('rejected', 'source_blocked') and btrim(coalesce(reason, '')) <> '')
    or (event_type not in ('rejected', 'source_blocked') and reason is null)
  )
);

create table public.destination_image_translation_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  destination_image_translation_id uuid not null constraint destination_image_translation_review_events_translation_fk references public.destination_image_translations (id) on delete restrict,
  event_type text not null check (event_type in ('draft_saved', 'reviewed', 'rejected', 'published', 'republished', 'unpublished', 'archived', 'restored', 'media_changed')),
  previous_translation_status public.publication_status not null,
  new_translation_status public.publication_status not null,
  previous_review_state text not null,
  new_review_state text not null,
  actor_id uuid not null references auth.users (id) on delete restrict,
  occurred_at timestamptz not null default statement_timestamp(),
  binary_revision bigint not null check (binary_revision > 0),
  media_fingerprint text,
  translation_fingerprint text,
  reason text,
  constraint destination_image_translation_review_events_review_state_check check (
    new_review_state in ('pending', 'reviewed', 'rejected')
    and previous_review_state in ('pending', 'reviewed', 'rejected')
  ),
  constraint destination_image_translation_review_events_reason_check check (
    (event_type = 'rejected' and btrim(coalesce(reason, '')) <> '')
    or (event_type <> 'rejected' and reason is null)
  )
);

create index destination_translations_public_lookup_idx
  on public.destination_translations (destination_id, locale)
  where translation_status = 'published' and review_state = 'reviewed';
create index destination_translations_admin_queue_idx
  on public.destination_translations (review_state, translation_status, updated_at desc);
create index destination_image_translations_public_lookup_idx
  on public.destination_image_translations (destination_image_id, locale)
  where translation_status = 'published' and review_state = 'reviewed';
create index destination_translation_review_events_history_idx
  on public.destination_translation_review_events (destination_translation_id, occurred_at desc, id desc);
create index destination_image_translation_review_events_history_idx
  on public.destination_image_translation_review_events (destination_image_translation_id, occurred_at desc, id desc);

create or replace function private.destination_translation_fingerprint_v1(p_translation public.destination_translations)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('translation-v1', array[
    'version', private.fingerprint_json_string('translation-v1'),
    'name', private.fingerprint_json_text_value(p_translation.name, true),
    'summary', private.fingerprint_json_text_value(p_translation.summary, true),
    'description', private.fingerprint_json_text_value(p_translation.description, true),
    'history', private.fingerprint_json_text_value(p_translation.history, false),
    'opening_hours', private.fingerprint_json_text_value(p_translation.opening_hours, false),
    'price_note', private.fingerprint_json_text_value(p_translation.price_note, false),
    'facilities', private.fingerprint_json_text_array_value(p_translation.facilities),
    'thumbnail_alt_text', private.fingerprint_json_text_value(p_translation.thumbnail_alt_text, true)
  ]);
end;
$$;

create or replace function private.destination_image_translation_fingerprint_v1(p_translation public.destination_image_translations)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('destination-media-translation-v1', array[
    'version', private.fingerprint_json_string('destination-media-translation-v1'),
    'alt_text', private.fingerprint_json_text_value(p_translation.alt_text, true),
    'caption', private.fingerprint_json_text_value(p_translation.caption, false)
  ]);
end;
$$;

create or replace function private.destination_thumbnail_media_fingerprint_v1(p_source public.destinations)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('thumbnail-media-v1', array[
    'version', private.fingerprint_json_string('thumbnail-media-v1'),
    'destination_id', private.fingerprint_json_uuid_value(p_source.id, true),
    'thumbnail_bucket', private.fingerprint_json_text_value(p_source.thumbnail_bucket, false),
    'thumbnail_path', private.fingerprint_json_text_value(p_source.thumbnail_path, false),
    'thumbnail_binary_revision', private.fingerprint_json_bigint_value(p_source.thumbnail_binary_revision)
  ]);
end;
$$;

create or replace function private.destination_image_media_fingerprint_v1(p_image public.destination_images)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  return private.fingerprint_sha256_v1('media-v1', array[
    'version', private.fingerprint_json_string('media-v1'),
    'destination_image_id', private.fingerprint_json_uuid_value(p_image.id, true),
    'storage_bucket', private.fingerprint_json_text_value(p_image.storage_bucket, true),
    'storage_path', private.fingerprint_json_text_value(p_image.storage_path, true),
    'caption', private.fingerprint_json_text_value(p_image.caption, false),
    'alt_text', private.fingerprint_json_text_value(p_image.alt_text, true),
    'binary_revision', private.fingerprint_json_bigint_value(p_image.binary_revision)
  ]);
end;
$$;

alter function private.destination_translation_fingerprint_v1(public.destination_translations) owner to postgres;
alter function private.destination_image_translation_fingerprint_v1(public.destination_image_translations) owner to postgres;
alter function private.destination_thumbnail_media_fingerprint_v1(public.destinations) owner to postgres;
alter function private.destination_image_media_fingerprint_v1(public.destination_images) owner to postgres;

revoke all on function private.destination_translation_fingerprint_v1(public.destination_translations) from public, anon, authenticated;
revoke all on function private.destination_image_translation_fingerprint_v1(public.destination_image_translations) from public, anon, authenticated;
revoke all on function private.destination_thumbnail_media_fingerprint_v1(public.destinations) from public, anon, authenticated;
revoke all on function private.destination_image_media_fingerprint_v1(public.destination_images) from public, anon, authenticated;

create or replace function private.destination_bilingual_legacy_validation_report()
returns table(
  issue_code text,
  destination_id uuid,
  destination_image_id uuid,
  detail text
)
language sql
stable
security definer
set search_path = ''
as $$
  with source_fingerprint_issues(issue_code, destination_id, destination_image_id, detail) as (
    select
      'invalid_source_fingerprint'::text,
      source.id,
      null::uuid,
      case
        when source.name is null or pg_catalog.btrim(source.name) = '' then 'name'
        when source.summary is null or pg_catalog.btrim(source.summary) = '' then 'summary'
        when source.description is null or pg_catalog.btrim(source.description) = '' then 'description'
        when not private.fingerprint_text_array_is_valid(source.facilities) then 'facilities'
        when source.latitude is null then 'latitude'
        when source.longitude is null then 'longitude'
        when source.latitude::text in ('NaN', 'Infinity', '-Infinity') then 'latitude'
        when source.longitude::text in ('NaN', 'Infinity', '-Infinity') then 'longitude'
        when source.entrance_fee is not null
          and source.entrance_fee::text in ('NaN', 'Infinity', '-Infinity') then 'entrance_fee'
        when source.source_revision is null or source.source_revision <= 0 then 'source_revision'
        when source.thumbnail_binary_revision is null or source.thumbnail_binary_revision <= 0 then 'thumbnail_binary_revision'
      end
    from public.destinations as source
    where source.name is null or pg_catalog.btrim(source.name) = ''
      or source.summary is null or pg_catalog.btrim(source.summary) = ''
      or source.description is null or pg_catalog.btrim(source.description) = ''
      or not private.fingerprint_text_array_is_valid(source.facilities)
      or source.latitude is null
      or source.longitude is null
      or source.latitude::text in ('NaN', 'Infinity', '-Infinity')
      or source.longitude::text in ('NaN', 'Infinity', '-Infinity')
      or (source.entrance_fee is not null and source.entrance_fee::text in ('NaN', 'Infinity', '-Infinity'))
      or source.source_revision is null or source.source_revision <= 0
      or source.thumbnail_binary_revision is null or source.thumbnail_binary_revision <= 0
  ),
  translation_fingerprint_issues(issue_code, destination_id, destination_image_id, detail) as (
    select
      'invalid_translation_fingerprint'::text,
      translation.destination_id,
      null::uuid,
      case
        when translation.name is null or pg_catalog.btrim(translation.name) = '' then 'name'
        when translation.summary is null or pg_catalog.btrim(translation.summary) = '' then 'summary'
        when translation.description is null or pg_catalog.btrim(translation.description) = '' then 'description'
        when not private.fingerprint_text_array_is_valid(translation.facilities) then 'facilities'
        when translation.thumbnail_alt_text is null or pg_catalog.btrim(translation.thumbnail_alt_text) = '' then 'thumbnail_alt_text'
      end
    from public.destination_translations as translation
    where translation.name is null or pg_catalog.btrim(translation.name) = ''
      or translation.summary is null or pg_catalog.btrim(translation.summary) = ''
      or translation.description is null or pg_catalog.btrim(translation.description) = ''
      or not private.fingerprint_text_array_is_valid(translation.facilities)
      or translation.thumbnail_alt_text is null or pg_catalog.btrim(translation.thumbnail_alt_text) = ''
  ),
  image_media_fingerprint_issues(issue_code, destination_id, destination_image_id, detail) as (
    select
      'invalid_image_media_fingerprint'::text,
      image.destination_id,
      image.id,
      case
        when image.storage_bucket is null or pg_catalog.btrim(image.storage_bucket) = '' then 'storage_bucket'
        when image.storage_path is null or pg_catalog.btrim(image.storage_path) = '' then 'storage_path'
        when image.alt_text is null or pg_catalog.btrim(image.alt_text) = '' then 'alt_text'
        when image.binary_revision is null or image.binary_revision <= 0 then 'binary_revision'
      end
    from public.destination_images as image
    where image.storage_bucket is null or pg_catalog.btrim(image.storage_bucket) = ''
      or image.storage_path is null or pg_catalog.btrim(image.storage_path) = ''
      or image.alt_text is null or pg_catalog.btrim(image.alt_text) = ''
      or image.binary_revision is null or image.binary_revision <= 0
  ),
  image_translation_fingerprint_issues(issue_code, destination_id, destination_image_id, detail) as (
    select
      'invalid_image_translation_fingerprint'::text,
      image.destination_id,
      translation.destination_image_id,
      case
        when translation.alt_text is null or pg_catalog.btrim(translation.alt_text) = '' then 'alt_text'
      end
    from public.destination_image_translations as translation
    join public.destination_images as image
      on image.id = translation.destination_image_id
    where translation.alt_text is null or pg_catalog.btrim(translation.alt_text) = ''
  ),
  thumbnail_issues(issue_code, destination_id, destination_image_id, detail) as (
    select
      'invalid_thumbnail_bucket'::text,
      source.id,
      null::uuid,
      coalesce(source.thumbnail_bucket, 'NULL')
    from public.destinations as source
    where source.thumbnail_path is not null
      and (source.thumbnail_bucket is null or source.thumbnail_bucket <> 'tourism-media')
    union all
    select
      'mismatched_thumbnail'::text,
      source.id,
      image.id,
      'thumbnail path belongs to another destination'
    from public.destinations as source
    join public.destination_images as image
      on image.storage_bucket = source.thumbnail_bucket
     and image.storage_path = source.thumbnail_path
     and image.destination_id <> source.id
    where source.thumbnail_bucket = 'tourism-media'
      and source.thumbnail_path is not null
      and not exists (
        select 1
        from public.destination_images as same_destination
        where same_destination.destination_id = source.id
          and same_destination.storage_bucket = source.thumbnail_bucket
          and same_destination.storage_path = source.thumbnail_path
      )
    union all
    select
      'non_primary_thumbnail'::text,
      source.id,
      image.id,
      'matching child image is not primary'
    from public.destinations as source
    join public.destination_images as image
      on image.destination_id = source.id
     and image.storage_bucket = source.thumbnail_bucket
     and image.storage_path = source.thumbnail_path
    where source.thumbnail_bucket = 'tourism-media'
      and source.thumbnail_path is not null
      and not image.is_primary
    union all
    select
      'missing_thumbnail_object'::text,
      source.id,
      image.id,
      'matching primary child has no Storage object'
    from public.destinations as source
    join public.destination_images as image
      on image.destination_id = source.id
     and image.storage_bucket = source.thumbnail_bucket
     and image.storage_path = source.thumbnail_path
     and image.is_primary
    where source.thumbnail_bucket = 'tourism-media'
      and source.thumbnail_path is not null
      and not exists (
        select 1
        from storage.objects as object
        where object.bucket_id = image.storage_bucket
          and object.name = image.storage_path
      )
    union all
    select
      'parent_only_thumbnail'::text,
      source.id,
      null::uuid,
      'parent thumbnail has no same-destination child image'
    from public.destinations as source
    where source.thumbnail_bucket = 'tourism-media'
      and source.thumbnail_path is not null
      and not exists (
        select 1
        from public.destination_images as same_destination
        where same_destination.destination_id = source.id
          and same_destination.storage_bucket = source.thumbnail_bucket
          and same_destination.storage_path = source.thumbnail_path
      )
      and not exists (
        select 1
        from public.destination_images as other_destination
        where other_destination.storage_bucket = source.thumbnail_bucket
          and other_destination.storage_path = source.thumbnail_path
          and other_destination.destination_id <> source.id
      )
  )
  select issue_code, destination_id, destination_image_id, detail
  from source_fingerprint_issues
  where issue_code is not null
  union all
  select issue_code, destination_id, destination_image_id, detail
  from translation_fingerprint_issues
  union all
  select issue_code, destination_id, destination_image_id, detail
  from image_media_fingerprint_issues
  union all
  select issue_code, destination_id, destination_image_id, detail
  from image_translation_fingerprint_issues
  union all
  select issue_code, destination_id, destination_image_id, detail
  from thumbnail_issues
  order by issue_code, destination_id, destination_image_id, detail;
$$;

alter function private.destination_bilingual_legacy_validation_report() owner to postgres;
revoke all on function private.destination_bilingual_legacy_validation_report() from public, anon, authenticated;

do $$
declare
  l_issue record;
  l_issue_count bigint := 0;
begin
  for l_issue in
    select issue_code, destination_id, destination_image_id, detail
    from private.destination_bilingual_legacy_validation_report()
  loop
    l_issue_count := l_issue_count + 1;
    raise notice 'Phase 3B legacy validation: issue_code=%, destination_id=%, destination_image_id=%, detail=%',
      l_issue.issue_code,
      l_issue.destination_id,
      l_issue.destination_image_id,
      l_issue.detail;
  end loop;
  raise notice 'Phase 3B legacy validation complete: % issue(s)', l_issue_count;
end;
$$;

create or replace function private.enforce_destination_source_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.source_revision is distinct from old.source_revision
    or new.thumbnail_binary_revision is distinct from old.thumbnail_binary_revision then
    raise exception using errcode = '42501', message = 'destination revisions are database managed';
  end if;
  if old.source_revision = 9223372036854775807 then
    raise exception using errcode = '22003', message = 'destination source revision overflow';
  end if;
  new.source_revision := old.source_revision + 1;
  if new.thumbnail_bucket is distinct from old.thumbnail_bucket
    or new.thumbnail_path is distinct from old.thumbnail_path then
    if old.thumbnail_binary_revision = 9223372036854775807 then
      raise exception using errcode = '22003', message = 'destination thumbnail revision overflow';
    end if;
    new.thumbnail_binary_revision := old.thumbnail_binary_revision + 1;
  else
    new.thumbnail_binary_revision := old.thumbnail_binary_revision;
  end if;
  return new;
end;
$$;

create trigger destinations_source_revision_trigger
before update on public.destinations
for each row execute function private.enforce_destination_source_revision();

create or replace function private.enforce_destination_image_revision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_actor uuid;
begin
  l_actor := auth.uid();
  if l_actor is null then
    raise exception using errcode = '42501', message = 'destination image actor is required';
  end if;

  if tg_op = 'INSERT' then
    if new.binary_revision is distinct from 1 then
      raise exception using errcode = '42501', message = 'destination image revision is database managed';
    end if;
    new.binary_revision := 1;
  else
    if new.binary_revision is distinct from old.binary_revision
      or new.updated_at is distinct from old.updated_at
      or new.updated_by is distinct from old.updated_by then
      raise exception using errcode = '42501', message = 'destination image audit fields are database managed';
    end if;
    if new.storage_bucket is distinct from old.storage_bucket
      or new.storage_path is distinct from old.storage_path
      or new.caption is distinct from old.caption
      or new.alt_text is distinct from old.alt_text then
      if old.binary_revision = 9223372036854775807 then
        raise exception using errcode = '22003', message = 'destination image revision overflow';
      end if;
      new.binary_revision := old.binary_revision + 1;
    else
      new.binary_revision := old.binary_revision;
    end if;
  end if;
  new.updated_at := statement_timestamp();
  new.updated_by := l_actor;
  return new;
end;
$$;

create trigger destination_images_revision_trigger
before insert or update on public.destination_images
for each row execute function private.enforce_destination_image_revision();

create or replace function private.enforce_destination_translation_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  l_actor uuid;
begin
  if pg_catalog.current_setting('destination.workflow', true) <> 'on' then
    raise exception using errcode = '42501', message = 'destination translations are writable only through workflow functions';
  end if;
  l_actor := auth.uid();
  if l_actor is null or new.updated_by is distinct from l_actor then
    raise exception using errcode = '42501', message = 'destination translation actor is required';
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is distinct from l_actor
      or new.edit_revision <> 1
      or new.translation_status <> 'draft'::public.publication_status
      or new.review_state <> 'pending' then
      raise exception using errcode = '42501', message = 'destination translation initial state is database managed';
    end if;
  else
    if new.id is distinct from old.id
      or new.locale is distinct from old.locale
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
      or new.edit_revision <> old.edit_revision + 1 then
      raise exception using errcode = '42501', message = 'destination translation identity or revision is database managed';
    end if;
    if tg_table_name = 'destination_translations'
      and (pg_catalog.to_jsonb(new) ->> 'destination_id')
        is distinct from (pg_catalog.to_jsonb(old) ->> 'destination_id') then
      raise exception using errcode = '42501', message = 'destination translation identity is database managed';
    elsif tg_table_name = 'destination_image_translations'
      and (pg_catalog.to_jsonb(new) ->> 'destination_image_id')
        is distinct from (pg_catalog.to_jsonb(old) ->> 'destination_image_id') then
      raise exception using errcode = '42501', message = 'destination image translation identity is database managed';
    end if;
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create or replace function private.reject_destination_translation_review_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception using errcode = '42501', message = 'destination translation review history is append-only';
end;
$$;

create or replace function private.reject_destination_image_translation_review_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception using errcode = '42501', message = 'destination image translation review history is append-only';
end;
$$;

create trigger destination_translations_write_guard_trigger
before insert or update on public.destination_translations
for each row execute function private.enforce_destination_translation_write();
create trigger destination_image_translations_write_guard_trigger
before insert or update on public.destination_image_translations
for each row execute function private.enforce_destination_translation_write();
create trigger destination_translation_review_events_append_only_trigger
before update or delete on public.destination_translation_review_events
for each row execute function private.reject_destination_translation_review_event_mutation();
create trigger destination_image_translation_review_events_append_only_trigger
before update or delete on public.destination_image_translation_review_events
for each row execute function private.reject_destination_image_translation_review_event_mutation();

create or replace function private.record_destination_translation_event(
  p_old public.destination_translations,
  p_new public.destination_translations,
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
  insert into public.destination_translation_review_events (
    destination_translation_id,
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
    p_reason
  );
end;
$$;

create or replace function private.record_destination_image_translation_event(
  p_old public.destination_image_translations,
  p_new public.destination_image_translations,
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
  insert into public.destination_image_translation_review_events (
    destination_image_translation_id,
    event_type,
    previous_translation_status,
    new_translation_status,
    previous_review_state,
    new_review_state,
    actor_id,
    binary_revision,
    media_fingerprint,
    translation_fingerprint,
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
    p_reason
  );
end;
$$;

alter function private.enforce_destination_source_revision() owner to postgres;
alter function private.enforce_destination_image_revision() owner to postgres;
alter function private.enforce_destination_translation_write() owner to postgres;
alter function private.reject_destination_translation_review_event_mutation() owner to postgres;
alter function private.reject_destination_image_translation_review_event_mutation() owner to postgres;
alter function private.record_destination_translation_event(public.destination_translations, public.destination_translations, text, uuid, bigint, text, text, text, text) owner to postgres;
alter function private.record_destination_image_translation_event(public.destination_image_translations, public.destination_image_translations, text, uuid, bigint, text, text, text) owner to postgres;

revoke all on function private.enforce_destination_source_revision() from public, anon, authenticated;
revoke all on function private.enforce_destination_image_revision() from public, anon, authenticated;
revoke all on function private.enforce_destination_translation_write() from public, anon, authenticated;
revoke all on function private.reject_destination_translation_review_event_mutation() from public, anon, authenticated;
revoke all on function private.reject_destination_image_translation_review_event_mutation() from public, anon, authenticated;
revoke all on function private.record_destination_translation_event(public.destination_translations, public.destination_translations, text, uuid, bigint, text, text, text, text) from public, anon, authenticated;
revoke all on function private.record_destination_image_translation_event(public.destination_image_translations, public.destination_image_translations, text, uuid, bigint, text, text, text) from public, anon, authenticated;

create or replace function private.destination_translation_source_cascade()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_translations;
  l_new public.destination_translations;
  l_old_source_fingerprint text;
  l_new_source_fingerprint text;
  l_old_thumbnail_fingerprint text;
  l_new_thumbnail_fingerprint text;
  l_translation_fingerprint text;
  l_source_changed boolean;
  l_source_blocked boolean;
begin
  if l_actor is null then
    raise exception using errcode = '42501', message = 'destination source cascade actor is required';
  end if;

  -- Source rows are already locked by the update.  Lock related media and
  -- translations in stable order before changing any dependent state.
  perform image.id
  from public.destination_images as image
  where image.destination_id = new.id
  order by image.id
  for update;

  l_old_source_fingerprint := private.destination_source_fingerprint_v1(old);
  l_new_source_fingerprint := private.destination_source_fingerprint_v1(new);
  l_old_thumbnail_fingerprint := private.destination_thumbnail_media_fingerprint_v1(old);
  l_new_thumbnail_fingerprint := private.destination_thumbnail_media_fingerprint_v1(new);
  l_source_changed := l_old_source_fingerprint is distinct from l_new_source_fingerprint
    or l_old_thumbnail_fingerprint is distinct from l_new_thumbnail_fingerprint;
  l_source_blocked := new.status = 'archived'::public.publication_status
    and old.status <> 'archived'::public.publication_status;

  if l_source_blocked then
    for l_old in
      select translation.*
      from public.destination_translations as translation
      where translation.destination_id = new.id
      order by translation.id
      for update
    loop
      perform pg_catalog.set_config('destination.workflow', 'on', true);
      update public.destination_translations as translation
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
          reviewed_at = null,
          reviewed_by = null,
          review_reason = null,
          rejected_at = null,
          rejected_by = null,
          archived_at = case
            when l_old.translation_status = 'archived'::public.publication_status
              then coalesce(l_old.archived_at, statement_timestamp())
            else l_old.archived_at
          end,
          edit_revision = l_old.edit_revision + 1,
          updated_by = l_actor
      where translation.id = l_old.id
      returning translation.* into l_new;

      perform private.record_destination_translation_event(
        l_old,
        l_new,
        'source_blocked',
        l_actor,
        new.source_revision,
        l_new_source_fingerprint,
        l_new_thumbnail_fingerprint,
        null,
        'source is not publicly eligible'
      );
    end loop;
    return new;
  end if;

  if l_source_changed then
    for l_old in
      select translation.*
      from public.destination_translations as translation
      where translation.destination_id = new.id
      order by translation.id
      for update
    loop
      if l_old.review_state = 'reviewed'
        and l_old.translation_status <> 'published'::public.publication_status then
        perform pg_catalog.set_config('destination.workflow', 'on', true);
        update public.destination_translations as translation
        set translation_status = 'draft'::public.publication_status,
            review_state = 'pending',
            captured_source_revision = null,
            captured_source_fingerprint = null,
            captured_thumbnail_media_fingerprint = null,
            translation_fingerprint = null,
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
        l_translation_fingerprint := private.destination_translation_fingerprint_v1(l_new);
      exception when others then
        l_translation_fingerprint := null;
      end;
      perform private.record_destination_translation_event(
        l_old,
        l_new,
        'source_changed',
        l_actor,
        new.source_revision,
        l_new_source_fingerprint,
        l_new_thumbnail_fingerprint,
        l_translation_fingerprint
      );
    end loop;
  end if;

  return new;
end;
$$;

create trigger destinations_translation_source_cascade_trigger
after update on public.destinations
for each row execute function private.destination_translation_source_cascade();

create or replace function private.destination_image_translation_media_cascade()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_image_translations;
  l_new public.destination_image_translations;
  l_old_media_fingerprint text;
  l_new_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null then
    raise exception using errcode = '42501', message = 'destination image media cascade actor is required';
  end if;

  l_old_media_fingerprint := private.destination_image_media_fingerprint_v1(old);
  l_new_media_fingerprint := private.destination_image_media_fingerprint_v1(new);
  if l_old_media_fingerprint is not distinct from l_new_media_fingerprint then
    return new;
  end if;

  for l_old in
    select translation.*
    from public.destination_image_translations as translation
    where translation.destination_image_id = new.id
    order by translation.id
    for update
  loop
    if l_old.review_state = 'reviewed'
      and l_old.translation_status <> 'published'::public.publication_status then
      perform pg_catalog.set_config('destination.workflow', 'on', true);
      update public.destination_image_translations as translation
      set translation_status = 'draft'::public.publication_status,
          review_state = 'pending',
          captured_media_fingerprint = null,
          translation_fingerprint = null,
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
      l_translation_fingerprint := private.destination_image_translation_fingerprint_v1(l_new);
    exception when others then
      l_translation_fingerprint := null;
    end;
    perform private.record_destination_image_translation_event(
      l_old,
      l_new,
      'media_changed',
      l_actor,
      new.binary_revision,
      l_new_media_fingerprint,
      l_translation_fingerprint
    );
  end loop;
  return new;
end;
$$;

create trigger destination_images_translation_media_cascade_trigger
after update on public.destination_images
for each row execute function private.destination_image_translation_media_cascade();

alter function private.destination_translation_source_cascade() owner to postgres;
alter function private.destination_image_translation_media_cascade() owner to postgres;
revoke all on function private.destination_translation_source_cascade() from public, anon, authenticated;
revoke all on function private.destination_image_translation_media_cascade() from public, anon, authenticated;

create or replace function private.destination_source_is_eligible(p_source public.destinations)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_source.id is null
    or p_source.status <> 'published'::public.publication_status
    or p_source.category_id is null
    or p_source.latitude is null
    or p_source.longitude is null
    or p_source.latitude not between -90 and 90
    or p_source.longitude not between -180 and 180
    or p_source.thumbnail_bucket <> 'tourism-media'
    or p_source.thumbnail_path is null
    or pg_catalog.btrim(p_source.thumbnail_path) = ''
    or p_source.source_revision <= 0
    or p_source.thumbnail_binary_revision <= 0 then
    return false;
  end if;
  if not exists (
    select 1
    from public.destination_categories as category
    where category.id = p_source.category_id
      and category.slug in ('alam', 'budaya', 'religi')
  ) then
    return false;
  end if;
  if not private.fingerprint_text_array_is_valid(p_source.facilities) then
    return false;
  end if;
  if (p_source.contact_name is not null or p_source.contact_phone is not null)
    and not p_source.contact_consent_confirmed then
    return false;
  end if;
  if not exists (
    select 1
    from public.destination_images as image
    join storage.objects as object
      on object.bucket_id = image.storage_bucket
     and object.name = image.storage_path
    where image.destination_id = p_source.id
      and image.is_primary
      and image.storage_bucket = p_source.thumbnail_bucket
      and image.storage_path = p_source.thumbnail_path
      and image.storage_path ~ ('^destination/' || p_source.id::text || '/' || image.id::text || '\.(jpg|png|webp)$')
  ) then
    return false;
  end if;
  perform private.destination_source_fingerprint_v1(p_source);
  perform private.destination_thumbnail_media_fingerprint_v1(p_source);
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.destination_translation_content_is_complete(
  p_source public.destinations,
  p_translation public.destination_translations
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_source_value text;
  l_translation_value text;
begin
  if pg_catalog.btrim(p_translation.name) = ''
    or pg_catalog.btrim(p_translation.summary) = ''
    or pg_catalog.btrim(p_translation.description) = ''
    or pg_catalog.btrim(p_translation.thumbnail_alt_text) = ''
    or not private.fingerprint_text_array_is_valid(p_translation.facilities)
    or pg_catalog.cardinality(p_translation.facilities) <> pg_catalog.cardinality(p_source.facilities) then
    return false;
  end if;

  l_source_value := private.fingerprint_normalize_text(p_source.history);
  l_translation_value := private.fingerprint_normalize_text(p_translation.history);
  if (l_source_value is null or l_source_value = '') <> (l_translation_value is null or l_translation_value = '') then
    return false;
  end if;
  l_source_value := private.fingerprint_normalize_text(p_source.opening_hours);
  l_translation_value := private.fingerprint_normalize_text(p_translation.opening_hours);
  if (l_source_value is null or l_source_value = '') <> (l_translation_value is null or l_translation_value = '') then
    return false;
  end if;
  l_source_value := private.fingerprint_normalize_text(p_source.price_note);
  l_translation_value := private.fingerprint_normalize_text(p_translation.price_note);
  if (l_source_value is null or l_source_value = '') <> (l_translation_value is null or l_translation_value = '') then
    return false;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.destination_translation_is_eligible(
  p_source public.destinations,
  p_translation public.destination_translations
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if p_translation.destination_id <> p_source.id
    or p_translation.locale <> 'en'
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or not private.destination_source_is_eligible(p_source)
    or not private.destination_translation_content_is_complete(p_source, p_translation) then
    return false;
  end if;
  l_source_fingerprint := private.destination_source_fingerprint_v1(p_source);
  l_thumbnail_fingerprint := private.destination_thumbnail_media_fingerprint_v1(p_source);
  l_translation_fingerprint := private.destination_translation_fingerprint_v1(p_translation);
  return p_translation.captured_source_fingerprint = l_source_fingerprint
    and p_translation.captured_thumbnail_media_fingerprint = l_thumbnail_fingerprint
    and p_translation.translation_fingerprint = l_translation_fingerprint;
exception when others then
  return false;
end;
$$;

create or replace function private.destination_image_translation_is_eligible(
  p_source public.destinations,
  p_parent_translation public.destination_translations,
  p_image public.destination_images,
  p_translation public.destination_image_translations
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
  if p_image.destination_id <> p_source.id
    or p_translation.destination_image_id <> p_image.id
    or p_translation.locale <> 'en'
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or pg_catalog.btrim(p_translation.alt_text) = ''
    or not private.destination_translation_is_eligible(p_source, p_parent_translation)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = p_image.storage_bucket
        and object.name = p_image.storage_path
    ) then
    return false;
  end if;
  l_media_fingerprint := private.destination_image_media_fingerprint_v1(p_image);
  l_translation_fingerprint := private.destination_image_translation_fingerprint_v1(p_translation);
  return p_translation.captured_media_fingerprint = l_media_fingerprint
    and p_translation.translation_fingerprint = l_translation_fingerprint;
exception when others then
  return false;
end;
$$;

alter function private.destination_source_is_eligible(public.destinations) owner to postgres;
alter function private.destination_translation_content_is_complete(public.destinations, public.destination_translations) owner to postgres;
alter function private.destination_translation_is_eligible(public.destinations, public.destination_translations) owner to postgres;
alter function private.destination_image_translation_is_eligible(public.destinations, public.destination_translations, public.destination_images, public.destination_image_translations) owner to postgres;
revoke all on function private.destination_source_is_eligible(public.destinations) from public, anon, authenticated;
revoke all on function private.destination_translation_content_is_complete(public.destinations, public.destination_translations) from public, anon, authenticated;
revoke all on function private.destination_translation_is_eligible(public.destinations, public.destination_translations) from public, anon, authenticated;
revoke all on function private.destination_image_translation_is_eligible(public.destinations, public.destination_translations, public.destination_images, public.destination_image_translations) from public, anon, authenticated;

create or replace function private.tourism_media_object_is_unreferenced(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_bucket_id = 'tourism-media' and p_object_name is not null, false)
    and not (
      exists (select 1 from public.destinations as row where row.thumbnail_bucket = p_bucket_id and row.thumbnail_path = p_object_name)
      or exists (select 1 from public.tourism_packages as row where row.thumbnail_bucket = p_bucket_id and row.thumbnail_path = p_object_name)
      or exists (select 1 from public.homestays as row where row.thumbnail_bucket = p_bucket_id and row.thumbnail_path = p_object_name)
      or exists (select 1 from public.umkms as row where row.thumbnail_bucket = p_bucket_id and row.thumbnail_path = p_object_name)
      or exists (select 1 from public.traditional_houses as row where row.thumbnail_bucket = p_bucket_id and row.thumbnail_path = p_object_name)
      or exists (select 1 from public.cultural_articles as row where row.thumbnail_bucket = p_bucket_id and row.thumbnail_path = p_object_name)
      or exists (select 1 from public.customary_institution_articles as row where row.thumbnail_bucket = p_bucket_id and row.thumbnail_path = p_object_name)
      or exists (select 1 from public.cultural_events as row where row.thumbnail_bucket = p_bucket_id and row.thumbnail_path = p_object_name)
      or exists (select 1 from public.destination_images as row where row.storage_bucket = p_bucket_id and row.storage_path = p_object_name)
      or exists (select 1 from public.package_images as row where row.storage_bucket = p_bucket_id and row.storage_path = p_object_name)
      or exists (select 1 from public.homestay_images as row where row.storage_bucket = p_bucket_id and row.storage_path = p_object_name)
      or exists (select 1 from public.umkm_images as row where row.storage_bucket = p_bucket_id and row.storage_path = p_object_name)
      or exists (select 1 from public.traditional_house_images as row where row.storage_bucket = p_bucket_id and row.storage_path = p_object_name)
      or exists (select 1 from public.cultural_article_images as row where row.storage_bucket = p_bucket_id and row.storage_path = p_object_name)
      or exists (select 1 from public.customary_institution_article_images as row where row.storage_bucket = p_bucket_id and row.storage_path = p_object_name)
      or exists (select 1 from public.cultural_event_images as row where row.storage_bucket = p_bucket_id and row.storage_path = p_object_name)
      or exists (select 1 from public.gallery_items as row where row.storage_bucket = p_bucket_id and row.storage_path = p_object_name)
      or exists (select 1 from public.gallery_items as row where row.storage_bucket = p_bucket_id and row.thumbnail_path = p_object_name)
    );
$$;

create or replace function private.tourism_media_object_exists(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_bucket_id is not null
    and p_object_name is not null
    and exists (
      select 1
      from storage.objects as object
      where object.bucket_id = p_bucket_id
        and object.name = p_object_name
    );
$$;

create table private.tourism_media_cleanup_claims (
  bucket_id text not null,
  object_name text not null,
  claim_token uuid not null,
  state text not null,
  claimed_at timestamptz not null,
  expires_at timestamptz not null,
  attempt_count bigint not null default 0 check (attempt_count >= 0),
  last_error text,
  primary key (bucket_id, object_name),
  constraint tourism_media_cleanup_claims_state_check check (state in ('active', 'deleting', 'failed', 'expired'))
);

alter table private.tourism_media_cleanup_claims enable row level security;
revoke all on table private.tourism_media_cleanup_claims from public, anon, authenticated;

create or replace function private.tourism_media_cleanup_claim_is_valid(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l_claim private.tourism_media_cleanup_claims;
begin
  if p_bucket_id is null or p_object_name is null then
    return false;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_bucket_id || pg_catalog.chr(1) || p_object_name, 0)
  );
  select claim.* into l_claim
  from private.tourism_media_cleanup_claims as claim
  where claim.bucket_id = p_bucket_id
    and claim.object_name = p_object_name
  for update;
  return coalesce(l_claim.state = 'deleting'
    and l_claim.expires_at > statement_timestamp()
    and private.tourism_media_object_is_unreferenced(p_bucket_id, p_object_name), false);
exception when no_data_found then
  return false;
end;
$$;

create or replace function private.tourism_media_reference_guard(
  p_bucket_id text,
  p_object_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_claim private.tourism_media_cleanup_claims;
begin
  if p_bucket_id is null or p_object_name is null then
    return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_bucket_id || pg_catalog.chr(1) || p_object_name, 0)
  );
  select claim.* into l_claim
  from private.tourism_media_cleanup_claims as claim
  where claim.bucket_id = p_bucket_id
    and claim.object_name = p_object_name
  for update;
  if l_claim.state in ('active', 'deleting')
    and l_claim.expires_at > statement_timestamp() then
    raise exception using errcode = '55000', message = 'storage object is reserved for cleanup';
  end if;
exception when no_data_found then
  return;
end;
$$;

create or replace function private.enforce_tourism_media_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_old jsonb;
  l_new jsonb;
  l_old_bucket text;
  l_old_path text;
  l_new_bucket text;
  l_new_path text;
  l_reference record;
begin
  if tg_op <> 'INSERT' then
    l_old := pg_catalog.to_jsonb(old);
  end if;
  if tg_op <> 'DELETE' then
    l_new := pg_catalog.to_jsonb(new);
  end if;

  if tg_table_name = 'gallery_items' then
    l_old_bucket := l_old ->> 'storage_bucket';
    l_new_bucket := l_new ->> 'storage_bucket';
    l_old_path := l_old ->> 'storage_path';
    l_new_path := l_new ->> 'storage_path';
  else
    l_old_bucket := coalesce(l_old ->> 'thumbnail_bucket', l_old ->> 'storage_bucket');
    l_new_bucket := coalesce(l_new ->> 'thumbnail_bucket', l_new ->> 'storage_bucket');
    l_old_path := coalesce(l_old ->> 'thumbnail_path', l_old ->> 'storage_path');
    l_new_path := coalesce(l_new ->> 'thumbnail_path', l_new ->> 'storage_path');
  end if;

  for l_reference in
    select refs.bucket_id, refs.object_name
    from (
      values
        (l_old_bucket, l_old_path),
        (l_new_bucket, l_new_path),
        (case when tg_table_name = 'gallery_items' then l_old_bucket end,
         case when tg_table_name = 'gallery_items' then l_old ->> 'thumbnail_path' end),
        (case when tg_table_name = 'gallery_items' then l_new_bucket end,
         case when tg_table_name = 'gallery_items' then l_new ->> 'thumbnail_path' end)
    ) as refs(bucket_id, object_name)
    where refs.bucket_id is not null and refs.object_name is not null
    group by refs.bucket_id, refs.object_name
    order by refs.bucket_id, refs.object_name
  loop
    perform private.tourism_media_reference_guard(l_reference.bucket_id, l_reference.object_name);
  end loop;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger destinations_tourism_media_reference_trigger
before insert or update or delete on public.destinations
for each row execute function private.enforce_tourism_media_reference();
create trigger tourism_packages_tourism_media_reference_trigger
before insert or update or delete on public.tourism_packages
for each row execute function private.enforce_tourism_media_reference();
create trigger homestays_tourism_media_reference_trigger
before insert or update or delete on public.homestays
for each row execute function private.enforce_tourism_media_reference();
create trigger umkms_tourism_media_reference_trigger
before insert or update or delete on public.umkms
for each row execute function private.enforce_tourism_media_reference();
create trigger traditional_houses_tourism_media_reference_trigger
before insert or update or delete on public.traditional_houses
for each row execute function private.enforce_tourism_media_reference();
create trigger cultural_articles_tourism_media_reference_trigger
before insert or update or delete on public.cultural_articles
for each row execute function private.enforce_tourism_media_reference();
create trigger customary_institution_articles_tourism_media_reference_trigger
before insert or update or delete on public.customary_institution_articles
for each row execute function private.enforce_tourism_media_reference();
create trigger cultural_events_tourism_media_reference_trigger
before insert or update or delete on public.cultural_events
for each row execute function private.enforce_tourism_media_reference();
create trigger destination_images_tourism_media_reference_trigger
before insert or update or delete on public.destination_images
for each row execute function private.enforce_tourism_media_reference();
create trigger package_images_tourism_media_reference_trigger
before insert or update or delete on public.package_images
for each row execute function private.enforce_tourism_media_reference();
create trigger homestay_images_tourism_media_reference_trigger
before insert or update or delete on public.homestay_images
for each row execute function private.enforce_tourism_media_reference();
create trigger umkm_images_tourism_media_reference_trigger
before insert or update or delete on public.umkm_images
for each row execute function private.enforce_tourism_media_reference();
create trigger traditional_house_images_tourism_media_reference_trigger
before insert or update or delete on public.traditional_house_images
for each row execute function private.enforce_tourism_media_reference();
create trigger cultural_article_images_tourism_media_reference_trigger
before insert or update or delete on public.cultural_article_images
for each row execute function private.enforce_tourism_media_reference();
create trigger customary_institution_article_images_media_ref_trg
before insert or update or delete on public.customary_institution_article_images
for each row execute function private.enforce_tourism_media_reference();
create trigger cultural_event_images_tourism_media_reference_trigger
before insert or update or delete on public.cultural_event_images
for each row execute function private.enforce_tourism_media_reference();
create trigger gallery_items_tourism_media_reference_trigger
before insert or update or delete on public.gallery_items
for each row execute function private.enforce_tourism_media_reference();

create or replace function public.tourism_media_cleanup_claim(
  p_bucket_id text,
  p_object_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_claim private.tourism_media_cleanup_claims;
  l_token uuid := extensions.gen_random_uuid();
  l_now timestamptz := statement_timestamp();
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_bucket_id is distinct from 'tourism-media' or p_object_name is null then
    raise exception using errcode = '22023', message = 'invalid tourism media cleanup object';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_bucket_id || pg_catalog.chr(1) || p_object_name, 0)
  );
  if not exists (select 1 from storage.objects where bucket_id = p_bucket_id and name = p_object_name)
    or not private.tourism_media_object_is_unreferenced(p_bucket_id, p_object_name) then
    raise exception using errcode = '55000', message = 'storage object is still referenced or missing';
  end if;
  select claim.* into l_claim
  from private.tourism_media_cleanup_claims as claim
  where claim.bucket_id = p_bucket_id and claim.object_name = p_object_name
  for update;
  if l_claim.state in ('active', 'deleting') and l_claim.expires_at > l_now then
    raise exception using errcode = '55000', message = 'storage object cleanup is already claimed';
  end if;
  if l_claim.state in ('active', 'deleting') and l_claim.expires_at <= l_now then
    update private.tourism_media_cleanup_claims
    set state = 'expired'
    where bucket_id = p_bucket_id and object_name = p_object_name;
    l_claim.state := 'expired';
  end if;
  insert into private.tourism_media_cleanup_claims (
    bucket_id, object_name, claim_token, state, claimed_at, expires_at, attempt_count, last_error
  ) values (
    p_bucket_id, p_object_name, l_token, 'active', l_now, l_now + interval '5 minutes',
    coalesce(l_claim.attempt_count, 0) + 1, null
  )
  on conflict (bucket_id, object_name) do update
    set claim_token = excluded.claim_token,
        state = excluded.state,
        claimed_at = excluded.claimed_at,
        expires_at = excluded.expires_at,
        attempt_count = excluded.attempt_count,
        last_error = excluded.last_error;
  return l_token;
exception when no_data_found then
  insert into private.tourism_media_cleanup_claims (
    bucket_id, object_name, claim_token, state, claimed_at, expires_at, attempt_count
  ) values (
    p_bucket_id, p_object_name, l_token, 'active', l_now, l_now + interval '5 minutes', 1
  );
  return l_token;
end;
$$;

create or replace function public.tourism_media_cleanup_begin_delete(
  p_bucket_id text,
  p_object_name text,
  p_claim_token uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_claim private.tourism_media_cleanup_claims;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_bucket_id is distinct from 'tourism-media' or p_object_name is null or p_claim_token is null then
    raise exception using errcode = '22023', message = 'invalid tourism media cleanup claim';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_bucket_id || pg_catalog.chr(1) || p_object_name, 0)
  );
  select claim.* into l_claim
  from private.tourism_media_cleanup_claims as claim
  where claim.bucket_id = p_bucket_id and claim.object_name = p_object_name
  for update;
  if l_claim.claim_token is distinct from p_claim_token
    or l_claim.state <> 'active'
    or l_claim.expires_at <= statement_timestamp() then
    raise exception using errcode = '55000', message = 'invalid or expired tourism media cleanup claim';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = p_bucket_id and name = p_object_name)
    or not private.tourism_media_object_is_unreferenced(p_bucket_id, p_object_name) then
    raise exception using errcode = '55000', message = 'storage object is still referenced or missing';
  end if;
  update private.tourism_media_cleanup_claims
  set state = 'deleting'
  where bucket_id = p_bucket_id and object_name = p_object_name;
exception when no_data_found then
  raise exception using errcode = '55000', message = 'invalid or expired tourism media cleanup claim';
end;
$$;

create or replace function public.tourism_media_cleanup_finish(
  p_bucket_id text,
  p_object_name text,
  p_claim_token uuid,
  p_success boolean,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_claim private.tourism_media_cleanup_claims;
  l_exists boolean;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_bucket_id is distinct from 'tourism-media' or p_object_name is null or p_claim_token is null or p_success is null then
    raise exception using errcode = '22023', message = 'invalid tourism media cleanup result';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_bucket_id || pg_catalog.chr(1) || p_object_name, 0)
  );
  select claim.* into l_claim
  from private.tourism_media_cleanup_claims as claim
  where claim.bucket_id = p_bucket_id and claim.object_name = p_object_name
  for update;
  if l_claim.claim_token is distinct from p_claim_token or l_claim.state <> 'deleting' then
    raise exception using errcode = '55000', message = 'invalid tourism media cleanup claim';
  end if;
  select exists (select 1 from storage.objects where bucket_id = p_bucket_id and name = p_object_name)
    into l_exists;
  if p_success and l_exists then
    raise exception using errcode = '55000', message = 'storage deletion was not observed';
  elsif p_success then
    delete from private.tourism_media_cleanup_claims
    where bucket_id = p_bucket_id and object_name = p_object_name;
  else
    if not l_exists then
      raise exception using errcode = '55000', message = 'storage deletion result is inconsistent';
    end if;
    update private.tourism_media_cleanup_claims
    set state = 'failed',
        expires_at = statement_timestamp(),
        last_error = nullif(pg_catalog.btrim(coalesce(p_error, '')), '')
    where bucket_id = p_bucket_id and object_name = p_object_name;
  end if;
exception when no_data_found then
  raise exception using errcode = '55000', message = 'invalid tourism media cleanup claim';
end;
$$;

alter function private.tourism_media_object_is_unreferenced(text, text) owner to postgres;
alter function private.tourism_media_object_exists(text, text) owner to postgres;
alter function private.tourism_media_cleanup_claim_is_valid(text, text) owner to postgres;
alter function private.tourism_media_reference_guard(text, text) owner to postgres;
alter function private.enforce_tourism_media_reference() owner to postgres;
alter function public.tourism_media_cleanup_claim(text, text) owner to postgres;
alter function public.tourism_media_cleanup_begin_delete(text, text, uuid) owner to postgres;
alter function public.tourism_media_cleanup_finish(text, text, uuid, boolean, text) owner to postgres;

revoke all on function private.tourism_media_object_is_unreferenced(text, text) from public, anon, authenticated;
revoke all on function private.tourism_media_object_exists(text, text) from public, anon, authenticated;
revoke all on function private.tourism_media_cleanup_claim_is_valid(text, text) from public, anon, authenticated;
revoke all on function private.tourism_media_reference_guard(text, text) from public, anon, authenticated;
revoke all on function private.enforce_tourism_media_reference() from public, anon, authenticated;
revoke all on function public.tourism_media_cleanup_claim(text, text) from public, anon;
revoke all on function public.tourism_media_cleanup_begin_delete(text, text, uuid) from public, anon;
revoke all on function public.tourism_media_cleanup_finish(text, text, uuid, boolean, text) from public, anon;
grant execute on function private.tourism_media_object_is_unreferenced(text, text) to authenticated;
grant execute on function private.tourism_media_cleanup_claim_is_valid(text, text) to authenticated;
grant execute on function public.tourism_media_cleanup_claim(text, text) to authenticated;
grant execute on function public.tourism_media_cleanup_begin_delete(text, text, uuid) to authenticated;
grant execute on function public.tourism_media_cleanup_finish(text, text, uuid, boolean, text) to authenticated;

drop policy if exists tourism_media_admin_update on storage.objects;
drop policy if exists tourism_media_admin_delete on storage.objects;

create policy tourism_media_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tourism-media'
  and (select public.is_admin())
  and private.tourism_media_object_is_unreferenced(bucket_id, name)
  and private.tourism_media_cleanup_claim_is_valid(bucket_id, name)
);

create or replace function private.media_mapping(p_entity_type text)
returns table(parent_table regclass, image_table regclass, parent_fk text)
language sql
immutable
set search_path = ''
as $$
  select mapping.parent_table, mapping.image_table, mapping.parent_fk
  from (values
    ('destination', 'public.destinations'::regclass, 'public.destination_images'::regclass, 'destination_id'),
    ('tourism-package', 'public.tourism_packages'::regclass, 'public.package_images'::regclass, 'package_id'),
    ('homestay', 'public.homestays'::regclass, 'public.homestay_images'::regclass, 'homestay_id'),
    ('umkm', 'public.umkms'::regclass, 'public.umkm_images'::regclass, 'umkm_id'),
    ('traditional-house', 'public.traditional_houses'::regclass, 'public.traditional_house_images'::regclass, 'traditional_house_id'),
    ('cultural-event', 'public.cultural_events'::regclass, 'public.cultural_event_images'::regclass, 'cultural_event_id')
  ) as mapping(entity_type, parent_table, image_table, parent_fk)
  where mapping.entity_type = p_entity_type;
$$;

create or replace function private.media_reorder_rows(
  p_entity_type text,
  p_parent_id uuid,
  p_image_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_parent_table regclass;
  l_image_table regclass;
  l_parent_fk text;
  l_existing_count integer;
  l_submitted_count integer;
  l_media record;
begin
  select mapping.parent_table, mapping.image_table, mapping.parent_fk
  into l_parent_table, l_image_table, l_parent_fk
  from private.media_mapping(p_entity_type) as mapping;
  if l_image_table is null then
    raise exception using errcode = '22023', message = 'unsupported media entity type';
  end if;
  l_submitted_count := coalesce(pg_catalog.cardinality(p_image_ids), 0);
  if l_submitted_count <> (
    select count(distinct image_id)
    from pg_catalog.unnest(coalesce(p_image_ids, '{}'::uuid[])) as submitted(image_id)
  ) then
    raise exception using errcode = '22023', message = 'duplicate media image identifier';
  end if;
  execute format('select count(*) from %s where %I = $1', l_image_table, l_parent_fk)
    into l_existing_count using p_parent_id;
  if l_existing_count <> l_submitted_count then
    raise exception using errcode = '22023', message = 'incomplete media ordering';
  end if;
  execute format('select count(*) from %s where %I = $1 and id = any($2)', l_image_table, l_parent_fk)
    into l_existing_count using p_parent_id, p_image_ids;
  if l_existing_count <> l_submitted_count then
    raise exception using errcode = '22023', message = 'media ownership mismatch';
  end if;
  if p_entity_type = 'destination' then
    for l_media in execute format(
      'select storage_bucket, storage_path from %s where %I = $1 order by storage_bucket, storage_path',
      l_image_table,
      l_parent_fk
    ) using p_parent_id loop
      perform private.tourism_media_reference_guard(l_media.storage_bucket, l_media.storage_path);
      if not private.tourism_media_object_exists(l_media.storage_bucket, l_media.storage_path) then
        raise exception using errcode = '55000', message = 'destination media object is missing';
      end if;
    end loop;
  end if;
  execute format(
    'update %s as image set display_order = ordering.position from (select image_id as id, position::integer - 1 as position from pg_catalog.unnest($1) with ordinality as submitted(image_id, position)) as ordering where image.id = ordering.id and image.%I = $2',
    l_image_table,
    l_parent_fk
  ) using p_image_ids, p_parent_id;
end;
$$;

alter function private.media_mapping(text) owner to postgres;
alter function private.media_reorder_rows(text, uuid, uuid[]) owner to postgres;
revoke all on function private.media_mapping(text) from public, anon, authenticated;
revoke all on function private.media_reorder_rows(text, uuid, uuid[]) from public, anon, authenticated;

create or replace function public.media_insert(
  p_entity_type text,
  p_parent_id uuid,
  p_image_id uuid,
  p_storage_path text,
  p_alt_text text,
  p_caption text default null,
  p_display_order integer default 0,
  p_is_primary boolean default false,
  p_image_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_parent_table regclass;
  l_image_table regclass;
  l_parent_fk text;
  l_locked_parent_id uuid;
  l_image_count integer;
  l_submitted_image_count integer;
  l_make_primary boolean;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_image_id is null or p_parent_id is null then
    raise exception using errcode = '22023', message = 'invalid media identifier';
  end if;
  if pg_catalog.btrim(coalesce(p_alt_text, '')) = '' then
    raise exception using errcode = '23514', message = 'alt text is required';
  end if;
  if p_display_order < 0 then
    raise exception using errcode = '23514', message = 'invalid display order';
  end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk
  into l_parent_table, l_image_table, l_parent_fk
  from private.media_mapping(p_entity_type) as mapping;
  if l_parent_table is null then
    raise exception using errcode = '22023', message = 'unsupported media entity type';
  end if;
  if p_entity_type = 'destination' then
    if p_storage_path is null or p_storage_path !~ (
      '^' || p_entity_type || '/' || p_parent_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    ) then
      raise exception using errcode = '22023', message = 'invalid media storage path';
    end if;
  elsif p_storage_path !~ (
    '^' || p_entity_type || '/' || p_parent_id::text || '/' || p_image_id::text || '\.(jpg|png|webp)$'
  ) then
    raise exception using errcode = '22023', message = 'invalid media storage path';
  end if;
  select count(*) into l_submitted_image_count
  from pg_catalog.unnest(coalesce(p_image_ids, '{}'::uuid[])) as submitted(image_id)
  where submitted.image_id = p_image_id;
  if l_submitted_image_count <> 1 then
    raise exception using errcode = '22023', message = 'inserted media must appear exactly once in ordering';
  end if;
  execute format('select id from %s where id = $1 for update', l_parent_table)
    into l_locked_parent_id using p_parent_id;
  if l_locked_parent_id is null then
    raise exception using errcode = 'P0002', message = 'media parent not found';
  end if;
  if p_entity_type = 'destination' then
    perform private.tourism_media_reference_guard('tourism-media', p_storage_path);
    if not private.tourism_media_object_exists('tourism-media', p_storage_path) then
      raise exception using errcode = '55000', message = 'destination media object is missing';
    end if;
  end if;
  execute format('select count(*) from %s where %I = $1', l_image_table, l_parent_fk)
    into l_image_count using p_parent_id;
  if l_image_count >= 10 then
    raise exception using errcode = '23514', message = 'media image limit exceeded';
  end if;

  l_make_primary := p_is_primary or l_image_count = 0;
  if l_make_primary then
    execute format('update %s set is_primary = false where %I = $1 and is_primary', l_image_table, l_parent_fk)
      using p_parent_id;
  end if;
  execute format(
    'insert into %s (id, %I, storage_bucket, storage_path, caption, alt_text, display_order, is_primary, created_by) values ($1, $2, ''tourism-media'', $3, $4, $5, $6, $7, auth.uid())',
    l_image_table,
    l_parent_fk
  ) using p_image_id, p_parent_id, p_storage_path, nullif(pg_catalog.btrim(p_caption), ''), pg_catalog.btrim(p_alt_text), p_display_order, l_make_primary;

  if l_make_primary then
    execute format('update %s set thumbnail_bucket = ''tourism-media'', thumbnail_path = $1, updated_by = auth.uid() where id = $2', l_parent_table)
      using p_storage_path, p_parent_id;
  else
    execute format('update %s set updated_by = auth.uid() where id = $1', l_parent_table)
      using p_parent_id;
  end if;
  perform private.media_reorder_rows(p_entity_type, p_parent_id, p_image_ids);
  return p_image_id;
end;
$$;

create or replace function public.media_update(
  p_entity_type text,
  p_parent_id uuid,
  p_image_id uuid,
  p_alt_text text,
  p_caption text,
  p_display_order integer,
  p_is_primary boolean,
  p_image_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_parent_table regclass;
  l_image_table regclass;
  l_parent_fk text;
  l_locked_parent_id uuid;
  l_image_path text;
  l_affected integer;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if pg_catalog.btrim(coalesce(p_alt_text, '')) = '' or p_display_order < 0 then
    raise exception using errcode = '23514', message = 'invalid media metadata';
  end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk
  into l_parent_table, l_image_table, l_parent_fk
  from private.media_mapping(p_entity_type) as mapping;
  if l_parent_table is null then
    raise exception using errcode = '22023', message = 'unsupported media entity type';
  end if;
  execute format('select id from %s where id = $1 for update', l_parent_table)
    into l_locked_parent_id using p_parent_id;
  if l_locked_parent_id is null then
    raise exception using errcode = 'P0002', message = 'media parent not found';
  end if;
  execute format('select storage_path from %s where id = $1 and %I = $2 for update', l_image_table, l_parent_fk)
    into l_image_path using p_image_id, p_parent_id;
  if l_image_path is null then
    raise exception using errcode = 'P0002', message = 'media image not found';
  end if;
  if p_entity_type = 'destination' then
    perform private.tourism_media_reference_guard('tourism-media', l_image_path);
    if not private.tourism_media_object_exists('tourism-media', l_image_path) then
      raise exception using errcode = '55000', message = 'destination media object is missing';
    end if;
  end if;
  if p_is_primary then
    execute format('update %s set is_primary = false where %I = $1 and id <> $2 and is_primary', l_image_table, l_parent_fk)
      using p_parent_id, p_image_id;
  end if;
  execute format('update %s set alt_text = $1, caption = $2, display_order = $3, is_primary = $4 where id = $5 and %I = $6', l_image_table, l_parent_fk)
    using pg_catalog.btrim(p_alt_text), nullif(pg_catalog.btrim(p_caption), ''), p_display_order, p_is_primary, p_image_id, p_parent_id;
  get diagnostics l_affected = row_count;
  if l_affected <> 1 then
    raise exception using errcode = 'P0002', message = 'media image not found';
  end if;
  if p_is_primary then
    execute format('update %s set thumbnail_bucket = ''tourism-media'', thumbnail_path = $1, updated_by = auth.uid() where id = $2', l_parent_table)
      using l_image_path, p_parent_id;
  else
    execute format('select storage_path from %s where %I = $1 and is_primary limit 1', l_image_table, l_parent_fk)
      into l_image_path using p_parent_id;
    if l_image_path is null then
      execute format('update %s set is_primary = true where id = (select id from %s where %I = $1 order by display_order, id limit 1) returning storage_path', l_image_table, l_image_table, l_parent_fk)
        into l_image_path using p_parent_id;
    end if;
    execute format('update %s set thumbnail_bucket = case when $1 is null then null else ''tourism-media'' end, thumbnail_path = $1, updated_by = auth.uid() where id = $2', l_parent_table)
      using l_image_path, p_parent_id;
  end if;
  perform private.media_reorder_rows(p_entity_type, p_parent_id, p_image_ids);
end;
$$;

create or replace function public.media_set_primary(
  p_entity_type text,
  p_parent_id uuid,
  p_image_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_parent_table regclass;
  l_image_table regclass;
  l_parent_fk text;
  l_locked_parent_id uuid;
  l_image_path text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk
  into l_parent_table, l_image_table, l_parent_fk
  from private.media_mapping(p_entity_type) as mapping;
  if l_parent_table is null then
    raise exception using errcode = '22023', message = 'unsupported media entity type';
  end if;
  execute format('select id from %s where id = $1 for update', l_parent_table)
    into l_locked_parent_id using p_parent_id;
  if l_locked_parent_id is null then
    raise exception using errcode = 'P0002', message = 'media parent not found';
  end if;
  execute format('select storage_path from %s where id = $1 and %I = $2 for update', l_image_table, l_parent_fk)
    into l_image_path using p_image_id, p_parent_id;
  if l_image_path is null then
    raise exception using errcode = 'P0002', message = 'media image not found';
  end if;
  if p_entity_type = 'destination' then
    perform private.tourism_media_reference_guard('tourism-media', l_image_path);
    if not private.tourism_media_object_exists('tourism-media', l_image_path) then
      raise exception using errcode = '55000', message = 'destination media object is missing';
    end if;
  end if;
  execute format('update %s set is_primary = false where %I = $1 and is_primary', l_image_table, l_parent_fk)
    using p_parent_id;
  execute format('update %s set is_primary = true where id = $1 and %I = $2', l_image_table, l_parent_fk)
    using p_image_id, p_parent_id;
  execute format('update %s set thumbnail_bucket = ''tourism-media'', thumbnail_path = $1, updated_by = auth.uid() where id = $2', l_parent_table)
    using l_image_path, p_parent_id;
end;
$$;

create or replace function public.media_replace(
  p_entity_type text,
  p_parent_id uuid,
  p_image_id uuid,
  p_storage_path text,
  p_alt_text text,
  p_caption text,
  p_display_order integer,
  p_is_primary boolean,
  p_image_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_parent_table regclass;
  l_image_table regclass;
  l_parent_fk text;
  l_locked_parent_id uuid;
  l_old_path text;
  l_primary_path text;
  l_was_primary boolean;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if pg_catalog.btrim(coalesce(p_alt_text, '')) = '' or p_display_order < 0 then
    raise exception using errcode = '23514', message = 'invalid media metadata';
  end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk
  into l_parent_table, l_image_table, l_parent_fk
  from private.media_mapping(p_entity_type) as mapping;
  if l_parent_table is null then
    raise exception using errcode = '22023', message = 'unsupported media entity type';
  end if;
  if p_storage_path is null or p_storage_path !~ (
    '^' || p_entity_type || '/' || p_parent_id::text
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ) then
    raise exception using errcode = '22023', message = 'invalid media storage path';
  end if;
  execute format('select id from %s where id = $1 for update', l_parent_table)
    into l_locked_parent_id using p_parent_id;
  if l_locked_parent_id is null then
    raise exception using errcode = 'P0002', message = 'media parent not found';
  end if;
  execute format('select storage_path, is_primary from %s where id = $1 and %I = $2 for update', l_image_table, l_parent_fk)
    into l_old_path, l_was_primary using p_image_id, p_parent_id;
  if l_old_path is null then
    raise exception using errcode = 'P0002', message = 'media image not found';
  end if;
  if p_entity_type = 'destination' then
    if p_storage_path is not distinct from l_old_path then
      perform private.tourism_media_reference_guard('tourism-media', l_old_path);
    elsif p_storage_path < l_old_path then
      perform private.tourism_media_reference_guard('tourism-media', p_storage_path);
      perform private.tourism_media_reference_guard('tourism-media', l_old_path);
    else
      perform private.tourism_media_reference_guard('tourism-media', l_old_path);
      perform private.tourism_media_reference_guard('tourism-media', p_storage_path);
    end if;
    if not private.tourism_media_object_exists('tourism-media', p_storage_path)
      or not private.tourism_media_object_exists('tourism-media', l_old_path) then
      raise exception using errcode = '55000', message = 'destination media object is missing';
    end if;
  end if;
  if p_is_primary then
    execute format('update %s set is_primary = false where %I = $1 and id <> $2 and is_primary', l_image_table, l_parent_fk)
      using p_parent_id, p_image_id;
  end if;
  execute format('update %s set storage_bucket = ''tourism-media'', storage_path = $1, alt_text = $2, caption = $3, display_order = $4, is_primary = $5 where id = $6 and %I = $7', l_image_table, l_parent_fk)
    using p_storage_path, pg_catalog.btrim(p_alt_text), nullif(pg_catalog.btrim(p_caption), ''), p_display_order, p_is_primary, p_image_id, p_parent_id;
  if p_is_primary then
    execute format('update %s set thumbnail_bucket = ''tourism-media'', thumbnail_path = $1, updated_by = auth.uid() where id = $2', l_parent_table)
      using p_storage_path, p_parent_id;
  elsif l_was_primary then
    execute format('select storage_path from %s where %I = $1 and is_primary limit 1', l_image_table, l_parent_fk)
      into l_primary_path using p_parent_id;
    if l_primary_path is null then
      execute format('update %s set is_primary = true where id = (select id from %s where %I = $1 order by display_order, id limit 1) returning storage_path', l_image_table, l_image_table, l_parent_fk)
        into l_primary_path using p_parent_id;
    end if;
    execute format('update %s set thumbnail_bucket = case when $1 is null then null else ''tourism-media'' end, thumbnail_path = $1, updated_by = auth.uid() where id = $2', l_parent_table)
      using l_primary_path, p_parent_id;
  else
    execute format('update %s set updated_by = auth.uid() where id = $1', l_parent_table)
      using p_parent_id;
  end if;
  perform private.media_reorder_rows(p_entity_type, p_parent_id, p_image_ids);
  return l_old_path;
end;
$$;

create or replace function public.media_reorder(
  p_entity_type text,
  p_parent_id uuid,
  p_image_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_parent_table regclass;
  l_image_table regclass;
  l_parent_fk text;
  l_locked_parent_id uuid;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk
  into l_parent_table, l_image_table, l_parent_fk
  from private.media_mapping(p_entity_type) as mapping;
  if l_image_table is null then
    raise exception using errcode = '22023', message = 'unsupported media entity type';
  end if;
  execute format('select id from %s where id = $1 for update', l_parent_table)
    into l_locked_parent_id using p_parent_id;
  if l_locked_parent_id is null then
    raise exception using errcode = 'P0002', message = 'media parent not found';
  end if;
  perform private.media_reorder_rows(p_entity_type, p_parent_id, p_image_ids);
  execute format('update %s set updated_by = auth.uid() where id = $1', l_parent_table)
    using p_parent_id;
end;
$$;

create or replace function public.media_delete(
  p_entity_type text,
  p_parent_id uuid,
  p_image_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_parent_table regclass;
  l_image_table regclass;
  l_parent_fk text;
  l_locked_parent_id uuid;
  l_old_path text;
  l_was_primary boolean;
  l_fallback_id uuid;
  l_fallback_path text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  select mapping.parent_table, mapping.image_table, mapping.parent_fk
  into l_parent_table, l_image_table, l_parent_fk
  from private.media_mapping(p_entity_type) as mapping;
  if l_parent_table is null then
    raise exception using errcode = '22023', message = 'unsupported media entity type';
  end if;
  execute format('select id from %s where id = $1 for update', l_parent_table)
    into l_locked_parent_id using p_parent_id;
  if l_locked_parent_id is null then
    raise exception using errcode = 'P0002', message = 'media parent not found';
  end if;
  execute format('select storage_path, is_primary from %s where id = $1 and %I = $2 for update', l_image_table, l_parent_fk)
    into l_old_path, l_was_primary using p_image_id, p_parent_id;
  if l_old_path is null then
    raise exception using errcode = 'P0002', message = 'media image not found';
  end if;
  if p_entity_type = 'destination' then
    perform private.tourism_media_reference_guard('tourism-media', l_old_path);
    if not private.tourism_media_object_exists('tourism-media', l_old_path) then
      raise exception using errcode = '55000', message = 'destination media object is missing';
    end if;
  end if;
  execute format('delete from %s where id = $1 and %I = $2', l_image_table, l_parent_fk)
    using p_image_id, p_parent_id;
  execute format(
    'with ordered as (select id, row_number() over (order by display_order, id)::integer - 1 as new_order from %s where %I = $1) update %s as image set display_order = ordered.new_order from ordered where image.id = ordered.id',
    l_image_table,
    l_parent_fk,
    l_image_table
  ) using p_parent_id;
  if l_was_primary then
    execute format('select id, storage_path from %s where %I = $1 order by display_order, id limit 1', l_image_table, l_parent_fk)
      into l_fallback_id, l_fallback_path using p_parent_id;
    if l_fallback_id is not null then
      execute format('update %s set is_primary = (id = $2) where %I = $1', l_image_table, l_parent_fk)
        using p_parent_id, l_fallback_id;
    end if;
    execute format('update %s set thumbnail_bucket = case when $1 is null then null else ''tourism-media'' end, thumbnail_path = $1, updated_by = auth.uid() where id = $2', l_parent_table)
      using l_fallback_path, p_parent_id;
  else
    execute format('update %s set updated_by = auth.uid() where id = $1', l_parent_table)
      using p_parent_id;
  end if;
  return l_old_path;
end;
$$;

alter function public.media_insert(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) owner to postgres;
alter function public.media_update(text, uuid, uuid, text, text, integer, boolean, uuid[]) owner to postgres;
alter function public.media_set_primary(text, uuid, uuid) owner to postgres;
alter function public.media_replace(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) owner to postgres;
alter function public.media_reorder(text, uuid, uuid[]) owner to postgres;
alter function public.media_delete(text, uuid, uuid) owner to postgres;

revoke all on function public.media_insert(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) from public, anon;
revoke all on function public.media_update(text, uuid, uuid, text, text, integer, boolean, uuid[]) from public, anon;
revoke all on function public.media_set_primary(text, uuid, uuid) from public, anon;
revoke all on function public.media_replace(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) from public, anon;
revoke all on function public.media_reorder(text, uuid, uuid[]) from public, anon;
revoke all on function public.media_delete(text, uuid, uuid) from public, anon;
grant execute on function public.media_insert(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) to authenticated;
grant execute on function public.media_update(text, uuid, uuid, text, text, integer, boolean, uuid[]) to authenticated;
grant execute on function public.media_set_primary(text, uuid, uuid) to authenticated;
grant execute on function public.media_replace(text, uuid, uuid, text, text, text, integer, boolean, uuid[]) to authenticated;
grant execute on function public.media_reorder(text, uuid, uuid[]) to authenticated;
grant execute on function public.media_delete(text, uuid, uuid) to authenticated;

create or replace function private.lock_destination_translation(p_translation_id uuid)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_translation public.destination_translations;
  l_destination_id uuid;
begin
  select translation.* into l_translation
  from public.destination_translations as translation
  where translation.id = p_translation_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'destination translation not found';
  end if;
  select source.id into l_destination_id
  from public.destinations as source
  where source.id = l_translation.destination_id
  for update;
  if l_destination_id is null then
    raise exception using errcode = 'P0002', message = 'destination source not found';
  end if;
  perform image.id
  from public.destination_images as image
  where image.destination_id = l_destination_id
  order by image.id
  for update;
  select translation.* into l_translation
  from public.destination_translations as translation
  where translation.id = p_translation_id
  for update;
  return l_translation;
end;
$$;

create or replace function private.lock_destination_image_translation(p_translation_id uuid)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_translation public.destination_image_translations;
  l_image_id uuid;
  l_destination_id uuid;
begin
  select translation.* into l_translation
  from public.destination_image_translations as translation
  where translation.id = p_translation_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'destination image translation not found';
  end if;
  select image.destination_id
  into l_destination_id
  from public.destination_images as image
  where image.id = l_translation.destination_image_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'destination source image not found';
  end if;
  perform source.id
  from public.destinations as source
  where source.id = l_destination_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'destination source not found';
  end if;
  select image.id, image.destination_id
  into l_image_id, l_destination_id
  from public.destination_images as image
  where image.id = l_translation.destination_image_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'destination source image not found';
  end if;
  select translation.* into l_translation
  from public.destination_image_translations as translation
  where translation.id = p_translation_id
  for update;
  return l_translation;
end;
$$;

alter function private.lock_destination_translation(uuid) owner to postgres;
alter function private.lock_destination_image_translation(uuid) owner to postgres;
revoke all on function private.lock_destination_translation(uuid) from public, anon, authenticated;
revoke all on function private.lock_destination_image_translation(uuid) from public, anon, authenticated;

create or replace function public.destination_translation_admin_read(p_destination_id uuid)
returns setof public.destination_translations
language sql
security definer
set search_path = ''
as $$
  select translation.*
  from public.destination_translations as translation
  where auth.uid() is not null
    and public.is_admin()
    and translation.destination_id = p_destination_id
  order by translation.id;
$$;

create or replace function public.destination_image_translation_admin_read(p_destination_image_id uuid)
returns setof public.destination_image_translations
language sql
security definer
set search_path = ''
as $$
  select translation.*
  from public.destination_image_translations as translation
  where auth.uid() is not null
    and public.is_admin()
    and translation.destination_image_id = p_destination_image_id
  order by translation.id;
$$;

create or replace function public.destination_translation_review_history(p_translation_id uuid)
returns setof public.destination_translation_review_events
language sql
security definer
set search_path = ''
as $$
  select event.*
  from public.destination_translation_review_events as event
  where auth.uid() is not null
    and public.is_admin()
    and event.destination_translation_id = p_translation_id
  order by event.occurred_at, event.id;
$$;

create or replace function public.destination_image_translation_review_history(p_translation_id uuid)
returns setof public.destination_image_translation_review_events
language sql
security definer
set search_path = ''
as $$
  select event.*
  from public.destination_image_translation_review_events as event
  where auth.uid() is not null
    and public.is_admin()
    and event.destination_image_translation_id = p_translation_id
  order by event.occurred_at, event.id;
$$;

create or replace function public.destination_translation_save_draft(
  p_destination_id uuid,
  p_expected_edit_revision bigint,
  p_name text,
  p_summary text,
  p_description text,
  p_history text,
  p_opening_hours text,
  p_price_note text,
  p_facilities text[],
  p_thumbnail_alt_text text
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_source public.destinations;
  l_old public.destination_translations;
  l_new public.destination_translations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_destination_id is null or p_facilities is null then
    raise exception using errcode = '23514', message = 'destination translation fields are invalid';
  end if;
  select source.* into l_source
  from public.destinations as source
  where source.id = p_destination_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'destination source not found';
  end if;
  perform image.id
  from public.destination_images as image
  where image.destination_id = p_destination_id
  order by image.id
  for update;
  select translation.* into l_old
  from public.destination_translations as translation
  where translation.destination_id = p_destination_id
    and translation.locale = 'en'
  for update;

  if not found then
    if p_expected_edit_revision is not null then
      raise exception using errcode = 'P0002', message = 'destination translation not found';
    end if;
    perform pg_catalog.set_config('destination.workflow', 'on', true);
    insert into public.destination_translations (
      destination_id, name, summary, description, history, opening_hours, price_note,
      facilities, thumbnail_alt_text, created_by, updated_by
    ) values (
      p_destination_id, p_name, p_summary, p_description, p_history, p_opening_hours,
      p_price_note, p_facilities, p_thumbnail_alt_text, l_actor, l_actor
    ) returning * into l_new;
    l_source_fingerprint := private.destination_source_fingerprint_v1(l_source);
    l_thumbnail_fingerprint := private.destination_thumbnail_media_fingerprint_v1(l_source);
    l_translation_fingerprint := private.destination_translation_fingerprint_v1(l_new);
    perform private.record_destination_translation_event(
      null, l_new, 'draft_saved', l_actor, l_source.source_revision,
      l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
    );
    return l_new;
  end if;

  if p_expected_edit_revision is null
    or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination translation edit revision mismatch';
  end if;
  if l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'archived destination translation must be restored first';
  end if;
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  update public.destination_translations as translation
  set name = p_name,
      summary = p_summary,
      description = p_description,
      history = p_history,
      opening_hours = p_opening_hours,
      price_note = p_price_note,
      facilities = p_facilities,
      thumbnail_alt_text = p_thumbnail_alt_text,
      translation_status = 'draft'::public.publication_status,
      review_state = 'pending',
      captured_source_revision = null,
      captured_source_fingerprint = null,
      captured_thumbnail_media_fingerprint = null,
      translation_fingerprint = null,
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
  l_source_fingerprint := private.destination_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.destination_thumbnail_media_fingerprint_v1(l_source);
  l_translation_fingerprint := private.destination_translation_fingerprint_v1(l_new);
  perform private.record_destination_translation_event(
    l_old, l_new, 'draft_saved', l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.destination_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_translations;
  l_new public.destination_translations;
  l_source public.destinations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_destination_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination translation edit revision mismatch';
  end if;
  select source.* into l_source
  from public.destinations as source
  where source.id = l_old.destination_id
  for update;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'destination translation is not pending review';
  end if;
  if not private.destination_source_is_eligible(l_source)
    or not private.destination_translation_content_is_complete(l_source, l_old) then
    raise exception using errcode = '55000', message = 'destination translation review eligibility failed';
  end if;
  l_source_fingerprint := private.destination_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.destination_thumbnail_media_fingerprint_v1(l_source);
  l_translation_fingerprint := private.destination_translation_fingerprint_v1(l_old);
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  update public.destination_translations as translation
  set review_state = 'reviewed',
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
  perform private.record_destination_translation_event(
    l_old, l_new, 'reviewed', l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.destination_translation_reject(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_reason text
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_translations;
  l_new public.destination_translations;
  l_source public.destinations;
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
  l_old := private.lock_destination_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state not in ('pending', 'reviewed') then
    raise exception using errcode = '55000', message = 'destination translation cannot be rejected in its current state';
  end if;
  select source.* into l_source from public.destinations as source where source.id = l_old.destination_id for update;
  l_source_fingerprint := private.destination_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.destination_thumbnail_media_fingerprint_v1(l_source);
  begin
    l_translation_fingerprint := private.destination_translation_fingerprint_v1(l_old);
  exception when others then
    l_translation_fingerprint := null;
  end;
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  update public.destination_translations as translation
  set translation_status = 'draft'::public.publication_status,
      review_state = 'rejected',
      captured_source_revision = null,
      captured_source_fingerprint = null,
      captured_thumbnail_media_fingerprint = null,
      translation_fingerprint = null,
      reviewed_at = null,
      reviewed_by = null,
      review_reason = pg_catalog.btrim(p_reason),
      rejected_at = statement_timestamp(),
      rejected_by = l_actor,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_destination_translation_event(
    l_old, l_new, 'rejected', l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint,
    pg_catalog.btrim(p_reason)
  );
  return l_new;
end;
$$;

create or replace function private.destination_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_translations;
  l_new public.destination_translations;
  l_source public.destinations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_destination_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not p_republish and l_old.published_at is not null)
    or (p_republish and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'destination translation publication transition is invalid';
  end if;
  select source.* into l_source
  from public.destinations as source
  where source.id = l_old.destination_id
  for update;
  if not private.destination_source_is_eligible(l_source)
    or not private.destination_translation_content_is_complete(l_source, l_old) then
    raise exception using errcode = '55000', message = 'destination translation publication eligibility failed';
  end if;
  l_source_fingerprint := private.destination_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.destination_thumbnail_media_fingerprint_v1(l_source);
  l_translation_fingerprint := private.destination_translation_fingerprint_v1(l_old);
  if p_republish
    and l_old.translation_status = 'published'::public.publication_status
    and (
      l_old.captured_source_fingerprint is distinct from l_source_fingerprint
      or l_old.captured_thumbnail_media_fingerprint is distinct from l_thumbnail_fingerprint
      or l_old.translation_fingerprint is distinct from l_translation_fingerprint
    ) then
    raise exception using errcode = '55000', message = 'fresh review required before destination translation republish';
  end if;
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  update public.destination_translations as translation
  set translation_status = 'published'::public.publication_status,
      captured_source_revision = l_source.source_revision,
      captured_source_fingerprint = l_source_fingerprint,
      captured_thumbnail_media_fingerprint = l_thumbnail_fingerprint,
      translation_fingerprint = l_translation_fingerprint,
      published_at = statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_destination_translation_event(
    l_old, l_new,
    case when p_republish then 'republished' else 'published' end,
    l_actor,
    l_source.source_revision,
    l_source_fingerprint,
    l_thumbnail_fingerprint,
    l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.destination_translation_publish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_translation_publish_transition(p_translation_id, p_expected_edit_revision, false);
end;
$$;

create or replace function public.destination_translation_republish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_translation_publish_transition(p_translation_id, p_expected_edit_revision, true);
end;
$$;

create or replace function private.destination_translation_simple_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_action text
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_translations;
  l_new public.destination_translations;
  l_source public.destinations;
  l_source_fingerprint text;
  l_thumbnail_fingerprint text;
  l_translation_fingerprint text;
  l_event_type text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_action not in ('archive', 'unpublish', 'restore') then
    raise exception using errcode = '22023', message = 'unsupported destination translation transition';
  end if;
  l_old := private.lock_destination_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination translation edit revision mismatch';
  end if;
  if p_action = 'archive' and l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'destination translation is already archived';
  elsif p_action = 'unpublish' and l_old.translation_status <> 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'destination translation is not published';
  elsif p_action = 'restore' and l_old.translation_status <> 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'destination translation is not archived';
  end if;
  select source.* into l_source
  from public.destinations as source
  where source.id = l_old.destination_id
  for update;
  l_source_fingerprint := private.destination_source_fingerprint_v1(l_source);
  l_thumbnail_fingerprint := private.destination_thumbnail_media_fingerprint_v1(l_source);
  begin
    l_translation_fingerprint := private.destination_translation_fingerprint_v1(l_old);
  exception when others then
    l_translation_fingerprint := null;
  end;
  l_event_type := case p_action
    when 'archive' then 'archived'
    when 'unpublish' then 'unpublished'
    when 'restore' then 'restored'
    else p_action
  end;
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  if p_action = 'archive' then
    update public.destination_translations as translation
    set translation_status = 'archived'::public.publication_status,
        review_state = 'pending',
        captured_source_revision = null,
        captured_source_fingerprint = null,
        captured_thumbnail_media_fingerprint = null,
        translation_fingerprint = null,
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
    update public.destination_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
        captured_source_revision = null,
        captured_source_fingerprint = null,
        captured_thumbnail_media_fingerprint = null,
        translation_fingerprint = null,
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
    update public.destination_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
        captured_source_revision = null,
        captured_source_fingerprint = null,
        captured_thumbnail_media_fingerprint = null,
        translation_fingerprint = null,
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
  perform private.record_destination_translation_event(
    l_old, l_new, l_event_type, l_actor, l_source.source_revision,
    l_source_fingerprint, l_thumbnail_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.destination_translation_archive(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'archive');
end;
$$;

create or replace function public.destination_translation_unpublish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'unpublish');
end;
$$;

create or replace function public.destination_translation_restore(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'restore');
end;
$$;

create or replace function private.lock_destination_image(p_destination_image_id uuid)
returns public.destination_images
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_image public.destination_images;
  l_destination_id uuid;
begin
  select image.* into l_image
  from public.destination_images as image
  where image.id = p_destination_image_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'destination source image not found';
  end if;
  select source.id into l_destination_id
  from public.destinations as source
  where source.id = l_image.destination_id
  for update;
  if l_destination_id is null then
    raise exception using errcode = 'P0002', message = 'destination source not found';
  end if;
  select image.* into l_image
  from public.destination_images as image
  where image.id = p_destination_image_id
  for update;
  return l_image;
end;
$$;

alter function private.lock_destination_image(uuid) owner to postgres;
revoke all on function private.lock_destination_image(uuid) from public, anon, authenticated;

create or replace function public.destination_image_translation_save_draft(
  p_destination_image_id uuid,
  p_expected_edit_revision bigint,
  p_alt_text text,
  p_caption text
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_image public.destination_images;
  l_source public.destinations;
  l_old public.destination_image_translations;
  l_new public.destination_image_translations;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if pg_catalog.btrim(coalesce(p_alt_text, '')) = '' then
    raise exception using errcode = '23514', message = 'destination image alt text is required';
  end if;
  l_image := private.lock_destination_image(p_destination_image_id);
  select source.* into l_source
  from public.destinations as source
  where source.id = l_image.destination_id
  for update;
  select translation.* into l_old
  from public.destination_image_translations as translation
  where translation.destination_image_id = p_destination_image_id
    and translation.locale = 'en'
  for update;
  if not found then
    if p_expected_edit_revision is not null then
      raise exception using errcode = 'P0002', message = 'destination image translation not found';
    end if;
    perform pg_catalog.set_config('destination.workflow', 'on', true);
    insert into public.destination_image_translations (
      destination_image_id, alt_text, caption, created_by, updated_by
    ) values (
      p_destination_image_id, p_alt_text, p_caption, l_actor, l_actor
    ) returning * into l_new;
    l_media_fingerprint := private.destination_image_media_fingerprint_v1(l_image);
    l_translation_fingerprint := private.destination_image_translation_fingerprint_v1(l_new);
    perform private.record_destination_image_translation_event(
      null, l_new, 'draft_saved', l_actor, l_image.binary_revision,
      l_media_fingerprint, l_translation_fingerprint
    );
    return l_new;
  end if;
  if p_expected_edit_revision is null
    or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination image translation edit revision mismatch';
  end if;
  if l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'archived destination image translation must be restored first';
  end if;
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  update public.destination_image_translations as translation
  set alt_text = p_alt_text,
      caption = p_caption,
      translation_status = 'draft'::public.publication_status,
      review_state = 'pending',
      captured_media_fingerprint = null,
      translation_fingerprint = null,
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
  l_media_fingerprint := private.destination_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.destination_image_translation_fingerprint_v1(l_new);
  perform private.record_destination_image_translation_event(
    l_old, l_new, 'draft_saved', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.destination_image_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_image_translations;
  l_new public.destination_image_translations;
  l_image public.destination_images;
  l_source public.destinations;
  l_parent_translation public.destination_translations;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_destination_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'destination image translation is not pending review';
  end if;
  select image.* into l_image
  from public.destination_images as image
  where image.id = l_old.destination_image_id;
  select source.* into l_source
  from public.destinations as source
  where source.id = l_image.destination_id
  for update;
  select translation.* into l_parent_translation
  from public.destination_translations as translation
  where translation.destination_id = l_source.id and translation.locale = 'en';
  if not found then
    raise exception using errcode = '55000', message = 'destination parent translation is required';
  end if;
  if not private.destination_translation_is_eligible(l_source, l_parent_translation)
    or not exists (select 1 from storage.objects as object where object.bucket_id = l_image.storage_bucket and object.name = l_image.storage_path) then
    raise exception using errcode = '55000', message = 'destination image translation review eligibility failed';
  end if;
  l_media_fingerprint := private.destination_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.destination_image_translation_fingerprint_v1(l_old);
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  update public.destination_image_translations as translation
  set review_state = 'reviewed',
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
  perform private.record_destination_image_translation_event(
    l_old, l_new, 'reviewed', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.destination_image_translation_reject(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_reason text
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_image_translations;
  l_new public.destination_image_translations;
  l_image public.destination_images;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '23514', message = 'rejection reason is required';
  end if;
  l_old := private.lock_destination_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state not in ('pending', 'reviewed') then
    raise exception using errcode = '55000', message = 'destination image translation cannot be rejected in its current state';
  end if;
  select image.* into l_image from public.destination_images as image where image.id = l_old.destination_image_id;
  l_media_fingerprint := private.destination_image_media_fingerprint_v1(l_image);
  begin
    l_translation_fingerprint := private.destination_image_translation_fingerprint_v1(l_old);
  exception when others then
    l_translation_fingerprint := null;
  end;
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  update public.destination_image_translations as translation
  set translation_status = 'draft'::public.publication_status,
      review_state = 'rejected',
      captured_media_fingerprint = null,
      translation_fingerprint = null,
      reviewed_at = null,
      reviewed_by = null,
      review_reason = pg_catalog.btrim(p_reason),
      rejected_at = statement_timestamp(),
      rejected_by = l_actor,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_destination_image_translation_event(
    l_old, l_new, 'rejected', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint, pg_catalog.btrim(p_reason)
  );
  return l_new;
end;
$$;

create or replace function private.destination_image_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_image_translations;
  l_new public.destination_image_translations;
  l_image public.destination_images;
  l_source public.destinations;
  l_parent_translation public.destination_translations;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_destination_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination image translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not p_republish and l_old.published_at is not null)
    or (p_republish and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'destination image translation publication transition is invalid';
  end if;
  select image.* into l_image from public.destination_images as image where image.id = l_old.destination_image_id;
  select source.* into l_source
  from public.destinations as source
  where source.id = l_image.destination_id
  for update;
  select translation.* into l_parent_translation
  from public.destination_translations as translation
  where translation.destination_id = l_source.id and translation.locale = 'en';
  if not found then
    raise exception using errcode = '55000', message = 'destination parent translation is required';
  end if;
  if not private.destination_translation_is_eligible(l_source, l_parent_translation)
    or not exists (select 1 from storage.objects as object where object.bucket_id = l_image.storage_bucket and object.name = l_image.storage_path)
    or pg_catalog.btrim(l_old.alt_text) = '' then
    raise exception using errcode = '55000', message = 'destination image translation publication eligibility failed';
  end if;
  l_media_fingerprint := private.destination_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.destination_image_translation_fingerprint_v1(l_old);
  if p_republish
    and l_old.translation_status = 'published'::public.publication_status
    and (
      l_old.captured_media_fingerprint is distinct from l_media_fingerprint
      or l_old.translation_fingerprint is distinct from l_translation_fingerprint
    ) then
    raise exception using errcode = '55000', message = 'fresh review required before destination image translation republish';
  end if;
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  update public.destination_image_translations as translation
  set translation_status = 'published'::public.publication_status,
      captured_media_fingerprint = l_media_fingerprint,
      translation_fingerprint = l_translation_fingerprint,
      published_at = statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_destination_image_translation_event(
    l_old, l_new,
    case when p_republish then 'republished' else 'published' end,
    l_actor,
    l_image.binary_revision,
    l_media_fingerprint,
    l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.destination_image_translation_publish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_image_translation_publish_transition(p_translation_id, p_expected_edit_revision, false);
end;
$$;

create or replace function public.destination_image_translation_republish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_image_translation_publish_transition(p_translation_id, p_expected_edit_revision, true);
end;
$$;

create or replace function private.destination_image_translation_simple_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_action text
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.destination_image_translations;
  l_new public.destination_image_translations;
  l_image public.destination_images;
  l_media_fingerprint text;
  l_translation_fingerprint text;
  l_event_type text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if p_action not in ('archive', 'unpublish', 'restore') then
    raise exception using errcode = '22023', message = 'unsupported destination image translation transition';
  end if;
  l_old := private.lock_destination_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'destination image translation edit revision mismatch';
  end if;
  if p_action = 'archive' and l_old.translation_status = 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'destination image translation is already archived';
  elsif p_action = 'unpublish' and l_old.translation_status <> 'published'::public.publication_status then
    raise exception using errcode = '55000', message = 'destination image translation is not published';
  elsif p_action = 'restore' and l_old.translation_status <> 'archived'::public.publication_status then
    raise exception using errcode = '55000', message = 'destination image translation is not archived';
  end if;
  select image.* into l_image from public.destination_images as image where image.id = l_old.destination_image_id;
  l_media_fingerprint := private.destination_image_media_fingerprint_v1(l_image);
  begin
    l_translation_fingerprint := private.destination_image_translation_fingerprint_v1(l_old);
  exception when others then
    l_translation_fingerprint := null;
  end;
  l_event_type := case p_action
    when 'archive' then 'archived'
    when 'unpublish' then 'unpublished'
    when 'restore' then 'restored'
    else p_action
  end;
  perform pg_catalog.set_config('destination.workflow', 'on', true);
  if p_action = 'archive' then
    update public.destination_image_translations as translation
    set translation_status = 'archived'::public.publication_status,
        review_state = 'pending',
        captured_media_fingerprint = null,
        translation_fingerprint = null,
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
    update public.destination_image_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
        captured_media_fingerprint = null,
        translation_fingerprint = null,
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
    update public.destination_image_translations as translation
    set translation_status = 'draft'::public.publication_status,
        review_state = 'pending',
        captured_media_fingerprint = null,
        translation_fingerprint = null,
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
  perform private.record_destination_image_translation_event(
    l_old, l_new, l_event_type, l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function public.destination_image_translation_archive(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_image_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'archive');
end;
$$;

create or replace function public.destination_image_translation_unpublish(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_image_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'unpublish');
end;
$$;

create or replace function public.destination_image_translation_restore(
  p_translation_id uuid,
  p_expected_edit_revision bigint
)
returns public.destination_image_translations
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.destination_image_translation_simple_transition(p_translation_id, p_expected_edit_revision, 'restore');
end;
$$;

alter function private.destination_translation_publish_transition(uuid, bigint, boolean) owner to postgres;
alter function private.destination_translation_simple_transition(uuid, bigint, text) owner to postgres;
alter function private.destination_image_translation_publish_transition(uuid, bigint, boolean) owner to postgres;
alter function private.destination_image_translation_simple_transition(uuid, bigint, text) owner to postgres;
alter function public.destination_translation_admin_read(uuid) owner to postgres;
alter function public.destination_image_translation_admin_read(uuid) owner to postgres;
alter function public.destination_translation_review_history(uuid) owner to postgres;
alter function public.destination_image_translation_review_history(uuid) owner to postgres;
alter function public.destination_translation_save_draft(uuid, bigint, text, text, text, text, text, text, text[], text) owner to postgres;
alter function public.destination_translation_review(uuid, bigint) owner to postgres;
alter function public.destination_translation_reject(uuid, bigint, text) owner to postgres;
alter function public.destination_translation_publish(uuid, bigint) owner to postgres;
alter function public.destination_translation_republish(uuid, bigint) owner to postgres;
alter function public.destination_translation_archive(uuid, bigint) owner to postgres;
alter function public.destination_translation_unpublish(uuid, bigint) owner to postgres;
alter function public.destination_translation_restore(uuid, bigint) owner to postgres;
alter function public.destination_image_translation_save_draft(uuid, bigint, text, text) owner to postgres;
alter function public.destination_image_translation_review(uuid, bigint) owner to postgres;
alter function public.destination_image_translation_reject(uuid, bigint, text) owner to postgres;
alter function public.destination_image_translation_publish(uuid, bigint) owner to postgres;
alter function public.destination_image_translation_republish(uuid, bigint) owner to postgres;
alter function public.destination_image_translation_archive(uuid, bigint) owner to postgres;
alter function public.destination_image_translation_unpublish(uuid, bigint) owner to postgres;
alter function public.destination_image_translation_restore(uuid, bigint) owner to postgres;
revoke all on function private.destination_translation_publish_transition(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function private.destination_translation_simple_transition(uuid, bigint, text) from public, anon, authenticated;
revoke all on function private.destination_image_translation_publish_transition(uuid, bigint, boolean) from public, anon, authenticated;
revoke all on function private.destination_image_translation_simple_transition(uuid, bigint, text) from public, anon, authenticated;

alter table public.destination_translations enable row level security;
alter table public.destination_image_translations enable row level security;
alter table public.destination_translation_review_events enable row level security;
alter table public.destination_image_translation_review_events enable row level security;
alter table public.destination_translations owner to postgres;
alter table public.destination_image_translations owner to postgres;
alter table public.destination_translation_review_events owner to postgres;
alter table public.destination_image_translation_review_events owner to postgres;
alter table private.tourism_media_cleanup_claims owner to postgres;
revoke all on table public.destination_translations from public, anon, authenticated;
revoke all on table public.destination_image_translations from public, anon, authenticated;
revoke all on table public.destination_translation_review_events from public, anon, authenticated;
revoke all on table public.destination_image_translation_review_events from public, anon, authenticated;

revoke all on function public.destination_translation_admin_read(uuid) from public, anon, authenticated;
revoke all on function public.destination_image_translation_admin_read(uuid) from public, anon, authenticated;
revoke all on function public.destination_translation_review_history(uuid) from public, anon, authenticated;
revoke all on function public.destination_image_translation_review_history(uuid) from public, anon, authenticated;
revoke all on function public.destination_translation_save_draft(uuid, bigint, text, text, text, text, text, text, text[], text) from public, anon, authenticated;
revoke all on function public.destination_translation_review(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_translation_reject(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.destination_translation_publish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_translation_republish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_translation_archive(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_translation_unpublish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_translation_restore(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_image_translation_admin_read(uuid) from public, anon, authenticated;
revoke all on function public.destination_image_translation_review_history(uuid) from public, anon, authenticated;
revoke all on function public.destination_image_translation_save_draft(uuid, bigint, text, text) from public, anon, authenticated;
revoke all on function public.destination_image_translation_review(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_image_translation_reject(uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.destination_image_translation_publish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_image_translation_republish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_image_translation_archive(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_image_translation_unpublish(uuid, bigint) from public, anon, authenticated;
revoke all on function public.destination_image_translation_restore(uuid, bigint) from public, anon, authenticated;

grant execute on function public.destination_translation_admin_read(uuid) to authenticated;
grant execute on function public.destination_image_translation_admin_read(uuid) to authenticated;
grant execute on function public.destination_translation_review_history(uuid) to authenticated;
grant execute on function public.destination_image_translation_review_history(uuid) to authenticated;
grant execute on function public.destination_translation_save_draft(uuid, bigint, text, text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.destination_translation_review(uuid, bigint) to authenticated;
grant execute on function public.destination_translation_reject(uuid, bigint, text) to authenticated;
grant execute on function public.destination_translation_publish(uuid, bigint) to authenticated;
grant execute on function public.destination_translation_republish(uuid, bigint) to authenticated;
grant execute on function public.destination_translation_archive(uuid, bigint) to authenticated;
grant execute on function public.destination_translation_unpublish(uuid, bigint) to authenticated;
grant execute on function public.destination_translation_restore(uuid, bigint) to authenticated;
grant execute on function public.destination_image_translation_admin_read(uuid) to authenticated;
grant execute on function public.destination_image_translation_review_history(uuid) to authenticated;
grant execute on function public.destination_image_translation_save_draft(uuid, bigint, text, text) to authenticated;
grant execute on function public.destination_image_translation_review(uuid, bigint) to authenticated;
grant execute on function public.destination_image_translation_reject(uuid, bigint, text) to authenticated;
grant execute on function public.destination_image_translation_publish(uuid, bigint) to authenticated;
grant execute on function public.destination_image_translation_republish(uuid, bigint) to authenticated;
grant execute on function public.destination_image_translation_archive(uuid, bigint) to authenticated;
grant execute on function public.destination_image_translation_unpublish(uuid, bigint) to authenticated;
grant execute on function public.destination_image_translation_restore(uuid, bigint) to authenticated;

create or replace view public.published_english_destinations
with (security_barrier = true, security_invoker = false)
as
select
  source.id,
  source.category_id,
  translation.name,
  source.slug,
  translation.summary,
  translation.description,
  translation.history,
  source.latitude,
  source.longitude,
  source.google_maps_url,
  translation.opening_hours,
  source.entrance_fee,
  translation.price_note,
  translation.facilities,
  source.contact_name,
  source.contact_phone,
  source.thumbnail_bucket,
  source.thumbnail_path,
  source.is_featured,
  source.display_order,
  source.published_at as source_published_at,
  translation.published_at as english_published_at
from public.destinations as source
join public.destination_categories as category
  on category.id = source.category_id
join public.destination_translations as translation
  on translation.destination_id = source.id
 and translation.locale = 'en'
where private.destination_translation_is_eligible(source, translation);

create or replace view public.published_english_destination_images
with (security_barrier = true, security_invoker = false)
as
select
  image.id,
  image.destination_id,
  image.storage_bucket,
  image.storage_path,
  translation.caption,
  translation.alt_text,
  image.display_order,
  image.is_primary
from public.destinations as source
join public.destination_translations as parent_translation
  on parent_translation.destination_id = source.id
 and parent_translation.locale = 'en'
join public.destination_images as image
  on image.destination_id = source.id
join public.destination_image_translations as translation
  on translation.destination_image_id = image.id
 and translation.locale = 'en'
where private.destination_image_translation_is_eligible(
  source,
  parent_translation,
  image,
  translation
);

alter view public.published_english_destinations owner to postgres;
alter view public.published_english_destination_images owner to postgres;
revoke all on public.published_english_destinations from public, anon, authenticated;
revoke all on public.published_english_destination_images from public, anon, authenticated;
grant select on public.published_english_destinations to anon, authenticated;
grant select on public.published_english_destination_images to anon, authenticated;
