begin;

-- The generic media_replace RPC already permits a fresh object UUID under the
-- trusted entity/parent prefix. Keep that contract consistent in every
-- bilingual source, review, and public projection predicate.
-- CREATE OR REPLACE preserves the existing owners and ACLs; no privilege
-- changes are needed for this contract-only correction.

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
      and image.storage_path ~ ('^destination/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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

create or replace function private.traditional_house_source_is_eligible(
  p_source public.traditional_houses
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_primary public.traditional_house_images;
begin
  if p_source.id is null
    or p_source.status <> 'published'::public.publication_status
    or pg_catalog.btrim(p_source.name) = ''
    or pg_catalog.btrim(p_source.description) = ''
    or p_source.thumbnail_bucket is null
    or p_source.thumbnail_path is null
    or p_source.thumbnail_bucket <> 'tourism-media'
    or p_source.thumbnail_path !~ ('^traditional-house/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or p_source.source_revision <= 0 then
    return false;
  end if;
  l_primary := private.traditional_house_current_primary_image(p_source);
  if l_primary.id is null
    or l_primary.storage_bucket <> p_source.thumbnail_bucket
    or l_primary.storage_path <> p_source.thumbnail_path
    or l_primary.storage_path !~ ('^traditional-house/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
  perform private.traditional_house_source_fingerprint_v1(p_source);
  perform private.traditional_house_thumbnail_media_fingerprint_v1(p_source, l_primary);
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.traditional_house_image_translation_is_eligible(
  p_source public.traditional_houses,
  p_image public.traditional_house_images,
  p_translation public.traditional_house_image_translations
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
  if p_image.traditional_house_id <> p_source.id
    or p_translation.traditional_house_image_id <> p_image.id
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or p_source.status <> 'published'::public.publication_status
    or p_image.storage_bucket <> 'tourism-media'
    or p_image.storage_path !~ ('^traditional-house/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or not private.traditional_house_image_translation_content_is_complete(p_image, p_translation)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = p_image.storage_bucket
        and object.name = p_image.storage_path
    ) then
    return false;
  end if;
  l_media_fingerprint := private.traditional_house_image_media_fingerprint_v1(p_image);
  l_translation_fingerprint := private.traditional_house_image_translation_fingerprint_v1(p_translation);
  return p_translation.captured_media_fingerprint = l_media_fingerprint
    and p_translation.translation_fingerprint = l_translation_fingerprint;
exception when others then
  return false;
end;
$$;

create or replace function private.traditional_house_image_translation_admin_derived_state(
  p_source public.traditional_houses,
  p_image public.traditional_house_images,
  p_translation public.traditional_house_image_translations
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
    l_current_media_fingerprint := private.traditional_house_image_media_fingerprint_v1(p_image);
  exception when others then
    l_current_media_fingerprint := null;
  end;
  begin
    l_current_translation_fingerprint := private.traditional_house_image_translation_fingerprint_v1(p_translation);
  exception when others then
    l_current_translation_fingerprint := null;
  end;

  stale_media_fingerprint := p_translation.captured_media_fingerprint is not null
    and p_translation.captured_media_fingerprint is distinct from l_current_media_fingerprint;
  stale_translation_fingerprint := p_translation.translation_fingerprint is not null
    and p_translation.translation_fingerprint is distinct from l_current_translation_fingerprint;

  l_review_eligibility := not source_blocked
    and p_image.traditional_house_id = p_source.id
    and p_image.storage_bucket = 'tourism-media'
    and p_image.storage_path ~ ('^traditional-house/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    and private.traditional_house_image_translation_content_is_complete(p_image, p_translation)
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

  l_public_eligibility := private.traditional_house_image_translation_is_eligible(
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

create or replace function public.traditional_house_image_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_terminology_review_confirmed boolean
)
returns public.traditional_house_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.traditional_house_image_translations;
  l_new public.traditional_house_image_translations;
  l_image public.traditional_house_images;
  l_source public.traditional_houses;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if not coalesce(p_terminology_review_confirmed, false) then
    raise exception using errcode = '23514', message = 'cultural terminology review confirmation is required';
  end if;
  l_old := private.lock_traditional_house_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'traditional house image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'traditional house image translation is not pending review';
  end if;
  select image.* into l_image
  from public.traditional_house_images as image
  where image.id = l_old.traditional_house_image_id;
  select source.* into l_source
  from public.traditional_houses as source
  where source.id = l_image.traditional_house_id;
  if l_source.status <> 'published'::public.publication_status
    or l_image.storage_bucket <> 'tourism-media'
    or l_image.storage_path !~ ('^traditional-house/' || l_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or not private.traditional_house_image_translation_content_is_complete(l_image, l_old)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = l_image.storage_bucket
        and object.name = l_image.storage_path
    ) then
    raise exception using errcode = '55000', message = 'traditional house image translation review eligibility failed';
  end if;
  l_media_fingerprint := private.traditional_house_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.traditional_house_image_translation_fingerprint_v1(l_old);
  perform pg_catalog.set_config('traditional_house.workflow', 'on', true);
  update public.traditional_house_image_translations as translation
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
  perform private.record_traditional_house_image_translation_event(
    l_old, l_new, 'reviewed', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function private.traditional_house_image_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.traditional_house_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.traditional_house_image_translations;
  l_new public.traditional_house_image_translations;
  l_image public.traditional_house_images;
  l_source public.traditional_houses;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_traditional_house_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'traditional house image translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not p_republish and (l_old.published_at is not null or l_old.translation_status <> 'draft'::public.publication_status))
    or (p_republish and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'traditional house image translation publication transition is invalid';
  end if;
  select image.* into l_image
  from public.traditional_house_images as image
  where image.id = l_old.traditional_house_image_id;
  select source.* into l_source
  from public.traditional_houses as source
  where source.id = l_image.traditional_house_id
  for update;
  if l_source.status <> 'published'::public.publication_status
    or l_image.storage_bucket <> 'tourism-media'
    or l_image.storage_path !~ ('^traditional-house/' || l_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or not private.traditional_house_image_translation_content_is_complete(l_image, l_old)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = l_image.storage_bucket
        and object.name = l_image.storage_path
    ) then
    raise exception using errcode = '55000', message = 'traditional house image translation publication eligibility failed';
  end if;
  l_media_fingerprint := private.traditional_house_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.traditional_house_image_translation_fingerprint_v1(l_old);
  if l_old.terminology_review_confirmed is not true
    or l_old.captured_media_fingerprint is distinct from l_media_fingerprint
    or l_old.translation_fingerprint is distinct from l_translation_fingerprint then
    raise exception using errcode = '55000', message = 'fresh review required before traditional house image translation publication';
  end if;
  perform pg_catalog.set_config('traditional_house.workflow', 'on', true);
  update public.traditional_house_image_translations as translation
  set translation_status = 'published'::public.publication_status,
      published_at = statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_traditional_house_image_translation_event(
    l_old, l_new,
    case when p_republish then 'republished' else 'published' end,
    l_actor, l_image.binary_revision, l_media_fingerprint,
    l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace view private.published_english_traditional_house_rows_data
with (security_barrier = true, security_invoker = false)
as
with primary_counts as (
  select
    image.traditional_house_id,
    count(*) as primary_count
  from public.traditional_house_images as image
  where image.is_primary
  group by image.traditional_house_id
), source_primary as (
  select
    source.id as source_id,
    source.slug,
    source.status as source_status,
    source.name as source_name,
    source.summary as source_summary,
    source.description as source_description,
    source.history as source_history,
    source.cultural_significance as source_cultural_significance,
    source.location_name as source_location_name,
    source.visitor_information as source_visitor_information,
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
    image.binary_revision as primary_binary_revision
  from public.traditional_houses as source
  join primary_counts
    on primary_counts.traditional_house_id = source.id
   and primary_counts.primary_count = 1
  join public.traditional_house_images as image
    on image.traditional_house_id = source.id
   and image.is_primary
), source_normalized as (
  select
    source_primary.*,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(source_primary.source_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as source_name_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(source_primary.source_summary, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as source_summary_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(source_primary.source_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as source_description_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(source_primary.source_history, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as source_history_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(source_primary.source_cultural_significance, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as source_cultural_significance_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(source_primary.source_location_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as source_location_name_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(source_primary.source_visitor_information, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as source_visitor_information_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(source_primary.primary_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as primary_caption_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(source_primary.primary_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as primary_alt_text_normalized
  from source_primary
), source_fingerprinted as (
  select
    source_normalized.*,
    'traditional-house-source-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('traditional-house-source-v1'::text)::text
            || ',"name":' || pg_catalog.to_json(source_normalized.source_name_normalized)::text
            || ',"summary":' || coalesce(pg_catalog.to_json(nullif(source_normalized.source_summary_normalized, ''))::text, 'null')
            || ',"description":' || pg_catalog.to_json(source_normalized.source_description_normalized)::text
            || ',"history":' || coalesce(pg_catalog.to_json(nullif(source_normalized.source_history_normalized, ''))::text, 'null')
            || ',"cultural_significance":' || coalesce(pg_catalog.to_json(nullif(source_normalized.source_cultural_significance_normalized, ''))::text, 'null')
            || ',"location_name":' || coalesce(pg_catalog.to_json(nullif(source_normalized.source_location_name_normalized, ''))::text, 'null')
            || ',"visitor_information":' || coalesce(pg_catalog.to_json(nullif(source_normalized.source_visitor_information_normalized, ''))::text, 'null')
            || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as source_fingerprint,
    'traditional-house-media-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('traditional-house-media-v1'::text)::text
            || ',"traditional_house_image_id":' || pg_catalog.to_json(pg_catalog.lower(source_normalized.primary_image_id::text))::text
            || ',"storage_bucket":' || pg_catalog.to_json(source_normalized.primary_storage_bucket)::text
            || ',"storage_path":' || pg_catalog.to_json(source_normalized.primary_storage_path)::text
            || ',"caption":' || coalesce(pg_catalog.to_json(nullif(source_normalized.primary_caption_normalized, ''))::text, 'null')
            || ',"alt_text":' || pg_catalog.to_json(source_normalized.primary_alt_text_normalized)::text
            || ',"binary_revision":' || source_normalized.primary_binary_revision::text
            || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as primary_media_fingerprint
  from source_normalized
), source_with_thumbnail_fingerprint as (
  select
    source_fingerprinted.*,
    'traditional-house-thumbnail-media-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('traditional-house-thumbnail-media-v1'::text)::text
            || ',"traditional_house_id":' || pg_catalog.to_json(pg_catalog.lower(source_fingerprinted.source_id::text))::text
            || ',"thumbnail_bucket":' || coalesce(pg_catalog.to_json(nullif(source_fingerprinted.thumbnail_bucket, ''))::text, 'null')
            || ',"thumbnail_path":' || coalesce(pg_catalog.to_json(nullif(source_fingerprinted.thumbnail_path, ''))::text, 'null')
            || ',"primary_image_id":' || coalesce(pg_catalog.to_json(pg_catalog.lower(source_fingerprinted.primary_image_id::text))::text, 'null')
            || ',"primary_image_media_fingerprint":' || coalesce(pg_catalog.to_json(source_fingerprinted.primary_media_fingerprint)::text, 'null')
            || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as thumbnail_fingerprint
  from source_fingerprinted
), parent_normalized as (
  select
    source_with_thumbnail_fingerprint.*,
    translation.id as translation_id,
    translation.name as translation_name,
    translation.summary as translation_summary,
    translation.description as translation_description,
    translation.history as translation_history,
    translation.cultural_significance as translation_cultural_significance,
    translation.location_name as translation_location_name,
    translation.visitor_information as translation_visitor_information,
    translation.translation_status,
    translation.review_state,
    translation.captured_source_fingerprint,
    translation.captured_thumbnail_media_fingerprint,
    translation.translation_fingerprint,
    translation.published_at as translation_published_at,
    primary_translation.translation_status as primary_image_translation_status,
    primary_translation.review_state as primary_image_review_state,
    primary_translation.alt_text as primary_image_alt_text,
    primary_translation.caption as primary_image_caption,
    primary_translation.captured_media_fingerprint as primary_captured_media_fingerprint,
    primary_translation.translation_fingerprint as primary_translation_fingerprint,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(translation.name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as translation_name_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(translation.summary, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as translation_summary_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(translation.description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as translation_description_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(translation.history, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as translation_history_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(translation.cultural_significance, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as translation_cultural_significance_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(translation.location_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as translation_location_name_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(translation.visitor_information, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as translation_visitor_information_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(primary_translation.alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as primary_image_alt_text_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(primary_translation.caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as primary_image_caption_normalized
  from source_with_thumbnail_fingerprint
  join public.traditional_house_translations as translation
    on translation.traditional_house_id = source_with_thumbnail_fingerprint.source_id
   and translation.locale = 'en'
  join public.traditional_house_image_translations as primary_translation
    on primary_translation.traditional_house_image_id = source_with_thumbnail_fingerprint.primary_image_id
   and primary_translation.locale = 'en'
), parent_fingerprinted as (
  select
    parent_normalized.*,
    'traditional-house-translation-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('traditional-house-translation-v1'::text)::text
            || ',"name":' || pg_catalog.to_json(parent_normalized.translation_name_normalized)::text
            || ',"summary":' || coalesce(pg_catalog.to_json(nullif(parent_normalized.translation_summary_normalized, ''))::text, 'null')
            || ',"description":' || pg_catalog.to_json(parent_normalized.translation_description_normalized)::text
            || ',"history":' || coalesce(pg_catalog.to_json(nullif(parent_normalized.translation_history_normalized, ''))::text, 'null')
            || ',"cultural_significance":' || coalesce(pg_catalog.to_json(nullif(parent_normalized.translation_cultural_significance_normalized, ''))::text, 'null')
            || ',"location_name":' || coalesce(pg_catalog.to_json(nullif(parent_normalized.translation_location_name_normalized, ''))::text, 'null')
            || ',"visitor_information":' || coalesce(pg_catalog.to_json(nullif(parent_normalized.translation_visitor_information_normalized, ''))::text, 'null')
            || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as current_translation_fingerprint,
    'traditional-house-media-translation-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('traditional-house-media-translation-v1'::text)::text
            || ',"alt_text":' || pg_catalog.to_json(parent_normalized.primary_image_alt_text_normalized)::text
            || ',"caption":' || coalesce(pg_catalog.to_json(nullif(parent_normalized.primary_image_caption_normalized, ''))::text, 'null')
            || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as primary_current_translation_fingerprint
  from parent_normalized
)
select
  eligible.source_id as id,
  eligible.translation_id,
  eligible.slug,
  eligible.translation_name as name,
  eligible.translation_summary as summary,
  eligible.translation_description as description,
  eligible.translation_history as history,
  eligible.translation_cultural_significance as cultural_significance,
  eligible.translation_location_name as location_name,
  eligible.translation_visitor_information as visitor_information,
  eligible.latitude,
  eligible.longitude,
  eligible.google_maps_url,
  eligible.thumbnail_bucket,
  eligible.thumbnail_path,
  eligible.is_featured,
  eligible.display_order,
  eligible.source_published_at as published_at,
  eligible.translation_published_at
from parent_fingerprinted as eligible
where eligible.source_status = 'published'::public.publication_status
  and pg_catalog.btrim(eligible.source_name) <> ''
  and pg_catalog.btrim(eligible.source_description) <> ''
  and eligible.thumbnail_bucket = 'tourism-media'
  and eligible.thumbnail_path ~ ('^traditional-house/' || eligible.source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
  and eligible.primary_storage_bucket = eligible.thumbnail_bucket
  and eligible.primary_storage_path = eligible.thumbnail_path
  and eligible.primary_storage_path ~ ('^traditional-house/' || eligible.source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
  and eligible.source_revision > 0
  and eligible.primary_alt_text is not null
  and pg_catalog.btrim(eligible.primary_alt_text) <> ''
  and exists (
    select 1
    from storage.objects as object
    where object.bucket_id = eligible.primary_storage_bucket
      and object.name = eligible.primary_storage_path
  )
  and eligible.translation_status = 'published'::public.publication_status
  and eligible.review_state = 'reviewed'
  and pg_catalog.btrim(coalesce(eligible.translation_name, '')) <> ''
  and pg_catalog.btrim(coalesce(eligible.translation_description, '')) <> ''
  and (
    (eligible.source_summary_normalized is null or eligible.source_summary_normalized = '')
      and (eligible.translation_summary_normalized is null or eligible.translation_summary_normalized = '')
    or eligible.source_summary_normalized is not null
      and eligible.source_summary_normalized <> ''
      and eligible.translation_summary_normalized is not null
      and eligible.translation_summary_normalized <> ''
  )
  and (
    (eligible.source_history_normalized is null or eligible.source_history_normalized = '')
      and (eligible.translation_history_normalized is null or eligible.translation_history_normalized = '')
    or eligible.source_history_normalized is not null
      and eligible.source_history_normalized <> ''
      and eligible.translation_history_normalized is not null
      and eligible.translation_history_normalized <> ''
  )
  and (
    (eligible.source_cultural_significance_normalized is null or eligible.source_cultural_significance_normalized = '')
      and (eligible.translation_cultural_significance_normalized is null or eligible.translation_cultural_significance_normalized = '')
    or eligible.source_cultural_significance_normalized is not null
      and eligible.source_cultural_significance_normalized <> ''
      and eligible.translation_cultural_significance_normalized is not null
      and eligible.translation_cultural_significance_normalized <> ''
  )
  and (
    (eligible.source_location_name_normalized is null or eligible.source_location_name_normalized = '')
      and (eligible.translation_location_name_normalized is null or eligible.translation_location_name_normalized = '')
    or eligible.source_location_name_normalized is not null
      and eligible.source_location_name_normalized <> ''
      and eligible.translation_location_name_normalized is not null
      and eligible.translation_location_name_normalized <> ''
  )
  and (
    (eligible.source_visitor_information_normalized is null or eligible.source_visitor_information_normalized = '')
      and (eligible.translation_visitor_information_normalized is null or eligible.translation_visitor_information_normalized = '')
    or eligible.source_visitor_information_normalized is not null
      and eligible.source_visitor_information_normalized <> ''
      and eligible.translation_visitor_information_normalized is not null
      and eligible.translation_visitor_information_normalized <> ''
  )
  and eligible.primary_image_translation_status = 'published'::public.publication_status
  and eligible.primary_image_review_state = 'reviewed'
  and eligible.primary_alt_text is not null
  and pg_catalog.btrim(eligible.primary_alt_text) <> ''
  and pg_catalog.btrim(coalesce(eligible.primary_image_alt_text, '')) <> ''
  and (
    (eligible.primary_caption_normalized is null or eligible.primary_caption_normalized = '')
      and eligible.primary_image_caption is null
    or eligible.primary_caption_normalized is not null
      and eligible.primary_caption_normalized <> ''
      and (eligible.primary_image_caption is null or pg_catalog.btrim(eligible.primary_image_caption) <> '')
  )
  and exists (
    select 1
    from storage.objects as object
    where object.bucket_id = eligible.primary_storage_bucket
      and object.name = eligible.primary_storage_path
  )
  and eligible.primary_captured_media_fingerprint = eligible.primary_media_fingerprint
  and eligible.primary_translation_fingerprint = eligible.primary_current_translation_fingerprint
  and eligible.captured_source_fingerprint = eligible.source_fingerprint
  and eligible.captured_thumbnail_media_fingerprint = eligible.thumbnail_fingerprint
  and eligible.translation_fingerprint = eligible.current_translation_fingerprint;

create or replace view private.published_english_traditional_house_image_rows_data
with (security_barrier = true, security_invoker = false)
as
with eligible_parents as (
  select id, translation_id
  from private.published_english_traditional_house_rows_data
), image_normalized as (
  select
    source.id as traditional_house_id,
    image.id,
    image.storage_bucket,
    image.storage_path,
    image.caption as source_caption,
    image.alt_text as source_alt_text,
    image.display_order,
    image.is_primary,
    image.binary_revision,
    translation.id as translation_id,
    translation.alt_text,
    translation.caption,
    translation.translation_status,
    translation.review_state,
    translation.captured_media_fingerprint,
    translation.translation_fingerprint,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(image.caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as source_caption_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(image.alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as source_alt_text_normalized,
    pg_catalog.btrim(
      pg_catalog.replace(
        pg_catalog.replace(translation.alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
        pg_catalog.chr(13),
        pg_catalog.chr(10)
      ),
      pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
        || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
    ) as translation_alt_text_normalized,
    'traditional-house-media-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('traditional-house-media-v1'::text)::text
            || ',"traditional_house_image_id":' || pg_catalog.to_json(pg_catalog.lower(image.id::text))::text
            || ',"storage_bucket":' || pg_catalog.to_json(image.storage_bucket)::text
            || ',"storage_path":' || pg_catalog.to_json(image.storage_path)::text
            || ',"caption":' || coalesce(pg_catalog.to_json(nullif(
              pg_catalog.btrim(
                pg_catalog.replace(
                  pg_catalog.replace(image.caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
                  pg_catalog.chr(13),
                  pg_catalog.chr(10)
                ),
                pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
                  || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
              ), ''))::text, 'null')
            || ',"alt_text":' || pg_catalog.to_json(
              pg_catalog.btrim(
                pg_catalog.replace(
                  pg_catalog.replace(image.alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
                  pg_catalog.chr(13),
                  pg_catalog.chr(10)
                ),
                pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
                  || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
              )
            )::text
            || ',"binary_revision":' || image.binary_revision::text
            || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as media_fingerprint,
    'traditional-house-media-translation-v1:' || pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          '{"version":' || pg_catalog.to_json('traditional-house-media-translation-v1'::text)::text
            || ',"alt_text":' || pg_catalog.to_json(
              pg_catalog.btrim(
                pg_catalog.replace(
                  pg_catalog.replace(translation.alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
                  pg_catalog.chr(13),
                  pg_catalog.chr(10)
                ),
                pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
                  || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
              )
            )::text
            || ',"caption":' || coalesce(pg_catalog.to_json(nullif(
              pg_catalog.btrim(
                pg_catalog.replace(
                  pg_catalog.replace(translation.caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)),
                  pg_catalog.chr(13),
                  pg_catalog.chr(10)
                ),
                pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11)
                  || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)
              ), ''))::text, 'null')
            || '}',
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    ) as current_translation_fingerprint
  from eligible_parents as parent
  join public.traditional_houses as source
    on source.id = parent.id
  join public.traditional_house_images as image
    on image.traditional_house_id = source.id
  join public.traditional_house_image_translations as translation
    on translation.traditional_house_image_id = image.id
   and translation.locale = 'en'
)
select
  image_normalized.id,
  image_normalized.traditional_house_id,
  image_normalized.translation_id,
  image_normalized.storage_bucket,
  image_normalized.storage_path,
  image_normalized.alt_text,
  image_normalized.caption,
  image_normalized.display_order,
  image_normalized.is_primary
from image_normalized
where image_normalized.translation_status = 'published'::public.publication_status
  and image_normalized.review_state = 'reviewed'
  and image_normalized.storage_bucket = 'tourism-media'
  and image_normalized.storage_path ~ ('^traditional-house/' || image_normalized.traditional_house_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
  and image_normalized.source_alt_text is not null
  and pg_catalog.btrim(image_normalized.source_alt_text) <> ''
  and pg_catalog.btrim(coalesce(image_normalized.alt_text, '')) <> ''
  and (
    (image_normalized.source_caption_normalized is null or image_normalized.source_caption_normalized = '')
      and image_normalized.caption is null
    or image_normalized.source_caption_normalized is not null
      and image_normalized.source_caption_normalized <> ''
      and (image_normalized.caption is null or pg_catalog.btrim(image_normalized.caption) <> '')
  )
  and exists (
    select 1
    from storage.objects as object
    where object.bucket_id = image_normalized.storage_bucket
      and object.name = image_normalized.storage_path
  )
  and image_normalized.captured_media_fingerprint = image_normalized.media_fingerprint
  and image_normalized.translation_fingerprint = image_normalized.current_translation_fingerprint;

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
    or l_primary.storage_path !~ ('^homestay/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
    or p_image.storage_path !~ ('^homestay/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
    and p_image.storage_path ~ ('^homestay/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
    or l_image.storage_path !~ ('^homestay/' || l_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
    or l_image.storage_path !~ ('^homestay/' || l_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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

create or replace view private.published_english_homestay_rows_data
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
  and parent_fingerprinted.primary_storage_path ~ ('^homestay/' || parent_fingerprinted.source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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

create or replace view private.published_english_homestay_image_rows_data
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
  and fingerprinted.storage_path ~ ('^homestay/' || fingerprinted.homestay_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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

create or replace function private.umkm_source_is_eligible(
  p_source public.umkms
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l_primary public.umkm_images;
begin
  if p_source.id is null
    or p_source.status <> 'published'::public.publication_status
    or pg_catalog.btrim(p_source.business_name) = ''
    or pg_catalog.btrim(p_source.category) = ''
    or pg_catalog.btrim(p_source.description) = ''
    or p_source.thumbnail_bucket is null
    or p_source.thumbnail_path is null
    or p_source.thumbnail_bucket <> 'tourism-media'
    or p_source.thumbnail_path !~ ('^umkm/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or p_source.source_revision <= 0
    or ((p_source.owner_name is not null
      or p_source.contact_name is not null
      or p_source.contact_phone is not null
      or p_source.contact_whatsapp is not null)
      and not p_source.contact_consent_confirmed)
    or (p_source.latitude is null
      and p_source.contact_phone is null
      and p_source.contact_whatsapp is null) then
    return false;
  end if;
  l_primary := private.umkm_current_primary_image(p_source);
  if l_primary.id is null
    or l_primary.storage_bucket <> p_source.thumbnail_bucket
    or l_primary.storage_path <> p_source.thumbnail_path
    or l_primary.storage_path !~ ('^umkm/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
  perform private.umkm_source_fingerprint_v1(p_source);
  perform private.umkm_thumbnail_media_fingerprint_v1(p_source, l_primary);
  return true;
exception when others then
  return false;
end;
$$;

create or replace function private.umkm_image_translation_is_eligible(
  p_source public.umkms,
  p_image public.umkm_images,
  p_translation public.umkm_image_translations
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
  if p_image.umkm_id <> p_source.id
    or p_translation.umkm_image_id <> p_image.id
    or p_translation.translation_status <> 'published'::public.publication_status
    or p_translation.review_state <> 'reviewed'
    or p_source.status <> 'published'::public.publication_status
    or p_image.storage_bucket <> 'tourism-media'
    or p_image.storage_path !~ ('^umkm/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or not private.umkm_image_translation_content_is_complete(p_image, p_translation)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = p_image.storage_bucket
        and object.name = p_image.storage_path
    ) then
    return false;
  end if;
  l_media_fingerprint := private.umkm_image_media_fingerprint_v1(p_image);
  l_translation_fingerprint := private.umkm_image_translation_fingerprint_v1(p_translation);
  return p_translation.captured_media_fingerprint = l_media_fingerprint
    and p_translation.translation_fingerprint = l_translation_fingerprint;
exception when others then
  return false;
end;
$$;

create or replace function private.umkm_image_translation_admin_derived_state(
  p_source public.umkms,
  p_image public.umkm_images,
  p_translation public.umkm_image_translations
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
    l_current_media_fingerprint := private.umkm_image_media_fingerprint_v1(p_image);
  exception when others then
    l_current_media_fingerprint := null;
  end;
  begin
    l_current_translation_fingerprint := private.umkm_image_translation_fingerprint_v1(p_translation);
  exception when others then
    l_current_translation_fingerprint := null;
  end;

  stale_media_fingerprint := p_translation.captured_media_fingerprint is not null
    and p_translation.captured_media_fingerprint is distinct from l_current_media_fingerprint;
  stale_translation_fingerprint := p_translation.translation_fingerprint is not null
    and p_translation.translation_fingerprint is distinct from l_current_translation_fingerprint;

  l_review_eligibility := not source_blocked
    and p_image.umkm_id = p_source.id
    and p_image.storage_bucket = 'tourism-media'
    and p_image.storage_path ~ ('^umkm/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    and private.umkm_image_translation_content_is_complete(p_image, p_translation)
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

  l_public_eligibility := private.umkm_image_translation_is_eligible(
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

create or replace function public.umkm_image_translation_review(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_terminology_review_confirmed boolean
)
returns public.umkm_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.umkm_image_translations;
  l_new public.umkm_image_translations;
  l_image public.umkm_images;
  l_source public.umkms;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  if not coalesce(p_terminology_review_confirmed, false) then
    raise exception using errcode = '23514', message = 'cultural terminology review confirmation is required';
  end if;
  l_old := private.lock_umkm_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'umkm image translation edit revision mismatch';
  end if;
  if l_old.translation_status <> 'draft'::public.publication_status
    or l_old.review_state <> 'pending' then
    raise exception using errcode = '55000', message = 'umkm image translation is not pending review';
  end if;
  select image.* into l_image
  from public.umkm_images as image
  where image.id = l_old.umkm_image_id;
  select source.* into l_source
  from public.umkms as source
  where source.id = l_image.umkm_id;
  if l_source.status <> 'published'::public.publication_status
    or l_image.storage_bucket <> 'tourism-media'
    or l_image.storage_path !~ ('^umkm/' || l_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or not private.umkm_image_translation_content_is_complete(l_image, l_old)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = l_image.storage_bucket
        and object.name = l_image.storage_path
    ) then
    raise exception using errcode = '55000', message = 'umkm image translation review eligibility failed';
  end if;
  l_media_fingerprint := private.umkm_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.umkm_image_translation_fingerprint_v1(l_old);
  perform pg_catalog.set_config('umkm.workflow', 'on', true);
  update public.umkm_image_translations as translation
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
  perform private.record_umkm_image_translation_event(
    l_old, l_new, 'reviewed', l_actor, l_image.binary_revision,
    l_media_fingerprint, l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace function private.umkm_image_translation_publish_transition(
  p_translation_id uuid,
  p_expected_edit_revision bigint,
  p_republish boolean
)
returns public.umkm_image_translations
language plpgsql
security definer
set search_path = ''
as $$
declare
  l_actor uuid := auth.uid();
  l_old public.umkm_image_translations;
  l_new public.umkm_image_translations;
  l_image public.umkm_images;
  l_source public.umkms;
  l_media_fingerprint text;
  l_translation_fingerprint text;
begin
  if l_actor is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator authorization required';
  end if;
  l_old := private.lock_umkm_image_translation(p_translation_id);
  if p_expected_edit_revision is null or p_expected_edit_revision <> l_old.edit_revision then
    raise exception using errcode = '55000', message = 'umkm image translation edit revision mismatch';
  end if;
  if l_old.review_state <> 'reviewed'
    or (not p_republish and (l_old.published_at is not null or l_old.translation_status <> 'draft'::public.publication_status))
    or (p_republish and l_old.published_at is null)
    or l_old.translation_status not in ('draft'::public.publication_status, 'published'::public.publication_status) then
    raise exception using errcode = '55000', message = 'umkm image translation publication transition is invalid';
  end if;
  select image.* into l_image
  from public.umkm_images as image
  where image.id = l_old.umkm_image_id;
  select source.* into l_source
  from public.umkms as source
  where source.id = l_image.umkm_id
  for update;
  if l_source.status <> 'published'::public.publication_status
    or l_image.storage_bucket <> 'tourism-media'
    or l_image.storage_path !~ ('^umkm/' || l_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    or not private.umkm_image_translation_content_is_complete(l_image, l_old)
    or not exists (
      select 1
      from storage.objects as object
      where object.bucket_id = l_image.storage_bucket
        and object.name = l_image.storage_path
    ) then
    raise exception using errcode = '55000', message = 'umkm image translation publication eligibility failed';
  end if;
  l_media_fingerprint := private.umkm_image_media_fingerprint_v1(l_image);
  l_translation_fingerprint := private.umkm_image_translation_fingerprint_v1(l_old);
  if l_old.terminology_review_confirmed is not true
    or l_old.captured_media_fingerprint is distinct from l_media_fingerprint
    or l_old.translation_fingerprint is distinct from l_translation_fingerprint then
    raise exception using errcode = '55000', message = 'fresh review required before umkm image translation publication';
  end if;
  perform pg_catalog.set_config('umkm.workflow', 'on', true);
  update public.umkm_image_translations as translation
  set translation_status = 'published'::public.publication_status,
      published_at = statement_timestamp(),
      published_by = l_actor,
      archived_at = null,
      edit_revision = l_old.edit_revision + 1,
      updated_by = l_actor
  where translation.id = l_old.id
  returning translation.* into l_new;
  perform private.record_umkm_image_translation_event(
    l_old, l_new,
    case when p_republish then 'republished' else 'published' end,
    l_actor, l_image.binary_revision, l_media_fingerprint,
    l_translation_fingerprint
  );
  return l_new;
end;
$$;

create or replace view private.published_english_umkm_rows_data
with (security_barrier = true, security_invoker = false)
as
with primary_counts as (
  select image.umkm_id, count(*) as primary_count
  from public.umkm_images as image
  where image.is_primary
  group by image.umkm_id
), base as (
  select
    source.id as source_id,
    source.slug,
    source.status as source_status,
    source.business_name as source_business_name,
    source.category as source_category,
    source.description as source_description,
    source.address as source_address,
    source.owner_name,
    source.contact_name,
    source.contact_phone,
    source.contact_whatsapp,
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
    translation.business_name as translation_business_name,
    translation.category as translation_category,
    translation.description as translation_description,
    translation.address as translation_address,
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
  from public.umkms as source
  join primary_counts
    on primary_counts.umkm_id = source.id
   and primary_counts.primary_count = 1
  join public.umkm_images as image
    on image.umkm_id = source.id
   and image.is_primary
  join public.umkm_translations as translation
    on translation.umkm_id = source.id
   and translation.locale = 'en'
  join public.umkm_image_translations as primary_translation
    on primary_translation.umkm_image_id = image.id
   and primary_translation.locale = 'en'
), normalized as (
  select
    base.*,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_business_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_business_name_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_category, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_category_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_description_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.source_address, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_address_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.primary_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_caption_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.primary_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.translation_business_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_business_name_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.translation_category, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_category_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.translation_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_description_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.translation_address, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_address_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.primary_translation_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_translation_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(base.primary_translation_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as primary_translation_caption_normalized
  from base
), source_fingerprinted as (
  select
    normalized.*,
    'umkm-source-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('umkm-source-v1'::text)::text || ',"business_name":' || pg_catalog.to_json(source_business_name_normalized)::text || ',"category":' || pg_catalog.to_json(source_category_normalized)::text || ',"description":' || pg_catalog.to_json(source_description_normalized)::text || ',"address":' || coalesce(pg_catalog.to_json(nullif(source_address_normalized, ''))::text, 'null') || '}', 'UTF8'), 'sha256'), 'hex') as source_fingerprint,
    'umkm-media-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('umkm-media-v1'::text)::text || ',"umkm_image_id":' || pg_catalog.to_json(pg_catalog.lower(primary_image_id::text))::text || ',"storage_bucket":' || pg_catalog.to_json(primary_storage_bucket)::text || ',"storage_path":' || pg_catalog.to_json(primary_storage_path)::text || ',"caption":' || coalesce(pg_catalog.to_json(nullif(primary_caption_normalized, ''))::text, 'null') || ',"alt_text":' || pg_catalog.to_json(primary_alt_text_normalized)::text || ',"binary_revision":' || primary_binary_revision::text || '}', 'UTF8'), 'sha256'), 'hex') as primary_media_fingerprint
  from normalized
), thumbnail_fingerprinted as (
  select
    source_fingerprinted.*,
    'umkm-thumbnail-media-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('umkm-thumbnail-media-v1'::text)::text || ',"umkm_id":' || pg_catalog.to_json(pg_catalog.lower(source_id::text))::text || ',"thumbnail_bucket":' || coalesce(pg_catalog.to_json(nullif(thumbnail_bucket, ''))::text, 'null') || ',"thumbnail_path":' || coalesce(pg_catalog.to_json(nullif(thumbnail_path, ''))::text, 'null') || ',"primary_image_id":' || coalesce(pg_catalog.to_json(pg_catalog.lower(primary_image_id::text))::text, 'null') || ',"primary_image_media_fingerprint":' || coalesce(pg_catalog.to_json(primary_media_fingerprint)::text, 'null') || '}', 'UTF8'), 'sha256'), 'hex') as thumbnail_fingerprint
  from source_fingerprinted
), parent_fingerprinted as (
  select
    thumbnail_fingerprinted.*,
    'umkm-translation-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('umkm-translation-v1'::text)::text || ',"business_name":' || pg_catalog.to_json(translation_business_name_normalized)::text || ',"category":' || pg_catalog.to_json(translation_category_normalized)::text || ',"description":' || pg_catalog.to_json(translation_description_normalized)::text || ',"address":' || coalesce(pg_catalog.to_json(nullif(translation_address_normalized, ''))::text, 'null') || '}', 'UTF8'), 'sha256'), 'hex') as current_translation_fingerprint,
    'umkm-media-translation-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('umkm-media-translation-v1'::text)::text || ',"alt_text":' || pg_catalog.to_json(primary_translation_alt_text_normalized)::text || ',"caption":' || coalesce(pg_catalog.to_json(nullif(primary_translation_caption_normalized, ''))::text, 'null') || '}', 'UTF8'), 'sha256'), 'hex') as primary_current_translation_fingerprint
  from thumbnail_fingerprinted
)
select
  parent_fingerprinted.source_id as id,
  parent_fingerprinted.translation_id,
  parent_fingerprinted.slug,
  parent_fingerprinted.translation_business_name as business_name,
  parent_fingerprinted.translation_category as category,
  parent_fingerprinted.translation_description as description,
  parent_fingerprinted.translation_address as address,
  parent_fingerprinted.latitude,
  parent_fingerprinted.longitude,
  parent_fingerprinted.google_maps_url,
  case when parent_fingerprinted.contact_consent_confirmed then parent_fingerprinted.owner_name else null end as owner_name,
  case when parent_fingerprinted.contact_consent_confirmed then parent_fingerprinted.contact_name else null end as contact_name,
  case when parent_fingerprinted.contact_consent_confirmed then parent_fingerprinted.contact_phone else null end as contact_phone,
  case when parent_fingerprinted.contact_consent_confirmed then parent_fingerprinted.contact_whatsapp else null end as contact_whatsapp,
  parent_fingerprinted.thumbnail_bucket,
  parent_fingerprinted.thumbnail_path,
  parent_fingerprinted.is_featured,
  parent_fingerprinted.display_order,
  parent_fingerprinted.source_published_at as published_at,
  parent_fingerprinted.translation_published_at
from parent_fingerprinted
where parent_fingerprinted.source_status = 'published'::public.publication_status
  and (
    (parent_fingerprinted.owner_name is null
      and parent_fingerprinted.contact_name is null
      and parent_fingerprinted.contact_phone is null
      and parent_fingerprinted.contact_whatsapp is null)
    or parent_fingerprinted.contact_consent_confirmed
  )
  and (parent_fingerprinted.latitude is not null
    or parent_fingerprinted.contact_phone is not null
    or parent_fingerprinted.contact_whatsapp is not null)
  and coalesce(parent_fingerprinted.source_business_name_normalized, '') <> ''
  and coalesce(parent_fingerprinted.source_category_normalized, '') <> ''
  and coalesce(parent_fingerprinted.source_description_normalized, '') <> ''
  and parent_fingerprinted.source_revision > 0
  and parent_fingerprinted.translation_status = 'published'::public.publication_status
  and parent_fingerprinted.review_state = 'reviewed'
  and parent_fingerprinted.terminology_review_confirmed
  and coalesce(parent_fingerprinted.translation_business_name_normalized, '') <> ''
  and coalesce(parent_fingerprinted.translation_category_normalized, '') <> ''
  and coalesce(parent_fingerprinted.translation_description_normalized, '') <> ''
  and (
    (coalesce(parent_fingerprinted.source_address_normalized, '') = ''
      and coalesce(parent_fingerprinted.translation_address_normalized, '') = '')
    or (coalesce(parent_fingerprinted.source_address_normalized, '') <> ''
      and coalesce(parent_fingerprinted.translation_address_normalized, '') <> '')
  )
  and parent_fingerprinted.thumbnail_bucket = 'tourism-media'
  and parent_fingerprinted.thumbnail_path ~ ('^umkm/' || parent_fingerprinted.source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
  and parent_fingerprinted.primary_storage_bucket = parent_fingerprinted.thumbnail_bucket
  and parent_fingerprinted.primary_storage_path = parent_fingerprinted.thumbnail_path
  and parent_fingerprinted.primary_storage_path ~ ('^umkm/' || parent_fingerprinted.source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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

create or replace view private.published_english_umkm_image_rows_data
with (security_barrier = true, security_invoker = false)
as
with base as (
  select
    parent.id as umkm_id,
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
  from private.published_english_umkm_rows_data as parent
  join public.umkm_images as image on image.umkm_id = parent.id
  join public.umkm_image_translations as translation
    on translation.umkm_image_id = image.id
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
    'umkm-media-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('umkm-media-v1'::text)::text || ',"umkm_image_id":' || pg_catalog.to_json(pg_catalog.lower(id::text))::text || ',"storage_bucket":' || pg_catalog.to_json(storage_bucket)::text || ',"storage_path":' || pg_catalog.to_json(storage_path)::text || ',"caption":' || coalesce(pg_catalog.to_json(nullif(source_caption_normalized, ''))::text, 'null') || ',"alt_text":' || pg_catalog.to_json(source_alt_text_normalized)::text || ',"binary_revision":' || binary_revision::text || '}', 'UTF8'), 'sha256'), 'hex') as media_fingerprint,
    'umkm-media-translation-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to('{"version":' || pg_catalog.to_json('umkm-media-translation-v1'::text)::text || ',"alt_text":' || pg_catalog.to_json(translation_alt_text_normalized)::text || ',"caption":' || coalesce(pg_catalog.to_json(nullif(translation_caption_normalized, ''))::text, 'null') || '}', 'UTF8'), 'sha256'), 'hex') as current_translation_fingerprint
  from normalized
)
select
  fingerprinted.id,
  fingerprinted.umkm_id,
  fingerprinted.translation_id,
  fingerprinted.storage_bucket,
  fingerprinted.storage_path,
  fingerprinted.alt_text,
  fingerprinted.caption,
  fingerprinted.display_order,
  fingerprinted.is_primary
from fingerprinted
where fingerprinted.storage_bucket = 'tourism-media'
  and fingerprinted.storage_path ~ ('^umkm/' || fingerprinted.umkm_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
    or l_primary.storage_path !~ ('^tourism-package/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
    or p_image.storage_path !~ ('^tourism-package/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
    and p_image.storage_path ~ ('^tourism-package/' || p_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
    or l_image.storage_path !~ ('^tourism-package/' || l_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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
    or l_image.storage_path !~ ('^tourism-package/' || l_source.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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

create or replace view private.published_english_tourism_package_rows_data
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
  and primary_storage_path ~ ('^tourism-package/' || source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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

create or replace view private.published_english_tourism_package_image_rows_data
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
  and storage_path ~ ('^tourism-package/' || source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
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

create or replace view private.published_english_destination_rows_data
with (security_barrier = true, security_invoker = false)
as
with base as (
  select
    source.id as source_id,
    source.category_id,
    category.slug as category_slug,
    source.status as source_status,
    source.slug,
    source.name as source_name,
    source.summary as source_summary,
    source.description as source_description,
    source.history as source_history,
    source.opening_hours as source_opening_hours,
    source.entrance_fee,
    source.price_note as source_price_note,
    source.facilities as source_facilities,
    source.latitude,
    source.longitude,
    source.google_maps_url,
    source.contact_name,
    source.contact_phone,
    source.contact_consent_confirmed,
    source.thumbnail_bucket,
    source.thumbnail_path,
    source.thumbnail_binary_revision,
    source.source_revision,
    source.is_featured,
    source.display_order,
    source.published_at as source_published_at,
    translation.id as translation_id,
    translation.name as translation_name,
    translation.summary as translation_summary,
    translation.description as translation_description,
    translation.history as translation_history,
    translation.opening_hours as translation_opening_hours,
    translation.price_note as translation_price_note,
    translation.facilities as translation_facilities,
    translation.thumbnail_alt_text as translation_thumbnail_alt_text,
    translation.translation_status,
    translation.review_state,
    translation.captured_source_fingerprint,
    translation.captured_thumbnail_media_fingerprint,
    translation.translation_fingerprint,
    translation.published_at as english_published_at
  from public.destinations as source
  join public.destination_categories as category
    on category.id = source.category_id
  join public.destination_translations as translation
    on translation.destination_id = source.id
   and translation.locale = 'en'
), normalized as (
  select
    base.*,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_name_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_summary, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_summary_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_description_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_history, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_history_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_opening_hours, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_opening_hours_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_price_note, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_price_note_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_name_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_summary, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_summary_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_description, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_description_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_history, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_history_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_opening_hours, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_opening_hours_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_price_note, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_price_note_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(translation_thumbnail_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_thumbnail_alt_text_normalized
  from base
), fingerprinted as (
  select
    normalized.*,
    case when
      source_name_normalized <> ''
      and source_summary_normalized <> ''
      and source_description_normalized <> ''
      and source_facilities is not null
      and not exists (
        select 1
        from pg_catalog.unnest(source_facilities) as item(value)
        where item.value is null
          or pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(item.value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) = ''
      )
      and latitude is not null
      and longitude is not null
      and latitude::text not in ('NaN', 'Infinity', '-Infinity')
      and longitude::text not in ('NaN', 'Infinity', '-Infinity')
      and (entrance_fee is null or entrance_fee::text not in ('NaN', 'Infinity', '-Infinity'))
    then 'fingerprint-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
      '{"version":' || pg_catalog.to_json('fingerprint-v1'::text)::text
      || ',"name":' || pg_catalog.to_json(source_name_normalized)::text
      || ',"summary":' || pg_catalog.to_json(source_summary_normalized)::text
      || ',"description":' || pg_catalog.to_json(source_description_normalized)::text
      || ',"history":' || coalesce(pg_catalog.to_json(nullif(source_history_normalized, ''))::text, 'null')
      || ',"opening_hours":' || coalesce(pg_catalog.to_json(nullif(source_opening_hours_normalized, ''))::text, 'null')
      || ',"entrance_fee":' || coalesce(pg_catalog.trim_scale(entrance_fee)::text, 'null')
      || ',"price_note":' || coalesce(pg_catalog.to_json(nullif(source_price_note_normalized, ''))::text, 'null')
      || ',"facilities":' || coalesce((
        select '[' || pg_catalog.string_agg(pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text, ',' order by ordinal) || ']'
        from pg_catalog.unnest(source_facilities) with ordinality as item(value, ordinal)
      ), '[]')
      || ',"latitude":' || pg_catalog.trim_scale(latitude)::text
      || ',"longitude":' || pg_catalog.trim_scale(longitude)::text
      || ',"google_maps_url":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(google_maps_url, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null')
      || ',"contact_name":' || coalesce(pg_catalog.to_json(nullif(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(contact_name, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)), ''))::text, 'null')
      || '}', 'UTF8'), 'sha256'), 'hex')
    end as current_source_fingerprint,
    case when
      translation_name_normalized <> ''
      and translation_summary_normalized <> ''
      and translation_description_normalized <> ''
      and translation_thumbnail_alt_text_normalized <> ''
      and translation_facilities is not null
      and not exists (
        select 1
        from pg_catalog.unnest(translation_facilities) as item(value)
        where item.value is null
          or pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(item.value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) = ''
      )
    then 'translation-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
      '{"version":' || pg_catalog.to_json('translation-v1'::text)::text
      || ',"name":' || pg_catalog.to_json(translation_name_normalized)::text
      || ',"summary":' || pg_catalog.to_json(translation_summary_normalized)::text
      || ',"description":' || pg_catalog.to_json(translation_description_normalized)::text
      || ',"history":' || coalesce(pg_catalog.to_json(nullif(translation_history_normalized, ''))::text, 'null')
      || ',"opening_hours":' || coalesce(pg_catalog.to_json(nullif(translation_opening_hours_normalized, ''))::text, 'null')
      || ',"price_note":' || coalesce(pg_catalog.to_json(nullif(translation_price_note_normalized, ''))::text, 'null')
      || ',"facilities":' || coalesce((
        select '[' || pg_catalog.string_agg(pg_catalog.to_json(pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(value, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)))::text, ',' order by ordinal) || ']'
        from pg_catalog.unnest(translation_facilities) with ordinality as item(value, ordinal)
      ), '[]')
      || ',"thumbnail_alt_text":' || pg_catalog.to_json(translation_thumbnail_alt_text_normalized)::text
      || '}', 'UTF8'), 'sha256'), 'hex')
    end as current_translation_fingerprint,
    case when source_id is not null and thumbnail_binary_revision is not null and thumbnail_binary_revision > 0 then
      'thumbnail-media-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
        '{"version":' || pg_catalog.to_json('thumbnail-media-v1'::text)::text
        || ',"destination_id":' || pg_catalog.to_json(pg_catalog.lower(source_id::text))::text
        || ',"thumbnail_bucket":' || coalesce(pg_catalog.to_json(nullif(thumbnail_bucket, ''))::text, 'null')
        || ',"thumbnail_path":' || coalesce(pg_catalog.to_json(nullif(thumbnail_path, ''))::text, 'null')
        || ',"thumbnail_binary_revision":' || thumbnail_binary_revision::text
        || '}', 'UTF8'), 'sha256'), 'hex')
    end as current_thumbnail_fingerprint
  from normalized
)
select
  source_id as id,
  category_id,
  translation_name as name,
  slug,
  translation_summary as summary,
  translation_description as description,
  translation_history as history,
  latitude,
  longitude,
  google_maps_url,
  translation_opening_hours as opening_hours,
  entrance_fee,
  translation_price_note as price_note,
  translation_facilities as facilities,
  contact_name,
  contact_phone,
  thumbnail_bucket,
  thumbnail_path,
  is_featured,
  display_order,
  source_published_at,
  english_published_at
from fingerprinted
where source_id is not null
  and source_status = 'published'::public.publication_status
  and category_id is not null
  and category_slug in ('alam', 'budaya', 'religi')
  and latitude is not null
  and longitude is not null
  and latitude between -90 and 90
  and longitude between -180 and 180
  and thumbnail_bucket = 'tourism-media'
  and thumbnail_path is not null
  and pg_catalog.btrim(thumbnail_path) <> ''
  and source_revision > 0
  and thumbnail_binary_revision > 0
  and (contact_name is null and contact_phone is null or contact_consent_confirmed)
  and exists (
    select 1
    from public.destination_images as image
    join storage.objects as object
      on object.bucket_id = image.storage_bucket
     and object.name = image.storage_path
    where image.destination_id = source_id
      and image.is_primary
      and image.storage_bucket = thumbnail_bucket
      and image.storage_path = thumbnail_path
      and image.storage_path ~ ('^destination/' || source_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
  )
  and translation_status = 'published'::public.publication_status
  and review_state = 'reviewed'
  and pg_catalog.btrim(coalesce(translation_name, '')) <> ''
  and pg_catalog.btrim(coalesce(translation_summary, '')) <> ''
  and pg_catalog.btrim(coalesce(translation_description, '')) <> ''
  and pg_catalog.btrim(coalesce(translation_thumbnail_alt_text, '')) <> ''
  and translation_facilities is not null
  and pg_catalog.cardinality(translation_facilities) = pg_catalog.cardinality(source_facilities)
  and (
    (source_history_normalized is null or source_history_normalized = '') = (translation_history_normalized is null or translation_history_normalized = '')
    and (source_opening_hours_normalized is null or source_opening_hours_normalized = '') = (translation_opening_hours_normalized is null or translation_opening_hours_normalized = '')
    and (source_price_note_normalized is null or source_price_note_normalized = '') = (translation_price_note_normalized is null or translation_price_note_normalized = '')
  )
  and current_source_fingerprint = captured_source_fingerprint
  and current_thumbnail_fingerprint = captured_thumbnail_media_fingerprint
  and current_translation_fingerprint = translation_fingerprint;

create or replace function public.can_read_published_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.destination_images as image
      join public.destinations as parent on parent.id = image.destination_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^destination/' || image.destination_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.package_images as image
      join public.tourism_packages as parent on parent.id = image.package_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^tourism-package/' || image.package_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.homestay_images as image
      join public.homestays as parent on parent.id = image.homestay_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^homestay/' || image.homestay_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.umkm_images as image
      join public.umkms as parent on parent.id = image.umkm_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^umkm/' || image.umkm_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.traditional_house_images as image
      join public.traditional_houses as parent on parent.id = image.traditional_house_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^traditional-house/' || image.traditional_house_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    )
    or exists (
      select 1
      from public.cultural_event_images as image
      join public.cultural_events as parent on parent.id = image.cultural_event_id
      where parent.status = 'published'
        and image.storage_bucket = 'tourism-media'
        and image.storage_path = object_name
        and image.storage_path ~ ('^cultural-event/' || image.cultural_event_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$')
    );
$$;

commit;
