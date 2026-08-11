begin;

-- The original Destination projections called a private eligibility function
-- directly from a public view.  PostgreSQL checks the function's EXECUTE
-- privilege at the public caller boundary, so the intentionally revoked
-- helper privilege caused the approved public view to fail with 42501.
-- Keep the helper private and move the predicate behind owner-controlled
-- private projection views, matching the later bilingual verticals.
create view private.published_english_destination_rows_data
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
      and image.storage_path ~ ('^destination/' || source_id::text || '/' || image.id::text || '\.(jpg|png|webp)$')
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

create view private.published_english_destination_image_rows_data
with (security_barrier = true, security_invoker = false)
as
with base as (
  select
    image.id,
    image.destination_id,
    image.storage_bucket,
    image.storage_path,
    image.caption as source_caption,
    image.alt_text as source_alt_text,
    image.binary_revision,
    image.display_order,
    image.is_primary,
    translation.caption,
    translation.alt_text,
    translation.translation_status,
    translation.review_state,
    translation.captured_media_fingerprint,
    translation.translation_fingerprint
  from public.destination_images as image
  join private.published_english_destination_rows_data as parent
    on parent.id = image.destination_id
  join public.destination_image_translations as translation
    on translation.destination_image_id = image.id
   and translation.locale = 'en'
), normalized as (
  select
    base.*,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_caption_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(source_alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as source_alt_text_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(caption, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_caption_normalized,
    pg_catalog.btrim(pg_catalog.replace(pg_catalog.replace(alt_text, pg_catalog.chr(13) || pg_catalog.chr(10), pg_catalog.chr(10)), pg_catalog.chr(13), pg_catalog.chr(10)), pg_catalog.chr(9) || pg_catalog.chr(10) || pg_catalog.chr(11) || pg_catalog.chr(12) || pg_catalog.chr(13) || pg_catalog.chr(32)) as translation_alt_text_normalized
  from base
), fingerprinted as (
  select
    normalized.*,
    case when
      id is not null
      and storage_bucket is not null
      and pg_catalog.btrim(storage_bucket) <> ''
      and storage_path is not null
      and pg_catalog.btrim(storage_path) <> ''
      and source_alt_text_normalized <> ''
      and binary_revision > 0
    then 'media-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
      '{"version":' || pg_catalog.to_json('media-v1'::text)::text
      || ',"destination_image_id":' || pg_catalog.to_json(pg_catalog.lower(id::text))::text
      || ',"storage_bucket":' || pg_catalog.to_json(storage_bucket)::text
      || ',"storage_path":' || pg_catalog.to_json(storage_path)::text
      || ',"caption":' || coalesce(pg_catalog.to_json(nullif(source_caption_normalized, ''))::text, 'null')
      || ',"alt_text":' || pg_catalog.to_json(source_alt_text_normalized)::text
      || ',"binary_revision":' || binary_revision::text
      || '}', 'UTF8'), 'sha256'), 'hex')
    end as current_media_fingerprint,
    case when translation_alt_text_normalized <> '' then
      'destination-media-translation-v1:' || pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
        '{"version":' || pg_catalog.to_json('destination-media-translation-v1'::text)::text
        || ',"alt_text":' || pg_catalog.to_json(translation_alt_text_normalized)::text
        || ',"caption":' || coalesce(pg_catalog.to_json(nullif(translation_caption_normalized, ''))::text, 'null')
        || '}', 'UTF8'), 'sha256'), 'hex')
    end as current_translation_fingerprint
  from normalized
)
select
  id,
  destination_id,
  storage_bucket,
  storage_path,
  caption,
  alt_text,
  display_order,
  is_primary
from fingerprinted
where translation_status = 'published'::public.publication_status
  and review_state = 'reviewed'
  and pg_catalog.btrim(coalesce(translation_alt_text_normalized, '')) <> ''
  and exists (
    select 1
    from storage.objects as object
    where object.bucket_id = storage_bucket
      and object.name = storage_path
  )
  and current_media_fingerprint = captured_media_fingerprint
  and current_translation_fingerprint = translation_fingerprint;

alter view private.published_english_destination_rows_data owner to postgres;
alter view private.published_english_destination_image_rows_data owner to postgres;

create or replace view public.published_english_destinations
with (security_barrier = true, security_invoker = false)
as
select
  id,
  category_id,
  name,
  slug,
  summary,
  description,
  history,
  latitude,
  longitude,
  google_maps_url,
  opening_hours,
  entrance_fee,
  price_note,
  facilities,
  contact_name,
  contact_phone,
  thumbnail_bucket,
  thumbnail_path,
  is_featured,
  display_order,
  source_published_at,
  english_published_at
from private.published_english_destination_rows_data;

create or replace view public.published_english_destination_images
with (security_barrier = true, security_invoker = false)
as
select
  id,
  destination_id,
  storage_bucket,
  storage_path,
  caption,
  alt_text,
  display_order,
  is_primary
from private.published_english_destination_image_rows_data;

alter view public.published_english_destinations owner to postgres;
alter view public.published_english_destination_images owner to postgres;

revoke all on private.published_english_destination_rows_data from public, anon, authenticated;
revoke all on private.published_english_destination_image_rows_data from public, anon, authenticated;
revoke all on public.published_english_destinations from public, anon, authenticated;
revoke all on public.published_english_destination_images from public, anon, authenticated;
grant select on public.published_english_destinations to anon, authenticated;
grant select on public.published_english_destination_images to anon, authenticated;

commit;
